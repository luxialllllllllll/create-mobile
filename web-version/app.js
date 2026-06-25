const STORAGE_KEY = "create-ex-mobile-state";

const state = {
  activePanel: "chat",
  selectedOutput: "memories",
  storage: {
    userId: "",
    savedAt: "",
  },
  roles: {},
  activeRoleKey: "",
  chatView: "list",
  unread: 0,
  role: {
    name: "",
    slug: "",
    gender: "",
    avatarId: "",
    remark: "",
    basic: "",
    persona: "",
    tags: [],
    version: "v1",
  },
  materials: [],
  outputs: {
    memories: "",
    persona: "",
    meta: "",
    gpt: "",
  },
  chat: [],
  server: {
    online: false,
    hasApiKey: false,
    model: "",
    provider: "",
  },
  selectedCharacter: "",
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function slugify(value) {
  return (value || "unnamed-role")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unnamed-role";
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 1700);
}

function createLocalUserId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blankRole() {
  return {
    name: "",
    slug: "",
    gender: "",
    avatarId: "",
    remark: "",
    basic: "",
    persona: "",
    tags: [],
    version: "v1",
    voiceAuto: false,
  };
}

function blankOutputs() {
  return {
    memories: "",
    persona: "",
    meta: "",
    gpt: "",
  };
}

function roleKeyFromRole(role = state.role) {
  return role.slug || slugify(role.name || "unnamed-role");
}

function displayRoleName(role = state.role) {
  return role.remark?.trim() || role.name || "未命名角色";
}

function snapshotCurrentRole() {
  return {
    role: { ...state.role },
    materials: [...state.materials],
    outputs: { ...state.outputs },
    chat: [...state.chat],
    unread: state.unread || 0,
    updatedAt: new Date().toISOString(),
  };
}

function persistCurrentRole() {
  if (!state.role.name.trim()) return;
  const key = roleKeyFromRole();
  state.roles = state.roles || {};
  state.roles[key] = snapshotCurrentRole();
  state.activeRoleKey = key;
}

function applyRoleSnapshot(key) {
  const snapshot = state.roles?.[key];
  if (!snapshot) return false;
  state.activeRoleKey = key;
  state.selectedCharacter = "";
  state.role = { ...blankRole(), ...(snapshot.role || {}) };
  state.materials = [...(snapshot.materials || [])];
  state.outputs = { ...blankOutputs(), ...(snapshot.outputs || {}) };
  state.chat = [...(snapshot.chat || [])];
  state.unread = snapshot.unread || 0;
  return true;
}

function getSortedRoleEntries() {
  return Object.entries(state.roles || {}).sort(([, a], [, b]) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || "")
  );
}

function totalUnreadCount() {
  return Object.values(state.roles || {}).reduce((total, snapshot) => total + (snapshot.unread || 0), 0);
}

function renderUnreadBadges() {
  const total = totalUnreadCount();
  if (!els.chatUnreadBadge) return;
  els.chatUnreadBadge.hidden = total <= 0;
  els.chatUnreadBadge.textContent = total > 99 ? "99+" : String(total);
}

function renderLocalRoleSelectors() {
  const selects = [
    els.localRoleSelect,
    els.generateRoleSelect,
  ].filter(Boolean);
  const entries = Object.entries(state.roles || {}).sort(([, a], [, b]) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || "")
  );
  selects.forEach((select) => {
    select.innerHTML = `<option value="">当前草稿</option>`;
    entries.forEach(([key, snapshot]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = displayRoleName(snapshot.role || { name: key });
      select.appendChild(option);
    });
    select.value = state.activeRoleKey || "";
  });
}

function newBlankRole() {
  persistCurrentRole();
  state.activeRoleKey = "";
  state.selectedCharacter = "";
  state.role = blankRole();
  state.materials = [];
  state.outputs = blankOutputs();
  state.chat = [];
  state.unread = 0;
  syncInputs();
  renderLocalRoleSelectors();
  renderMaterials();
  renderOutputs();
  renderChat();
  saveState();
  toast("已新建空白角色");
}

function saveState() {
  persistCurrentRole();
  state.storage = {
    ...(state.storage || {}),
    userId: state.storage?.userId || createLocalUserId(),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.storage.userId = createLocalUserId();
    saveState();
    return;
  }
  try {
    const next = JSON.parse(raw);
    Object.assign(state, next);
    if (state.activePanel === "materials") {
      state.activePanel = "chat";
      state.chatView = state.role?.name ? "detail" : "list";
    }
    state.storage = { ...state.storage, ...(next.storage || {}) };
    state.storage.userId = state.storage.userId || createLocalUserId();
    state.roles = next.roles || {};
    state.role = { ...state.role, ...(next.role || {}) };
    state.outputs = { ...state.outputs, ...(next.outputs || {}) };
    if (!Object.keys(state.roles).length && state.role.name) {
      persistCurrentRole();
    }
    if (state.activeRoleKey) {
      applyRoleSnapshot(state.activeRoleKey);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    state.storage.userId = createLocalUserId();
    saveState();
  }
}

function syncInputs() {
  els.nameInput.value = state.role.name;
  els.basicInput.value = state.role.basic;
  els.personaInput.value = state.role.persona;
  els.roleVersion.textContent = state.role.version || "v1";
  applyRoleAvatar(els.avatarPreview, state.role);
  document.querySelectorAll("[data-gender]").forEach((button) => {
    const active = button.dataset.gender === state.role.gender;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-tag]").forEach((button) => {
    button.classList.toggle("active", state.role.tags.includes(button.dataset.tag));
  });
  renderLocalRoleSelectors();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `请求失败：${response.status}`);
  return data;
}

