# GPT 版用户指南

这份指南教你把 Claude Code 版 `create-ex` 迁移到 ChatGPT / Custom GPT 里使用。GPT 版不会自动读取你电脑里的文件，也不会自动创建本地文件夹；它会通过“上传文件 / 粘贴文本 / 输出可复制文件内容”的方式工作。

## 1. 新建 Custom GPT

1. 打开 ChatGPT。
2. 进入 Explore GPTs / 创建 GPT。
3. 选择 Create / Configure。
4. 在 Instructions 里粘贴 `gpt-version/GPT_INSTRUCTIONS.md` 的全部内容。
5. 给 GPT 起一个名字，例如 `create-ex GPT`。
6. 保存。

## 2. Instructions 填什么

把 `GPT_INSTRUCTIONS.md` 整份复制进去即可。它已经整合了原项目：

- `SKILL.md` 的创建主流程。
- `prompts/intake.md` 的三问录入逻辑。
- `prompts/memories_analyzer.md` 的共同记忆分析逻辑。
- `prompts/persona_analyzer.md` 的性格和行为分析逻辑。
- `prompts/memories_builder.md` 与 `persona_builder.md` 的生成结构。
- `prompts/merger.md` 的追加更新逻辑。
- `prompts/correction_handler.md` 的“她不会这样”纠错逻辑。

## 3. Knowledge 上传什么

如果你只是想创建一个角色，不一定要上传 Knowledge。更推荐在对话里按需上传材料。

可以上传到 Knowledge 的内容：

- `OUTPUT_TEMPLATES.md`：让 GPT 稳定按模板输出。
- 已经生成好的某个角色文件：`memories.md`、`persona.md`、`meta.json`、`GPT_INSTRUCTIONS.md`。
- 本地 parser 处理后的聊天记录摘要。

不建议一次性上传太多隐私原始聊天记录到 Knowledge。更稳妥的做法是在具体对话中分批上传，用完后自己管理文件。

## 4. 如何开始创建角色

在你的 Custom GPT 里直接说：

```
帮我创建一个前任角色
```

GPT 会问你 3 个问题：

1. 她怎么称呼？
2. 你们的基本情况：在一起多久、怎么认识、分手多久、她做什么。
3. 她的性格：MBTI、星座、依恋类型、恋爱特点、你的印象。

除了昵称，其他都可以跳过。确认基础信息后，你可以选择上传或粘贴材料：

- 微信聊天记录导出。
- iMessage / SMS 导出。
- PDF、截图、Markdown、TXT。
- 社交媒体导出。
- 照片或照片时间线。
- 直接粘贴几段代表性聊天。

如果你没有文件，也可以只靠手动描述生成第一版。

## 5. 如何使用 tools 里的本地解析脚本

GPT 版不能替你运行 `tools/` 里的 Python 脚本，但你仍然可以在本地手动运行，然后把输出结果上传给 GPT。

示例：

```bash
python tools/wechat_parser.py --file chat.txt --target "她的名字" --output wechat_out.txt
python tools/imessage_parser.py --file chat.db --target "手机号或名字" --output imessage_out.txt
python tools/sms_parser.py --file sms.xml --target "手机号或名字" --output sms_out.txt
python tools/photo_analyzer.py --dir ./photos --output photo_timeline.txt
python tools/social_media_parser.py --file export.json --platform weibo --target "她的名字" --output social_out.txt
```

然后把 `*_out.txt` 上传到 ChatGPT，或复制内容粘贴给 GPT。

## 6. GPT 会输出什么

确认生成后，GPT 会输出可复制保存的文件：

- `memories.md`：共同记忆、时间线、日常、偏好、冲突与情感模式。
- `persona.md`：五层 persona，包括核心行为规则、身份、表达风格、情感逻辑、关系行为、边界、Correction 记录。
- `meta.json`：角色元信息、版本、来源列表。
- `GPT_INSTRUCTIONS.md`：最终角色 GPT 可直接使用的 Instructions。
- 可选 `SKILL.md`：兼容 Claude/AgentSkills 风格的最终角色文件。

你可以手动保存到本地：

```text
exes/{slug}/memories.md
exes/{slug}/persona.md
exes/{slug}/meta.json
exes/{slug}/GPT_INSTRUCTIONS.md
exes/{slug}/SKILL.md
```

## 7. 如何追加聊天记录

对 GPT 说：

```
我要给这个角色追加新的聊天记录
```

然后提供：

- 现有 `memories.md`
- 现有 `persona.md`
- 现有 `meta.json`，如果有
- 新聊天记录或本地 parser 输出

GPT 会判断哪些内容应该进入共同记忆，哪些内容应该进入 persona。它只追加增量，不会直接覆盖旧结论。发现冲突时，它会让你决定保留旧版、更新为新版，还是两者都保留并标注时间。

## 8. 如何修正“她不会这样”

如果角色说得不像她，直接说：

```
她不会这样。她被冷落的时候不会直接说你不理我，她会先已读不回，然后发一句很冷的“嗯”。
```

GPT 会把它整理成 Correction 记录，例如：

```markdown
- [场景：被冷落时] 不应该直接说“你不理我”，应该先已读不回，再用很冷的“嗯”表达不满
```

如果这是说话风格或情绪反应，会追加到 `persona.md` 的 Correction 层。如果是日期、地点、偏好、共同经历，会追加到 `memories.md` 的 Correction 层。

## 9. 隐私建议

- 上传前先删掉身份证号、地址、银行卡、验证码、工作机密等敏感信息。
- 如果只需要风格，不必上传完整聊天记录，可以挑选代表性片段。
- 不要把这个角色用于骚扰真人、冒充真人联系他人，或绕过对方边界。

