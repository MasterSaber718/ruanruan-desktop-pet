var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { _ as __vitePreload } from "./babylon-72e1e591.js";
import { R as React, a as reactExports, b as jsxs, B as Box, j as jsx, I as IconButton, T as Typography, a0 as default_1, a1 as default_1$1, J as Button, a2 as default_1$2, P as Paper, a3 as default_1$3, D as Divider, a4 as Tooltip, a5 as default_1$4, C as CircularProgress, a6 as default_1$5, a7 as default_1$6, U as Accordion, V as AccordionSummary, f as default_1$7, W as default_1$8, X as AccordionDetails, a8 as default_1$9, a9 as default_1$a, aa as default_1$b, e as default_1$c, ab as default_1$d, ac as default_1$e, ad as default_1$f, H as Switch, ae as default_1$g } from "./mui-096207bc.js";
import { u as useNavigate } from "./App-96c61baa.js";
import "./ai-3c0f0023.js";
import "./index-12ae994a.js";
const MODEL_EXTENSIONS = ["pmx", "pmd", "gltf", "glb", "obj"];
const TEXTURE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "tga", "webp", "spa", "sph"];
const MOTION_EXTENSIONS = ["vmd"];
const getFileExtension = (fileName) => {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};
const normalizeImportPath = (inputPath) => {
  return inputPath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+/g, "/").trim().toLowerCase();
};
const getImportedAssetPath = (file) => {
  return normalizeImportPath(file.webkitRelativePath || file.name);
};
const classifyImportedFiles = (files) => {
  const classified = {
    modelFiles: [],
    textureFiles: [],
    motionFiles: [],
    unsupportedFiles: []
  };
  files.forEach((file) => {
    const path = getImportedAssetPath(file);
    const asset = { name: file.name, path };
    const extension = getFileExtension(file.name);
    if (MODEL_EXTENSIONS.includes(extension)) {
      classified.modelFiles.push(asset);
      return;
    }
    if (TEXTURE_EXTENSIONS.includes(extension)) {
      classified.textureFiles.push(asset);
      return;
    }
    if (MOTION_EXTENSIONS.includes(extension)) {
      classified.motionFiles.push(asset);
      return;
    }
    classified.unsupportedFiles.push(asset);
  });
  classified.modelFiles.sort((left, right) => {
    const leftPriority = getFileExtension(left.name) === "pmx" ? 0 : 1;
    const rightPriority = getFileExtension(right.name) === "pmx" ? 0 : 1;
    return leftPriority - rightPriority;
  });
  return classified;
};
const CTRL_URL = "http://127.0.0.1:5175/api/speech-bridge/control";
const FINAL_URL = "http://127.0.0.1:5175/api/speech-bridge/final";
const STATUS_URL = "http://127.0.0.1:5175/api/speech-bridge/status";
const VOICE_ENABLED_KEY = "ruanlinyun_voice_enabled";
class SpeechManager {
  constructor() {
    __publicField(this, "handlers", /* @__PURE__ */ new Set());
    __publicField(this, "stateHandlers", /* @__PURE__ */ new Set());
    __publicField(this, "timer", null);
    __publicField(this, "statusTimer", null);
    __publicField(this, "after", 0);
    __publicField(this, "state", "stopped");
    __publicField(this, "lang", "zh-CN");
    __publicField(this, "skipPending", false);
    __publicField(this, "status", { listening: false, micOk: false });
    __publicField(this, "userDisabled", (() => {
      try {
        return localStorage.getItem(VOICE_ENABLED_KEY) === "false";
      } catch {
        return false;
      }
    })());
    /** [v113] 消费者计数：聊天麦/通话共享一路 Edge */
    __publicField(this, "consumers", 0);
  }
  getState() {
    return this.state;
  }
  getStatus() {
    return { ...this.status };
  }
  isUserDisabled() {
    return this.userDisabled;
  }
  setUserDisabled(off) {
    this.userDisabled = !!off;
    try {
      localStorage.setItem(VOICE_ENABLED_KEY, off ? "false" : "true");
    } catch {
    }
    console.log("[SpeechManager] userDisabled=" + this.userDisabled);
    if (off)
      this.stop();
  }
  subscribe(handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  onState(handler) {
    this.stateHandlers.add(handler);
    handler(this.state, this.getStatus());
    return () => {
      this.stateHandlers.delete(handler);
    };
  }
  emitState() {
    this.stateHandlers.forEach((h) => {
      try {
        h(this.state, this.getStatus());
      } catch (e) {
        console.warn(e);
      }
    });
  }
  async pushControl(patch) {
    try {
      await fetch(CTRL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
    } catch {
    }
  }
  async start(lang) {
    this.consumers += 1;
    if (this.userDisabled) {
      this.consumers = Math.max(0, this.consumers - 1);
      console.log("[SpeechManager] 用户已关闭语音，忽略 start");
      this.emitState();
      return;
    }
    if (this.state === "running") {
      console.log("[SpeechManager] already running, consumers=" + this.consumers);
      return;
    }
    this.lang = lang || this.lang || "zh-CN";
    this.state = "running";
    this.skipPending = false;
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = window.speechBridge;
      if (api && api.start)
        await api.start(this.lang);
    } catch (e) {
      console.warn("[SpeechManager] Edge start IPC fail", e);
    }
    if (!this.timer)
      this.timer = setInterval(() => {
        this.poll();
      }, 300);
    if (!this.statusTimer)
      this.statusTimer = setInterval(() => {
        this.pollStatus();
      }, 1500);
    this.poll();
    this.pollStatus();
    console.log("[SpeechManager] Edge 语音桥已启用 lang=" + this.lang + " consumers=" + this.consumers);
    this.emitState();
  }
  async pauseForTts() {
    if (this.state !== "running")
      return;
    await this.pushControl({ enabled: true, muted: true });
    try {
      const api = window.speechBridge;
      if (api && api.setControl)
        await api.setControl({ enabled: true, muted: true });
    } catch {
    }
    console.log("[SpeechManager] pause for TTS");
    this.emitState();
  }
  async resumeAfterTts() {
    if (this.userDisabled)
      return;
    if (this.state !== "running")
      return;
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = window.speechBridge;
      if (api && api.setControl)
        await api.setControl({ enabled: true, muted: false, lang: this.lang });
    } catch {
    }
    console.log("[SpeechManager] resume after TTS");
    this.emitState();
  }
  async mute() {
    if (this.state === "stopped")
      return;
    this.state = "muted";
    await this.pushControl({ enabled: true, muted: true });
    try {
      const api = window.speechBridge;
      if (api && api.setControl)
        await api.setControl({ enabled: true, muted: true });
    } catch {
    }
    console.log("[SpeechManager] muted");
    this.emitState();
  }
  async unmute() {
    if (this.userDisabled || this.state === "stopped")
      return;
    this.state = "running";
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = window.speechBridge;
      if (api && api.setControl)
        await api.setControl({ enabled: true, muted: false, lang: this.lang });
    } catch {
    }
    console.log("[SpeechManager] unmuted");
    this.emitState();
  }
  interrupt() {
    this.skipPending = true;
    console.log("[SpeechManager] interrupt");
  }
  /** 减一个使用者；无人用时才真停 */
  async release() {
    this.consumers = Math.max(0, this.consumers - 1);
    console.log("[SpeechManager] release consumers=" + this.consumers);
    if (this.consumers === 0)
      await this.stop();
  }
  async stop() {
    this.consumers = 0;
    this.state = "stopped";
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    await this.pushControl({ enabled: false, muted: false });
    try {
      const api = window.speechBridge;
      if (api && api.stop)
        await api.stop();
    } catch {
    }
    this.handlers.clear();
    this.status = { listening: false, micOk: false };
    console.log("[SpeechManager] stopped");
    this.emitState();
  }
  async pollStatus() {
    try {
      const r = await fetch(STATUS_URL, { cache: "no-store" });
      if (!r.ok)
        return;
      const d = await r.json();
      if (!d || !d.ok)
        return;
      const next = {
        listening: !!d.listening,
        micOk: !!d.micOk,
        error: d.error || "",
        lang: d.lang || this.lang
      };
      const changed = next.listening !== this.status.listening || next.micOk !== this.status.micOk || next.error !== this.status.error;
      this.status = next;
      if (changed)
        this.emitState();
    } catch {
    }
  }
  async poll() {
    if (this.state === "stopped")
      return;
    try {
      const r = await fetch(FINAL_URL + "?after=" + this.after, { cache: "no-store" });
      if (!r.ok)
        return;
      const data = await r.json();
      if (!data || !data.ok || !Array.isArray(data.items))
        return;
      if (this.skipPending) {
        for (const it of data.items)
          this.after = Math.max(this.after, Number(it.id) || 0);
        this.skipPending = false;
        return;
      }
      if (this.state === "muted") {
        for (const it of data.items)
          this.after = Math.max(this.after, Number(it.id) || 0);
        return;
      }
      for (const it of data.items) {
        this.after = Math.max(this.after, Number(it.id) || 0);
        const t = String(it.text || "").trim();
        if (!t)
          continue;
        console.log("[SpeechManager] final #" + it.id, t);
        this.handlers.forEach((h) => {
          try {
            h(t, it);
          } catch (e) {
            console.warn(e);
          }
        });
      }
    } catch {
    }
  }
}
const speechManager = new SpeechManager();
const BabylonModelViewer = React.lazy(() => __vitePreload(() => import("./BabylonModelViewer-a9c8f453.js"), true ? ["assets/BabylonModelViewer-a9c8f453.js","assets/mui-096207bc.js","assets/babylon-72e1e591.js"] : void 0));
const gCall = {
  ws: null,
  stream: null,
  ctx: null,
  proc: null,
  micGate: false,
  ttsPlaying: false,
  replying: false,
  userHungUp: false
};
window.__companionCallActive = () => !!(gCall.ws && gCall.ws.readyState === WebSocket.OPEN);
let gAiAbort = null;
function visionImagePart(dataUrl) {
  return { type: "image_url", image_url: { url: dataUrl } };
}
let dshMemoBusy = false;
async function companionAskAI(userText, imageDataUrl) {
  if (dshMemoBusy)
    throw new Error("上一条还在思考，稍等");
  dshMemoBusy = true;
  try {
    const { askHub } = await __vitePreload(() => import("./companionAI-aeda5e54.js"), true ? ["assets/companionAI-aeda5e54.js","assets/babylon-72e1e591.js"] : void 0);
    const r = await askHub({
      scene: "companion",
      from: "preview",
      userText,
      imageDataUrl
    });
    if (!r.ok && r.text === "")
      throw new Error(r.error || "AI 空回复");
    console.log("[companionAskAI] hub route=" + (r.route || "") + " len=" + (r.text || "").length);
    return r.text || "（AI 空回复）";
  } catch (e) {
    console.error("[companionAskAI] fail:", e?.message || e);
    throw e;
  } finally {
    dshMemoBusy = false;
  }
}
async function companionSpeakTTS(text) {
  try {
    const resp = await fetch("http://127.0.0.1:9881/tts?text=" + encodeURIComponent(text) + "&speed=1");
    if (resp.ok) {
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      await new Promise((resolve) => {
        const audio = new Audio(url);
        window.__companionAudio = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(() => resolve());
      });
      return;
    }
  } catch {
  }
  await new Promise((resolve) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}
function UTurnArrow() {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#ffffff",
      strokeWidth: "2.2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" },
      children: [
        /* @__PURE__ */ jsx("path", { d: "M5 8h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H7.5" }),
        /* @__PURE__ */ jsx("polyline", { points: "8.5,6 5,8 8.5,10" })
      ]
    }
  );
}
function NewPage() {
  const navigate = useNavigate();
  const [consoleOpen, setConsoleOpen] = reactExports.useState(true);
  const [flags, setFlags] = reactExports.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("companionFlagsV2") || "null");
      if (saved)
        return { mic: saved.mic !== false, cam: saved.cam !== false, screen: saved.screen !== false };
    } catch {
    }
    return { mic: true, cam: true, screen: true };
  });
  const [callState, setCallState] = reactExports.useState("idle");
  const [micOn, setMicOn] = reactExports.useState(true);
  const [greetDisabled, setGreetDisabled] = reactExports.useState(() => {
    try {
      return localStorage.getItem("ruanlinyun_greet_disabled") === "true";
    } catch {
      return false;
    }
  });
  const [callUI, setCallUI] = reactExports.useState("bar");
  const [callStatus, setCallStatus] = reactExports.useState("通话中");
  const [callPhase, setCallPhase] = reactExports.useState("listening");
  const wallpaperUserTouchedRef = reactExports.useRef(0);
  const [defaultModelEnabled, setDefaultModelEnabled] = reactExports.useState(() => {
    try {
      return localStorage.getItem("ruanlinyun_3d_default_model_enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [chatLog, setChatLog] = reactExports.useState([]);
  const greetDismissedRef = reactExports.useRef(false);
  const micGateRef = reactExports.useRef(false);
  const muteNextReplyRef = reactExports.useRef(false);
  const callWsRef = reactExports.useRef(null);
  const ttsPlayingRef = reactExports.useRef(false);
  const replyingRef = reactExports.useRef(false);
  const callPeerRef = reactExports.useRef("用户");
  const chatLogRef = reactExports.useRef(chatLog);
  reactExports.useEffect(() => {
    chatLogRef.current = chatLog;
  }, [chatLog]);
  reactExports.useEffect(() => {
    if (gCall.ws && gCall.ws.readyState === WebSocket.OPEN) {
      setCallState("incall");
      setCallUI("bar");
      setCallStatus("聆听中 · 用户");
      micGateRef.current = gCall.micGate || true;
      setMicOn(micGateRef.current);
    }
  }, []);
  const autoGreetedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (autoGreetedRef.current)
      return;
    autoGreetedRef.current = true;
    try {
      if (sessionStorage.getItem("ruanlinyun_call_stopped") === "true") {
        console.log("[NewPage] 本次运行中用户已手动挂断，不自动通话");
        return;
      }
      if (speechManager.isUserDisabled && speechManager.isUserDisabled()) {
        console.log("[NewPage] 用户已关闭语音总开关，不自动通话");
        return;
      }
    } catch {
    }
    const dismissed = (() => {
      try {
        return localStorage.getItem("ruanlinyun_greet_disabled") === "true";
      } catch {
        return false;
      }
    })();
    greetDismissedRef.current = dismissed;
    if (dismissed)
      return;
    (async () => {
      const greet = "嗨，你来啦！";
      setCallPhase("speaking");
      setCallStatus("说话中…");
      ttsPlayingRef.current = true;
      try {
        await companionSpeakTTS(greet);
      } catch {
      }
      ttsPlayingRef.current = false;
      micGateRef.current = true;
      gCall.micGate = true;
      speechManager.unmute();
      setCallPhase("listening");
      setCallStatus("聆听中 · 用户");
      startCall();
    })();
  }, []);
  const toggleFlag = (key) => {
    setFlags((f) => {
      const next = { ...f, [key]: !f[key] };
      try {
        localStorage.setItem("companionFlagsV2", JSON.stringify(next));
      } catch {
      }
      if (key === "mic" && !next.mic && callWsRef.current)
        cleanupCall({ userHangup: true, reason: "mic-flag-off" });
      return next;
    });
  };
  reactExports.useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (!currentModel && defaultModelEnabled) {
          setModelLoading(true);
          setLoadingProgress(8);
          const v81Api = window.__newPageAPI;
          let loaded = false;
          if (v81Api?.loadFromCache) {
            const r = await v81Api.loadFromCache();
            loaded = !!r?.ok;
            console.log("[启动编排][优先级1] 模型(缓存): " + (loaded ? "命中" : "未命中(" + (r?.err || "") + ")"));
          }
          if (!loaded && !cancelled) {
            setLoadingProgress(25);
            const dm = window.defaultModel;
            if (dm?.load) {
              const lr = await dm.load();
              if (lr?.ok && lr.meta && !cancelled) {
                setLoadingProgress(45);
                const modelResp = await fetch(lr.meta.url + "?t=" + Date.now());
                const data = await modelResp.arrayBuffer();
                setLoadingProgress(70);
                const texs = [];
                const texList = lr.meta.textureFiles || [];
                for (let ti = 0; ti < texList.length; ti++) {
                  if (cancelled)
                    break;
                  const t = texList[ti];
                  try {
                    const tr = await fetch(t.url + "?t=" + Date.now());
                    if (tr.ok)
                      texs.push({ name: t.name, path: t.path || t.name, data: await tr.arrayBuffer(), webkitRelativePath: t.webkitRelativePath || "" });
                  } catch {
                  }
                  if (texList.length > 0)
                    setLoadingProgress(70 + Math.round(25 * ((ti + 1) / texList.length)));
                }
                if (!cancelled) {
                  openModelPreviewRef.current(lr.meta.name || "model.pmx", data, texs, lr.meta.url, void 0);
                  loaded = true;
                  console.log("[启动编排][优先级1] 模型(默认目录): " + (lr.meta.name || ""));
                }
              }
            }
          }
          if (!cancelled) {
            if (!loaded)
              console.log("[启动编排][优先级1] 无模型 → 跳过，继续下一项");
            setLoadingProgress(100);
            setModelLoading(false);
          }
        } else if (!defaultModelEnabled) {
          console.log("[启动编排][优先级1] 默认模型开关关闭 → 跳过");
        }
        if (!cancelled && localStorage.getItem("ruanlinyun_3d_wallpaper_enabled") !== "false") {
          const wm = window.wallpaperMode;
          if (wm && typeof wm.getStatus === "function") {
            const st = await wm.getStatus();
            if (!st?.active && typeof wm.enter === "function") {
              await wm.enter();
              setWallpaperEnabled(true);
              console.log("[启动编排][优先级2] 壁纸模式已默认进入");
            }
          }
        }
        if (!cancelled && desktopPetEnabled && currentModel) {
          console.log("[启动编排] 桌宠随 openModelPreview 正规链同步显示");
        }
        console.log("[启动编排] 感知状态: cam=" + flags.cam + " screen=" + flags.screen);
      } catch (e) {
        console.warn("[启动编排] 异常:", e);
        if (!cancelled)
          setModelLoading(false);
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setModelLoading(false);
    };
  }, []);
  const UNIFIED_KEY = "ruanlinyun_unified_messages";
  const unifiedPush = (who, text, extra) => {
    try {
      const sender = who === "user" ? "me" : who;
      if (sender !== "me" && sender !== "ai")
        return;
      const raw = localStorage.getItem(UNIFIED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ id: String(Date.now()) + "_" + Math.random().toString(36).slice(2, 6), text, sender, time: (/* @__PURE__ */ new Date()).toLocaleTimeString(), ...extra || {} });
      while (arr.length > 200)
        arr.shift();
      localStorage.setItem(UNIFIED_KEY, JSON.stringify(arr));
      try {
        window.dispatchEvent(new Event("ruanlinyun_unified_msg"));
      } catch {
      }
    } catch {
    }
  };
  const archiveMsg = (who, text) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const day = now.toLocaleDateString("sv-SE");
      const hhmm = now.toTimeString().slice(0, 5);
      const raw = localStorage.getItem("ruanlinyun_chat_archive");
      const arch = raw ? JSON.parse(raw) : { days: {} };
      if (!arch.days[day])
        arch.days[day] = [];
      arch.days[day].push({ t: hhmm, who, text });
      let size = JSON.stringify(arch).length;
      while (size > 1024 * 1024) {
        const oldest = Object.keys(arch.days).sort()[0];
        if (!oldest)
          break;
        delete arch.days[oldest];
        size = JSON.stringify(arch).length;
      }
      localStorage.setItem("ruanlinyun_chat_archive", JSON.stringify(arch));
    } catch {
    }
  };
  const addMsg = (cls, text) => {
    setChatLog((l) => [...l.slice(-60), { cls, text }]);
    if (cls === "me" || cls === "ai") {
      archiveMsg(cls, text);
      unifiedPush(cls, text);
    }
  };
  reactExports.useEffect(() => {
    try {
      if (localStorage.getItem("ruanlinyun_v89_reset") !== "done") {
        localStorage.removeItem("ruanlinyun_unified_messages");
        localStorage.removeItem("ruanlinyun_main_chat");
        localStorage.removeItem("ruanlinyun_chat_archive");
        localStorage.setItem("ruanlinyun_v89_reset", "done");
        console.log("[v89] 历史上下文已清空（一次性）");
      }
    } catch {
    }
  }, []);
  reactExports.useEffect(() => {
    const sync = () => {
      try {
        const unified = JSON.parse(localStorage.getItem("ruanlinyun_unified_messages") || "[]");
        setChatLog(() => unified.slice(-60).map((m) => ({
          cls: m.sender === "me" || m.sender === "user" ? "me" : m.sender === "sys" ? "sys" : "ai",
          text: m.text,
          id: m.id
        })));
      } catch {
      }
    };
    sync();
    window.addEventListener("ruanlinyun_unified_msg", sync);
    return () => window.removeEventListener("ruanlinyun_unified_msg", sync);
  }, []);
  const aiTurnRef = reactExports.useRef(0);
  const invalidateAITurn = (reason) => {
    aiTurnRef.current += 1;
    muteNextReplyRef.current = false;
    try {
      gAiAbort?.abort();
    } catch {
    }
    gAiAbort = null;
    replyingRef.current = false;
    gCall.replying = false;
    ttsPlayingRef.current = false;
    gCall.ttsPlaying = false;
    try {
      speechSynthesis.cancel();
    } catch {
    }
    try {
      window.__companionAudio?.pause();
    } catch {
    }
    console.log("[NewPage] AI轮次作废 reason=" + reason + " gen=" + aiTurnRef.current);
  };
  const interruptCall = () => {
    if (callPhase === "thinking") {
      invalidateAITurn("user-click-thinking");
      speechManager.interrupt();
      setCallPhase("listening");
      setCallStatus("聆听中 · " + callPeerRef.current);
      addMsg("sys", "—— 已打断思考，本条回复作废 ——");
      return;
    }
    if (callPhase === "speaking") {
      invalidateAITurn("user-click-speaking");
      speechManager.interrupt();
      setCallPhase("listening");
      setCallStatus("聆听中 · " + callPeerRef.current);
      addMsg("sys", "—— 播报已切断 ——");
    }
  };
  const cleanupCall = (opts) => {
    const userHangup = opts?.userHangup !== false;
    const reason = opts?.reason || (userHangup ? "user" : "unexpected");
    if (userHangup) {
      gCall.userHungUp = true;
      try {
        sessionStorage.setItem("ruanlinyun_call_stopped", "true");
      } catch {
      }
    }
    console.log("[NewPage] cleanupCall reason=" + reason + " userHangup=" + userHangup);
    const ws = gCall.ws;
    gCall.ws = null;
    if (gCall.proc) {
      try {
        gCall.proc.disconnect();
      } catch {
      }
      gCall.proc = null;
    }
    if (gCall.ctx) {
      try {
        gCall.ctx.close();
      } catch {
      }
      gCall.ctx = null;
    }
    if (gCall.stream) {
      gCall.stream.getTracks().forEach((t) => t.stop());
      gCall.stream = null;
    }
    if (ws) {
      try {
        ws.close();
      } catch {
      }
    }
    gCall.replying = false;
    gCall.ttsPlaying = false;
    gCall.micGate = false;
    replyingRef.current = false;
    ttsPlayingRef.current = false;
    if (gCall.speechUnsub) {
      try {
        gCall.speechUnsub();
      } catch {
      }
      gCall.speechUnsub = null;
    }
    speechManager.stop();
    setCallState("idle");
    if (userHangup) {
      setChatLog((l) => [...l.slice(-60), { cls: "sys", text: "—— 通话已结束 ——" }]);
    } else {
      setChatLog((l) => [...l.slice(-60), { cls: "sys", text: "—— 识别连接断开，正在重连… ——" }]);
      setTimeout(() => {
        if (gCall.ws && gCall.ws.readyState === WebSocket.OPEN)
          return;
        try {
          if (sessionStorage.getItem("ruanlinyun_call_stopped") === "true")
            return;
        } catch {
        }
        console.log("[NewPage] 异常断开后自动重连通话");
        startCall();
      }, 1200);
    }
  };
  const detectSeeIntent = (text) => {
    if (!/看|瞧|屏幕|画面|好看|长相|颜值|外观/.test(text))
      return null;
    if (/屏幕|电脑|桌面|显示器/.test(text))
      return "screen";
    if (/我|脸|脸蛋|自己|镜头|摄像头/.test(text))
      return "camera";
    return null;
  };
  const detectSearchIntent = (text) => {
    if (!/查|搜|搜索|查找|了解一下|最新|新闻|天气|什么是|怎么/.test(text))
      return null;
    if (detectSeeIntent(text))
      return null;
    return text.trim();
  };
  const isAutomationGoal = (text) => {
    const t = (text || "").trim();
    if (!t)
      return false;
    if (detectSeeIntent(t))
      return false;
    return /(天气|气温|听歌|放歌|来一首|听音乐|播放音乐|打开|关闭|关掉|启动|退出|帮我开|帮我关)/.test(t);
  };
  const runGuiAutomation = async (goal) => {
    const api = window.guiAgent;
    if (!api || !api.run)
      return { ok: false, result: "自动化桥未就绪（需重启应用）" };
    try {
      const r = await api.run(goal);
      if (r && r.ok)
        return { ok: true, result: String(r.result || "已完成") };
      return { ok: false, result: String(r && r.error || r && r.result || "自动化失败") };
    } catch (e) {
      return { ok: false, result: e?.message || String(e) };
    }
  };
  const browserSearchBrief = async (query) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25e3);
      const resp = await fetch("http://127.0.0.1:5180/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      const j = await resp.json();
      if (!resp.ok || !j?.ok)
        return "";
      const items = (j.items || []).slice(0, 4);
      if (!items.length)
        return "";
      const lines = items.map((it, i) => `${i + 1}. ${it.title || ""}${it.snippet ? " — " + it.snippet : ""}`);
      return "（浏览器检索摘要）\n" + lines.join("\n");
    } catch (e) {
      console.warn("[NewPage] browser-search 不可用:", e?.message || e);
      return "";
    }
  };
  const APP_LAUNCH_MAP = {
    blender: "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe",
    酷狗音乐: "酷狗",
    酷狗: "C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\KuGou.exe",
    kugou: "C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\KuGou.exe"
  };
  const tryLaunchFromSpeech = (text) => {
    const t = (text || "").toLowerCase();
    if (/(放一首|放歌|播放音乐|唱一首|听歌|来一首)/.test(t) || /(播放|放)/.test(t) && /(歌|音乐|曲)/.test(t)) {
      try {
        const mc = window.mediaControl;
        if (mc) {
          mc({ action: "play" }).then((r) => {
            console.log("[NewPage] media play", r);
            addMsg("sys", r && r.ok ? "已发送播放（会先确保酷狗在跑）" : "播放失败：" + (r && r.error));
          });
          return "media";
        }
      } catch (e) {
        addMsg("sys", "播放失败：" + e.message);
      }
      return null;
    }
    if (!/(打开|启动|open|运行|帮我开)/.test(t))
      return null;
    const keys = Object.keys(APP_LAUNCH_MAP);
    let matchedKey = null;
    for (const key of keys) {
      if (t.includes(key.toLowerCase())) {
        matchedKey = key;
        break;
      }
    }
    if (!matchedKey) {
      if (/酷狗|kugou|kg音乐/.test(t))
        matchedKey = "酷狗";
      else if (/blender/.test(t))
        matchedKey = "blender";
    }
    if (!matchedKey)
      return null;
    const p = APP_LAUNCH_MAP[matchedKey] || matchedKey;
    try {
      const api = window.launchApp;
      if (!api) {
        addMsg("sys", "打开失败：launchApp 桥未就绪（需重启应用）");
        return null;
      }
      api(p).then((r) => {
        console.log("[NewPage] launch", matchedKey, r);
        if (r && r.ok)
          addMsg("sys", "已打开 " + matchedKey);
        else
          addMsg("sys", "打开失败：" + (r && r.error));
      }).catch((e) => addMsg("sys", "打开失败：" + e.message));
      return matchedKey;
    } catch (e) {
      addMsg("sys", "打开失败：" + e.message);
      return null;
    }
  };
  const onCallFinal = async (text) => {
    console.log("[NewPage] onCallFinal:", text);
    if (!isAutomationGoal(text))
      tryLaunchFromSpeech(text);
    if (replyingRef.current) {
      invalidateAITurn("user-barge-in");
      speechManager.interrupt();
      setCallPhase("listening");
    }
    const myGen = ++aiTurnRef.current;
    replyingRef.current = true;
    gCall.replying = true;
    setCallPhase("thinking");
    setCallStatus("思考中…");
    addMsg("me", text);
    try {
      let seeImage = null;
      let seeLabel = "";
      let searchBrief = "";
      let autoResult = null;
      try {
        const want = detectSeeIntent(text);
        if (want) {
          seeLabel = want === "screen" ? "屏幕截图" : "摄像头";
          seeImage = await aiAutoCapture(want);
          if (myGen !== aiTurnRef.current)
            return;
          addMsg("sys", (want === "screen" ? "🖥 " : "📷 ") + "已截取" + seeLabel + "，发给服务器识别…");
        } else if (isAutomationGoal(text)) {
          addMsg("sys", "🤖 自动化执行中…");
          autoResult = await runGuiAutomation(text);
          if (myGen !== aiTurnRef.current)
            return;
          addMsg("sys", autoResult.ok ? "✓ " + autoResult.result.slice(0, 200) : "⚠ " + autoResult.result);
        } else {
          const q = detectSearchIntent(text);
          if (q) {
            searchBrief = await browserSearchBrief(q);
            if (myGen !== aiTurnRef.current)
              return;
            if (searchBrief)
              addMsg("sys", "🔎 已用浏览器检索相关信息");
          }
        }
      } catch (e) {
        console.warn("[NewPage] 感知失败（不阻断对话）:", e?.message || e);
      }
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 感知后轮次已失效，丢弃 gen=" + myGen);
        return;
      }
      let sendText = text;
      let reply = "";
      if (seeImage) {
        sendText = text + "\n（附上当前" + seeLabel + "，请直接看图回答）";
        reply = await companionAskAI(sendText, seeImage || void 0);
      } else if (autoResult && autoResult.ok) {
        reply = autoResult.result;
        try {
          const polished = await companionAskAI(
            "用户说：" + text + "\n自动化已完成，原始结果：" + autoResult.result + "\n请用一句口语转述给用户，不要重复步骤。"
          );
          if (polished && !polished.startsWith("（AI"))
            reply = polished;
        } catch {
        }
      } else if (autoResult && !autoResult.ok) {
        reply = await companionAskAI(text + "\n（自动化尝试失败：" + autoResult.result + "，请说明并给替代建议）");
      } else if (searchBrief) {
        sendText = text + "\n" + searchBrief + "\n（请结合以上检索摘要回答，简洁）";
        reply = await companionAskAI(sendText, void 0);
      } else {
        reply = await companionAskAI(text, void 0);
      }
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 丢弃迟到AI回复 gen=" + myGen + " 当前=" + aiTurnRef.current + " len=" + String(reply || "").length);
        return;
      }
      addMsg("ai", reply);
      setCallPhase("speaking");
      setCallStatus("说话中…");
      ttsPlayingRef.current = true;
      gCall.ttsPlaying = true;
      speechManager.pauseForTts();
      await companionSpeakTTS(reply);
      if (myGen === aiTurnRef.current && (micGateRef.current || gCall.micGate)) {
        speechManager.resumeAfterTts();
      }
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 播报中被作废，停播 gen=" + myGen);
        try {
          speechSynthesis.cancel();
        } catch {
        }
        try {
          window.__companionAudio?.pause();
        } catch {
        }
      }
      ttsPlayingRef.current = false;
      gCall.ttsPlaying = false;
    } catch (e) {
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 打断导致的请求失败，不提示 gen=" + myGen);
        return;
      }
      if (e?.name === "AbortError") {
        console.log("[NewPage] AI请求已中止");
        addMsg("sys", "—— 已打断思考，本条回复作废 ——");
      } else {
        console.error("[NewPage] 对话失败:", e?.message || e);
        addMsg("sys", "⚠ 对话失败：" + (e?.message || e));
      }
    } finally {
      if (myGen === aiTurnRef.current) {
        replyingRef.current = false;
        gCall.replying = false;
        if (gCall.ws) {
          setCallPhase("listening");
          setCallStatus("聆听中 · " + callPeerRef.current);
        }
      }
    }
  };
  reactExports.useEffect(() => {
    const off = speechManager.onState((state, status) => {
      state === "running" && status.listening;
      setMicOn(state === "running");
      if (status.error)
        console.warn("[NewPage] speech status", status);
    });
    return () => {
      off();
    };
  }, []);
  const startCall = () => {
    if (gCall.ws)
      return;
    gCall.userHungUp = false;
    callPeerRef.current = "用户";
    setCallStatus("连接中…");
    try {
      callWsRef.current = { readyState: 1, close: () => {
      } };
      gCall.ws = callWsRef.current;
      setCallState("incall");
      setCallUI("bar");
      setCallStatus("聆听中 · " + callPeerRef.current);
      addMsg("sys", "—— 通话已接通（统一语音识别）——");
      speechManager.start("zh-CN");
      if (!gCall.speechUnsub) {
        gCall.speechUnsub = speechManager.subscribe((text) => {
          onCallFinal(text);
        });
      }
      if (!micGateRef.current && !gCall.micGate) {
        speechManager.mute();
      }
    } catch (e) {
      cleanupCall({ userHangup: false, reason: "start-fail" });
      addMsg("sys", "⚠ 拨打失败：" + (e?.message || e));
    }
  };
  const lastScreenShotRef = reactExports.useRef(null);
  const lastCamShotRef = reactExports.useRef(null);
  const SCREEN_CACHE_MS = 3e4;
  const CAM_CACHE_MS = 6e4;
  const aiAutoCapture = async (what) => {
    const cache = what === "screen" ? lastScreenShotRef.current : lastCamShotRef.current;
    const ttl = what === "screen" ? SCREEN_CACHE_MS : CAM_CACHE_MS;
    if (cache && Date.now() - cache.at < ttl)
      return cache.dataUrl;
    const dataUrl = what === "screen" ? await seeScreen() : await seeCamera();
    if (what === "screen")
      lastScreenShotRef.current = { dataUrl, at: Date.now() };
    else
      lastCamShotRef.current = { dataUrl, at: Date.now() };
    return dataUrl;
  };
  const seeCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    try {
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => setTimeout(r, 350));
      const cv = document.createElement("canvas");
      cv.width = video.videoWidth || 640;
      cv.height = video.videoHeight || 480;
      cv.getContext("2d").drawImage(video, 0, 0, cv.width, cv.height);
      return cv.toDataURL("image/jpeg", 0.85);
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  };
  const seeScreen = async () => {
    const bridge = window.companionScreenShot;
    if (!bridge)
      throw new Error("截屏桥未就绪（需重启应用加载新 preload）");
    const r = await bridge();
    if (!r || !r.ok)
      throw new Error(r?.error || "截屏失败");
    return r.dataUrl;
  };
  const [currentModel, setCurrentModel] = reactExports.useState(null);
  const [desktopPetEnabled, setDesktopPetEnabled] = reactExports.useState(() => {
    const saved = localStorage.getItem("ruanlinyun_3d_desktop_pet_enabled");
    return saved === null ? true : saved === "true";
  });
  const [wallpaperEnabled, setWallpaperEnabled] = reactExports.useState(() => {
    return localStorage.getItem("ruanlinyun_3d_wallpaper_enabled") !== "false";
  });
  const [physicsEnabled, setPhysicsEnabled] = reactExports.useState(() => {
    const saved = localStorage.getItem("ruanlinyun_3d_physics_enabled");
    return saved === null ? true : saved === "true";
  });
  const [windEnabled, setWindEnabled] = reactExports.useState(() => {
    const saved = localStorage.getItem("ruanlinyun_3d_wind_enabled");
    return saved === null ? true : saved === "true";
  });
  const [fileHint, setFileHint] = reactExports.useState(null);
  const [modelLoading, setModelLoading] = reactExports.useState(false);
  const [loadingProgress, setLoadingProgress] = reactExports.useState(0);
  const [modelError, setModelError] = reactExports.useState(null);
  const fileHintTimerRef = React.useRef(null);
  const finishTimerRef = React.useRef(null);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fileHintTimerRef.current)
        clearTimeout(fileHintTimerRef.current);
      if (finishTimerRef.current)
        clearTimeout(finishTimerRef.current);
      fileHintTimerRef.current = null;
      finishTimerRef.current = null;
    };
  }, []);
  const stopModelProcess = React.useCallback(() => {
    setCurrentModel(null);
    try {
      window.dispatchEvent(new Event("ruanlinyun_force_stop"));
    } catch {
    }
    setModelError(null);
    const desktopPet = window.desktopPet;
    if (desktopPet && typeof desktopPet.hide === "function") {
      desktopPet.hide();
      console.log("[NewPage] 桌宠已随3D建模进程同步关闭");
    }
  }, []);
  const stopModelProcessRef = React.useRef(stopModelProcess);
  stopModelProcessRef.current = stopModelProcess;
  React.useEffect(() => {
    const onForceStop = () => {
      (async () => {
        try {
          const wm = window.wallpaperMode;
          if (wm && typeof wm.getStatus === "function") {
            const st = await wm.getStatus();
            if (st?.active && typeof wm.exit === "function") {
              await wm.exit();
              console.log("[NewPage] 壁纸模式已随停止进程退出");
            }
          }
        } catch (e) {
          console.warn("[NewPage] 壁纸退出异常:", e);
        }
      })();
    };
    window.addEventListener("ruanlinyun_force_stop", onForceStop);
    return () => window.removeEventListener("ruanlinyun_force_stop", onForceStop);
  }, []);
  const showDesktopPet = async (fileName, fileData, textureFiles, modelFile) => {
    const desktopPet = window.desktopPet;
    console.log("[桌宠诊断][NewPage] showDesktopPet 调用:", {
      fileName,
      dataHasData: !!fileData,
      dataByteLength: fileData?.byteLength || 0,
      textureCount: textureFiles.length,
      hasModelFile: !!modelFile,
      desktopPetExists: !!desktopPet,
      desktopPetShowType: typeof desktopPet?.show
    });
    if (!desktopPet || typeof desktopPet.show !== "function") {
      console.info("[NewPage] 桌宠功能仅在桌面应用(exe)中可用，当前为网页环境，跳过桌宠显示");
      return;
    }
    try {
      const petModelData = {
        name: fileName,
        data: fileData,
        modelWebkitRelativePath: modelFile?.webkitRelativePath || modelFile?.name || "",
        textureFiles: textureFiles.map((t) => ({
          name: t.name,
          path: t.path || t.name,
          data: t.data,
          webkitRelativePath: t.file?.webkitRelativePath || t.file?.name || ""
        }))
      };
      console.log("[桌宠诊断][NewPage] 即将调用 desktopPet.show(), modelWebkitRelativePath=", petModelData.modelWebkitRelativePath);
      const result = await desktopPet.show(petModelData);
      console.log("[桌宠诊断][NewPage] ✅ desktopPet.show() 返回:", result, "（注意：窗口实际显示由主进程 ready-to-show 控制，此处返回仅代表IPC到达主进程）");
      try {
        const absPath = modelFile?.path;
        if (absPath) {
          const sep = absPath.includes("\\") ? "\\" : "/";
          const dir = absPath.slice(0, absPath.lastIndexOf(sep));
          const dm = window.defaultModel;
          if (dm?.setDir) {
            const r = await dm.setDir(dir);
            if (r?.success)
              console.log("[v92] 默认模型目录已登记: " + dir);
          }
        } else {
          console.log("[v92] showDesktopPet 无 File.path（缓存链），跳过目录登记");
        }
      } catch (e) {
        console.warn("[v92] 目录登记失败（不阻断）:", e);
      }
    } catch (e) {
      console.error("[桌宠诊断][NewPage] ❌ desktopPet.show() 抛错:", e);
    }
  };
  const openModelPreview = (fileName, fileData, textureFiles = [], url, modelFile) => {
    setCurrentModel({ name: fileName, data: fileData, textureFiles, url, modelFile });
    try {
      localStorage.setItem("ruanlinyun_3d_last_model", fileName);
    } catch {
    }
    if (desktopPetEnabled) {
      showDesktopPet(fileName, fileData, textureFiles, modelFile);
    }
  };
  const openModelPreviewRef = React.useRef(openModelPreview);
  openModelPreviewRef.current = openModelPreview;
  React.useEffect(() => {
    window.__newPageAPI = {
      loadFromCache: async () => {
        try {
          const dp = window.desktopPet;
          if (!dp || typeof dp.getModel !== "function")
            return { err: "no desktopPet.getModel" };
          const meta = await dp.getModel();
          if (!meta || !meta.url)
            return { err: "no cached model (先通过 desktopPet.show 喂入)" };
          const modelResp = await fetch(meta.url + "?t=" + Date.now());
          const data = await modelResp.arrayBuffer();
          const textureFiles = [];
          for (const t of meta.textureFiles || []) {
            try {
              const r = await fetch(t.url + "?t=" + Date.now());
              if (!r.ok)
                continue;
              const d = await r.arrayBuffer();
              if (!d.byteLength)
                continue;
              textureFiles.push({ name: t.name, path: t.path || t.name, data: d, webkitRelativePath: t.webkitRelativePath || "" });
            } catch (e) {
            }
          }
          openModelPreviewRef.current(meta.name || "model.pmx", data, textureFiles, meta.url, void 0);
          return { ok: true, pmxLen: data.byteLength, texN: textureFiles.length };
        } catch (e) {
          return { err: e.message };
        }
      }
    };
    return () => {
      try {
        delete window.__newPageAPI;
      } catch (e) {
      }
    };
  }, []);
  const handleDesktopPetToggle = (val) => {
    setDesktopPetEnabled(val);
    localStorage.setItem("ruanlinyun_3d_desktop_pet_enabled", String(val));
    if (val && currentModel) {
      showDesktopPet(currentModel.name, currentModel.data, currentModel.textureFiles || [], currentModel.modelFile);
    } else if (!val) {
      const desktopPet = window.desktopPet;
      if (desktopPet && typeof desktopPet.hide === "function") {
        desktopPet.hide();
      }
    }
  };
  const handleMultipleFiles = reactExports.useCallback((files) => {
    setModelLoading(true);
    setLoadingProgress(0);
    setModelError(null);
    const { modelFiles, textureFiles, unsupportedFiles } = classifyImportedFiles(files);
    if (modelFiles.length === 0) {
      const hasCompressedArchive = unsupportedFiles.some((file) => /\.(zip|rar|7z)$/i.test(file.name));
      const errorMessage = hasCompressedArchive ? "当前稳定版请直接选择PMX所在文件夹，或同时选择PMX与贴图文件；暂不支持直接导入 ZIP、RAR、7Z 压缩包。" : "未找到支持的模型文件，请选择 PMX、GLB、GLTF 或 OBJ 模型。";
      setModelError(errorMessage);
      setModelLoading(false);
      return;
    }
    const firstModel = modelFiles[0];
    const firstModelFile = files.find((file) => file.name === firstModel.name);
    if (!firstModelFile) {
      setModelError("未能读取所选模型文件，请重新选择。");
      setModelLoading(false);
      setLoadingProgress(0);
      return;
    }
    const readFileAsArrayBuffer = (file, onProgress) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(e.loaded / e.total);
          }
        };
        reader.onload = (e) => {
          if (e.target?.result instanceof ArrayBuffer) {
            resolve(e.target.result);
          } else {
            reject(new Error(`读取失败: ${file.name}`));
          }
        };
        reader.onerror = () => reject(new Error(`读取失败: ${file.name}`));
        reader.readAsArrayBuffer(file);
      });
    };
    const findTextureFile = (textureName, texturePath) => {
      let f = files.find((file) => {
        const relPath = (file.webkitRelativePath || file.name).toLowerCase().replace(/\\/g, "/");
        return relPath === texturePath.toLowerCase();
      });
      if (f)
        return f;
      f = files.find((file) => file.name === textureName && (file.webkitRelativePath || file.name).toLowerCase().replace(/\\/g, "/") === texturePath);
      if (f)
        return f;
      f = files.find((file) => file.name.toLowerCase() === textureName.toLowerCase());
      if (f)
        return f;
      f = files.find((file) => (file.webkitRelativePath || file.name).toLowerCase().endsWith("/" + textureName.toLowerCase()));
      if (f)
        return f;
      f = files.find((file) => file.name.includes(textureName.split(".")[0]) || textureName.includes(file.name.split(".")[0]));
      return f;
    };
    const modelPromise = readFileAsArrayBuffer(firstModelFile, (p) => {
      setLoadingProgress(p * 50);
    });
    const texturePromises = textureFiles.map((texture) => {
      const textureFile = findTextureFile(texture.name, texture.path);
      if (!textureFile) {
        return Promise.reject(new Error(`未找到贴图文件: ${texture.name}`));
      }
      return readFileAsArrayBuffer(textureFile).then((data) => ({
        name: texture.name,
        path: texture.path,
        data,
        file: textureFile
        // 保留原始 File 对象，用于 babylon-mmd 的 referenceFiles
      }));
    });
    Promise.allSettled([modelPromise, ...texturePromises]).then((results) => {
      const modelResult = results[0];
      if (modelResult.status !== "fulfilled") {
        setModelError("模型文件读取失败，请重试。");
        setModelLoading(false);
        setLoadingProgress(0);
        return;
      }
      const loadedTextures = [];
      const failedTextures = [];
      for (let i = 1; i < results.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled") {
          loadedTextures.push(r.value);
        } else {
          failedTextures.push(textureFiles[i - 1]?.name || "unknown");
        }
      }
      if (!mountedRef.current)
        return;
      setLoadingProgress(100);
      if (finishTimerRef.current)
        clearTimeout(finishTimerRef.current);
      finishTimerRef.current = setTimeout(() => {
        finishTimerRef.current = null;
        if (!mountedRef.current)
          return;
        openModelPreview(firstModel.name, modelResult.value, loadedTextures, void 0, firstModelFile);
        if (failedTextures.length > 0) {
          console.warn(`[NewPage] 部分贴图加载失败: ${failedTextures.join(", ")}`);
          setModelError(`模型已加载，但 ${failedTextures.length} 个贴图文件处理失败，可能影响部分材质显示。`);
        }
        setModelLoading(false);
        setLoadingProgress(0);
      }, 200);
    });
  }, []);
  const handleImportModel = reactExports.useCallback(() => {
    setModelError(null);
    const modelFileInput = document.createElement("input");
    modelFileInput.type = "file";
    modelFileInput.webkitdirectory = true;
    modelFileInput.onchange = (e) => {
      const target = e.target;
      if (target.files && target.files.length > 0) {
        const files = Array.from(target.files);
        const v81ModelFile = files.find((f) => /\.(pmx|glb|gltf|obj)$/i.test(f.name));
        const v81Cached = (() => {
          try {
            return localStorage.getItem("ruanlinyun_3d_last_model") || "";
          } catch {
            return "";
          }
        })();
        if (v81ModelFile && v81Cached && v81ModelFile.name === v81Cached) {
          console.log("[NewPage] 缓存校验命中（同名），清屏后取缓存");
          const v81Api = window.__newPageAPI;
          if (v81Api?.loadFromCache) {
            setCurrentModel(null);
            setModelLoading(true);
            setLoadingProgress(0);
            v81Api.loadFromCache().then((r) => {
              if (r?.ok) {
                setModelLoading(false);
                return;
              }
              console.warn("[NewPage] 快速路径失败，回退完整导入:", r?.err);
              handleMultipleFiles(files);
            }).catch(() => handleMultipleFiles(files));
            return;
          }
        }
        if (v81ModelFile && v81Cached && v81ModelFile.name !== v81Cached) {
          try {
            localStorage.removeItem("ruanlinyun_3d_last_model");
          } catch {
          }
          setCurrentModel(null);
          console.log("[NewPage] 新模型（" + v81ModelFile.name + " ≠ 缓存 " + v81Cached + "），旧缓存已清、旧画面已卸");
        }
        handleMultipleFiles(files);
      }
    };
    modelFileInput.click();
  }, [handleMultipleFiles]);
  const showHint = (text) => {
    setFileHint(text);
    if (fileHintTimerRef.current)
      clearTimeout(fileHintTimerRef.current);
    fileHintTimerRef.current = setTimeout(() => {
      fileHintTimerRef.current = null;
      setFileHint(null);
    }, 3e3);
  };
  const handleWallpaperToggle = async (val) => {
    if (val && !currentModel) {
      showHint("请先导入模型，再开启壁纸模式");
      return;
    }
    const wm = window.wallpaperMode;
    if (!wm || typeof wm.enter !== "function") {
      showHint("壁纸模式仅在桌面应用(exe)中可用");
      return;
    }
    setWallpaperEnabled(val);
    wallpaperUserTouchedRef.current = Date.now();
    try {
      localStorage.setItem("ruanlinyun_3d_wallpaper_enabled", String(val));
    } catch {
    }
    try {
      if (val) {
        await wm.enter();
      } else {
        await wm.exit();
      }
    } catch (e) {
      console.warn("[NewPage] 壁纸模式切换失败:", e);
      setWallpaperEnabled(!val);
    }
  };
  React.useEffect(() => {
    const wm = window.wallpaperMode;
    if (!wm || typeof wm.getStatus !== "function")
      return;
    const refresh = async () => {
      try {
        const s = await wm.getStatus();
        if (Date.now() - wallpaperUserTouchedRef.current < 3e3)
          return;
        setWallpaperEnabled(!!s.active);
      } catch {
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    let off;
    try {
      off = wm.onAttached(() => {
        refresh();
      });
    } catch {
    }
    return () => {
      window.removeEventListener("focus", refresh);
      if (typeof off === "function")
        off();
    };
  }, []);
  const handlePhysicsToggle = (val) => {
    setPhysicsEnabled(val);
    localStorage.setItem("ruanlinyun_3d_physics_enabled", String(val));
  };
  const handleWindToggle = (val) => {
    setWindEnabled(val);
    localStorage.setItem("ruanlinyun_3d_wind_enabled", String(val));
  };
  const handleDefaultModelEnabledToggle = () => {
    const next = !defaultModelEnabled;
    setDefaultModelEnabled(next);
    try {
      localStorage.setItem("ruanlinyun_3d_default_model_enabled", String(next));
    } catch {
    }
    showHint(next ? "默认模型已启用（下次启动自动加载）" : "默认模型已停用（下次启动不自动加载）");
  };
  return /* @__PURE__ */ jsxs(Box, { sx: { height: "100vh", display: "flex", flexDirection: "column", width: "100vw", overflow: "hidden", position: "relative" }, children: [
    /* @__PURE__ */ jsx(Box, { sx: {
      px: 2,
      py: 2,
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%)"
    }, children: /* @__PURE__ */ jsx(IconButton, { "aria-label": "返回", onClick: () => navigate("/chat"), sx: { color: "#fff" }, children: /* @__PURE__ */ jsx(UTurnArrow, {}) }) }),
    /* @__PURE__ */ jsx(Box, { sx: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at center, #2a2a3a 0%, #0a0a14 100%)",
      perspective: "800px",
      position: "relative"
    }, children: currentModel ? (
      // [可用性优先] 预览区始终显示 3D；桌宠窗口可另开，互不影响「用户必须能看见」
      /* @__PURE__ */ jsx(React.Suspense, { fallback: /* @__PURE__ */ jsxs("div", { style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "rgba(232,232,232,0.78)", fontSize: 13, letterSpacing: 2 }, children: [
        /* @__PURE__ */ jsx("div", { className: "rl-natural-spinner", style: { width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.12)", borderTopColor: "rgba(255,255,255,0.92)", borderRightColor: "rgba(255,255,255,0.35)", animation: "rl-spin 0.85s cubic-bezier(0.45,0.05,0.35,1) infinite" } }),
        /* @__PURE__ */ jsx("div", { children: "正在加载 3D 引擎…" })
      ] }), children: /* @__PURE__ */ jsx(
        BabylonModelViewer,
        {
          modelData: currentModel,
          physicsEnabled,
          windEnabled,
          desktopPetMode: false
        },
        `model-${currentModel.name}`
      ) })
    ) : modelLoading ? (
      // [v165] 启动/加载中：自然转圈，避免黑屏干等
      /* @__PURE__ */ jsxs(Box, { sx: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        width: "100%",
        height: "100%",
        color: "rgba(232,232,232,0.85)"
      }, children: [
        /* @__PURE__ */ jsx(Box, { sx: {
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.12)",
          borderTopColor: "rgba(255,255,255,0.92)",
          borderRightColor: "rgba(255,255,255,0.35)",
          animation: "rl-spin 0.85s cubic-bezier(0.45,0.05,0.35,1) infinite",
          "@keyframes rl-spin": { to: { transform: "rotate(360deg)" } },
          boxShadow: "0 0 24px rgba(255,255,255,0.06)"
        } }),
        /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { letterSpacing: 2, opacity: 0.85, animation: "rl-breathe 1.6s ease-in-out infinite", "@keyframes rl-breathe": { "0%,100%": { opacity: 0.55 }, "50%": { opacity: 0.95 } } }, children: [
          "正在加载模型… ",
          Math.round(loadingProgress),
          "%"
        ] })
      ] })
    ) : (
      // 未导入且未在加载：旋转立方体占位场景（CSS 3D 实现，无需加载 Babylon.js）
      /* @__PURE__ */ jsx(Box, { sx: {
        width: 120,
        height: 120,
        position: "relative",
        transformStyle: "preserve-3d",
        animation: "cube-rotate 12s linear infinite",
        "@keyframes cube-rotate": {
          "0%": { transform: "rotateX(0deg) rotateY(0deg)" },
          "100%": { transform: "rotateX(360deg) rotateY(360deg)" }
        }
      }, children: [
        { transform: "rotateY(0deg) translateZ(60px)", color: "rgba(100,180,255,0.7)" },
        { transform: "rotateY(180deg) translateZ(60px)", color: "rgba(180,100,255,0.7)" },
        { transform: "rotateY(90deg) translateZ(60px)", color: "rgba(100,255,180,0.7)" },
        { transform: "rotateY(-90deg) translateZ(60px)", color: "rgba(255,180,100,0.7)" },
        { transform: "rotateX(90deg) translateZ(60px)", color: "rgba(255,100,180,0.7)" },
        { transform: "rotateX(-90deg) translateZ(60px)", color: "rgba(180,255,100,0.7)" }
      ].map((face, i) => /* @__PURE__ */ jsx(Box, { sx: {
        position: "absolute",
        width: "100%",
        height: "100%",
        transform: face.transform,
        background: face.color,
        border: "1px solid rgba(255,255,255,0.3)",
        boxShadow: "inset 0 0 30px rgba(255,255,255,0.2)"
      } }, i)) })
    ) }),
    callState === "incall" && /* @__PURE__ */ jsxs(Box, { sx: {
      position: "absolute",
      bottom: 56,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 40,
      display: callUI === "hidden" ? "none" : "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 0.75
      // 6px：间隔小，但能分辨两层
    }, children: [
      /* @__PURE__ */ jsx(Box, { sx: {
        width: 432,
        // 288 × 1.5
        height: 120,
        // 6 行 × 20px
        boxSizing: "border-box",
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        bgcolor: "transparent",
        border: "none",
        boxShadow: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end"
      }, children: chatLog.length === 0 ? /* @__PURE__ */ jsx(Typography, { sx: { fontSize: 13, lineHeight: "20px", color: "#ffffff", textAlign: "center", textShadow: "0 1px 3px rgba(0,0,0,0.75)" }, children: "通话记录…（我 / AI）" }) : chatLog.slice(-6).map((m, i) => /* @__PURE__ */ jsx(Typography, { sx: {
        fontSize: 13,
        lineHeight: "20px",
        fontWeight: m.cls === "me" ? 700 : 600,
        color: "#ffffff",
        textShadow: "0 1px 3px rgba(0,0,0,0.85)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }, children: (m.cls === "me" ? "我：" : m.cls === "ai" ? "AI：" : "") + m.text }, i)) }),
      /* @__PURE__ */ jsxs(Box, { sx: {
        minWidth: 288,
        alignItems: "center",
        gap: 1.5,
        px: 2.5,
        py: 1.2,
        borderRadius: 26,
        bgcolor: "rgba(224, 242, 241, 0.35)",
        border: "1px solid rgba(0, 137, 123, 0.45)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
        display: "flex",
        backdropFilter: "blur(6px)"
      }, children: [
        /* @__PURE__ */ jsxs(Box, { onClick: interruptCall, title: "点击中断", sx: {
          position: "relative",
          width: 16,
          height: 16,
          cursor: "pointer",
          flexShrink: 0
        }, children: [
          callPhase !== "listening" && /* @__PURE__ */ jsx(Box, { sx: { position: "absolute", inset: -3, borderRadius: "50%", border: "2px solid", borderColor: callPhase === "speaking" ? "#e53935" : "#00897b", opacity: 0.6, animation: "pulse 1.2s infinite" } }),
          /* @__PURE__ */ jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: callPhase === "speaking" ? "#e53935" : "#00897b", position: "absolute", top: 4, left: 4, animation: "pulse 1.2s infinite" } })
        ] }),
        /* @__PURE__ */ jsx(Typography, { sx: { fontSize: 13, color: "#004d40", fontWeight: 600 }, children: callStatus }),
        /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: () => {
          micGateRef.current = !micGateRef.current;
          gCall.micGate = micGateRef.current;
          setMicOn(micGateRef.current);
          if (micGateRef.current)
            speechManager.unmute();
          else
            speechManager.mute();
        }, sx: { color: micOn ? "#00796b" : "#bdbdbd" }, title: micOn ? "麦克风开启中（点击关闭）" : "麦克风已关（点击开启）", children: micOn ? /* @__PURE__ */ jsx(default_1, { fontSize: "small" }) : /* @__PURE__ */ jsx(default_1$1, { fontSize: "small" }) }),
        /* @__PURE__ */ jsx(Button, { size: "small", variant: "contained", onClick: () => cleanupCall({ userHangup: true, reason: "user-button" }), sx: { bgcolor: "#e53935", "&:hover": { bgcolor: "#c62828" }, textTransform: "none", px: 1.5, minWidth: 0 }, children: "挂断" })
      ] })
    ] }),
    !consoleOpen && /* @__PURE__ */ jsx(
      IconButton,
      {
        "aria-label": "打开控制台",
        onClick: () => setConsoleOpen(true),
        sx: {
          position: "absolute",
          top: 80,
          right: 16,
          zIndex: 20,
          bgcolor: "#ffffff",
          color: "#1a1a1a",
          border: "2px solid #1a1a1a",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          "&:hover": { bgcolor: "#f5f5f5" }
        },
        children: /* @__PURE__ */ jsx(default_1$2, {})
      }
    ),
    consoleOpen && /* @__PURE__ */ jsxs(
      Paper,
      {
        elevation: 8,
        sx: {
          position: "absolute",
          top: 80,
          right: 16,
          zIndex: 20,
          width: 280,
          maxWidth: "calc(100vw - 32px)",
          bgcolor: "#ffffff",
          color: "#1a1a1a",
          border: "2px solid #1a1a1a",
          borderRadius: 2,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          overflow: "hidden"
        },
        children: [
          /* @__PURE__ */ jsxs(Box, { sx: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            bgcolor: "#1a1a1a",
            color: "#ffffff"
          }, children: [
            /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsx(default_1$2, { fontSize: "small" }),
              /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", sx: { fontWeight: "bold", letterSpacing: 0.5 }, children: "控制台" })
            ] }),
            /* @__PURE__ */ jsx(
              IconButton,
              {
                "aria-label": "收起控制台",
                onClick: () => setConsoleOpen(false),
                size: "small",
                sx: { color: "#ffffff", p: 0.5 },
                children: /* @__PURE__ */ jsx(default_1$3, { fontSize: "small", sx: { transform: "rotate(180deg)" } })
              }
            )
          ] }),
          /* @__PURE__ */ jsx(Divider, {}),
          /* @__PURE__ */ jsxs(Box, { sx: { p: 1.5, display: "flex", flexDirection: "column", gap: 1 }, children: [
            currentModel ? /* @__PURE__ */ jsx(Tooltip, { title: "停止3D建模进程，关闭模型并同步关闭桌面宠物，恢复立方体占位", placement: "left", children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                fullWidth: true,
                startIcon: /* @__PURE__ */ jsx(default_1$4, {}),
                onClick: stopModelProcess,
                sx: {
                  justifyContent: "flex-start",
                  bgcolor: "#d32f2f",
                  color: "#ffffff",
                  textTransform: "none",
                  fontWeight: "bold",
                  py: 1.2,
                  "&:hover": { bgcolor: "#b71c1c" }
                },
                children: "停止该进程"
              }
            ) }) : /* @__PURE__ */ jsx(Tooltip, { title: "选择文件夹导入 PMX/GLTF/GLB/OBJ 模型", placement: "left", children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                fullWidth: true,
                startIcon: modelLoading ? /* @__PURE__ */ jsx(CircularProgress, { size: 16, color: "inherit" }) : /* @__PURE__ */ jsx(default_1$5, {}),
                onClick: handleImportModel,
                disabled: modelLoading,
                sx: {
                  justifyContent: "flex-start",
                  bgcolor: "#1a1a1a",
                  color: "#ffffff",
                  textTransform: "none",
                  fontWeight: "bold",
                  py: 1.2,
                  "&:hover": { bgcolor: "#333" }
                },
                children: modelLoading ? `加载中... ${Math.round(loadingProgress)}%` : "导入建模"
              }
            ) }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                fullWidth: true,
                startIcon: /* @__PURE__ */ jsx(default_1$6, {}),
                onClick: () => {
                  if (callState === "incall") {
                    cleanupCall({ userHangup: true, reason: "user-panel" });
                  } else {
                    startCall();
                  }
                },
                sx: {
                  justifyContent: "flex-start",
                  bgcolor: callState === "incall" ? "#e53935" : "#00897b",
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: "bold",
                  py: 1.1,
                  "&:hover": { bgcolor: callState === "incall" ? "#c62828" : "#00695c" }
                },
                children: callState === "incall" ? "挂断通话" : "语音通话"
              }
            ),
            /* @__PURE__ */ jsxs(Accordion, { elevation: 0, defaultExpanded: true, sx: { border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 1 }, children: [
              /* @__PURE__ */ jsx(AccordionSummary, { children: /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", width: "100%", minWidth: 0 }, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: "bold", flexGrow: 1 }, children: "默认选项" }),
                /* @__PURE__ */ jsx(
                  IconButton,
                  {
                    size: "small",
                    "aria-label": "设置",
                    onClick: (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      try {
                        sessionStorage.setItem("settingsFrom", window.location.pathname || "/");
                      } catch {
                      }
                      navigate("/settings");
                    },
                    sx: { p: 0.35, mr: 0.5, color: "text.secondary", "&:hover": { color: "#1976d2", bgcolor: "action.hover" } },
                    children: /* @__PURE__ */ jsx(default_1$7, { fontSize: "small" })
                  }
                ),
                /* @__PURE__ */ jsx(default_1$8, { fontSize: "small", sx: { color: "text.secondary" } })
              ] }) }),
              /* @__PURE__ */ jsxs(AccordionDetails, { sx: { pt: 1, px: 1, pb: 1 }, children: [
                /* @__PURE__ */ jsx(Box, { sx: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }, children: [
                  { label: "风力效果", icon: /* @__PURE__ */ jsx(default_1$9, { fontSize: "small" }), on: windEnabled && physicsEnabled, disabled: !physicsEnabled, toggle: () => handleWindToggle(!(windEnabled && physicsEnabled)) },
                  { label: "物理模组", icon: /* @__PURE__ */ jsx(default_1$a, { fontSize: "small" }), on: physicsEnabled, disabled: false, toggle: () => handlePhysicsToggle(!physicsEnabled) },
                  { label: "启动问候", icon: /* @__PURE__ */ jsx(default_1$b, { fontSize: "small" }), on: !greetDisabled, disabled: false, toggle: () => {
                    const n = !greetDisabled;
                    setGreetDisabled(n);
                    try {
                      localStorage.setItem("ruanlinyun_greet_disabled", String(n));
                    } catch {
                    }
                  } },
                  { label: "桌面宠物", icon: /* @__PURE__ */ jsx(default_1$c, { fontSize: "small" }), on: desktopPetEnabled, disabled: false, toggle: () => handleDesktopPetToggle(!desktopPetEnabled) },
                  { label: "摄像头", icon: /* @__PURE__ */ jsx(default_1$d, { fontSize: "small" }), on: flags.cam, disabled: false, toggle: () => toggleFlag("cam") },
                  { label: "屏幕识别", icon: /* @__PURE__ */ jsx(default_1$e, { fontSize: "small" }), on: flags.screen, disabled: false, toggle: () => toggleFlag("screen") }
                ].map(({ label, icon, on, disabled, toggle }) => /* @__PURE__ */ jsxs(
                  Box,
                  {
                    onClick: disabled ? void 0 : toggle,
                    sx: {
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1,
                      py: 0.5,
                      border: "1px solid #e0e0e0",
                      borderRadius: 1,
                      bgcolor: on ? "#effaf8" : "#fafafa",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1,
                      position: "relative",
                      "&:hover": { borderColor: "#00897b" }
                    },
                    children: [
                      /* @__PURE__ */ jsxs(Box, { sx: { position: "relative", display: "inline-flex", color: on ? "#00897b" : "#9e9e9e" }, children: [
                        icon,
                        !on && /* @__PURE__ */ jsx(Box, { sx: { position: "absolute", left: "50%", top: "50%", width: "130%", height: 1.5, bgcolor: "#e57373", transform: "translate(-50%,-50%) rotate(-45deg)", borderRadius: 1 } })
                      ] }),
                      /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: "bold", color: on ? "#004d40" : "#9e9e9e", fontSize: 12 }, children: label })
                    ]
                  },
                  label
                )) }),
                /* @__PURE__ */ jsx(Tooltip, { title: "把角色挂到桌面壁纸层（与 F11 同一条链路）。开启前需先导入模型；退出走本开关或 F11。", placement: "left", children: /* @__PURE__ */ jsxs(Box, { sx: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.5,
                  py: 0.5,
                  border: "1px solid #e0e0e0",
                  borderRadius: 1,
                  bgcolor: wallpaperEnabled ? "#e3f2fd" : "#fafafa"
                }, children: [
                  /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }, children: [
                    /* @__PURE__ */ jsx(default_1$f, { fontSize: "small", sx: { color: wallpaperEnabled ? "#1976d2" : "#1a1a1a" } }),
                    /* @__PURE__ */ jsx(Box, { sx: { minWidth: 0 }, children: /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: "bold", color: "#1a1a1a" }, children: "壁纸模式" }) })
                  ] }),
                  /* @__PURE__ */ jsx(
                    Switch,
                    {
                      checked: wallpaperEnabled,
                      onChange: (e) => handleWallpaperToggle(e.target.checked),
                      color: "primary",
                      size: "small"
                    }
                  )
                ] }) }),
                !currentModel && /* @__PURE__ */ jsx(Tooltip, { title: "请先通过「导入建模」选择模型文件夹", placement: "left", children: /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "outlined",
                    fullWidth: true,
                    startIcon: /* @__PURE__ */ jsx(default_1$g, {}),
                    disabled: true,
                    onClick: void 0,
                    sx: {
                      justifyContent: "flex-start",
                      borderColor: "#bdbdbd",
                      color: "#bdbdbd",
                      textTransform: "none",
                      fontWeight: "bold",
                      py: 1.2
                    },
                    children: "文件"
                  }
                ) }),
                currentModel && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 0.5, border: "1px solid #e0e0e0", borderRadius: 1, bgcolor: defaultModelEnabled ? "#effaf8" : "#fafafa" }, children: [
                  /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
                    /* @__PURE__ */ jsx(default_1$g, { fontSize: "small", sx: { color: defaultModelEnabled ? "#00897b" : "#9e9e9e" } }),
                    /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: "bold", color: defaultModelEnabled ? "#004d40" : "#9e9e9e", fontSize: 12 }, children: "默认启用此模型" })
                  ] }),
                  /* @__PURE__ */ jsx(Switch, { checked: defaultModelEnabled, onChange: handleDefaultModelEnabledToggle, size: "small", sx: { "&.Mui-checked": { color: "#00897b" }, "&.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00897b" } } })
                ] }),
                modelError && /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { color: "#d32f2f", px: 1, mt: 0.5 }, children: modelError }),
                fileHint && /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { color: "#666", px: 1, mt: 0.5, fontStyle: "italic" }, children: fileHint }),
                currentModel && /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { color: "#2e7d32", px: 1, mt: 0.5 }, children: [
                  "✓ 当前模型: ",
                  currentModel.name
                ] })
              ] })
            ] })
          ] })
        ]
      }
    )
  ] });
}
export {
  NewPage as default,
  visionImagePart
};
