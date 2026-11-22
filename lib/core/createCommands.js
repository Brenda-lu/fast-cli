const createAction = require("../actions/create");

const createCommands = program => {
	program
		.command("create <template-name>")
		.description("创建模板")
		.action(createAction);
};

module.exports = createCommands;
