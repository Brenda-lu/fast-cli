#!/usr/bin/env node

import { program } from "commander";
import semver from "semver";

//- 校验当前运行环境的 NodeJS 版本，不满足最低版本要求则直接抛错中断
function checkNodeVersion() {
	const LOWER_NODE_VERSION = "20.12.0";
	if (!semver.gte(process.version, LOWER_NODE_VERSION)) {
		throw new Error(`需安装${LOWER_NODE_VERSION}以上版本的NodeJS`);
	}
}

//- 先执行版本校验，再加载脚手架模块：
//- 静态 import 会被提升到文件最顶部、先于这里的校验执行，
//- 因此这里必须用动态 import（运行时才真正加载），
//- 否则低版本 Node 会在导入依赖阶段就抛出难以理解的报错
checkNodeVersion();

//- 动态 import 返回 Promise，用顶层 await 等待加载完成，
//- 再解构取出模块的 default 导出并重命名为 createCommands
const { default: createCommands } =
	await import("./lib/core/createCommands.js");

createCommands(program);

// 解析用户输入的命令行参数，并执行对应命令的 action。
// process.argv 包含 Node.js 路径、入口文件路径以及用户实际输入的参数。
program.parse(process.argv);
