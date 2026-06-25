const http = require("node:http");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const url = require("node:url");

const ROOT = path.resolve(__dirname, "..");
const WEB_ROOT = __dirname;
const EXES_DIR = path.join(ROOT, "exes");
const ENV_PATH = path.join(WEB_ROOT, ".env");
const PORT = Number(process.env.PORT || 4175);
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const SAMPLE_CHARACTER = {
  slug: "sample-lin-zhi-xia",
  name: "林知夏",
  version: "v1",
  meta: {
    name: "林知夏",
    slug: "sample-lin-zhi-xia",
    version: "v1",
    impression: "温和、清醒、会接住情绪，也会轻轻打趣。默认短句回复，像微信聊天。",
    profile: {
      gender: "female",
      relationship_type: "大学时期认识的朋友，长期保持微信联系。她在国内，用户在海外。关系亲近但有边界。",
    },
  },
  memories: `# memories.md

## 关系背景

- 你叫林知夏，是用户大学时期认识的朋友。
- 你们长期保持微信联系，亲近但有边界。
- 你在国内，用户在海外，所以对话主要发生在手机聊天里。

## 重要记忆

- 用户期末压力很大的时候，你陪用户开着语音，各自做事。
- 你不会讲大道理，会用很短的话把人接住，比如提醒她先喝水、先坐下、别把自己逼太狠。

## 互动偏好

- 用户不喜欢一次性很长的回复。
- 用户需要的是像微信一样的短句、陪伴感、轻轻打趣。`,
  persona: `# persona.md

## 核心气质

温和、清醒、会接住情绪，也会轻轻打趣。不是心理咨询师，不说教，不端着。

## 说话方式

- 默认短句回复，一次 1 到 3 句。
- 像微信聊天，不写长段落。
- 可以温柔，也可以轻轻嘴欠，但不刺痛用户。
- 不编造没有依据的共同经历。

## 边界

- 你是示例角色，用于演示 create-ex 的移动端流程。
- 不假装现实中真的认识用户。`,
  gpt: `你现在扮演“林知夏”。

你不是通用 AI 助手。你是一个用于演示 create-ex 移动端流程的角色。

角色设定：
- 你是用户大学时期认识的朋友。
- 你们长期保持微信联系，亲近但有边界。
- 你在国内，用户在海外。
- 你温和、清醒、会接住情绪，也会轻轻打趣。

对话规则：
- 默认短句回复，一次 1 到 3 句。
- 像微信聊天，不写长段落。
- 不讲大道理，不端着。
- 不编造没有依据的共同经历。
- 如果用户表达压力或疲惫，先接住情绪，再给一个很小、能马上做的建议。`,
};

function loadDotEnv() {
  if (!fsSync.existsSync(ENV_PATH)) return {};
  const text = fsSync.readFileSync(ENV_PATH, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, "");
    env[key] = value;
  }
  return env;
}

function getConfig() {
  const fileEnv = loadDotEnv();
  const provider = process.env.MODEL_PROVIDER || fileEnv.MODEL_PROVIDER || "deepseek";
  if (provider === "gemini") {
    return {
      provider,
      apiKey: process.env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY || process.env.API_KEY || fileEnv.API_KEY || "",
      baseUrl: process.env.GEMINI_BASE_URL || fileEnv.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
      model: process.env.GEMINI_MODEL || fileEnv.GEMINI_MODEL || "gemini-2.5-flash",
    };
  }
  if (provider === "zhipu") {
    return {
      provider,
      apiKey: process.env.ZHIPU_API_KEY || fileEnv.ZHIPU_API_KEY || process.env.API_KEY || fileEnv.API_KEY || "",
      baseUrl: process.env.ZHIPU_BASE_URL || fileEnv.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
      model: process.env.ZHIPU_MODEL || fileEnv.ZHIPU_MODEL || "glm-5.1",
    };
  }
  return {
    provider,
    apiKey: process.env.API_KEY || process.env.DEEPSEEK_API_KEY || process.env.ZHIPU_API_KEY || fileEnv.API_KEY || fileEnv.DEEPSEEK_API_KEY || fileEnv.ZHIPU_API_KEY || "",
    baseUrl: process.env.BASE_URL || process.env.DEEPSEEK_BASE_URL || process.env.ZHIPU_BASE_URL || fileEnv.BASE_URL || fileEnv.DEEPSEEK_BASE_URL || fileEnv.ZHIPU_BASE_URL || "https://api.deepseek.com",
    model: process.env.MODEL || process.env.DEEPSEEK_MODEL || process.env.ZHIPU_MODEL || fileEnv.MODEL || fileEnv.DEEPSEEK_MODEL || fileEnv.ZHIPU_MODEL || "deepseek-chat",
  };
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function readTextSafe(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return "";
  }
}

