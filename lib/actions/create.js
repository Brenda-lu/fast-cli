import { promisify } from "util";
import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { generateKeyPairSync } from "crypto";
import { spawn } from "child_process";
import path from "path";
import inquirer from "inquirer";
import ora from "ora";
import downloadGit from "download-git-repo";

const download = promisify(downloadGit);

//- 在目标目录执行命令，输出直接透传到当前终端（stdio: inherit），命令失败则抛错
//- silent 为 true 时不透传输出（用来配合 ora 动画），失败时把捕获到的输出一并带回便于定位
function run(command, args, cwd, { silent = false } = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio: silent ? ["ignore", "pipe", "pipe"] : "inherit",
		});
		let output = "";
		if (silent) {
			child.stdout.on("data", chunk => (output += chunk));
			child.stderr.on("data", chunk => (output += chunk));
		}
		child.on("error", reject);
		child.on("close", code => {
			if (code === 0) {
				resolve();
				return;
			}
			const detail = silent && output.trim() ? `\n${output.trim()}` : "";
			reject(new Error(`${command} ${args.join(" ")} 退出码 ${code}${detail}`));
		});
	});
}

//- 模板名 -> 模板仓库地址
//- direct: 前缀表示后面是完整的 git 地址（本地仓库用 file:// 指向），# 后面是分支名，
//- 不写分支时 download-git-repo 默认按 master 检出
const TEMPLATES = {
	koa: "direct:https://github.com/Brenda-lu/koa-mysql-template.git#main",
};

//- 拉取模板。download-git-repo 底层把 git 进程的 stdout/stderr 直接丢弃了（见 node_modules/git-clone），
//- 失败时只会抛出一句 "'git clone' failed with status 128"，看不出真正原因，
//- 所以这里包一层：提前拦掉「目录已存在」这种最典型的失败，失败时清理半成品并给出可读提示
async function downloadTemplate(repo, targetDir) {
	//- git clone 要求目标目录不存在或为空，否则会直接以 128 退出
	const occupied = await readdir(targetDir).then(
		files => files.length > 0,
		() => false, //- 目录不存在时 readdir 会抛错，视为未占用
	);
	if (occupied) {
		throw new Error(
			`目录已存在且非空：${targetDir}\n请换一个项目名，或先删除该目录`,
		);
	}
	try {
		//- direct: 模板要用 git clone 方式拉取，不能用压缩包下载
		await download(repo, targetDir, { clone: true });
	} catch (error) {
		//- git 失败时一般会清掉自己创建的目录，这里兜底再清一次，避免留下半成品
		await rm(targetDir, { recursive: true, force: true });
		throw new Error(
			`模板拉取失败：${repo}\n请确认网络能访问该仓库，且仓库与分支存在。\n原始错误：${error.message}`,
		);
	}
}

//- 写入 .env 的环境变量问答项，字段与默认值对齐模板的 .env.example（app/config.js 会校验这些变量必填）
const ENV_QUESTIONS = [
	{ name: "APP_PORT", message: "应用端口", default: "3000" },
	{
		name: "APP_HOST",
		message: "应用主机（启动日志展示用）",
		default: "http://localhost",
	},
	{ name: "MYSQL_HOST", message: "MySQL 主机", default: "127.0.0.1" },
	{ name: "MYSQL_PORT", message: "MySQL 端口", default: "3306" },
	{ name: "MYSQL_USER", message: "MySQL 用户名", default: "root" },
	{
		name: "MYSQL_PASSWORD",
		message: "MySQL 密码",
		type: "password",
		validate: value => Boolean(value.trim()) || "MySQL 密码不能为空",
	},
	{ name: "MYSQL_DATABASE", message: "MySQL 数据库名", default: "" },
];

//- 统一封装问答：用户按 Ctrl+C（或 Ctrl+D）取消时 inquirer 会抛 ExitPromptError，
//- 默认会打印一大段堆栈，这里改成友好提示并按 130（128 + SIGINT）退出
async function ask(questions) {
	try {
		return await inquirer.prompt(questions);
	} catch (error) {
		if (error.name !== "ExitPromptError") {
			throw error;
		}
		console.log("\n已取消");
		process.exit(130);
	}
}

