# 迁移说明

本目录是 Claude Code Skill 项目 `create-ex` 的 ChatGPT / Custom GPT 可用版本。原始 Claude Code 版保持不变：根目录 `SKILL.md`、`prompts/`、`tools/`、`exes/` 都不删除、不改坏。

## 迁移目标

Claude Code 版依赖本地工具能力：`Read`、`Write`、`Edit`、`Bash`。ChatGPT / Custom GPT 不能直接访问用户电脑的本地路径，也不能直接运行项目里的 Python parser。因此 GPT 版把“本地自动化流程”改写成“用户上传材料，GPT 生成可复制内容”的流程。

## 新增文件

`gpt-version/` 包含：

- `GPT_INSTRUCTIONS.md`：可直接复制到 ChatGPT Custom GPT Instructions 的完整系统指令。
- `GPT_USER_GUIDE.md`：中文用户指南，说明如何创建 Custom GPT、上传 Knowledge、开始创建角色、追加聊天、处理纠错。
- `OUTPUT_TEMPLATES.md`：`memories.md`、`persona.md`、`meta.json`、最终角色 `SKILL.md` 和 GPT Instructions 模板。
- `MIGRATION_NOTES.md`：本迁移说明。

## 功能替换关系

| Claude Code 版 | GPT 版替换方式 |
|---|---|
| `/create-ex` 命令 | 自然语言触发，例如“帮我创建一个前任角色” |
| `/update-ex {slug}` | 自然语言触发，例如“我要追加新的聊天记录” |
| `/list-exes` | 用户自行查看本地保存的角色文件夹，或把索引文件粘贴给 GPT 汇总 |
| `Read` 读取 PDF/图片/TXT/MD | 用户在 ChatGPT 对话里上传文件，或直接粘贴文本 |
| `Bash` 运行 parser | 用户本地手动运行 `tools/` 脚本，再上传输出结果 |
| `Write` 写入 `memories.md`、`persona.md`、`meta.json`、`SKILL.md` | GPT 输出完整文件内容，用户手动保存 |
| `Edit` 增量修改文件 | GPT 输出 patch 或更新后的完整文件，用户手动替换 |
| `exes/{slug}` 本地自动创建 | 用户手动创建和维护本地文件夹 |
| `version_manager.py` 自动备份/回滚 | 用户手动保存版本，或让 GPT 根据上传的旧版/新版生成差异 |

## prompts 逻辑如何整合

GPT 版不是只改写根目录 `SKILL.md`，而是整合了 `prompts/` 中的核心逻辑：

- `intake.md`：保留“三问录入”方式，提取昵称、slug、关系信息、MBTI、星座、依恋类型、恋爱标签、主观印象。
- `memories_analyzer.md`：保留关系时间线、共同日常、偏好、冲突修复、情感动态五个提取维度。
- `persona_analyzer.md`：保留表达风格、情感逻辑、关系行为、边界雷区，以及标签到 Layer 0 行为规则的翻译。
- `memories_builder.md`：保留 `memories.md` 的 Markdown 结构。
- `persona_builder.md`：保留 Persona 的 Layer 0 到 Layer 5 五层结构和 Correction 记录。
- `merger.md`：保留“只追加增量、不覆盖旧结论、冲突交给用户决定”的更新策略。
- `correction_handler.md`：保留“她不会这样”纠错识别、归属判断、Correction 记录格式和合并规则。

## tools 文件夹处理

`tools/` 没有被修改。GPT 版仍然允许用户利用这些脚本，只是运行方式变为用户本地手动执行。

典型流程：

1. 用户在本地运行 parser。
2. parser 输出 `.txt` 或 `.json`。
3. 用户把输出文件上传到 ChatGPT。
4. GPT 基于解析结果生成或更新角色文件。

示例：

```bash
python tools/wechat_parser.py --file chat.txt --target "她的名字" --output wechat_out.txt
python tools/imessage_parser.py --file chat.db --target "手机号或名字" --output imessage_out.txt
python tools/sms_parser.py --file sms.xml --target "手机号或名字" --output sms_out.txt
python tools/photo_analyzer.py --dir ./photos --output photo_timeline.txt
python tools/social_media_parser.py --file export.json --platform weibo --target "她的名字" --output social_out.txt
```

## 主要差异

### 1. 自动化程度不同

Claude Code 版可以直接读写项目文件、运行脚本、创建目录。GPT 版只能生成内容和指导用户保存。

### 2. 数据入口不同

Claude Code 版可以通过路径读取本地文件。GPT 版要求用户上传文件或粘贴文本。

### 3. 文件状态管理不同

Claude Code 版可自动维护 `exes/{slug}/versions`。GPT 版需要用户自己保存版本；如需合并，用户要把旧版文件和新材料一起提供给 GPT。

### 4. 角色使用方式不同

Claude Code 版生成的是 AgentSkills / Claude Code 风格的 `SKILL.md`。GPT 版重点生成可粘贴到 Custom GPT 的最终 `GPT Instructions`，同时保留可选 `SKILL.md` 模板。

### 5. 隐私责任不同

Claude Code 版强调本地处理。GPT 版需要用户主动决定上传哪些内容。建议用户先脱敏聊天记录，删除手机号、地址、身份证号、银行卡、验证码、工作机密等敏感信息。

## 保留内容

以下内容没有删除，也不应因 GPT 迁移而删除：

- 根目录 `SKILL.md`
- `prompts/`
- `tools/`
- `README.md`
- `README_EN.md`
- `INSTALL.md`
- `requirements.txt`
- 已有 `exes/` 内容

GPT 版是并行版本，不替代 Claude Code 版。

