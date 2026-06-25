# Create-Ex 角色聊天网页版

Create-Ex 是一个面向手机浏览器的 AI 角色创建与聊天应用。用户可以创建多个角色，为每个角色设置姓名、性别、头像、备注、关系背景、性格和独立材料，然后以类似微信的界面进行文字或语音聊天。

项目同时保留了原始 Claude Code Skill、`prompts/` 和 `tools/`，当前 README 主要介绍 `web-version/` 网页版。

## 当前功能

- 创建和保存多个独立角色
- 设置角色姓名、性别、头像、备注、关系概况和性格
- 为每个角色分别管理聊天记录、重要事件和纠错材料
- 微信式聊天列表、全屏对话和消息头像
- 发送文字消息
- 录制并发送真正的语音消息
- Gemini 直接理解语音内容和情绪
- 角色文字回复朗读
- 全局“关于我”资料，供所有角色共同读取
- 邮箱注册与登录
- 跨设备同步角色、材料、聊天、头像和语音
- 导出 `memories.md`、`persona.md`、`meta.json` 和 GPT Instructions

## 技术结构

网页版没有使用前端框架，主要由原生 Web 技术构成：

```text
web-version/
├── index.html             # 页面结构
├── styles.css             # 手机端界面与响应式样式
├── app.js                 # 角色、聊天、录音、登录与同步逻辑
├── server.js              # Node.js 静态服务和 API 代理
├── sw.js                  # PWA 缓存与版本更新
├── manifest.webmanifest   # PWA 配置
├── assets/                # 默认头像等静态资源
└── SUPABASE_SETUP.sql     # 账户数据表、RLS 和私有媒体桶
```

后端使用 Node.js 原生 `http` 模块，没有 Express 等运行时依赖。前端通过同源 `/api/*` 接口与后端通信，API Key 不会写入浏览器代码。

## AI 接口

当前默认使用 **Google Gemini API**。

### 文字聊天

文字消息通过 Gemini 的 OpenAI-compatible Chat Completions 接口发送：

```text
https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
```

默认模型：

```text
gemini-2.5-flash
```

请求内容包括：

- 当前角色的 Persona 与共同记忆
- 当前角色独立材料生成的角色指令
- 用户在“关于我”页面填写的文字资料
- 最近的聊天上下文
- 用户当前发送的文字

### 语音聊天

用户发送的 WAV 语音通过 Gemini `generateContent` 多模态接口处理。Gemini 直接理解语音内容、语气和情绪，不先在浏览器里转成文字。

语音消息本体会显示为可播放的语音气泡。角色回复目前仍为文字，可选择使用浏览器的 Speech Synthesis 自动朗读。

### 对话边界

服务端会为所有角色追加统一的聊天规则：

- 默认使用简短、自然的微信式回复
- 不输出小说旁白或括号动作
- 不虚构异地聊天中无法发生的身体接触
- 不擅自升级用户与角色的现实关系
- 不编造没有资料依据的共同经历

Gemini 临时返回 `429` 或 `5xx` 错误时，服务端会进行有限次数的自动重试。

## 账户与云端同步

账户系统使用 **Supabase Auth**，当前支持邮箱和密码注册、登录、会话刷新与退出。

跨设备数据由 Supabase 提供：

- **Postgres**：保存用户的结构化应用状态
- **Storage**：保存头像和语音文件
- **Row Level Security**：限制用户只能读取和修改自己的数据

`SUPABASE_SETUP.sql` 会创建：

```text
public.user_states
```

每位用户对应一条 JSON 状态记录，包含：

- 全局“关于我”文字资料
- 所有角色资料
- 每个角色的材料
- 每个角色的生成结果
- 聊天消息元数据
- 未读数量和当前界面状态

私有 Storage Bucket：

```text
user-media
```

其中保存：

- 用户头像
- 角色头像
- 用户发送的语音文件

媒体路径以 Supabase 用户 ID 开头，配合 RLS Storage Policy 实现用户隔离。

## 本地数据存储

即使未登录，应用也可以在当前浏览器中使用。

### localStorage

主要应用状态保存在：

```text
create-ex-mobile-state
```

其中包含角色、材料、文字聊天、用户资料和界面状态。登录会话和本机模式选择使用独立的 localStorage Key。

### IndexedDB

体积较大的二进制文件保存在 IndexedDB：

```text
Database: create-ex-audio
Stores:
- clips
- avatars
```

保存内容包括：

- WAV 语音
- 自动裁剪压缩后的 WebP 头像

用户登录后，这些本地媒体会同步到 Supabase Storage；换设备登录时再下载到新设备的 IndexedDB。

## 首次同步规则

用户第一次在某个账户登录时：

- 如果云端已有数据，应用载入云端记录
- 如果云端为空，应用将当前设备上的本地角色与聊天上传到云端

此后本地修改会先立即写入浏览器，并在短暂延迟后自动同步到 Supabase。这样网络暂时中断时，本机操作仍然可以保留。

## 数据与隐私

- Gemini API Key 仅由服务端读取
- Supabase `anon` / publishable key 可以公开，但数据访问受登录令牌和 RLS 限制
- 不应在前端或仓库中放置 Supabase `service_role` key
- “关于我”的文字资料会随聊天请求发送给 Gemini
- 用户发送语音时，语音内容会发送给 Gemini 进行理解
- 头像不会发送给 Gemini，只用于本地界面和 Supabase 跨设备同步
- 未登录时，数据只存在当前浏览器，清除网站数据可能导致记录丢失

## 原始 Skill 版本

仓库仍保留以下原始内容：

- `SKILL.md`
- `prompts/`
- `tools/`
- `gpt-version/`

这些文件与网页版并存，没有因网页端开发而删除或替换。

## License

[MIT License](LICENSE)
