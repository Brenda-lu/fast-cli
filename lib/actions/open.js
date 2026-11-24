import open from "open";
import log from "npmlog";
import { styleText } from "node:util";
import { loadBookmark, refreshBookmark } from "../core/bookmark.js";

//- 分组颜色，按 bookmark.json 中分组的先后顺序依次取用
const GROUP_COLORS = ["cyan", "green"];

//- 跨分组查找条目：bookmark 按「官网 / 插件」分组，同一个 key 只会出现在其中一组
function findEntry(bookmark, name) {
	return Object.values(bookmark).find(items => items[name])?.[name];
}

//- 把一组条目按「key + 描述」对齐成多行文本，整体缩进两个空格，便于在 key 输错时直观查看
function formatEntries(items) {
	const entries = Object.entries(items);
	const width = Math.max(...entries.map(([key]) => key.length));
	return entries
		.map(([key, { description = "" }]) => `  ${key.padEnd(width)}  ${description}`)
		.join("\n");
}

//- 刷新书签：从远端拉取并写入本地缓存，失败时回退到已有缓存/内置兜底，不中断后续流程
async function loadBookmarkData(refresh) {
	if (!refresh) {
		return loadBookmark();
	}
	try {
		return await refreshBookmark();
	} catch (error) {
		log.warn(`书签同步失败，使用本地缓存：${error.message}`);
		return loadBookmark();
	}
}

export default async (index, options = {}) => {
	const bookmark = await loadBookmarkData(options.refresh);
	const entry = findEntry(bookmark, index);
	if (entry) {
		log.info(entry.description);
		open(entry.url);
		return;
	}
	log.info(`没有找到对应的链接：${index}`);
	//- 按分组分块输出：一个分组的标题与其下的条目用同一种颜色，不同分组颜色不同
	Object.entries(bookmark).forEach(([group, items], position) => {
		const color = GROUP_COLORS[position % GROUP_COLORS.length];
		console.log(styleText(color, `${group}：\n${formatEntries(items)}`));
	});
};