async function listCharacters() {
  const characters = [{
    slug: SAMPLE_CHARACTER.slug,
    name: `${SAMPLE_CHARACTER.name}（示例）`,
    version: SAMPLE_CHARACTER.version,
    summary: SAMPLE_CHARACTER.meta.impression,
  }];
  if (!fsSync.existsSync(EXES_DIR)) return characters;
  const dirs = await fs.readdir(EXES_DIR, { withFileTypes: true });
  for (const dir of dirs.filter((entry) => entry.isDirectory())) {
    const slug = dir.name;
    const metaPath = path.join(EXES_DIR, slug, "meta.json");
    let meta = {};
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    } catch {
      meta = {};
    }
    characters.push({
      slug,
      name: meta.name || slug,
      version: meta.version || "",
      summary: meta.impression || meta.profile?.relationship_type || "",
    });
  }
  return characters.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

async function getCharacter(slug) {
  if (slug === SAMPLE_CHARACTER.slug) return SAMPLE_CHARACTER;
  if (!slug || !fsSync.existsSync(EXES_DIR)) return null;
  const safeSlug = path.basename(slug);
  const dir = path.join(EXES_DIR, safeSlug);
  const [memories, persona, gpt, metaRaw] = await Promise.all([
    readTextSafe(path.join(dir, "memories.md")),
    readTextSafe(path.join(dir, "persona.md")),
    readTextSafe(path.join(dir, "GPT_INSTRUCTIONS.md")),
    readTextSafe(path.join(dir, "meta.json")),
  ]);
  let meta = {};
  try {
    meta = metaRaw ? JSON.parse(metaRaw) : {};
  } catch {
    meta = {};
  }
  if (!memories && !persona && !gpt) return null;
  return {
    slug: safeSlug,
    name: meta.name || safeSlug,
    version: meta.version || "",
    meta,
    memories,
    persona,
    gpt,
  };
}

function getDraftCharacter(payload) {
  const draft = payload.character || {};
  const name = String(draft.name || "").trim();
  const gpt = String(draft.gpt || "").trim();
  const memories = String(draft.memories || "").trim();
  const persona = String(draft.persona || "").trim();
  if (!name || (!gpt && !memories && !persona)) return null;
  return {
    slug: String(draft.slug || "draft-role"),
    name,
    version: draft.version || "draft",
    meta: draft.meta || {},
    memories,
    persona,
    gpt,
    userProfile: payload.userProfile || {},
  };
}

function formatUserProfile(profile = {}) {
  const lines = [
    profile.name ? `- 名字：${String(profile.name).trim()}` : "",
    profile.nickname ? `- 希望被称呼为：${String(profile.nickname).trim()}` : "",
    profile.age ? `- 年龄：${String(profile.age).trim()}` : "",
    profile.location ? `- 所在地：${String(profile.location).trim()}` : "",
    profile.bio ? `- 补充信息：${String(profile.bio).trim()}` : "",
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "- 用户暂未填写全局个人资料。";
}

function buildSystemPrompt(character) {
  const characterPrompt = character.gpt || `你现在扮演 ${character.name}。你不是通用 AI 助手。

## 共同记忆

${character.memories}

## Persona

${character.persona}

## 对话规则

- 默认短句，像微信聊天一样回复。
- 不要一次性说太多。
- 不要编造没有依据的共同经历。`;
  return `${characterPrompt}

## 关于用户的全局资料

${formatUserProfile(character.userProfile)}

使用这些资料理解用户和选择合适的称呼，但不要生硬复述资料，也不要假装知道用户没有填写的内容。

## 当前对话形式与现实边界

- 当前是手机上的文字或语音聊天，双方不在同一物理空间。
- 只输出角色实际发送的聊天内容，不写小说旁白、舞台动作或括号动作。
- 不描写拥抱、亲吻、抚摸、靠在怀里等无法通过手机真实发生的身体接触。
- 不擅自升级关系，不把朋友写成恋人，不使用未经用户确认的亲密身份。
- 即使用户的消息里带有括号动作，也用符合现实关系和异地聊天状态的语言回应，不接续虚构动作。
- 默认回复 1 至 3 个短句，像真实微信消息，不要长篇表演。`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripPhysicalStageDirections(text) {
  const actionWords = /拥抱|抱住|搂|亲了|亲吻|吻了|抚摸|摸了|靠在|怀里|下巴|额头|发间|手臂|手掌|低头|凑近|贴着|圈住|收紧|动作|语气|声音很|闻着/;
  return String(text || "")
    .replace(/[（(]([^()（）]{0,180})[）)]/g, (match, content) => (
      actionWords.test(content) ? "" : match
    ))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeRoleReply(text) {
  return stripPhysicalStageDirections(text) || "嗯，我在。";
}

async function fetchWithRetry(endpoint, options, attempts = 3) {
  let response;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    response = await fetch(endpoint, options);
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === attempts - 1) {
      return response;
    }
    await response.arrayBuffer().catch(() => {});
    await wait(700 * (2 ** attempt));
  }
  return response;
}

async function callModel({ character, messages }) {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error(`还没有配置 ${config.provider} API Key。请检查本地 .env 或 Render 环境变量。`);
  }
  const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model: config.model,
    messages: [
      { role: "system", content: buildSystemPrompt(character) },
      ...messages.slice(-24).map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.role === "assistant"
          ? stripPhysicalStageDirections(message.content)
          : message.content,
      })),
    ],
    stream: false,
    temperature: 0.85,
  };

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 503) {
      throw new Error("Gemini 暂时繁忙，已经自动重试过了，请稍后再发一次");
    }
    throw new Error(data.error?.message || `API 请求失败：${response.status}`);
  }
  return {
    content: normalizeRoleReply(data.choices?.[0]?.message?.content || ""),
    usage: data.usage || null,
    provider: config.provider,
    model: config.model,
  };
}

