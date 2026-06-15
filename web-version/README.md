# create-ex mobile web

这是 `create-ex` 的移动端网页原型，不改动原始 Claude Code skill。

## 使用方式

直接打开：

```text
web-version/index.html
```

或在项目根目录启动一个静态服务器：

```powershell
python -m http.server 4173
```

然后访问：

```text
http://localhost:4173/web-version/
```

## 真实聊天后端

复制配置文件：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，填入你的 API Key：

```text
MODEL_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_API_KEY=你的 key
```

如果使用智谱 AI，改成：

```text
MODEL_PROVIDER=zhipu
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_MODEL=glm-5.1
ZHIPU_API_KEY=你的智谱 key
```

然后启动：

```powershell
node server.js
```

后端会：

- 读取电脑里的 `../exes/` 角色
- 提供 `/api/characters`
- 手机聊天时调用 DeepSeek/OpenAI-compatible API
- API Key 只保存在电脑 `.env`，不会放到手机网页前端

## 手机上打开

### 同一 Wi-Fi 临时使用

在 `web-version` 目录右键用 PowerShell 运行：

```powershell
.\start-mobile.ps1
```

或者双击：

```text
start-mobile.cmd
```

终端会显示两个地址：

```text
电脑访问: http://127.0.0.1:4175/
手机访问: http://你的电脑局域网IP:4175/
```

手机和电脑连同一个 Wi-Fi，在手机浏览器打开“手机访问”地址即可。这个脚本启动的是 `node server.js`，支持读取电脑已有角色和真实 API 聊天。

运行期间不要关闭这个终端窗口；关掉窗口，手机网页就连不上后端。

如果打不开，通常是 Windows 防火墙拦住了 Python，允许放行即可。

### 真正随时打开

如果只需要静态版，把整个 `web-version/` 部署到任意 HTTPS 静态托管即可，例如 GitHub Pages、Cloudflare Pages、Netlify 或 Vercel。

部署后手机打开 HTTPS 地址，浏览器菜单里选择“添加到主屏幕”，就会像一个小 App 一样打开。PWA 离线缓存只在 HTTPS 或 localhost 下生效。

如果要部署真实聊天版，需要部署 `server.js` 到支持 Node 的服务，并把 `.env` 放在服务器环境变量里。

## 功能

- 手机优先界面
- 创建角色基础信息
- 粘贴或上传文本材料
- 生成 `memories.md`、`persona.md`、`meta.json`、`GPT_INSTRUCTIONS.md`
- 本地浏览器保存草稿
- 下载单个文件或角色包
- 微信式聊天预览

## 说明

当前版本是纯前端原型，不会把 API Key 写进前端，也不会直接调用大模型。生成内容是模板化的，适合先验证移动端流程。后续如果要接入真实 LLM，建议增加后端 API。
