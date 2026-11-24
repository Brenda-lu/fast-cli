import createAction from "../actions/create.js";
import openAction from "../actions/open.js";

export default program => {
	program
		.command("c <template-name>")
		.description("创建模板")
		.action(createAction);

	program
		.command("o <url-name>")
		.description("打开官方链接")
		.option("-r, --refresh", "先从远端同步最新书签")
		.action(openAction);
};
