import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, IconButton, Paper, Typography, Button, Switch, Divider, Tooltip, CircularProgress, Accordion, AccordionSummary, AccordionDetails, Dialog, DialogTitle, DialogContent, DialogActions, Slider, Select, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
// [2026-08-05 启动优化] 与 HomePage 一致：懒加载 Babylon.js（5MB+），只在导入模型时加载
const BabylonModelViewer = React.lazy(() => import('../components/BabylonModelViewer'));
import { classifyImportedFiles } from '../utils/modelImport';
import { t as tt, type Lang, setLang } from '../i18n';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FolderIcon from '@mui/icons-material/Folder';
import ConsoleIcon from '@mui/icons-material/Terminal';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WavesIcon from '@mui/icons-material/Waves';
import AirIcon from '@mui/icons-material/Air';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
// [2026-08-06 重构] 停止进程按钮图标 + 桌面宠物开关图标
import StopIcon from '@mui/icons-material/Stop';
// [v79 预览页伴侣面板] 左侧伴侣面板图标
import PhoneIcon from '@mui/icons-material/Phone';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
// [v81] 通话条麦克风钮 + 默认问候开关图标
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import MicOffIcon from '@mui/icons-material/MicOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import SettingsIcon from '@mui/icons-material/Settings';

// ════════════════════════════════════════════════════════════
// [v79→v128] 预览页控制台：通话/感知/导入（伴侣面板 UI 已删，逻辑在右侧控制台）
// 识图/截屏：走 preload companionScreenShot + AI 视觉；不再使用 AutoGLM
// ════════════════════════════════════════════════════════════

// [v102] 通话会话模块级单例：NewPage 卸载/路由切换时资源不丢，避免孤儿 WS/麦克风
//   真正结束只应是：用户挂断 / 关闭软件（OS 回收）
const gCall = {
  ws: null as WebSocket | null,
  stream: null as MediaStream | null,
  ctx: null as AudioContext | null,
  proc: null as any,
  micGate: false,
  ttsPlaying: false,
  replying: false,
  userHungUp: false,
};
// 预览 keep-alive 读取：通话中禁止 90s 释放 / 180s 卸载
(window as any).__companionCallActive = () => !!(gCall.ws && gCall.ws.readyState === WebSocket.OPEN);
// [v104] AI 轮次：打断=abort+代际失效；迟到回包按代际丢弃，不入仓不播报
let gAiAbort: AbortController | null = null;

// [v115] 识图统一走 backend 多模态代理（companionAI.askUnified 内建 image_url）
// 保留 visionImagePart 供未来页面内直接组 multimodal 时使用
export function visionImagePart(dataUrl: string) {
  return { type: 'image_url', image_url: { url: dataUrl } };
}

// [v81 需求2] 记忆与上下文全部交给 DeepSeek Harness（dsh）：本机 headless 子进程跑一轮，
// 会话持久化在 dsh-home\.dsh\storages，页面侧不再保存/回传历史（chatLog 仅做显示）。
// dsh 启动读取 kks resources/.env 的 DEEPSEEK_API_KEY/BASE_URL（与桌宠同一条 API 路线）。
// [2026-09-18 统一] companionAskAI 改走 companionAI.askUnified：与聊天/通话同一提示词+MOTION+动作派发
let dshMemoBusy = false;
async function companionAskAI(userText: string, imageDataUrl?: string): Promise<string> {
  if (dshMemoBusy) throw new Error(tt('np.thinkWait'));
  dshMemoBusy = true;
  try {
    const { askHub } = await import('../services/companionAI');
    const r = await askHub({
      scene: 'companion',
      from: 'preview',
      userText,
      imageDataUrl,
    });
    if (!r.ok && r.text === '') throw new Error(r.error || tt('np.aiEmptyReply'));
    console.log('[companionAskAI] hub route=' + (r.route || '') + ' len=' + (r.text || '').length);
    return r.text || tt('chat.emptyReply');
  } catch (e: any) {
    console.error('[companionAskAI] fail:', e?.message || e);
    // [v185 自愈] 部署后 chunk hash 变化 → 旧页面动态 import 404（用户实测：通话中"对话失败"）。
    //   重载一次页面拿新 index.html 即对齐；标记防循环（最多自愈一次）。
    const msg = String(e?.message || e);
    if (/import|Loading chunk|dynamically/i.test(msg)) {
      try {
        if (!sessionStorage.getItem('rl-chunk-heal')) {
          sessionStorage.setItem('rl-chunk-heal', '1');
          console.warn('[NewPage] chunk 错位 → 自动重载自愈');
          window.location.reload();
          return '' as string;
        }
      } catch { /* noop */ }
    }
    throw e;
  } finally {
    dshMemoBusy = false;
  }
}

async function companionSpeakTTS(text: string): Promise<void> {
  // [v192 T4] 通知渲染端开始说话联动（头部微动+重音点头）
  try { window.dispatchEvent(new Event('rl-tts-start')); } catch { /* noop */ }
  try {
    const resp = await fetch('http://127.0.0.1:9881/tts?text=' + encodeURIComponent(text) + '&speed=1');
    if (resp.ok) {
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        (window as any).__companionAudio = audio; // [v84 需求2] 中断句柄
        audio.onended = () => { URL.revokeObjectURL(url); try { window.dispatchEvent(new Event('rl-tts-end')); } catch { /* noop */ } resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); try { window.dispatchEvent(new Event('rl-tts-end')); } catch { /* noop */ } resolve(); };
        audio.play().catch(() => resolve());
      });
      return;
    }
  } catch { /* 降级 */ }
  await new Promise<void>((resolve) => {
    try {
      try { window.dispatchEvent(new Event('rl-tts-start')); } catch { /* noop */ }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN'; u.onend = () => { try { window.dispatchEvent(new Event('rl-tts-end')); } catch { /* noop */ } resolve(); }; u.onerror = () => { try { window.dispatchEvent(new Event('rl-tts-end')); } catch { /* noop */ } resolve(); };
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch { resolve(); }
  });
}
import PetsIcon from '@mui/icons-material/Pets';
import { speechManager } from '../services/speechManager';

/**
 * 返回按钮（U 形转弯箭头）
 * 颜色：白色（原黑色 #1a1a1a 在深色 3D 场景中不醒目）
 * 加 drop-shadow 让白色按钮在浅色背景上也可见
 */
function UTurnArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
    >
      <path d="M5 8h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H7.5" />
      <polyline points="8.5,6 5,8 8.5,10" />
    </svg>
  );
}

/**
 * 3D 建模页面（/new-page）
 *
 * 与 HomePage 的关系：
 * - 共用同一个 BabylonModelViewer 组件（Babylon.js + babylon-mmd 渲染框架）
 * - 共用同一个 classifyImportedFiles 工具函数（文件分类）
 * - 共用同一个 LoadedTextureFile 类型定义（含 file?: File，用于 babylon-mmd 的 referenceFiles）
 * - 共用同一个 handleMultipleFiles 加载逻辑（并行读取 + 5 重贴图匹配 + Promise.allSettled 容错）
 * - 共用同一个后端（不调用任何后端接口，纯客户端渲染）
 *
 * 唯一不同：
 * - UI 入口不同（HomePage 是聊天页的功能菜单，本页是控制台按钮）
 * - 场景不同（本页默认显示旋转立方体占位，导入模型后切换为 BabylonModelViewer）
 *
 * 不冲突原因：
 * - 两个页面通过 React Router 路由隔离，同一时刻只渲染一个
 * - 共享的组件和工具函数是无状态的，每次调用都创建独立的引擎实例
 * - localStorage key 各自独立（ruanlinyun_3d_* 系列 vs ruanlinyun_lan_mode），互不影响
 */

// 类型定义与 HomePage 完全一致（确保传给 BabylonModelViewer 的数据结构相同）
type LoadedTextureFile = {
  name: string;
  path: string;
  data: ArrayBuffer;
  file?: File;  // 原始 File 对象，用于传给 babylon-mmd 的 referenceFiles
};

type CurrentModelData = {
  name: string;
  data: ArrayBuffer | null;
  textureFiles?: LoadedTextureFile[];
  modelFile?: File;  // 模型原始 File 对象，用于创建 Object URL
  url?: string;
};

