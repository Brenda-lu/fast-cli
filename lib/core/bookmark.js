import { mkdir, readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import path from "path";
import bundled from "../bookmark.json" with { type: "json" };

//- 远端书签地址：独立仓库 kick-cli-bookmark 根目录下的 bookmark.json
//- 更新书签只需 push 该仓库，无需重新发布 CLI
//- 注意：这里要用 raw.githubusercontent.com 直接拿到原始 JSON；
//- 用 github.com/.../blob/... 会返回网页 HTML，response.json() 解析不了
const REMOTE_URL =
	"https://raw.githubusercontent.com/Brenda-lu/kick-cli-bookmark/main/bookmark.json";

//- 本地缓存目录与文件：首次刷新后写入，之后离线也能用
const CACHE_DIR = path.join(homedir(), ".kick-cli");
const CACHE_PATH = path.join(CACHE_DIR, "bookmark.json");

//- 读取本地缓存；缓存不存在或损坏时返回 null，交由调用方回退
async function readCache() {
	try {
		return JSON.parse(await readFile(CACHE_PATH, "utf8"));
	} catch {
		return null;
	}
}

//- 加载书签：优先用本地缓存，没有缓存时退回发布包内置的兜底快照
export async function loadBookmark() {
	return (await readCache()) ?? bundled;
}

//- 从远端拉取最新书签并写入缓存，返回新数据；失败时抛错，由调用方决定是否回退
export async function refreshBookmark() {
	//- 网络可能长时间无响应，设置 10 秒超时，避免 CLI 卡死
	const response = await fetch(REMOTE_URL, {
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) {
		throw new Error(`远端返回 HTTP ${response.status}`);
	}
	const data = await response.json();
	await mkdir(CACHE_DIR, { recursive: true });
	await writeFile(CACHE_PATH, JSON.stringify(data, null, "\t") + "\n");
	return data;
}
