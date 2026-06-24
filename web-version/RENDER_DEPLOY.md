# Render 部署说明

这个版本用于部署到 Render。部署后不依赖你电脑本地的 `exes/` 角色文件夹，云端角色库可以为空；你可以在网页里重新填写角色信息、导入材料、生成并导出角色文件。

云端默认内置一个公开示例角色“林知夏”，只用于演示流程，不包含你的私人角色内容。

## 需要上传到 GitHub 的内容

上传整个项目即可，但不要上传本地密钥和私人角色：

- 不要上传 `web-version/.env`
- 不要上传你自己的 `exes/{角色名}` 文件夹
- `.gitignore` 已经默认忽略 `exes/*/`，只保留示例目录

## Render 设置

如果用 `render.yaml` 自动创建服务，Render 会读取这些配置：

- Root Directory: `web-version`
- Build Command: `npm install`
- Start Command: `npm start`

如果手动创建 Web Service，也按上面三项填写。

## 环境变量

在 Render 的 Environment 页面添加：

```text
MODEL_PROVIDER=gemini
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=你的 Gemini API Key
```

不要把 API Key 写进代码或上传到 GitHub。

Gemini API Key 可以在 Google AI Studio 创建。已有 Render 服务不会自动删除旧的智谱变量；
只要新增以上四项，并确保 `MODEL_PROVIDER=gemini` 即可。旧变量可以保留，也可以手动删除。

## 部署后的使用方式

打开 Render 给你的公网地址后：

1. 在“创建”里填写角色基础信息。
2. 在“材料”里粘贴聊天记录或事件。
3. 在“生成”里导出 `memories.md`、`persona.md`、`meta.json`、`GPT_INSTRUCTIONS.md`。
4. 在“聊天”里可以直接用当前草稿试聊。

也可以点击“载入示例”，先用“林知夏”测试完整流程。

注意：免费 Render 服务可能会休眠，第一次打开会慢一点。

## 历史记录保存方式

网页会自动把每个用户的角色库、材料、生成结果和聊天记录保存在当前浏览器的 `localStorage` 里。

这意味着：

- 每个用户打开同一个 Render 链接时，看到的是自己设备/浏览器里的历史。
- 用户刷新页面、关闭再打开，历史还会在。
- 同一个用户可以创建多个角色；每个角色都有独立的材料、生成结果和聊天记录。
- 材料页和生成页都可以选择“当前角色”，添加的材料只会进入对应角色。
- 聊天页可以从“聊天角色”下拉框选择要对话的角色。
- 不同用户之间不会共享历史。
- 同一个用户换手机、换浏览器、无痕模式、清除网站数据后，历史不会自动同步。
- Render 云端不保存这些历史，也不需要数据库。

如果需要跨设备同步历史，需要后续再加登录和数据库。