function NewPage() {
  const navigate = useNavigate();

  // 控制台面板展开/收起
  // [手机复刻PC] 窄屏（<768px）尺寸收敛：控制台/通话面板自适应
  const [isNarrow, setIsNarrow] = useState<boolean>(() => window.innerWidth < 768);
  // [v182-1] 横屏检测：横屏时控制台整体上移（用户要求1）
  const [isLandscape, setIsLandscape] = useState<boolean>(() => window.innerWidth > window.innerHeight);
  // [v183-T5/T6] 控制台缩放重定：v182 一刀切 0.5 用户实测竖屏太小/横屏显示不全
  //   竖屏 0.85（可读可点）、横屏 0.75（横向空间紧张，缩小但不至于看不清）
  const [phoneScale, setPhoneScale] = useState<number>(() => window.innerWidth < 768 ? 0.85 : 1);
  useEffect(() => {
    const onR = () => {
      setIsNarrow(window.innerWidth < 768);
      setIsLandscape(window.innerWidth > window.innerHeight);
      setPhoneScale(window.innerWidth < 768
        ? (window.innerWidth > window.innerHeight ? 0.75 : 0.85)
        : 1);
    };
    window.addEventListener('resize', onR);
    window.addEventListener('orientationchange', onR);
    return () => { window.removeEventListener('resize', onR); window.removeEventListener('orientationchange', onR); };
  }, []);
  const [consoleOpen, setConsoleOpen] = useState<boolean>(() => window.innerWidth >= 768);

  // ═══════ [v79→v99] 通话/感知引擎（原伴侣面板 UI 已删，引擎仍服务右侧控制台通话与感知）════════
  // 锁定范围（勿删）：flags/companionFlagsV2、gCall、companionAskAI、companionSpeakTTS、
  //   companionScreenShot、__companionCallActive（App.tsx 预览 keep-alive 依赖）
  const [flags, setFlags] = useState<{ mic: boolean; cam: boolean; screen: boolean }>(() => {
    // [v79.1] cam/screen 默认开启（用户拍板）；新存储键 companionFlagsV2 使新默认对老用户也生效
    try {
      const saved = JSON.parse(localStorage.getItem('companionFlagsV2') || 'null');
      if (saved) return { mic: saved.mic !== false, cam: saved.cam !== false, screen: saved.screen !== false };
    } catch { /* noop */ }
    return { mic: true, cam: true, screen: true };
  });
  const [callState, setCallState] = useState<'idle' | 'incall'>('idle');
  const [micOn, setMicOn] = useState(true); // [v81 需求12] 麦克风默认开
  const [greetDisabled, setGreetDisabled] = useState<boolean>(() => { try { return localStorage.getItem('ruanlinyun_greet_disabled') === 'true'; } catch { return false; } });
  const [callUI, setCallUI] = useState<'bar' | 'hidden'>('bar');
  const [callStatus, setCallStatus] = useState(tt('call.ongoing'));
  const [callPhase, setCallPhase] = useState<'listening' | 'thinking' | 'speaking'>('listening'); // [v84 需求2] 外环状态
  const wallpaperUserTouchedRef = useRef(0); // [v87 F3] 用户手动切壁纸开关的时间戳
  // [v91] 默认模型启用开关（永久记忆）：默认开；用户关掉=启动不自动加载默认模型
  const [defaultModelEnabled, setDefaultModelEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('ruanlinyun_3d_default_model_enabled') !== 'false'; } catch { return true; }
  });
  // ═══ [2026-10-01 3D场景] 模式与编辑状态（模式不持久化：重启回到预览，防被困在无UI模式）═══
  const [scene3dMode, setScene3dMode] = useState<boolean>(() => {
    try { return new URLSearchParams(window.location.search).get('scene3d') === '1'; } catch { return false; }
  });
  const [scene3dModels, setScene3dModels] = useState<Array<{ id: string; label: string }>>([]);
  const [scene3dSelected, setScene3dSelected] = useState<string | null>(null);
  const [scene3dScale, setScene3dScale] = useState(1);
  const [scene3dBg, setScene3dBg] = useState<{ type: 'none' | 'color' | 'image'; value?: string }>({ type: 'none' });
  const [scene3dScope, setScene3dScope] = useState<'preview' | 'wallpaper' | 'both'>('both');
  const [scene3dConfirm, setScene3dConfirm] = useState(false);
  // [2026-10-01b] 旋转（度）与骨骼姿态面板状态
  const [scene3dRot, setScene3dRot] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [scene3dBones, setScene3dBones] = useState<string[]>([]);
  const [scene3dBone, setScene3dBone] = useState<string>('');
  const [scene3dBoneEuler, setScene3dBoneEuler] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [chatLog, setChatLog] = useState<Array<{ cls: 'me' | 'ai' | 'sys'; text: string }>>([]);
  // [v81 需求10/12] 启动问候：默认开启（greetDismissed=false 灰钮），播报完才开麦
  const greetDismissedRef = useRef(false);
  const micGateRef = useRef(false); // 问候播报完才放行收音
  const muteNextReplyRef = useRef(false); // [v84 需求2] thinking 中断：结果回来静默入上下文
  const callWsRef = useRef<WebSocket | null>(null);
  const ttsPlayingRef = useRef(false);
  const replyingRef = useRef(false);
  const callPeerRef = useRef('用户');
  const chatLogRef = useRef(chatLog);
  useEffect(() => { chatLogRef.current = chatLog; }, [chatLog]);
  // [v102] 卸载不挂断：通话资源在模块级 gCall；重新挂载时回同步 UI
  useEffect(() => {
    if (gCall.ws && gCall.ws.readyState === WebSocket.OPEN) {
      setCallState('incall');
      setCallUI('bar');
      setCallStatus(tt('call.listeningUser'));
      micGateRef.current = gCall.micGate || true;
      setMicOn(micGateRef.current);
    }
  }, []);

  // [2026-10-01 小脑] 闲置陪伴台词：主进程心跳 → 后端调度（companion.ts 集中判定）→ 此处走既有 TTS 通路
  React.useEffect(() => {
    const bridge = (window as any).companionSpeech;
    if (!bridge?.onSpeak) return;
    const off = bridge.onSpeak((line: string) => {
      try {
        if (!line) return;
        if (speechManager.isUserDisabled && speechManager.isUserDisabled()) return;
        void companionSpeakTTS(String(line));
      } catch { /* noop */ }
    });
    return off;
  }, []);

  // [v81 需求10] 启动即自动通话：进程就绪后 2.5s 自动拨打 → 播问候 → 播完开麦
  const autoGreetedRef = useRef(false);
  useEffect(() => {
    if (autoGreetedRef.current) return;
    autoGreetedRef.current = true;
    // [v82 需求6] 通话状态生命周期（进程级）：本次软件运行内，用户挂断过就不再自动起
    try {
      if (sessionStorage.getItem('ruanlinyun_call_stopped') === 'true') {
        console.log('[NewPage] 本次运行中用户已手动挂断，不自动通话');
        return;
      }
      if (speechManager.isUserDisabled && speechManager.isUserDisabled()) {
        console.log('[NewPage] 用户已关闭语音总开关，不自动通话');
        return;
      }
    } catch { /* noop */ }
    const dismissed = (() => { try { return localStorage.getItem('ruanlinyun_greet_disabled') === 'true'; } catch { return false; } })();
    greetDismissedRef.current = dismissed;
    if (dismissed) return; // [需求10] 用户关了默认问候就不播
    // [v82 需求1] 零延迟问候：页面挂载即刻播报（≤0.5s 内出声），不等 setTimeout；
    // 麦克风门控：问候播完才开麦（STT=Edge speech-bridge）
    (async () => {
      const greet = tt('np.greetHello'); // [v83] 固定开场白（≤10字）[2026-10-01 i18n]
      // [v89 需求3] 问候只播报，不写入聊天上下文（用户拍板：聊天框不放问候语）
      setCallPhase('speaking');
      setCallStatus(tt('call.speaking'));
      ttsPlayingRef.current = true;
      try { await companionSpeakTTS(greet); } catch { /* noop */ }
      ttsPlayingRef.current = false;
      // [v181b 麦克风修复] 问候只播报不开麦：语音桥保持待命（enabled:false）不占麦，
      //   用户点「拨打」走 startCall() 才开麦。此前问候完自动 startCall() = 开机即占麦，
      //   用户在 DSH/聊天里说话会被误识别（07:08 实锤：没通话却识别到用户原话）。
      micGateRef.current = false; gCall.micGate = false;
      try { speechManager.mute(); } catch { /* noop */ }
      setCallPhase('listening'); // [v183] 'idle' 不在 CallPhase 联合类型（v181b 遗留笔误），待拨打=listening 且静音
      setCallStatus(tt('call.readyToDial'));
    })();
  }, []);

  const toggleFlag = (key: 'mic' | 'cam' | 'screen') => {
    setFlags((f) => {
      const next = { ...f, [key]: !f[key] };
      try { localStorage.setItem('companionFlagsV2', JSON.stringify(next)); } catch { /* noop */ }
      if (key === 'mic' && !next.mic && callWsRef.current) cleanupCall({ userHangup: true, reason: 'mic-flag-off' });
      return next;
    });
  };
  // [2026-10-01 3D场景] cam/screen 两格已换为「3D场景/设置」门面，flags 状态槽与 companionFlagsV2
  //   存储按锁定区要求原样保留（App.tsx keep-alive 兼容）；toggleFlag 暂无 UI 调用点，显式占用防误删。
  void toggleFlag;
  // [v87 F1] 挂载统一编排器：模型 → 壁纸 → 桌宠
  // [v168 用户锁定] 优先级1=3D模型（用户最先看到）；无模型跳过；DSH 已在主进程第一批后台起
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        // ① 优先级1：模型——缓存优先，无则默认目录；都没有 → 跳过，不挡后续
        if (!currentModel && defaultModelEnabled) {
          setModelLoading(true);
          setLoadingProgress(8);
          const v81Api = (window as any).__newPageAPI;
          let loaded = false;
          if (v81Api?.loadFromCache) {
            const r = await v81Api.loadFromCache();
            loaded = !!r?.ok;
            console.log('[启动编排][优先级1] 模型(缓存): ' + (loaded ? '命中' : '未命中(' + (r?.err || '') + ')'));
          }
          if (!loaded && !cancelled) {
            setLoadingProgress(25);
            const dm = (window as any).defaultModel;
            if (dm?.load) {
              const lr = await dm.load();
              if (lr?.ok && lr.meta && !cancelled) {
                setLoadingProgress(45);
                const modelResp = await fetch(lr.meta.url + '?t=' + Date.now());
                const data = await modelResp.arrayBuffer();
                setLoadingProgress(70);
                const texs: any[] = [];
                const texList = lr.meta.textureFiles || [];
                for (let ti = 0; ti < texList.length; ti++) {
                  if (cancelled) break;
                  const t = texList[ti];
                  try {
                    const tr = await fetch(t.url + '?t=' + Date.now());
                    if (tr.ok) texs.push({ name: t.name, path: t.path || t.name, data: await tr.arrayBuffer(), webkitRelativePath: t.webkitRelativePath || '' });
                  } catch { /* noop */ }
                  if (texList.length > 0) setLoadingProgress(70 + Math.round(25 * ((ti + 1) / texList.length)));
                }
                if (!cancelled) {
                  openModelPreviewRef.current(lr.meta.name || 'model.pmx', data as ArrayBuffer, texs, lr.meta.url, undefined);
                  loaded = true;
                  console.log('[启动编排][优先级1] 模型(默认目录): ' + (lr.meta.name || ''));
                }
              }
            }
          }
          if (!cancelled) {
            if (!loaded) console.log('[启动编排][优先级1] 无模型 → 跳过，继续下一项');
            setLoadingProgress(100);
            setModelLoading(false);
          }
        } else if (!defaultModelEnabled) {
          console.log('[启动编排][优先级1] 默认模型开关关闭 → 跳过');
        }
        // ② 优先级2：壁纸等（DSH 已在主进程后台拉起）
        if (!cancelled && localStorage.getItem('ruanlinyun_3d_wallpaper_enabled') !== 'false') {
          const wm = (window as any).wallpaperMode;
          if (wm && typeof wm.getStatus === 'function') {
            const st = await wm.getStatus();
            if (!st?.active && typeof wm.enter === 'function') {
              await wm.enter();
              setWallpaperEnabled(true);
              console.log('[启动编排][优先级2] 壁纸模式已默认进入');
            }
          }
        }
        // ③ 桌宠：开关为开 + 已有模型 → 无需额外动作
        if (!cancelled && desktopPetEnabled && currentModel) {
          console.log('[启动编排] 桌宠随 openModelPreview 正规链同步显示');
        }
        console.log('[启动编排] 感知状态: cam=' + flags.cam + ' screen=' + flags.screen);
      } catch (e) {
        console.warn('[启动编排] 异常:', e);
        if (!cancelled) setModelLoading(false);
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setModelLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [v84 需求3] 统一消息仓：与主页（HomePage）共享一份存储（localStorage 镜像），通话/迷你对话只是视窗
  const UNIFIED_KEY = 'ruanlinyun_unified_messages';
  const unifiedPush = (who: 'me' | 'ai' | 'user' | 'sys', text: string, extra?: any) => {
    try {
      const sender = who === 'user' ? 'me' : who;
      if (sender !== 'me' && sender !== 'ai') return; // sys 不入统一仓
      const raw = localStorage.getItem(UNIFIED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ id: String(Date.now()) + '_' + Math.random().toString(36).slice(2, 6), text, sender, time: new Date().toLocaleTimeString(), ...(extra || {}) });
      while (arr.length > 200) arr.shift();
      localStorage.setItem(UNIFIED_KEY, JSON.stringify(arr));
      try { window.dispatchEvent(new Event('ruanlinyun_unified_msg')); } catch { /* noop */ }
    } catch { /* noop */ }
  };
  // [v82 需求7] 聊天记录存档：隐藏持久化（me/ai 消息；sys 不存），小时级时间戳，跨天自动开新日期段
  const archiveMsg = (who: 'me' | 'ai', text: string) => {
    try {
      const now = new Date();
      const day = now.toLocaleDateString('sv-SE'); // yyyy-mm-dd
      const hhmm = now.toTimeString().slice(0, 5);
      const raw = localStorage.getItem('ruanlinyun_chat_archive');
      const arch = raw ? JSON.parse(raw) : { days: {} };
      if (!arch.days[day]) arch.days[day] = [];
      arch.days[day].push({ t: hhmm, who, text });
      // 容量治理：超 1MB → 删最旧天（30 天滚动；长期沉淀由 dsh 侧记忆库负责）
      let size = JSON.stringify(arch).length;
      while (size > 1024 * 1024) {
        const oldest = Object.keys(arch.days).sort()[0];
        if (!oldest) break;
        delete arch.days[oldest];
        size = JSON.stringify(arch).length;
      }
      localStorage.setItem('ruanlinyun_chat_archive', JSON.stringify(arch));
    } catch { /* 存档失败不阻断聊天 */ }
  };
  const addMsg = (cls: 'me' | 'ai' | 'sys', text: string) => {
    setChatLog((l) => [...l.slice(-60), { cls, text }]);
    if (cls === 'me' || cls === 'ai') {
      archiveMsg(cls, text);
      unifiedPush(cls, text); // [v84 需求3] 镜像进主页统一仓
    }
  };
  // [v89 需求3b] 一次性清空历史上下文（版本升级标记位，只执行一次）
  useEffect(() => {
    try {
      if (localStorage.getItem('ruanlinyun_v89_reset') !== 'done') {
        localStorage.removeItem('ruanlinyun_unified_messages');
        localStorage.removeItem('ruanlinyun_main_chat');
        localStorage.removeItem('ruanlinyun_chat_archive');
        localStorage.setItem('ruanlinyun_v89_reset', 'done');
        console.log('[v89] 历史上下文已清空（一次性）');
      }
    } catch { /* noop */ }
  }, []);

  // [v85 需求4] 反向映射：主页/其他区来的消息实时同步进面板（统一仓事件总线）
  useEffect(() => {
    const sync = () => {
      try {
        const unified = JSON.parse(localStorage.getItem('ruanlinyun_unified_messages') || '[]');
        setChatLog(() => unified.slice(-60).map((m: any) => ({
          cls: (m.sender === 'me' || m.sender === 'user') ? 'me' : (m.sender === 'sys' ? 'sys' : 'ai'),
          text: m.text,
          id: m.id,
        })));
      } catch { /* noop */ }
    };
    // 初次同步（面板打开即见全量上下文）
    sync();
    window.addEventListener('ruanlinyun_unified_msg', sync);
    return () => window.removeEventListener('ruanlinyun_unified_msg', sync);
  }, []);

  // [v104] AI 轮次代际：打断=整轮作废（abort 请求 + gen++）；迟到回包丢弃，不入仓不播报
  const aiTurnRef = useRef(0);
  const invalidateAITurn = (reason: string) => {
    aiTurnRef.current += 1;
    muteNextReplyRef.current = false;
    try { gAiAbort?.abort(); } catch { /* noop */ }
    gAiAbort = null;
    replyingRef.current = false; gCall.replying = false;
    ttsPlayingRef.current = false; gCall.ttsPlaying = false;
    try { speechSynthesis.cancel(); } catch { /* noop */ }
    try { (window as any).__companionAudio?.pause(); } catch { /* noop */ }
    console.log('[NewPage] AI轮次作废 reason=' + reason + ' gen=' + aiTurnRef.current);
  };
  const interruptCall = () => {
    if (callPhase === 'thinking') {
      invalidateAITurn('user-click-thinking');
      speechManager.interrupt();
      setCallPhase('listening');
      setCallStatus(tt('call.listeningWho') + callPeerRef.current);
      addMsg('sys', tt('call.interrupted'));
      return;
    }
    if (callPhase === 'speaking') {
      invalidateAITurn('user-click-speaking');
      speechManager.interrupt();
      setCallPhase('listening');
      setCallStatus(tt('call.listeningWho') + callPeerRef.current);
      addMsg('sys', tt('call.ttsCut'));
    }
  };
  // [v102] userHangup 默认 true（按钮路径）；异常断线传 false → 重连且不写 call_stopped
  const cleanupCall = (opts?: { userHangup?: boolean; reason?: string }) => {
    const userHangup = opts?.userHangup !== false;
    const reason = opts?.reason || (userHangup ? 'user' : 'unexpected');
    if (userHangup) {
      gCall.userHungUp = true;
      try { sessionStorage.setItem('ruanlinyun_call_stopped', 'true'); } catch { /* noop */ }
    }
    console.log('[NewPage] cleanupCall reason=' + reason + ' userHangup=' + userHangup);
    const ws = gCall.ws; gCall.ws = null;
    if (gCall.proc) { try { gCall.proc.disconnect(); } catch { /* noop */ } gCall.proc = null; }
    if (gCall.ctx) { try { gCall.ctx.close(); } catch { /* noop */ } gCall.ctx = null; }
    if (gCall.stream) { gCall.stream.getTracks().forEach((t) => t.stop()); gCall.stream = null; }
    if (ws) { try { ws.close(); } catch { /* noop */ } }
    gCall.replying = false; gCall.ttsPlaying = false; gCall.micGate = false;
    replyingRef.current = false; ttsPlayingRef.current = false;
    if ((gCall as any).speechUnsub) {
      try { (gCall as any).speechUnsub(); } catch { /* noop */ }
      (gCall as any).speechUnsub = null;
    }
    speechManager.stop();
    setCallState('idle');
    try { const dp = (window as any).desktopPet; if (dp && dp.pushCallState) dp.pushCallState(false); } catch { /* noop */ }
    // [v185] 壁纸控制台「语音通话」开关请求：主页是执行者（单一执行点），执行后状态经主进程广播回控制台
    useEffect(() => {
      const dp = (window as any).desktopPet;
      if (dp && dp.onCallState) {
        const off = dp.onCallState(() => {
          if (gCall.ws) cleanupCall({ userHangup: true, reason: 'console-toggle' });
          else startCall();
        });
        return () => { try { off(); } catch { /* noop */ } };
      }
    }, []);
    if (userHangup) {
      setChatLog((l) => [...l.slice(-60), { cls: 'sys', text: tt('call.ended') }]);
    } else {
      setChatLog((l) => [...l.slice(-60), { cls: 'sys', text: tt('call.reconnecting') }]);
      setTimeout(() => {
        if (gCall.ws && gCall.ws.readyState === WebSocket.OPEN) return;
        try {
          if (sessionStorage.getItem('ruanlinyun_call_stopped') === 'true') return;
        } catch { /* noop */ }
        console.log('[NewPage] 异常断开后自动重连通话');
        startCall();
      }, 1200);
    }
  };

  // [v81 需求5] AI 自主感知：用户消息含"看"类意图时 AI 自己调用（带缓存防连拍）
  const detectSeeIntent = (text: string): 'screen' | 'camera' | null => {
    if (!/看|瞧|屏幕|画面|好看|长相|颜值|外观/.test(text)) return null;
    if (/屏幕|电脑|桌面|显示器/.test(text)) return 'screen';
    if (/我|脸|脸蛋|自己|镜头|摄像头/.test(text)) return 'camera';
    return null;
  };

  // [v116] 查信息意图 → 本地浏览器搜索服务（Playwright headless，端口 5180）
  const detectSearchIntent = (text: string): string | null => {
    if (!/查|搜|搜索|查找|了解一下|最新|新闻|天气|什么是|怎么/.test(text)) return null;
    // 明确“看屏幕/看我”优先走视觉，不抢搜索
    if (detectSeeIntent(text)) return null;
    return text.trim();
  };
  // [v118] 通用自动化意图：交给 GUI Agent（看屏/找应用/查天气/开关程序）
  const isAutomationGoal = (text: string): boolean => {
    const t = (text || '').trim();
    if (!t) return false;
    if (detectSeeIntent(t)) return false;
    return /(天气|气温|听歌|放歌|来一首|听音乐|播放音乐|打开|关闭|关掉|启动|退出|帮我开|帮我关)/.test(t);
  };
  const runGuiAutomation = async (goal: string): Promise<{ ok: boolean; result: string }> => {
    const api = (window as any).guiAgent;
    if (!api || !api.run) return { ok: false, result: tt('auto.bridgeDown') };
    try {
      const r = await api.run(goal) as any;
      if (r && r.ok) return { ok: true, result: String(r.result || tt('auto.done')) };
      return { ok: false, result: String((r && r.error) || (r && r.result) || tt('auto.fail')) };
    } catch (e: any) {
      return { ok: false, result: e?.message || String(e) };
    }
  };
  const browserSearchBrief = async (query: string): Promise<string> => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const resp = await fetch('http://127.0.0.1:5180/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const j = await resp.json() as any;
      if (!resp.ok || !j?.ok) return '';
      const items = (j.items || []).slice(0, 4) as Array<{ title?: string; snippet?: string; url?: string }>;
      if (!items.length) return '';
      const lines = items.map((it, i) => `${i + 1}. ${it.title || ''}${it.snippet ? ' — ' + it.snippet : ''}`);
      return '（浏览器检索摘要）\n' + lines.join('\n');
    } catch (e: any) {
      console.warn('[NewPage] browser-search 不可用:', e?.message || e);
      return '';
    }
  };

  // [v113/v117] 打开本机应用（正规 IPC；路径可缺省，主进程按关键词别名解析）
  const APP_LAUNCH_MAP: Record<string, string> = {
    blender: 'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    酷狗音乐: '酷狗',
    酷狗: 'C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\KuGou.exe',
    kugou: 'C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\KuGou.exe',
  };
  const tryLaunchFromSpeech = (text: string): string | null => {
    const t = (text || '').toLowerCase();
    // [v114] 放歌 / 播放音乐 → 先确保酷狗 + 系统媒体键
    if (/(放一首|放歌|播放音乐|唱一首|听歌|来一首)/.test(t) || (/(播放|放)/.test(t) && /(歌|音乐|曲)/.test(t))) {
      try {
        const mc = (window as any).mediaControl;
        if (mc) {
          mc({ action: 'play' }).then((r: any) => {
            console.log('[NewPage] media play', r);
            addMsg('sys', r && r.ok ? tt('auto.playOk') : (tt('auto.playFail') + (r && r.error)));
          });
          return 'media';
        }
      } catch (e: any) { addMsg('sys', tt('auto.playFail') + e.message); }
      return null;
    }
    if (!/(打开|启动|open|运行|帮我开)/.test(t)) return null;
    // 先按表匹配；再兜底把「酷狗/blender」等关键词直接交给主进程
    const keys = Object.keys(APP_LAUNCH_MAP);
    let matchedKey: string | null = null;
    for (const key of keys) {
      if (t.includes(key.toLowerCase())) { matchedKey = key; break; }
    }
    if (!matchedKey) {
      if (/酷狗|kugou|kg音乐/.test(t)) matchedKey = '酷狗';
      else if (/blender/.test(t)) matchedKey = 'blender';
    }
    if (!matchedKey) return null;
    const p = APP_LAUNCH_MAP[matchedKey] || matchedKey;
    try {
      const api = (window as any).launchApp;
      if (!api) {
        addMsg('sys', tt('auto.openBridgeDown'));
        return null;
      }
      api(p).then((r: any) => {
        console.log('[NewPage] launch', matchedKey, r);
        if (r && r.ok) addMsg('sys', tt('auto.opened') + matchedKey);
        else addMsg('sys', tt('auto.openFail') + (r && r.error));
      }).catch((e: any) => addMsg('sys', tt('auto.openFail') + e.message));
      return matchedKey;
    } catch (e: any) {
      addMsg('sys', tt('auto.openFail') + e.message);
      return null;
    }
  };

  const onCallFinal = async (text: string) => {
    console.log('[NewPage] onCallFinal:', text);
    // [v118] 自动化任务交给 GUI Agent，不再走旧白名单 launch（避免双开）
    if (!isAutomationGoal(text)) tryLaunchFromSpeech(text);
    // [v104] 思考中用户再次开口 = 打断：作废旧轮，再处理新话
    if (replyingRef.current) {
      invalidateAITurn('user-barge-in');
      speechManager.interrupt();
      setCallPhase('listening');
    }
    const myGen = ++aiTurnRef.current;
    replyingRef.current = true; gCall.replying = true;
    setCallPhase('thinking');
    setCallStatus(tt('call.thinking'));
    // [根因修复] 用户语音必须走 addMsg：写入 chatLog + 统一仓；否则 sync 会用仓里的 AI 记录整表覆盖，用户的话就“消失”
    addMsg('me', text);
    try {
      let seeImage: string | null = null;
      let seeLabel = '';
      let searchBrief = '';
      let autoResult: { ok: boolean; result: string } | null = null;
      try {
        const want = detectSeeIntent(text);
        if (want) {
          seeLabel = want === 'screen' ? tt('auto.screenshot') : tt('auto.camera');
          seeImage = await aiAutoCapture(want);
          if (myGen !== aiTurnRef.current) return;
          addMsg('sys', (want === 'screen' ? '🖥 ' : '📷 ') + tt('auto.captured') + seeLabel + tt('auto.sending'));
        } else if (isAutomationGoal(text)) {
          addMsg('sys', tt('auto.running'));
          autoResult = await runGuiAutomation(text);
          if (myGen !== aiTurnRef.current) return;
          addMsg('sys', autoResult.ok ? ('✓ ' + autoResult.result.slice(0, 200)) : ('⚠ ' + autoResult.result));
        } else {
          const q = detectSearchIntent(text);
          if (q) {
            searchBrief = await browserSearchBrief(q);
            if (myGen !== aiTurnRef.current) return;
            if (searchBrief) addMsg('sys', tt('auto.searched'));
          }
        }
      } catch (e: any) {
        console.warn('[NewPage] 感知失败（不阻断对话）:', e?.message || e);
      }
      if (myGen !== aiTurnRef.current) {
        console.log('[NewPage] 感知后轮次已失效，丢弃 gen=' + myGen);
        return;
      }
      let sendText = text;
      let reply = '';
      if (seeImage) {
        sendText = text + '\n（附上当前' + seeLabel + '，请直接看图回答）';
        reply = await companionAskAI(sendText, seeImage || undefined);
      } else if (autoResult && autoResult.ok) {
        // 自动化已给出结果：让 AI 用口吻转述一句即可
        reply = autoResult.result;
        try {
          const polished = await companionAskAI(
            '用户说：' + text + '\n自动化已完成，原始结果：' + autoResult.result + '\n请用一句口语转述给用户，不要重复步骤。',
          );
          if (polished && !polished.startsWith('（AI')) reply = polished;
        } catch { /* 用原始结果 */ }
      } else if (autoResult && !autoResult.ok) {
        reply = await companionAskAI(text + '\n（自动化尝试失败：' + autoResult.result + '，请说明并给替代建议）');
      } else if (searchBrief) {
        sendText = text + '\n' + searchBrief + '\n（请结合以上检索摘要回答，简洁）';
        reply = await companionAskAI(sendText, undefined);
      } else {
        reply = await companionAskAI(text, undefined);
      }
      // 迟到回包：直接丢，不展示、不入统一仓/存档、不播报
      if (myGen !== aiTurnRef.current) {
        console.log('[NewPage] 丢弃迟到AI回复 gen=' + myGen + ' 当前=' + aiTurnRef.current + ' len=' + String(reply || '').length);
        return;
      }
      addMsg('ai', reply);
      setCallPhase('speaking');
      setCallStatus(tt('call.speaking'));
      ttsPlayingRef.current = true; gCall.ttsPlaying = true;
      // [v110] TTS 播报期间暂停本地识别，防止回声
      speechManager.pauseForTts();
      await companionSpeakTTS(reply);
      if (myGen === aiTurnRef.current && (micGateRef.current || gCall.micGate)) {
        speechManager.resumeAfterTts();
      }
      if (myGen !== aiTurnRef.current) {
        console.log('[NewPage] 播报中被作废，停播 gen=' + myGen);
        try { speechSynthesis.cancel(); } catch { /* noop */ }
        try { (window as any).__companionAudio?.pause(); } catch { /* noop */ }
      }
      ttsPlayingRef.current = false; gCall.ttsPlaying = false;
    } catch (e: any) {
      if (myGen !== aiTurnRef.current) {
        console.log('[NewPage] 打断导致的请求失败，不提示 gen=' + myGen);
        return;
      }
      if (e?.name === 'AbortError') {
        console.log('[NewPage] AI请求已中止');
        addMsg('sys', tt('call.interrupted'));
      } else {
        console.error('[NewPage] 对话失败:', e?.message || e);
        addMsg('sys', tt('call.chatFail') + (e?.message || e));
      }
    } finally {
      if (myGen === aiTurnRef.current) {
        replyingRef.current = false; gCall.replying = false;
        if (gCall.ws) { setCallPhase('listening'); setCallStatus(tt('call.listeningWho') + callPeerRef.current); }
      }
    }
  };

  // [v107] 统一 STT：Edge 无感服务 + speechManager（静音/打断/挂断同源）
  // [v108] 与 speechManager 状态同步：静音钮/通话条跟统一状态走
  useEffect(() => {
    const off = speechManager.onState((state, status) => {
      const on = state === 'running' && status.listening;
      setMicOn(state === 'running');
      if (status.error) console.warn('[NewPage] speech status', status);
      void on;
    });
    return () => { off(); };
  }, []);

  const startCall = () => {
    if (gCall.ws) return; // 哨兵：通话中
    gCall.userHungUp = false;
    callPeerRef.current = '用户';
    setCallStatus(tt('call.connecting'));
    try { const dp = (window as any).desktopPet; if (dp && dp.pushCallState) dp.pushCallState(true); } catch { /* noop */ }
    try {
      callWsRef.current = { readyState: 1, close: () => {} } as any;
      gCall.ws = callWsRef.current as any;
      setCallState('incall'); setCallUI('bar');
      setCallStatus(tt('call.listeningWho') + callPeerRef.current);
      addMsg('sys', tt('call.connected'));
      speechManager.start('zh-CN');
      if (!(gCall as any).speechUnsub) {
        (gCall as any).speechUnsub = speechManager.subscribe((text: string) => {
          onCallFinal(text);
        });
      }
      // [v177 修复] 旧逻辑：micGate 关着就 mute()，但问候流程（唯一开闸+unmute 的地方）
      //   只在挂载时自动跑一次，且挂断过/关问候/关语音开关都会跳过 → 手动拨打后
      //   识别被永久静音，无任何恢复点。现象（2026-09-20 实锤）：点「拨打」没反应、
      //   系统无麦克风占用指示（用户误读为"没申请权限"）、说话不被识别；
      //   而 DSH 听写走 rl-mic 直推 control 不经 micGate，所以秒级正常。
      //   改为：仅当问候/播报确实在播时先静音（播完由问候流程 line241 unmute）；
      //   否则拨打即开麦。
      if ((ttsPlayingRef.current || gCall.ttsPlaying) && !micGateRef.current && !gCall.micGate) {
        speechManager.mute();
      } else {
        micGateRef.current = true; gCall.micGate = true;
        speechManager.unmute();
      }
    } catch (e: any) {
      cleanupCall({ userHangup: false, reason: 'start-fail' });
      addMsg('sys', tt('call.dialFail') + (e?.message || e));
    }
  };

  // [v115] 感知缓存：缓存的是 dataUrl（截屏结果），30s 内复用，防连拍
  const lastScreenShotRef = useRef<{ dataUrl: string; at: number } | null>(null);
  const lastCamShotRef = useRef<{ dataUrl: string; at: number } | null>(null);
  const SCREEN_CACHE_MS = 30000;
  const CAM_CACHE_MS = 60000;
  // AI 自动感知入口：只负责本地截屏/抓帧，图像交给 companionAskAI 发服务器
  const aiAutoCapture = async (what: 'screen' | 'camera'): Promise<string> => {
    const cache = what === 'screen' ? lastScreenShotRef.current : lastCamShotRef.current;
    const ttl = what === 'screen' ? SCREEN_CACHE_MS : CAM_CACHE_MS;
    if (cache && Date.now() - cache.at < ttl) return cache.dataUrl;
    const dataUrl = what === 'screen' ? await seeScreen() : await seeCamera();
    if (what === 'screen') lastScreenShotRef.current = { dataUrl, at: Date.now() };
    else lastCamShotRef.current = { dataUrl, at: Date.now() };
    return dataUrl;
  };
  const seeCamera = async (): Promise<string> => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    try {
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => setTimeout(r, 350));
      const cv = document.createElement('canvas');
      cv.width = video.videoWidth || 640; cv.height = video.videoHeight || 480;
      (cv.getContext('2d') as CanvasRenderingContext2D).drawImage(video, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', 0.85);
    } finally { stream.getTracks().forEach((t) => t.stop()); }
  };

  const seeScreen = async (): Promise<string> => {
    const bridge = (window as any).companionScreenShot;
    if (!bridge) throw new Error(tt('auto.shotBridgeDown'));
    const r = await bridge();
    if (!r || !r.ok) throw new Error(r?.error || tt('auto.shotFail'));
    return r.dataUrl as string;
  };

  // [v79] 眼睛交互直接绑在通话条/小球上（companionEyeClick 方案弃用，避免未使用告警）
  // [v99] 伴侣面板 UI 已删除；通话/感知引擎保留（见上方锁定范围）
  const [currentModel, setCurrentModel] = useState<CurrentModelData | null>(null);
