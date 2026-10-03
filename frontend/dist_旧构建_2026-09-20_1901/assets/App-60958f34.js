var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { _ as __vitePreload } from "./babylon-fa4505fb.js";
import { r as reactExports, u as useTheme, b as jsxs, j as jsx, B as Box, a3 as default_1, T as Typography, Z as default_1$1, V as default_1$2, a4 as Avatar, a5 as default_1$3, a6 as Menu, M as MenuItem, I as IconButton, a7 as default_1$4, v as default_1$5, k as CircularProgress, a8 as default_1$6, a9 as default_1$7, e as TextField, aa as default_1$8, ab as Snackbar, ac as default_1$9, ad as default_1$a, ae as default_1$b, af as default_1$c, ag as default_1$d, R as React, ah as createTheme, ai as ThemeProvider, aj as CssBaseline, G as Fragment } from "./mui-bbeacffb.js";
import { u as useLocation, a as useNavigate, b as apiConfigService, B as BrowserRouter, R as Routes, c as Route, M as MobileSettingsPage, H as HomePage } from "./pages-63a295eb.js";
import { u as useMobileLayout, i as isNativePlatform } from "./index-e561af19.js";
const _DeviceOptimizer = class _DeviceOptimizer {
  constructor() {
    __publicField(this, "deviceCapabilities");
    __publicField(this, "optimizationLevel", "high");
    __publicField(this, "textureCache", /* @__PURE__ */ new Map());
    __publicField(this, "MAX_CACHE_SIZE", 100);
    this.deviceCapabilities = this.detectCapabilities();
    const mobile = this.isMobileDevice();
    const { cores } = this.deviceCapabilities.cpu;
    const mem = this.deviceCapabilities.memory.total;
    if (mobile) {
      this.optimizationLevel = cores <= 4 || mem <= 4 ? "low" : "medium";
    } else {
      this.optimizationLevel = this.deviceCapabilities.gpu.hasDedicatedGPU ? "high" : "medium";
    }
    console.log(`[设备优化器] 画质等级: ${this.optimizationLevel.toUpperCase()} (移动端=${mobile}, 核心=${cores}, 内存=${mem}GB)`);
  }
  /**
   * [修复 卡顿] 是否运行在移动设备上。
   * 原实现无视设备差异，一律返回桌面级"ULTRA"参数（4K 阴影贴图 / 8 光源 / 抗锯齿全开），
   * 这些参数放到手机 GPU 上必然掉帧甚至直接渲染失败，是移动端卡顿的系统性根因。
   */
  isMobileDevice() {
    var _a, _b, _c, _d;
    if (typeof window === "undefined")
      return false;
    const w = window;
    if ((_b = (_a = w.Capacitor) == null ? void 0 : _a.isNativePlatform) == null ? void 0 : _b.call(_a))
      return true;
    const p = (_d = (_c = w.Capacitor) == null ? void 0 : _c.getPlatform) == null ? void 0 : _d.call(_c);
    if (p === "android" || p === "ios")
      return true;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }
  static getInstance() {
    if (!_DeviceOptimizer.instance) {
      _DeviceOptimizer.instance = new _DeviceOptimizer();
    }
    return _DeviceOptimizer.instance;
  }
  detectCapabilities() {
    var _a, _b;
    const capabilities = {
      memory: {
        total: navigator.deviceMemory || 8,
        available: 2
      },
      gpu: {
        isWebGL2Supported: false,
        isWebGLSupported: false,
        hasDedicatedGPU: false,
        renderer: "Unknown"
      },
      cpu: {
        cores: navigator.hardwareConcurrency || 4,
        basePerformance: 1
      }
    };
    try {
      const canvas = document.createElement("canvas");
      const gl2 = canvas.getContext("webgl2");
      const gl = gl2 || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      capabilities.gpu.isWebGL2Supported = !!gl2;
      capabilities.gpu.isWebGLSupported = !!gl;
      if (gl) {
        const webgl = gl;
        const debugInfo = webgl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Unknown";
          capabilities.gpu.renderer = renderer;
          const lowerRenderer = renderer.toLowerCase();
          const isIntelIntegrated = lowerRenderer.includes("intel") && !lowerRenderer.includes("iris");
          const isAmdIntegrated = lowerRenderer.includes("amd") && (lowerRenderer.includes("integrated") || lowerRenderer.includes("vega") || lowerRenderer.includes("hd graphics") || lowerRenderer.includes("apu"));
          const isNvidia = lowerRenderer.includes("nvidia") || lowerRenderer.includes("geforce") || lowerRenderer.includes("quadro");
          const isAmdDedicated = lowerRenderer.includes("amd") && lowerRenderer.includes("rx");
          const isIntelDedicated = lowerRenderer.includes("iris");
          capabilities.gpu.hasDedicatedGPU = isNvidia || isAmdDedicated || isIntelDedicated || !isIntelIntegrated && !isAmdIntegrated;
        }
      }
      if (gl) {
        const loseCtx = (_a = gl.getExtension) == null ? void 0 : _a.call(gl, "WEBGL_lose_context");
        (_b = loseCtx == null ? void 0 : loseCtx.loseContext) == null ? void 0 : _b.call(loseCtx);
      }
      canvas.width = 0;
      canvas.height = 0;
    } catch (e) {
      console.warn("[DeviceOptimizer] GPU检测失败:", e);
    }
    try {
      const testStartTime = Date.now();
      for (let i = 0; i < 1e5; i++) {
        Math.sqrt(i);
      }
      const testDuration = Date.now() - testStartTime;
      capabilities.cpu.basePerformance = Math.max(0.5, Math.min(2, 50 / testDuration));
    } catch (e) {
      console.warn("[设备优化器] CPU性能检测失败:", e);
    }
    return capabilities;
  }
  getDeviceCapabilities() {
    return this.deviceCapabilities;
  }
  getOptimizationLevel() {
    return this.optimizationLevel;
  }
  // 最高画质设置 - 无限制
  get3DRenderSettings() {
    const level = this.optimizationLevel;
    const dpr = window.devicePixelRatio || 1;
    if (level === "low") {
      return {
        useWebGL2: this.deviceCapabilities.gpu.isWebGL2Supported,
        antialiasing: false,
        // 低端机抗锯齿开销高、收益低
        shadows: false,
        // 阴影是最贵的一项，低端机直接关闭
        textureResolution: "low",
        maxLights: 2,
        shadowMapSize: 512,
        pixelRatio: 1
        // 不做超采样，按物理像素 1:1
      };
    }
    if (level === "medium") {
      return {
        useWebGL2: this.deviceCapabilities.gpu.isWebGL2Supported,
        antialiasing: false,
        shadows: true,
        textureResolution: "medium",
        maxLights: 4,
        shadowMapSize: 1024,
        pixelRatio: Math.min(dpr, 1.5)
      };
    }
    return {
      useWebGL2: this.deviceCapabilities.gpu.isWebGL2Supported,
      antialiasing: true,
      shadows: true,
      textureResolution: "high",
      maxLights: 8,
      shadowMapSize: 2048,
      // 桌面端 2048 已足够，4096 收益极低而显存翻 4 倍
      pixelRatio: Math.min(dpr, 2)
    };
  }
  // 最大内存容量 - 无限制
  getMemorySettings() {
    const level = this.optimizationLevel;
    if (level === "low") {
      return { maxHistoryLength: 100, maxWorkingMemoryItems: 20, cleanupIntervalMinutes: 10, maxCacheSize: 20 };
    }
    if (level === "medium") {
      return { maxHistoryLength: 200, maxWorkingMemoryItems: 50, cleanupIntervalMinutes: 30, maxCacheSize: 50 };
    }
    return {
      maxHistoryLength: 500,
      // 更大的历史记录
      maxWorkingMemoryItems: 100,
      // 更多工作内存
      cleanupIntervalMinutes: 60,
      // 更长的清理间隔
      maxCacheSize: this.MAX_CACHE_SIZE
    };
  }
  // 最高性能设置 - 无限制
  getPerformanceSettings() {
    const level = this.optimizationLevel;
    if (level === "low") {
      return { enableAnimations: false, enableRealTimeUpdates: false, maxConcurrentRequests: 2, debounceDelayMs: 33, targetFPS: 30 };
    }
    if (level === "medium") {
      return { enableAnimations: true, enableRealTimeUpdates: true, maxConcurrentRequests: 4, debounceDelayMs: 16, targetFPS: 60 };
    }
    return {
      enableAnimations: true,
      // 始终开启动画
      enableRealTimeUpdates: true,
      // 始终开启实时更新
      maxConcurrentRequests: 16,
      // 更高的并发
      debounceDelayMs: 16,
      // 60FPS对应的延迟
      targetFPS: 60
      // 目标60帧
    };
  }
  // 智能纹理缓存 - 真正的优化
  cacheTexture(key, texture) {
    if (this.textureCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.textureCache.keys().next().value;
      if (firstKey) {
        this.textureCache.delete(firstKey);
      }
    }
    this.textureCache.set(key, texture);
  }
  getCachedTexture(key) {
    return this.textureCache.get(key);
  }
  clearTextureCache() {
    this.textureCache.clear();
  }
  applyOptimizations() {
    var _a;
    const memorySettings = this.getMemorySettings();
    const performanceSettings = this.getPerformanceSettings();
    const isDev = typeof process !== "undefined" && ((_a = process.env) == null ? void 0 : _a.NODE_ENV) === "development";
    if ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && isDev) {
      window.__deviceOptimizer = {
        capabilities: this.deviceCapabilities,
        optimizationLevel: this.optimizationLevel,
        settings: {
          memory: memorySettings,
          performance: performanceSettings,
          "3d": this.get3DRenderSettings()
        },
        message: "ULTRA画质模式 - 所有特效已开启"
      };
    }
  }
};
__publicField(_DeviceOptimizer, "instance");
let DeviceOptimizer = _DeviceOptimizer;
function WindowControls() {
  const [isMaximized, setIsMaximized] = reactExports.useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const onPreview = location.pathname === "/" || location.pathname === "/new-page";
  reactExports.useEffect(() => {
    var _a, _b;
    const wc2 = window.windowControls;
    if (!wc2)
      return;
    (_a = wc2.isMaximized) == null ? void 0 : _a.call(wc2).then((m) => setIsMaximized(m)).catch(() => {
    });
    const cleanup = (_b = wc2.onMaximizeChange) == null ? void 0 : _b.call(wc2, (m) => setIsMaximized(m));
    return () => {
      cleanup == null ? void 0 : cleanup();
    };
  }, []);
  if (location.pathname === "/pet")
    return null;
  const wc = window.windowControls;
  const iconColor = isDarkMode || onPreview ? "#ffffff" : "#000000";
  const hoverBg = isDarkMode || onPreview ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.12)";
  const btnBase = {
    width: 44,
    height: 32,
    border: "none",
    background: "transparent",
    color: iconColor,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
    ...{ WebkitAppRegion: "no-drag" }
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 99999,
        display: "flex",
        height: 36,
        background: "transparent",
        ...{ WebkitAppRegion: "no-drag" },
        pointerEvents: "auto"
      },
      children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              var _a;
              return (_a = wc == null ? void 0 : wc.minimize) == null ? void 0 : _a.call(wc);
            },
            style: btnBase,
            title: "最小化",
            onMouseEnter: (e) => {
              e.currentTarget.style.background = hoverBg;
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "transparent";
            },
            children: /* @__PURE__ */ jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", children: /* @__PURE__ */ jsx("rect", { x: "0", y: "4.5", width: "10", height: "1", fill: "currentColor" }) })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              var _a;
              return (_a = wc == null ? void 0 : wc.toggleMaximize) == null ? void 0 : _a.call(wc);
            },
            style: btnBase,
            title: isMaximized ? "退出全屏" : "全屏",
            onMouseEnter: (e) => {
              e.currentTarget.style.background = hoverBg;
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "transparent";
            },
            children: isMaximized ? /* @__PURE__ */ jsxs("svg", { width: "11", height: "11", viewBox: "0 0 11 11", children: [
              /* @__PURE__ */ jsx("rect", { x: "2", y: "0", width: "8", height: "8", fill: "none", stroke: "currentColor", strokeWidth: "1" }),
              /* @__PURE__ */ jsx("rect", { x: "0", y: "2", width: "8", height: "8", fill: "none", stroke: "currentColor", strokeWidth: "1" }),
              /* @__PURE__ */ jsx("rect", { x: "0", y: "2", width: "3", height: "1", fill: "currentColor" }),
              /* @__PURE__ */ jsx("rect", { x: "5", y: "9", width: "3", height: "1", fill: "currentColor" })
            ] }) : /* @__PURE__ */ jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", children: /* @__PURE__ */ jsx("rect", { x: "0.5", y: "0.5", width: "9", height: "9", fill: "none", stroke: "currentColor", strokeWidth: "1" }) })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              var _a;
              return (_a = wc == null ? void 0 : wc.close) == null ? void 0 : _a.call(wc);
            },
            style: { ...btnBase, width: 44 },
            title: "关闭",
            onMouseEnter: (e) => {
              e.currentTarget.style.background = "#e81123";
              e.currentTarget.style.color = "#fff";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = iconColor;
            },
            children: /* @__PURE__ */ jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", children: /* @__PURE__ */ jsx("path", { d: "M0,0 L10,10 M10,0 L0,10", stroke: "currentColor", strokeWidth: "1.2" }) })
          }
        )
      ]
    }
  );
}
const TypewriterEffect = ({
  text,
  speed = 30,
  delay = 0,
  onComplete
}) => {
  const [displayText, setDisplayText] = reactExports.useState("");
  const [isComplete, setIsComplete] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let timeoutId;
    let currentIndex = 0;
    const startTyping = () => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(startTyping, speed);
      } else {
        setIsComplete(true);
        onComplete == null ? void 0 : onComplete();
      }
    };
    const startDelay = setTimeout(() => {
      startTyping();
    }, delay);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(startDelay);
    };
  }, [text, speed, delay, onComplete]);
  return /* @__PURE__ */ jsxs("span", { children: [
    displayText,
    !isComplete && /* @__PURE__ */ jsx("span", { style: { opacity: 0.5 }, children: "|" })
  ] });
};
const HOT_WORDS = [
  "阮琳云",
  "琳云",
  "数字人",
  "智能助手",
  "语音助手",
  "桌面助手",
  "虚拟人",
  "你好",
  "请问",
  "谢谢",
  "再见",
  "帮助",
  "打开",
  "关闭",
  "播放",
  "停止",
  "暂停",
  "继续",
  "开始",
  "结束",
  "今天",
  "明天",
  "昨天",
  "天气",
  "几点",
  "时间",
  "日期",
  "星期",
  "什么",
  "为什么",
  "怎么样",
  "怎么",
  "多少",
  "哪里",
  "谁",
  "音乐",
  "歌曲",
  "视频",
  "图片",
  "照片",
  "文件",
  "文档",
  "邮件",
  "短信",
  "电话",
  "聊天",
  "对话",
  "消息",
  "通知",
  "提醒",
  "闹钟",
  "定时",
  "搜索",
  "查询",
  "翻译",
  "计算",
  "保存",
  "删除",
  "取消",
  "确认",
  "发送",
  "设置",
  "语音",
  "文字",
  "模型",
  "角色",
  "任务",
  "主页",
  "返回",
  "上一个",
  "下一个",
  "上一页",
  "下一页",
  "通话",
  "打电话",
  "接电话",
  "挂电话",
  "挂断",
  "接通",
  "静音",
  "免提",
  "扬声器",
  "听筒",
  "关机",
  "重启",
  "注销",
  "锁屏",
  "休眠",
  "睡眠",
  "音量",
  "调高",
  "调低",
  "截图",
  "截屏",
  "回收站",
  "垃圾桶",
  "壁纸",
  "分辨率",
  "终端",
  "命令行",
  "记事本",
  "计算器",
  "画图",
  "浏览器",
  "清理垃圾",
  "清理缓存",
  "清空回收站",
  "倒计时",
  "定时器",
  "计时",
  "分钟",
  "小时",
  "秒钟",
  "几号",
  "星期几",
  "礼拜",
  "新闻",
  "资讯",
  "股票",
  "基金",
  "汇率",
  "价格",
  "热点",
  "头条",
  "微信",
  "邮箱"
];
const HOMOPHONE_RULES = [
  ["软林云|阮林云|阮玲云|阮琳芸|阮灵云|软琳云|阮淋云|阮林芸|阮琳韵|阮凌芸|阮凌韵|阮琳允|阮临云|阮菱云|阮绫云|软淋云", "阮琳云"],
  ["(?<![\\u4e00-\\u9fa5])(?:林云|玲云|淋云)(?![\\u4e00-\\u9fa5])", "琳云"],
  ["只能助手|智能住手|只能住手|智囊助手", "智能助手"],
  ["数字刃|数字认|数值人", "数字人"],
  ["雨音", "语音"],
  ["摸型|磨型", "模型"],
  ["认务", "任务"],
  ["在见", "再见"],
  ["在次", "再次"],
  ["情问", "请问"],
  ["金天", "今天"],
  ["名天", "明天"],
  ["天起", "天气"],
  ["什莫", "什么"],
  ["为什莫|喂什么", "为什么"],
  ["怎莫", "怎么"],
  ["阴乐|因乐", "音乐"],
  ["帮住|邦助", "帮助"],
  ["时坚", "时间"],
  ["去消", "取消"],
  ["记算", "计算"],
  ["收索|搜所", "搜索"],
  ["麦克锋|麦可风|麦客风", "麦克风"]
];
const COMPILED_RULES = HOMOPHONE_RULES.map(
  ([pattern, replacement]) => [new RegExp(pattern, "g"), replacement]
);
function applySpeechFix(text) {
  if (!text)
    return "";
  let fixed = text.trim();
  for (const [re, replacement] of COMPILED_RULES) {
    fixed = fixed.replace(re, replacement);
  }
  fixed = fixed.replace(/([，。！？；：、,.;!?])\1+/g, "$1");
  fixed = fixed.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2");
  fixed = fixed.replace(/ {2,}/g, " ");
  return fixed;
}
function buildGrammarString() {
  return "#JSGF V1.0; grammar commands; public <command> = " + HOT_WORDS.join(" | ") + " ;";
}
function pickBestTranscript(result) {
  var _a;
  let best = "";
  let bestConf = -1;
  if (!result || typeof result.length !== "number")
    return "";
  for (let j = 0; j < result.length; j++) {
    const alt = result[j];
    if (!alt)
      continue;
    const conf = typeof alt.confidence === "number" ? alt.confidence : 0;
    if (conf > bestConf) {
      bestConf = conf;
      best = alt.transcript ?? "";
    }
  }
  return best || (((_a = result[0]) == null ? void 0 : _a.transcript) ?? "");
}
const aiResponseServiceRef = { current: null };
const ALLOWED_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];
const ALLOWED_DOC_EXT = [
  ".txt",
  ".md",
  ".rtf",
  ".doc",
  ".docx",
  ".pdf",
  ".xls",
  ".xlsx",
  ".csv",
  ".et",
  ".ppt",
  ".pptx",
  ".dps",
  ".wps",
  ".odt",
  ".pages"
];
const SCRIPT_BLACKLIST = [
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".pyc",
  ".pyw",
  ".sh",
  ".bat",
  ".ps1",
  ".exe",
  ".cmd",
  ".vbs"
];
const MODEL_OPTIONS = [
  { label: "GPT-4o (云端)", value: "gpt-4o" },
  { label: "GPT-3.5-Turbo (云端)", value: "gpt-3.5-turbo" },
  { label: "Claude-3.5 (云端)", value: "claude-3-5-sonnet" },
  { label: "DeepSeek (云端)", value: "deepseek" }
];
const getFileExt = (fileName) => {
  const idx = fileName.lastIndexOf(".");
  if (idx === -1)
    return "";
  return fileName.slice(idx).toLowerCase();
};
const formatFileSize = (bytes) => {
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};
const detectFileType = (file) => {
  const ext = getFileExt(file.name);
  if (!ext)
    return "rejected";
  if (SCRIPT_BLACKLIST.includes(ext))
    return "rejected";
  if (ALLOWED_IMAGE_EXT.includes(ext))
    return "image";
  if (ALLOWED_DOC_EXT.includes(ext))
    return "document";
  return "rejected";
};
const getDocumentIcon = (fileName) => {
  const ext = getFileExt(fileName);
  if (ext === ".pdf")
    return /* @__PURE__ */ jsx(default_1$9, {});
  if (ext === ".xls" || ext === ".xlsx" || ext === ".csv" || ext === ".et")
    return /* @__PURE__ */ jsx(default_1$a, {});
  if (ext === ".ppt" || ext === ".pptx" || ext === ".dps")
    return /* @__PURE__ */ jsx(default_1$b, {});
  if (ext === ".txt" || ext === ".md" || ext === ".rtf")
    return /* @__PURE__ */ jsx(default_1$c, {});
  if (ext === ".doc" || ext === ".docx" || ext === ".wps" || ext === ".odt")
    return /* @__PURE__ */ jsx(default_1$c, {});
  return /* @__PURE__ */ jsx(default_1$d, {});
};
function MobileLayout({ children }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = reactExports.useState("chat");
  return /* @__PURE__ */ jsxs(Box, { sx: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    overflow: "hidden"
  }, children: [
    /* @__PURE__ */ jsx(Box, { sx: {
      flex: 1,
      overflow: "hidden",
      pb: "56px"
      /* 底部导航栏高度 */
    }, children }),
    /* @__PURE__ */ jsxs(Box, { className: "mobile-bottom-nav", children: [
      /* @__PURE__ */ jsxs(
        Box,
        {
          className: `mobile-bottom-nav-item ${activeTab === "chat" ? "active" : ""}`,
          onClick: () => {
            setActiveTab("chat");
            navigate("/");
          },
          children: [
            /* @__PURE__ */ jsx(default_1, { fontSize: "small" }),
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: "0.65rem" }, children: "聊天" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Box,
        {
          className: `mobile-bottom-nav-item ${activeTab === "pet" ? "active" : ""}`,
          onClick: () => {
            setActiveTab("pet");
            navigate("/pet");
          },
          children: [
            /* @__PURE__ */ jsx(default_1$1, { fontSize: "small" }),
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: "0.65rem" }, children: "桌宠" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Box,
        {
          className: `mobile-bottom-nav-item ${activeTab === "settings" ? "active" : ""}`,
          onClick: () => {
            setActiveTab("settings");
            navigate("/settings");
          },
          children: [
            /* @__PURE__ */ jsx(default_1$2, { fontSize: "small" }),
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: "0.65rem" }, children: "设置" })
          ]
        }
      )
    ] })
  ] });
}
const MAX_MESSAGES = 100;
const MAX_IMAGE_DIMENSION = 1280;
async function compressImageToDataUrl(file) {
  var _a;
  const objectUrl = URL.createObjectURL(file);
  let bitmap = null;
  let canvas = null;
  try {
    bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("无法获取 2D 上下文");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  } finally {
    (_a = bitmap == null ? void 0 : bitmap.close) == null ? void 0 : _a.call(bitmap);
    URL.revokeObjectURL(objectUrl);
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
  }
}
function appendMessage(prev, msg) {
  const next = [...prev, msg];
  return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
}
function MobileChat() {
  var _a;
  const [messages, setMessages] = reactExports.useState([
    {
      id: "1",
      text: "主人好！我是阮琳云，有什么可以帮助您的吗？",
      sender: "ai",
      time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    }
  ]);
  const [inputText, setInputText] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [selectedModel, setSelectedModel] = reactExports.useState(MODEL_OPTIONS[0].value);
  const [modelMenuAnchor, setModelMenuAnchor] = reactExports.useState(null);
  const [snackMsg, setSnackMsg] = reactExports.useState("");
  const [previewImage, setPreviewImage] = reactExports.useState(null);
  const messagesEndRef = reactExports.useRef(null);
  const recognitionRef = reactExports.useRef(null);
  const mountedRef = reactExports.useRef(true);
  const scrollToBottom = () => {
    var _a2;
    (_a2 = messagesEndRef.current) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth" });
  };
  reactExports.useEffect(() => {
    scrollToBottom();
  }, [messages]);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      var _a2;
      mountedRef.current = false;
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.onresult = null;
          rec.onerror = null;
          rec.onend = null;
          (_a2 = rec.abort) == null ? void 0 : _a2.call(rec);
        } catch {
        }
        recognitionRef.current = null;
      }
    };
  }, []);
  const handleFileUpload = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = [...ALLOWED_IMAGE_EXT, ...ALLOWED_DOC_EXT].join(",");
    fileInput.onchange = async (e) => {
      const target = e.target;
      if (!target.files || target.files.length === 0)
        return;
      const allFiles = Array.from(target.files);
      const acceptedImages = [];
      const acceptedDocs = [];
      const rejectedFiles = [];
      for (const f of allFiles) {
        const t = detectFileType(f);
        if (t === "image")
          acceptedImages.push(f);
        else if (t === "document")
          acceptedDocs.push(f);
        else
          rejectedFiles.push(f);
      }
      if (rejectedFiles.length > 0) {
        const names = rejectedFiles.map((f) => f.name).join("、");
        setMessages((prev) => appendMessage(prev, {
          id: (Date.now() + 0.5).toString(),
          text: `⚠️ 以下文件被拒绝上传（仅支持图片和工作类文档，禁止上传脚本或可执行文件）：
${names}`,
          sender: "ai",
          time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
        }));
      }
      for (const imgFile of acceptedImages) {
        try {
          const dataUrl = await compressImageToDataUrl(imgFile);
          if (!mountedRef.current)
            return;
          setMessages((prev) => appendMessage(prev, {
            id: `${Date.now()}_${imgFile.name}`,
            text: "",
            sender: "user",
            time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
            attachment: { kind: "image", fileName: imgFile.name, fileSize: imgFile.size, dataUrl, mimeType: imgFile.type }
          }));
        } catch (err) {
          console.error("图片读取失败:", imgFile.name, err);
        }
      }
      for (const docFile of acceptedDocs) {
        if (!mountedRef.current)
          return;
        setMessages((prev) => appendMessage(prev, {
          id: `${Date.now()}_${docFile.name}`,
          text: "",
          sender: "user",
          time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          attachment: { kind: "document", fileName: docFile.name, fileSize: docFile.size, mimeType: docFile.type }
        }));
      }
    };
    fileInput.click();
  };
  const handleVoiceInput = () => {
    var _a2, _b;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSnackMsg("当前环境不支持语音输入");
      return;
    }
    if (recognitionRef.current) {
      try {
        (_b = (_a2 = recognitionRef.current).abort) == null ? void 0 : _b.call(_a2);
      } catch {
      }
      recognitionRef.current = null;
    }
    try {
      const rec = new SR();
      recognitionRef.current = rec;
      rec.lang = "zh-CN";
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      try {
        const SGL = window.SpeechGrammarList || window.webkitSpeechGrammarList;
        if (SGL) {
          const gl = new SGL();
          gl.addFromString(buildGrammarString(), 0.5);
          rec.grammars = gl;
        }
      } catch {
      }
      rec.onresult = (ev) => {
        if (!mountedRef.current)
          return;
        const transcript = applySpeechFix(pickBestTranscript(ev.results[0]));
        if (!transcript)
          return;
        setInputText((prev) => (prev ? prev + " " : "") + transcript);
      };
      rec.onerror = () => {
        if (!mountedRef.current)
          return;
        setSnackMsg("语音识别失败，请重试");
      };
      rec.onend = () => {
        if (recognitionRef.current === rec)
          recognitionRef.current = null;
      };
      rec.start();
    } catch {
      recognitionRef.current = null;
      setSnackMsg("无法启动语音识别");
    }
  };
  const handleCopy = (text) => {
    var _a2;
    (_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText(text).then(() => setSnackMsg("已复制")).catch(() => setSnackMsg("复制失败"));
  };
  const handleRegenerate = async (aiMsgId) => {
    var _a2;
    const idx = messages.findIndex((m) => m.id === aiMsgId);
    if (idx <= 0)
      return;
    const prevUserMsg = messages[idx - 1];
    if (prevUserMsg.sender !== "user")
      return;
    setIsLoading(true);
    try {
      const text = prevUserMsg.text || ((_a2 = prevUserMsg.attachment) == null ? void 0 : _a2.fileName) || "";
      const aiResult = await callAI(text);
      setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, text: aiResult } : m));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, text: `抱歉，重新生成失败：${errMsg}` } : m));
    } finally {
      setIsLoading(false);
    }
  };
  const callAI = async (text) => {
    var _a2, _b;
    if (!aiResponseServiceRef.current) {
      try {
        const { llmApiService } = await __vitePreload(() => import("./pages-63a295eb.js").then((n) => n.L), true ? ["assets/pages-63a295eb.js","assets/babylon-fa4505fb.js","assets/mui-bbeacffb.js"] : void 0);
        aiResponseServiceRef.current = llmApiService;
      } catch (e) {
        console.warn("AI 服务加载失败:", e);
      }
    }
    if ((_b = (_a2 = aiResponseServiceRef.current) == null ? void 0 : _a2.isConfigured) == null ? void 0 : _b.call(_a2)) {
      const now = /* @__PURE__ */ new Date();
      const timeInfo = `[当前时间] ${now.toLocaleString("zh-CN", { hour12: false })}`;
      const systemPrompt = `你是阮琳云，一个友好、温暖的AI助手。请用中文回复，语气亲切自然。${timeInfo}`;
      const history = messages.slice(-20).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));
      return await aiResponseServiceRef.current.askWithHistory(history, text, systemPrompt, { model: selectedModel });
    }
    return 'AI 模型未配置，请前往"设置"页面配置 API Key 并启用。';
  };
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text)
      return;
    const now = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    setMessages((prev) => appendMessage(prev, { id: Date.now().toString(), text, sender: "user", time: now }));
    setInputText("");
    setIsLoading(true);
    try {
      const aiResult = await callAI(text);
      if (!mountedRef.current)
        return;
      setMessages((prev) => appendMessage(prev, {
        id: (Date.now() + 1).toString(),
        text: aiResult,
        sender: "ai",
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      }));
    } catch (error) {
      if (!mountedRef.current)
        return;
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessages((prev) => appendMessage(prev, {
        id: (Date.now() + 1).toString(),
        text: `抱歉，处理请求时出错：${errMsg}`,
        sender: "ai",
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      }));
    } finally {
      if (mountedRef.current)
        setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs(Box, { className: "mobile-chat-container", children: [
    /* @__PURE__ */ jsxs(Box, { sx: {
      py: 1.5,
      px: 2,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      bgcolor: "background.paper",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
      flexShrink: 0
    }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center" }, children: [
        /* @__PURE__ */ jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: "#4f46e5", fontSize: "0.8rem", mr: 1 }, children: "阮" }),
        /* @__PURE__ */ jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 500 }, children: "阮琳云" })
      ] }),
      /* @__PURE__ */ jsxs(
        Box,
        {
          onClick: (e) => setModelMenuAnchor(e.currentTarget),
          sx: { display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", color: "primary.main" },
          children: [
            /* @__PURE__ */ jsx(default_1$3, { fontSize: "small" }),
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: "0.7rem" }, children: ((_a = MODEL_OPTIONS.find((m) => m.value === selectedModel)) == null ? void 0 : _a.label) || "模型" })
          ]
        }
      ),
      /* @__PURE__ */ jsx(Menu, { anchorEl: modelMenuAnchor, open: !!modelMenuAnchor, onClose: () => setModelMenuAnchor(null), children: MODEL_OPTIONS.map((m) => /* @__PURE__ */ jsx(
        MenuItem,
        {
          selected: m.value === selectedModel,
          onClick: () => {
            setSelectedModel(m.value);
            setModelMenuAnchor(null);
          },
          children: m.label
        },
        m.value
      )) })
    ] }),
    /* @__PURE__ */ jsxs(Box, { className: "mobile-chat-messages", sx: { flex: 1, overflowY: "auto", px: 1.5, py: 1 }, children: [
      messages.map((msg) => /* @__PURE__ */ jsxs(
        Box,
        {
          sx: {
            display: "flex",
            gap: 1,
            mb: 2,
            justifyContent: msg.sender === "user" ? "flex-end" : "flex-start"
          },
          children: [
            msg.sender === "ai" && /* @__PURE__ */ jsx(Avatar, { sx: { bgcolor: "#4f46e5", width: 32, height: 32, fontSize: "0.8rem", flexShrink: 0 }, children: "阮" }),
            /* @__PURE__ */ jsx(Box, { sx: { maxWidth: "78%" }, children: /* @__PURE__ */ jsxs(Box, { sx: {
              p: 1.5,
              borderRadius: "12px",
              bgcolor: msg.sender === "user" ? "#4f46e5" : "background.paper",
              color: msg.sender === "user" ? "white" : "text.primary",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
            }, children: [
              msg.attachment && /* @__PURE__ */ jsxs(Box, { sx: { mb: msg.text ? 1 : 0 }, children: [
                msg.attachment.kind === "image" && msg.attachment.dataUrl && /* @__PURE__ */ jsx(
                  Box,
                  {
                    component: "img",
                    src: msg.attachment.dataUrl,
                    alt: msg.attachment.fileName,
                    onClick: () => setPreviewImage(msg.attachment.dataUrl),
                    sx: { width: "100%", maxWidth: 220, borderRadius: "8px", cursor: "pointer", display: "block" }
                  }
                ),
                msg.attachment.kind === "document" && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, p: 1, bgcolor: "rgba(0,0,0,0.04)", borderRadius: "8px" }, children: [
                  getDocumentIcon(msg.attachment.fileName),
                  /* @__PURE__ */ jsxs(Box, { sx: { minWidth: 0 }, children: [
                    /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { display: "block", fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: msg.attachment.fileName }),
                    /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { opacity: 0.6, fontSize: "0.7rem" }, children: formatFileSize(msg.attachment.fileSize) })
                  ] })
                ] })
              ] }),
              msg.text && (msg.sender === "ai" ? /* @__PURE__ */ jsx(TypewriterEffect, { text: msg.text, speed: 25 }) : /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { lineHeight: 1.5, whiteSpace: "pre-wrap" }, children: msg.text })),
              msg.sender === "ai" && msg.text && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 0.5, mt: 0.5, justifyContent: "flex-end" }, children: [
                /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: () => handleCopy(msg.text), sx: { p: 0.5 }, children: /* @__PURE__ */ jsx(default_1$4, { fontSize: "small" }) }),
                /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: () => handleRegenerate(msg.id), sx: { p: 0.5 }, children: /* @__PURE__ */ jsx(default_1$5, { fontSize: "small" }) })
              ] })
            ] }) }),
            msg.sender === "user" && /* @__PURE__ */ jsx(Avatar, { sx: { bgcolor: "#10b981", width: 32, height: 32, fontSize: "0.8rem", flexShrink: 0 }, children: "U" })
          ]
        },
        msg.id
      )),
      isLoading && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 1, mb: 2 }, children: [
        /* @__PURE__ */ jsx(Avatar, { sx: { bgcolor: "#4f46e5", width: 32, height: 32, fontSize: "0.8rem" }, children: "阮" }),
        /* @__PURE__ */ jsx(Box, { sx: { p: 1.5, borderRadius: "12px", bgcolor: "background.paper" }, children: /* @__PURE__ */ jsx(CircularProgress, { size: 16 }) })
      ] }),
      /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
    ] }),
    /* @__PURE__ */ jsx(Box, { className: "mobile-chat-input", children: /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 0.5, alignItems: "flex-end" }, children: [
      /* @__PURE__ */ jsx(IconButton, { onClick: handleFileUpload, sx: { color: "text.secondary", width: 40, height: 40 }, children: /* @__PURE__ */ jsx(default_1$6, { fontSize: "small" }) }),
      /* @__PURE__ */ jsx(IconButton, { onClick: handleVoiceInput, sx: { color: "text.secondary", width: 40, height: 40 }, children: /* @__PURE__ */ jsx(default_1$7, { fontSize: "small" }) }),
      /* @__PURE__ */ jsx(
        TextField,
        {
          multiline: true,
          maxRows: 3,
          value: inputText,
          onChange: (e) => setInputText(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          },
          placeholder: "输入消息...",
          size: "small",
          sx: {
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              fontSize: "0.9rem"
            }
          }
        }
      ),
      /* @__PURE__ */ jsx(
        IconButton,
        {
          onClick: handleSend,
          disabled: !inputText.trim() || isLoading,
          sx: {
            bgcolor: "#4f46e5",
            color: "white",
            width: 44,
            height: 44,
            "&:hover": { bgcolor: "#4338ca" },
            "&:disabled": { bgcolor: "rgba(0,0,0,0.12)" }
          },
          children: /* @__PURE__ */ jsx(default_1$8, { fontSize: "small" })
        }
      )
    ] }) }),
    previewImage && /* @__PURE__ */ jsx(
      Box,
      {
        onClick: () => setPreviewImage(null),
        sx: {
          position: "fixed",
          inset: 0,
          zIndex: 2e3,
          bgcolor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2
        },
        children: /* @__PURE__ */ jsx(Box, { component: "img", src: previewImage, sx: { maxWidth: "100%", maxHeight: "100%", borderRadius: "8px" } })
      }
    ),
    /* @__PURE__ */ jsx(
      Snackbar,
      {
        open: !!snackMsg,
        autoHideDuration: 2e3,
        onClose: () => setSnackMsg(""),
        message: snackMsg,
        anchorOrigin: { vertical: "bottom", horizontal: "center" }
      }
    )
  ] });
}
const SettingsPage = React.lazy(() => __vitePreload(() => import("./pages-63a295eb.js").then((n) => n.S), true ? ["assets/pages-63a295eb.js","assets/babylon-fa4505fb.js","assets/mui-bbeacffb.js"] : void 0));
const NewPage = React.lazy(() => __vitePreload(() => import("./pages-63a295eb.js").then((n) => n.N), true ? ["assets/pages-63a295eb.js","assets/babylon-fa4505fb.js","assets/mui-bbeacffb.js"] : void 0));
const PetPage = React.lazy(() => __vitePreload(() => import("./pages-63a295eb.js").then((n) => n.P), true ? ["assets/pages-63a295eb.js","assets/babylon-fa4505fb.js","assets/mui-bbeacffb.js"] : void 0));
const MobilePet = React.lazy(() => __vitePreload(() => import("./MobilePet-2250c9c5.js"), true ? ["assets/MobilePet-2250c9c5.js","assets/mui-bbeacffb.js","assets/babylon-fa4505fb.js"] : void 0));
const darkTheme = createTheme({
  palette: {
    mode: "dark"
  }
});
const lightTheme = createTheme({
  palette: {
    mode: "light"
  }
});
function PreviewKeepAlive() {
  const location = useLocation();
  const onPreview = location.pathname === "/new-page" || location.pathname === "/";
  reactExports.useEffect(() => {
    if (onPreview) {
      try {
        window.dispatchEvent(new CustomEvent("rl-preview-visible"));
      } catch {
      }
      console.log("[PreviewMemory] 进入预览（渲染恢复，建模保留）");
      return;
    }
    try {
      window.dispatchEvent(new CustomEvent("rl-preview-hidden"));
    } catch {
    }
    console.log("[PreviewMemory] 离开预览（后台保活 + 暂停渲染）");
  }, [onPreview]);
  return /* @__PURE__ */ jsx("div", { style: { display: onPreview ? "block" : "none", position: "fixed", inset: 0, zIndex: 1200 }, children: /* @__PURE__ */ jsx(NewPage, {}) });
}
function ChatKeepAlive() {
  const location = useLocation();
  const onChat = location.pathname === "/chat";
  return /* @__PURE__ */ jsx("div", { style: { display: onChat ? "block" : "none", position: "fixed", inset: 0, zIndex: 900 }, children: /* @__PURE__ */ jsx(Box, { sx: {
    bgcolor: "background.default",
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  }, children: /* @__PURE__ */ jsx(HomePage, {}) }) });
}
function App() {
  const [isDarkMode, setIsDarkMode] = reactExports.useState(false);
  const mobileMode = useMobileLayout();
  const theme = isDarkMode ? darkTheme : lightTheme;
  reactExports.useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);
  reactExports.useEffect(() => {
    const deviceOptimizer = DeviceOptimizer.getInstance();
    deviceOptimizer.applyOptimizations();
    console.log("[App] 设备优化器已初始化");
    const runSystemOptimize = async () => {
      try {
        const host = window.location.hostname || "127.0.0.1";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1e4);
        const resp = await fetch(`http://${host}:27865/api/v1/optimization/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: "high" }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (resp.ok)
          console.log("[App] 后台设备优化完成");
      } catch {
        console.warn("[App] 后台设备优化跳过（后端未就绪）");
      }
    };
    const t = window.setTimeout(runSystemOptimize, 8e3);
    const iv = window.setInterval(runSystemOptimize, 5 * 60 * 1e3);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(iv);
    };
  }, []);
  reactExports.useEffect(() => {
    if (isNativePlatform()) {
      console.log("[App] 原生平台：跳过 API Key 下发（避免明文外发与 Mixed Content 拦截）");
      return;
    }
    (async () => {
      try {
        await apiConfigService.waitReady();
        const active = apiConfigService.getActive();
        if (!active) {
          console.log("[App] 未检测到已配置的 provider，跳过下发");
          return;
        }
        const isLocal = active.id === "glm_local" || active.id === "qwen_local" || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(active.baseUrl);
        const mode = isLocal ? "builtin" : "cloud";
        if (mode === "cloud" && !active.apiKey) {
          console.log("[App] 云端模式但无 apiKey，跳过下发");
          return;
        }
        const host = window.location.hostname || "127.0.0.1";
        const backendUrl = `http://${host}:27865/api/v1/wechat-bot/ai-mode`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3e3);
        const resp = await fetch(backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, apiKey: active.apiKey || "", baseUrl: active.baseUrl, model: active.model }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          console.log(`[App] AI 模式已下发到后端 (mode=${mode}, provider=${active.id})`);
        } else {
          console.warn(`[App] AI 模式下发失败: HTTP ${resp.status}`);
        }
      } catch (err) {
        console.warn("[App] AI 模式自动下发异常（后端可能未启动，属正常降级）:", err instanceof Error ? err.message : err);
      }
    })();
  }, []);
  return /* @__PURE__ */ jsxs(ThemeProvider, { theme, children: [
    /* @__PURE__ */ jsx(CssBaseline, {}),
    /* @__PURE__ */ jsxs(BrowserRouter, { children: [
      window.windowControls && /* @__PURE__ */ jsx(WindowControls, {}),
      mobileMode ? /* @__PURE__ */ jsx(MobileLayout, { children: /* @__PURE__ */ jsx(React.Suspense, { fallback: /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, height: "100vh", bgcolor: "#12121a", color: "rgba(232,232,232,0.85)" }, children: [
        /* @__PURE__ */ jsx(CircularProgress, { size: 36, thickness: 4, sx: { color: "#fff" } }),
        /* @__PURE__ */ jsx(Box, { sx: { fontSize: 13, letterSpacing: 2 }, children: "加载中…" })
      ] }), children: /* @__PURE__ */ jsxs(Routes, { children: [
        /* @__PURE__ */ jsx(Route, { path: "/", element: /* @__PURE__ */ jsx(MobileChat, {}) }),
        /* @__PURE__ */ jsx(Route, { path: "/settings", element: /* @__PURE__ */ jsx(Box, { sx: { bgcolor: "background.default", minHeight: "100vh", p: 2 }, children: /* @__PURE__ */ jsx(MobileSettingsPage, { isDarkMode, setIsDarkMode }) }) }),
        /* @__PURE__ */ jsx(Route, { path: "/new-page", element: /* @__PURE__ */ jsx(NewPage, {}) }),
        /* @__PURE__ */ jsx(Route, { path: "/pet", element: /* @__PURE__ */ jsx(MobilePet, {}) })
      ] }) }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(PreviewKeepAlive, {}),
        /* @__PURE__ */ jsx(ChatKeepAlive, {}),
        /* @__PURE__ */ jsx(React.Suspense, { fallback: /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, height: "100vh", bgcolor: "#12121a", color: "rgba(232,232,232,0.85)" }, children: [
          /* @__PURE__ */ jsx(CircularProgress, { size: 36, thickness: 4, sx: { color: "#fff" } }),
          /* @__PURE__ */ jsx(Box, { sx: { fontSize: 13, letterSpacing: 2 }, children: "加载中…" })
        ] }), children: /* @__PURE__ */ jsxs(Routes, { children: [
          /* @__PURE__ */ jsx(Route, { path: "/", element: null }),
          /* @__PURE__ */ jsx(Route, { path: "/chat", element: null }),
          /* @__PURE__ */ jsx(Route, { path: "/settings", element: /* @__PURE__ */ jsx(Box, { sx: {
            bgcolor: "background.default",
            width: "100%",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column"
          }, children: /* @__PURE__ */ jsx(SettingsPage, { isDarkMode, setIsDarkMode }) }) }),
          /* @__PURE__ */ jsx(Route, { path: "/new-page", element: null }),
          /* @__PURE__ */ jsx(Route, { path: "/pet", element: isNativePlatform() ? /* @__PURE__ */ jsx(MobilePet, {}) : /* @__PURE__ */ jsx(PetPage, {}) })
        ] }) })
      ] })
    ] })
  ] });
}
export {
  App as default
};