async function refreshServer() {
  try {
    const health = await api("/api/health");
    state.server = {
      online: true,
      hasApiKey: health.hasApiKey,
      model: health.model,
      provider: health.provider,
    };
  } catch {
    state.server = { online: false, hasApiKey: false, model: "", provider: "" };
  }
}

async function refreshCharacters() {
  if (!els.characterSelect) return;
  try {
    const data = await api("/api/characters");
    els.characterSelect.innerHTML = `<option value="">选择电脑里的角色</option>`;
    data.characters.forEach((character) => {
      const option = document.createElement("option");
      option.value = character.slug;
      option.textContent = `${character.name}${character.version ? ` · ${character.version}` : ""}`;
      els.characterSelect.appendChild(option);
    });
    els.characterSelect.value = state.selectedCharacter || "";
  } catch {
    els.characterSelect.innerHTML = `<option value="">后端未连接</option>`;
  }
}

async function loadCharacter(slug) {
  if (!slug) return;
  persistCurrentRole();
  const data = await api(`/api/characters/${encodeURIComponent(slug)}`);
  const character = data.character;
  state.selectedCharacter = slug;
  state.role = {
    name: character.name,
    slug: character.slug,
    gender: character.meta?.profile?.gender || "",
    avatarId: "",
    remark: "",
    basic: character.meta?.impression || character.meta?.profile?.relationship_type || "",
    persona: [
      character.meta?.impression,
      character.meta?.profile?.location_context,
    ].filter(Boolean).join("\n"),
    tags: character.meta?.tags?.personality || [],
    version: character.version || "v1",
  };
  state.outputs.memories = character.memories || "";
  state.outputs.persona = character.persona || "";
  state.outputs.meta = JSON.stringify(character.meta || {}, null, 2);
  state.outputs.gpt = character.gpt || "";
  state.chat = [];
  syncInputs();
  renderOutputs(false);
  renderChat();
  saveState();
  toast("已载入电脑角色");
}

function switchLocalRole(key) {
  if (!key) return;
  persistCurrentRole();
  if (!applyRoleSnapshot(key)) {
    toast("这个角色存档不存在");
    return;
  }
  syncInputs();
  renderMaterials();
  renderOutputs(false);
  renderChat();
  saveState();
  toast(`已切换到 ${state.role.name || "未命名角色"}`);
}

function ensureNamedRole() {
  syncFromInputs();
  if (state.role.name) return true;
  toast("先选择或创建一个角色");
  state.activePanel = "create";
  renderPanels();
  return false;
}

function openChatRole(key) {
  if (key) switchLocalRole(key);
  state.chatView = "thread";
  state.unread = 0;
  if (state.activeRoleKey && state.roles[state.activeRoleKey]) {
    state.roles[state.activeRoleKey].unread = 0;
  }
  renderChat();
  saveState();
}

function openRoleDetails() {
  if (!ensureNamedRole()) return;
  state.chatView = "detail";
  renderChat();
  saveState();
}

function syncFromInputs() {
  state.role.name = els.nameInput.value.trim();
  state.role.slug = slugify(state.role.name);
  state.role.basic = els.basicInput.value.trim();
  state.role.persona = els.personaInput.value.trim();
}

