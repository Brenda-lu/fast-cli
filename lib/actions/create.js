const { promisify } = require("util");
const downloadGit = promisify(require("download-git-repo"));
const inquirer = require("inquirer");

module.exports = async inputName => {
	const allTemplates = ["cli", "koa"];
	if (!allTemplates.includes(inputName)) {
		console.log("模板不存在");
		return;
	}
	console.log("创建模板", inputName);
};
