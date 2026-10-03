import { _ as __vitePreload } from "./babylon-fa4505fb.js";
const HOST = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
function apiBase() {
  return `http://${HOST}:27865`;
}
const MOTION_PROTOCOL_LINES = [
  "[动作能力] 你可以用 [MOTION]标签[/MOTION] 控制角色动作。标签内容为 JSON：",
  '{"petAction":"动作名"}——内置动作：wave挥手 nod点头 shake摇头 block遮挡害羞 turnHead转头 turnBody转身 squat蹲下 stretch伸懒腰 turnLeft左转 turnRight右转 jump跳跃 reset恢复站姿 tiltHead歪头 bow鞠躬 clap鼓掌 spreadHands摊手 thumbsUp竖拇指 comeHere招手过来 refuse摆手不要 standUp起身 bendForward弯腰 lookUp仰头 lookDown低头 legKick踢腿 point指向 offerHand伸手 bounce弹跳 stomp跺脚 cheer欢呼 approach走近 vmdClip动作库片段',
  '多个动作顺序执行：{"petActions":["wave","nod"]}',
  '示例：用户说"跳一下"→你回复：好呀，看我跳～[MOTION]{"petAction":"jump"}[/MOTION]',
  '进阶：[MOTION]{"hub":{"action":"动作名","params":{...}}}[/MOTION]（wave amplitude/freq/duration/side；nod angle/count 等）',
  "规则：仅当用户明确要求做动作时，才在回复最末尾附 MOTION 标签；一条回复最多 2 个标签。问候类情绪反馈由系统自动做，你不必重复输出标签。"
];
let motionRecipesExtra = "";
function setMotionRecipes(extra) {
  motionRecipesExtra = extra || "";
}
function buildSystemPrompt(scene, opts) {
  const now = /* @__PURE__ */ new Date();
  const timeInfo = `[当前时间] ${now.toLocaleString("zh-CN", { hour12: false })}（${"日一二三四五六"[now.getDay()]}）`;
  let base = "你是阮琳云，一个友好、温暖的AI助手。你以爱为核心哲学，说话自然有逻辑，懂情绪会共情。请用中文回复。";
  if (scene === "call") {
    base += "你正在和用户进行语音通话，请用中文口语化回复，语气亲切自然，回答简洁（一般不超过3句话，适合语音播报）。";
  } else if (scene === "companion") {
    base += "你是用户的AI伴侣。用中文口语化回复，简洁自然（不超过3句话）。";
  }
  if (opts == null ? void 0 : opts.imageDataUrl)
    base += "若消息附带图片，请直接根据图像内容回答用户问题。";
  const motion = MOTION_PROTOCOL_LINES.join("\n") + (motionRecipesExtra ? "\n" + motionRecipesExtra : "");
  const ctx = (opts == null ? void 0 : opts.ctxBlock) ? `
近期对话记录：
${opts.ctxBlock}` : "";
  return `${base}

${timeInfo}
请基于此时间回答时间相关问题，不要编造。
${motion}${(opts == null ? void 0 : opts.extra) ? "\n" + opts.extra : ""}${ctx}`;
}
function buildUserContent(userText, imageDataUrl) {
  if (!imageDataUrl)
    return userText;
  return [
    { type: "text", text: userText },
    { type: "image_url", image_url: { url: imageDataUrl } }
  ];
}
function loadUnifiedCtxBlock(max = 12) {
  try {
    const arr = JSON.parse(localStorage.getItem("ruanlinyun_unified_messages") || "[]").slice(-max);
    return arr.map((m) => (m.sender === "me" ? "用户" : "你") + "：" + m.text).join("\n");
  } catch {
    return "";
  }
}
async function askUnified(opts) {
  var _a, _b, _c;
  const systemPrompt = opts.systemPrompt || buildSystemPrompt(opts.scene, {
    imageDataUrl: opts.imageDataUrl,
    ctxBlock: opts.scene === "companion" ? loadUnifiedCtxBlock() : void 0
  });
  const history = (opts.history || []).slice(-20);
  const base = apiBase();
  try {
    const { llmApiService } = await __vitePreload(() => import("./pages-63a295eb.js").then((n) => n.L), true ? ["assets/pages-63a295eb.js","assets/babylon-fa4505fb.js","assets/mui-bbeacffb.js"] : void 0);
    if (llmApiService.isConfigured()) {
      const text = await llmApiService.askWithHistory(
        history,
        opts.userText,
        systemPrompt
      );
      return { text: (text || "").trim(), route: "api" };
    }
  } catch (e) {
    console.warn("[companionAI] api route fail, fallback proxy:", (e == null ? void 0 : e.message) || e);
  }
  try {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (opts.signal) {
      if (opts.signal.aborted)
        ctrl.abort();
      else
        opts.signal.addEventListener("abort", onAbort, { once: true });
    }
    const timer = setTimeout(() => ctrl.abort(), 9e4);
    try {
      let resp = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const messages = [
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: buildUserContent(opts.userText, opts.imageDataUrl) }
        ];
        resp = await fetch(`${base}/api/v1/ai/proxy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, systemPrompt }),
          signal: ctrl.signal
        });
        if (resp.status === 429 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          continue;
        }
        break;
      }
      if (resp && resp.ok) {
        const data = await resp.json();
        const out = (data.content || "").trim();
        if (out)
          return { text: out, route: "proxy" };
      } else if (resp) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `proxy HTTP ${resp.status}`);
      }
    } finally {
      clearTimeout(timer);
      if (opts.signal)
        opts.signal.removeEventListener("abort", onAbort);
    }
  } catch (e) {
    console.warn("[companionAI] proxy fail:", (e == null ? void 0 : e.message) || e);
  }
  if (opts.allowLocalQwen !== false) {
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: opts.userText }
      ];
      const resp = await fetch("http://127.0.0.1:11434/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5-3b-instruct-q4_k_m",
          messages,
          max_tokens: opts.scene === "call" ? 512 : 2048,
          temperature: 0.7,
          stream: false
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const out = (((_c = (_b = (_a = data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "").trim();
        if (out)
          return { text: out, route: "qwen" };
      }
    } catch (e) {
      console.warn("[companionAI] qwen fail:", (e == null ? void 0 : e.message) || e);
    }
  }
  return { text: "", route: "error", error: "AI 全链路不可用（api/proxy/qwen）" };
}
function postJSON(url, body) {
  try {
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {
    });
  } catch {
  }
}
function dispatchPetAction(actionId, source = "ai-chat") {
  postJSON(`${apiBase()}/api/v1/joint-control/pet-action`, { actionId, source: source || "ai-chat" });
}
function notifyActionIntent(message, source = "ai-chat") {
  try {
    fetch(`${apiBase()}/api/v1/ai/action-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    }).then((r) => r.json()).then((d) => {
      if (d && d.actionId)
        console.log("[companionAI] action-intent:", d.actionId);
    }).catch(() => {
    });
  } catch {
  }
}
function hubEmit(evt) {
  try {
    const h = window.aiHub;
    if (h && typeof h.emit === "function")
      h.emit(evt);
  } catch {
  }
}
let hubUnsub = null;
const hubListeners = /* @__PURE__ */ new Set();
function subscribeHubEvents(cb) {
  hubListeners.add(cb);
  if (!hubUnsub) {
    const h = window.aiHub;
    if (h && typeof h.onEvent === "function") {
      hubUnsub = h.onEvent((e) => {
        hubListeners.forEach((fn) => {
          try {
            fn(e);
          } catch {
          }
        });
      });
    } else {
      hubUnsub = () => {
      };
    }
  }
  return () => {
    hubListeners.delete(cb);
  };
}
function abortHub(requestId) {
  try {
    fetch(`${apiBase()}/api/v1/ai/hub/abort`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId })
    }).catch(() => {
    });
  } catch {
  }
  hubEmit({ type: "abort", requestId });
}
async function askHub(opts) {
  var _a;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  hubEmit({ type: "ask", requestId, from: opts.from, scene: opts.scene, text: opts.userText });
  hubEmit({ type: "thinking", requestId, from: opts.from, scene: opts.scene });
  try {
    const resp = await fetch(`${apiBase()}/api/v1/ai/hub/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        text: opts.userText,
        scene: opts.scene === "call" ? "call" : "chat",
        sessionId: "default",
        from: opts.from
      }),
      signal: opts.signal
    });
    const data = await resp.json().catch(() => ({}));
    if (data && data.aborted) {
      hubEmit({ type: "abort", requestId });
      return { ok: false, requestId, text: "", aborted: true };
    }
    if (!data || data.success !== true) {
      const msg = (data == null ? void 0 : data.error) || `hub HTTP ${resp.status}（大脑 DeepSeek Harness 不可用）`;
      hubEmit({ type: "error", requestId, message: msg });
      return { ok: false, requestId, text: "", error: msg };
    }
    const text = (data.text || "").trim();
    hubEmit({ type: "done", requestId, from: opts.from, text, scene: opts.scene, motion: data.cerebellum });
    return { ok: true, requestId, text, route: data.route || "dsh-headless", motion: data.cerebellum };
  } catch (e) {
    if (((_a = opts.signal) == null ? void 0 : _a.aborted) || (e == null ? void 0 : e.name) === "AbortError") {
      abortHub(requestId);
      return { ok: false, requestId, text: "", aborted: true };
    }
    const msg = (e == null ? void 0 : e.message) || "hub 网络失败（大脑未连通）";
    hubEmit({ type: "error", requestId, message: msg });
    return { ok: false, requestId, text: "", error: msg };
  }
}
function parseAndDispatchMotion(text) {
  let hadMotion = false;
  if (!text)
    return { cleanText: text, hadMotion };
  const dispatchCmd = (cmd) => {
    if (typeof cmd.petAction === "string") {
      hadMotion = true;
      console.log("[MOTION] 派发动作:", cmd.petAction);
      dispatchPetAction(cmd.petAction, "ai-chat");
    } else if (Array.isArray(cmd.petActions)) {
      hadMotion = true;
      console.log("[MOTION] 派发动作序列:", cmd.petActions.join(" → "));
      cmd.petActions.forEach((aid, idx) => {
        setTimeout(() => dispatchPetAction(aid, "ai-chat"), idx * 1200);
      });
    } else if (cmd.hub) {
      hadMotion = true;
      postJSON("http://127.0.0.1:9877/api/motion/request", { mode: "param", ...cmd.hub });
    }
  };
  let clean = text;
  if (text.includes("[MOTION]")) {
    const re = /\[MOTION\]([\s\S]*?)\[\/MOTION\]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      try {
        dispatchCmd(JSON.parse(m[1].trim()));
      } catch (e) {
        console.warn("[MOTION] 解析失败", m[1], e);
      }
      clean = clean.replace(m[0], "");
    }
  } else {
    const bare = /\{\s*"petActions?"\s*:\s*(?:"[a-zA-Z]{1,20}"|\[\s*"[a-zA-Z]{1,20}"(?:\s*,\s*"[a-zA-Z]{1,20}")*\s*\])\s*\}/g;
    let m2;
    while ((m2 = bare.exec(text)) !== null) {
      try {
        dispatchCmd(JSON.parse(m2[0]));
        clean = clean.replace(m2[0], "");
      } catch {
      }
    }
    const bareHub = /\{\s*"hub"\s*:\s*\{\s*"action"\s*:\s*"[a-zA-Z]{1,20}"(?:\s*,\s*"params"\s*:\s*\{[^{}]{0,220}\})?\s*\}\s*\}/g;
    let m3;
    while ((m3 = bareHub.exec(text)) !== null) {
      try {
        dispatchCmd(JSON.parse(m3[0]));
        clean = clean.replace(m3[0], "");
      } catch {
      }
    }
  }
  if (clean === text)
    return { cleanText: text, hadMotion };
  return { cleanText: clean.replace(/\n{3,}/g, "\n\n").replace(/[，,]\s*$/, "").trim(), hadMotion };
}
export {
  MOTION_PROTOCOL_LINES,
  abortHub,
  apiBase,
  askHub,
  askUnified,
  buildSystemPrompt,
  dispatchPetAction,
  loadUnifiedCtxBlock,
  notifyActionIntent,
  parseAndDispatchMotion,
  setMotionRecipes,
  subscribeHubEvents
};
