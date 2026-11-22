#!/usr/bin/env node

const { program } = require("commander");
const createCommands = require("./lib/core/createCommands");

createCommands(program);

// 解析用户输入的命令行参数，并执行对应命令的 action。
// process.argv 包含 Node.js 路径、入口文件路径以及用户实际输入的参数。
program.parse(process.argv);
