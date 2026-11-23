import open from "open";
import log from "npmlog";
import { styleText } from "node:util";
import bookmark from "../bookmark.json" with { type: "json" };

//- 分组颜色，按 bookmark.json 中分组的先后顺序依次取用
const GROUP_COLORS = ["cyan", "green"];

//- 跨分组查找条目：bookmark 按「官网 / 插件」分组，同一个 key 只会出现在其中一组
function findEntry(name) {
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

export default async index => {
	const entry = findEntry(index);
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
