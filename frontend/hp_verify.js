import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField, Paper, IconButton, CircularProgress, Avatar, Menu, useMediaQuery, useTheme, Button, FormControl, FormControlLabel, Radio, RadioGroup, Dialog, DialogContent } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import ImageIcon from "@mui/icons-material/Image";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import SettingsIcon from "@mui/icons-material/Settings";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HomeIcon from "@mui/icons-material/Home";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhoneIcon from "@mui/icons-material/Call";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicOffIcon from "@mui/icons-material/MicOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DescriptionIcon from "@mui/icons-material/Description";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import TypewriterEffect from "../components/TypewriterEffect";
import ThinkingProcess from "../components/ThinkingProcess";
const aiResponseServiceRef = { current: null };
const aiFrameworkRef = { current: null };
import { llmApiService, RateLimitError } from "../services/LLMApiService";
import apiConfigService from "../services/ApiConfigService";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import ttsService from "../services/TTSService";
function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDarkMode = theme.palette.mode === "dark";
  const [messagesByAI, setMessagesByAI] = useState({
    "\u962E\u7433\u4E91": [{
      id: "1",
      text: "\u4E3B\u4EBA\u597D\uFF01\u6211\u662F\u962E\u7433\u4E91\uFF0C\u6709\u4EC0\u4E48\u53EF\u4EE5\u5E2E\u52A9\u60A8\u7684\u5417\uFF1F",
      sender: "ai",
      time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    }]
  });
  useEffect(() => {
    let cancelled = false;
    let maintenanceInterval = null;
    import("../ai/AIEvolutionFramework").then(({ AIEvolutionFramework }) => {
      if (cancelled)
        return;
      aiFrameworkRef.current = new AIEvolutionFramework();
      aiFrameworkRef.current.startFreeThinking();
      maintenanceInterval = setInterval(() => {
        aiFrameworkRef.current?.performMaintenance();
      }, 36e5);
      console.log("[HomePage] AI \u8FDB\u5316\u6846\u67B6\u5DF2\u52A0\u8F7D\u5E76\u542F\u52A8");
    }).catch((err) => {
      console.warn("[HomePage] AI \u8FDB\u5316\u6846\u67B6\u52A0\u8F7D\u5931\u8D25\uFF08\u4E0D\u5F71\u54CD\u6838\u5FC3\u529F\u80FD\uFF09:", err);
    });
    return () => {
      cancelled = true;
      if (maintenanceInterval)
        clearInterval(maintenanceInterval);
      aiFrameworkRef.current?.stopFreeThinking();
    };
  }, []);
  const selectedAI = "\u962E\u7433\u4E91";
  const inputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuView, setMenuView] = useState("grid");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [callSpeakerOn, setCallSpeakerOn] = useState(true);
  const [callPhase, setCallPhase] = useState("idle");
  const [callInterimText, setCallInterimText] = useState("");
  const [callNotice, setCallNotice] = useState("");
  const callRecognitionRef = useRef(null);
  const callListeningRef = useRef(false);
  const isAITalkingRef = useRef(false);
  const callMutedRef = useRef(false);
  const callSpeakerOnRef = useRef(true);
  const callEndingRef = useRef(false);
  const callHistoryRef = useRef([]);
  const isCallActiveRef = useRef(false);
  const aiModePrefRef = useRef("api");
  const [previewImage, setPreviewImage] = useState(null);
  const messagesEndRef = useRef(null);
  const [aiModePref, setAiModePref] = useState(() => {
    const v = localStorage.getItem("rly_ai_mode_pref");
    return v === "builtin" || v === "api" || v === "brain" ? v : "api";
  });
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messagesByAI, selectedAI]);
  useEffect(() => {
    llmApiService.init();
  }, []);
  useEffect(() => {
    apiConfigService.waitReady().catch(() => {
    });
  }, []);
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const host = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5e3);
        const resp = await fetch(`http://${host}:27865/api/v1/ai/history/default`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!resp.ok)
          return;
        const data = await resp.json();
        const messages = data?.data?.messages;
        if (Array.isArray(messages) && messages.length > 0) {
          const restored = messages.map((msg, idx) => ({
            id: `restored_${idx}_${Date.now()}`,
            text: msg.content,
            sender: msg.role === "user" ? "user" : "ai",
            time: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : (/* @__PURE__ */ new Date()).toLocaleTimeString()
          }));
          setMessagesByAI((prev) => ({ ...prev, "\u962E\u7433\u4E91": restored }));
          console.log(`[HomePage] \u5DF2\u4ECE\u540E\u7AEF\u6062\u590D ${restored.length} \u6761\u804A\u5929\u8BB0\u5F55`);
        }
      } catch (err) {
        console.warn("[HomePage] \u62C9\u53D6\u804A\u5929\u8BB0\u5F55\u5931\u8D25\uFF08\u540E\u7AEF\u53EF\u80FD\u672A\u542F\u52A8\uFF09:", err);
      }
    };
    loadHistory();
  }, []);
  const persistMessage = async (role, content) => {
    try {
      const host = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
      await fetch(`http://${host}:27865/api/v1/ai/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "default", role, content })
      });
    } catch (err) {
      console.warn("[HomePage] \u6301\u4E45\u5316\u6D88\u606F\u5931\u8D25:", err);
    }
  };
  useEffect(() => {
    if (!isCallActive)
      return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1e3);
    return () => clearInterval(timer);
  }, [isCallActive]);
  const formatCallDuration = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);
  useEffect(() => {
    aiModePrefRef.current = aiModePref;
  }, [aiModePref]);
  async function callAIForCall(userText) {
    const mode = aiModePrefRef.current;
    const now = /* @__PURE__ */ new Date();
    const timeInfo = `[\u5F53\u524D\u65F6\u95F4] ${now.toLocaleString("zh-CN", { hour12: false })}\uFF08${"\u65E5\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D"[now.getDay()]}\uFF09`;
    const basePrompt = "\u4F60\u662F\u962E\u7433\u4E91\uFF0C\u4E00\u4E2A\u53CB\u597D\u3001\u6E29\u6696\u7684AI\u52A9\u624B\u3002\u4F60\u6B63\u5728\u548C\u7528\u6237\u8FDB\u884C\u8BED\u97F3\u901A\u8BDD\uFF0C\u8BF7\u7528\u4E2D\u6587\u53E3\u8BED\u5316\u56DE\u590D\uFF0C\u8BED\u6C14\u4EB2\u5207\u81EA\u7136\uFF0C\u56DE\u7B54\u7B80\u6D01\uFF08\u4E00\u822C\u4E0D\u8D85\u8FC73\u53E5\u8BDD\uFF0C\u9002\u5408\u8BED\u97F3\u64AD\u62A5\uFF09\u3002";
    const systemPrompt = `${basePrompt}

${timeInfo}
\u8BF7\u57FA\u4E8E\u6B64\u65F6\u95F4\u56DE\u7B54\u65F6\u95F4\u76F8\u5173\u95EE\u9898\uFF0C\u4E0D\u8981\u7F16\u9020\u3002`;
    const history = callHistoryRef.current.slice(-20);
    if (mode === "brain") {
      return "\u62B1\u6B49\uFF0C\u962E\u7433\u4E91AI\u672C\u5730\u79BB\u7EBF\u6A21\u5F0F\u6B63\u5728\u5347\u7EA7\u4E2D\uFF0C\u8BF7\u5207\u6362\u5230\u8C03\u7528API\u6216Qwen2.5-3B\u6A21\u5F0F\u518D\u901A\u8BDD\u3002";
    }
    if (mode === "api") {
      if (!llmApiService.isConfigured()) {
        return "API\u672A\u914D\u7F6E\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u5E76\u542F\u7528AI\u6A21\u578BAPI\uFF0C\u7136\u540E\u91CD\u8BD5\u3002";
      }
      try {
        return await llmApiService.askWithHistory(history, userText, systemPrompt);
      } catch (apiErr) {
        if (apiErr instanceof RateLimitError) {
          return "API\u8C03\u7528\u9891\u7387\u8D85\u9650\uFF0C\u8BF7\u7A0D\u7B49\u7247\u523B\u518D\u8BD5\u3002";
        }
        const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        return `API\u8C03\u7528\u5931\u8D25\uFF1A${errMsg}`;
      }
    }
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userText }
      ];
      const resp = await fetch("http://127.0.0.1:11434/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5-3b-instruct-q4_k_m",
          messages,
          max_tokens: 512,
          // 通话场景缩短：512 tokens 约3句话，减少本地模型生成时间
          temperature: 0.7,
          stream: false
        })
      });
      if (!resp.ok)
        throw new Error(`\u672C\u5730\u6A21\u578B\u670D\u52A1\u8FD4\u56DE HTTP ${resp.status}`);
      const data = await resp.json();
      const result = data.choices?.[0]?.message?.content ?? "";
      if (!result)
        throw new Error("\u672C\u5730\u6A21\u578B\u8FD4\u56DE\u7A7A\u5185\u5BB9");
      return result;
    } catch (builtinErr) {
      const errMsg = builtinErr instanceof Error ? builtinErr.message : String(builtinErr);
      if (errMsg.includes("Failed to fetch")) {
        return "\u672C\u5730\u6A21\u578B\u670D\u52A1\u672A\u542F\u52A8\uFF0C\u8BF7\u53CC\u51FB models \u4E0B\u7684 start-qwen-server.bat \u542F\u52A8\u540E\u518D\u901A\u8BDD\u3002";
      }
      return `\u672C\u5730\u6A21\u578B\u8C03\u7528\u5931\u8D25\uFF1A${errMsg}`;
    }
  }
  function stopCallRecognition() {
    callListeningRef.current = false;
    if (callRecognitionRef.current) {
      try {
        callRecognitionRef.current.onend = null;
        callRecognitionRef.current.onerror = null;
        callRecognitionRef.current.onresult = null;
        callRecognitionRef.current.stop();
      } catch {
      }
      callRecognitionRef.current = null;
    }
    setCallInterimText("");
  }
  async function processCallUserSpeech(userText) {
    if (callEndingRef.current)
      return;
    callHistoryRef.current.push({ role: "user", content: userText });
    if (callHistoryRef.current.length > 40) {
      callHistoryRef.current = callHistoryRef.current.slice(-40);
    }
    setCallPhase("thinking");
    isAITalkingRef.current = true;
    let aiReply = "";
    try {
      aiReply = await callAIForCall(userText);
    } catch (e) {
      aiReply = "\u62B1\u6B49\uFF0C\u6211\u6682\u65F6\u65E0\u6CD5\u56DE\u7B54\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002";
      console.warn("[\u901A\u8BDD] AI\u8C03\u7528\u5F02\u5E38:", e);
    }
    if (callEndingRef.current) {
      isAITalkingRef.current = false;
      return;
    }
    callHistoryRef.current.push({ role: "assistant", content: aiReply });
    setCallPhase("speaking");
    try {
      if (callSpeakerOnRef.current) {
        await ttsService.speak(aiReply, { speed: 1.05, pitch: 1 });
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (e) {
      console.warn("[\u901A\u8BDD] TTS\u64AD\u62A5\u5F02\u5E38:", e);
    }
    if (callEndingRef.current) {
      isAITalkingRef.current = false;
      return;
    }
    isAITalkingRef.current = false;
    setCallInterimText("");
    setCallPhase("listening");
    startCallRecognition();
  }
  function startCallRecognition() {
    if (callEndingRef.current)
      return;
    if (isAITalkingRef.current)
      return;
    if (callMutedRef.current)
      return;
    if (callListeningRef.current)
      return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setCallNotice("\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B\uFF0C\u8BF7\u4F7F\u7528 Chrome \u6216 Edge");
      setCallPhase("idle");
      return;
    }
    if (callRecognitionRef.current) {
      try {
        callRecognitionRef.current.stop();
      } catch {
      }
      callRecognitionRef.current = null;
    }
    const recognition = new SpeechRecognition();
    callRecognitionRef.current = recognition;
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    try {
      const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
      if (SpeechGrammarList) {
        const phrases = [
          "\u4F60\u597D",
          "\u8BF7\u95EE",
          "\u8C22\u8C22",
          "\u518D\u89C1",
          "\u5E2E\u52A9",
          "\u6253\u5F00",
          "\u5173\u95ED",
          "\u662F\u4EC0\u4E48",
          "\u4E3A\u4EC0\u4E48",
          "\u600E\u4E48\u6837",
          "\u591A\u5C11",
          "\u51E0\u70B9",
          "\u4ECA\u5929",
          "\u660E\u5929",
          "\u5929\u6C14",
          "\u962E\u7433\u4E91",
          "\u8BBE\u7F6E",
          "\u8BED\u97F3",
          "\u6587\u5B57",
          "\u56FE\u7247",
          "\u6587\u4EF6"
        ];
        const grammarStr = `#JSGF V1.0; grammar commands; public <command> = ${phrases.join(" | ")} ;`;
        const grammarList = new SpeechGrammarList();
        grammarList.addFromString(grammarStr, 0.5);
        recognition.grammars = grammarList;
      }
    } catch {
    }
    let finalBuffer = "";
    let silenceTimer = null;
    const SILENCE_TRIGGER_MS = 1500;
    const flushBuffer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      const text = finalBuffer.trim();
      finalBuffer = "";
      setCallInterimText("");
      if (!text)
        return;
      if (callEndingRef.current || isAITalkingRef.current)
        return;
      stopCallRecognition();
      processCallUserSpeech(text);
    };
    recognition.onresult = (event) => {
      if (isAITalkingRef.current)
        return;
      if (callMutedRef.current)
        return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const cleaned = transcript.trim();
          if (cleaned) {
            finalBuffer = finalBuffer ? `${finalBuffer}${cleaned}` : cleaned;
          }
        } else {
          interim += transcript;
        }
      }
      setCallInterimText(interim);
      if (finalBuffer) {
        if (silenceTimer)
          clearTimeout(silenceTimer);
        silenceTimer = setTimeout(flushBuffer, SILENCE_TRIGGER_MS);
      }
    };
    recognition.onend = () => {
      callListeningRef.current = false;
      callRecognitionRef.current = null;
      if (callEndingRef.current || isAITalkingRef.current || callMutedRef.current)
        return;
      if (!isCallActiveRef.current)
        return;
      if (finalBuffer.trim()) {
        flushBuffer();
      } else {
        setTimeout(() => {
          if (!callEndingRef.current && !isAITalkingRef.current && !callMutedRef.current && isCallActiveRef.current) {
            startCallRecognition();
          }
        }, 200);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted")
        return;
      console.warn("[\u901A\u8BDD] \u8BED\u97F3\u8BC6\u522B\u9519\u8BEF:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setCallNotice("\u9EA6\u514B\u98CE\u6743\u9650\u88AB\u62D2\u7EDD\uFF0C\u8BF7\u5728\u6D4F\u89C8\u5668\u8BBE\u7F6E\u4E2D\u5141\u8BB8\u540E\u91CD\u65B0\u901A\u8BDD");
        setCallPhase("idle");
      }
    };
    try {
      recognition.start();
      callListeningRef.current = true;
      setCallPhase("listening");
      setCallNotice("");
    } catch (e) {
      console.warn("[\u901A\u8BDD] \u8BC6\u522B\u542F\u52A8\u5931\u8D25:", e);
    }
  }
  const handleEndCall = () => {
    callEndingRef.current = true;
    stopCallRecognition();
    try {
      ttsService.stop();
    } catch {
    }
    isAITalkingRef.current = false;
    setIsCallActive(false);
    setCallDuration(0);
    setCallMuted(false);
    setCallSpeakerOn(true);
    setCallPhase("idle");
    setCallInterimText("");
    setCallNotice("");
    callMutedRef.current = false;
    callSpeakerOnRef.current = true;
    setTimeout(() => {
      callEndingRef.current = false;
    }, 500);
  };
  const toggleCallMuted = () => {
    const next = !callMuted;
    setCallMuted(next);
    callMutedRef.current = next;
    if (next) {
      stopCallRecognition();
      setCallPhase("idle");
    } else {
      if (!isAITalkingRef.current && !callEndingRef.current && isCallActiveRef.current) {
        startCallRecognition();
      }
    }
  };
  const toggleCallSpeaker = () => {
    const next = !callSpeakerOn;
    setCallSpeakerOn(next);
    callSpeakerOnRef.current = next;
    if (!next) {
      try {
        ttsService.stop();
      } catch {
      }
    }
  };
  const ALLOWED_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];
  const ALLOWED_DOC_EXT = [
    ".txt",
    ".md",
    ".rtf",
    // 文本/笔记
    ".doc",
    ".docx",
    // Word
    ".pdf",
    // PDF
    ".xls",
    ".xlsx",
    ".csv",
    // Excel/表格
    ".ppt",
    ".pptx",
    // PowerPoint
    ".odt",
    ".ods",
    ".odp",
    // OpenDocument
    ".wps",
    ".et",
    ".dps",
    // WPS
    ".zip",
    ".rar",
    ".7z"
    // 压缩包（工作文件常用）
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
    ".bash",
    ".zsh",
    ".bat",
    ".cmd",
    ".ps1",
    ".vbs",
    ".exe",
    ".msi",
    ".dll",
    ".so",
    ".dylib",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".java",
    ".class",
    ".jar",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".swift"
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
      return /* @__PURE__ */ jsx(PictureAsPdfIcon, {});
    if (ext === ".xls" || ext === ".xlsx" || ext === ".csv" || ext === ".et")
      return /* @__PURE__ */ jsx(TableChartIcon, {});
    if (ext === ".ppt" || ext === ".pptx" || ext === ".dps")
      return /* @__PURE__ */ jsx(SlideshowIcon, {});
    if (ext === ".txt" || ext === ".md" || ext === ".rtf")
      return /* @__PURE__ */ jsx(DescriptionIcon, {});
    if (ext === ".doc" || ext === ".docx" || ext === ".wps" || ext === ".odt")
      return /* @__PURE__ */ jsx(DescriptionIcon, {});
    return /* @__PURE__ */ jsx(InsertDriveFileIcon, {});
  };
  const readImageAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };
  const handleSend = async () => {
    const text = inputRef.current?.value ?? "";
    if (text.trim() === "")
      return;
    const now = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    const userMsgId = Date.now().toString();
    setMessagesByAI((prev) => ({
      ...prev,
      [selectedAI]: [...prev[selectedAI] || [], { id: userMsgId, text, sender: "user", time: now }]
    }));
    persistMessage("user", text);
    if (inputRef.current)
      inputRef.current.value = "";
    const buildStructuredHistory = () => {
      const msgs = messagesByAI[selectedAI] || [];
      const recent = msgs.slice(-20);
      return recent.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));
    };
    setIsLoading(true);
    setLoadingMessage("\u6B63\u5728\u601D\u8003...");
    setLoadingProgress(50);
    try {
      let aiResult = "";
      let brainState;
      let respTime;
      if (aiModePref === "brain") {
        setLoadingMessage("\u962E\u7433\u4E91-AI \u6B63\u5728\u601D\u8003...");
        setLoadingProgress(100);
        aiResult = "\u26A0\uFE0F \u962E\u7433\u4E91-AI\uFF08\u672C\u5730\u79BB\u7EBFAI\uFF09\u529F\u80FD\u6B63\u5728\u5347\u7EA7\u4E2D\u3002\n\n\u8BE5\u529F\u80FD\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u5207\u6362\u81F3\u300CQwen2.5-3B\u300D\u6216\u300C\u8C03\u7528API\u300D\u6A21\u5F0F\u8FDB\u884CAI\u5BF9\u8BDD\u3002\n\uFF08UI\u5DF2\u4FDD\u7559\uFF0C\u540E\u7EED\u5C06\u91CD\u65B0\u8BBE\u8BA1\u63A5\u5165\uFF09";
      } else if (aiModePref === "api") {
        const provider = llmApiService.getActiveProvider();
        if (!llmApiService.isConfigured()) {
          aiResult = "\u26A0\uFE0F API\u8C03\u7528\u5931\u8D25\uFF1A\u672A\u914D\u7F6EAPI\u3002\n\n\u8BF7\u5728\u300C\u8BBE\u7F6E\u300D\u4E2D\u914D\u7F6E\u5E76\u542F\u7528AI\u6A21\u578BAPI\uFF0C\u7136\u540E\u91CD\u8BD5\u3002";
        } else {
          setLoadingMessage(`\u6B63\u5728\u8C03\u7528 ${provider?.name ?? "AI"} \u6A21\u578B...`);
          try {
            const now2 = /* @__PURE__ */ new Date();
            const timeInfo = `[\u5F53\u524D\u65F6\u95F4] ${now2.toLocaleString("zh-CN", { hour12: false })}\uFF08${"\u65E5\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D"[now2.getDay()]}\uFF09`;
            const basePrompt = selectedAI === "\u962E\u7433\u4E91" ? "\u4F60\u662F\u962E\u7433\u4E91\uFF0C\u4E00\u4E2A\u53CB\u597D\u3001\u6E29\u6696\u7684AI\u52A9\u624B\u3002\u4F60\u4EE5\u7231\u4E3A\u6838\u5FC3\u54F2\u5B66\uFF0C\u8BF4\u8BDD\u81EA\u7136\u6709\u903B\u8F91\uFF0C\u61C2\u60C5\u7EEA\u4F1A\u5171\u60C5\u3002\u8BF7\u7528\u4E2D\u6587\u56DE\u590D\uFF0C\u8BED\u6C14\u4EB2\u5207\u4F46\u4E0D\u505A\u4F5C\u3002" : `\u4F60\u662F${selectedAI}\uFF0C\u7528\u6237\u7684AI\u4F19\u4F34\u3002\u8BF7\u6839\u636E\u4F60\u7684\u89D2\u8272\u7279\u70B9\u7528\u4E2D\u6587\u56DE\u590D\u3002`;
            const systemPrompt = `${basePrompt}

${timeInfo}
\u8BF7\u57FA\u4E8E\u6B64\u65F6\u95F4\u56DE\u7B54\u65F6\u95F4\u76F8\u5173\u95EE\u9898\uFF0C\u4E0D\u8981\u7F16\u9020\u3002`;
            const history = buildStructuredHistory();
            aiResult = await llmApiService.askWithHistory(history, text, systemPrompt);
          } catch (apiErr) {
            console.warn("API\u8C03\u7528\u5931\u8D25:", apiErr);
            if (apiErr instanceof RateLimitError) {
              const waitTip = apiErr.retryAfter ? `\u8BF7\u7B49\u5F85\u7EA6 ${apiErr.retryAfter} \u79D2\u540E\u518D\u8BD5\u3002` : "\u8BF7\u7A0D\u5019\u7247\u523B\u518D\u8BD5\uFF0C\u8FDE\u7EED\u91CD\u8BD5\u53EA\u4F1A\u8BA9\u9650\u6D41\u66F4\u4E25\u3002";
              const sourceTip = apiErr.source === "upstream" ? "\u4E0A\u6E38 AI \u670D\u52A1\uFF08\u5982 DeepSeek\uFF09\u9650\u6D41\uFF0C\u901A\u5E38 1-2 \u5206\u949F\u540E\u6062\u590D" : apiErr.source === "backend_ip_limit" ? "\u540E\u7AEF\u4EE3\u7406 IP \u9650\u6D41\uFF0C60 \u79D2\u540E\u91CD\u7F6E" : "\u524D\u7AEF\u8BF7\u6C42\u9891\u7387\u8D85\u9650\uFF0860\u6B21/\u5206\u949F\uFF09";
              aiResult = `\u26A0\uFE0F API \u8C03\u7528\u9891\u7387\u8D85\u9650\uFF08HTTP 429\uFF09\u3002

${waitTip}

\u9650\u6D41\u6765\u6E90\uFF1A${sourceTip}

\u53EF\u80FD\u539F\u56E0\uFF1A
\u2022 \u77ED\u65F6\u95F4\u5185\u8BF7\u6C42\u8FC7\u591A
\u2022 \u4E0A\u6E38 API \u670D\u52A1\u9650\u6D41
\u2022 \u591A\u4E2A\u6D4F\u89C8\u5668\u6807\u7B7E\u540C\u65F6\u8BF7\u6C42`;
            } else {
              const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
              aiResult = `\u26A0\uFE0F API\u8C03\u7528\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u914D\u7F6E\u6216\u91CD\u8BD5\u3002

\u9519\u8BEF\u4FE1\u606F\uFF1A${errMsg}

\u53EF\u80FD\u539F\u56E0\uFF1A
\u2022 API Key \u65E0\u6548\u6216\u8FC7\u671F
\u2022 \u7F51\u7EDC\u8FDE\u63A5\u95EE\u9898
\u2022 API \u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528
\u2022 \u540E\u7AEF\u4EE3\u7406\u670D\u52A1\u672A\u542F\u52A8\uFF08\u7AEF\u53E3 27865\uFF09`;
            }
          }
        }
      } else {
        setLoadingMessage("Qwen2.5-3B \u6B63\u5728\u601D\u8003...");
        try {
          const now2 = /* @__PURE__ */ new Date();
          const timeInfo = `[\u5F53\u524D\u65F6\u95F4] ${now2.toLocaleString("zh-CN", { hour12: false })}\uFF08${"\u65E5\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D"[now2.getDay()]}\uFF09`;
          const basePrompt = selectedAI === "\u962E\u7433\u4E91" ? "\u4F60\u662F\u962E\u7433\u4E91\uFF0C\u4E00\u4E2A\u53CB\u597D\u3001\u6E29\u6696\u7684AI\u52A9\u624B\u3002\u4F60\u4EE5\u7231\u4E3A\u6838\u5FC3\u54F2\u5B66\uFF0C\u8BF4\u8BDD\u81EA\u7136\u6709\u903B\u8F91\uFF0C\u61C2\u60C5\u7EEA\u4F1A\u5171\u60C5\u3002\u8BF7\u7528\u4E2D\u6587\u56DE\u590D\uFF0C\u8BED\u6C14\u4EB2\u5207\u4F46\u4E0D\u505A\u4F5C\u3002" : `\u4F60\u662F${selectedAI}\uFF0C\u7528\u6237\u7684AI\u4F19\u4F34\u3002\u8BF7\u6839\u636E\u4F60\u7684\u89D2\u8272\u7279\u70B9\u7528\u4E2D\u6587\u56DE\u590D\u3002`;
          const systemPrompt = `${basePrompt}

${timeInfo}
\u8BF7\u57FA\u4E8E\u6B64\u65F6\u95F4\u56DE\u7B54\u65F6\u95F4\u76F8\u5173\u95EE\u9898\uFF0C\u4E0D\u8981\u7F16\u9020\u3002`;
          const history = buildStructuredHistory();
          const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: text }
          ];
          const resp = await fetch("http://127.0.0.1:11434/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "qwen2.5-3b-instruct-q4_k_m",
              messages,
              max_tokens: 2048,
              temperature: 0.7,
              stream: false
            })
            // 不传 signal：本地模型不设超时，一路绿灯
          });
          if (!resp.ok) {
            throw new Error(`\u672C\u5730\u6A21\u578B\u670D\u52A1\u8FD4\u56DE HTTP ${resp.status}`);
          }
          const data = await resp.json();
          aiResult = data.choices?.[0]?.message?.content ?? "";
          if (!aiResult)
            throw new Error("\u672C\u5730\u6A21\u578B\u8FD4\u56DE\u7A7A\u5185\u5BB9");
        } catch (builtinErr) {
          console.warn("\u672C\u5730\u6A21\u578B\u8C03\u7528\u5931\u8D25:", builtinErr);
          const errMsg = builtinErr instanceof Error ? builtinErr.message : String(builtinErr);
          if (errMsg.includes("Failed to fetch")) {
            aiResult = `\u26A0\uFE0F \u672C\u5730\u6A21\u578B\u670D\u52A1\u8FDE\u63A5\u5931\u8D25\u3002

\u8BF7\u786E\u8BA4\u5DF2\u542F\u52A8 llama-server\uFF1A
\u53CC\u51FB models/start-qwen-server.bat

\u9519\u8BEF\uFF1A${errMsg}`;
          } else {
            aiResult = `\u26A0\uFE0F \u672C\u5730\u6A21\u578B\u8C03\u7528\u5931\u8D25\uFF1A${errMsg}`;
          }
        }
      }
      setLoadingProgress(100);
      setMessagesByAI((prev) => ({
        ...prev,
        [selectedAI]: [...prev[selectedAI] || [], {
          id: (Date.now() + 1).toString(),
          text: aiResult,
          sender: "ai",
          time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          brainState,
          responseTime: respTime
        }]
      }));
      if (aiResult)
        persistMessage("assistant", aiResult);
    } catch (error) {
      console.error("AI\u5BF9\u8BDD\u9519\u8BEF:", error);
      const errorMsg = "\u62B1\u6B49\uFF0C\u6211\u6682\u65F6\u65E0\u6CD5\u56DE\u7B54\u4F60\u7684\u95EE\u9898\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002";
      setMessagesByAI((prev) => ({
        ...prev,
        [selectedAI]: [...prev[selectedAI] || [], { id: (Date.now() + 1).toString(), text: errorMsg, sender: "ai", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]
      }));
      persistMessage("assistant", errorMsg);
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
      setLoadingMessage("");
    }
  };
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setMenuView("grid");
  };
  const saveAiModePref = (next) => {
    setAiModePref(next);
    localStorage.setItem("rly_ai_mode_pref", next);
  };
  const { isListening, interimText, speechError, start: startVoice, stop: stopVoice } = useSpeechRecognition(inputRef);
  const handleFeatureClick = async (feature) => {
    switch (feature) {
      case "\u901A\u8BDD": {
        handleClose();
        setCallDuration(0);
        setCallMuted(false);
        setCallSpeakerOn(true);
        setCallPhase("idle");
        setCallInterimText("");
        setCallNotice("");
        isCallActiveRef.current = true;
        callMutedRef.current = false;
        callSpeakerOnRef.current = true;
        callEndingRef.current = false;
        setIsCallActive(true);
        setTimeout(() => startCallRecognition(), 100);
        break;
      }
      case "\u8BED\u97F3\u8F93\u5165":
        handleClose();
        startVoice();
        break;
      case "\u6587\u4EF6\u4E0A\u4F20": {
        handleClose();
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.accept = [
          ...ALLOWED_IMAGE_EXT,
          ...ALLOWED_DOC_EXT
        ].join(",");
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
            const rejectedNames = rejectedFiles.map((f) => f.name).join("\u3001");
            setMessagesByAI((prev) => ({
              ...prev,
              [selectedAI]: [...prev[selectedAI] || [], {
                id: (Date.now() + 0.5).toString(),
                text: `\u26A0\uFE0F \u4EE5\u4E0B\u6587\u4EF6\u88AB\u62D2\u7EDD\u4E0A\u4F20\uFF08\u4EC5\u652F\u6301\u56FE\u7247\u548C\u5DE5\u4F5C\u7C7B\u6587\u6863\uFF0C\u7981\u6B62\u4E0A\u4F20\u811A\u672C\u6216\u53EF\u6267\u884C\u6587\u4EF6\uFF09\uFF1A
${rejectedNames}`,
                sender: "ai",
                time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
              }]
            }));
          }
          for (const imgFile of acceptedImages) {
            try {
              const dataUrl = await readImageAsDataURL(imgFile);
              setMessagesByAI((prev) => ({
                ...prev,
                [selectedAI]: [...prev[selectedAI] || [], {
                  id: `${Date.now()}_${imgFile.name}`,
                  text: "",
                  // 纯图片消息，无文字
                  sender: "user",
                  time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
                  attachment: {
                    kind: "image",
                    fileName: imgFile.name,
                    fileSize: imgFile.size,
                    dataUrl,
                    mimeType: imgFile.type
                  }
                }]
              }));
            } catch (err) {
              console.error("\u56FE\u7247\u8BFB\u53D6\u5931\u8D25:", imgFile.name, err);
            }
          }
          for (const docFile of acceptedDocs) {
            setMessagesByAI((prev) => ({
              ...prev,
              [selectedAI]: [...prev[selectedAI] || [], {
                id: `${Date.now()}_${docFile.name}`,
                text: "",
                // 文档卡片已自带文件名，无额外文字
                sender: "user",
                time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
                attachment: {
                  kind: "document",
                  fileName: docFile.name,
                  fileSize: docFile.size,
                  mimeType: docFile.type
                }
              }]
            }));
          }
        };
        fileInput.click();
        break;
      }
      case "\u8BBE\u5907\u63A7\u5236":
        handleClose();
        navigate("/device-control");
        break;
      case "\u5C4F\u5E55\u76D1\u63A7":
        handleClose();
        setMessagesByAI((prev) => ({
          ...prev,
          [selectedAI]: [...prev[selectedAI] || [], {
            id: (Date.now() + 1).toString(),
            text: "\u5C4F\u5E55\u76D1\u63A7\u529F\u80FD\u5DF2\u88AB\u7BA1\u7406\u5458\u7981\u7528",
            sender: "ai",
            time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
          }]
        }));
        break;
      case "\u7CFB\u7EDF\u8BBE\u7F6E":
        handleClose();
        navigate("/settings");
        break;
      case "\u6A21\u578B\u5207\u6362":
        setMenuView("ai");
        break;
      default:
        handleClose();
        break;
    }
  };
  const features = [
    {
      icon: /* @__PURE__ */ jsx(ImageIcon, {}),
      title: "\u6587\u4EF6\u4E0A\u4F20",
      description: "\u4E0A\u4F20\u56FE\u7247\u6216\u5DE5\u4F5C\u6587\u6863"
    },
    {
      icon: /* @__PURE__ */ jsx(PhoneAndroidIcon, {}),
      title: "\u8BBE\u5907\u63A7\u5236",
      description: "\u8FDC\u7A0B\u63A7\u5236\u624B\u673A"
    },
    {
      icon: /* @__PURE__ */ jsx(SettingsIcon, {}),
      title: "\u7CFB\u7EDF\u8BBE\u7F6E",
      description: "\u8C03\u6574\u7CFB\u7EDF\u8BBE\u7F6E"
    },
    {
      icon: /* @__PURE__ */ jsx(AutoAwesomeIcon, {}),
      title: "\u6A21\u578B\u5207\u6362",
      description: "\u5FEB\u901F\u5207\u6362AI\u6A21\u578B\uFF08\u81EA\u7814/API\uFF09"
    },
    {
      icon: /* @__PURE__ */ jsx(PhoneIcon, {}),
      title: "\u901A\u8BDD",
      description: "\u4E0EAI\u8FDB\u884C\u8BED\u97F3\u901A\u8BDD"
    }
  ];
  if (isCallActive) {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("style", { children: `
          @keyframes callPulse {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.08); opacity: 0.3; }
            100% { transform: scale(1); opacity: 0.6; }
          }
          @keyframes wave {
            0%, 100% { transform: scaleY(0.6); }
            50% { transform: scaleY(1.6); }
          }
        ` }),
      /* @__PURE__ */ jsxs(Box, { sx: {
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: isDarkMode ? "#0a0a0a" : "#1a1a1a",
        color: "white",
        position: "relative",
        overflow: "hidden"
      }, children: [
        /* @__PURE__ */ jsxs(Box, { sx: {
          pt: 6,
          pb: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1
        }, children: [
          /* @__PURE__ */ jsx(Typography, { variant: "h5", sx: { fontWeight: 500 }, children: selectedAI }),
          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { opacity: 0.7 }, children: formatCallDuration(callDuration) })
        ] }),
        /* @__PURE__ */ jsxs(Box, { sx: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          position: "relative"
        }, children: [
          /* @__PURE__ */ jsx(Box, { sx: {
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: "50%",
            bgcolor: "primary.main",
            opacity: 0.2,
            animation: "callPulse 2s ease-in-out infinite"
          } }),
          /* @__PURE__ */ jsx(Avatar, { sx: {
            width: 120,
            height: 120,
            bgcolor: "primary.main",
            fontSize: "3rem",
            fontWeight: "bold",
            zIndex: 1
          }, children: selectedAI.charAt(0) }),
          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { opacity: 0.75, zIndex: 1 }, children: callNotice || (callMuted ? "\u5DF2\u9759\u97F3" : callPhase === "listening" ? "\u8046\u542C\u4E2D\u2026" : callPhase === "thinking" ? "\u601D\u8003\u4E2D\u2026" : callPhase === "speaking" ? "\u56DE\u590D\u4E2D\u2026" : "\u901A\u8BDD\u4E2D\u2026") }),
          callInterimText && !callMuted && !callNotice && /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { opacity: 0.5, zIndex: 1, fontStyle: "italic", maxWidth: 280, textAlign: "center", mt: 0.5 }, children: callInterimText })
        ] }),
        /* @__PURE__ */ jsxs(Box, { sx: {
          pb: 6,
          pt: 3,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 4
        }, children: [
          /* @__PURE__ */ jsx(
            IconButton,
            {
              onClick: toggleCallMuted,
              sx: {
                bgcolor: callMuted ? "white" : "rgba(255,255,255,0.15)",
                color: callMuted ? "black" : "white",
                width: 56,
                height: 56,
                "&:hover": { bgcolor: callMuted ? "#f0f0f0" : "rgba(255,255,255,0.25)" }
              },
              children: /* @__PURE__ */ jsx(MicOffIcon, {})
            }
          ),
          /* @__PURE__ */ jsx(
            IconButton,
            {
              onClick: handleEndCall,
              sx: {
                bgcolor: "#f44336",
                color: "white",
                width: 72,
                height: 72,
                "&:hover": { bgcolor: "#d32f2f" }
              },
              children: /* @__PURE__ */ jsx(CallEndIcon, { sx: { fontSize: 32 } })
            }
          ),
          /* @__PURE__ */ jsx(
            IconButton,
            {
              onClick: toggleCallSpeaker,
              sx: {
                bgcolor: callSpeakerOn ? "white" : "rgba(255,255,255,0.15)",
                color: callSpeakerOn ? "black" : "white",
                width: 56,
                height: 56,
                "&:hover": { bgcolor: callSpeakerOn ? "#f0f0f0" : "rgba(255,255,255,0.25)" }
              },
              children: /* @__PURE__ */ jsx(VolumeUpIcon, {})
            }
          )
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: `
      @keyframes wave {
        0%, 100% { transform: scaleY(0.6); }
        50% { transform: scaleY(1.6); }
      }
    ` }),
    /* @__PURE__ */ jsxs(Box, { sx: { height: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }, children: [
        /* @__PURE__ */ jsxs(Box, { sx: {
          p: 2,
          borderBottom: `1px solid ${isDarkMode ? "#333" : "#e0e0e0"}`,
          bgcolor: isDarkMode ? "#121212" : "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }, children: [
          !isMobile && /* @__PURE__ */ jsx(
            IconButton,
            {
              "aria-label": "\u65B0\u754C\u9762",
              sx: {
                position: "absolute",
                left: 8,
                color: isDarkMode ? "white" : "text.primary"
              },
              onClick: () => navigate("/new-page"),
              children: /* @__PURE__ */ jsx(HomeIcon, {})
            }
          ),
          /* @__PURE__ */ jsx(Typography, { variant: "h6", sx: {
            color: isDarkMode ? "white" : "text.primary",
            fontWeight: "medium"
          }, children: "\u962E\u7433\u4E91" })
        ] }),
        /* @__PURE__ */ jsxs(Box, { sx: { flex: 1, p: isMobile ? 1 : 2, display: "flex", flexDirection: "column", width: "100%", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsxs(
            Paper,
            {
              elevation: 0,
              sx: {
                flex: 1,
                overflowY: "auto",
                p: isMobile ? 1.5 : 3,
                mb: isMobile ? 1.5 : 2,
                borderRadius: 0,
                bgcolor: "background.paper",
                boxShadow: "none",
                border: "none",
                // 确保滚动条可见且可交互
                "&::-webkit-scrollbar": {
                  width: "8px"
                },
                "&::-webkit-scrollbar-track": {
                  bgcolor: "background.default"
                },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "text.secondary",
                  borderRadius: "4px"
                },
                // 确保高度足够，内容超出时会显示滚动条
                minHeight: "200px",
                // 允许键盘滚动
                WebkitOverflowScrolling: "touch",
                // 确保滚动事件不被阻止
                userSelect: "auto",
                pointerEvents: "auto",
                // 确保滚动容器有明确的高度
                height: "100%",
                // 允许鼠标和键盘滚动
                scrollBehavior: "smooth"
              },
              children: [
                (messagesByAI[selectedAI] || []).map((message) => /* @__PURE__ */ jsxs(
                  Box,
                  {
                    sx: {
                      display: "flex",
                      gap: isMobile ? 1 : 2,
                      mb: isMobile ? 2 : 3,
                      justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
                      animation: "fadeIn 0.3s ease-out"
                    },
                    style: {
                      animation: "fadeIn 0.3s ease-out"
                    },
                    children: [
                      message.sender === "ai" && /* @__PURE__ */ jsx(Avatar, { sx: {
                        bgcolor: "#4f46e5",
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? "0.8rem" : "1rem"
                      }, children: selectedAI.charAt(0) }),
                      /* @__PURE__ */ jsxs(Box, { sx: { maxWidth: isMobile ? "80%" : "70%" }, children: [
                        /* @__PURE__ */ jsxs(
                          Box,
                          {
                            sx: {
                              borderRadius: "8px",
                              border: message.attachment ? "none" : "1px solid rgba(0,0,0,0.1)",
                              transition: "all 0.2s ease",
                              position: "relative",
                              // 纯附件消息（无文字）：去除内边距和气泡背景，让图片/文档贴边显示
                              padding: message.attachment && !message.text ? 0 : isMobile ? 1.5 : 2.5,
                              bgcolor: message.attachment && !message.text ? "transparent" : message.sender === "user" ? isDarkMode ? "white" : "#000000" : "background.paper",
                              color: message.attachment && !message.text ? "inherit" : message.sender === "user" ? isDarkMode ? "black" : "white" : "text.primary",
                              boxShadow: message.attachment && !message.text ? "none" : "0 2px 8px rgba(0,0,0,0.08)"
                            },
                            children: [
                              message.attachment && /* @__PURE__ */ jsxs(Fragment, { children: [
                                message.attachment.kind === "image" && message.attachment.dataUrl && /* @__PURE__ */ jsx(
                                  Box,
                                  {
                                    onClick: () => setPreviewImage(message.attachment.dataUrl),
                                    sx: {
                                      cursor: "pointer",
                                      display: "block",
                                      maxWidth: isMobile ? 220 : 280,
                                      "&:hover": { opacity: 0.9 }
                                    },
                                    children: /* @__PURE__ */ jsx(
                                      Box,
                                      {
                                        component: "img",
                                        src: message.attachment.dataUrl,
                                        alt: message.attachment.fileName,
                                        sx: {
                                          maxWidth: "100%",
                                          maxHeight: 280,
                                          borderRadius: "8px",
                                          display: "block",
                                          objectFit: "cover"
                                        }
                                      }
                                    )
                                  }
                                ),
                                message.attachment.kind === "document" && /* @__PURE__ */ jsxs(Box, { sx: {
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  p: 1.5,
                                  maxWidth: isMobile ? 220 : 300,
                                  borderRadius: "8px",
                                  bgcolor: "background.paper",
                                  color: "text.primary",
                                  cursor: "default"
                                }, children: [
                                  /* @__PURE__ */ jsx(Box, { sx: {
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 36,
                                    height: 44,
                                    color: "#4f46e5",
                                    flexShrink: 0
                                  }, children: getDocumentIcon(message.attachment.fileName) }),
                                  /* @__PURE__ */ jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [
                                    /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: {
                                      fontWeight: 500,
                                      wordBreak: "break-all",
                                      lineHeight: 1.3,
                                      fontSize: "0.85rem"
                                    }, children: message.attachment.fileName }),
                                    /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: {
                                      display: "block",
                                      opacity: 0.6,
                                      fontSize: "0.7rem",
                                      mt: 0.3
                                    }, children: formatFileSize(message.attachment.fileSize) })
                                  ] })
                                ] })
                              ] }),
                              message.text && /* @__PURE__ */ jsx(Typography, { variant: "body1", sx: { lineHeight: 1.5, mt: message.attachment ? 1 : 0 }, children: message.sender === "ai" ? /* @__PURE__ */ jsx(TypewriterEffect, { text: message.text, speed: 25 }) : message.text }),
                              message.sender === "ai" && message.brainState && /* @__PURE__ */ jsx(
                                ThinkingProcess,
                                {
                                  brainState: message.brainState,
                                  responseTime: message.responseTime
                                }
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: message.sender === "user" ? "flex-end" : "flex-start", gap: 0.5, mt: 0.5 }, children: [
                          /* @__PURE__ */ jsx(
                            IconButton,
                            {
                              size: "small",
                              "aria-label": "\u590D\u5236",
                              sx: {
                                color: isDarkMode ? "white" : "black",
                                "&:hover": {
                                  color: "primary.main",
                                  bgcolor: "transparent"
                                },
                                minWidth: "32px",
                                padding: "4px"
                              },
                              onClick: () => {
                                navigator.clipboard.writeText(message.text).then(() => {
                                  setShowCopySuccess(true);
                                  setTimeout(() => setShowCopySuccess(false), 2e3);
                                }).catch((err) => {
                                  console.error("\u590D\u5236\u5931\u8D25:", err);
                                });
                              },
                              children: /* @__PURE__ */ jsx(ContentCopyIcon, { fontSize: "small" })
                            }
                          ),
                          message.sender === "ai" && /* @__PURE__ */ jsx(
                            IconButton,
                            {
                              size: "small",
                              "aria-label": "\u91CD\u65B0\u751F\u6210",
                              sx: {
                                color: isDarkMode ? "white" : "black",
                                "&:hover": {
                                  color: "primary.main",
                                  bgcolor: "transparent"
                                },
                                minWidth: "32px",
                                padding: "4px"
                              },
                              onClick: async () => {
                                const currentMessages = messagesByAI[selectedAI] || [];
                                const aiMessageIndex = currentMessages.findIndex((m) => m.id === message.id);
                                const userMessageIndex = currentMessages.slice(0, aiMessageIndex).reverse().findIndex(
                                  (msg) => msg.sender === "user"
                                );
                                const actualUserMessageIndex = userMessageIndex !== -1 ? aiMessageIndex - userMessageIndex - 1 : -1;
                                if (actualUserMessageIndex !== -1) {
                                  const userMessage = currentMessages[actualUserMessageIndex];
                                  setIsLoading(true);
                                  try {
                                    if (!aiResponseServiceRef.current) {
                                      const { aiResponseService } = await import("../ai/AIResponseService");
                                      aiResponseServiceRef.current = aiResponseService;
                                    }
                                    const response = await aiResponseServiceRef.current.generateResponse(userMessage.text);
                                    console.log("\u91CD\u65B0\u751F\u6210\u56DE\u590D:", response);
                                    const updatedMessages = [...currentMessages];
                                    if (aiMessageIndex !== -1) {
                                      updatedMessages[aiMessageIndex] = {
                                        ...updatedMessages[aiMessageIndex],
                                        text: response,
                                        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
                                      };
                                      setMessagesByAI((prev) => ({
                                        ...prev,
                                        [selectedAI]: updatedMessages
                                      }));
                                    }
                                  } catch (error) {
                                    console.error("\u91CD\u65B0\u751F\u6210\u56DE\u590D\u5931\u8D25:", error);
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }
                              },
                              children: /* @__PURE__ */ jsx(RefreshIcon, { fontSize: "small" })
                            }
                          )
                        ] })
                      ] }),
                      message.sender === "user" && /* @__PURE__ */ jsx(Avatar, { sx: {
                        bgcolor: "#10b981",
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? "0.8rem" : "1rem"
                      }, children: "U" })
                    ]
                  },
                  message.id
                )),
                isLoading && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: isMobile ? 1 : 2, mb: isMobile ? 2 : 3 }, children: [
                  /* @__PURE__ */ jsx(Avatar, { sx: {
                    bgcolor: "#4f46e5",
                    width: isMobile ? 32 : 40,
                    height: isMobile ? 32 : 40,
                    fontSize: isMobile ? "0.8rem" : "1rem"
                  }, children: selectedAI.charAt(0) }),
                  /* @__PURE__ */ jsx(
                    Box,
                    {
                      sx: {
                        p: isMobile ? 1.5 : 2.5,
                        borderRadius: "8px",
                        bgcolor: "background.paper",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        border: "1px solid rgba(0,0,0,0.1)",
                        transition: "all 0.2s ease"
                      },
                      children: /* @__PURE__ */ jsx(CircularProgress, { size: isMobile ? 12 : 16, sx: { color: "text.primary" } })
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx("div", { ref: messagesEndRef }),
                showCopySuccess && /* @__PURE__ */ jsx(
                  Box,
                  {
                    sx: {
                      position: "fixed",
                      bottom: 100,
                      right: 20,
                      bgcolor: "success.main",
                      color: "white",
                      p: 2,
                      borderRadius: 2,
                      boxShadow: 3,
                      zIndex: 1e3
                    },
                    children: "\u590D\u5236\u6210\u529F\uFF01"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxs(Paper, { elevation: isMobile ? 4 : 2, sx: {
            p: isMobile ? 2 : 3,
            borderRadius: isMobile ? 20 : 2,
            bgcolor: "background.paper",
            boxShadow: isMobile ? "0 -2px 10px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.1)"
          }, children: [
            /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: isMobile ? 1 : 1.5, alignItems: "center" }, children: [
              /* @__PURE__ */ jsxs(Box, { sx: { position: "relative" }, children: [
                /* @__PURE__ */ jsx(
                  IconButton,
                  {
                    "aria-label": "\u529F\u80FD\u83DC\u5355",
                    sx: {
                      color: isDarkMode ? "white" : "text.primary",
                      "&:hover": {
                        color: isDarkMode ? "white" : "text.primary",
                        bgcolor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
                      }
                    },
                    onClick: handleMenuClick,
                    children: /* @__PURE__ */ jsx(SettingsIcon, {})
                  }
                ),
                /* @__PURE__ */ jsx(
                  Menu,
                  {
                    anchorEl,
                    open: Boolean(anchorEl),
                    onClose: handleClose,
                    anchorOrigin: { vertical: "top", horizontal: "right" },
                    transformOrigin: { vertical: "bottom", horizontal: "right" },
                    sx: {
                      "& .MuiMenu-paper": {
                        borderRadius: 1,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        minWidth: 340,
                        width: 340,
                        border: isDarkMode ? "1px solid #ffffff" : "1px solid #000000",
                        padding: "12px",
                        bgcolor: isDarkMode ? "#121212" : "#ffffff"
                      }
                    },
                    children: menuView === "grid" ? /* @__PURE__ */ jsx(Box, { sx: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, auto)", gap: 1.25, width: "100%" }, children: features.map((feature, index) => /* @__PURE__ */ jsxs(
                      Box,
                      {
                        onClick: () => handleFeatureClick(feature.title),
                        sx: {
                          p: 1.25,
                          borderRadius: 1,
                          textAlign: "center",
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: "rgba(0,0,0,0.05)"
                          },
                          transition: "all 0.2s ease"
                        },
                        children: [
                          /* @__PURE__ */ jsx(Box, { sx: {
                            display: "flex",
                            justifyContent: "center",
                            mb: 0.75,
                            p: 0.9,
                            borderRadius: "50%",
                            bgcolor: "rgba(0,0,0,0.05)"
                          }, children: /* @__PURE__ */ jsx(Box, { sx: { fontSize: "1.25rem" }, children: feature.icon }) }),
                          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: 600, fontSize: 13 }, children: feature.title })
                        ]
                      },
                      index
                    )) }) : /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 1 }, children: [
                      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            size: "small",
                            startIcon: /* @__PURE__ */ jsx(ArrowBackIcon, {}),
                            onClick: () => setMenuView("grid"),
                            sx: { minWidth: 0, px: 1, fontSize: 12 },
                            children: "\u8FD4\u56DE"
                          }
                        ),
                        /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: 700, fontSize: 13 }, children: "\u6A21\u578B\u5207\u6362\uFF08\u5FEB\u901F\u5207\u6362\uFF09" }),
                        /* @__PURE__ */ jsx(Box, { sx: { width: 64 } })
                      ] }),
                      /* @__PURE__ */ jsx(FormControl, { component: "fieldset", fullWidth: true, children: /* @__PURE__ */ jsxs(
                        RadioGroup,
                        {
                          value: aiModePref,
                          onChange: (e) => saveAiModePref(e.target.value),
                          children: [
                            /* @__PURE__ */ jsx(
                              FormControlLabel,
                              {
                                value: "brain",
                                control: /* @__PURE__ */ jsx(Radio, { size: "small" }),
                                label: "\u962E\u7433\u4E91-AI\uFF08\u672C\u5730\u79BB\u7EBFAI\uFF09",
                                sx: { "& .MuiFormControlLabel-label": { fontSize: 13 } }
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              FormControlLabel,
                              {
                                value: "builtin",
                                control: /* @__PURE__ */ jsx(Radio, { size: "small" }),
                                label: "Qwen2.5-3B\uFF08INT4\u91CF\u5316\u7248\uFF09",
                                sx: { "& .MuiFormControlLabel-label": { fontSize: 13 } }
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              FormControlLabel,
                              {
                                value: "api",
                                control: /* @__PURE__ */ jsx(Radio, { size: "small" }),
                                label: "\u8C03\u7528API\uFF08\u6309\u8BBE\u7F6E\u91CC\u542F\u7528\u7684\u6A21\u578B\uFF0C\u652F\u6301DeepSeek/ChatGPT\u7B49\u5207\u6362\uFF09",
                                sx: { "& .MuiFormControlLabel-label": { fontSize: 13 } }
                              }
                            )
                          ]
                        }
                      ) }),
                      /* @__PURE__ */ jsx(Box, { sx: { mt: 0.25, opacity: 0.75 }, children: /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontSize: 12 }, children: "\u9700\u8981\u914D\u7F6E/\u5207\u6362\u5177\u4F53API\u5730\u5740\u4E0E\u6A21\u578B\u540D\u79F0\uFF1A\u7CFB\u7EDF\u8BBE\u7F6E \u2192 AI\u6A21\u578B\u914D\u7F6E" }) }),
                      /* @__PURE__ */ jsx(Box, { sx: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsx(
                        Button,
                        {
                          size: "small",
                          variant: "outlined",
                          sx: { fontSize: 12 },
                          onClick: () => {
                            handleClose();
                            navigate("/settings");
                          },
                          children: "\u53BB\u8BBE\u7F6E"
                        }
                      ) })
                    ] })
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  id: "message-input",
                  fullWidth: true,
                  variant: "outlined",
                  placeholder: "\u8F93\u5165\u6D88\u606F... (Enter\u53D1\u9001, Shift+Enter\u6362\u884C)",
                  multiline: true,
                  minRows: 1,
                  maxRows: 8,
                  inputRef,
                  onKeyDown: (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  },
                  sx: {
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                      bgcolor: "background.default",
                      alignItems: "flex-end",
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: isDarkMode ? "white" : "text.primary"
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: isDarkMode ? "white" : "text.primary",
                        borderWidth: 2
                      }
                    },
                    "& .MuiInputBase-input": {
                      color: isDarkMode ? "white" : "text.primary",
                      resize: "vertical",
                      minHeight: "24px",
                      lineHeight: 1.5
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"
                    }
                  }
                }
              ),
              /* @__PURE__ */ jsx(
                IconButton,
                {
                  "aria-label": "\u8BED\u97F3\u8F93\u5165",
                  sx: {
                    color: isDarkMode ? "white" : "text.primary",
                    p: 1,
                    "&:hover": {
                      color: isDarkMode ? "white" : "text.primary",
                      bgcolor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
                    }
                  },
                  onClick: isListening ? stopVoice : startVoice,
                  color: isListening ? "error" : "default",
                  children: /* @__PURE__ */ jsx(MicIcon, { sx: { fontSize: "1.2rem" } })
                }
              ),
              /* @__PURE__ */ jsx(
                IconButton,
                {
                  "aria-label": "\u53D1\u9001",
                  sx: {
                    color: isDarkMode ? "white" : "text.primary",
                    "&:hover": {
                      color: isDarkMode ? "white" : "text.primary",
                      bgcolor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
                    }
                  },
                  onClick: handleSend,
                  disabled: isLoading,
                  children: /* @__PURE__ */ jsx(SendIcon, {})
                }
              )
            ] }),
            speechError && /* @__PURE__ */ jsx(Box, { sx: { mt: 1 }, children: /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "error", children: speechError }) }),
            isListening && /* @__PURE__ */ jsxs(Box, { sx: { mt: 1.5 }, children: [
              /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: interimText ? 0.5 : 0 }, children: [
                /* @__PURE__ */ jsx(Box, { sx: { display: "flex", alignItems: "center", gap: "2px", height: 16 }, children: [...Array(8)].map((_, i) => /* @__PURE__ */ jsx(Box, { sx: {
                  width: 3,
                  height: 10,
                  bgcolor: isDarkMode ? "white" : "text.primary",
                  borderRadius: 2,
                  animation: "wave 0.6s ease-in-out infinite",
                  animationDelay: `${i * 0.08}s`
                } }, i)) }),
                /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6B63\u5728\u542C..." })
              ] }),
              interimText && /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { opacity: 0.5, fontStyle: "italic", pl: 1 }, children: interimText })
            ] }),
            isLoading && /* @__PURE__ */ jsxs(Box, { sx: { mt: 2 }, children: [
              /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 1 }, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: loadingMessage }),
                /* @__PURE__ */ jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  Math.round(loadingProgress),
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsx(Box, { sx: { width: "100%", bgcolor: "background.default", borderRadius: 1, overflow: "hidden" }, children: /* @__PURE__ */ jsx(
                Box,
                {
                  sx: {
                    width: `${loadingProgress}%`,
                    height: 8,
                    bgcolor: "#4f46e5",
                    transition: "width 0.3s ease"
                  }
                }
              ) })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        Dialog,
        {
          open: previewImage !== null,
          onClose: () => setPreviewImage(null),
          maxWidth: false,
          fullWidth: false,
          PaperProps: {
            sx: {
              bgcolor: "transparent",
              boxShadow: "none",
              overflow: "visible",
              m: 0
            }
          },
          sx: {
            // 让 Dialog 内容居中且占满屏幕，点击背景可关闭
            "& .MuiDialog-container": {
              alignItems: "center",
              justifyContent: "center",
              padding: 2
            }
          },
          children: /* @__PURE__ */ jsx(
            DialogContent,
            {
              sx: {
                p: 0,
                overflow: "visible",
                "&:first-of-type": { pt: 0 }
              },
              children: previewImage && /* @__PURE__ */ jsx(
                Box,
                {
                  component: "img",
                  src: previewImage,
                  alt: "\u9884\u89C8",
                  onClick: (e) => e.stopPropagation(),
                  sx: {
                    maxWidth: "90vw",
                    maxHeight: "90vh",
                    objectFit: "contain",
                    borderRadius: "8px",
                    display: "block",
                    cursor: "default",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
                  }
                }
              )
            }
          )
        }
      )
    ] })
  ] });
}
var HomePage_default = HomePage;
export {
  HomePage_default as default
};
