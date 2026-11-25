# 脚手架创建步骤：

1. `npm init -y` 初始化项目
2. 创建入口文件 index.js, 并在头部添加：`#!/usr/bin/env node`
3. 在 package.json 中添加 `bin` 字段，指向入口文件。定义命令之前先执行一下命令，看是否跟其他命令冲突

```json
{
	"bin": {
		"kick": "./index.js"
	}
}
```

4. npm link 把本地开发的包软链接到全局 npm 目录里

# 脚手架发布项目

1. 登录npm `https://www.npmjs.com/`
2. npm login
3. 修改package.json 的 `keywords` `author` `license="MIT"` `homepage` `repository`
4. 修改版本号
5. npm publish