// [v181] i18n 语言状态：语言切换时强制重渲染本页控制台标签
  const [langVer, setLangVer] = useState(0);
  useEffect(() => {
    const h = () => setLangVer((v) => v + 1);
    window.addEventListener('rl-lang-changed', h);
    // [v181b] DSH 反向语言桥：DSH 页内切语言 → 主页跟随
    try {
      const dl = (window as any).dshLocale;
      if (dl && dl.onChanged) {
        dl.onChanged((lang: Lang) => { setLang(lang, { fromDsh: true }); setLangVer((v) => v + 1); });
      }
    } catch { /* noop */ }
    return () => window.removeEventListener('rl-lang-changed', h);
  }, []);
  // [v181] 壁纸控制台「语音通话」入口：navigate-main('/?call=1') 后自动拨打通话
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('call') === '1') {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const timer = setTimeout(() => { startCall(); }, 800);
        try { window.history.replaceState({}, '', window.location.pathname); } catch (e) { /* noop */ }
        return () => clearTimeout(timer);
      }
    } catch (e) { /* noop */ }
  }, []);
  void langVer; // [v181] 消费语言版本号：切换语言时本组件重渲染，控制台标签刷新
  // [2026-08-06 重构] 桌面宠物开关：默认打开，与页面内3D模型同步生命周期
  // 打开+有模型 → 桌面显示透明桌宠；关闭 → 隐藏桌宠；停止进程 → 同步关闭
  const [desktopPetEnabled, setDesktopPetEnabled] = useState(() => {
    const saved = localStorage.getItem('ruanlinyun_3d_desktop_pet_enabled');
    return saved === null ? true : saved === 'true';
  });

  // [2026-09-05] 壁纸模式开关（替代原"默认开启 API"——经查该开关只写 localStorage、无任何下游链路，
  // AI 操控角色走的是 joint-control 指令通道，与它无关，故安全移除）
  // 默认关闭（用户需求）；真实状态以主进程壁纸窗口为准（F11 进出后由同步 effect 刷新）
  // [v86] 壁纸默认开启：用户关过（存 false）则不再默认启动；真实状态仍以主进程为准
  const [wallpaperEnabled, setWallpaperEnabled] = useState(() => {
    return localStorage.getItem('ruanlinyun_3d_wallpaper_enabled') !== 'false';
  });

  // 物理模组开关（MMD Bullet WASM 物理，让衣服/裙摆/头发自然下垂和摆动）
  // 默认开启（用户需求：让衣服能够自然飘动，参考游戏效果）
  const [physicsEnabled, setPhysicsEnabled] = useState(() => {
    const saved = localStorage.getItem('ruanlinyun_3d_physics_enabled');
    return saved === null ? true : saved === 'true';
  });

  // 风力开关（让衣服随风飘动，类似游戏 Live2D 效果）
  // 默认开启（用户需求：小幅度的自然飘动）
  const [windEnabled, setWindEnabled] = useState(() => {
    const saved = localStorage.getItem('ruanlinyun_3d_wind_enabled');
    return saved === null ? true : saved === 'true';
  });

  // 文件功能提示（仅 UI，功能后续添加）
  const [fileHint, setFileHint] = useState<string | null>(null);

  // 模型加载状态
  const [modelLoading, setModelLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);

  // [修复 内存泄漏] 定时器句柄与存活标志。
  //   本页会持有 PMX 模型与全部贴图的 ArrayBuffer（动辄上百 MB），
  //   任何一个残留的定时器回调都会通过闭包吊住这些大对象，使其无法被 GC，
  //   是本项目最容易造成"用着用着就崩"的泄漏点，必须严格回收。
  const fileHintTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fileHintTimerRef.current) clearTimeout(fileHintTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      fileHintTimerRef.current = null;
      finishTimerRef.current = null;
    };
  }, []);

  /**
   * [2026-08-06 重构] 停止3D建模进程
   * 清除模型数据 → 页面内变回立方体 → 同步关闭桌宠窗口
   * 桌宠和页面内3D模型是同一个东西，停止进程时同步关闭
   */
  const stopModelProcess = React.useCallback(() => {
    setCurrentModel(null);
    // [v81 需求6b] 广播全链关停事件（壁纸监听后退出）
    try { window.dispatchEvent(new Event('ruanlinyun_force_stop')); } catch { /* noop */ }
    setModelError(null);
    // 同步关闭桌宠（它们是同一个进程）
    const desktopPet = (window as any).desktopPet;
    if (desktopPet && typeof desktopPet.hide === 'function') {
      desktopPet.hide();
      console.log('[NewPage] 桌宠已随3D建模进程同步关闭');
    }
  }, []);
  const stopModelProcessRef = React.useRef(stopModelProcess);
  stopModelProcessRef.current = stopModelProcess;
  // [v81 需求6b] 壁纸若开着也一并退出（全链关停，不留残留）
  React.useEffect(() => {
    const onForceStop = () => {
      (async () => {
        try {
          const wm = (window as any).wallpaperMode;
          if (wm && typeof wm.getStatus === 'function') {
            const st = await wm.getStatus();
            if (st?.active && typeof wm.exit === 'function') { await wm.exit(); console.log('[NewPage] 壁纸模式已随停止进程退出'); }
          }
        } catch (e) { console.warn('[NewPage] 壁纸退出异常:', e); }
      })();
    };
    window.addEventListener('ruanlinyun_force_stop', onForceStop);
    return () => window.removeEventListener('ruanlinyun_force_stop', onForceStop);
  }, []);

  /**
   * [2026-08-06 重构] 把模型数据传给桌宠窗口（独立透明 BrowserWindow）
   * 桌宠窗口加载 /pet 路由，通过 IPC 获取模型数据并透明渲染
   * 注意：File 对象无法通过 IPC 传递，需提取 webkitRelativePath 为字符串
   */
  // [v182-6 手机桥] 手机端桌宠同步加载：通过 CustomEvent 把模型广播给 MobilePet 页
  const broadcastModelToMobilePet = (
    fileName: string,
    fileData: ArrayBuffer,
    textureFiles: LoadedTextureFile[],
  ) => {
    try {
      const isMobile = (window as any).Capacitor?.isNativePlatform?.() || /android|iphone|ipad|mobile/i.test(navigator.userAgent || '');
      if (!isMobile) return;
      // [v183-T4] 持久暂存最新模型：桌宠页签后挂载会错过事件 → 挂载时主动从 window 拉取
      (window as any).__rlMobilePetModel = { name: fileName, data: fileData, textureFiles };
      window.dispatchEvent(new CustomEvent('rl-mobile-pet-model', {
        detail: { name: fileName, data: fileData, textureFiles },
      }));
      console.log('[v183] 已广播模型到手机桌宠(含暂存):', fileName, '贴图:', textureFiles.length);
    } catch (e) {
      console.warn('[v183] 手机桌宠广播失败:', e);
    }
  };

  const showDesktopPet = async (
    fileName: string,
    fileData: ArrayBuffer | null,
    textureFiles: LoadedTextureFile[],
    modelFile?: File
  ) => {
    const desktopPet = (window as any).desktopPet;
    // [桌宠诊断] 检查 window.desktopPet 是否存在（preload 是否成功注入）
    console.log('[桌宠诊断][NewPage] showDesktopPet 调用:', {
      fileName,
      dataHasData: !!fileData,
      dataByteLength: fileData?.byteLength || 0,
      textureCount: textureFiles.length,
      hasModelFile: !!modelFile,
      desktopPetExists: !!desktopPet,
      desktopPetShowType: typeof desktopPet?.show,
    });
    if (!desktopPet || typeof desktopPet.show !== 'function') {
      // [2026-08-06] 非 Electron 环境（浏览器访问 5175）没有 preload.js 注入的 desktopPet 接口
      // 这是预期行为——桌宠是 Electron 桌面应用独有功能，网页版不支持
      // 用 info 而非 error，避免用户误以为出 bug
      console.info('[NewPage] 桌宠功能仅在桌面应用(exe)中可用，当前为网页环境，跳过桌宠显示');
      return;
    }

    try {
      const petModelData = {
        name: fileName,
        data: fileData,
        modelWebkitRelativePath: modelFile?.webkitRelativePath || modelFile?.name || '',
        textureFiles: textureFiles.map(t => ({
          name: t.name,
          path: t.path || t.name,
          data: t.data,
          webkitRelativePath: t.file?.webkitRelativePath || t.file?.name || '',
        })),
      };
      console.log('[桌宠诊断][NewPage] 即将调用 desktopPet.show(), modelWebkitRelativePath=', petModelData.modelWebkitRelativePath);
      const result = await desktopPet.show(petModelData);
      console.log('[桌宠诊断][NewPage] ✅ desktopPet.show() 返回:', result, '（注意：窗口实际显示由主进程 ready-to-show 控制，此处返回仅代表IPC到达主进程）');
      // [v92 R1 断层A修复] 导入即登记事实源：模型目录落盘 default-model.json，
      //   重启后三线（预览/壁纸/桌宠）从同一目录加载，不再回退旧默认琳奈
      try {
        const absPath = (modelFile as any)?.path as string | undefined;
        if (absPath) {
          const sep = absPath.includes('\\') ? '\\' : '/';
          const dir = absPath.slice(0, absPath.lastIndexOf(sep));
          const dm = (window as any).defaultModel;
          if (dm?.setDir) {
            const r = await dm.setDir(dir);
            if (r?.success) console.log('[v92] 默认模型目录已登记: ' + dir);
          }
        } else {
          console.log('[v92] showDesktopPet 无 File.path（缓存链），跳过目录登记');
        }
      } catch (e) { console.warn('[v92] 目录登记失败（不阻断）:', e); }
    } catch (e) {
      console.error('[桌宠诊断][NewPage] ❌ desktopPet.show() 抛错:', e);
    }
  };


  /**
   * [2026-08-06 重构] 导入模型后：立方体替换为3D模型 + 同步显示桌宠
   * 桌宠显示由 desktopPetEnabled 开关控制（默认打开）
   */
  const openModelPreview = (
    fileName: string,
    fileData: ArrayBuffer | null,
    textureFiles: LoadedTextureFile[] = [],
    url?: string,
    modelFile?: File
  ) => {
    setCurrentModel({ name: fileName, data: fileData, textureFiles, url, modelFile });
    // [v182-6] 手机端同步广播给桌宠页（PC 走 showDesktopPet 原链路，不受影响）
    if (fileData) broadcastModelToMobilePet(fileName, fileData, textureFiles);
    // [v81 需求6c] 缓存登记（单槽位：新导入即覆盖=滚动淘汰）
    try { localStorage.setItem('ruanlinyun_3d_last_model', fileName); } catch { /* noop */ }
    // 桌宠开关打开时同步显示在桌面
    if (desktopPetEnabled) {
      showDesktopPet(fileName, fileData, textureFiles, modelFile);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // [2026-08-28] AI 开发界面专属接口（与用户 UI 隔离）
  // AI 通过 CDP 调 window.__newPageAPI.loadFromCache()：
  // 从主进程缓存(desktopPet.getModel)读模型数据 → 组件正规流程 openModelPreview 渲染
  // 不弹文件选择器、不触发桌宠同步（开发用）。注意：本块必须位于 openModelPreview 声明之后。
  // ═══════════════════════════════════════════════════════════
  const openModelPreviewRef = React.useRef(openModelPreview);
  openModelPreviewRef.current = openModelPreview;
  React.useEffect(() => {
    (window as any).__newPageAPI = {
      loadFromCache: async () => {
        try {
          const dp = (window as any).desktopPet;
          if (!dp || typeof dp.getModel !== 'function') return {err: 'no desktopPet.getModel'};
          const meta = await dp.getModel();
          if (!meta || !meta.url) return {err: 'no cached model (先通过 desktopPet.show 喂入)'};
          const modelResp = await fetch(meta.url + '?t=' + Date.now());
          const data = await modelResp.arrayBuffer();
          const textureFiles: any[] = [];
          for (const t of (meta.textureFiles || [])) {
            try {
              const r = await fetch(t.url + '?t=' + Date.now());
              if (!r.ok) continue;
              const d = await r.arrayBuffer();
              if (!d.byteLength) continue;
              textureFiles.push({name: t.name, path: t.path || t.name, data: d, webkitRelativePath: t.webkitRelativePath || ''});
            } catch(e) {}
          }
          openModelPreviewRef.current(meta.name || 'model.pmx', data as ArrayBuffer, textureFiles as any, meta.url, undefined);
          return {ok: true, pmxLen: data.byteLength, texN: textureFiles.length};
        } catch(e: any) {
          return {err: e.message};
        }
      }
    };
    return () => { try { delete (window as any).__newPageAPI; } catch(e) {} };
  }, []);
  /**
   * [2026-08-06 重构] 桌面宠物开关切换
   * 打开+有模型 → 显示桌宠；关闭 → 隐藏桌宠（页面内模型不受影响）
   */
  const handleDesktopPetToggle = (val: boolean) => {
    setDesktopPetEnabled(val);
    localStorage.setItem('ruanlinyun_3d_desktop_pet_enabled', String(val));
    if (val && currentModel) {
      // 开关打开且有模型 → 显示桌宠
      showDesktopPet(currentModel.name, currentModel.data, currentModel.textureFiles || [], currentModel.modelFile);
    } else if (!val) {
      // 开关关闭 → 隐藏桌宠
      const desktopPet = (window as any).desktopPet;
      if (desktopPet && typeof desktopPet.hide === 'function') {
        desktopPet.hide();
      }
    }
  };

  /**
   * 处理多文件加载（1:1 复刻自 HomePage.handleMultipleFiles）
   * 核心逻辑完全一致，仅 UI 反馈方式不同（本页用 setModelError，HomePage 用 AI 消息）
   *
   * 流程：
   * 1. classifyImportedFiles 分类模型/贴图/不支持文件
   * 2. 并行读取模型 + 所有贴图（Promise.allSettled 容错）
   * 3. 5 重贴图匹配策略（精确路径 → 文件名 → 后缀 → 模糊）
   * 4. openModelPreviewWindow 切换到预览模式
   */
  const handleMultipleFiles = useCallback((files: File[]) => {
    setModelLoading(true);
    setLoadingProgress(0);
    setModelError(null);

    const { modelFiles, textureFiles, unsupportedFiles } = classifyImportedFiles(files);

    // [v183-T1·证据E3] 手机端：选中了模型但一张贴图都没有 → 直接报错引导重选，
    //   杜绝"灰模默默出现"（PMX 无贴图必然灰白，这不是渲染问题而是资源缺失）
    const isMobileImport2 = (window as any).Capacitor?.isNativePlatform?.()
      || /android|iphone|ipad|mobile/i.test(navigator.userAgent || '');
    if (isMobileImport2 && modelFiles.length > 0 && textureFiles.length === 0
        && modelFiles[0].name.toLowerCase().endsWith('.pmx')) {
      setModelError(tt('model.noTexture'));
      setModelLoading(false);
      return;
    }

    if (modelFiles.length === 0) {
      const hasCompressedArchive = unsupportedFiles.some((file) => /\.(zip|rar|7z)$/i.test(file.name));
      const errorMessage = hasCompressedArchive
        ? tt('model.stableHint')
        : tt('model.notFound');
      setModelError(errorMessage);
      setModelLoading(false);
      return;
    }

    // 处理第一个模型文件
    const firstModel = modelFiles[0];
    const firstModelFile = files.find((file) => file.name === firstModel.name);
    if (!firstModelFile) {
      setModelError(tt('model.readFail'));
      setModelLoading(false);
      setLoadingProgress(0);
      return;
    }

    // ===== 并行读取优化（与 HomePage 完全一致）=====
    // 同时读取模型文件和所有贴图文件，最大化利用多核 IO
    // 目标：1-3 秒完成加载（原串行需 5-10 秒）

    // 辅助函数：读取单个文件为 ArrayBuffer，带进度回调
    const readFileAsArrayBuffer = (file: File, onProgress?: (p: number) => void): Promise<ArrayBuffer> => {
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

    // 辅助函数：在 files 中查找贴图文件（5 重匹配策略，与 HomePage 完全一致）
    const findTextureFile = (textureName: string, texturePath: string): File | undefined => {
      // 1. 精确路径匹配（webkitRelativePath）
      let f = files.find((file) => {
        const relPath = (file.webkitRelativePath || file.name).toLowerCase().replace(/\\/g, '/');
        return relPath === texturePath.toLowerCase();
      });
      if (f) return f;
      // 2. 文件名+路径匹配
      f = files.find((file) => file.name === textureName && ((file.webkitRelativePath || file.name).toLowerCase().replace(/\\/g, '/') === texturePath));
      if (f) return f;
      // 3. 文件名匹配
      f = files.find((file) => file.name.toLowerCase() === textureName.toLowerCase());
      if (f) return f;
      // 4. 后缀匹配（webkitRelativePath endsWith）
      f = files.find((file) => (file.webkitRelativePath || file.name).toLowerCase().endsWith('/' + textureName.toLowerCase()));
      if (f) return f;
      // 5. 模糊匹配（文件名包含）
      f = files.find((file) => file.name.includes(textureName.split('.')[0]) || textureName.includes(file.name.split('.')[0]));
      return f;
    };

    // 并行启动：模型 + 所有贴图同时读取
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
        file: textureFile,  // 保留原始 File 对象，用于 babylon-mmd 的 referenceFiles
      } as LoadedTextureFile));
    });

    // 使用 Promise.allSettled 并行等待所有读取完成
    Promise.allSettled([modelPromise, ...texturePromises]).then((results) => {
      const modelResult = results[0];
      if (modelResult.status !== 'fulfilled') {
        setModelError(tt('model.readFailRetry'));
        setModelLoading(false);
        setLoadingProgress(0);
        return;
      }

      const loadedTextures: LoadedTextureFile[] = [];
      const failedTextures: string[] = [];
      for (let i = 1; i < results.length; i++) {
        const r = results[i] as PromiseSettledResult<LoadedTextureFile>;
        if (r.status === 'fulfilled') {
          loadedTextures.push(r.value);
        } else {
          failedTextures.push(textureFiles[i - 1]?.name || 'unknown');
        }
      }

      // [修复 内存泄漏] 读取完成时组件可能已卸载（大模型读取耗时数秒，用户很可能已返回）。
      //   此处若继续走下去，会把上百 MB 的 modelResult.value 与全部贴图交给
      //   openModelPreview 并写入状态，这些数据将永远无法释放。
      if (!mountedRef.current) return;

      setLoadingProgress(100);

      // 短暂延迟让 UI 更新
      // [修复 内存泄漏] 该定时器的闭包捕获了 modelResult.value（模型 ArrayBuffer）
      //   与 loadedTextures（全部贴图数据）。不回收则这些大对象至少多存活 200ms，
      //   若此间组件卸载更会造成卸载后 setState + 大内存滞留。改为受控定时器。
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      finishTimerRef.current = setTimeout(() => {
        finishTimerRef.current = null;
        if (!mountedRef.current) return;

        // 与 HomePage 完全一致的调用方式
        openModelPreview(firstModel.name, modelResult.value, loadedTextures, undefined, firstModelFile);

        if (failedTextures.length > 0) {
          console.warn(`[NewPage] 部分贴图加载失败: ${failedTextures.join(', ')}`);
          setModelError(`模型已加载，但 ${failedTextures.length} 个贴图文件处理失败，可能影响部分材质显示。`);
        }

        setModelLoading(false);
        setLoadingProgress(0);
      }, 200);
    });
  }, []);

  /**
   * 处理"导入建模"按钮点击（与 HomePage 的 case tt('home.importModel') 逻辑完全一致）
   * 创建隐藏的 <input type="file" webkitdirectory> 让用户选择整个文件夹
   * webkitdirectory 让用户选整个文件夹（PMX 模型通常带多个贴图文件）
   */
  const handleImportModel = useCallback(() => {
    setModelError(null);
    // [v184] 手机端文件夹选择：安卓 WebView 文件选择器无法选文件夹（真机确认），
    //   走原生 RlFolderPicker 插件（系统目录选择器 ACTION_OPEN_DOCUMENT_TREE），
    //   原生把整个目录复制到应用缓存并返回 {name, relativePath, path} 清单，
    //   前端把每项转成 File 对象后走与 PC 完全一致的 handleMultipleFiles 链路。
    const isNativeMobileImport = !!(window as any).Capacitor?.isNativePlatform?.();
    if (isNativeMobileImport) {
      (async () => {
        try {
          const cap = (window as any).Capacitor;
          const RlFolderPicker = cap?.Plugins?.RlFolderPicker;
          if (!RlFolderPicker?.pickFolder) {
            setModelError(tt('model.pickerUnavailable'));
            return;
          }
          setModelLoading(true);
          setLoadingProgress(2);
          // [v186] pickFolder 30s 看门狗：原生层异常时不挂转圈
          const pickWithTimeout = Promise.race([
            RlFolderPicker.pickFolder(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('文件夹选择超时')), 30000)),
          ]);
          const res = await pickWithTimeout;
          const list = (res?.files || []) as Array<{ name: string; relativePath: string; path: string }>;
          if (!list.length) { setModelLoading(false); setLoadingProgress(0); return; } // 用户取消
          // 相对路径 → webkitRelativePath 语义（PMX 所在目录为前缀），复用 PC 匹配链路
          const pmxRel = list.find((f) => /\.(pmx|pmd)$/i.test(f.relativePath || f.name))?.relativePath || '';
          const pmxDir = pmxRel.includes('/') ? pmxRel.slice(0, pmxRel.lastIndexOf('/') + 1) : '';
          const files: File[] = [];
          for (const item of list) {
            try {
              const fileUrl = (window as any).Capacitor.convertFileSrc(item.path);
              const resp = await fetch(fileUrl);
              const blob = await resp.blob();
              const rel = pmxDir && !item.relativePath.startsWith(pmxDir) ? pmxDir + item.relativePath : item.relativePath;
              const f = new File([blob], item.name, { type: blob.type || 'application/octet-stream' });
              Object.defineProperty(f, 'webkitRelativePath', { value: rel, writable: false });
              files.push(f);
            } catch { /* 单文件失败跳过 */ }
          }
          setModelLoading(false);
          setLoadingProgress(0);
          if (!files.length) { setModelError(tt('model.folderReadFail')); return; }
          handleMultipleFiles(files);
        } catch (err: any) {
          setModelLoading(false);
          setLoadingProgress(0);
          const msg = String(err?.message || err || '');
          if (!/cancel/i.test(msg)) setModelError(tt('model.folderPickFail') + msg);
        }
      })();
      return;
    }
    const modelFileInput = document.createElement('input');
    modelFileInput.type = 'file';
    // PC 端保持 webkitdirectory 原体验（手机端已由上方原生目录选择接管）
    {
      (modelFileInput as any).webkitdirectory = true;
    }
    modelFileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const files = Array.from(target.files);
        // [v81 需求6] 缓存校验：同名→快速路径；异名→清旧缓存登记，走完整导入（单槽滚动）
        const v81ModelFile = files.find((f) => /\.(pmx|glb|gltf|obj)$/i.test(f.name));
        const v81Cached = (() => { try { return localStorage.getItem('ruanlinyun_3d_last_model') || ''; } catch { return ''; } })();
        if (v81ModelFile && v81Cached && v81ModelFile.name === v81Cached) {
          console.log('[NewPage] 缓存校验命中（同名），清屏后取缓存');
          const v81Api = (window as any).__newPageAPI;
          if (v81Api?.loadFromCache) {
            // [v82 修复] 先清空当前模型（杀掉旧画面），再异步取缓存——
            // 加载环期间不渲染任何旧内容，杜绝"旧缓存先闪现"
            setCurrentModel(null);
            setModelLoading(true);
            setLoadingProgress(0);
            v81Api.loadFromCache().then((r: any) => {
              if (r?.ok) { setModelLoading(false); return; }
              console.warn('[NewPage] 快速路径失败，回退完整导入:', r?.err);
              handleMultipleFiles(files);
            }).catch(() => handleMultipleFiles(files));
            return;
          }
        }
        if (v81ModelFile && v81Cached && v81ModelFile.name !== v81Cached) {
          try { localStorage.removeItem('ruanlinyun_3d_last_model'); } catch { /* noop */ }
          setCurrentModel(null); // [v82] 异名即清屏：新模型读取期间不显示旧模型
          console.log('[NewPage] 新模型（' + v81ModelFile.name + ' ≠ 缓存 ' + v81Cached + '），旧缓存已清、旧画面已卸');
        }
        handleMultipleFiles(files);
      }
    };
    modelFileInput.click();
  }, [handleMultipleFiles]);
  // [v184] handleImportModel 内部通过 ref 闭包引用 handleMultipleFiles（原生分支），依赖保持一致

  /**
   * [2026-09-05] 壁纸模式开关切换（替代原"默认开启 API"）
   * - 开：有模型时进入壁纸模式（与 F11 同一条主进程链路：WE 暂停 → 壁纸窗口挂 WorkerW → 悬浮控制台出现）
   * - 关：退出壁纸模式（WE 恢复、主窗口还原）
   * - 开关状态与真实壁纸窗口同步：focus / onAttached 时刷新（见下方 effect），防止 F11 进出后显示错位
   */
  const showHint = (text: string) => {
    setFileHint(text);
    if (fileHintTimerRef.current) clearTimeout(fileHintTimerRef.current);
    fileHintTimerRef.current = setTimeout(() => {
      fileHintTimerRef.current = null;
      setFileHint(null);
    }, 3000);
  };

  // ═══════ [2026-10-01 3D场景] 工具条处理函数 ═══════
  const waitScene3dApi = async (): Promise<any> => {
    for (let i = 0; i < 100; i++) {
      const a = (window as any).__scene3d;
      if (a?.ready) return a;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  };
  const handleScene3dToggle = (on: boolean) => {
    if (on && !currentModel && !modelLoading) { showHint(tt('np.needModelFirst')); return; }
    setScene3dMode(on);
  };
  // 进 3D 模式：viewer 编辑开关 + 恢复已存布局（scope 含预览时）；退出：关编辑
  const scene3dRestoredRef = useRef(false);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const api = await waitScene3dApi();
      if (!alive || !api) return;
      api.setEditMode(scene3dMode);
      if (scene3dMode) {
        if (!scene3dRestoredRef.current) {
          scene3dRestoredRef.current = true;
          try {
            const raw = localStorage.getItem('ruanlinyun_3d_scene_layout');
            if (raw) {
              const layout = JSON.parse(raw);
              if (layout && layout.scope !== 'wallpaper') await api.applyLayout(layout);
              if (layout?.background) setScene3dBg(layout.background.type === 'gradient' ? { type: 'none' } : layout.background);
              if (layout?.scope) setScene3dScope(layout.scope);
            }
          } catch { /* noop */ }
        }
        setScene3dModels((api.list?.() || []).map((m: any) => ({ id: m.id, label: m.file })));
      }
    })();
    return () => { alive = false; };
  }, [scene3dMode]);
  // 选中态轮询同步（viewer 里直接点模型选中 → 工具条 chips 跟随；位置/缩放/旋转回读）
  React.useEffect(() => {
    if (!scene3dMode) return;
    const D2R = Math.PI / 180;
    const iv = setInterval(() => {
      const api = (window as any).__scene3d;
      if (!api) return;
      const s = api.getSelected?.() ?? null;
      setScene3dSelected((prev) => (prev === s ? prev : s));
      if (s) {
        const t = api.getTransform?.(s);
        if (t) {
          setScene3dScale((p) => (Math.abs(p - (t.scale || 1)) > 0.01 ? (t.scale || 1) : p));
          setScene3dRot((p) => {
            const nx = Math.round((t.rotX || 0) / D2R), ny = Math.round((t.rotY || 0) / D2R), nz = Math.round((t.rotZ || 0) / D2R);
            return (Math.abs(p.x - nx) > 0.5 || Math.abs(p.y - ny) > 0.5 || Math.abs(p.z - nz) > 0.5) ? { x: nx, y: ny, z: nz } : p;
          });
        }
      }
    }, 500);
    return () => clearInterval(iv);
  }, [scene3dMode]);
  const handleScene3dSelect = (id: string) => {
    setScene3dSelected(id);
    (window as any).__scene3d?.setSelected?.(id);
    const t = (window as any).__scene3d?.getTransform?.(id);
    if (t) {
      setScene3dScale(t.scale || 1);
      const D2R = Math.PI / 180;
      setScene3dRot({ x: Math.round((t.rotX || 0) / D2R), y: Math.round((t.rotY || 0) / D2R), z: Math.round((t.rotZ || 0) / D2R) });
    }
    // 骨骼面板只对主模型（__jointControl 挂在主管线上）
    if (id === 'primary') setScene3dBones((window as any).__scene3d?.bones?.() || []);
    else setScene3dBones([]);
    setScene3dBone('');
  };
  const handleScene3dScale = (v: number) => {
    setScene3dScale(v);
    if (scene3dSelected) (window as any).__scene3d?.setTransform?.(scene3dSelected, { scale: v });
  };
  const handleScene3dRot = (axis: 'x' | 'y' | 'z', deg: number) => {
    const next = { ...scene3dRot, [axis]: deg };
    setScene3dRot(next);
    if (!scene3dSelected) return;
    const D2R = Math.PI / 180;
    const payload = axis === 'x' ? { rotX: deg * D2R } : axis === 'y' ? { rotY: deg * D2R } : { rotZ: deg * D2R };
    (window as any).__scene3d?.setTransform?.(scene3dSelected, payload);
  };
  const handleScene3dReset = () => {
    (window as any).__scene3d?.resetAll?.();
    setScene3dScale(1);
    setScene3dRot({ x: 0, y: 0, z: 0 });
    showHint(tt('np.resetDone'));
  };
  // ── 骨骼姿态（走 __jointControl 合法通道：生理极限+碰撞回滚+D系代理）──
  const handleScene3dBonePick = (name: string) => {
    setScene3dBone(name);
    const e = (window as any).__scene3d?.getBoneEuler?.(name);
    if (e) setScene3dBoneEuler({ x: Math.round(e[0] * 180 / Math.PI), y: Math.round(e[1] * 180 / Math.PI), z: Math.round(e[2] * 180 / Math.PI) });
  };
  const handleScene3dBoneRot = (axis: 'x' | 'y' | 'z', deg: number) => {
    const next = { ...scene3dBoneEuler, [axis]: deg };
    setScene3dBoneEuler(next);
    if (scene3dBone) {
      const D2R = Math.PI / 180;
      (window as any).__scene3d?.setBoneEuler?.(scene3dBone, [next.x * D2R, next.y * D2R, next.z * D2R]);
    }
  };
  const handleScene3dBoneResetOne = () => {
    if (scene3dBone) {
      (window as any).__jointControl?.reset?.(scene3dBone);
      setScene3dBoneEuler({ x: 0, y: 0, z: 0 });
    }
  };
  const handleScene3dBoneResetAll = () => {
    (window as any).__jointControl?.resetAll?.();
    setScene3dBoneEuler({ x: 0, y: 0, z: 0 });
  };
  const handleScene3dImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (!files.length) return;
      const api = await waitScene3dApi();
      if (!api) { showHint(tt('np.needModelFirst')); return; }
      const modelExt = /\.(pmx|pmd|glb|gltf|obj)$/i;
      const candidates = files.filter((f) => modelExt.test(f.name));
      if (!candidates.length) { showHint(tt('np.noModelInFolder')); return; }
      const dirOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
      for (const mf of candidates) {
        const kind = (mf.name.match(/(pmx|pmd|glb|gltf|obj)$/i)?.[1] || 'glb').toLowerCase();
        const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const dir = id + '/';
        const mdir = dirOf((mf as any).webkitRelativePath || mf.name);
        const texs: Array<{ name: string; relativePath: string; data: ArrayBuffer }> = [];
        if (kind === 'pmx' || kind === 'pmd') {
          for (const t of files) {
            if (modelExt.test(t.name)) continue;
            try {
              const wp = (t as any).webkitRelativePath || '';
              const rel = wp && mdir && wp.startsWith(mdir) ? wp.slice(mdir.length) : t.name;
              texs.push({ name: t.name, relativePath: rel, data: await t.arrayBuffer() });
            } catch { /* 单贴图失败跳过 */ }
          }
        }
        const buf = await mf.arrayBuffer();
        // 资产落盘（preload scene3d 桥存在时）→ 壁纸窗口可按 URL 复用；落盘失败走内存直载（仅预览）
        let saved = false;
        try {
          const s3 = (window as any).scene3d;
          if (s3?.saveAsset) {
            // [2026-10-02 终审] 校验落盘结果：主进程失败返回 {success:false} 而非 throw
            const rModel = await s3.saveAsset(dir + mf.name, buf);
            let okAll = !!rModel && rModel.success !== false;
            if (okAll) {
              for (const t of texs) {
                const rTex = await s3.saveAsset(dir + t.relativePath, t.data);
                if (!rTex || rTex.success === false) { okAll = false; break; }
              }
            }
            saved = okAll;
            if (!okAll) console.warn('[NewPage] 3D资产落盘失败，改走内存直载（仅预览可见）:', mf.name);
          }
        } catch { /* 旧 preload 无桥，忽略 */ }
        const r = await api.addModel(
          { id, kind, file: mf.name, dir: saved ? dir : '', textures: texs },
          saved ? undefined : buf,
          saved ? '/scene3d/' + dir + encodeURIComponent(mf.name) : undefined,
        );
        if (r?.ok) {
          api.setSelected(id);
          setScene3dSelected(id);
          setScene3dScale(1);
          setScene3dModels((prev) => [...prev, { id, label: mf.name }]);
        } else {
          showHint(tt('np.importFail') + (r?.err || ''));
        }
      }
    };
    input.click();
  }, []);
  const handleScene3dRemove = () => {
    if (!scene3dSelected || scene3dSelected === 'primary') return;
    (window as any).__scene3d?.removeModel?.(scene3dSelected);
    setScene3dModels((p) => p.filter((m) => m.id !== scene3dSelected));
    setScene3dSelected(null);
  };
  const handleScene3dBgNone = () => {
    const s = { type: 'none' as const };
    setScene3dBg(s);
    (window as any).__scene3d?.setBackground?.(s);
  };
  const handleScene3dBgColor = (c: string) => {
    const s = { type: 'color' as const, value: c };
    setScene3dBg(s);
    (window as any).__scene3d?.setBackground?.(s);
  };
  const handleScene3dBgImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const s3 = (window as any).scene3d;
      let value: string;
      if (s3?.saveAsset) {
        await s3.saveAsset('bg_' + f.name, buf);
        value = '/scene3d/bg_' + encodeURI(f.name);
      } else {
        value = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(f); });
      }
      const s = { type: 'image' as const, value };
      setScene3dBg(s);
      (window as any).__scene3d?.setBackground?.(s);
    } catch { showHint(tt('np.bgFail')); }
    e.target.value = '';
  };
  const handleScene3dSave = async () => {
    const api = (window as any).__scene3d;
    const models = (api?.list?.() || []).map((m: any) => ({ ...m, ...(api.getTransform(m.id) || {}) }));
    const layout = { v: 1, scope: scene3dScope, background: scene3dBg, primary: api?.getTransform?.('primary') || undefined, models };
    try { localStorage.setItem('ruanlinyun_3d_scene_layout', JSON.stringify(layout)); } catch { /* noop */ }
    if (scene3dScope !== 'preview') {
      try {
        const s3 = (window as any).scene3d;
        if (s3?.setLayout) await s3.setLayout(JSON.stringify(layout));
        else showHint(tt('np.needRestartForWallpaper'));
      } catch { /* noop */ }
    }
    setScene3dConfirm(false);
    showHint(tt('np.layoutSaved'));
  };
  const handleWallpaperToggle = async (val: boolean) => {
    if (val && !currentModel) {
      showHint(tt('model.importFirst'));
      return;
    }
    const wm = (window as any).wallpaperMode;
    if (!wm || typeof wm.enter !== 'function') {
      showHint(tt('model.wallpaperExeOnly'));
      return;
    }
    setWallpaperEnabled(val);
    wallpaperUserTouchedRef.current = Date.now(); // [v87 F3]
    try { localStorage.setItem('ruanlinyun_3d_wallpaper_enabled', String(val)); } catch { /* noop */ } // [v86] 记住用户选择
    try {
      if (val) { await wm.enter(); } else { await wm.exit(); }
    } catch (e) {
      console.warn('[NewPage] 壁纸模式切换失败:', e);
      setWallpaperEnabled(!val);
    }
  };

  // [2026-09-05] 壁纸开关与真实状态同步：F11 进入/退出壁纸后，开关跟着变
  React.useEffect(() => {
    const wm = (window as any).wallpaperMode;
    if (!wm || typeof wm.getStatus !== 'function') return;
    const refresh = async () => {
      try {
        const s = await wm.getStatus();
        // [v87 F3] 用户 3 秒内手动切过开关 → 不覆盖（防竞态拉回）
        if (Date.now() - wallpaperUserTouchedRef.current < 3000) return;
        setWallpaperEnabled(!!s.active);
      } catch { /* noop */ }
    };
    refresh();
    window.addEventListener('focus', refresh);
    let off: (() => void) | undefined;
    try { off = wm.onAttached(() => { refresh(); }); } catch { /* noop */ }
    return () => {
      window.removeEventListener('focus', refresh);
      if (typeof off === 'function') off();
    };
  }, []);

  /**
   * 物理模组开关切换
   * 持久化到 localStorage（key 独立：ruanlinyun_3d_physics_enabled）
   * 启用后模型的刚体+关节会自动模拟，衣服/裙摆/头发会自然下垂和摆动
   * 切换后需重新导入模型才能生效（物理引擎在模型加载时绑定）
   */
  const handlePhysicsToggle = (val: boolean) => {
    setPhysicsEnabled(val);
    localStorage.setItem('ruanlinyun_3d_physics_enabled', String(val));
  };

  /**
   * 风力开关切换
   * 持久化到 localStorage（key 独立：ruanlinyun_3d_wind_enabled）
   * 启用后给所有刚体施加正弦扰动外力，让衣服随风飘动
   * 切换后需重新导入模型才能生效（风力在模型加载时绑定）
   */
  const handleWindToggle = (val: boolean) => {
    setWindEnabled(val);
    localStorage.setItem('ruanlinyun_3d_wind_enabled', String(val));
  };

  /**
   * 文件按钮点击（仅 UI，功能后续添加）
   * 显示提示，不影响其他功能
   */
  // [v91] 默认模型启用开关切换（永久记忆）：关=下次启动不自动加载；当前已渲染模型不受影响
  const handleDefaultModelEnabledToggle = () => {
    const next = !defaultModelEnabled;
    setDefaultModelEnabled(next);
    try { localStorage.setItem('ruanlinyun_3d_default_model_enabled', String(next)); } catch { /* noop */ }
    showHint(next ? tt('model.defaultOn') : tt('model.defaultOff'));
  };

  // ===== [2026-08-06 重构] 单页面架构：currentModel 控制立方体/3D模型切换 =====
  // 用户需求：导入模型后立方体被替换为3D模型（同一页面，非独立预览模式）
  //          停止进程时变回立方体 + "导入建模"按钮，桌宠同步关闭
  // 不再使用 isModelPreviewMode 独立分支，所有内容在同一 return 内条件渲染
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      {/* 顶部栏：返回按钮（白色 + 阴影，在深色 3D 场景上醒目） */}
      <Box sx={{
        px: 2, py: 2, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%)',
      }}>
        {/* [2026-10-01 3D场景] 返回键双语义：3D 模式→回预览模式；预览模式→回 DSH */}
        <IconButton aria-label={tt('common.back')} onClick={() => { if (scene3dMode) setScene3dMode(false); else navigate('/chat'); }} sx={{ color: '#fff' }}>
          <UTurnArrow />
        </IconButton>
      </Box>

      {/* 3D 场景区域：[Preview Owner] 主窗口预览 = 唯一 Babylon 渲染源
          桌宠/壁纸不再 new Engine，只接收 30fps 帧流（FrameBroadcaster） */}
      <Box sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at center, #2a2a3a 0%, #0a0a14 100%)',
        perspective: '800px',
        position: 'relative',
      }}>
        {currentModel ? (
          // [可用性优先] 预览区始终显示 3D；桌宠窗口可另开，互不影响「用户必须能看见」
          <React.Suspense fallback={
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'rgba(232,232,232,0.78)', fontSize: 13, letterSpacing: 2 }}>
              <div className="rl-natural-spinner" style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.92)', borderRightColor: 'rgba(255,255,255,0.35)', animation: 'rl-spin 0.85s cubic-bezier(0.45,0.05,0.35,1) infinite' }} />
              <div>{tt('common.loading3d')}</div>
            </div>
          }>
            <BabylonModelViewer
              key={`model-${currentModel.name}`}
              modelData={currentModel}
              physicsEnabled={physicsEnabled}
              windEnabled={windEnabled}
              desktopPetMode={false}
            />
          </React.Suspense>
        ) : modelLoading ? (
          // [v165] 启动/加载中：自然转圈，避免黑屏干等
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 1.5, width: '100%', height: '100%', color: 'rgba(232,232,232,0.85)',
          }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.12)',
              borderTopColor: 'rgba(255,255,255,0.92)',
              borderRightColor: 'rgba(255,255,255,0.35)',
              animation: 'rl-spin 0.85s cubic-bezier(0.45,0.05,0.35,1) infinite',
              '@keyframes rl-spin': { to: { transform: 'rotate(360deg)' } },
              boxShadow: '0 0 24px rgba(255,255,255,0.06)',
            }} />
            <Typography variant="body2" sx={{ letterSpacing: 2, opacity: 0.85, animation: 'rl-breathe 1.6s ease-in-out infinite', '@keyframes rl-breathe': { '0%,100%': { opacity: 0.55 }, '50%': { opacity: 0.95 } } }}>
              {tt('common.loading3d')} {Math.round(loadingProgress)}%
            </Typography>
          </Box>
        ) : (
          // 未导入且未在加载：旋转立方体占位场景（CSS 3D 实现，无需加载 Babylon.js）
          <Box sx={{
            width: 120, height: 120, position: 'relative',
            transformStyle: 'preserve-3d',
            animation: 'cube-rotate 12s linear infinite',
            '@keyframes cube-rotate': {
              '0%': { transform: 'rotateX(0deg) rotateY(0deg)' },
              '100%': { transform: 'rotateX(360deg) rotateY(360deg)' },
            },
          }}>
            {/* 立方体 6 个面 */}
            {[
              { transform: 'rotateY(0deg) translateZ(60px)', color: 'rgba(100,180,255,0.7)' },
              { transform: 'rotateY(180deg) translateZ(60px)', color: 'rgba(180,100,255,0.7)' },
              { transform: 'rotateY(90deg) translateZ(60px)', color: 'rgba(100,255,180,0.7)' },
              { transform: 'rotateY(-90deg) translateZ(60px)', color: 'rgba(255,180,100,0.7)' },
              { transform: 'rotateX(90deg) translateZ(60px)', color: 'rgba(255,100,180,0.7)' },
              { transform: 'rotateX(-90deg) translateZ(60px)', color: 'rgba(180,255,100,0.7)' },
            ].map((face, i) => (
              <Box key={i} sx={{
                position: 'absolute', width: '100%', height: '100%',
                transform: face.transform,
                background: face.color,
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: 'inset 0 0 30px rgba(255,255,255,0.2)',
              }} />
            ))}
          </Box>
        )}
      </Box>

      {/* [v99] 伴侣面板 UI 已移除（入口小球 + 面板本体）；通话逻辑在右侧控制台 */}
      {/* 通话时：上方信息面板 + 底部通话栏（居中叠放；面板宽=通话栏×1.5，高=六行） */}
      {/* 3D 模式 UI 清空：通话面板/控制台全部隐藏（预览区与返回键保留） */}
      {!scene3dMode && callState === 'incall' && (
        <Box sx={{
          position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40,
          display: callUI === 'hidden' ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.75, // 6px：间隔小，但能分辨两层
        }}>
          {/* 上方 UI：背景全透明（文字保持不透明）；宽 = 通话栏 × 1.5；高 = 六行 */}
          <Box sx={{
            width: isNarrow ? 'min(432px, calc(100vw - 24px))' : 432, // 288 × 1.5；窄屏收敛到视口内
            height: 120,         // 6 行 × 20px
            boxSizing: 'border-box',
            px: 1.5, py: 0.75,
            borderRadius: 2,
            bgcolor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}>
            {chatLog.length === 0 ? (
              <Typography sx={{ fontSize: 13, lineHeight: '20px', color: '#ffffff', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.75)' }}>
                通话记录…（我 / AI）
              </Typography>
            ) : (
              chatLog.slice(-6).map((m, i) => (
                <Typography key={i} sx={{
                  fontSize: 13,
                  lineHeight: '20px',
                  fontWeight: m.cls === 'me' ? 700 : 600,
                  color: '#ffffff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.85)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {(m.cls === 'me' ? tt('np.me') : m.cls === 'ai' ? tt('np.ai') : '') + m.text}
                </Typography>
              ))
            )}
          </Box>

          {/* 下方：原通话栏（半透明） */}
          <Box sx={{
            minWidth: isNarrow ? 'min(288px, calc(100vw - 24px))' : 288,
            maxWidth: isNarrow ? 'calc(100vw - 24px)' : undefined,
            alignItems: 'center', gap: 1.5,
            px: 2.5, py: 1.2, borderRadius: 26,
            bgcolor: 'rgba(224, 242, 241, 0.35)',
            border: '1px solid rgba(0, 137, 123, 0.45)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
            display: 'flex',
            backdropFilter: 'blur(6px)',
          }}>
                        {/* [v84 需求2] 圆点：thinking/speaking 时外层呼吸环；点击=中断 */}
                        <Box onClick={interruptCall} title={tt('call.tapInterrupt')} sx={{
                          position: 'relative', width: 16, height: 16, cursor: 'pointer', flexShrink: 0,
                        }}>
                          {callPhase !== 'listening' && (
                            <Box sx={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '2px solid', borderColor: callPhase === 'speaking' ? '#e53935' : '#00897b', opacity: 0.6, animation: 'pulse 1.2s infinite' }} />
                          )}
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: callPhase === 'speaking' ? '#e53935' : '#00897b', position: 'absolute', top: 4, left: 4, animation: 'pulse 1.2s infinite' }} />
                        </Box>
          <Typography sx={{ fontSize: 13, color: '#004d40', fontWeight: 600 }}>{callStatus}</Typography>
          {/* [v81 需求12] 原小眼睛位换麦克风钮：开关麦克风（默认开） */}
          <IconButton size="small" onClick={() => { micGateRef.current = !micGateRef.current; gCall.micGate = micGateRef.current; setMicOn(micGateRef.current); if (micGateRef.current) speechManager.unmute(); else speechManager.mute(); }} sx={{ color: micOn ? '#00796b' : '#bdbdbd' }} title={micOn ? '麦克风开启中（点击关闭）' : '麦克风已关（点击开启）'}>
            {micOn ? <KeyboardVoiceIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
          </IconButton>
          <Button size="small" variant="contained" onClick={() => cleanupCall({ userHangup: true, reason: 'user-button' })} sx={{ bgcolor: '#e53935', '&:hover': { bgcolor: '#c62828' }, textTransform: 'none', px: 1.5, minWidth: 0 }}>{tt('call.hangupShort')}</Button>
          </Box>
        </Box>
      )}

      {/* [v99] 伴侣面板 UI 已移除（入口小球 + 面板本体）；通话/控制台逻辑保留 */}

      {/* 控制台折叠按钮（收起时显示；3D 模式隐藏） */}
      {!scene3dMode && !consoleOpen && (
        <IconButton
          aria-label={tt('home.openConsole')}
          onClick={() => setConsoleOpen(true)}
          sx={{
            position: 'absolute',
            top: isNarrow ? (isLandscape ? 44 : 12) : 80,
            right: isNarrow ? 8 : 16,
            zIndex: 20,
            bgcolor: '#ffffff',
            color: '#1a1a1a',
            border: '2px solid #1a1a1a',
            transform: isNarrow ? `scale(${phoneScale})` : undefined,
            transformOrigin: 'top right',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            '&:hover': { bgcolor: '#f5f5f5' },
          }}
        >
          <ConsoleIcon />
        </IconButton>
      )}

      {/* 右侧白色控制台面板（3D 模式隐藏） */}
      {!scene3dMode && consoleOpen && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: isNarrow ? (isLandscape ? 44 : 12) : 80,
            right: isNarrow ? 8 : 16,
            zIndex: 20,
            width: isNarrow ? (isLandscape ? 'min(340px, 52vw)' : 'min(320px, calc(100vw - 16px))') : 280,
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: isNarrow ? 'calc(100dvh - 84px)' : undefined,
            overflowY: isNarrow ? 'auto' : undefined,
            transform: isNarrow ? `scale(${phoneScale})` : undefined,
            transformOrigin: 'top right',
            bgcolor: '#ffffff',
            color: '#1a1a1a',
            border: '2px solid #1a1a1a',
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            overflow: isNarrow ? 'auto' : 'hidden',
          }}
        >
          {/* 控制台标题栏 */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            bgcolor: '#1a1a1a',
            color: '#ffffff',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ConsoleIcon fontSize="small" />
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', letterSpacing: 0.5 }}>
                控制台
              </Typography>
            </Box>
            <IconButton
              aria-label={tt('home.closeConsole')}
              onClick={() => setConsoleOpen(false)}
              size="small"
              sx={{ color: '#ffffff', p: 0.5 }}
            >
              <ChevronRightIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          </Box>

          <Divider />

          {/* 控制台选项列表 */}
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* 选项 1：导入建模 / 停止该进程（动态切换）
                - 未导入或加载中：显示"导入建模"按钮，点击触发文件选择
                - 导入成功后：变为"停止该进程"按钮，点击关闭模型+桌宠，恢复立方体
                用户需求：导入成功后按钮变为"停止该进程"，停止后变回"导入建模" */}
            {currentModel ? (
              <Tooltip title={tt('np.stopProcTip')} placement="left">
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<StopIcon />}
                  onClick={stopModelProcess}
                  sx={{
                    justifyContent: 'flex-start',
                    bgcolor: '#d32f2f',
                    color: '#ffffff',
                    textTransform: 'none',
                    fontWeight: 'bold',
                    py: 1.2,
                    '&:hover': { bgcolor: '#b71c1c' },
                  }}
                >
                  {tt('np.stopProc')}
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title={tt('np.importModelTip')} placement="left">
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={modelLoading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                  onClick={handleImportModel}
                  disabled={modelLoading}
                  sx={{
                    justifyContent: 'flex-start',
                    bgcolor: '#1a1a1a',
                    color: '#ffffff',
                    textTransform: 'none',
                    fontWeight: 'bold',
                    py: 1.2,
                    '&:hover': { bgcolor: '#333' },
                  }}
                >
                  {modelLoading ? `${tt('common.loadingShort')} ${Math.round(loadingProgress)}%` : tt('home.importModel')}
                </Button>
              </Tooltip>
            )}

            {/* 语音通话（自伴侣面板移入，紧挨导入建模下方；逻辑未改） */}
            <Button
              variant="contained"
              fullWidth
              startIcon={<PhoneIcon />}
              onClick={() => { if (callState === 'incall') { cleanupCall({ userHangup: true, reason: 'user-panel' }); } else { startCall(); } }}
              sx={{
                justifyContent: 'flex-start',
                bgcolor: callState === 'incall' ? '#e53935' : '#00897b',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 'bold',
                py: 1.1,
                '&:hover': { bgcolor: callState === 'incall' ? '#c62828' : '#00695c' },
              }}
            >
              {callState === 'incall' ? tt('call.hangup') : tt('home.call')}
            </Button>

            {/* 默认选项：标题点击开合；右侧 [V]；原齿轮设置入口已移入下方网格「设置」格（2026-10-01） */}
            <Accordion elevation={0} defaultExpanded sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
              <AccordionSummary>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>{tt('home.defaults')}</Typography>
                  <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 1, px: 1, pb: 1 }}>
            {/* ═══ [v84 需求4] 默认选项区（两列网格）══════════════════════
                左列：风力效果 / 物理模组 / 启动问候    右列：桌面宠物 / 3D场景 / 设置
                图标开关：点行切换，开=原色图标，关=灰+斜杠；无 Switch
                [2026-10-01] 「摄像头」→「3D场景」（仅门面替换）；「屏幕识别」→「设置」
                （原默认选项标题旁齿轮移入此格，点击跳 /settings，恒亮无开关语义）；
                [2026-10-01c] 3D场景格恒亮：进 3D 模式后面板整体隐藏，格子的"关态"永远不可见，
                按 off 渲染只会永远显示灰+斜杠（用户反馈"按钮是灰色的"），故与设置格一致恒亮。 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
              {([
                { label: tt('home.windEffect'), icon: <AirIcon fontSize="small" />, on: windEnabled && physicsEnabled, disabled: !physicsEnabled, toggle: () => handleWindToggle(!(windEnabled && physicsEnabled)) },
                { label: tt('home.physics'), icon: <WavesIcon fontSize="small" />, on: physicsEnabled, disabled: false, toggle: () => handlePhysicsToggle(!physicsEnabled) },
                { label: tt('home.greeting'), icon: <NotificationsOffIcon fontSize="small" />, on: !greetDisabled, disabled: false, toggle: () => { const n = !greetDisabled; setGreetDisabled(n); try { localStorage.setItem('ruanlinyun_greet_disabled', String(n)); } catch { /* noop */ } } },
                { label: tt('home.desktopPet'), icon: <PetsIcon fontSize="small" />, on: desktopPetEnabled, disabled: false, toggle: () => handleDesktopPetToggle(!desktopPetEnabled) },
                { label: tt('home.scene3d'), icon: <ViewInArIcon fontSize="small" />, on: true, disabled: false, toggle: () => handleScene3dToggle(!scene3dMode) },
                { label: tt('home.settings'), icon: <SettingsIcon fontSize="small" />, on: true, disabled: false, toggle: () => { try { sessionStorage.setItem('settingsFrom', window.location.pathname || '/'); } catch { /* noop */ } navigate('/settings'); } },
              ] as Array<{ label: string; icon: any; on: boolean; disabled: boolean; toggle: () => void }>).map(({ label, icon, on, disabled, toggle }) => (
                <Box
                  key={label}
                  onClick={disabled ? undefined : toggle}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    px: 1, py: 0.5, border: '1px solid #e0e0e0', borderRadius: 1,
                    bgcolor: on ? '#effaf8' : '#fafafa',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    position: 'relative',
                    '&:hover': { borderColor: '#00897b' },
                  }}
                >
                  <Box sx={{ position: 'relative', display: 'inline-flex', color: on ? '#00897b' : '#9e9e9e' }}>
                    {icon}
                    {/* 关=斜杠覆盖 */}
                    {!on && (
                      <Box sx={{ position: 'absolute', left: '50%', top: '50%', width: '130%', height: 1.5, bgcolor: '#e57373', transform: 'translate(-50%,-50%) rotate(-45deg)', borderRadius: 1 }} />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: on ? '#004d40' : '#9e9e9e', fontSize: 12 }}>{label}</Typography>
                </Box>
              ))}
            </Box>

            {/* 以下原开关行保留壁纸模式（未点名改造）与文件按钮；风力/物理/桌宠/摄像头/屏幕/问候的原行删除 */}


            {/* 选项 2.2：壁纸模式（F11 同款链路；默认关闭；紧贴"桌面宠物"开关上方）
                [2026-09-05] 与风力效果位置对调，取代原"默认开启 API"的空壳开关 */}
            <Tooltip title={tt('np.wallpaperTip')} placement="left">
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 0.5,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                bgcolor: wallpaperEnabled ? '#e3f2fd' : '#fafafa',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                  <WallpaperIcon fontSize="small" sx={{ color: wallpaperEnabled ? '#1976d2' : '#1a1a1a' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1a1a1a' }}>
                      {tt('np.wallpaperMode')}
                    </Typography>
                  </Box>
                </Box>
                <Switch
                  checked={wallpaperEnabled}
                  onChange={(e) => handleWallpaperToggle(e.target.checked)}
                  color="primary"
                  size="small"
                />
              </Box>
            </Tooltip>



            {/* [v91] 未导入前：文件卡灰色禁点（无模型可管理）；导入后：此卡变「默认启用此模型」+开关 */}
            {!currentModel && (
            <Tooltip title={tt('np.pickModelFirst')} placement="left">
              <Button
                variant="outlined"
                fullWidth
                startIcon={<FolderIcon />}
                disabled
                onClick={undefined}
                sx={{
                  justifyContent: 'flex-start',
                  borderColor: '#bdbdbd',
                  color: '#bdbdbd',
                  textTransform: 'none',
                  fontWeight: 'bold',
                  py: 1.2,
                }}
              >
                文件
              </Button>
            </Tooltip>
            )}
            {currentModel && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 0.5, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: defaultModelEnabled ? '#effaf8' : '#fafafa' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FolderIcon fontSize="small" sx={{ color: defaultModelEnabled ? '#00897b' : '#9e9e9e' }} />
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: defaultModelEnabled ? '#004d40' : '#9e9e9e', fontSize: 12 }}>{tt('home.defaultModelOn')}</Typography>
              </Box>
              <Switch checked={defaultModelEnabled} onChange={handleDefaultModelEnabledToggle} size="small" sx={{ '&.Mui-checked': { color: '#00897b' }, '&.Mui-checked + .MuiSwitch-track': { backgroundColor: '#00897b' } }} />
            </Box>
            )}

            {/* 错误/提示信息显示区 */}
            {modelError && (
              <Typography variant="caption" sx={{ color: '#d32f2f', px: 1, mt: 0.5 }}>
                {modelError}
              </Typography>
            )}
            {fileHint && (
              <Typography variant="caption" sx={{ color: '#666', px: 1, mt: 0.5, fontStyle: 'italic' }}>
                {fileHint}
              </Typography>
            )}
            {currentModel && (
              <Typography variant="caption" sx={{ color: '#2e7d32', px: 1, mt: 0.5 }}>
                ✓ 当前模型: {currentModel.name}
              </Typography>
            )}
              </AccordionDetails>
            </Accordion>
          </Box>
        </Paper>
      )}
      {/* ═══ [2026-10-01b 3D场景] 悬浮编辑面板（分组排版：物体/变换/背景/骨骼/保存）═══ */}
      {scene3dMode && currentModel && (
        <Paper elevation={8} sx={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, bgcolor: 'rgba(255,255,255,0.97)', border: '2px solid #1a1a1a',
          borderRadius: 2, px: 1.75, py: 1.1, maxWidth: 'calc(100vw - 24px)',
          display: 'flex', flexDirection: 'column', gap: 0.9,
        }}>
          {/* 物体行：导入 / 选中芯片 / 删除 / 重置 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button size="small" variant="contained" onClick={handleScene3dImport} sx={{ bgcolor: '#00897b', '&:hover': { bgcolor: '#00695c' }, textTransform: 'none', fontWeight: 'bold' }}>{tt('np.import3d')}</Button>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {([{ id: 'primary', label: currentModel.name || tt('np.primaryModel') }, ...scene3dModels]).map((m) => (
                <Box key={m.id} onClick={() => handleScene3dSelect(m.id)} sx={{
                  px: 1, py: 0.25, borderRadius: 1, cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
                  border: '1px solid', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  borderColor: scene3dSelected === m.id ? '#00897b' : '#e0e0e0',
                  bgcolor: scene3dSelected === m.id ? '#effaf8' : '#fafafa',
                  color: scene3dSelected === m.id ? '#004d40' : '#9e9e9e',
                }}>{m.label}</Box>
              ))}
            </Box>
            {scene3dSelected && scene3dSelected !== 'primary' && (
              <Button size="small" variant="outlined" onClick={handleScene3dRemove} sx={{ textTransform: 'none', color: '#d32f2f', borderColor: '#d32f2f', minWidth: 0, px: 1 }}>{tt('np.removeModel')}</Button>
            )}
            <Tooltip title={tt('np.resetTip')} placement="top">
              <Button size="small" variant="outlined" onClick={handleScene3dReset} sx={{ textTransform: 'none', minWidth: 0, px: 1, color: '#e65100', borderColor: '#ffb74d' }}>{tt('np.reset')}</Button>
            </Tooltip>
          </Box>

          {/* 变换行：缩放 + 旋转 XYZ（Blender 式，选中后可调） */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 12, color: '#666', minWidth: 26 }}>{tt('np.scaleLabel')}</Typography>
            <Slider value={scene3dScale} min={0.05} max={5} step={0.05} onChange={(_, v) => handleScene3dScale(v as number)} disabled={!scene3dSelected} sx={{ width: 110 }} size="small" />
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, alignSelf: 'stretch' }} />
            <Typography sx={{ fontSize: 12, color: '#666', minWidth: 26 }}>{tt('np.rotLabel')}</Typography>
            {(['x', 'y', 'z'] as const).map((ax) => (
              <Box key={ax} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 'bold', color: ax === 'x' ? '#c62828' : ax === 'y' ? '#2e7d32' : '#1565c0' }}>{ax.toUpperCase()}</Typography>
                <Slider value={scene3dRot[ax]} min={-180} max={180} step={1} onChange={(_, v) => handleScene3dRot(ax, v as number)} disabled={!scene3dSelected} sx={{ width: 86 }} size="small" />
                <Typography sx={{ fontSize: 10.5, color: '#999', width: 30, textAlign: 'right' }}>{scene3dRot[ax]}°</Typography>
              </Box>
            ))}
          </Box>

          {/* 骨骼姿态面板（主模型 + 有骨骼时；走 __jointControl 合法通道） */}
          {scene3dSelected === 'primary' && scene3dBones.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center', borderTop: '1px dashed #e0e0e0', pt: 0.75 }}>
              <Typography sx={{ fontSize: 12, color: '#666' }}>{tt('np.boneLabel')}</Typography>
              <Select size="small" value={scene3dBone} onChange={(e) => handleScene3dBonePick(e.target.value as string)} displayEmpty sx={{ fontSize: 12, maxWidth: 170, '& .MuiSelect-select': { py: 0.25 } }}>
                <MenuItem value="" disabled>{tt('np.bonePick')}</MenuItem>
                {scene3dBones.map((b) => <MenuItem key={b} value={b} sx={{ fontSize: 12 }}>{b}</MenuItem>)}
              </Select>
              {(['x', 'y', 'z'] as const).map((ax) => (
                <Box key={ax} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 'bold', color: ax === 'x' ? '#c62828' : ax === 'y' ? '#2e7d32' : '#1565c0' }}>{ax.toUpperCase()}</Typography>
                  <Slider value={scene3dBoneEuler[ax]} min={-180} max={180} step={1} onChange={(_, v) => handleScene3dBoneRot(ax, v as number)} disabled={!scene3dBone} sx={{ width: 86 }} size="small" />
                  <Typography sx={{ fontSize: 10.5, color: '#999', width: 30, textAlign: 'right' }}>{scene3dBoneEuler[ax]}°</Typography>
                </Box>
              ))}
              <Button size="small" variant="outlined" onClick={handleScene3dBoneResetOne} disabled={!scene3dBone} sx={{ textTransform: 'none', minWidth: 0, px: 1, fontSize: 12 }}>{tt('np.boneResetOne')}</Button>
              <Button size="small" variant="outlined" onClick={handleScene3dBoneResetAll} sx={{ textTransform: 'none', minWidth: 0, px: 1, fontSize: 12 }}>{tt('np.boneResetAll')}</Button>
            </Box>
          )}

          {/* 背景与保存行 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 12, color: '#666' }}>{tt('np.bgLabel')}</Typography>
            <Button size="small" variant={scene3dBg.type === 'none' ? 'contained' : 'outlined'} onClick={handleScene3dBgNone} sx={{ minWidth: 0, px: 1, textTransform: 'none', fontSize: 12 }}>{tt('np.bgNone')}</Button>
            <Button size="small" variant={scene3dBg.type === 'color' ? 'contained' : 'outlined'} component="label" sx={{ minWidth: 0, px: 1, textTransform: 'none', fontSize: 12 }}>
              {tt('np.bgColor')}
              <input type="color" hidden value={scene3dBg.type === 'color' ? (scene3dBg.value || '#101018') : '#101018'} onChange={(e) => handleScene3dBgColor(e.target.value)} />
            </Button>
            <Button size="small" variant={scene3dBg.type === 'image' ? 'contained' : 'outlined'} component="label" sx={{ minWidth: 0, px: 1, textTransform: 'none', fontSize: 12 }}>
              {tt('np.bgImage')}
              <input type="file" accept="image/*" hidden onChange={handleScene3dBgImageFile} />
            </Button>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, alignSelf: 'stretch' }} />
            <Typography sx={{ fontSize: 12, color: '#666' }}>{tt('np.scopeLabel')}</Typography>
            <Select size="small" value={scene3dScope} onChange={(e) => setScene3dScope(e.target.value as 'preview' | 'wallpaper' | 'both')} sx={{ fontSize: 12, '& .MuiSelect-select': { py: 0.25 } }}>
              <MenuItem value="preview">{tt('np.scopePreview')}</MenuItem>
              <MenuItem value="wallpaper">{tt('np.scopeWallpaper')}</MenuItem>
              <MenuItem value="both">{tt('np.scopeBoth')}</MenuItem>
            </Select>
            <Button size="small" variant="contained" onClick={() => setScene3dConfirm(true)} sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' }, textTransform: 'none', fontWeight: 'bold' }}>{tt('np.saveLayout')}</Button>
            <Typography sx={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>{tt('np.scene3dTip')}</Typography>
          </Box>
        </Paper>
      )}

      {/* [2026-10-01 3D场景] 保存布局确认弹窗（替换式，复用设置页确认模式） */}
      <Dialog open={scene3dConfirm} onClose={() => setScene3dConfirm(false)}>
        <DialogTitle sx={{ fontSize: 16 }}>{tt('np.confirmSaveTitle')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5 }}>
            {tt('np.confirmSaveBody1')}
            {scene3dScope === 'preview' ? tt('np.scopePreview') : scene3dScope === 'wallpaper' ? tt('np.scopeWallpaper') : tt('np.scopeBoth')}
            {tt('np.confirmSaveBody2')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScene3dConfirm(false)} sx={{ textTransform: 'none' }}>{tt('np.cancel')}</Button>
          <Button onClick={handleScene3dSave} variant="contained" sx={{ bgcolor: '#00897b', '&:hover': { bgcolor: '#00695c' }, textTransform: 'none' }}>{tt('np.confirmSave')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default NewPage;