function renderPanels() {
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${state.activePanel}`);
  });
  document.querySelectorAll(".tabbar button").forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === state.activePanel);
  });
  renderUnreadBadges();
}

function appendMessageToRole(key, message, unread = false) {
  if (!key) return;
  const isCurrent = key === state.activeRoleKey;
  if (isCurrent) {
    state.chat.push(message);
    if (unread) state.unread = (state.unread || 0) + 1;
    persistCurrentRole();
    return;
  }
  const snapshot = state.roles?.[key];
  if (!snapshot) return;
  snapshot.chat = [...(snapshot.chat || []), message];
  snapshot.updatedAt = new Date().toISOString();
  if (unread) snapshot.unread = (snapshot.unread || 0) + 1;
}

function isViewingRoleThread(key) {
  return state.activePanel === "chat" && state.chatView === "thread" && state.activeRoleKey === key;
}

function materialTitle(type) {
  return {
    chat: "聊天记录",
    memory: "重要事件",
    photo: "照片时间线",
    social: "社交媒体",
    correction: "纠错记录",
  }[type] || "材料";
}

function renderMaterials() {
  els.materialCount.textContent = `${state.materials.length} 条`;
  els.materialList.innerHTML = "";
  state.materials.forEach((item, index) => {
    const node = document.createElement("article");
    node.className = "material-item";
    const text = item.text.length > 150 ? `${item.text.slice(0, 150)}...` : item.text;
    node.innerHTML = `<strong>${materialTitle(item.type)} · ${item.name || `片段 ${index + 1}`}</strong><p></p>`;
    node.querySelector("p").textContent = text;
    els.materialList.appendChild(node);
  });
}

function materialSummary(type) {
  const items = state.materials.filter((item) => item.type === type);
  if (!items.length) return "（暂无材料，建议继续补充）";
  return items.map((item, index) => `- ${item.name || `${materialTitle(type)} ${index + 1}`}：${item.text.trim()}`).join("\n");
}

function allMaterialSummary() {
  if (!state.materials.length) return "（暂无额外材料）";
  return state.materials.map((item, index) => `- ${materialTitle(item.type)} ${index + 1}：${item.text.trim()}`).join("\n");
}

function generateOutputs(allowTemplate = true) {
  if (!allowTemplate && (state.outputs.memories || state.outputs.persona || state.outputs.gpt)) return;
  syncFromInputs();
  const name = state.role.name || "未命名角色";
  const slug = state.role.slug || slugify(name);
  const today = new Date().toISOString().slice(0, 10);
  const tags = state.role.tags.length ? state.role.tags.join("、") : "（未填写）";
  const genderLabel = state.role.gender === "male"
    ? "男"
    : state.role.gender === "female"
      ? "女"
      : "（未选择）";
  const coreRules = [
    state.role.persona || "（根据补充材料继续提炼性格规则）",
    state.role.tags.includes("嘴毒但不伤人") ? "说话可以打趣和嘴毒，但不能真正攻击或羞辱对方。" : "",
    state.role.tags.includes("有边界感") ? "尊重现实边界，不强迫定义关系，不把陪伴变成压力。" : "",
  ].filter(Boolean);

  state.outputs.memories = `# ${name} — 共同记忆

## 关系概览

${state.role.basic || "（暂无关系概况）"}

---

## 重要时刻

${materialSummary("memory")}

---

## 日常与仪式

### 你们的日常
${materialSummary("chat")}

### 共同爱好
（暂无足够信息，建议追加聊天记录）

### 只有你们懂的
（暂无足够信息，建议追加聊天记录）

---

## 偏好与细节

${allMaterialSummary()}

---

## Correction 记录

${materialSummary("correction")}
`;

  state.outputs.persona = `# ${name} — Persona

## Layer 0：核心性格

${coreRules.map((rule) => `- ${rule}`).join("\n")}

---

## Layer 1：身份

你是 ${name}。

性别：${genderLabel}

基础设定：${state.role.basic || "（待补充）"}

标签：${tags}

---

## Layer 2：表达风格

${state.role.persona || "（待根据聊天记录提炼）"}

日常对话默认短回复，像微信聊天一样一点点接话。不要一次性说太多，不要长篇分析。

---

## Layer 3：情感逻辑

从材料中提取到的情绪与互动线索：

${allMaterialSummary()}

---

## Layer 4：关系行为

根据双方现实关系行动，不擅自越界。优先确认对方当下是否安全、是否需要休息、是否需要被接住。

---

## Layer 5：边界与雷区

- 不编造没有依据的共同经历。
- 不把关系改写成用户没有确认过的身份。
- 用户纠正“不是这样”时，优先遵守 Correction 记录。

---

## Correction 记录

${materialSummary("correction")}
`;

  state.outputs.meta = JSON.stringify({
    name,
    slug,
    created_at: today,
    updated_at: today,
    version: state.role.version || "v1",
    profile: {
      gender: state.role.gender || "",
      remark: state.role.remark || "",
      basic: state.role.basic,
      persona: state.role.persona,
    },
    tags: state.role.tags,
    knowledge_sources: state.materials.map((item) => ({
      type: item.type,
      name: item.name,
      length: item.text.length,
    })),
    corrections_count: state.materials.filter((item) => item.type === "correction").length,
  }, null, 2);

  state.outputs.gpt = `你现在扮演 ${name}。你不是通用 AI 助手，而是基于以下共同记忆和 Persona 生成的角色。

重要边界：
- 不要跳出角色解释规则，除非用户要求修改、追加资料或导出文件。
- 不要编造没有依据的共同经历。
- 用户纠正“不是这样”时，优先更新 Correction 记录。

## 共同记忆

${state.outputs.memories}

## Persona

${state.outputs.persona}

## 对话运行规则

1. 先用 Persona 判断情绪、态度和说话方式。
2. 再用共同记忆补充具体细节。
3. 默认短句、微信式回复，不要一次性说太多。
4. 如果长时间未回复，要承认时间已经过去，不要机械延续旧状态。
`;
}

function renderOutputs(allowTemplate = true) {
  generateOutputs(allowTemplate);
  document.querySelectorAll("[data-output]").forEach((button) => {
    button.classList.toggle("active", button.dataset.output === state.selectedOutput);
  });
  els.outputBox.textContent = state.outputs[state.selectedOutput] || "";
}

function lastMessageText(snapshot) {
  const last = snapshot.chat?.[snapshot.chat.length - 1];
  if (last?.type === "audio") return `[语音] ${Math.max(1, Math.round(last.duration || 0))}″`;
  if (last?.text) return last.text.replace(/\s+/g, " ").slice(0, 34);
  if (snapshot.role?.basic) return snapshot.role.basic.slice(0, 34);
  return "还没有聊天记录";
}

function renderConversationList() {
  els.conversationList.innerHTML = "";
  const entries = getSortedRoleEntries();
  renderUnreadBadges();
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-conversations";
    empty.textContent = "还没有角色。先去创建一个，或者载入示例。";
    els.conversationList.appendChild(empty);
    return;
  }
  entries.forEach(([key, snapshot]) => {
    const item = document.createElement("button");
    item.className = "conversation-item";
    item.type = "button";
    item.dataset.roleKey = key;
    item.innerHTML = `
      <span class="conversation-avatar" aria-hidden="true"></span>
      <span class="conversation-main">
        <strong></strong>
        <small></small>
      </span>
      <span class="conversation-meta">
        <span class="conversation-time"></span>
        <span class="conversation-badge" hidden>0</span>
      </span>
    `;
    item.querySelector("strong").textContent = displayRoleName(snapshot.role || { name: key });
    applyRoleAvatar(item.querySelector(".conversation-avatar"), snapshot.role || {});
    item.querySelector("small").textContent = lastMessageText(snapshot);
    item.querySelector(".conversation-time").textContent = snapshot.updatedAt
      ? new Date(snapshot.updatedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
      : "";
    const badge = item.querySelector(".conversation-badge");
    badge.hidden = !(snapshot.unread > 0);
    badge.textContent = snapshot.unread > 99 ? "99+" : String(snapshot.unread || 0);
    item.addEventListener("click", () => openChatRole(key));
    els.conversationList.appendChild(item);
  });
}

function renderChat() {
  renderUnreadBadges();
  const isList = state.chatView === "list";
  const isDetail = state.chatView === "detail";
  els.chatListView.classList.toggle("active", isList);
  els.chatThreadView.classList.toggle("active", !isList && !isDetail);
  els.chatDetailView.classList.toggle("active", isDetail);
  if (isList) {
    renderConversationList();
    return;
  }
  if (isDetail) {
    renderRoleDetails();
    return;
  }
  els.chatName.textContent = displayRoleName();
  applyRoleAvatar(els.chatAvatar, state.role);
  els.autoVoiceBtn.classList.toggle("active", Boolean(state.role.voiceAuto));
  els.autoVoiceBtn.setAttribute("aria-pressed", String(Boolean(state.role.voiceAuto)));
  if (state.server.online && state.server.hasApiKey) {
    els.chatContext.textContent = `${state.role.slug || "local"} · ${state.server.provider}/${state.server.model}`;
  } else if (state.server.online) {
    els.chatContext.textContent = `${state.role.slug || "local"} · 后端已连接，缺 API Key`;
  } else {
    els.chatContext.textContent = `${state.role.slug || "local"} · 本地预览`;
  }
  clearAudioObjectUrls();
  els.chatLog.innerHTML = "";
  const messages = state.chat.length ? state.chat : [
    { who: "bot", text: "角色还在草稿里。\n先填信息，我再陪你试聊。" },
  ];
  messages.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${message.who}`;
    if (message.type === "audio" && message.audioId) {
      renderAudioBubble(bubble, message);
    } else {
      bubble.textContent = message.text;
    }
    if (message.who === "bot" && message.text) {
      bubble.tabIndex = 0;
      bubble.setAttribute("role", "button");
      bubble.setAttribute("aria-label", `朗读消息：${message.text}`);
      bubble.title = "点击朗读";
      bubble.addEventListener("click", () => speakText(message.text, bubble));
      bubble.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          speakText(message.text, bubble);
        }
      });
    }
    els.chatLog.appendChild(bubble);
  });
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function renderRoleDetails() {
  const genderLabel = state.role.gender === "male"
    ? "男"
    : state.role.gender === "female"
      ? "女"
      : "未设置性别";
  els.detailRoleName.textContent = state.role.name || "未命名角色";
  els.detailGender.textContent = genderLabel;
  els.detailRemarkInput.value = state.role.remark || "";
  els.detailBasic.textContent = state.role.basic || "暂未填写";
  els.detailPersona.textContent = state.role.persona || "暂未填写";
  applyRoleAvatar(els.detailAvatar, state.role);
  renderMaterials();
}