//- 把目标项目 package.json 里的 name 改成用户输入的项目名
async function renamePackage(targetDir, projectName) {
	const pkgPath = path.join(targetDir, "package.json");
	const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
	pkg.name = projectName;
	//- 保持 npm 习惯的制表符缩进，并在文件末尾补一个换行
	await writeFile(pkgPath, JSON.stringify(pkg, null, "\t") + "\n");
}

//- 在 app/keys 下生成 RSA 公私钥，格式与模板 README 里的 openssl 命令一致
async function generateKeys(targetDir) {
	const keysDir = path.join(targetDir, "app", "keys");
	await mkdir(keysDir, { recursive: true });
	const privatePath = path.join(keysDir, "private.key");
	const publicPath = path.join(keysDir, "public.key");
	//- 模板里若自带公私钥则直接覆盖：先删旧文件，避免旧文件只读导致写入失败
	await rm(privatePath, { force: true });
	await rm(publicPath, { force: true });
	const { privateKey, publicKey } = generateKeyPairSync("rsa", {
		modulusLength: 2048,
		//- 私钥用 pkcs1（BEGIN RSA PRIVATE KEY），公钥用 spki（BEGIN PUBLIC KEY），同 openssl 默认输出
		privateKeyEncoding: { type: "pkcs1", format: "pem" },
		publicKeyEncoding: { type: "spki", format: "pem" },
	});
	//- 私钥权限设为 0600，避免同机其他用户读取
	await writeFile(privatePath, privateKey, { mode: 0o600 });
	await writeFile(publicPath, publicKey);
}

//- 问答收集环境参数并写入目标项目的 .env
async function writeEnvFile(targetDir, projectName) {
	const questions = ENV_QUESTIONS.map(question => ({
		type: "input",
		...question,
		//- 数据库名没填时默认取项目名
		default:
			question.name === "MYSQL_DATABASE" ? projectName : question.default,
	}));
	const answers = await ask(questions);
	const content = Object.entries(answers)
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
	await writeFile(path.join(targetDir, ".env"), content + "\n");
}

export default async inputName => {
	const repo = TEMPLATES[inputName];
	if (!repo) {
		console.log(`模板不存在，可用模板：${Object.keys(TEMPLATES).join("、")}`);
		return;
	}
	const answers = await ask([
		{
			type: "input",
			name: "projectName",
			message: "请输入项目名",
			default: inputName,
			validate: value => Boolean(value.trim()) || "项目名不能为空",
		},
	]);
	const projectName = answers.projectName.trim();
	const targetDir = path.join(process.cwd(), projectName);
	console.log(`正在创建 ${targetDir}`);
	//- 拉取模板期间没有任何输出，用 ora 动画表示正在等待；失败时只打印可读信息，不抛整段堆栈
	const spinner = ora("正在拉取模板...").start();
	try {
		await downloadTemplate(repo, targetDir);
		spinner.text = "正在改写 package.json 并生成密钥...";
		await renamePackage(targetDir, projectName);
		await generateKeys(targetDir);
		spinner.succeed("模板已就绪");
	} catch (error) {
		spinner.fail("创建失败");
		console.log(`\n${error.message}`);
		process.exit(1);
	}
	//- .env 通过问答收集，问答前动画已经结束，避免动画与输入输出互相干扰
	await writeEnvFile(targetDir, projectName);
	console.log(`创建完成，已把 package.json 的 name 改为 ${projectName}`);
	console.log("已生成 app/keys/private.key、app/keys/public.key 和 .env");
	//- npm install 耗时较长，用动画代替 npm 自身的输出；失败时把 npm 的输出一并打印出来
	const installSpinner = ora("正在安装依赖（npm install）...").start();
	try {
		await run("npm", ["install"], targetDir, { silent: true });
		installSpinner.succeed("依赖安装完成");
	} catch (error) {
		installSpinner.fail("依赖安装失败");
		console.log(`\n${error.message}`);
		process.exit(1);
	}
	//- npm start 对应模板里的 nodemon，会一直占用终端并持续输出日志，直到用户按 Ctrl+C 结束
	console.log("正在启动项目（npm start）...");
	await run("npm", ["start"], targetDir);
};
