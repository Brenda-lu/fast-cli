# kick-cli 使用手册

`kick-cli` 是一个基于 commander + ESM 的自研脚手架工具，提供两个命令：

- `kick c`：根据模板创建项目（拉取模板 → 改项目名 → 生成密钥 → 写环境变量 → 装依赖 → 启动）
- `kick o`：打开常用链接（官网 / 插件文档），支持远端同步书签

## 环境要求

- Node.js >= 20.12.0（入口会先做版本校验，不满足会直接报错）

## 安装

在项目目录下执行，把本地包软链接到全局：

```bash
npm link
```

之后即可在任意目录使用 `kick` 命令。发布到 npm 后，也可用 `npm i -g kick-cli` 全局安装。

## 命令总览

```bash
kick c <template-name>     # 创建模板项目
kick o <url-name>          # 打开官方链接，可加 --refresh 同步书签
```

## kick c —— 创建项目

```bash
kick c koa
```

### 交互流程

1. **输入项目名**：默认等于模板名，留空会提示必填。
2. **拉取模板**：从模板仓库 clone 到当前目录下的 `<项目名>` 文件夹。
3. **改写配置**：把生成项目 `package.json` 的 `name` 改为项目名。
4. **生成密钥**：在 `app/keys/` 下生成 RSA 公私钥（`private.key` / `public.key`），模板自带的会被覆盖。
5. **问答收集环境变量**：逐项填写后写入 `.env`。
6. **安装依赖**：自动执行 `npm install`。
7. **启动项目**：自动执行 `npm start`（模板里是 nodemon，会一直占用终端，`Ctrl+C` 结束）。

### 当前可用模板

| 模板名 | 说明                 |
| ------ | -------------------- |
| `koa`  | koa + mysql 后端模板 |

模板不存在时会提示可用模板列表。

### 环境变量问答项

| 变量             | 说明                       | 默认值             |
| ---------------- | -------------------------- | ------------------ |
| `APP_PORT`       | 应用端口                   | `3000`             |
| `APP_HOST`       | 应用主机（启动日志展示用） | `http://localhost` |
| `MYSQL_HOST`     | MySQL 主机                 | `127.0.0.1`        |
| `MYSQL_PORT`     | MySQL 端口                 | `3306`             |
| `MYSQL_USER`     | MySQL 用户名               | `root`             |
| `MYSQL_PASSWORD` | MySQL 密码                 | 必填，留空会提示   |
| `MYSQL_DATABASE` | MySQL 数据库名             | 默认取项目名       |

## kick o —— 打开链接

```bash
kick o node                 # 打开 Node.js 官网
kick o jwt                  # 打开 jsonwebtoken 文档
kick o --help               # 查看帮助
```

### 选项

| 选项            | 说明                         |
| --------------- | ---------------------------- |
| `-r, --refresh` | 先从远端同步最新书签，再打开 |

### key 输错时

如果输入的 key 不存在，会打印所有书签，按「官网 / 插件」分组、分组着色显示，方便快速找到正确的 key。

### 书签分组

- **官网**：`node`、`mysql2`、`ts`、`github`、`doubao`
- **插件**：`jwt`、`download-git-repo`、`inquirer`、`npmlog`、`semver`

### 书签数据来源（三级回退）

`kick o` 不直接内置写死书签，而是按以下顺序取数据：

1. 本地缓存 `~/.kick-cli/bookmark.json`（首次 `--refresh` 后生成）
2. 内置兜底 `lib/bookmark.json`（发布包自带的离线快照）
3. `--refresh` 时从远端仓库拉取最新书签并写入缓存

更新书签只需 push 远端仓库，**无需重新发布 CLI**。远端地址配置在 `lib/core/bookmark.js` 的 `REMOTE_URL`。

## 退出码

| 退出码 | 含义                                       |
| ------ | ------------------------------------------ |
| `0`    | 正常结束                                   |
| `1`    | 创建失败（模板拉取失败 / 依赖安装失败等）  |
| `130`  | 交互问答中按 `Ctrl+C` 取消（128 + SIGINT） |