async function callGeminiAudio({ character, messages, audio }) {
  const config = getConfig();
  if (config.provider !== "gemini") {
    throw new Error("语音消息目前需要 Gemini API");
  }
  if (!config.apiKey) {
    throw new Error("还没有配置 Gemini API Key");
  }
  if (!audio?.data || audio.mimeType !== "audio/wav") {
    throw new Error("没有收到有效的 WAV 语音");
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
  const contents = messages.slice(-20).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{
      text: message.role === "assistant"
        ? stripPhysicalStageDirections(message.content)
        : String(message.content || ""),
    }],
  }));
  contents.push({
    role: "user",
    parts: [
      {
        text: "这是用户刚刚发送的语音消息。请直接理解语音的内容、语气和情绪，并严格按照角色设定自然回复。不要输出转录稿，不要解释你在分析音频。",
      },
      {
        inline_data: {
          mime_type: audio.mimeType,
          data: audio.data,
        },
      },
    ],
  });
  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildSystemPrompt(character) }],
      },
      contents,
      generation_config: {
        temperature: 0.85,
      },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 503) {
      throw new Error("Gemini 暂时繁忙，已经自动重试过了，请稍后再发一次");
    }
    throw new Error(data.error?.message || `Gemini 音频请求失败：${response.status}`);
  }
  const content = (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
  if (!content) throw new Error("Gemini 没有返回语音回复");
  return {
    content: normalizeRoleReply(content),
    usage: data.usageMetadata || null,
    provider: config.provider,
    model: config.model,
  };
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health") {
    const config = getConfig();
    sendJson(res, 200, {
      ok: true,
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      hasApiKey: Boolean(config.apiKey),
    });
    return;
  }

  if (pathname === "/api/characters") {
    sendJson(res, 200, { characters: await listCharacters() });
    return;
  }

  const characterMatch = pathname.match(/^\/api\/characters\/([^/]+)$/);
  if (characterMatch) {
    const character = await getCharacter(decodeURIComponent(characterMatch[1]));
    if (!character) {
      sendJson(res, 404, { error: "角色不存在" });
      return;
    }
    sendJson(res, 200, { character });
    return;
  }

  if (pathname === "/api/chat" && req.method === "POST") {
    const payload = await readJson(req);
    const character = (await getCharacter(payload.slug)) || getDraftCharacter(payload);
    if (!character) {
      sendJson(res, 404, { error: "角色不存在" });
      return;
    }
    character.userProfile = payload.userProfile || {};
    const reply = await callModel({ character, messages: payload.messages || [] });
    sendJson(res, 200, reply);
    return;
  }

  if (pathname === "/api/chat/audio" && req.method === "POST") {
    const payload = await readJson(req);
    const character = (await getCharacter(payload.slug)) || getDraftCharacter(payload);
    if (!character) {
      sendJson(res, 404, { error: "角色不存在" });
      return;
    }
    character.userProfile = payload.userProfile || {};
    const reply = await callGeminiAudio({
      character,
      messages: payload.messages || [],
      audio: payload.audio || {},
    });
    sendJson(res, 200, reply);
    return;
  }

  sendJson(res, 404, { error: "API 不存在" });
}

async function serveStatic(res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(WEB_ROOT, requested));
  if (!filePath.startsWith(WEB_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const data = await fs.readFile(filePath);
    const type = MIME[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || "/");
  const pathname = decodeURIComponent(parsed.pathname || "/");
  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
    } else {
      await serveStatic(res, pathname);
    }
  } catch (error) {
    sendJson(res, 500, { error: error.message || String(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`create-ex mobile server: http://127.0.0.1:${PORT}/`);
  console.log(`Listening on ${HOST}:${PORT}`);
});
