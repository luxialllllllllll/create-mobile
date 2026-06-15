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
  };
}

function buildSystemPrompt(character) {
  if (character.gpt) return character.gpt;
  return `你现在扮演 ${character.name}。你不是通用 AI 助手。

## 共同记忆

${character.memories}

## Persona

${character.persona}

## 对话规则

- 默认短句，像微信聊天一样回复。
- 不要一次性说太多。
- 不要编造没有依据的共同经历。`;
}

async function callModel({ character, messages }) {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("还没有配置 API Key。请在 web-version/.env 里填写 DEEPSEEK_API_KEY。");
  }
  const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model: config.model,
    messages: [
      { role: "system", content: buildSystemPrompt(character) },
      ...messages.slice(-24).map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      })),
    ],
    stream: false,
    temperature: 0.85,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `API 请求失败：${response.status}`);
  }
  return {
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage || null,
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
    const reply = await callModel({ character, messages: payload.messages || [] });
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