const AUDIO_DB_NAME = "create-ex-audio";
const AUDIO_STORE_NAME = "clips";
const AVATAR_STORE_NAME = "avatars";
const audioObjectUrls = new Set();
const avatarObjectUrls = new Map();
let voiceRecorder = null;
let voiceReleaseRequested = false;
let voiceAutoStopTimer = null;

function setListening(active) {
  els.voiceInputBtn.classList.toggle("recording", active);
  els.chatForm.classList.toggle("listening", active);
  els.voiceInputBtn.setAttribute("aria-label", active ? "松开发送" : "按住录音");
  els.voiceInputBtn.title = active ? "松开发送" : "按住录音";
}

function openAudioDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        request.result.createObjectStore(AUDIO_STORE_NAME);
      }
      if (!request.result.objectStoreNames.contains(AVATAR_STORE_NAME)) {
        request.result.createObjectStore(AVATAR_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveMediaBlob(storeName, blob) {
  const id = crypto.randomUUID?.() || `media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const db = await openAudioDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(blob, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return id;
}

async function getMediaBlob(storeName, id) {
  const db = await openAudioDb();
  const blob = await new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

async function deleteMediaBlob(storeName, id) {
  if (!id) return;
  const db = await openAudioDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function saveAudioBlob(blob) {
  return saveMediaBlob(AUDIO_STORE_NAME, blob);
}

async function getAudioBlob(id) {
  return getMediaBlob(AUDIO_STORE_NAME, id);
}

async function avatarUrl(avatarId) {
  if (!avatarId) return "";
  if (avatarObjectUrls.has(avatarId)) return avatarObjectUrls.get(avatarId);
  const blob = await getMediaBlob(AVATAR_STORE_NAME, avatarId);
  if (!blob) return "";
  const url = URL.createObjectURL(blob);
  avatarObjectUrls.set(avatarId, url);
  return url;
}

async function applyRoleAvatar(element, role) {
  if (!element) return;
  const avatarId = role?.avatarId || "";
  element.dataset.avatarId = avatarId;
  element.classList.remove("custom-avatar");
  element.style.removeProperty("background");
  if (!avatarId) return;
  try {
    const url = await avatarUrl(avatarId);
    if (!url || element.dataset.avatarId !== avatarId) return;
    element.style.setProperty("background", `url("${url}") center / cover no-repeat`, "important");
    element.classList.add("custom-avatar");
  } catch {
    // Keep the default avatar when local media is unavailable.
  }
}

async function imageFileToAvatarBlob(file) {
  let image;
  let cleanup = () => {};
  if ("createImageBitmap" in window) {
    image = await createImageBitmap(file);
    cleanup = () => image.close?.();
  } else {
    const sourceUrl = URL.createObjectURL(file);
    image = await new Promise((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("图片读取失败"));
      node.src = sourceUrl;
    });
    cleanup = () => URL.revokeObjectURL(sourceUrl);
  }
  const side = Math.min(image.width, image.height);
  const sourceX = Math.floor((image.width - side) / 2);
  const sourceY = Math.floor((image.height - side) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 512, 512);
  cleanup();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("头像处理失败")),
      "image/webp",
      0.82
    );
  });
}

function clearAudioObjectUrls() {
  audioObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  audioObjectUrls.clear();
}

async function renderAudioBubble(bubble, message) {
  bubble.classList.add("audio-bubble");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "audio-message";
  button.disabled = true;
  button.innerHTML = `<span class="audio-wave" aria-hidden="true">)))</span><span>${Math.max(1, Math.round(message.duration || 0))}″</span>`;
  bubble.appendChild(button);
  try {
    const blob = await getAudioBlob(message.audioId);
    if (!blob) {
      button.querySelector(".audio-wave").textContent = "!";
      button.title = "这条语音不在当前设备上";
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    audioObjectUrls.add(objectUrl);
    const audio = new Audio(objectUrl);
    button.disabled = false;
    button.setAttribute("aria-label", `播放语音，${Math.max(1, Math.round(message.duration || 0))}秒`);
    button.addEventListener("click", () => {
      document.querySelectorAll(".audio-message.playing").forEach((node) => node.classList.remove("playing"));
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        button.classList.remove("playing");
        return;
      }
      button.classList.add("playing");
      audio.play().catch(() => toast("语音播放失败"));
    });
    audio.addEventListener("ended", () => button.classList.remove("playing"));
    audio.addEventListener("pause", () => button.classList.remove("playing"));
  } catch {
    button.querySelector(".audio-wave").textContent = "!";
    button.title = "语音读取失败";
  }
}

function mergeAudioChunks(chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const samples = new Float32Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    samples.set(chunk, offset);
    offset += chunk.length;
  });
  return samples;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  samples.forEach((sample) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  });
  return new Blob([buffer], { type: "audio/wav" });
}

function stopRecorderTracks(recorder) {
  recorder.source?.disconnect();
  recorder.processor?.disconnect();
  recorder.stream?.getTracks().forEach((track) => track.stop());
  recorder.context?.close().catch(() => {});
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function sendVoiceChat(blob, replyRoleKey) {
  if (!state.server.online || !state.server.hasApiKey || state.server.provider !== "gemini") {
    throw new Error("语音理解需要已配置的 Gemini API");
  }
  generateOutputs();
  const character = {
    name: state.role.name || "未命名角色",
    slug: state.role.slug,
    version: state.role.version || "draft",
    memories: state.outputs.memories || "",
    persona: state.outputs.persona || "",
    gpt: state.outputs.gpt || "",
  };
  const messages = state.chat
    .filter((message) => message.text)
    .slice(-24)
    .map((message) => ({
      role: message.who === "bot" ? "assistant" : "user",
      content: message.text,
    }));
  const data = await api("/api/chat/audio", {
    method: "POST",
    body: JSON.stringify({
      slug: state.selectedCharacter || "",
      character,
      messages,
      audio: {
        mimeType: "audio/wav",
        data: await blobToBase64(blob),
      },
    }),
  });
  const unread = !isViewingRoleThread(replyRoleKey);
  appendMessageToRole(replyRoleKey, { who: "bot", text: data.content }, unread);
  if (!unread && state.role.voiceAuto) speakText(data.content);
}

async function finishVoiceInput(send = true) {
  voiceReleaseRequested = true;
  if (!voiceRecorder) return;
  const recorder = voiceRecorder;
  voiceRecorder = null;
  window.clearTimeout(voiceAutoStopTimer);
  setListening(false);
  stopRecorderTracks(recorder);
  const duration = (Date.now() - recorder.startedAt) / 1000;
  if (!send || duration < 0.45 || !recorder.chunks.length) {
    if (duration < 0.45) toast("说话时间太短");
    return;
  }
  const blob = encodeWav(mergeAudioChunks(recorder.chunks), recorder.sampleRate);
  const audioId = await saveAudioBlob(blob);
  const replyRoleKey = state.activeRoleKey || roleKeyFromRole();
  state.chat.push({
    who: "user",
    type: "audio",
    audioId,
    duration,
    mimeType: "audio/wav",
    createdAt: new Date().toISOString(),
  });
  renderChat();
  saveState();
  try {
    await sendVoiceChat(blob, replyRoleKey);
  } catch (error) {
    const unread = !isViewingRoleThread(replyRoleKey);
    appendMessageToRole(replyRoleKey, { who: "bot", text: `语音发送出问题了。\n${error.message}` }, unread);
  }
  renderChat();
  renderUnreadBadges();
  saveState();
}

async function startVoiceInput(event) {
  event.preventDefault();
  if (!ensureNamedRole()) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext && !window.webkitAudioContext) {
    toast("当前浏览器不支持录音");
    return;
  }
  if (voiceRecorder) return;
  voiceReleaseRequested = false;
  els.voiceInputBtn.setPointerCapture?.(event.pointerId);
  window.speechSynthesis?.cancel();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const chunks = [];
    processor.onaudioprocess = (audioEvent) => {
      chunks.push(new Float32Array(audioEvent.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(context.destination);
    voiceRecorder = {
      stream,
      context,
      source,
      processor,
      chunks,
      sampleRate: context.sampleRate,
      startedAt: Date.now(),
    };
    setListening(true);
    els.chatInput.placeholder = "正在录音，松开发送";
    voiceAutoStopTimer = window.setTimeout(() => {
      toast("语音最长 60 秒，已自动发送");
      finishVoiceInput(true);
    }, 60000);
    if (voiceReleaseRequested) {
      await finishVoiceInput(true);
    }
  } catch (error) {
    setListening(false);
    toast(error?.name === "NotAllowedError" ? "请允许浏览器使用麦克风" : "麦克风启动失败");
  }
}

function preferredChineseVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find((voice) => /^zh[-_](CN|Hans)/i.test(voice.lang))
    || voices.find((voice) => /^zh/i.test(voice.lang))
    || null;
}

function speakText(text, bubble = null) {
  if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
    toast("当前浏览器不支持语音朗读");
    return;
  }
  window.speechSynthesis.cancel();
  document.querySelectorAll(".bubble.speaking").forEach((node) => node.classList.remove("speaking"));
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.96;
  utterance.pitch = 0.94;
  utterance.voice = preferredChineseVoice();
  utterance.onstart = () => bubble?.classList.add("speaking");
  utterance.onend = () => bubble?.classList.remove("speaking");
  utterance.onerror = () => bubble?.classList.remove("speaking");
  window.speechSynthesis.speak(utterance);
}

function botReply(text) {
  const persona = state.role.persona;
  if (/困|睡|累/.test(text)) return "又开始硬撑了。\n先歇会儿。";
  if (/烦|气|讨厌/.test(text)) return "嗯，听着就烦。\n说，谁又惹你了。";
  if (/早|醒/.test(text)) return "醒了？\n看起来脑子还没开机。";
  if (/吃|饭/.test(text)) return "现在才想起来吃？\n你真行。";
  if (persona.includes("嘴毒")) return "行，我听着。\n你慢慢说，别一口气憋死。";
  return "嗯，我在。\n你继续说。";
}

async function sendRealChat(text) {
  const slug = state.selectedCharacter || state.role.slug;
  if (!state.server.online || !state.server.hasApiKey || !slug) return null;
  generateOutputs();
  const messages = state.chat
    .filter((message) => message.text)
    .map((message) => ({
      role: message.who === "bot" ? "assistant" : "user",
      content: message.text,
    }));
  const character = {
    name: state.role.name || "未命名角色",
    slug,
    version: state.role.version || "draft",
    memories: state.outputs.memories || "",
    persona: state.outputs.persona || "",
    gpt: state.outputs.gpt || "",
  };
  const data = await api("/api/chat", {
    method: "POST",
    body: JSON.stringify({ slug: state.selectedCharacter || "", character, messages }),
  });
  return data.content;
}

function download(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function filenameForOutput(kind) {
  return {
    memories: "memories.md",
    persona: "persona.md",
    meta: "meta.json",
    gpt: "GPT_INSTRUCTIONS.md",
  }[kind] || "output.txt";
}

function loadSample() {
  persistCurrentRole();
  state.activeRoleKey = "";
  state.selectedCharacter = "";
  state.role = {
    name: "林知夏",
    slug: "sample-lin-zhi-xia",
    gender: "female",
    avatarId: "",
    remark: "",
    basic: "大学时期认识的朋友，长期保持微信联系。她在国内，用户在海外。关系亲近但有边界，适合作为移动端流程示例。",
    persona: "温和、清醒、会接住情绪，也会轻轻打趣。默认短句回复，像微信聊天，不一次性说太多。",
    tags: ["温柔", "行动型关心", "克制", "会打趣", "有边界感"],
    version: "v1",
  };
  state.materials = [
    {
      type: "memory",
      name: "深夜语音",
      text: "用户期末压力很大的时候，她没有讲大道理，只是陪用户开着语音，各自做事，偶尔提醒一句：先喝口水，别把自己逼太狠。",
    },
    {
      type: "correction",
      name: "回复长度",
      text: "用户不喜欢一次性很长的回复。她应该像微信聊天一样短短地回，必要时分成几句。",
    },
  ];
  state.chat = [];
  syncInputs();
  renderMaterials();
  renderOutputs();
  renderChat();
  saveState();
  toast("已载入示例");
}

async function updateCurrentRoleAvatar(file) {
  if (!file?.type.startsWith("image/")) {
    toast("请选择图片文件");
    return;
  }
  try {
    const oldAvatarId = state.role.avatarId;
    const blob = await imageFileToAvatarBlob(file);
    state.role.avatarId = await saveMediaBlob(AVATAR_STORE_NAME, blob);
    if (oldAvatarId) {
      const oldUrl = avatarObjectUrls.get(oldAvatarId);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      avatarObjectUrls.delete(oldAvatarId);
      await deleteMediaBlob(AVATAR_STORE_NAME, oldAvatarId);
    }
    syncInputs();
    renderChat();
    saveState();
    toast("头像已更新");
  } catch {
    toast("头像处理失败，请换一张图片");
  }
}

async function removeCurrentRoleAvatar() {
  const avatarId = state.role.avatarId;
  state.role.avatarId = "";
  if (avatarId) {
    const oldUrl = avatarObjectUrls.get(avatarId);
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    avatarObjectUrls.delete(avatarId);
    await deleteMediaBlob(AVATAR_STORE_NAME, avatarId).catch(() => {});
  }
  syncInputs();
  renderChat();
  saveState();
  toast("已恢复默认头像");
}

function bindEvents() {
  document.querySelectorAll(".tabbar button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activePanel = button.dataset.panel;
      if (state.activePanel === "chat") state.chatView = "list";
      renderPanels();
      if (state.activePanel === "generate") renderOutputs();
      if (state.activePanel === "chat") renderChat();
      saveState();
    });
  });

  [els.nameInput, els.basicInput, els.personaInput].forEach((input) => {
    input.addEventListener("input", () => {
      syncFromInputs();
      saveState();
      renderOutputs();
      renderChat();
    });
  });

  document.querySelectorAll("[data-gender]").forEach((button) => {
    button.addEventListener("click", () => {
      state.role.gender = state.role.gender === button.dataset.gender ? "" : button.dataset.gender;
      syncInputs();
      renderOutputs();
      saveState();
    });
  });

  els.avatarInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await updateCurrentRoleAvatar(file);
  });

  els.removeAvatarBtn.addEventListener("click", removeCurrentRoleAvatar);
  els.detailAvatarInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await updateCurrentRoleAvatar(file);
  });
  els.detailRemoveAvatarBtn.addEventListener("click", removeCurrentRoleAvatar);

  els.characterSelect.addEventListener("change", async () => {
    try {
      await loadCharacter(els.characterSelect.value);
    } catch (error) {
      toast(error.message);
    }
  });

  [els.localRoleSelect, els.generateRoleSelect].forEach((select) => {
    select.addEventListener("change", () => {
      switchLocalRole(select.value);
    });
  });

  document.querySelectorAll("[data-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      const tag = button.dataset.tag;
      if (state.role.tags.includes(tag)) {
        state.role.tags = state.role.tags.filter((item) => item !== tag);
      } else {
        state.role.tags.push(tag);
      }
      syncInputs();
      renderOutputs();
      saveState();
    });
  });

  els.saveDraftBtn.addEventListener("click", () => {
    syncFromInputs();
    if (!state.role.name) {
      toast("先填角色称呼");
      return;
    }
    saveState();
    renderLocalRoleSelectors();
    toast(`${state.role.name || "草稿"} 已保存在本机`);
  });

  els.loadSampleBtn.addEventListener("click", loadSample);
  els.newRoleBtn.addEventListener("click", newBlankRole);
  els.chatNewRoleBtn.addEventListener("click", () => {
    state.activePanel = "create";
    newBlankRole();
    renderPanels();
  });
  els.chatBackBtn.addEventListener("click", () => {
    window.speechSynthesis?.cancel();
    state.chatView = "list";
    renderChat();
    saveState();
  });
  els.chatDetailsBtn.addEventListener("click", openRoleDetails);
  els.detailBackBtn.addEventListener("click", () => {
    state.chatView = "thread";
    renderChat();
    saveState();
  });
  els.editRoleBtn.addEventListener("click", () => {
    state.activePanel = "create";
    renderPanels();
    syncInputs();
    saveState();
  });
  els.detailRemarkInput.addEventListener("input", () => {
    state.role.remark = els.detailRemarkInput.value.trim();
    saveState();
  });
  els.autoVoiceBtn.addEventListener("click", () => {
    state.role.voiceAuto = !state.role.voiceAuto;
    renderChat();
    saveState();
    toast(state.role.voiceAuto ? "已开启自动朗读" : "已关闭自动朗读");
  });
  els.voiceInputBtn.addEventListener("pointerdown", startVoiceInput);
  els.voiceInputBtn.addEventListener("pointerup", () => finishVoiceInput(true));
  els.voiceInputBtn.addEventListener("pointercancel", () => finishVoiceInput(false));
  els.voiceInputBtn.addEventListener("contextmenu", (event) => event.preventDefault());

  els.addMaterialBtn.addEventListener("click", () => {
    if (!ensureNamedRole()) return;
    const text = els.materialInput.value.trim();
    if (!text) {
      toast("先粘贴一点材料");
      return;
    }
    state.materials.unshift({
      type: els.materialType.value,
      name: "手动粘贴",
      text,
      createdAt: new Date().toISOString(),
    });
    els.materialInput.value = "";
    renderMaterials();
    renderOutputs();
    saveState();
    toast("已加入材料");
  });

  els.clearMaterialsBtn.addEventListener("click", () => {
    if (!ensureNamedRole()) return;
    state.materials = [];
    renderMaterials();
    renderOutputs();
    saveState();
    toast("材料已清空");
  });

  els.fileInput.addEventListener("change", async (event) => {
    if (!ensureNamedRole()) {
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      const text = await file.text();
      state.materials.unshift({
        type: els.materialType.value,
        name: file.name,
        text,
        createdAt: new Date().toISOString(),
      });
    }
    event.target.value = "";
    renderMaterials();
    renderOutputs();
    saveState();
    toast(`已导入 ${files.length} 个文件`);
  });

  document.querySelectorAll("[data-output]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOutput = button.dataset.output;
      renderOutputs();
      saveState();
    });
  });

  els.regenerateBtn.addEventListener("click", () => {
    if (!ensureNamedRole()) return;
    renderOutputs();
    saveState();
    toast("已重新生成");
  });

  els.copyCurrentBtn.addEventListener("click", async () => {
    if (!ensureNamedRole()) return;
    renderOutputs();
    await navigator.clipboard.writeText(state.outputs[state.selectedOutput]);
    toast("已复制");
  });

  els.downloadCurrentBtn.addEventListener("click", () => {
    if (!ensureNamedRole()) return;
    renderOutputs();
    download(filenameForOutput(state.selectedOutput), state.outputs[state.selectedOutput]);
  });

  els.exportAllBtn.addEventListener("click", () => {
    if (!ensureNamedRole()) return;
    renderOutputs();
    const bundle = Object.entries(state.outputs)
      .map(([key, value]) => `===== ${filenameForOutput(key)} =====\n\n${value}`)
      .join("\n\n");
    download(`${state.role.slug || "role"}-bundle.txt`, bundle);
  });

  els.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = els.chatInput.value.trim();
    if (!text) return;
    const replyRoleKey = state.activeRoleKey || roleKeyFromRole();
    state.chat.push({ who: "user", text });
    els.chatInput.value = "";
    renderChat();
    saveState();
    try {
      const realReply = await sendRealChat(text);
      const unread = !isViewingRoleThread(replyRoleKey);
      const replyText = realReply || botReply(text);
      appendMessageToRole(replyRoleKey, { who: "bot", text: replyText }, unread);
      if (!unread && state.role.voiceAuto) speakText(replyText);
    } catch (error) {
      const unread = !isViewingRoleThread(replyRoleKey);
      appendMessageToRole(replyRoleKey, { who: "bot", text: `接口出问题了。\n${error.message}` }, unread);
    }
    renderChat();
    renderUnreadBadges();
    saveState();
  });

  window.addEventListener("pagehide", saveState);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveState();
  });
}

function cacheElements() {
  [
    "toast",
    "characterSelect",
    "localRoleSelect",
    "generateRoleSelect",
    "nameInput",
    "avatarPreview",
    "avatarInput",
    "removeAvatarBtn",
    "basicInput",
    "personaInput",
    "roleVersion",
    "saveDraftBtn",
    "loadSampleBtn",
    "newRoleBtn",
    "materialCount",
    "materialType",
    "materialInput",
    "fileInput",
    "addMaterialBtn",
    "clearMaterialsBtn",
    "materialList",
    "outputBox",
    "copyCurrentBtn",
    "regenerateBtn",
    "downloadCurrentBtn",
    "exportAllBtn",
    "chatListView",
    "chatThreadView",
    "chatDetailView",
    "conversationList",
    "chatUnreadBadge",
    "chatNewRoleBtn",
    "chatBackBtn",
    "chatDetailsBtn",
    "chatName",
    "chatAvatar",
    "chatContext",
    "chatLog",
    "chatForm",
    "chatInput",
    "autoVoiceBtn",
    "voiceInputBtn",
    "detailBackBtn",
    "editRoleBtn",
    "detailAvatar",
    "detailAvatarInput",
    "detailRemoveAvatarBtn",
    "detailRoleName",
    "detailGender",
    "detailRemarkInput",
    "detailBasic",
    "detailPersona",
  ].forEach((id) => {
    els[id] = $(id);
  });
}

async function init() {
  cacheElements();
  loadState();
  await refreshServer();
  await refreshCharacters();
  syncInputs();
  renderPanels();
  renderMaterials();
  renderOutputs();
  renderChat();
  bindEvents();
}

init();
