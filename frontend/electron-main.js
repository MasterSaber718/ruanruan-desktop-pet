/**
 * 阮云小宠 - Electron 主进程
 *
 * 职责：
 * 1. 启动内嵌静态服务（端口5175）服务前端 dist/
 * 2. 启动后端 API 服务（端口27865）
 * 3. 创建 BrowserWindow 加载 http://localhost:5175
 * 4. 优雅关闭所有子进程
 */
const { app, BrowserWindow, shell, ipcMain, screen, session, globalShortcut, dialog, powerMonitor } = require('electron');
// [v146] 应用名称与图标：阮云小宠 / 压缩图导出的 ico
const APP_NAME = '阮云小宠';
const APP_ICON = require('path').join(__dirname, 'app-icon.ico');
try { app.setName(APP_NAME); app.setAppUserModelId('com.ruanlinyun.ruan-yun-xiao-chong'); } catch (e) { /* noop */ }

// [2026-08-25 修复-1 单实例锁] 多开时聚焦已有窗口，防止 5175 端口 EADDRINUSE 每日复发（见卷宗03）
// [2026-08-27 修复 麦克风权限桥] Electron 打包版无浏览器授权 UI，必须主进程应答
//   否则 getUserMedia 永远挂起 → 语音通话/语音输入拿不到音频流
app.on('ready', () => {
  try {
    const ses = session.defaultSession;
    ses.setPermissionRequestHandler((_wc, permission, callback) => {
      if (permission === 'media' || permission === 'audioCapture') {
        callback(true);   // 允许麦克风（应用本身是本地桌宠，无条件放行）
      } else {
        callback(false);
      }
    });
    // 启动即向系统申请一次麦克风访问，触发 Windows 应用级授权弹窗/记录
    if (typeof ses.askForMediaAccess === 'function') {
      ses.askForMediaAccess('microphone').then((granted) => {
        log(`[voice] askForMediaAccess('microphone') => ${granted}`);
      }).catch(() => {});
    }
    log('[voice] 媒体权限桥已启用');
  } catch (e) {
    log('[voice] 权限桥异常: ' + e.message);
  }
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // [v174] 再次点击图标启动时，若正缩在托盘 → 直接唤回主界面
    try { if (appTray) { showFromTray(); return; } } catch (e) { /* noop */ }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
const path = require('path');
const http = require('http');
const net = require('net');
const fs = require('fs');

// [2026-08-06 透明窗口根本修复 v2] 不禁用 GPU 硬件加速（撤销豆包AI的错误建议）
// 根因（证据链）：
//   1. 日志证明渲染层已透明：bodyBg=rgba(0,0,0,0)，但窗口仍显示纯白 → 问题在"窗口合成层"非"渲染层"。
//   2. app.disableHardwareAcceleration() 会让 Chromium 回退到 SwiftShader 软件渲染，
//      软件渲染路径下透明窗口的合成无法正确输出 alpha 通道 → 窗口底色变白。
//   3. Electron 官方 Issue #48064（2025-08）明确：自 Chromium 139 起，
//      disableHardwareAcceleration 方案已失效，会破坏透明窗口的合成与鼠标穿透。
//   4. Electron Issue #40515 说明：禁用 GPU 只是"个别显卡驱动异常系统"的 workaround，
//      对正常系统反而是破坏——大部分系统启用 GPU 时透明窗口正常工作。
// 修复：移除 app.disableHardwareAcceleration()，恢复 GPU 合成（Electron 透明窗口的标准工作方式）。
//   透明窗口在 Windows 上依赖 DWM 合成 + GPU 合成层输出 alpha，禁用 GPU 会切断这条路径。
//   配合 transparent:true + backgroundColor:'#00000000' + frame:false + hasShadow:false 即可。
//   主窗口 3D 预览也恢复 GPU 加速，Babylon.js 性能不再降级。
// [保留：不调用任何 disable 系列开关，使用 Electron 默认 GPU 合成]

// ========== 路径常量 ==========
// 用路径存在性判断模式（app.isPackaged 在 electron.exe . 启动时不可靠）
// 优先级：
//   1. [热更新] exe 同级 frontend-dist（改前端只需替换此目录，无需重新打包 exe）
//   2. process.resourcesPath/frontend-dist（打包模式）
//   3. __dirname/frontend-dist（dist-electron 暂存目录 / resources/app/frontend-dist）
//   4. __dirname/dist（开发模式，frontend/dist）
function findFrontendDist() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'frontend-dist'),  // [热更新] exe 同级优先
    path.join(process.resourcesPath, 'frontend-dist'),
    path.join(__dirname, 'frontend-dist'),
    path.join(__dirname, 'dist'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  // 兜底返回最后一个，让错误信息有意义
  return candidates[candidates.length - 1];
}

function findBackendDist() {
  const candidates = [
    path.join(process.resourcesPath, 'backend-dist'),
    path.join(__dirname, 'backend-dist'),
    path.join(__dirname, '..', 'backend', 'dist'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'server.js'))) {
      return p;
    }
  }
  return null;  // 后端可选
}

function findBackendNodeModules() {
  const candidates = [
    path.join(process.resourcesPath, 'backend-node_modules'),
    path.join(__dirname, 'backend-node_modules'),
    path.join(__dirname, '..', 'backend', 'node_modules'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * 查找 wechatbot-webhook 服务目录（端口3001）
 *
 * 路径优先级：
 *   1. process.resourcesPath/wechatbot-webhook（打包模式）
 *   2. __dirname/wechatbot-webhook（dist-electron 暂存目录）
 *   3. __dirname/../backend/wechatbot-webhook-new/wechatbot-webhook-main（开发模式）
 *
 * 必须存在 main.js 和 node_modules 才视为有效
 */
function findWechatbotWebhookDir() {
  const candidates = [
    path.join(process.resourcesPath, 'wechatbot-webhook'),
    path.join(__dirname, 'wechatbot-webhook'),
    path.join(__dirname, '..', 'backend', 'wechatbot-webhook-new', 'wechatbot-webhook-main'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)
        && fs.existsSync(path.join(p, 'main.js'))
        && fs.existsSync(path.join(p, 'node_modules'))) {
      return p;
    }
  }
  return null;
}

/**
 * 查找本地 AI 模型目录（models/）
 *
 * 路径优先级：
 *   1. exe 同级 models（打包模式，models 随 exe 分发）
 *   2. process.resourcesPath/models（打包模式，models 打入 resources）
 *   3. __dirname/../models（开发模式，frontend/ 的上一级 = 项目根/models）
 *
 * 必须存在 llama-cpp/llama-server.exe 才视为有效
 */
function findModelsDir() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'models'),
    path.join(process.resourcesPath, 'models'),
    path.join(__dirname, '..', 'models'),
    // [v53] 本机项目根回退：打包产物不含 models 时，指向实际模型目录（自动启动本地 llama）
    ...(process.env.RUANLINYUN_MODELS_DIR ? [process.env.RUANLINYUN_MODELS_DIR] : []),
    'C:\\RUANLINYUN\\ruanlinyun-assistant\\models',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'llama-cpp', 'llama-server.exe'))) {
      return p;
    }
  }
  // 返回开发模式路径（让后端日志输出有意义的错误信息）
  return path.join(__dirname, '..', 'models');
}

// [v128] findSpeechServer / Vosk 识别脚本探测已删除

/**
 * 查找本地 TTS 语音合成服务脚本（tts_server.py，edge-tts 神经女声）
 * 路径优先级同 speech_server：exe 同级 / resourcesPath / 开发目录
 */
function findTTSServer() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'scripts', 'tts_server.py'),
    path.join(process.resourcesPath, 'scripts', 'tts_server.py'),
    path.join(__dirname, '..', 'scripts', 'tts_server.py'),
    path.join(__dirname, 'scripts', 'tts_server.py'), // [2026-08-30 修复] 脚本随 kks 自包含（app\scripts），彻底切断对 _待删除 的依赖
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const isPackaged = fs.existsSync(path.join(process.resourcesPath, 'frontend-dist'));
const FRONTEND_DIST = findFrontendDist();
const BACKEND_DIST = findBackendDist();
const BACKEND_NODE_MODULES = findBackendNodeModules();
const WECHATBOT_WEBHOOK_DIR = findWechatbotWebhookDir();
const MODELS_DIR = findModelsDir();
// [v128] SPEECH_SERVER_PATH 已删除
const TTS_SERVER_PATH = findTTSServer();

// ========== userData 重定向（避免 AppData/Roaming 写入受限） ==========
// 开发模式：写到工作区 .electron-userdata
// 打包模式：写到 exe 同级目录 ./userdata
const USER_DATA_DIR = isPackaged
  ? path.join(path.dirname(process.execPath), 'userdata')
  : path.join(__dirname, '.electron-userdata');
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}
app.setPath('userData', USER_DATA_DIR);
app.setPath('logs', path.join(USER_DATA_DIR, 'logs'));

// ========== [2026-08-06 桌宠文件中转方案] ==========
// 根因（完整证据链）：
//   1. 主进程日志证明收到 9.6MB 模型数据（data大小=9686047），说明 主窗口→主进程 IPC 传输正常。
//   2. 但桌宠窗口不显示模型，且无渲染进程日志（console.log 不写入 app-debug.log）。
//   3. 薄弱环节：主进程→桌宠窗口的 ArrayBuffer 传输。
//      desktop-pet:get-model 的 ipcMain.handle 返回值含 ArrayBuffer，
//      需经过 IPC 结构化克隆 + contextBridge 序列化才能到达渲染进程。
//   4. Electron sandbox:true + contextBridge 环境下，invoke 返回值中的 ArrayBuffer
//      可能被 contextBridge 转换为空对象或丢失 byteLength（Electron 已知行为差异）。
//
// 方案（自己设计，非通用模板）：
//   - 主进程收到模型数据后写入临时文件，通过 5175 静态服务暴露 URL
//   - 桌宠窗口通过 IPC 只获取 URL 字符串（100% 可靠，不传 ArrayBuffer）
//   - 桌宠窗口用 fetch 获取 ArrayBuffer（本地 HTTP，不经过 IPC/contextBridge）
//   - BabylonModelViewer 已支持 modelData.url 加载（L2114），贴图用 fetch 到的 data
//   - 退出时自动清理临时目录，避免垃圾累积
const PET_TMP_DIR = path.join(USER_DATA_DIR, 'pet-tmp');
if (!fs.existsSync(PET_TMP_DIR)) {
  fs.mkdirSync(PET_TMP_DIR, { recursive: true });
}

/**
 * 清空桌宠临时目录（每次 show 前调用，避免旧文件干扰）
 */
function cleanPetTmpDir() {
  // [v51] 先确保目录存在（清理逻辑可能把整个目录删掉，目录没了写入会 ENOENT）
  try { fs.mkdirSync(PET_TMP_DIR, { recursive: true }); } catch (e) { /* 忽略 */ }
  try {
    if (fs.existsSync(PET_TMP_DIR)) {
      const files = fs.readdirSync(PET_TMP_DIR);
      for (const f of files) {
        try { fs.unlinkSync(path.join(PET_TMP_DIR, f)); } catch (e) { /* 忽略单个文件删除失败 */ }
      }
    }
  } catch (e) { /* 忽略 */ }
}

// ========== 端口配置 ==========
const UI_PORT = 5175;       // 前端 UI 端口（用户硬约束）
const API_PORT = 27865;     // 后端 API 端口（用户硬约束）
const WEBHOOK_PORT = 3001;  // wechatbot-webhook 服务端口（微信机器人消息收发）

let mainWindow = null;
let petWindow = null;     // [2026-08-05 重构] 独立桌宠窗口（透明+无边框+置顶+skipTaskbar）
let petModelData = null;  // 桌宠模型数据缓存（主窗口通过 IPC 传入，桌宠窗口通过 IPC 读取）

// ========== [2026-09-20 启动splash改造 v169] 黑屏进度页独立窗口 ==========
// 需求（用户锁定）：点击后立刻看到黑屏+进度条，其他一切在后台疯狂启动；
// 主界面+模型完全就绪后才切入，用户不再硬看加载过程。
// 实现：splash 独立小窗（无 alwaysOnTop，不违反桌面伴侣一票否决）；
// 主窗口 show:false 后台加载；就绪信号来自主窗口 console-message 捕获的
// 前端「[启动编排] 感知状态」日志（编排=模型+壁纸+桌宠全部完成），零前端重建。
let splashWin = null;
let bootSplashDone = false;
let bootSplashPct = 0;   // [v174] 已下发的真实进度（只增不减）
let bootSplashMsg = '正在启动框架…';  // 最近一次下发的阶段文字（splash 迟到显示时补发）

// ---------- [v174 启动进度真实化] 里程碑权重表 ----------
// 用户要求：进度条不许是"按秒自涨"的假进度。这里每一项权重都绑定一个
//   「真实发生的事件」，完成才计分；总权重=100。顺序无关，谁先完成先记谁。
//   权重按各阶段真实耗时占比估：界面/模型/DSH/后端是大头，框架与静态服务很快。
const BOOT_MILESTONES = [
  { id: 'frame',         w: 8,  label: '正在启动框架…' },
  { id: 'staticServer',  w: 12, label: '静态服务就绪' },
  { id: 'modelWarm',     w: 8,  label: '模型预热完成' },
  { id: 'uiLoading',     w: 8,  label: '加载界面与模型…' },
  { id: 'uiLoaded',      w: 16, label: '界面加载完成' },
  { id: 'modelRendered', w: 16, label: '模型渲染完成' },
  { id: 'dshReady',      w: 16, label: 'DSH 服务就绪' },
  { id: 'apiReady',      w: 16, label: '后端服务就绪' },
];
const bootMilestoneDone = Object.create(null);
function bootMilestoneProgress() {
  let pct = 0;
  for (const m of BOOT_MILESTONES) if (bootMilestoneDone[m.id]) pct += m.w;
  return pct;
}
function bootMilestone(id, labelOverride) {
  try {
    const m = BOOT_MILESTONES.find((x) => x.id === id);
    if (!m || bootMilestoneDone[id]) return;
    bootMilestoneDone[id] = true;
    const pct = bootMilestoneProgress();
    splashProgress(pct, labelOverride || m.label);
    log(`[启动][里程碑] ${id} 完成 → ${pct}%（真实权重累加，非时间片）`);
  } catch (e) { /* noop */ }
}
// [v169b 就绪状态机] 真就绪=模型渲染完成+后端就绪，而不是"编排发完加载指令"
let boot编排Done = false;      // 前端启动编排走完（感知状态日志）
let bootModelHit = false;      // 本次有模型加载（缓存/默认目录命中）
let bootModelRendered = false; // Babylon 模型真正渲染完成（AnimSystem 日志）
let bootBackendReady = false;  // 后端 health OK
const BOOT_SPLASH_MIN_MS = 1200;   // 最短展示时长（防进度条闪一下）
const BOOT_SPLASH_MAX_MS = 45000;  // 最长兜底（渲染进程异常也能进主界面）
const BOOT_BACKEND_WAIT_MS = 25000; // 模型已渲染但后端未就绪的最多额外等待
const bootSplashShownAt = { value: 0 };
function bootTryFinish(reason) {
  // 就绪判定：编排完成 且（模型已渲染 或 本次没加载模型） 且（后端就绪 或 已额外等了25s）
  if (!boot编排Done) return;
  if (bootModelHit && !bootModelRendered) return;
  const waited = Date.now() - (bootSplashShownAt.value || 0);
  if (!bootBackendReady && waited < BOOT_BACKEND_WAIT_MS) return;
  finishBootSplash(reason);
}
function splashProgress(pct, msg) {
  try {
    bootSplashPct = Math.max(bootSplashPct, Math.min(100, Math.round(pct)));
    if (msg) bootSplashMsg = String(msg);
    if (splashWin && !splashWin.isDestroyed()) {
      splashWin.webContents.executeJavaScript(
        `window.__setProgress && window.__setProgress(${bootSplashPct}, ${JSON.stringify(bootSplashMsg)})`
      ).catch(() => {});
    }
  } catch (e) { /* splash 可能尚未就绪，忽略 */ }
}
function finishBootSplash(reason) {
  if (bootSplashDone) return;
  bootSplashDone = true;
  const waited = Date.now() - (bootSplashShownAt.value || 0);
  const remain = Math.max(0, BOOT_SPLASH_MIN_MS - waited);
  setTimeout(() => {
    // [v169b] 先补一个 100% 让进度条走满再关，避免"卡在半路突然消失"
    splashProgress(100, '就绪，正在进入…');
    setTimeout(() => {
      try {
        if (splashWin && !splashWin.isDestroyed()) { splashWin.destroy(); }
      } catch (e) { /* noop */ }
      splashWin = null;
      try {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
        log(`[启动][splash] 结束（${reason}），主窗口已显示`);
      } catch (e) { log('[启动][splash] 显示主窗口异常: ' + e.message); }
    }, 600);
  }, remain);
}
function createSplashWindow() {
  try {
    bootSplashDone = false;
    bootSplashPct = 0;
    bootSplashMsg = '正在启动框架…';
    for (const k of Object.keys(bootMilestoneDone)) delete bootMilestoneDone[k];
    boot编排Done = false;
    bootModelHit = false;
    bootModelRendered = false;
    bootBackendReady = false;
    splashWin = new BrowserWindow({
      width: 380,
      height: 260,
      frame: false,
      resizable: false,
      backgroundColor: '#0c0c12',
      show: false,
      autoHideMenuBar: true,
      title: APP_NAME,
      icon: APP_ICON,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    splashWin.loadFile(path.join(__dirname, 'splash.html'));
    splashWin.once('ready-to-show', () => {
      try {
        bootSplashShownAt.value = Date.now();
        splashWin.show();
        // [v169b] 补发显示前已错过的进度（createWindow→show 约有 1s 空窗，期间里程碑事件全发丢了）
        splashWin.webContents.executeJavaScript(
          `window.__setProgress && window.__setProgress(${bootSplashPct}, ${JSON.stringify(bootSplashMsg)})`
        ).catch(() => {});
        log(`[启动][splash] 进度页已显示（补发真实进度 ${bootSplashPct}%）`);
      } catch (e) { log('[启动][splash] 显示异常: ' + e.message); }
    });
    // 点击进度页 = 用户不等了，直接进主界面（防呆逃生门）
    splashWin.on('closed', () => { finishBootSplash('用户点击跳过/窗口关闭'); });
    // 兜底：无论发生什么，45s 后必进主界面
    setTimeout(() => finishBootSplash('超时兜底(45s)'), BOOT_SPLASH_MAX_MS);
    return true;
  } catch (e) {
    log('[启动][splash] 创建失败，回退直接显示主窗口: ' + e.message);
    splashWin = null;
    bootSplashDone = true;
    return false;
  }
}

// ========== [2026-08-31 v62] 壁纸模式（F11 → 角色成为桌面壁纸层） ==========
// 技术路线：WorkerW 挂载（Wallpaper Engine / 米哈游《人工桌面》《BSide: Olivia Lin》同形态）
// 已验证：WallpaperProbe + Electron 透明窗口 POC 双轮 ATTACHED 成功 + detach 干净恢复（2026-08-31）
let wallpaperWindow = null;      // 壁纸模式窗口（全屏透明，挂 WorkerW 层）
let weWasRunning = false;        // 进入壁纸模式时 Wallpaper Engine 是否在跑（退出时恢复）
const { spawn: cpSpawn } = require('child_process');

// WallpaperBridge.exe：csc 编译零依赖壁纸层挂载桥（与 MoveWindowHelper.exe 同目录部署）
function wallpaperBridgePath() { return path.join(__dirname, 'WallpaperBridge.exe'); }
function nativeHwndOf(win) {
  try {
    const buf = win.getNativeWindowHandle();
    if (buf.length >= 8) return Number(buf.readBigUInt64LE(0));
    return buf.readInt32LE(0);
  } catch (e) { log('[壁纸] 获取 hwnd 失败: ' + e.message); return 0; }
}
function runBridge(mode, hwnd) {
  return new Promise((resolve) => {
    try {
      const p = cpSpawn(wallpaperBridgePath(), [mode, String(hwnd)], { windowsHide: true });
      let out = '';
      p.stdout.on('data', (d) => { out += d.toString(); });
      p.on('exit', (code) => resolve({ code, out: out.trim() }));
      p.on('error', (e) => resolve({ code: -1, out: e.message }));
    } catch (e) { resolve({ code: -1, out: e.message }); }
  });
}
// Wallpaper Engine 检测（进程名名单，绝不碰无关进程）
const WE_PROCESS_NAMES = ['wallpaper64', 'wallpaper32', 'webwallpaper32'];
function weDetectRunning() {
  return new Promise((resolve) => {
    try {
      const p = cpSpawn('powershell', ['-NoProfile', '-Command',
        "(Get-Process wallpaper64,wallpaper32,webwallpaper32 -ErrorAction SilentlyContinue | Measure-Object).Count"],
        { windowsHide: true });
      let out = '';
      p.stdout.on('data', (d) => { out += d.toString(); });
      p.on('exit', () => resolve(parseInt(out.trim()) > 0));
      p.on('error', () => resolve(false));
    } catch { resolve(false); }
  });
}
// WE 官方 CLI 暂停/恢复（零侵入：进程留着只是渲染停；退出后 play 原样恢复）
async function weControl(action) {
  try {
    const p = cpSpawn('powershell', ['-NoProfile', '-Command',
      "(Get-Process wallpaper64,wallpaper32,webwallpaper32 -ErrorAction SilentlyContinue | Select-Object -First 1).Path"],
      { windowsHide: true });
    let out = '';
    p.stdout.on('data', (d) => { out += d.toString(); });
    const exePath = await new Promise((res) => {
      p.on('exit', () => { const lines = out.trim().split(/\r?\n/).filter(Boolean); res(lines.length ? lines[lines.length - 1].trim() : null); });
      p.on('error', () => res(null));
    });
    if (!exePath || !fs.existsSync(exePath)) { log('[壁纸] WE exe 未找到，跳过 ' + action); return false; }
    cpSpawn(exePath, ['-control', action], { windowsHide: true, detached: true }).unref();
    log('[壁纸] WE -control ' + action + ' 已发送 (' + exePath + ')');
    return true;
  } catch (e) { log('[壁纸] WE ' + action + ' 失败: ' + e.message); return false; }
}

// [v62b] 默认模型自动加载：F11 直接进入壁纸模式时 petModelData 可能为空
//   （用户本次会话未 show 过桌宠）→ 自动扫描默认模型目录构造 petModelData，
//   与 desktop-pet:show 完全同构（写 pet-tmp + URL），壁纸窗口 PetPage 直接可用
const DEFAULT_MODEL_DIR = 'C:\\Users\\Administrator\\Desktop\\jm\\琳奈_泳装';
// [2026-09-25 v92断层补全] preload.defaultModel.setDir/getDir 早已暴露，
//   但主进程从未注册 'desktop-pet:set-default-dir'/'get-default-dir' 处理器 →
//   前端导入模型后目录登记必失败（日志 [v92] 目录登记失败 No handler registered），
//   重启后默认模型永远回退硬编码的琳奈泳装。现落地：dir 持久化到
//   .electron-userdata/default-model.json，ensureDefaultPetModel 优先读它。
function getSavedDefaultModelDir() {
  try {
    const f = path.join(USER_DATA_DIR, 'default-model.json');
    if (fs.existsSync(f)) {
      const j = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
      if (j && typeof j.dir === 'string' && j.dir && fs.existsSync(j.dir)) return j.dir;
    }
  } catch (e) { /* 读失败回退硬编码目录 */ }
  return null;
}
function setDefaultModelDir(dir) {
  fs.writeFileSync(path.join(USER_DATA_DIR, 'default-model.json'), JSON.stringify({ dir }, null, 2), 'utf8');
}
function ensureDefaultPetModel() {
  const dirUsed = getSavedDefaultModelDir() || DEFAULT_MODEL_DIR;
  if (petModelData) return petModelData;
  try {
    if (!fs.existsSync(dirUsed)) { log('[壁纸] 默认模型目录不存在: ' + dirUsed); return null; }
    const entries = fs.readdirSync(dirUsed, { withFileTypes: true });
    const pmx = entries.find(f => f.isFile() && f.name.toLowerCase().endsWith('.pmx'));
    if (!pmx) { log('[壁纸] 默认目录无 .pmx 文件'); return null; }
    cleanPetTmpDir();
    // [2026-10-02 安全加固] basename 消毒：目录名来自本地扫描，仍防路径穿越写入 pet-tmp
    const modelFileName = path.basename(pmx.name);
    fs.writeFileSync(path.join(PET_TMP_DIR, modelFileName), fs.readFileSync(path.join(dirUsed, modelFileName)));
    const textureMetas = [];
    let texIdx = 0;
    for (const sub of ['textures', 'spa', 'extra']) {
      const subDir = path.join(dirUsed, sub);
      if (!fs.existsSync(subDir)) continue;
      for (const f of fs.readdirSync(subDir, { withFileTypes: true })) {
        if (!f.isFile()) continue;
        const ext = path.extname(f.name) || '.png';
        const diskName = 'tex_' + texIdx + ext;
        try {
          fs.writeFileSync(path.join(PET_TMP_DIR, diskName), fs.readFileSync(path.join(subDir, f.name)));
          textureMetas.push({
            name: f.name,
            path: sub + '/' + f.name,
            webkitRelativePath: sub + '/' + f.name,
            url: 'http://127.0.0.1:' + UI_PORT + '/pet-tmp/' + encodeURIComponent(diskName) + '?' + petModelStamp(),
          });
          texIdx++;
        } catch (e) { log('[壁纸] 贴图写入失败 ' + f.name + ': ' + e.message); }
      }
    }
    petModelData = {
      name: modelFileName,
      modelWebkitRelativePath: modelFileName,
      url: 'http://127.0.0.1:' + UI_PORT + '/pet-tmp/' + encodeURIComponent(modelFileName) + '?' + petModelStamp(),
      textureFiles: textureMetas,
    };
    log('[壁纸] 默认模型已自动加载: ' + modelFileName + ', 贴图 ' + textureMetas.length + ' 个');
    return petModelData;
  } catch (e) { log('[壁纸] 默认模型加载异常: ' + e.message); return null; }
}

// F11 全局拦截："管他怎么进的"——主窗口/壁纸窗口统一在此分流
//   壁纸窗口 F11 → 退出壁纸模式；其他窗口 F11 → 进入壁纸模式
// [v62c] F11 系统级全局热键：主窗口隐藏（壁纸模式中）时 before-input-event 收不到按键，
//   必须用 globalShortcut 才能在任何焦点状态下切换。toggle 语义：进入↔退出。
app.whenReady().then(() => {
  try {
    const ok = globalShortcut.register('F11', () => {
      try {
        if (wallpaperWindow && !wallpaperWindow.isDestroyed()) {
          log('[壁纸][F11-全局] 退出壁纸模式');
          exitWallpaperMode().catch((e) => log('[壁纸][F11-全局] 退出失败: ' + e.message));
        } else {
          log('[壁纸][F11-全局] 进入壁纸模式');
          enterWallpaperMode().catch((e) => log('[壁纸][F11-全局] 进入失败: ' + e.message));
        }
      } catch (e) { log('[壁纸][F11-全局] 异常: ' + e.message); }
    });
    log('[壁纸][F11] 全局热键注册: ' + (ok ? '成功' : '失败（可能被其他程序占用）'));
  } catch (e) { log('[壁纸][F11] globalShortcut 注册异常: ' + e.message); }
  // [2026-09-10 壁纸转屏] ready 后再碰 screen（模块顶层调用会崩：can't be used before ready）
  try { registerWallpaperDisplayHooks(); } catch (e) { log('[壁纸] display 钩子注册失败: ' + e.message); }
});

app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch (e) { /* noop */ } });

app.on('web-contents-created', (_e, wc) => {
  wc.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      const isWallpaperWin = wallpaperWindow && !wallpaperWindow.isDestroyed() && wallpaperWindow.webContents === wc;
      log('[壁纸][F11] 触发，isWallpaperWin=' + isWallpaperWin);
      if (isWallpaperWin) {
        exitWallpaperMode().catch((e) => log('[壁纸][F11] 退出失败: ' + e.message));
      } else {
        enterWallpaperMode().catch((e) => log('[壁纸][F11] 进入失败: ' + e.message));
      }
    }
  });
});
let uiServer = null;
let backendProc = null;
let webhookProc = null;  // wechatbot-webhook 子进程

// ========== 工具函数 ==========

/**
 * [v61c] 桌宠模型 URL 防缓存时间戳
 * 被 desktop-pet:show 中引用但从未定义，导致 ReferenceError 中断桌宠加载流程
 * 用途：给 pet-tmp 静态资源 URL 追加查询参数，强制浏览器绕过缓存
 */
function petModelStamp() {
  return Date.now();
}


// [v128] 局域网访问相关函数/IPC 已删除（死代码清理）
// [2026-08-06 日志] 同时输出到 console 和文件，方便验证启动链路
// 日志文件在 exe 同级 app-debug.log（打包）或工作区 .electron-userdata/app-debug.log（开发）
const LOG_FILE = isPackaged
  ? path.join(path.dirname(process.execPath), 'app-debug.log')
  : path.join(USER_DATA_DIR, 'app-debug.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] [main] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (e) { /* 忽略写入失败 */ }
}

/**
 * 启动内嵌静态文件服务（端口5175）
 * 用原生 http 模块，避免依赖 express
 */
// [v105/v107/v117] Edge Web Speech 桥：无窗口服务 + 统一 control
// enabled=false → 识别页不吐字；muted → 同；stop → 关 Edge
const speechBridgeQueue = [];
let speechBridgeSeq = 0;
let speechBridgeEdgeProc = null;
const speechBridgeControl = { enabled: false, muted: false, lang: 'zh-CN' };
const speechBridgeStatus = { listening: false, micOk: false, error: '', lang: 'zh-CN' };
// [v176] 语音桥「常驻 + 实时上屏」所需状态：
//   speechBridgeLastSeen —— 识别页心跳时间戳（页面每 2s POST /status）。用它判活，
//     而不是靠进程句柄 —— spawn 出来的其实是启动器，它把窗口交接给已有 Edge 实例后
//     立刻 exit 0，我们却在 exit 回调里把 speechBridgeEdgeProc 清空 → 下次点麦克风又 spawn
//     → 识别页越点越多、多个页面同时抢麦（2026-09-20 实测 2 个 renderer / 502MB）。
//   speechBridgeInterim —— 实时中间结果（边说边出字）。只保留最新一条，不需要队列。
let speechBridgeLastSeen = 0;
const speechBridgeInterim = { id: 0, text: '', ts: 0 };
// [v180] 防多开 + final 后处理状态：
//   speechBridgeSpawnPending —— 一次 spawn 全流程（清旧页→spawn→等首跳）未完成前，所有 ensure 一律跳过。
//     实锤（2026-09-20 23:32）：间隔 4 秒两次 ensure-start，第一页还没来得及发首次心跳，
//     第二次 ensure 判「不活」又拉一个 → 双页同时抢麦 → final 重复（20:17 还出现过 63ms 内 4 条「你好」风暴）。
//   sbLastFinalText/Ts —— final 短窗去重（多开页/识别重启回声会把同一句话推两遍）。
let speechBridgeSpawnPending = false;
let speechBridgeLastSpawnAt = 0;
let sbLastFinalText = '';
let sbLastFinalTs = 0;
// [v180] final 统一后处理（所有消费端共用）：专名/同音字纠错。
//   实测识别器对中英混说专名极易翻车：DeepSeek Harness → "deep thick Hammers" / "Lipstick hummus"。
function speechBridgeFixText(t) {
  let s = String(t || '').trim();
  const rules = [
    [/deep\s?thick\s?hammers|lipstick\s?hummus|deep\s?seek\s?hann?ess|deepseek\s?hann?ess|迪普西克[·•]?哈尼斯/gi, 'DeepSeek Harness'],
    [/deep\s?seek|迪普西克/gi, 'DeepSeek'],
    [/软林云|阮林云|阮玲云|阮琳芸|软琳云/g, '阮琳云'],
    [/只能助手|智能住手/g, '智能助手'],
    [/阴乐|因乐/g, '音乐'],
    [/帮住|邦助/g, '帮助'],
    [/摸型|磨型/g, '模型'],
    [/认务/g, '任务'],
  ];
  for (const [re, rep] of rules) s = s.replace(re, rep);
  return s;
}
// [v147] 语音服务总开关：开=起 TTS+识别桥；关=全部杀掉，避免后台常驻拖死电脑
const VOICE_PREF_FILE = path.join(USER_DATA_DIR || __dirname, 'voice-service.json');
function readVoicePrefEnabled() {
  // [v176] 文件缺失 = 默认开启。理由：设置页的「语音服务」总开关早在 v150 就下线了，
  //   用户没有任何入口能把它打开；若默认关，识别页就只能等点麦克风时才冷启动
  //   （实测 2~5 秒，这就是"语音这么慢"的主因之一）。现在默认常驻，点麦克风秒开。
  try {
    if (!fs.existsSync(VOICE_PREF_FILE)) return true;
    const raw = fs.readFileSync(VOICE_PREF_FILE, 'utf8').replace(/^\uFEFF/, '');  // 防 BOM 导致解析失败
    return JSON.parse(raw).enabled !== false;
  } catch { return true; }
}
function writeVoicePrefEnabled(enabled) {
  try {
    fs.mkdirSync(path.dirname(VOICE_PREF_FILE), { recursive: true });
    fs.writeFileSync(VOICE_PREF_FILE, JSON.stringify({ enabled: !!enabled, updatedAt: Date.now() }), 'utf8');
  } catch (e) { log('[VoicePref] write fail: ' + e.message); }
}

// [v175] DSH 常驻服务开关（通用设置里的那个小开关）
//   默认 ON = 现状：软件退出后 DSH 继续后台常驻（托盘图标代表它），下次打开软件秒开。
//   OFF  = 取消常驻：软件退出时 DSH 一并退出（不保活、不留后台），下次启动需重新冷启动（约 30 秒）；
//          软件运行期间功能不受影响（不在这里杀 DSH，避免"关个开关把正在用的 DSH 页面搞死"）。
const DSH_RESIDENT_PREF_FILE = path.join(USER_DATA_DIR || __dirname, 'dsh-resident.json');
function readDshResidentEnabled() {
  try {
    if (!fs.existsSync(DSH_RESIDENT_PREF_FILE)) return true;   // 默认开启
    // [v175.2] 容错：文件可能被外部工具写成「带 BOM 的 UTF-8」（PowerShell 5.1 的 -Encoding utf8 就会），
    //   带 BOM 时 JSON.parse 直接抛异常 → 旧逻辑静默回退"开"，用户关了开关却不生效、极难排查。
    //   这里先剥掉 BOM 再解析（软件自己写的一直是无 BOM，双保险）。
    const raw = fs.readFileSync(DSH_RESIDENT_PREF_FILE, 'utf8').replace(/^\uFEFF/, '').trim();
    return JSON.parse(raw).enabled !== false;
  } catch { return true; }
}
function writeDshResidentEnabled(enabled) {
  try {
    fs.mkdirSync(path.dirname(DSH_RESIDENT_PREF_FILE), { recursive: true });
    fs.writeFileSync(DSH_RESIDENT_PREF_FILE, JSON.stringify({ enabled: !!enabled, updatedAt: Date.now() }), 'utf8');
    return true;
  } catch (e) { log('[DshResident] write fail: ' + e.message); return false; }
}

function speechBridgePush(item) {
  speechBridgeSeq += 1;
  const row = { id: speechBridgeSeq, ts: Date.now(), text: item.text, lang: item.lang || '' };
  speechBridgeQueue.push(row);
  while (speechBridgeQueue.length > 50) speechBridgeQueue.shift();
  return row;
}

/**
 * [v119 可移植] 查找可用浏览器（Edge 优先，Chrome 兜底）
 * Win10/Win11、x86/x64、便携版/用户目录均覆盖；注册表 App Paths 作为补充。
 */
function findBrowserExe() {
  const local = process.env.LOCALAPPDATA || '';
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const candidates = [
    `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
    local ? `${local}\\Microsoft\\Edge\\Application\\msedge.exe` : '',
    `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
    `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
    local ? `${local}\\Google\\Chrome\\Application\\chrome.exe` : '',
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (c && fs.existsSync(c)) return { exe: c, kind: /msedge/i.test(c) ? 'edge' : 'chrome' }; } catch (e) { /* noop */ }
  }
  // 注册表
  try {
    const { execSync } = require('child_process');
    const reg = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe" /ve',
      { encoding: 'utf8', windowsHide: true, timeout: 3000 }
    );
    const m = reg.match(/REG_SZ\s+(.+\.exe)/i);
    if (m && fs.existsSync(m[1].trim())) return { exe: m[1].trim(), kind: 'edge' };
  } catch (e) { /* noop */ }
  try {
    const { execSync } = require('child_process');
    const reg = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve',
      { encoding: 'utf8', windowsHide: true, timeout: 3000 }
    );
    const m = reg.match(/REG_SZ\s+(.+\.exe)/i);
    if (m && fs.existsSync(m[1].trim())) return { exe: m[1].trim(), kind: 'chrome' };
  } catch (e) { /* noop */ }
  return null;
}

/** 兼容旧名 */
function findEdgeExe() {
  const b = findBrowserExe();
  return b ? b.exe : null;
}

/**
 * [v119] 预写 Windows 麦克风 ConsentStore（HKCU，一般不需要管理员）
 * 替代用户在首次弹窗里手点「允许」；企业策略禁改时返回 false，由浏览器 fake-ui 兜底。
 */
function grantMicConsent(browserExe) {
  // [v180] 改异步 fire-and-forget：原 execFileSync 在主进程上同步跑 PowerShell，
  //   实测一次 ~8 秒（极限 10s 超时）—— 这期间整个软件事件循环被冻住（点麦克风「没反应」的元凶之一）。
  //   预授权是纯优化（结果无人消费，fake-ui 本来就兜底），没有理由同步等它。
  try {
    const { exec } = require('child_process');
    const ps = `
$ErrorActionPreference='SilentlyContinue'
$mic='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone'
if (-not (Test-Path $mic)) { New-Item -Path $mic -Force | Out-Null }
Set-ItemProperty -Path $mic -Name 'Value' -Value 'Allow'
$apps=@(
  '${String(browserExe || '').replace(/'/g, "''")}',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\Administrator\\Desktop\\kks\\阮琳云智能助手.exe'
)
$non="$mic\\NonPackaged"
if (-not (Test-Path $non)) { New-Item -Path $non -Force | Out-Null }
foreach ($a in $apps) {
  if (-not $a -or -not (Test-Path $a)) { continue }
  $rel=$a -replace '\\\\','#'
  $key=Join-Path $non $rel
  if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
  Set-ItemProperty -Path $key -Name 'Value' -Value 'Allow'
  # LastUsedTimeStart=0 表示未使用过；删除则下次系统可重记，不影响 Allow
}
Write-Output 'OK'
`;
    const encoded = Buffer.from(ps, 'utf16le').toString('base64');
    // [2026-10-02 安全加固] 参数数组化传递（execFile），不再拼接命令行字符串
    const { execFile: execFileMic } = require('child_process');
    execFileMic('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { windowsHide: true, timeout: 10000 },
      (err, out) => {
        if (err) log('[SpeechBridge] mic consent fail: ' + err.message);
        else log('[SpeechBridge] mic consent pre-grant: ' + String(out || '').trim());
      });
    return true;
  } catch (e) {
    log('[SpeechBridge] mic consent fail: ' + e.message);
    return false;
  }
}

function startSpeechBridgeEdge(lang) {
  const browser = findBrowserExe();
  if (!browser || !browser.exe) {
    log('[SpeechBridge] 未找到 Edge/Chrome 可执行文件');
    return { success: false, error: 'Browser not found (Edge/Chrome)' };
  }
  const edge = browser.exe;
  if (lang) speechBridgeControl.lang = lang;
  // [v119] 换机首次使用：预授权麦克风，减少手点权限
  try { grantMicConsent(edge); } catch (e) { /* noop */ }
  // [v176] 复用判据改为「识别页是否还活着」（看心跳），不再看启动器句柄 —— 启动器总是很快 exit。
  //   判活正确之后，点麦克风不会再重复拉起识别页（此前每次点击都多开一个：实测累积 2 个页面同时抢麦、
  //   识别结果重复、Edge 常驻 502MB）。
  if (isSpeechBridgePageAlive()) {
    log('[SpeechBridge] 识别页存活（心跳新鲜），不重复拉起');
    return { success: true, reused: true, exe: edge, kind: browser.kind };
  }
  // [v180] 闸1：已有一次 spawn 全流程在进行（清旧页+等首跳），一律跳过，杜绝并发双开。
  if (speechBridgeSpawnPending) {
    log('[SpeechBridge] 已有拉起在进行（清页/等首跳），跳过重复 spawn');
    return { success: true, reused: true, starting: true, exe: edge, kind: browser.kind };
  }
  speechBridgeSpawnPending = true;
  const url = `http://127.0.0.1:${UI_PORT}/speech-bridge.html?lang=${encodeURIComponent(speechBridgeControl.lang || 'zh-CN')}`;
  // [2026-10-02 安全加固] url/speechProfile 拼入启动参数前的白名单守卫（只允许本机 UI 端口 + 固定 profile 路径）
  if (!/^http:\/\/127\.0\.0\.1:\d+\/speech-bridge\.html\?lang=[A-Za-z0-9\-_%]+$/.test(url)) {
    speechBridgeSpawnPending = false;
    log('[SpeechBridge] url 守卫未过，取消拉起: ' + url);
    return false;
  }
  try {
    const { spawn } = require('child_process');
    // [v108] 默认 profile 保留麦克风授权；[v119] fake-ui 自动应答首次权限弹窗（仍是真麦克风）
    // [v119b] 独立 user-data-dir：避免 Chromium 单例导致 spawn 立刻 exit 0、识别页未真正打开
    const speechProfile = 'C:\\RUANLINYUN\\.speech-bridge-profile';
    // [v180] 闸2：spawn 前先精确清掉所有旧识别页 —— 心跳过期 ≠ 旧页真死了（可能僵着），
    //   直接再 spawn 必然双页抢麦。清完（异步回调）再拉新页，保证任意时刻至多一个识别页。
    killSpeechBridgeBrowsers(() => {
      try { fs.mkdirSync(speechProfile, { recursive: true }); } catch (e) { /* noop */ }
      speechBridgeLastSpawnAt = Date.now();
      try {
        speechBridgeEdgeProc = spawn(edge, [
        '--app=' + url,
        '--user-data-dir=' + speechProfile,
        '--window-position=-32000,-32000',
        '--window-size=240,80',
        '--no-first-run',
        '--no-default-browser-check',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
        // [v176] 冷启动瘦身：识别页是纯后台窗口，关掉扩展/组件更新/后台联网/同步等一整套启动开销
        '--disable-extensions',
        '--disable-component-update',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-default-apps',
        '--no-service-autorun',
        '--disable-features=Translate,MediaRouter,OptimizationHints',
        // [v176c] 识别页是永久隐藏窗口，Chromium 默认对「隐藏>5min」的页面做 intensive throttling
        //   （定时器压到 ~1 次/分钟）→ 心跳停摆被误判死亡 → 重复拉起多开。三件套关掉节流，
        //   页面里另有 Web Worker 心跳兜底（v176c），双保险。
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ], {
        stdio: 'ignore',
        windowsHide: true,
      });
        speechBridgeEdgeProc.on('exit', (code) => {
          // [v176] 启动器退出 ≠ 识别页没了：Chromium 会把 --app 窗口交接给已有实例后让启动器 exit 0。
          //   「是否还活着」一律由心跳判定，这里只记录日志并清掉句柄。
          log('[SpeechBridge] launcher exit code=' + code);
          speechBridgeEdgeProc = null;
        });
        log('[SpeechBridge] started ' + browser.kind + ' url=' + url + ' PID=' + speechBridgeEdgeProc.pid + ' exe=' + edge);
      } catch (e) {
        log('[SpeechBridge] start fail: ' + e.message);
      } finally {
        speechBridgeSpawnPending = false;
        // [v180] 闸3：拉起后 9 秒仍无心跳 = 这次没拉起来 → 解除冷却，允许下次 ensure 重试。
        setTimeout(() => {
          if (!isSpeechBridgePageAlive()) {
            speechBridgeLastSpawnAt = 0;
            log('[SpeechBridge] 拉起后未见心跳，冷却解除（下次 ensure 可重试）');
          }
        }, 9000);
      }
    });
    return { success: true, starting: true, url, exe: edge, kind: browser.kind };
  } catch (e) {
    speechBridgeSpawnPending = false;
    log('[SpeechBridge] start fail: ' + e.message);
    return { success: false, error: e.message };
  }
}

function stopSpeechBridgeEdge() {
  speechBridgeControl.enabled = false;
  speechBridgeControl.muted = false;
  // [v176] 只 kill() 启动器句柄是杀不掉识别页的 —— 启动器进程早就 exit 了，
  //   真正在跑的是它交接出去的那个 Edge 浏览器进程。改为按 --user-data-dir 精确清理。
  killSpeechBridgeBrowsers();
  return { success: true };
}

/** [v176] 识别页是否还活着 —— 看心跳，不看进程句柄（理由见 speechBridgeLastSeen 注释） */
function isSpeechBridgePageAlive() {
  return Date.now() - speechBridgeLastSeen < 8000;
}

/** [v176] 确保识别页存在（常驻语义）：活着就什么都不做，没活才拉起一个。
 *  这样点麦克风时页面已就绪 → 不再有 2~5 秒的 Edge 冷启动等待。 */
function ensureSpeechBridgeAlive(lang) {
  if (isSpeechBridgePageAlive()) return { success: true, reused: true, pid: speechBridgeEdgeProc ? speechBridgeEdgeProc.pid : undefined };
  return startSpeechBridgeEdge(lang || speechBridgeControl.lang || 'zh-CN');
}

/** [v176] 精确清理语音专用 Edge。
 *  只按命令行里的 --user-data-dir=...\.speech-bridge-profile 匹配，绝不碰用户自己的 Edge 窗口。
 *  清理后 lastSeen 归零，下一次 ensure 会重新拉起唯一一个实例。 */
function killSpeechBridgeBrowsers(done) {
  const finish = () => {
    speechBridgeLastSeen = 0;
    speechBridgeEdgeProc = null;
    if (typeof done === 'function') { try { done(); } catch (e) { log('[SpeechBridge] 清理回调异常: ' + e.message); } }
  };
  try {
    const { exec } = require('child_process');
    const psCmd = "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { $_.CommandLine -match 'speech-bridge-profile' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    // [v176b] 必须用 -EncodedCommand（Base64 / UTF-16LE）传脚本。
    //   踩过的坑：写成 -Command "…" 时，脚本内部 -Filter "Name='msedge.exe'" 的双引号会把外层引号
    //   提前闭合 → PowerShell 只收到半截命令 → 清理静默失败（实测日志 "err Command failed"）。
    const encoded = Buffer.from(psCmd, 'utf16le').toString('base64');
    exec('powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ' + encoded,
      { timeout: 20000, windowsHide: true },
      (err) => {
        log('[SpeechBridge] 清理语音专用 Edge: ' + (err ? 'err ' + err.message : 'ok'));
        finish();
      });
  } catch (e) {
    log('[SpeechBridge] 清理异常: ' + e.message);
    finish();
  }
}

function setSpeechBridgeControl(patch) {
  if (!patch || typeof patch !== 'object') return { ...speechBridgeControl };
  if (patch.enabled !== undefined) speechBridgeControl.enabled = !!patch.enabled;
  if (patch.muted !== undefined) speechBridgeControl.muted = !!patch.muted;
  if (patch.lang) speechBridgeControl.lang = String(patch.lang);
  log('[SpeechBridge] control ' + JSON.stringify(speechBridgeControl));
  return { ...speechBridgeControl };
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(FRONTEND_DIST)) {
      reject(new Error(`Frontend dist not found: ${FRONTEND_DIST}`));
      return;
    }

    const MIME = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.wasm': 'application/wasm',
      '.map': 'application/json',
      '.ttf': 'font/ttf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };

    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent(req.url.split('?')[0]);
        if (urlPath === '/') urlPath = '/index.html';

        // [2026-08-06 桌宠文件中转] /pet-tmp/ 路由：映射到桌宠临时目录
        // 桌宠窗口通过 fetch('http://127.0.0.1:5175/pet-tmp/xxx') 获取模型/贴图 ArrayBuffer
        // 这样绕过 IPC ArrayBuffer 传输，100% 可靠
        if (urlPath.startsWith('/pet-tmp/')) {
          const subPath = urlPath.slice('/pet-tmp/'.length);
          // 安全：防止路径穿越（含 .. 或盘符）
          if (subPath.includes('..') || path.isAbsolute(subPath)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }
          const tmpFilePath = path.join(PET_TMP_DIR, subPath);
          if (!tmpFilePath.startsWith(PET_TMP_DIR)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }
          if (!fs.existsSync(tmpFilePath) || fs.statSync(tmpFilePath).isDirectory()) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          const ext = path.extname(tmpFilePath).toLowerCase();
          const contentType = MIME[ext] || 'application/octet-stream';
          const data = fs.readFileSync(tmpFilePath);
          // 临时文件不缓存（每次 show 会清空重写）
          res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
          res.end(data);
          return;
        }

        // [v105/v117] Edge 语音桥 API（与静态服务同源 5175）
        // [v151] CORS：DSH iframe(5190) 需要访问语音桥
        const speechCors = {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        };
        // [v181] DSH pet-mcp 捷径通道：转发到主进程白名单核心函数（mediaPlayCore / appLaunchCore）
        if (urlPath === '/api/ipc/media-play' && req.method === 'OPTIONS') { res.writeHead(204, speechCors); res.end(); return; }
        if (urlPath === '/api/ipc/app-launch' && req.method === 'OPTIONS') { res.writeHead(204, speechCors); res.end(); return; }
        if (urlPath === '/api/ipc/media-play' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
          req.on('end', async () => {
            let action = 'play';
            try { const j = JSON.parse(body || '{}'); if (j && j.action) action = j.action; } catch (e0) { /* noop */ }
            try {
              const r = await mediaPlayCore({ action });
              res.writeHead(200, speechCors); res.end(JSON.stringify(r));
            } catch (e) { res.writeHead(500, speechCors); res.end(JSON.stringify({ ok: false, error: String(e.message || e) })); }
          });
          return;
        }
        if (urlPath === '/api/ipc/app-launch' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
          req.on('end', async () => {
            let target = '';
            try { const j = JSON.parse(body || '{}'); if (j && j.target) target = String(j.target); } catch (e0) { /* noop */ }
            try {
              const r = await appLaunchCore(target);
              res.writeHead(200, speechCors); res.end(JSON.stringify(r));
            } catch (e) { res.writeHead(500, speechCors); res.end(JSON.stringify({ ok: false, error: String(e.message || e) })); }
          });
          return;
        }
        // [v190] DSH 密钥端点（仅本机回环）：dshHarness 启动 DSH 前拉取解密后的 env
        if (urlPath === '/api/ipc/dsh-env' && req.method === 'OPTIONS') { res.writeHead(204, speechCors); res.end(); return; }
        if (urlPath === '/api/ipc/dsh-env' && req.method === 'POST') {
          // 防外泄：拒绝非本机来源（5175 本就绑 127.0.0.1，双保险）
          const remote = (req.socket && req.socket.remoteAddress) || '';
          if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(remote)) {
            res.writeHead(403, speechCors); res.end(JSON.stringify({ ok: false, error: 'forbidden' }));
            return;
          }
          try {
            const r = v190_getDshEnv();
            res.writeHead(200, speechCors); res.end(JSON.stringify({ ok: true, env: r.env, from: r.from }));
          } catch (e) { res.writeHead(500, speechCors); res.end(JSON.stringify({ ok: false, error: String(e.message || e) })); }
          return;
        }
        // [v190] 设置页换 key：重新加密金库
        if (urlPath === '/api/ipc/dsh-key' && req.method === 'OPTIONS') { res.writeHead(204, speechCors); res.end(); return; }
        if (urlPath === '/api/ipc/dsh-key' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; if (body.length > 8192) req.destroy(); });
          req.on('end', async () => {
            try {
              const j = JSON.parse(body || '{}');
              const patch = {};
              if (j.DEEPSEEK_API_KEY) patch.DEEPSEEK_API_KEY = String(j.DEEPSEEK_API_KEY).trim();
              if (j.DEEPSEEK_BASE_URL) patch.DEEPSEEK_BASE_URL = String(j.DEEPSEEK_BASE_URL).trim();
              if (j.DEEPSEEK_MODEL) patch.DEEPSEEK_MODEL = String(j.DEEPSEEK_MODEL).trim();
              const r = v190_updateDshEnv(patch);
              res.writeHead(200, speechCors); res.end(JSON.stringify(r));
            } catch (e) { res.writeHead(500, speechCors); res.end(JSON.stringify({ ok: false, error: String(e.message || e) })); }
          });
          return;
        }
        // [v189] 记忆卡片端点（pet-mcp memory_save/list/forget 走此通道）
        if (urlPath === '/api/ipc/memory' && req.method === 'OPTIONS') { res.writeHead(204, speechCors); res.end(); return; }
        if (urlPath === '/api/ipc/memory' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; if (body.length > 65536) req.destroy(); });
          req.on('end', async () => {
            let action = '', payload = {};
            try { const j = JSON.parse(body || '{}'); action = String(j.action || ''); payload = j || {}; } catch (e0) { /* noop */ }
            try {
              const r = await memoryCore(action, payload);
              if (r.ok && (action === 'save' || action === 'forget')) { try { v189_refreshAgentsProfile(); } catch (eP) { /* noop */ } }
              res.writeHead(200, speechCors); res.end(JSON.stringify(r));
            } catch (e) { res.writeHead(500, speechCors); res.end(JSON.stringify({ ok: false, error: String(e.message || e) })); }
          });
          return;
        }
        if (urlPath.startsWith('/api/speech-bridge/') && req.method === 'OPTIONS') {
          res.writeHead(204, speechCors);
          res.end();
          return;
        }
        // [v151] 确保 Edge 识别进程起来 + 打开识别（麦克风点击用）
        if (urlPath === '/api/speech-bridge/ensure-start' && req.method === 'POST') {
          try {
            // [v176] 常驻语义：识别页活着就秒开（不再等 Edge 冷启动 2~5 秒），没活才拉一个
            ensureSpeechBridgeAlive('zh-CN');
            const st = setSpeechBridgeControl({ enabled: true, muted: false, lang: 'zh-CN' });
            res.writeHead(200, speechCors);
            res.end(JSON.stringify({ ok: true, started: true, ...st }));
          } catch (e) {
            res.writeHead(500, speechCors);
            res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
          }
          return;
        }
        if (urlPath === '/api/speech-bridge/stop' && req.method === 'POST') {
          try {
            const st = setSpeechBridgeControl({ enabled: false, muted: false });
            res.writeHead(200, speechCors);
            res.end(JSON.stringify({ ok: true, ...st }));
          } catch (e) {
            res.writeHead(500, speechCors);
            res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
          }
          return;
        }
        if (urlPath === '/api/speech-bridge/final' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; if (body.length > 8192) req.destroy(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const text = String(data.text || '').trim();
              if (!text) {
                res.writeHead(400, speechCors);
                res.end(JSON.stringify({ ok: false, error: 'empty text' }));
                return;
              }
              if (!speechBridgeControl.enabled || speechBridgeControl.muted) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, ignored: true, reason: !speechBridgeControl.enabled ? 'disabled' : 'muted' }));
                return;
              }
              // [v180] 统一后处理：专名/同音字纠错 + 短窗去重（多开页/重启回声会把同一句推两遍）
              const fixed = speechBridgeFixText(text);
              const now = Date.now();
              if (fixed && fixed === sbLastFinalText && now - sbLastFinalTs < 2500) {
                log('[SpeechBridge] final 去重丢弃 :: ' + fixed.slice(0, 40));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, deduped: true }));
                return;
              }
              sbLastFinalText = fixed;
              sbLastFinalTs = now;
              const row = speechBridgePush({ text: fixed, lang: data.lang });
              log('[SpeechBridge] final #' + row.id + ' lang=' + row.lang + ' :: ' + fixed.slice(0, 80));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, id: row.id }));
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
            }
          });
          return;
        }
        if (urlPath === '/api/speech-bridge/control' && req.method === 'GET') {
          res.writeHead(200, speechCors);
          res.end(JSON.stringify({ ok: true, ...speechBridgeControl }));
          return;
        }
        if (urlPath === '/api/speech-bridge/control' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; if (body.length > 2048) req.destroy(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const st = setSpeechBridgeControl(data);
              res.writeHead(200, speechCors);
              res.end(JSON.stringify({ ok: true, ...st }));
            } catch (e) {
              res.writeHead(400, speechCors);
              res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
            }
          });
          return;
        }
        // [v176] 实时中间结果通道 —— 识别页边说边推，前端据此"边说边出字"。
        //   以前只有 final 才有通道，interim 只画在那个隐藏小窗里，所以文字总是整句蹦出来。
        if (urlPath === '/api/speech-bridge/interim' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; if (body.length > 8192) req.destroy(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              if (!speechBridgeControl.enabled || speechBridgeControl.muted) {
                res.writeHead(200, speechCors);
                res.end(JSON.stringify({ ok: true, ignored: true }));
                return;
              }
              speechBridgeInterim.id += 1;
              speechBridgeInterim.text = String(data.text || '');
              speechBridgeInterim.ts = Date.now();
              res.writeHead(200, speechCors);
              res.end(JSON.stringify({ ok: true, id: speechBridgeInterim.id }));
            } catch (e) {
              res.writeHead(400, speechCors);
              res.end(JSON.stringify({ ok: false }));
            }
          });
          return;
        }
        if (urlPath === '/api/speech-bridge/interim' && req.method === 'GET') {
          res.writeHead(200, speechCors);
          res.end(JSON.stringify({
            ok: true,
            id: speechBridgeInterim.id,
            text: speechBridgeInterim.text,
            ts: speechBridgeInterim.ts,
            enabled: speechBridgeControl.enabled,
            muted: speechBridgeControl.muted,
          }));
          return;
        }
        if (urlPath === '/api/speech-bridge/final' && req.method === 'GET') {
          const u = new URL(req.url, 'http://127.0.0.1');
          const after = Number(u.searchParams.get('after') || '0') || 0;
          const items = speechBridgeQueue.filter((r) => r.id > after);
          res.writeHead(200, speechCors);
          res.end(JSON.stringify({ ok: true, seq: speechBridgeSeq, items }));
          return;
        }
        if (urlPath === '/api/speech-bridge/status' && req.method === 'GET') {
          res.writeHead(200, speechCors);
          res.end(JSON.stringify({
            ok: true,
            ...speechBridgeStatus,
            ...speechBridgeControl,
            pageAlive: isSpeechBridgePageAlive(),
            lastSeen: speechBridgeLastSeen,
          }));
          return;
        }
        if (urlPath === '/api/speech-bridge/status' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; if (body.length > 2048) req.destroy(); });
          req.on('end', () => {
            try {
              const d = JSON.parse(body || '{}');
              speechBridgeStatus.listening = !!d.listening;
              speechBridgeStatus.micOk = !!d.micOk;
              speechBridgeStatus.error = String(d.error || '');
              if (d.lang) speechBridgeStatus.lang = String(d.lang);
              // [v176] 心跳打点 —— 这是判断「识别页还活着」的唯一依据（不再依赖进程句柄）
              speechBridgeLastSeen = Date.now();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false }));
            }
          });
          return;
        }

        // 安全：防止路径穿越
        const filePath = path.join(FRONTEND_DIST, urlPath);
        if (!filePath.startsWith(FRONTEND_DIST)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        // 文件不存在 → 回退到 index.html（SPA 路由）
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          const indexPath = path.join(FRONTEND_DIST, 'index.html');
          if (fs.existsSync(indexPath)) {
            const html = fs.readFileSync(indexPath);
            res.writeHead(200, { 'Content-Type': MIME['.html'] });
            res.end(html);
            return;
          }
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME[ext] || 'application/octet-stream';
        const data = fs.readFileSync(filePath);
        // [2026-08-05 启动优化] 带hash的资源（assets/）长期缓存，index.html 不缓存
        // 原因：Vite 构建的资源文件名含 content hash，内容变化时 hash 变化→浏览器重新请求
        // 长期缓存让 Electron 二次启动时直接用本地缓存，跳过下载/解析，秒开
        // [2026-10-01 收编 kks 09-23 本地改动] assets 也用 no-cache：前端频繁热更部署，
        //   immutable 长缓存会让 kks 侧 index/资产不同步（diff 见 00-工程变更记录 2026-09-25 条）
        const cacheControl = urlPath.startsWith('/assets/')
          ? 'no-cache'
          : 'no-cache';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
        });
        res.end(data);
      } catch (err) {
        res.writeHead(500);
        res.end(`Server error: ${err.message}`);
      }
    });

    server.on('error', (err) => {
      // [2026-08-25 修复-2 端口冲突兜底] 不再 FATAL 连锁杀进程：提示后本实例退出
      if (err && err.code === 'EADDRINUSE') {
        log(`[启动] 端口 ${UI_PORT} 已被占用（已有实例在运行？），本实例退出。`);
        app.exit(0);
      } else {
        reject(err);
      }
    });
    // [v61] 局域网启动：根据设置开关决定绑定地址
    // 默认启用 LAN（0.0.0.0），若用户关闭则绑定 127.0.0.1
    // [v120] 局域网访问已移除：5175 仅绑定本机
    const bindAddr = '127.0.0.1'; // [v183-T3] 局域网方案已被用户否决：PC 恒本机
    server.listen(UI_PORT, bindAddr, () => {
      log(`UI static server running at http://${bindAddr}:${UI_PORT}（仅本机访问）`);
      resolve(server);
    });
  });
}

/**
 * 启动后端 API 子进程（端口27865）
 * 后端是 Node.js 服务，用子进程启动
 *
 * 关键修复：
 * 1. 设置 ELECTRON_RUN_AS_NODE=1，让 Electron exe 以纯 Node.js 模式运行
 *    （否则 Electron 会尝试初始化 GUI 环境，与主窗口冲突）
 * 2. cwd 设置为 backend-node_modules 的父目录，让 require 能向上找到 node_modules
 *    （Node.js 模块解析：从 cwd 向上查找 node_modules）
 */

// [v61e] 等待后端 API 就绪（轮询 /health）
// 根因：后端 spawn 后立即启动 Vosk(1.3GB)/TTS 会与后端 require(446包) 抢磁盘 IO，
//       老电脑上后端被拖慢到 60+ 秒才 ready，前端探测失败降级 localStorage。
// 策略：启动语音服务前先等后端就绪（最多 timeoutMs），后端独占 IO 约 12 秒可就绪。
function waitForBackendReady(timeoutMs) {
  return new Promise((resolve) => {
    const http = require('http');
    const start = Date.now();
    const tryOnce = () => {
      const req = http.get({ host: '127.0.0.1', port: 27865, path: '/health', timeout: 2000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('timeout', () => { req.destroy(); scheduleRetry(); });
      req.on('error', () => { scheduleRetry(); });
      function scheduleRetry() {
        if (Date.now() - start > timeoutMs) { resolve(false); return; }
        setTimeout(tryOnce, 1000);
      }
    };
    tryOnce();
  });
}

function startBackend() {
  const serverPath = path.join(BACKEND_DIST, 'server.js');
  if (!fs.existsSync(serverPath)) {
    log(`[WARN] Backend server.js not found at ${serverPath}, skipping backend`);
    return null;
  }

  try {
    const { spawn } = require('child_process');

    // [v61e] 优先用系统 node.exe 跑后端（Electron exe 冒充 node 启动需 60-80 秒，
    //        真 node 仅约 12 秒；实测后端 82 秒才就绪的根源就在这）
    const NODE_CANDIDATES = [
      'C:\\Users\\Administrator\\Desktop\\trae code\\autclaw\\AutoClaw\\resources\\node\\node.exe', // v22 实测 12 秒
      'C:\\Program Files\\nodejs\\node.exe', // 系统 node v24 实测 68 秒（兜底）
    ];
    const nodeExe = NODE_CANDIDATES.find((pp) => fs.existsSync(pp)) || process.execPath;
    if (nodeExe !== process.execPath) log('[v61e] 使用系统 node.exe 启动后端: ' + nodeExe);

    // 计算包含 node_modules 的目录作为 cwd
    // backend-dist 和 backend-node_modules 是兄弟目录，都在 resources/app/ 下
    // 所以 cwd 应该设为它们共同的父目录（resources/app/）
    const backendParentDir = path.dirname(BACKEND_DIST);
    // [v58] 重启后 API 自动恢复：从 resources/.env 读取已保存配置注入后端进程
    try {
      const savedEnvFile = path.join(process.resourcesPath, '.env');
      if (fs.existsSync(savedEnvFile)) {
        const envTxt = fs.readFileSync(savedEnvFile, 'utf8');
        for (const line of envTxt.split(/\r?\n/)) {
          const m = line.match(/^([A-Z_]+)=(.*)$/);
          if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
        }
        log('[v58] 已从 resources/.env 恢复 API 配置（重启自动可用）');
      }
    } catch (e) { /* 忽略 */ }
    const env = Object.assign({}, process.env, {
      PORT: String(API_PORT),
      NODE_ENV: 'production',
      // [v58] 后端 .env 文件路径（统一：resources/.env）+ 局域网模式
      APP_ENV_FILE: path.join(process.resourcesPath, '.env'),
      LAN_MODE: '0',
      // 兜底：设置 NODE_PATH 指向 node_modules
      NODE_PATH: BACKEND_NODE_MODULES,
      // 让 server.js 能找到自己的位置
      BACKEND_DIR: BACKEND_DIST,
      // [2026-08-06 修复] 传入 models 目录路径，让后端能启动 llama-server
      // 原因：后端 server.ts 用 __dirname 推断路径，打包后路径错误
      MODELS_DIR: MODELS_DIR,
    });
    if (nodeExe === process.execPath) env.ELECTRON_RUN_AS_NODE = '1';

    const proc = spawn(nodeExe, [serverPath], {
      env,
      cwd: backendParentDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    proc.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) log(`[backend] ${text}`);
    });
    proc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) log(`[backend:err] ${text}`);
    });
    proc.on('exit', (code) => {
      log(`[backend] exited with code ${code}`);
    });

    log(`Backend API server started (PID=${proc.pid}), port=${API_PORT}`);
    return proc;
  } catch (err) {
    log(`[WARN] Failed to start backend: ${err.message}`);
    return null;
  }
}

/**
 * [2026-09-08 小脑第一步] 启动 motion-hub 子进程（端口9877）
 *
 * 动作协议枢纽（小脑协议层）：AI 参数化动作通道。
 *   链路：前端解析 {"hub":{"action":"wave","params":{...}}} → POST /api/motion/request
 *         → hub 参数校验（生理极限上限）→ 映射回 27865 pet-action 正规队列
 *           （→ 主进程指令扇出 → 渲染端 canned 动画，白名单/冷却/三层保护不绕过）。
 * 零依赖纯 Node 脚本（resources/app/motion-hub.js）；失败不阻塞 UI。
 */
let hubProc = null;
function startMotionHub() {
  const hubPath = path.join(__dirname, 'motion-hub.js');
  if (!fs.existsSync(hubPath)) {
    log('[WARN] motion-hub.js not found at ' + hubPath + ', skipping motion-hub');
    return null;
  }
  try {
    const { spawn } = require('child_process');
    const NODE_CANDIDATES = [
      'C:\\Users\\Administrator\\Desktop\\trae code\\autclaw\\AutoClaw\\resources\\node\\node.exe',
      'C:\\Program Files\\nodejs\\node.exe',
    ];
    const nodeExe = NODE_CANDIDATES.find((pp) => fs.existsSync(pp)) || process.execPath;
    const env = Object.assign({}, process.env, { PET_BACKEND_PORT: String(API_PORT) });
    if (nodeExe === process.execPath) env.ELECTRON_RUN_AS_NODE = '1';
    hubProc = spawn(nodeExe, [hubPath], {
      env,
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    hubProc.stdout.on('data', (d) => { const t = d.toString().trim(); if (t) log('[motion-hub] ' + t); });
    hubProc.stderr.on('data', (d) => { const t = d.toString().trim(); if (t) log('[motion-hub:err] ' + t); });
    hubProc.on('exit', (code) => log('[motion-hub] exited with code ' + code));
    log(`[motion-hub] started (PID=${hubProc.pid}), port=9877`);
    return hubProc;
  } catch (err) {
    log('[WARN] Failed to start motion-hub: ' + err.message);
    return null;
  }
}

/**
 * [v116] 启动浏览器查信息服务（端口 5180，Playwright headless）
 * 路径：C:\RUANLINYUN\mcp-playwright\search-server.js
 * 失败不阻塞 UI；主聊天「查/搜」时前端 POST /search 拉摘要。
 */
let browserSearchProc = null;
function startBrowserSearch() {
  const script = 'C:\\RUANLINYUN\\mcp-playwright\\search-server.js';
  if (!fs.existsSync(script)) {
    log('[WARN] browser-search server not found at ' + script + ', skip');
    return null;
  }
  try {
    const { spawn } = require('child_process');
    const NODE_CANDIDATES = [
      'C:\\Program Files\\nodejs\\node.exe',
      process.execPath,
    ];
    const nodeExe = NODE_CANDIDATES.find((pp) => fs.existsSync(pp)) || process.execPath;
    const env = Object.assign({}, process.env, {
      BROWSER_SEARCH_PORT: '5180',
      NODE_PATH: 'C:\\RUANLINYUN\\mcp-playwright\\node_modules',
    });
    if (nodeExe === process.execPath) env.ELECTRON_RUN_AS_NODE = '1';
    browserSearchProc = spawn(nodeExe, [script], {
      env,
      cwd: 'C:\\RUANLINYUN\\mcp-playwright',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    browserSearchProc.stdout.on('data', (d) => { const t = d.toString().trim(); if (t) log('[browser-search] ' + t); });
    browserSearchProc.stderr.on('data', (d) => { const t = d.toString().trim(); if (t) log('[browser-search:err] ' + t); });
    browserSearchProc.on('exit', (code) => log('[browser-search] exited with code ' + code));
    log(`[browser-search] started (PID=${browserSearchProc.pid}), port=5180`);
    return browserSearchProc;
  } catch (err) {
    log('[WARN] Failed to start browser-search: ' + err.message);
    return null;
  }
}

/**
 * 启动 wechatbot-webhook 子进程（端口3001）
 *
 * wechatbot-webhook 是微信机器人消息收发服务：
 *   - 扫码登录微信小号
 *   - 收到微信消息时通过 webhook 推送到后端 /api/v1/wechat-bot/webhook/receive
 *   - 后端调用 AI 后通过 HTTP 调用本服务发送回复
 *
 * 启动方式：node main.js（cwd 设为服务目录，让 require 能找到 node_modules）
 * 失败处理：启动失败不阻塞 UI，仅记录日志（用户可在设置页看到状态为 error）
 */
function startWechatbotWebhook() {
  if (!WECHATBOT_WEBHOOK_DIR) {
    log('[WARN] wechatbot-webhook directory not found, skipping webhook service');
    return null;
  }

  const mainPath = path.join(WECHATBOT_WEBHOOK_DIR, 'main.js');
  if (!fs.existsSync(mainPath)) {
    log(`[WARN] wechatbot-webhook main.js not found at ${mainPath}`);
    return null;
  }

  try {
    const { spawn } = require('child_process');
    // 关键：移除 PORT 环境变量，避免 wechatbot-webhook 继承后端的 PORT=27865
    // wechatbot-webhook 会读取自己的 .env 文件中的 PORT 配置（默认 3001）
    const env = Object.assign({}, process.env);
    delete env.PORT;
    env.NODE_ENV = 'production';

    const proc = spawn(process.execPath, [mainPath], {
      env,
      cwd: WECHATBOT_WEBHOOK_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    proc.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) log(`[webhook] ${text}`);
    });
    proc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) log(`[webhook:err] ${text}`);
    });
    proc.on('exit', (code) => {
      log(`[webhook] exited with code ${code}`);
    });

    log(`wechatbot-webhook started (PID=${proc.pid}), port=${WEBHOOK_PORT}, dir=${WECHATBOT_WEBHOOK_DIR}`);
    return proc;
  } catch (err) {
    log(`[WARN] Failed to start wechatbot-webhook: ${err.message}`);
    return null;
  }
}

// [v128] Vosk speech_server 启动链已删除（STT 仅 Edge speech-bridge）
/**
 * 启动本地 TTS 语音合成服务（tts_server.py，端口9880）
 * 基于 edge-tts（微软 Edge 在线神经语音，免费无需 Key），默认晓晓女声 zh-CN-XiaoxiaoNeural
 * 启动失败不阻塞 UI（前端回退浏览器 SpeechSynthesis）
 */
let ttsProc = null;
function startTTSServer() {
  if (!TTS_SERVER_PATH) {
    log('[TTS] tts_server.py not found, skipping local TTS service');
    return null;
  }
  try {
    const { spawn, execSync } = require('child_process');
    let pyExe = 'python';
    try {
      execSync('py -3.12 --version', { stdio: 'ignore', windowsHide: true });
      pyExe = 'py';
    } catch {
      log('[TTS] py -3.12 not available, falling back to default python');
    }
    const args = pyExe === 'py' ? ['-3.12', TTS_SERVER_PATH] : [TTS_SERVER_PATH];
    log('[TTS] Starting tts_server.py: ' + pyExe + ' ' + args.join(' '));
    ttsProc = spawn(pyExe, args, {
      cwd: path.dirname(TTS_SERVER_PATH),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    ttsProc.stdout.on('data', (d) => { const s = d.toString().trim(); if (s) log('[tts] ' + s); });
    ttsProc.stderr.on('data', (d) => { const s = d.toString().trim(); if (s) log('[tts:err] ' + s); });
    ttsProc.on('error', (err) => { log('[TTS] Failed to start tts_server.py: ' + err.message); ttsProc = null; });
    ttsProc.on('exit', (code) => { log('[tts] exited with code ' + code); ttsProc = null; });
    log('[TTS] tts_server.py started (PID=' + ttsProc.pid + ')');
    return ttsProc;
  } catch (err) {
    log('[WARN] Failed to start TTS server: ' + err.message);
    return null;
  }
}

/** 关闭 TTS 服务子进程 */
function killTTSServer() {
  if (!ttsProc) return;
  try { ttsProc.kill(); log('[TTS] tts_server.py closed'); } catch (e) { /* noop */ }
  ttsProc = null;
}

/** [v147] 语音服务生命周期：总开关驱动，开则起、关则杀 */
function startVoiceServices(lang) {
  writeVoicePrefEnabled(true);
  startTTSServer();
  try {
    // [v176] 常驻策略：先清掉历史遗留的语音 Edge（旧版每次点麦克风都新开一个，
    //   实测残留 2 个识别页 / 502MB 同时在抢麦），再拉起唯一一个「静默待命」的识别页。
    //   之后点麦克风就是秒开，不再有 2~5 秒 Edge 冷启动。
    killSpeechBridgeBrowsers(() => {
      try {
        ensureSpeechBridgeAlive(lang || 'zh-CN');
        setSpeechBridgeControl({ enabled: false, muted: false, lang: lang || 'zh-CN' });
        log('[Voice] speech-bridge 常驻待命（静音，点麦克风即用）');
      } catch (e) { log('[Voice] speech start fail: ' + e.message); }
    });
  } catch (e) { log('[Voice] speech start fail: ' + e.message); }
  log('[Voice] services STARTED (TTS+speech-bridge)');
  return { ok: true, enabled: true };
}
function stopVoiceServices() {
  writeVoicePrefEnabled(false);
  killTTSServer();
  try { stopSpeechBridgeEdge(); } catch (e) { log('[Voice] speech stop fail: ' + e.message); }
  // 兜底：再杀一次 Edge 识别进程
  try {
    if (speechBridgeEdgeProc && !speechBridgeEdgeProc.killed) speechBridgeEdgeProc.kill();
  } catch { /* noop */ }
  speechBridgeEdgeProc = null;
  speechBridgeControl.enabled = false;
  log('[Voice] services STOPPED');
  return { ok: true, enabled: false };
}


// ========== [2026-08-05 重构] 桌宠架构 ==========
// 旧方案（已废弃）：主窗口全屏+透明+置顶，桌宠和聊天界面共用一个窗口
//   问题：桌宠模式占据整个主窗口，无法同时使用聊天界面；本质还是"在网页上"
// 新方案：主窗口（普通不透明）+ 独立桌宠窗口（透明+无边框+置顶+小尺寸）
//   - 主窗口：聊天界面/NewPage，用户可正常使用或最小化
//   - 桌宠窗口：独立 BrowserWindow，只渲染 3D 模型，显示在桌面上
//   - 模型数据通过 IPC 在两个窗口间传递

/**
 * 创建主窗口（普通不透明窗口，聊天界面/NewPage）
 */
/* ========== [2026-09-20 v174/v175] 红叉=正常关闭 + DSH 重要服务常驻系统托盘 ==========
 * 用户锁定（原话）：
 *   「用户点击那个叉叉，那就是退出…我们默认加 dsh 的重要服务，放到电脑的小托盘，
 *     用户点击了那个红色的叉叉之后就直接小托盘呆着。如果用户要关闭的话，直接退出就行了。
 *     那个弹出的弹窗先保留 —— 保留的意思是先把它移除，但我们保留它的功能和 UI。
 *     注意：DSH 服务自动放到小托盘那边，除非用户自己点退出，下一次还是默认到小托盘，一直这样」
 *   v175 追加：「直接用 dsh 的 api，以他这里为准」
 *              「为了防止用户手贱，也为了用户的方便，那个小托盘保留，
 *                然后用户点击之后就是退出应用，就单纯退出应用就行」
 *              「通用设置里加 DSH 常驻服务开关，默认开启」→ 关掉要走三级替换式确认弹窗
 * → 语义：
 *   ①红叉 = **正常关闭软件**（不弹确认框）
 *   ②DSH 重要服务**常驻系统托盘**（软件关了它还在，下次打开软件秒开）
 *   ③**托盘图标单击 = 退出应用**（单纯退出，不做成功能菜单；「停止 DSH 服务」这类手贱入口从托盘撤掉）
 *   ④关闭"常驻"这件事只能在**设置页的开关**上做，且要连过两级确认（见 SettingsPage）
 *   ⑤开关默认 ON；关掉 = 软件退出时 DSH 一并退出（不保活、不留暗进程）
 *   托盘图标归属：软件在跑 → 软件自己的图标（单击=退出应用）；软件退出后 DSH 还在 →
 *   dsh-bridge/dshHarness.launchGuardianTray() 的独立守卫图标（单击=退出该服务）→ 任何时刻只有一个图标。
 * 旧退出确认弹窗：函数 legacyQuitPromptOnClose() 完整保留，仅解除挂载（USE_LEGACY_QUIT_PROMPT 一行可复原）。
 * 备用形态「红叉缩到托盘（软件不退出）」：机制仍在下方（hideToTray/showFromTray/createAppTray），
 *   把 CLOSE_TO_TRAY 改成 true 即整体切换。
 */
let appTray = null;
let isRealQuitting = false;            // 真退出中：关闭事件不再拦截
let trayBalloonShown = false;          // 每次运行只提示一次「已缩到托盘」
let trayPetWasVisible = false;         // 缩托盘前桌宠是否可见（恢复时还原）
let guardianTrayLaunched = false;      // 本次退出已拉起过 DSH 托盘守卫（防重复）
let dshStopRequested = false;          // 用户显式停过 DSH（settings/IPC）→ 退出时不再拉守卫
const CLOSE_TO_TRAY = false;           // [v174 用户语义] 红叉=正常关闭软件；true=改回"缩到托盘不退出"
const USE_LEGACY_QUIT_PROMPT = false;  // 旧退出确认弹窗开关（保留功能与 UI，默认解除挂载）

// [v182 DSH 自愈看门狗] 状态（配合主窗口 console-message 钩子使用，见 createWindow 内注释）
let dshSessFailTs = [];                // 近 90s 的 "new session failed" 时间戳
let dshHealLastTs = 0;                 // 上次自愈时间（10 分钟冷却）
let dshHealing = false;                // 自愈进行中互斥
async function dshSelfHeal(reason) {
  if (dshHealing) return;
  dshHealing = true;
  log('[DSH] 自愈看门狗：' + reason + ' → 重启 DSH 服务');
  try {
    if (dshHarnessBridge) {
      try { dshHarnessBridge.stop(); } catch (e) { /* noop */ }
      await new Promise((r) => setTimeout(r, 1500));
      const r = await dshHarnessBridge.start();
      log('[DSH] 自愈完成 → ' + (r && r.ok ? r.url : ((r && r.error) || 'fail')));
    } else {
      log('[DSH] 自愈跳过：bridge 不存在');
    }
  } catch (e) {
    log('[DSH] 自愈失败: ' + (e && e.message));
  } finally {
    dshHealLastTs = Date.now();
    dshHealing = false;
  }
}

function trayWindowVisible() {
  return !!(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && !mainWindow.isMinimized());
}

function hideToTray(reason) {
  try {
    trayPetWasVisible = !!(petWindow && !petWindow.isDestroyed() && petWindow.isVisible());
    if (trayPetWasVisible) petWindow.hide();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
    log(`[托盘] 已缩到系统托盘（${reason}）· 桌宠原可见=${trayPetWasVisible} · DSH 继续后台`);
    updateTrayMenu();
    if (!trayBalloonShown && appTray) {
      trayBalloonShown = true;
      try {
        appTray.displayBalloon({
          title: APP_NAME,
          content: '已最小化到系统托盘，后台服务继续运行。\n单击托盘图标可恢复窗口，右键可退出。',
        });
      } catch (e) { /* noop */ }
    }
  } catch (e) { log('[托盘] 隐藏异常: ' + e.message); }
}

function showFromTray() {
  try {
    if (petWindow && !petWindow.isDestroyed() && trayPetWasVisible) {
      petWindow.show();
      trayPetWasVisible = false;
    }
    if (!mainWindow || mainWindow.isDestroyed()) {
      // 极端情况（窗口被销毁）→ 从托盘重建主界面，避免"点了图标没反应"的僵尸态
      log('[托盘] 主窗口不存在，重建');
      createWindow();
      try { mainWindow.loadURL(`http://127.0.0.1:${UI_PORT}/`); } catch (e) { /* noop */ }
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    log('[托盘] 主界面已从托盘恢复');
    updateTrayMenu();
  } catch (e) { log('[托盘] 恢复异常: ' + e.message); }
}

async function trayOpenDshPage() {
  try {
    const url = dshHarnessBridge ? await dshHarnessBridge.resolveUrl() : null;
    if (url) { shell.openExternal(url); log('[托盘] 已用系统浏览器打开 DSH 页面'); return; }
    log('[托盘] DSH 尚未就绪，无法打开页面');
    if (appTray) {
      try { appTray.displayBalloon({ title: APP_NAME, content: 'DSH 服务尚未就绪，请稍后重试。' }); } catch (e) { /* noop */ }
    }
  } catch (e) { log('[托盘] 打开 DSH 页面异常: ' + e.message); }
}

function trayStopDsh() {
  try {
    if (dshHarnessBridge) dshHarnessBridge.stop();
    log('[托盘] 已按要求停止 DSH 服务（下次启动需冷启动）');
  } catch (e) { log('[托盘] 停止 DSH 异常: ' + e.message); }
}

/** 唯一真退出入口：桌面/托盘主动退出都走这里 */
function realQuit(closeDsh, reason) {
  if (isRealQuitting) return;
  isRealQuitting = true;
  // [v179 用户定案·字面意思] 退出软件 = **所有托盘一起消失**（软件托盘 + DSH 守卫托盘），
  //   但 DSH 服务本身**不随软件退出**——它是后台常驻服务（无托盘图标），
  //   唯一关闭入口 = 设置页「DSH 常驻服务」开关（用户：「想要关闭dsh服务，必须去设置里边关闭」）。
  //   v178「退出必杀 DSH」废除；v175「退出拉守卫托盘留守」同样废除（不留任何图标）。
  log(`[退出] 真退出（${reason || '未知'}）· DSH 保持后台常驻（关 DSH 请去设置页）`);
  try {
    if (dshHarnessBridge && typeof dshHarnessBridge.killGuardianTray === 'function') {
      dshHarnessBridge.killGuardianTray();   // 守卫托盘必须随软件一起消失，不留孤儿图标
    }
  } catch (e) { log('[退出] 收守卫托盘异常: ' + e.message); }
  try { if (appTray) { appTray.destroy(); appTray = null; } } catch (e) { /* noop */ }
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();  // 走正常关闭→closed→app.quit()
    else app.quit();
  } catch (e) { try { app.quit(); } catch (e2) { /* noop */ } }
}

function updateTrayMenu() {
  if (!appTray) return;
  try {
    const { Menu } = require('electron');
    const visible = trayWindowVisible();
    // [v175 用户定案] 托盘 = 便捷退出入口，不做成"功能菜单"：
    //   单击 = 退出应用（见 createAppTray），菜单里只留「显示主界面（窗口被藏时）/打开 DSH 页面/退出」。
    //   [v178] 单击退出 = 软件 + DSH 服务一起关（守卫托盘即时收掉，不留图标）；
    //   「停止/预热 DSH」的精细控制在设置页「DSH 常驻服务」开关，托盘保持纯退出入口。
    appTray.setToolTip(`${APP_NAME} · 运行中（单击退出）`);
    const items = [];
    if (!visible) items.push({ label: '显示主界面', click: () => showFromTray() });
    items.push({ label: '打开 DSH 页面', click: () => trayOpenDshPage() });
    items.push({ type: 'separator' });
    items.push({ label: '退出阮云小宠', click: () => realQuit(false, '托盘菜单') });
    appTray.setContextMenu(Menu.buildFromTemplate(items));
  } catch (e) { log('[托盘] 菜单构建失败: ' + e.message); }
}

function createAppTray() {
  if (appTray) return appTray;
  try {
    const { Tray, nativeImage } = require('electron');
    let img = nativeImage.createFromPath(APP_ICON);
    if (img.isEmpty()) img = nativeImage.createFromPath(APP_ICON.replace(/\.ico$/, '.png'));
    if (img.isEmpty()) { log('[托盘] 图标加载失败，用空图标兜底'); }
    appTray = new Tray(img);
    appTray.setToolTip(`${APP_NAME} · 运行中（单击退出）`);
    // [v175 用户定案] 单击/双击 = 退出应用（单纯退出，不做"缩到托盘"那种容易点错的形态）
    appTray.on('click', () => {
      log('[托盘] 单击图标 → 退出应用');
      realQuit(false, '托盘图标单击');
    });
    appTray.on('double-click', () => {
      log('[托盘] 双击图标 → 退出应用');
      realQuit(false, '托盘图标双击');
    });
    updateTrayMenu();
    log('[托盘] 图标已创建（单击=退出应用 · 右键菜单=显示界面/打开DSH页面/退出）');
    return appTray;
  } catch (e) {
    log('[托盘] 创建失败（回退为直接关闭）: ' + e.message);
    appTray = null;
    return null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
      backgroundThrottling: false, // [Preview Owner] 后台仍渲并分发 30fps
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 320,
    title: APP_NAME,
    icon: APP_ICON,
    // [2026-08-05 重构] 主窗口恢复普通窗口：不透明、有系统标题栏
    // 原因：桌宠现在用独立窗口，主窗口不需要透明
    frame: false,            // 保留无边框（前端有自定义标题栏 windowControls）
    backgroundColor: '#1a1a1a',  // 不透明深灰背景（与深色主题一致）
    show: false,             // [v169] 后台加载：由 splash 进度页顶在前台，就绪后再 show（splash 创建失败会兜底 show）
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // [v164] 先显示本地启动加载页，避免用户点击后长时间无窗口
  const splashPath = path.join(__dirname, 'splash.html');
  try {
    if (fs.existsSync(splashPath)) mainWindow.loadFile(splashPath);
    else mainWindow.loadURL(`http://127.0.0.1:${UI_PORT}/`);
  } catch (e) {
    log('[启动] splash 加载失败: ' + e.message);
  }

  mainWindow.once('ready-to-show', () => {
    // [v169] ready-to-show 不再直接 show——主窗口在 splash 后台加载，
    // 由 finishBootSplash（编排完成/超时/跳过）统一显示
    log('Main window ready-to-show（等待 splash 结束后显示）');
  });

  // [v13 诊断] 捕获主窗口渲染进程的 console.log/error，写入 app-debug.log
  //   之前只有桌宠窗口有 console-message 捕获，主窗口的 JS 错误完全不可见
  //   这是导致"黑屏无法诊断"的根本原因之一
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    const levelStr = ['LOG', 'WARN', 'ERROR'][level] || `L${level}`;
    log(`[主窗口渲染][${levelStr}] ${message} (${sourceId}:${line})`);
    // [v182 DSH 自愈看门狗] 根因（9-19/9-21/9-25 三次实锤）：DSH 进程长时间运行后，typert 网关的
    //   sessionController 服务会静默降级且永不自愈 → DSH 里"选择工作区/新建会话"全部报
    //   gateway/service-unavailable（用户视角=工作区选不了、啥也干不了）。而 dshHarness.start()
    //   的复用判据只探 token 不探服务健康 → 降级进程被一直复用。修法：捕获 DSH UI 的
    //   "new session failed"（用户每次操作失败都会打这条），90 秒内 ≥2 次 = 服务真降级
    //   （偶发的 control stream 抖动不触发），自动 stop+start 重启 DSH 服务（与设置页开关
    //   同一条链路，守卫/托盘语义不变），10 分钟冷却防抖。
    if (level === 3 && message.includes('new session failed')) {
      try {
        const now = Date.now();
        dshSessFailTs = dshSessFailTs.filter((t) => now - t < 90000);
        dshSessFailTs.push(now);
        if (dshSessFailTs.length >= 2 && now - dshHealLastTs > 600000) {
          dshSessFailTs = [];
          dshSelfHeal('sessionController 降级（90 秒内多次新建会话失败）');
        }
      } catch (e) { /* 看门狗自身异常不影响主流程 */ }
    }
    // [v169b 启动splash] 从渲染进程 console 捕获真实就绪信号（零前端重建）
    //   旧版 bug：拿"感知状态"（编排发完加载指令）当就绪 → 其实 Babylon 还要渲染 3~6s，
    //   用户进界面后还要看模型转圈。真就绪 = AnimSystem 日志（模型渲染完成的标志）。
    try {
      if (!bootSplashDone) {
        if (message.includes('[AnimSystem] 呼吸+交互+双击系统已启动')) {
          // Babylon 场景+模型+动画系统全部就绪 = 用户进界面立即可用
          bootModelRendered = true;
          bootMilestone('modelRendered');   // [v174] 真实事件计分（Babylon 动画系统启动日志）
          bootTryFinish('模型渲染完成');
        } else if (message.includes('[启动编排] 感知状态')) {
          boot编排Done = true;
          bootTryFinish('编排完成');
        } else if (message.includes('[启动编排] 异常')) {
          boot编排Done = true;
          finishBootSplash('编排异常');
        } else if (message.includes('[启动编排][优先级1] 模型(缓存): 命中')
                || message.includes('[启动编排][优先级1] 模型(默认目录)')) {
          // 只是"开始加载"，不是完成 → 不计里程碑（真完成看 AnimSystem 日志）
          bootModelHit = true;
        }
      }
    } catch (e) { /* noop */ }
  });
  // [v13 诊断] 捕获渲染进程崩溃
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log(`[主窗口渲染][CRASH] reason=${details.reason} exitCode=${details.exitCode}`);
  });
  // [修复问题2诊断] 添加did-fail-load和did-finish-load事件捕获
  //   根因：之前无did-fail-load事件，页面加载失败时无日志，无法诊断"黑屏/按钮不显示"
  //   证据：日志中22次启动有"Main window shown"但无任何"主窗口渲染"日志
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    log(`[主窗口][did-fail-load] code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    // [v174] 主窗口先 loadFile(splash.html) 再 loadURL(主界面)，两次都会触发本事件；
    //   只有真正的主界面（UI_PORT）才算里程碑，否则进度会白送 16 分（假进度）
    let u = '';
    try { u = mainWindow.webContents.getURL() || ''; } catch (e) { /* noop */ }
    log(`[主窗口][did-finish-load] 页面加载完成 ${u}`);
    if (u.indexOf(`127.0.0.1:${UI_PORT}`) !== -1) bootMilestone('uiLoaded');
  });

  // [v12] 最大化/还原状态变化时通知渲染进程（更新按钮图标）
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximize-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximize-changed', false);
  });
  // [v139] 真全屏状态同步给 WindowControls
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window:maximize-changed', true);
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window:maximize-changed', false);
  });
  // [v70 可见性渲染调度] 最小化/还原/显示/隐藏即时重算档位（预览 frozen↔active 切换）
  mainWindow.on('minimize', () => { computeRenderModes('主窗口最小化'); updateTrayMenu(); });
  mainWindow.on('restore', () => { computeRenderModes('主窗口还原'); updateTrayMenu(); });
  mainWindow.on('show', () => { computeRenderModes('主窗口显示'); updateTrayMenu(); });
  mainWindow.on('hide', () => { computeRenderModes('主窗口隐藏'); updateTrayMenu(); });

  // 外链点击用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // [v171 DSH保活 / v174 托盘常驻] 退出确认弹窗 —— 功能与 UI 完整保留，但默认不再挂到红叉上
  //   v174 用户锁定：点红叉 = 缩到系统托盘呆着（DSH 等重要服务继续后台跑，不弹窗）；
  //   真要关闭只走托盘菜单「退出」。要恢复旧行为：把 USE_LEGACY_QUIT_PROMPT 改成 true。
  let quitPromptDone = false;
  let suppressQuitPrompt = false;
  try {
    const { powerMonitor } = require('electron');
    powerMonitor.on('shutdown', () => { suppressQuitPrompt = true; });
    powerMonitor.on('suspend', () => { suppressQuitPrompt = false; });
  } catch (e) { /* noop */ }
  /* eslint-disable-next-line no-unused-vars */
  const legacyQuitPromptOnClose = (e) => {
    if (quitPromptDone || suppressQuitPrompt) return;
    e.preventDefault();
    try {
      dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['退出并保留服务（推荐）', '退出并关闭 DSH 服务', '取消'],
        defaultId: 0,
        cancelId: 2,
        title: '退出阮云小宠',
        message: '确定退出阮云小宠吗？',
        detail: 'DSH 服务正在后台运行（系统托盘有图标，可随时管理）。\n\n'
          + '• 退出并保留服务：DSH 继续常驻后台，下次启动软件秒开（推荐）\n'
          + '• 退出并关闭服务：DSH 一并退出，下次启动软件时 DSH 需重新冷启动（约半分钟）',
        noLink: true,
      }).then((r) => {
        if (r.response === 2) {
          log('[退出] 用户取消');
          return;
        }
        const doQuit = () => {
          quitPromptDone = true;
          try { mainWindow.close(); } catch (e2) { try { mainWindow.destroy(); } catch (e3) { /* noop */ } }
        };
        if (r.response === 1) {
          log('[退出] 用户选择退出并关闭 DSH 服务');
          try {
            if (dshHarnessBridge) dshHarnessBridge.stop();
          } catch (e2) { /* noop */ }
          setTimeout(doQuit, 300);
        } else {
          log('[退出] 用户选择退出并保留 DSH 服务');
          doQuit();
        }
      }).catch(() => { /* noop */ });
    } catch (e2) {
      // 弹窗失败则按原行为直接退出
      quitPromptDone = true;
    }
  };

  // [v174→v179] 红叉 = 正常关闭（不弹窗）；DSH 服务保持后台常驻（无托盘图标），
  //   唯一关闭入口 = 设置页「DSH 常驻服务」开关；所有托盘随软件退出一起消失（见 realQuit/cleanupAndQuit）
  mainWindow.on('close', (e) => {
    if (USE_LEGACY_QUIT_PROMPT) { legacyQuitPromptOnClose(e); return; }
    if (isRealQuitting || suppressQuitPrompt) return;   // 真退出/系统关机 → 放行
    if (!CLOSE_TO_TRAY || !appTray) {
      // 用户锁定：点红叉就是关闭软件，不拦、不弹窗。DSH 服务不随软件退出（后台常驻），
      // 托盘（软件托盘+DSH守卫托盘）全部随退出消失，不留任何图标。
      log('[退出] 红叉 → 正常关闭软件（DSH 保持后台常驻，所有托盘一起关闭）');
      return;
    }
    e.preventDefault();
    hideToTray('点击关闭按钮');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // 主窗口关闭时同时关闭桌宠窗口
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.destroy();
      petWindow = null;
    }
    app.quit();
  });
}

/**
 * [2026-08-05 新增] 创建独立桌宠窗口
 *
 * 设计要点：
 *   - 透明无边框：只显示角色，无窗口边框
 *   - alwaysOnTop：始终置顶，不被桌面图标/其他窗口遮挡
 *   - skipTaskbar：不在任务栏显示（避免和主窗口混淆）
 *   - 小尺寸（400x600）：桌宠不需要全屏，只占桌面一角
 *   - 加载 /pet 路由：该路由只渲染 BabylonModelViewer（desktopPetMode=true）
 *   - 默认鼠标穿透：透明区域点击穿透到桌面，ray pick 命中模型时切回接收
 */
function createPetWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    return petWindow;  // 已存在，直接复用
  }

  const display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  // 桌宠窗口默认尺寸（屏幕右侧偏下，不挡视线）
  const petWidth = 400;
  const petHeight = 600;
  const petX = wa.x + wa.width - petWidth - 20;  // 右侧留 20px 边距
  const petY = wa.y + wa.height - petHeight - 20;  // 底部留 20px 边距

  // [2026-08-06 v4 客观验证] 记录屏幕信息，诊断多显示器/DPI/工作区问题
  const allDisplays = screen.getAllDisplays();
  log(`[桌宠窗口][屏幕诊断] 主显示器: bounds=${JSON.stringify(display.bounds)}, workArea=${JSON.stringify(display.workArea)}, scaleFactor=${display.scaleFactor}`);
  log(`[桌宠窗口][屏幕诊断] 显示器数量: ${allDisplays.length}`);
  allDisplays.forEach((d, i) => {
    log(`[桌宠窗口][屏幕诊断] 显示器[${i}]: bounds=${JSON.stringify(d.bounds)}, workArea=${JSON.stringify(d.workArea)}, scaleFactor=${d.scaleFactor}, isPrimary=${d.id === display.id}`);
  });
  log(`[桌宠窗口][屏幕诊断] 计算窗口位置: (${petX},${petY}) 尺寸${petWidth}x${petHeight}, 右下角=(${petX + petWidth},${petY + petHeight})`);
  log(`[桌宠窗口][屏幕诊断] workArea右下角=(${wa.x + wa.width},${wa.y + wa.height}), 窗口是否在workArea内: ${petX >= wa.x && petY >= wa.y && petX + petWidth <= wa.x + wa.width && petY + petHeight <= wa.y + wa.height}`);

  // [2026-08-06 v4 诊断模式] PET_DEBUG=1 时用非透明窗口+边框，验证窗口是否真的能出现
  // 根因：用户质疑"窗口根本没出现"。之前透明窗口在某些系统/驱动下可能visible=true但屏幕不合成。
  // 诊断模式：窗口配置为 非透明+品红背景+有边框，如果用户能看到品红窗口，说明窗口能出现，
  //   问题在透明合成；如果用户还是看不到，说明窗口根本没创建到屏幕上（更深层的系统问题）。
  // 启用方法：在exe同级目录创建 .pet-debug 文件，或设置环境变量 PET_DEBUG=1
  const debugMode = process.env.PET_DEBUG === '1'
    || fs.existsSync(path.join(path.dirname(process.execPath), '.pet-debug'))
    || fs.existsSync(path.join(USER_DATA_DIR, '.pet-debug'));

  const windowConfig = debugMode ? {
    // 诊断模式：最大可见性，排除透明合成问题
    x: petX, y: petY, width: petWidth, height: petHeight,
    title: APP_NAME,
    icon: APP_ICON,
    transparent: false,           // 非透明
    frame: true,                  // 有边框（能看到窗口轮廓）
    backgroundColor: '#ff00ff',   // 品红色（最显眼）
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: false,           // 显示在任务栏（用户能确认窗口存在）
    resizable: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      // [2026-09-25 桌宠加载超时根治] 桌宠窗口隐藏时 Chromium 节流定时器/渲染 →
      //   Babylon 贴图加载链卡死 → 120s 看门狗报「贴图或资源解析未完成」。
      //   与 v176c 语音识别页同源坑；关掉节流后隐藏态也能完整加载。
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  } : {
    // 正常模式：透明无边框
    x: petX, y: petY, width: petWidth, height: petHeight,
    title: APP_NAME,
    icon: APP_ICON,
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minWidth: 96,
    minHeight: 96,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      // [2026-09-25] 同上：桌宠窗口（正常模式）关闭后台节流
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  };

  log(`[桌宠窗口][配置] debugMode=${debugMode}, transparent=${windowConfig.transparent}, frame=${windowConfig.frame}, backgroundColor=${windowConfig.backgroundColor}`);

  petWindow = new BrowserWindow(windowConfig);

  // [2026-08-06 v4 客观验证] ready-to-show 后验证 isVisible，不再"以为显示了"
  // 之前只调用 show() 就记录"窗口已显示"，但 show() 可能失败或 DWM 不合成。
  // 现在 show() 后立即检查 isVisible() 并记录，客观验证窗口状态。
  petWindow.once('ready-to-show', () => {
    if (petWindow && !petWindow.isDestroyed()) {
      try {
        petWindow.show();
        // show() 后立即验证（客观证据，不是主观假设）
        const visibleAfterShow = petWindow.isVisible();
        const boundsAfterShow = petWindow.getBounds();
        log(`[桌宠窗口] ready-to-show 触发, show()后 isVisible=${visibleAfterShow}, bounds=${JSON.stringify(boundsAfterShow)}`);
        if (!visibleAfterShow) {
          log(`[桌宠窗口][ERROR] show() 调用后 isVisible 仍为 false！窗口可能被系统拒绝显示`);
        }
      } catch (showErr) {
        log(`[桌宠窗口][ERROR] ready-to-show show() 抛异常: ${showErr.message}`);
      }
    }
  });

  // 加载桌宠专用路由
  const petUrl = `http://127.0.0.1:${UI_PORT}/pet`;
  petWindow.loadURL(petUrl);

  // [2026-08-06 渲染日志捕获] 捕获桌宠窗口的 console.log/error，写入主进程日志
  petWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    const levelStr = ['LOG', 'WARN', 'ERROR'][level] || `L${level}`;
    log(`[桌宠渲染][${levelStr}] ${message}` + (sourceId ? ` (${sourceId}:${line})` : ''));
  });

  // 默认鼠标穿透（透明区域点击穿透到桌面）
  // 诊断模式下不穿透，方便用户点击窗口确认存在
  if (!debugMode) {
    petWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  // [2026-08-06 兜底] 注入透明 CSS（诊断模式下注入品红背景便于识别）
  petWindow.webContents.on('dom-ready', () => {
    const css = debugMode
      ? 'html, body, #root { background: #ff00ff !important; background-color: #ff00ff !important; }'
      : 'html, body, #root { background: transparent !important; background-color: transparent !important; }';
    petWindow.webContents.insertCSS(css).catch(() => { /* 注入失败不阻塞 */ });
    log(`[桌宠诊断] 已注入${debugMode ? '品红' : '透明'}背景 CSS`);
  });

  petWindow.on('closed', () => {
    petWindow = null;
    if (typeof renderChannels !== 'undefined') renderChannels.pet = false;
    log('[桌宠窗口] 已关闭（帧通道 pet=off）');
  });

  log(`[桌宠窗口] 创建成功，位置(${petX},${petY}) 尺寸${petWidth}x${petHeight}, debugMode=${debugMode}`);
  return petWindow;
}

/**
 * [2026-08-06 v4 客观验证] 截图诊断函数
 * 延迟 capturePage 截图，保存到 pet-tmp/diagnostic-<timestamp>.png
 * 这是"窗口实际渲染了什么"的客观证据：
 *   - 截图有模型 → 窗口渲染正常，问题在窗口合成/位置/遮挡
 *   - 截图全透明 → canvas 未渲染（alpha 问题或 WebGL 问题）
 *   - 截图白色 → 背景未透明（CssBaseline 污染）
 *   - 截图品红 → 诊断模式下窗口能渲染（排除窗口本身不出现的问题）
 *   - capturePage 抛异常 → 窗口 webContents 异常
 */
function capturePetWindowDiag(reason) {
  if (!petWindow || petWindow.isDestroyed()) {
    log(`[桌宠截图][${reason}] 窗口不存在，跳过`);
    return;
  }
  const isVisible = petWindow.isVisible();
  const bounds = petWindow.getBounds();
  log(`[桌宠截图][${reason}] 开始截图, isVisible=${isVisible}, bounds=${JSON.stringify(bounds)}`);
  if (!isVisible) {
    log(`[桌宠截图][${reason}] 窗口不可见，截图可能为空`);
  }
  try {
    petWindow.webContents.capturePage().then((image) => {
      try {
        const imgSize = image.getSize();
        const imgPath = path.join(PET_TMP_DIR, `diagnostic-${Date.now()}.png`);
        fs.writeFileSync(imgPath, image.toPNG());
        // 获取截图文件大小
        const stat = fs.statSync(imgPath);
        log(`[桌宠截图][${reason}] ✅ 截图已保存: ${imgPath}, 尺寸=${imgSize.width}x${imgSize.height}, 文件大小=${stat.size}字节`);
        log(`[桌宠截图][${reason}] 截图分析提示: 文件大小<1KB=全透明空图, 1-10KB=纯色背景, >50KB=有模型内容`);
      } catch (saveErr) {
        log(`[桌宠截图][${reason}] 保存截图失败: ${saveErr.message}`);
      }
    }).catch((capErr) => {
      log(`[桌宠截图][${reason}] capturePage 失败: ${capErr.message}`);
    });
  } catch (e) {
    log(`[桌宠截图][${reason}] capturePage 调用异常: ${e.message}`);
  }

  // [2026-08-06 v6 像素级诊断] 用 executeJavaScript 直接读取 WebGL 帧缓冲像素
  // 这是"WebGL是否真的渲染了内容"的终极证据：
  //   - capturePage 截图是"窗口合成后的结果"（可能被DWM合成丢弃）
  //   - readPixels 是"WebGL帧缓冲的实际内容"（绕过DWM合成）
  //   - 如果 readPixels 有内容但 capturePage 透明 → DWM合成问题（需禁用硬件加速）
  //   - 如果 readPixels 也透明 → WebGL渲染问题（着色器/材质/相机问题）
  try {
    petWindow.webContents.executeJavaScript(`
      (function() {
        try {
          var canvas = document.querySelector('canvas');
          if (!canvas) return 'ERR:无canvas';
          var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) return 'ERR:无WebGL上下文';
          var w = canvas.width, h = canvas.height;
          var pixels = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          var nonZero = 0, nonTransparent = 0, sampleR = 0, sampleG = 0, sampleB = 0, sampleA = 0;
          var centerIdx = (Math.floor(h/2) * w + Math.floor(w/2)) * 4;
          for (var i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 0 || pixels[i+1] > 0 || pixels[i+2] > 0) nonZero++;
            if (pixels[i+3] > 0) nonTransparent++;
          }
          sampleR = pixels[centerIdx]; sampleG = pixels[centerIdx+1];
          sampleB = pixels[centerIdx+2]; sampleA = pixels[centerIdx+3];
          return JSON.stringify({
            w: w, h: h,
            nonZeroPixels: nonZero,
            nonTransparentPixels: nonTransparent,
            totalPixels: w * h,
            centerPixel: [sampleR, sampleG, sampleB, sampleA],
            meshCount: (window.__babylonScene && window.__babylonScene.meshes) ? window.__babylonScene.meshes.length : 'N/A'
          });
        } catch(e) { return 'ERR:' + e.message; }
      })()
    `).then((result) => {
      log(`[桌宠像素诊断][${reason}] WebGL帧缓冲: ${result}`);
    }).catch((jsErr) => {
      log(`[桌宠像素诊断][${reason}] executeJavaScript 失败: ${jsErr.message}`);
    });
  } catch (e) {
    log(`[桌宠像素诊断][${reason}] 调用异常: ${e.message}`);
  }
}

// ========== [2026-08-31 v62] 壁纸模式窗口与流程 ==========
// [v66 悬浮控制台] 控制台独立成普通 BrowserWindow（浮在桌面、可点击、可拖动）。
// 原因：壁纸窗口挂 WorkerW 层（桌面图标之下），DOM 控制台永远收不到鼠标——
// "有一层玻璃隔着"的根因。控制台必须活在正常窗口层。
let wallpaperConsoleWindow = null;   // 壁纸模式悬浮控制台（v67 白色悬浮球）

function createWallpaperConsoleWindow() {
  if (wallpaperConsoleWindow && !wallpaperConsoleWindow.isDestroyed()) return wallpaperConsoleWindow;
  const display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  // [v68] 位置：用户要求"高度下降45%"——从贴顶改为屏幕高度 45% 处（悬浮球初始落点）
  const consoleX = wa.x + wa.width - 292;
  const consoleY = wa.y + Math.round(wa.height * 0.45);
  wallpaperConsoleWindow = new BrowserWindow({
    x: consoleX, y: consoleY,
    // [v67] 初始即悬浮球尺寸（页面加载后自己会申报 56×56），面板展开时由 set-size 放大
    width: 56, height: 56,
    transparent: true, frame: false, backgroundColor: '#00000000',
    // [v69] 取消置顶（用户：打开其他软件时球应被盖住，只待在桌面上）——
    //   普通窗口层级，其他应用窗口自然盖住球；不再 alwaysOnTop
    // [v68 拖拽修复] resizable:false 会让 -webkit-app-region: drag 失效，保持 true
    //   [v69] app-region 在本透明窗口上实测仍不可用，拖拽改为手动 IPC（见 console.html）
    hasShadow: false, alwaysOnTop: false, skipTaskbar: true,
    resizable: true, movable: true, show: false,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  // 控制台是普通窗口：不设鼠标穿透，可点击
  wallpaperConsoleWindow.loadURL(`http://127.0.0.1:${UI_PORT}/console.html`);
  wallpaperConsoleWindow.webContents.on('console-message', (_e, level, message) => {
    const lv = ['LOG', 'WARN', 'ERROR'][level] || `L${level}`;
    log(`[悬浮控制台][${lv}] ${message}`);
  });
  wallpaperConsoleWindow.on('closed', () => { wallpaperConsoleWindow = null; log('[悬浮控制台] closed'); });
  // [v69] 失焦即收回：点击球/面板外的任何地方（焦点离开控制台窗口）→ 通知渲染层收回为悬浮球
  wallpaperConsoleWindow.on('blur', () => {
    try { wallpaperConsoleWindow.webContents.send('wallpaper-console:blur'); } catch (e) { /* noop */ }
  });
  wallpaperConsoleWindow.once('ready-to-show', () => {
    try { wallpaperConsoleWindow.showInactive(); } catch (e) { /* noop */ }
  });
  log('[悬浮控制台] 已创建 (v67 白色悬浮球)');
  return wallpaperConsoleWindow;
}

function destroyWallpaperConsoleWindow(reason = '') {
  if (wallpaperConsoleWindow && !wallpaperConsoleWindow.isDestroyed()) {
    wallpaperConsoleWindow.destroy();
    log('[悬浮控制台] 已销毁' + (reason ? ' (' + reason + ')' : ''));
  }
  wallpaperConsoleWindow = null;
}

function createWallpaperWindow() {
  if (wallpaperWindow && !wallpaperWindow.isDestroyed()) return wallpaperWindow;
  const display = screen.getPrimaryDisplay();
  wallpaperWindow = new BrowserWindow({
    x: display.bounds.x, y: display.bounds.y,
    width: display.bounds.width, height: display.bounds.height,
    transparent: true, frame: false, backgroundColor: '#00000000',
    hasShadow: false, alwaysOnTop: false, skipTaskbar: true,
    resizable: false, movable: false, show: false,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  // 默认鼠标穿透 + 前向（渲染层 ray pick 命中模型/控制台时解除——复用 set-ignore-mouse 双窗口 handler）
  wallpaperWindow.setIgnoreMouseEvents(true, { forward: true });
  wallpaperWindow.loadURL(`http://127.0.0.1:${UI_PORT}/wallpaper`); // [v62d] 构建已通，正式 WallpaperPage（控制台+桌面宠物模式按钮）
  wallpaperWindow.webContents.on('console-message', (_e, level, message) => {
    const lv = ['LOG', 'WARN', 'ERROR'][level] || `L${level}`;
    log(`[壁纸渲染][${lv}] ${message}`);
  });
  wallpaperWindow.on('closed', () => { wallpaperWindow = null; log('[壁纸窗口] closed'); });
  log('[壁纸窗口] 已创建 bounds=' + JSON.stringify(display.bounds));
  return wallpaperWindow;
}

// [2026-09-10 壁纸转屏] 定义可在 ready 后调用；禁止在模块加载阶段碰 screen
let wallpaperDisplaySyncTimer = null;
let wallpaperDisplayHookRegistered = false;
function syncWallpaperBoundsToDisplay(reason) {
  if (!wallpaperWindow || wallpaperWindow.isDestroyed()) return;
  try {
    const b = screen.getPrimaryDisplay().bounds;
    wallpaperWindow.setBounds({ x: 0, y: 0, width: b.width, height: b.height });
    log('[壁纸] 同步主屏 bounds(' + reason + ')=' + JSON.stringify({ w: b.width, h: b.height }));
  } catch (e) {
    log('[壁纸] 同步主屏 bounds 失败(' + reason + '): ' + e.message);
  }
}
function registerWallpaperDisplayHooks() {
  if (wallpaperDisplayHookRegistered) return;
  wallpaperDisplayHookRegistered = true;
  // 必须在 app ready 之后调用（screen 模块限制）
  screen.on('display-metrics-changed', () => {
    if (wallpaperDisplaySyncTimer) clearTimeout(wallpaperDisplaySyncTimer);
    wallpaperDisplaySyncTimer = setTimeout(() => {
      wallpaperDisplaySyncTimer = null;
      syncWallpaperBoundsToDisplay('display-metrics-changed');
    }, 150);
  });
  screen.on('display-added', () => { syncWallpaperBoundsToDisplay('display-added'); });
  screen.on('display-removed', () => { syncWallpaperBoundsToDisplay('display-removed'); });
  log('[壁纸] display-metrics-changed 钩子已注册（ready 后）');
}

async function enterWallpaperMode() {
  try {
    if (wallpaperWindow && !wallpaperWindow.isDestroyed()) { log('[壁纸] 已在壁纸模式'); createWallpaperConsoleWindow(); computeRenderModes('壁纸模式重复进入'); return { success: true, already: true }; }
    // 0. [v62b] 无模型时自动加载默认琳奈（否则壁纸窗口空白、用户以为没反应）
    if (!petModelData) {
      ensureDefaultPetModel();
    }
    // 1. WE pause（记录是否在跑，退出时 play 恢复——"顺手做个冻结，原本咋样还是咋样"）
    weWasRunning = await weDetectRunning();
    log('[壁纸] WE 在跑=' + weWasRunning);
    if (weWasRunning) await weControl('pause');
    // 2. [v67 共存] 桌宠窗口保留——用户要求预览/壁纸/桌宠三模式可同时存在，全显示
    //    （旧逻辑进壁纸即销毁桌宠，属"互斥"设计，已按防呆需求移除）
    if (petWindow && !petWindow.isDestroyed()) {
      log('[壁纸] 桌宠窗口保留（三模式共存）');
    }
    // 3. 主窗口最小化（不再 hide）——任务栏保留入口（防呆：用户随时能找回主程序）；
    //    最小化同样触发 Chromium 后台节流，预览 rAF 照样冻结，不付出性能代价
    if (mainWindow && !mainWindow.isDestroyed()) {
      // [2026-09-10] 最小化前抓预览当前相机（用户临时调过的视角）写入日志
      try {
        const camDump = await mainWindow.webContents.executeJavaScript(`(() => {
          try {
            const sc = window.__babylonScene;
            const cam = sc && (sc.activeCamera || (sc.cameras && sc.cameras[0]));
            if (!cam) return JSON.stringify({ error: 'no camera', hasScene: !!sc });
            const t = cam.target || { x:0, y:0, z:0 };
            return JSON.stringify({
              radius: cam.radius, alpha: cam.alpha, beta: cam.beta,
              fov: cam.fov,
              target: [t.x, t.y, t.z],
              lowerRadiusLimit: cam.lowerRadiusLimit,
              upperRadiusLimit: cam.upperRadiusLimit,
            });
          } catch (e) { return JSON.stringify({ error: String(e) });
          }})()`);
        log('[预览相机快照] ' + camDump);
      } catch (e) { log('[预览相机快照] 失败: ' + e.message); }
      try { mainWindow.webContents.setBackgroundThrottling(false); } catch (e2) { /* noop */ }
      if (!mainWindow.isMinimized()) mainWindow.minimize();
      log('[壁纸] 主窗口已最小化（任务栏保留，预览冻结）');
    }
    // 4. 创建壁纸窗口 → 显示 → 挂 WorkerW
    const win = createWallpaperWindow();
    // [v66] 悬浮控制台跟随壁纸模式出现（正常窗口层，可点击可拖动）
    createWallpaperConsoleWindow();
    win.once('ready-to-show', () => {
      try {
        win.show();
        // 等 500ms 再挂（POC 验证 show 后短暂延迟挂载更稳）
        setTimeout(async () => {
          try {
            const hwnd = nativeHwndOf(win);
            const r = await runBridge('attach', hwnd);
            const display = screen.getPrimaryDisplay();
            if (r.code === 0) {
              log('[壁纸] 挂载成功: ' + r.out);
              // 挂层后重设全屏 bounds（相对 WorkerW 客户区原点）
              win.setBounds({ x: 0, y: 0, width: display.bounds.width, height: display.bounds.height });
              try { win.webContents.send('wallpaper-mode:attached', { attached: true }); } catch (e3) { /* noop */ }
            } else {
              log('[壁纸] 挂载失败，降级为普通全屏透明窗口: ' + r.out);
              try { win.webContents.send('wallpaper-mode:attached', { attached: false }); } catch (e3) { /* noop */ }
            }
          } catch (e2) { log('[壁纸] attach 流程异常: ' + e2.message); }
        }, 500);
      } catch (e) { log('[壁纸] ready-to-show 异常: ' + e.message); }
    });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

async function exitWallpaperMode() {
  try {
    // [v66] 悬浮控制台随壁纸模式退出
    destroyWallpaperConsoleWindow('退出壁纸模式');
    let wasAttached = false;
    if (wallpaperWindow && !wallpaperWindow.isDestroyed()) {
      wasAttached = true;
      const hwnd = nativeHwndOf(wallpaperWindow);
      await runBridge('detach', hwnd);
      wallpaperWindow.destroy();
      wallpaperWindow = null;
      log('[壁纸] 窗口已摘除销毁 (attached=' + wasAttached + ')');
    } else {
      return { success: true, noop: true };
    }
    // 主窗口恢复（预览模式解冻）[v67] 先还原最小化再 show，任务栏入口全程不消失
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { if (mainWindow.isMinimized()) mainWindow.restore(); } catch (e3) { /* noop */ }
      mainWindow.show();
      try { mainWindow.webContents.setBackgroundThrottling(false); } catch (e2) { /* noop */ }
      log('[壁纸] 主窗口已恢复');
    }
    // WE 恢复（"该出现出现，原本咋样还是咋样"）
    if (weWasRunning) {
      await weControl('play');
      weWasRunning = false;
    }
    computeRenderModes('退出壁纸模式');
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

// ========== [v70 可见性渲染调度 + 指令扇出] ==========
// 原则：谁被肉眼看到，谁才渲染；动作指令由主进程单一消费，广播给所有存活窗口。
//
// 档位矩阵（用户"以此类推，分类讨论"的通用规则）：
//   桌宠窗口   —— alwaysOnTop 透明窗，永远可见 → 永远 active
//   主窗口     —— 最小化/隐藏 → frozen；可见 → active（预览自身已有 60/45/20 自适应）
//   壁纸窗口   —— 被管理窗口（主窗口∪桌宠∪悬浮控制台）遮挡：
//                 遮挡比 ≥55% → frozen（如预览开着，壁纸被盖住 → "冻结滚去后台"）
//                 遮挡比 ≥12% → reduced（限速 ≤10fps）
//                 其余       → active
// 已知局限：第三方应用的窗口主进程无法枚举（无原生模块），它们盖住壁纸时检测不到；
//   缓解：壁纸 idle 档本就低帧，且 Chromium 对被完全遮挡/最小化窗口自带后台节流兜底。

function aliveWin(w) { return w && !w.isDestroyed(); }

function rectsOverlapArea(a, b) {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return x * y;
}

// 并集面积（矩形数 ≤3，容斥原理：Σ单面积 − Σ两两交集 + 三者交集）
function rectsUnionArea(rects) {
  if (rects.length === 0) return 0;
  let total = 0;
  for (const r of rects) total += r.width * r.height;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      total -= rectsOverlapArea(rects[i], rects[j]);
    }
  }
  if (rects.length >= 3) {
    const [a, b, c] = rects;
    const ix = Math.max(a.x, b.x, c.x);
    const iy = Math.max(a.y, b.y, c.y);
    const ix2 = Math.min(a.x + a.width, b.x + b.width, c.x + c.width);
    const iy2 = Math.min(a.y + a.height, b.y + b.height, c.y + c.height);
    if (ix2 > ix && iy2 > iy) total += (ix2 - ix) * (iy2 - iy);
  }
  return Math.max(0, total);
}

const WALLPAPER_FROZEN_RATIO = 0.55;
const WALLPAPER_REDUCED_RATIO = 0.12;

let lastRenderModes = { main: '', pet: '', wallpaper: '' };

function computeRenderModes(reason) {
  try {
    const modes = { main: 'active', pet: 'active', wallpaper: 'active' };

    // 主窗口：最小化/隐藏 → frozen（任务栏防呆最小化进壁纸模式后，预览 rAF 归零）
    if (aliveWin(mainWindow)) {
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) modes.main = 'frozen';
    }

    // 壁纸窗口：按遮挡比分档（遮挡者 = 主窗口 ∪ 桌宠 ∪ 悬浮控制台 的矩形并集）
    if (aliveWin(wallpaperWindow)) {
      const occluders = [];
      if (aliveWin(mainWindow) && mainWindow.isVisible() && !mainWindow.isMinimized()) {
        occluders.push(mainWindow.getBounds());
      }
      if (aliveWin(petWindow)) occluders.push(petWindow.getBounds());
      if (aliveWin(wallpaperConsoleWindow)) occluders.push(wallpaperConsoleWindow.getBounds());
      const wb = wallpaperWindow.getBounds();
      const ratio = wb.width * wb.height > 0
        ? rectsUnionArea(occluders) / (wb.width * wb.height)
        : 0;
      if (ratio >= WALLPAPER_FROZEN_RATIO) modes.wallpaper = 'frozen';
      else if (ratio >= WALLPAPER_REDUCED_RATIO) modes.wallpaper = 'reduced';
      else modes.wallpaper = 'active';
    }

    // 档位变化才广播（渲染端日志对比 prev→next，重复广播会污染对比）
    const targets = [
      ['main', mainWindow], ['pet', petWindow], ['wallpaper', wallpaperWindow],
    ];
    for (const [key, win] of targets) {
      if (modes[key] !== lastRenderModes[key]) {
        lastRenderModes[key] = modes[key];
        if (aliveWin(win)) {
          try { win.webContents.send('render-mode', { mode: modes[key] }); } catch (e) { /* noop */ }
        }
        log(`[渲染调度] ${key}: ${modes[key]}${reason ? ' (' + reason + ')' : ''}`);
      }
    }
  } catch (e) { log('[渲染调度] 计算异常: ' + e.message); }
}

// 看门狗：主窗口被用户拖动/缩放改变遮挡比、桌宠创建销毁等无事件可挂的场合，
// 每 2s 重算一次（档位没变就不广播，开销可忽略）
let renderSchedulerTimer = null;
function startRenderScheduler() {
  if (renderSchedulerTimer) return;
  renderSchedulerTimer = setInterval(() => computeRenderModes('watchdog'), 2000);
  computeRenderModes('init');
  log('[渲染调度] 看门狗已启动（2s 周期，档位变化才广播）');
}

// ----- 指令扇出：主进程唯一轮询 /pending，广播给所有存活窗口 -----
// 旧架构：桌宠/壁纸窗口各自 1s 轮询，/pending 是 splice(0) 取走即删，
//   两窗口竞争领取，一条指令只有一个窗口能执行（"三开只动一个"）。
// 新架构：主进程 1s 轮询一次 → 向 main/pet/wallpaper 三个窗口广播 →
//   可见窗口同步动；frozen 窗口执行姿态赋值但不渲染（解冻即呈现当前姿态）。
let jointPollerTimer = null;

function fetchPendingJointCommands() {
  return new Promise((resolve) => {
    try {
      const req = http.get({ host: '127.0.0.1', port: API_PORT, path: '/api/v1/joint-control/pending', timeout: 2000 }, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            resolve(j.success && Array.isArray(j.commands) ? j.commands : []);
          } catch (e) { resolve([]); }
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => { try { req.destroy(); } catch (e) { /* noop */ } resolve([]); });
    } catch (e) { resolve([]); }
  });
}

function broadcastJointCommands(commands) {
  let sent = 0;
  for (const win of [mainWindow, petWindow, wallpaperWindow]) {
    if (aliveWin(win)) {
      try { win.webContents.send('joint-command', { commands }); sent++; } catch (e) { /* noop */ }
    }
  }
  // [v71 Godot 渲染端] 双渲染后端：同一条指令流同步转发给 Godot（渲染端进程活着才转）
  forwardToGodot(commands);
  log(`[指令扇出] ${commands.length} 条指令 → ${sent} 个窗口${godotAlive() ? ' + Godot渲染端' : ''}`);
}

function startJointCommandPoller() {
  if (jointPollerTimer) return;
  log('[指令扇出] 主进程指令轮询已启动（1s 周期，单一消费方）');
  jointPollerTimer = setInterval(async () => {
    const commands = await fetchPendingJointCommands();
    if (commands.length > 0) broadcastJointCommands(commands);
  }, 1000);
}

// ═══════ [2026-10-01 小脑] 闲置陪伴心跳 ═══════
// 设计：节奏与判定**全部集中在后端 companion.ts**（闲置判定/动作袋/AI生成/配额/静音时段），
//   主进程只做两件事：①每 30s 喂一次心跳（附通话状态/系统闲置秒数两类上下文）；
//   ②后端决定播台词时，转发给主窗口走既有 TTS 通路（companionSpeakTTS）。
const COMPANION_TICK_MS = 30000;
let companionTickTimer = null;
let companionLastErrLogAt = 0;

function companionTickOnce(kind) {
  return new Promise((resolve) => {
    try {
      let idleSec = -1;
      try { idleSec = powerMonitor.getSystemIdleTime(); } catch { /* noop */ }
      const payload = JSON.stringify({ kind, inCall: !!callStateInCall, systemIdleSec: idleSec });
      const req = http.request({
        host: '127.0.0.1', port: API_PORT, path: '/api/v1/companion/idle-tick', method: 'POST', timeout: 8000,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j && j.fired) {
              log('[陪伴] ' + (j.kind || kind) + ' 触发 source=' + (j.source || '') + ' label=' + (j.label || '') + (j.ttsSuppressed ? ' （夜间静音，只动不说）' : ''));
              if (j.line && mainWindow && !mainWindow.isDestroyed()) {
                try { mainWindow.webContents.send('companion:speak', String(j.line)); } catch (e2) { /* noop */ }
              }
            }
            resolve(j);
          } catch { resolve(null); }
        });
      });
      req.on('error', () => companionTickFailFast(''));
      req.on('timeout', () => { try { req.destroy(); } catch { /* noop */ } companionTickFailFast(' timeout'); });
      req.write(payload);
      req.end();
    } catch (e) { companionTickFailFast(' ' + (e && e.message || e)); }
  });
}

/** [2026-10-02 终审] 心跳失败的限频日志（5 分钟最多一条，防刷日志） */
function companionTickFailFast(why) {
  const now = Date.now();
  if (now - companionLastErrLogAt > 300000) {
    companionLastErrLogAt = now;
    log('[陪伴] 心跳失败（后端未就绪？）' + why);
  }
}

function startCompanionTicker() {
  if (companionTickTimer) return;
  log('[陪伴] 闲置陪伴心跳已启动（30s 周期；闲置/小时节拍判定全在后端 companion.ts 集中管理）');
  companionTickTimer = setInterval(async () => {
    await companionTickOnce('idle'); // 后端在同一次心跳里一并判定闲置动作与小时节拍
  }, COMPANION_TICK_MS);
}

// [v148] DSH 专区桥：随软件安装目录发现配置/运行时；工作区=<app>/dsh-workspace
const APP_ROOT_FOR_DSH = __dirname;
try { process.env.DSH_APP_ROOT = APP_ROOT_FOR_DSH; } catch (e) { /* noop */ }
const dshHarnessBridge = (() => {
  const candidates = [
    path.join(APP_ROOT_FOR_DSH, 'dsh-bridge', 'dshHarness.js'),
    path.join(APP_ROOT_FOR_DSH, '..', '..', '..', 'dsh-harness', 'bridge', 'dshHarness.js'),
    'C:\\RUANLINYUN\\dsh-harness\\bridge\\dshHarness.js',
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return require(p);
    } catch (e) { log('[DSH] require fail ' + p + ': ' + e.message); }
  }
  log('[DSH] bridge not found');
  return null;
})();

ipcMain.handle('dsh-harness:start', async (_e, modelCfg) => {
  if (!dshHarnessBridge) return { ok: false, error: 'DSH bridge 不存在' };
  try {
    const result = await dshHarnessBridge.start(modelCfg || undefined);
    log(`[DSH] start → ${result.ok ? result.url : result.error} (${result.source || '-'}) ws=${result.workspace || '-'}`);
    return result;
  } catch (e) {
    log('[DSH] start 异常: ' + e.message);
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('dsh-harness:stop', () => {
  // [v174] 用户显式停掉 DSH → 退出软件时不再拉起托盘守卫（不留孤儿图标）
  dshStopRequested = true;
  if (!dshHarnessBridge) return { ok: false };
  const r = dshHarnessBridge.stop();
  log('[DSH] stop');
  return r;
});
ipcMain.handle('dsh-harness:status', () => (dshHarnessBridge ? dshHarnessBridge.status() : { ok: false, error: 'no bridge' }));
ipcMain.handle('dsh-harness:resolve-url', async () => {
  if (!dshHarnessBridge) return { ok: false, url: null };
  try {
    const url = await dshHarnessBridge.resolveUrl();
    return { ok: !!url, url };
  } catch (e) {
    return { ok: false, url: null, error: e.message };
  }
});
ipcMain.handle('dsh-harness:apply-model', (_e, modelCfg) => {
  if (!dshHarnessBridge) return { ok: false, error: 'no bridge' };
  try {
    return dshHarnessBridge.applyModelMapping(modelCfg || {});
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
// [v153] API 列表同步 / 删除墓碑 / active 以 DSH 为准
ipcMain.handle('dsh-harness:providers-sync', (_e, payload) => {
  if (!dshHarnessBridge) return { ok: false, error: 'no bridge' };
  try {
    return dshHarnessBridge.syncProvidersFromSoftware(payload || {});
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('dsh-harness:providers-get', () => {
  if (!dshHarnessBridge) return { ok: false, error: 'no bridge' };
  try {
    return dshHarnessBridge.getProvidersPublic();
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('dsh-harness:providers-delete', (_e, id) => {
  if (!dshHarnessBridge) return { ok: false, error: 'no bridge' };
  try {
    return dshHarnessBridge.deleteProviderSync(id);
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('dsh-harness:providers-set-active', (_e, id) => {
  if (!dshHarnessBridge) return { ok: false, error: 'no bridge' };
  try {
    return dshHarnessBridge.setActiveProviderSync(id);
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
// [v173] DSH 会话删除：工作区会话菜单「删除」→ 清掉该会话落盘数据（jsonl.zstd + 投影缓存）
ipcMain.handle('dsh-harness:purge-session', (_e, sessionId) => {
  try {
    if (!sessionId || typeof sessionId !== 'string') return { ok: false, error: 'bad sessionId' };
    return dshHarnessBridge
      ? dshHarnessBridge.purgeSession(sessionId)
      : { ok: false, error: 'no bridge' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// [v175] DSH 常驻服务开关（通用设置）——默认开启；关闭=软件退出时 DSH 一并退出
ipcMain.handle('dsh-harness:resident-get', () => ({ ok: true, enabled: readDshResidentEnabled() }));
ipcMain.handle('dsh-harness:resident-set', (_e, enabled) => {
  const on = enabled !== false && !!enabled;
  const wrote = writeDshResidentEnabled(on);
  if (on) {
    // [v179] 开启：DSH 若没在跑则后台立即拉起；下次启动自动预热
    dshStopRequested = false;
    try {
      const r = dshHarnessBridge ? dshHarnessBridge.start() : null;
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (e) { log('[DSH] 开启常驻时拉起失败: ' + e.message); }
    log('[DSH] 常驻服务已开启（DSH 后台运行；随软件启动预热）');
  } else {
    // [v179 用户定案] 关闭 = DSH 服务的**唯一**关闭入口：立即停止 DSH 服务 + 收守卫托盘
    dshStopRequested = true;
    trayStopDsh();
    log('[DSH] 常驻服务已关闭（DSH 服务已立即停止）');
  }
  return { ok: !!wrote, enabled: on };
});

// ========== [v71 Godot 渲染端] 双渲染后端之"新引擎"路线 ==========
// 原版链路（Electron/Babylon 窗口渲染）原样保留；Godot 作为可切换的第二渲染后端：
//   - 独立进程：Godot_v4.7.2 加载 godot-renderer 项目（简单场景 + 琳奈 FBX + Skeleton3D）
//   - 控制：TCP 127.0.0.1:9880 JSON 行协议（control_server.gd）
//   - 链路：主进程指令扇出（v70）除广播给窗口外，同步转发一份给 Godot ——
//     单一消费方不变，AI 一条指令两个渲染后端同时动，互不抢单
//   - 世界交互：Godot 侧支持 worldMove（XZ 平面真实位移），Babylon 线没有的立体空间能力

// [2026-09-06 v72b 路径统一迁移] 原本：GODOT_EXE = C:\Users\Administrator\Desktop\不有clawd\godot\Godot_v4.7.2-stable_win64.exe
//                                    GODOT_PROJECT = C:\RUANLINYUN\godot-renderer
// 改动：全部迁入统一管理中心 C:\RUANLINYUN\渲染链路\godot-renderer（引擎 exe 放其 Godot\ 便携数据目录，自包含模式）
// 详细链路档案见 C:\RUANLINYUN\渲染链路\链路变更档案.md
const GODOT_EXE = 'C:\\RUANLINYUN\\渲染链路\\godot-renderer\\Godot\\Godot_v4.7.2-stable_win64.exe';
const GODOT_PROJECT = 'C:\\RUANLINYUN\\渲染链路\\godot-renderer';
const GODOT_CTL_PORT = 9880;

let godotProc = null;
let godotSock = null;          // 到渲染端控制服务器的常驻连接（按需建连）
const godotSendQueue = [];     // 未建连期间缓存的指令
let godotStartupKilled = false;

function godotAlive() { return godotProc != null && godotProc.exitCode == null && godotProc.pid > 0; }

function startGodotRenderer() {
  if (godotAlive()) return { success: true, already: true, pid: godotProc.pid };
  if (!fs.existsSync(GODOT_EXE)) return { success: false, error: 'Godot 引擎不存在: ' + GODOT_EXE };
  if (!fs.existsSync(path.join(GODOT_PROJECT, 'project.godot'))) return { success: false, error: '渲染端项目不存在: ' + GODOT_PROJECT };
  godotStartupKilled = false;
  try {
    godotProc = cpSpawn(GODOT_EXE, ['--path', GODOT_PROJECT], { windowsHide: false });
    godotProc.stdout.on('data', (d) => { const s = d.toString().trim(); if (s) log('[Godot渲染][out] ' + s); });
    godotProc.stderr.on('data', (d) => { const s = d.toString().trim(); if (s) log('[Godot渲染][err] ' + s); });
    godotProc.on('exit', (code) => {
      log('[Godot渲染] 进程退出 code=' + code);
      godotProc = null;
      destroyGodotSocket();
      if (!godotStartupKilled) { /* 异常退出告警位，v1 只记日志 */ }
    });
    log('[Godot渲染] 进程已启动 pid=' + godotProc.pid);
    // [v72] 主窗口可见 → 自动嵌入预览区（SetParent，异步不阻塞返回值）
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      embedGodotIntoMain();
    } else {
      log('[Godot嵌入] 主窗口不可见，保持独立窗口模式');
    }
    return { success: true, pid: godotProc.pid };
  } catch (e) { return { success: false, error: e.message }; }
}

function stopGodotRenderer() {
  if (!godotAlive()) { godotProc = null; return { success: true, noop: true }; }
  godotStartupKilled = true;
  try { godotProc.kill(); } catch (e) { log('[Godot渲染] kill 异常: ' + e.message); }
  godotProc = null;
  destroyGodotSocket();
  log('[Godot渲染] 已停止');
  return { success: true };
}

function godotStatus() {
  return {
    success: true,
    running: godotAlive(),
    pid: godotAlive() ? godotProc.pid : null,
    socketConnected: godotSock != null && !godotSock.destroyed,
    embedded: godotEmbedState.embedded,       // [v72] 是否已嵌入主窗口预览区
    childHwnd: godotEmbedState.childHwnd,
    exe: GODOT_EXE,
    project: GODOT_PROJECT,
  };
}

// —— 到 9880 的常驻转发连接：首条指令触发建连，失败静默重试（下条指令再试） ——
function connectGodotSocket() {
  if (godotSock != null) return;
  const sock = net.createConnection({ host: '127.0.0.1', port: GODOT_CTL_PORT });
  sock.setNoDelay(true);
  sock.on('connect', () => {
    godotSock = sock;
    log('[Godot渲染] 控制连接已建立 (9880)');
    while (godotSendQueue.length > 0) {
      const line = godotSendQueue.shift();
      sock.write(line);
    }
  });
  sock.on('data', (d) => {
    const s = d.toString().trim();
    if (s) log('[Godot渲染][ctl] ' + s.replace(/\s+/g, ' ').slice(0, 300));
  });
  sock.on('error', () => { if (godotSock === sock) godotSock = null; });
  sock.on('close', () => { if (godotSock === sock) godotSock = null; });
}

function destroyGodotSocket() {
  if (godotSock != null) {
    try { godotSock.destroy(); } catch (e) { /* noop */ }
    godotSock = null;
  }
}

function forwardToGodot(commands) {
  for (const cmd of commands) {
    const line = JSON.stringify(cmd) + '\n';
    if (godotSock != null && !godotSock.destroyed) {
      godotSock.write(line);
    } else if (godotAlive()) {
      // 未建连：缓存 + 触发建连（渲染端 TCP 就绪需要几秒）
      if (godotSendQueue.length < 200) godotSendQueue.push(line);
      connectGodotSocket();
    }
  }
}

ipcMain.handle('godot-renderer:start', () => startGodotRenderer());
ipcMain.handle('godot-renderer:stop', () => stopGodotRenderer());
ipcMain.handle('godot-renderer:status', () => godotStatus());

// ========== [v72 预览嵌入] Godot 窗口 SetParent 嵌入主窗口预览区 ==========
// 方案 A（用户 2026-09-05 拍板）：Godot 无边框窗口 SetParent 进主窗口，变成子窗口
//   - 预览模式直接走 Godot 引擎（渲染质量已被用户确认"更加好更加精细"）
//   - 定位：读主窗口页面里最大的可见 canvas（Babylon 预览画布）rect × devicePixelRatio
//     → MoveWindow 物理像素坐标（frame:false 主窗口的页面视口 == 窗口客户区，无需再加偏移）
//   - resize：主窗口 resize/maximize/restore 防抖 150ms 后 MoveWindow 重定位
//   - 生命周期：startGodotRenderer 时主窗口可见 → 自动嵌入；stop/exit → 复位状态
//   - 主窗口不可见（如启动时隐藏）→ 保持 v71 独立窗口模式，控制台开关仍可用
//   - Babylon 线原样保留：嵌入只是"覆盖"，不关闭 Babylon 渲染，随时可回退

const { execFile } = require('child_process');
const godotEmbedState = {
  embedded: false,        // 当前是否已 SetParent 进主窗口
  childHwnd: null,        // Godot 窗口句柄（十进制字符串）
  listenersAttached: false,
  busy: false,            // 嵌入流程进行中（防重入）
  repositionTimer: null,  // resize 防抖
};

function psRun(script, timeoutMs) {
  return new Promise((resolve) => {
    execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, timeout: timeoutMs || 30000, maxBuffer: 1024 * 256 },
      (err, stdout, stderr) => {
        resolve({
          err: err ? String(err.message) : null,
          out: String(stdout || '').trim(),
          stderr: String(stderr || '').trim(),
        });
      });
  });
}

// 等待 Godot 主窗口出现并返回 HWND（进程启动到窗口可见有几秒延迟，PS 内轮询最多 20s）
function psFindGodotHwnd(pid) {
  const script = [
    '$deadline=(Get-Date).AddSeconds(20); $found=0',
    'while((Get-Date) -lt $deadline){',
    `  $p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue`,
    '  if($p){ $p.Refresh(); if($p.MainWindowHandle -ne 0){ $found=[int64]$p.MainWindowHandle; break } }',
    '  Start-Sleep -Milliseconds 300',
    '}',
    'Write-Output $found',
  ].join('\n');
  return psRun(script, 30000);
}

// 嵌入：去边框(0x00CF0000=CAPTION|SYSMENU|THICKFRAME|MAXBOX|MINBOX) + WS_CHILD|WS_VISIBLE + SetParent + MoveWindow
function psEmbedScript(childHwnd, parentHwnd, x, y, w, h) {
  return [
    'Add-Type -TypeDefinition @"',
    'using System; using System.Runtime.InteropServices;',
    'public class GWEmbed {',
    '  [DllImport("user32.dll")] public static extern IntPtr SetParent(IntPtr c, IntPtr p);',
    '  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool r);',
    '  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);',
    '  [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr h, int i, int v);',
    '}',
    '"@',
    `$child=[IntPtr][long]${childHwnd}; $parent=[IntPtr][long]${parentHwnd}`,
    '$style=[GWEmbed]::GetWindowLong($child,-16)',
    '$newStyle=($style -band (-bnot [int]0x00CF0000)) -bor [int]0x40000000 -bor [int]0x10000000',
    '[void][GWEmbed]::SetWindowLong($child,-16,$newStyle)',
    '[void][GWEmbed]::SetParent($child,$parent)',
    `[void][GWEmbed]::MoveWindow($child,${x},${y},${w},${h},$true)`,
    'Write-Output EMBED_OK',
  ].join('\n');
}

// 重定位：只 MoveWindow（resize 后），不动样式和父子关系
function psMoveScript(childHwnd, x, y, w, h) {
  return [
    'Add-Type -TypeDefinition @"',
    'using System; using System.Runtime.InteropServices;',
    'public class GWMove {',
    '  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool r);',
    '}',
    '"@',
    `$h=[IntPtr][long]${childHwnd}`,
    `[void][GWMove]::MoveWindow($h,${x},${y},${w},${h},$true)`,
    'Write-Output MOVE_OK',
  ].join('\n');
}

// 主窗口 HWND（getNativeWindowHandle 返回 8 字节 LE Buffer，x64）
function getMainHwnd() {
  try {
    const buf = mainWindow.getNativeWindowHandle();
    return buf.length >= 8 ? buf.readBigUInt64LE(0) : BigInt(buf.readUInt32LE(0));
  } catch (e) { return null; }
}

// 预览区矩形：主窗口页面里面积最大的可见 canvas（Babylon 预览画布），CSS 像素
async function getPreviewRect() {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  try {
    const rect = await mainWindow.webContents.executeJavaScript(`(() => {
      let best = null, bestArea = 0;
      for (const c of document.querySelectorAll('canvas')) {
        const r = c.getBoundingClientRect();
        const area = r.width * r.height;
        if (r.width > 50 && r.height > 50 && area > bestArea) { best = r; bestArea = area; }
      }
      if (!best) return null;
      return { x: Math.round(best.x), y: Math.round(best.y), w: Math.round(best.width), h: Math.round(best.height), dpr: window.devicePixelRatio || 1 };
    })()`, true);
    return rect || null;
  } catch (e) { return null; }
}

// canvas 找不到时的兜底矩形：窗口右下角 55%（预览面板的大致位置）
function getFallbackRect() {
  try {
    const [cw, ch] = mainWindow.getContentSize();
    return { x: Math.round(cw * 0.45), y: Math.round(ch * 0.45), w: Math.round(cw * 0.55), h: Math.round(ch * 0.55), dpr: 1 };
  } catch (e) { return { x: 100, y: 100, w: 480, h: 480, dpr: 1 }; }
}

function resetGodotEmbedState() {
  godotEmbedState.embedded = false;
  godotEmbedState.childHwnd = null;
  godotEmbedState.listenersAttached = false;
  if (godotEmbedState.repositionTimer) { clearTimeout(godotEmbedState.repositionTimer); godotEmbedState.repositionTimer = null; }
}

function scheduleGodotReposition() {
  if (!godotEmbedState.embedded) return;
  if (godotEmbedState.repositionTimer) clearTimeout(godotEmbedState.repositionTimer);
  godotEmbedState.repositionTimer = setTimeout(() => {
    godotEmbedState.repositionTimer = null;
    repositionGodotEmbed();
  }, 150);
}

async function repositionGodotEmbed() {
  if (!godotEmbedState.embedded || !godotEmbedState.childHwnd) return;
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
  const rect = (await getPreviewRect()) || getFallbackRect();
  if (rect.w < 50 || rect.h < 50) return;
  const px = Math.round(rect.x * rect.dpr), py = Math.round(rect.y * rect.dpr);
  const pw = Math.round(rect.w * rect.dpr), ph = Math.round(rect.h * rect.dpr);
  const r = await psRun(psMoveScript(godotEmbedState.childHwnd, px, py, pw, ph), 20000);
  if (r.out !== 'MOVE_OK') log('[Godot嵌入][重定位失败] ' + (r.err || r.stderr || r.out));
}

function attachEmbedListeners() {
  if (godotEmbedState.listenersAttached || !mainWindow || mainWindow.isDestroyed()) return;
  godotEmbedState.listenersAttached = true;
  mainWindow.on('resize', scheduleGodotReposition);
  mainWindow.on('maximize', scheduleGodotReposition);
  mainWindow.on('unmaximize', scheduleGodotReposition);
  mainWindow.on('restore', scheduleGodotReposition);
  mainWindow.on('closed', resetGodotEmbedState);
}

async function embedGodotIntoMain() {
  if (godotEmbedState.busy) return;
  if (!mainWindow || mainWindow.isDestroyed() || !godotAlive()) return;
  godotEmbedState.busy = true;
  try {
    // 1. 等 Godot 窗口出现，拿 HWND
    const find = await psFindGodotHwnd(godotProc.pid);
    if (!godotAlive()) { log('[Godot嵌入] 等待窗口期间进程已退出，放弃嵌入'); return; }
    const hwndNum = find.out;
    if (!hwndNum || hwndNum === '0') {
      log('[Godot嵌入] 未获取到 Godot 窗口句柄，放弃嵌入 err=' + (find.err || '') + ' out=' + hwndNum);
      return;
    }
    // 2. 预览区矩形 + 父 HWND
    const rect = (await getPreviewRect()) || getFallbackRect();
    const parentHwnd = getMainHwnd();
    if (!parentHwnd) { log('[Godot嵌入] 未获取到主窗口句柄，放弃嵌入'); return; }
    const px = Math.round(rect.x * rect.dpr), py = Math.round(rect.y * rect.dpr);
    const pw = Math.round(rect.w * rect.dpr), ph = Math.round(rect.h * rect.dpr);
    // 3. SetParent 嵌入
    const r = await psRun(psEmbedScript(hwndNum, String(parentHwnd), px, py, pw, ph), 20000);
    if (r.out !== 'EMBED_OK') {
      log('[Godot嵌入] SetParent 失败: ' + (r.err || r.stderr || r.out));
      return;
    }
    godotEmbedState.embedded = true;
    godotEmbedState.childHwnd = hwndNum;
    attachEmbedListeners();
    // 4. 3s 后补一次定位（页面 canvas 可能是嵌入后才出现的，兜底）
    setTimeout(() => { if (godotEmbedState.embedded) repositionGodotEmbed(); }, 3000);
    log(`[Godot嵌入] 已嵌入主窗口预览区 child=${hwndNum} parent=${parentHwnd} rect=(${px},${py}) ${pw}x${ph} dpr=${rect.dpr}${rect === null ? '' : ''}`);
  } finally {
    godotEmbedState.busy = false;
  }
}

// 手动重嵌（调试/失败重试用）：控制台 preload 走 godotRenderer.embed()
ipcMain.handle('godot-renderer:embed', () => { embedGodotIntoMain(); return { success: true, queued: true }; });

// ========== [2026-08-05 重构] 桌宠 IPC ==========
// 渲染进程通过 preload 暴露的 window.desktopPet / window.windowControls 调用

// 显示桌宠：主窗口导入模型后调用，传入模型数据
// [2026-08-06 文件中转方案] 主进程把模型/贴图写入临时文件，缓存 URL（非 ArrayBuffer）
// 桌宠窗口通过 getModel() 获取 URL，再用 fetch 获取 ArrayBuffer，彻底绕过 IPC ArrayBuffer 传输
ipcMain.handle('desktop-pet:show', (_event, modelData) => {
  const _showData = modelData?.data;
  log(`[桌宠][show] 收到模型: name=${modelData?.name}, dataType=${_showData ? Object.prototype.toString.call(_showData) : 'null'}, dataByteLen=${_showData?.byteLength || 0}, texCount=${modelData?.textureFiles?.length || 0}`);

  // 1. 清空临时目录（避免旧文件干扰）
  cleanPetTmpDir();

  // 2. 写入模型文件到临时目录
  const modelFileName = modelData.name || 'model.pmx';
  const modelFilePath = path.join(PET_TMP_DIR, modelFileName);
  try {
    // ArrayBuffer → Buffer → 写文件
    // 主进程是 Node.js 环境，Buffer.from(arraybuffer) 100% 可靠
    fs.writeFileSync(modelFilePath, Buffer.from(_showData));
    log(`[桌宠][show] 模型文件已写入: ${modelFileName}, 大小=${_showData?.byteLength || 0} 字节`);
  } catch (e) {
    log(`[桌宠][show] ❌ 模型文件写入失败: ${e.message}`);
    return { success: false, error: '模型文件写入失败: ' + e.message };
  }

  // 3. 写入贴图文件到临时目录（用索引前缀避免重名）
  const textureMetas = [];
  if (modelData.textureFiles && modelData.textureFiles.length > 0) {
    for (let i = 0; i < modelData.textureFiles.length; i++) {
      const tex = modelData.textureFiles[i];
      const texData = tex.data;
      if (!texData || !texData.byteLength) {
        log(`[桌宠][show] ⚠️ 贴图 ${i} 数据为空，跳过`);
        continue;
      }
      // 用索引前缀 + 原扩展名，确保文件名唯一
      const origExt = path.extname(tex.name) || '.png';
      const texFileName = `tex_${i}${origExt}`;
      const texFilePath = path.join(PET_TMP_DIR, texFileName);
      try {
        fs.writeFileSync(texFilePath, Buffer.from(texData));
        textureMetas.push({
          name: tex.name,
          path: tex.path || tex.name,
          webkitRelativePath: tex.webkitRelativePath || '',
          url: `http://127.0.0.1:${UI_PORT}/pet-tmp/${encodeURIComponent(texFileName)}?${petModelStamp()}`,
        });
      } catch (e) {
        log(`[桌宠][show] ❌ 贴图 ${i} 写入失败: ${e.message}`);
      }
    }
    log(`[桌宠][show] 贴图文件已写入: ${textureMetas.length}/${modelData.textureFiles.length}`);
  }

  // 4. 缓存 petModelMeta（URL 形式，非 ArrayBuffer）
  //    桌宠窗口通过 getModel() 获取此对象，再用 fetch 获取每个 URL 的 ArrayBuffer
  petModelData = {
    name: modelData.name,
    modelWebkitRelativePath: modelData.modelWebkitRelativePath || '',
    url: `http://127.0.0.1:${UI_PORT}/pet-tmp/${encodeURIComponent(modelFileName)}?${petModelStamp()}`,
    textureFiles: textureMetas,  // 含 url，不含 data
  };
  log(`[桌宠][show] 模型 URL: ${petModelData.url}`);

  // 5. 创建/显示桌宠窗口
  const win = createPetWindow();
  log(`[桌宠][show] 窗口 isVisible=${win.isVisible()}, isDestroyed=${win.isDestroyed()}, isLoading=${win.webContents.isLoading()}`);

  if (win.isVisible()) {
    // 窗口已可见 → 通知更新模型（PetPage 会重新 fetch）
    win.webContents.send('desktop-pet:model-updated', petModelData);
    log('[桌宠][show] 窗口已可见，发送 model-updated 通知');
  } else if (!win.webContents.isLoading()) {
    // 窗口已加载但隐藏 → show + 通知更新
    // [v49] 关闭后重新打开：无条件回到默认位置（屏幕右下角）
    //   用户要求：重开必须出现在默认位置；旧位置可能已被拖到屏幕外（历史 DPI bug）
    try {
      const display = screen.getPrimaryDisplay();
      const wa = display.workArea;
      const w = win.getBounds().width || 400;
      const h = win.getBounds().height || 600;
      const newX = wa.x + wa.width - w - 20;
      const newY = wa.y + wa.height - h - 20;
      win.setBounds({ x: newX, y: newY, width: w, height: h });
      // 同步物理位置缓存（v47 物理像素移动的起点）
      const sf = screen.getPrimaryDisplay().scaleFactor || 1;
      petPhysPos = { x: Math.round(newX * sf), y: Math.round(newY * sf) };
      log('[桌宠][show][v49] 重开已重置默认位置 (' + newX + ',' + newY + ')');
    } catch (e) {
      log('[桌宠][show] 重置位置失败: ' + e.message);
    }
    win.show();
    win.webContents.send('desktop-pet:model-updated', petModelData);
    log('[桌宠][show] 页面已加载，直接 show + 发送 model-updated');
  } else {
    // 窗口首次创建，页面加载中 → ready-to-show 自动 show，PetPage getModel 获取缓存
    log('[桌宠][show] 页面加载中，等 ready-to-show 自动 show');
  }
  return { success: true };
});

// 隐藏桌宠（不销毁窗口，下次 show 可快速恢复）
ipcMain.on('desktop-pet:hide', () => {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.hide();
    log('[桌宠窗口] 隐藏');
  }
});

// 关闭并销毁桌宠窗口
ipcMain.on('desktop-pet:close', () => {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.destroy();
    petWindow = null;
    petModelData = null;
    log('[桌宠窗口] 关闭销毁');
  }
});

// 桌宠窗口获取模型数据（桌宠窗口加载时调用）

// ========== [Preview Owner 30fps] 唯一渲染源帧分发 ==========
// 主窗口 Preview 发帧 → 按通道订阅转发给桌宠/壁纸显示窗（显示窗无 Babylon）
const renderChannels = { pet: false, wallpaper: false };
ipcMain.on('render-channel', (_e, payload) => {
  const ch = payload && payload.channel;
  const on = !!(payload && payload.on);
  if (ch === 'pet' || ch === 'wallpaper') {
    renderChannels[ch] = on;
    log('[帧分发] 通道 ' + ch + ' = ' + (on ? '开' : '关') + ' pet=' + renderChannels.pet + ' wallpaper=' + renderChannels.wallpaper);
  }
});
ipcMain.handle('render-channels:get', () => ({ ...renderChannels }));
ipcMain.on('render-frame', (_e, frame) => {
  try {
    if (renderChannels.pet && petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('render-frame', frame);
    }
    if (renderChannels.wallpaper && wallpaperWindow && !wallpaperWindow.isDestroyed()) {
      wallpaperWindow.webContents.send('render-frame', frame);
    }
  } catch (err) {
    log('[帧分发] 转发异常: ' + (err && err.message));
  }
});
// 通道失效：窗口关闭即停订阅
app.on('browser-window-created', (_e, win) => { /* noop */ });

ipcMain.handle('desktop-pet:get-model', () => {
  return petModelData;
});

// [2026-09-17 v118] 默认模型加载 IPC：preload.defaultModel.load() → 本 handler
//   前端启动编排调用；主进程 ensureDefaultPetModel 扫 default 目录写 pet-tmp
//   返回形状必须是 { ok, meta }——NewPage 编排只认这个契约（v86/v88）
ipcMain.handle('desktop-pet:load-default', () => {
  try {
    const data = ensureDefaultPetModel();
    if (!data) return { ok: false, err: '默认模型不可用（目录缺失或无 pmx）' };
    return { ok: true, meta: data };
  } catch (e) {
    return { ok: false, err: e.message || String(e) };
  }
});

// [2026-09-25 v92断层补全] 默认模型目录登记/读取（preload.defaultModel.setDir/getDir）
ipcMain.handle('desktop-pet:set-default-dir', (_event, dir) => {
  try {
    if (typeof dir !== 'string' || !dir.trim()) return { success: false, err: 'dir 为空' };
    if (!fs.existsSync(dir)) return { success: false, err: '目录不存在: ' + dir };
    setDefaultModelDir(dir);
    log('[桌宠][默认目录] 已登记: ' + dir);
    return { success: true };
  } catch (e) {
    log('[桌宠][默认目录] 登记失败: ' + (e.message || e));
    return { success: false, err: e.message || String(e) };
  }
});
ipcMain.handle('desktop-pet:get-default-dir', () => {
  return getSavedDefaultModelDir() || DEFAULT_MODEL_DIR;
});

// 获取屏幕分辨率（桌宠窗口用于缩放限制）
ipcMain.handle('desktop-pet:get-screen-size', () => {
  const display = screen.getPrimaryDisplay();
  return {
    screenWidth: display.bounds.width,
    screenHeight: display.bounds.height,
    workWidth: display.workArea.width,
    workHeight: display.workArea.height,
    workX: display.workArea.x,
    workY: display.workArea.y,
    scaleFactor: display.scaleFactor,
  };
});

// 切换鼠标穿透（桌宠/壁纸窗口共用：ray pick 命中模型或控制台时 false，离开 true）
// [v62] 壁纸模式：BabylonModelViewer 组件写死调 desktopPet.setIgnoreMouse，
//   此处按"哪个窗口在场"分发，组件零改动兼容两种窗口
ipcMain.on('desktop-pet:set-ignore-mouse', (_event, ignore) => {
  const target = (petWindow && !petWindow.isDestroyed())
    ? petWindow
    : (wallpaperWindow && !wallpaperWindow.isDestroyed()) ? wallpaperWindow : null;
  if (target) target.setIgnoreMouseEvents(!!ignore, { forward: true });
});

// ========== [2026-08-31 v62] 壁纸模式 IPC ==========
ipcMain.handle('wallpaper-mode:enter', async () => {
  return enterWallpaperMode();
});
ipcMain.handle('wallpaper-mode:exit', async () => {
  return exitWallpaperMode();
});
// 控制台「桌面宠物模式」：退出壁纸（WE 恢复、主窗口不弹出）→ 恢复桌宠窗口
ipcMain.handle('wallpaper-mode:show-pet', async () => {
  try {
    // [v66] 切回桌宠模式：悬浮控制台一并退出
    destroyWallpaperConsoleWindow('切回桌宠');
    if (wallpaperWindow && !wallpaperWindow.isDestroyed()) {
      const hwnd = nativeHwndOf(wallpaperWindow);
      await runBridge('detach', hwnd);
      wallpaperWindow.destroy();
      wallpaperWindow = null;
      log('[壁纸→桌宠] 壁纸窗口已摘除');
    }
    if (weWasRunning) { await weControl('play'); weWasRunning = false; }
    // 主窗口保持隐藏（用户去桌面上和桌宠玩）
    if (petModelData) {
      // [v67 共存] 桌宠窗口若因三模式共存一直活着，就不再打扰（不重发模型、不触发重载）
      if (petWindow && !petWindow.isDestroyed() && petWindow.isVisible()) {
        log('[壁纸→桌宠] 桌宠窗口本就存活，跳过重载');
        return { success: true, pet: true, kept: true };
      }
      const win = createPetWindow();
      if (win.isVisible()) {
        win.webContents.send('desktop-pet:model-updated', petModelData);
      } else if (!win.webContents.isLoading()) {
        // 重开回默认位置（右下角，与 desktop-pet:show 的 v49 策略一致）
        try {
          const display = screen.getPrimaryDisplay();
          const wa = display.workArea;
          const w = win.getBounds().width || 400;
          const h = win.getBounds().height || 600;
          win.setBounds({ x: wa.x + wa.width - w - 20, y: wa.y + wa.height - h - 20, width: w, height: h });
        } catch (e2) { /* noop */ }
        win.show();
        win.webContents.send('desktop-pet:model-updated', petModelData);
      }
      log('[壁纸→桌宠] 桌宠窗口已恢复');
      return { success: true, pet: true };
    }
    // 无模型缓存 → 回主窗口让用户导入
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      try { mainWindow.webContents.setBackgroundThrottling(false); } catch (e2) { /* noop */ }
    }
    log('[壁纸→桌宠] 无模型缓存，回主窗口');
    return { success: true, pet: false };
  } catch (e) { return { success: false, error: e.message }; }
});
// [v181] 壁纸控制台新入口：退出壁纸模式 → 还原主窗口 → 导航到指定路由。
//   route 仅接受白名单：'/?call=1'（语音通话）与 '/settings'（设置），防止任意跳转。
//   '?call=1' 由前端 NewPage 读取 query 自动进入通话（对应用户"控制台直接进语音通话"的诉求）。

// [v181b] DSH 语言桥：软件语言 <-> DSH 界面语言双向同步（不改 DSH 代码，走 Host settings 文档）
//   正向：软件 setLang → 写 <DSH_HOME>/settings.yaml 的 locale.preference（DSH settings-file watch 热发布到页面）
//   反向：用户在 DSH 设置里切语言 → DSH 进程写同一文件 → fs.watch 捕获 → 广播给渲染层 setLang(fromDsh)
//   循环防护：桥自己写入后 2.5s 内忽略 watch 事件；渲染层对 fromDsh 的变更不再回写
const DSH_SETTINGS_YAML = path.join('C:', 'RUANLINYUN', 'dsh-harness', 'runtime', 'dsh-home', '.dsh', 'settings.yaml');
let dshLocaleWatchTimer = null;
let dshLocaleBridgeMuteUntil = 0;

function readDshLocalePreference() {
  try {
    const raw = fs.readFileSync(DSH_SETTINGS_YAML, 'utf8');
    const m = raw.match(/^locale:\s*$[\s\S]*?^\s{2}preference:\s*("?)(zh|en)\1/m);
    return m ? m[2] : null;
  } catch (e) { return null; }
}

function writeDshLocalePreference(lang) {
  try {
    if (lang !== 'zh' && lang !== 'en') return false;
    let raw = '';
    try { raw = fs.readFileSync(DSH_SETTINGS_YAML, 'utf8'); } catch (e0) { raw = ''; }
    dshLocaleBridgeMuteUntil = Date.now() + 2500;
    if (/^locale:\s*$/m.test(raw)) {
      if (/^(\s{2}preference:\s*)("?)(zh|en)\2/m.test(raw)) {
        raw = raw.replace(/^(\s{2}preference:\s*)("?)(zh|en)\2/m, '$1' + lang);
      } else {
        raw = raw.replace(/^(locale:\s*)$/m, '$1\n  preference: ' + lang);
      }
    } else {
      raw = raw.trimEnd() + '\nlocale:\n  preference: ' + lang + '\n';
    }
    fs.writeFileSync(DSH_SETTINGS_YAML, raw, 'utf8');
    log('[v181b] DSH locale bridge -> ' + lang);
    return true;
  } catch (e) { log('[v181b] DSH locale bridge write fail: ' + e.message); return false; }
}

ipcMain.handle('dsh-locale:sync', (_e, lang) => {
  const ok = writeDshLocalePreference(String(lang));
  return { success: ok };
});

// 反向：watch settings.yaml（防抖 800ms；跳过桥自己触发的窗口期）
try {
  fs.watch(DSH_SETTINGS_YAML, () => {
    clearTimeout(dshLocaleWatchTimer);
    dshLocaleWatchTimer = setTimeout(() => {
      if (Date.now() < dshLocaleBridgeMuteUntil) return;
      const lang = readDshLocalePreference();
      if (!lang) return;
      if (mainWindow && !mainWindow.isDestroyed()) {
        try { mainWindow.webContents.send('dsh-locale-changed', lang); } catch (e1) { /* noop */ }
      }
    }, 800);
  });
} catch (e) { log('[v181b] DSH locale watch unavailable: ' + e.message); }


// [v185] 通话状态桥：主页 <-> 壁纸控制台 单一状态源（主进程持状态，双端订阅）
let callStateInCall = false;
ipcMain.on('call-state:push', (_e, v) => {
  callStateInCall = !!v;
  if (wallpaperConsoleWindow && !wallpaperConsoleWindow.isDestroyed()) {
    try { wallpaperConsoleWindow.webContents.send('call-state:changed', callStateInCall); } catch (e1) { /* noop */ }
  }
  log('[v185] call-state -> ' + callStateInCall);
});
ipcMain.handle('call-state:request-toggle', () => {
  // 控制台点击：把意图转给主窗口渲染层执行（拨打/挂断由 NewPage 决策），状态回推走 call-state:push
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.webContents.send('call-state:toggle-request'); } catch (e1) { /* noop */ }
  }
  return { success: true, inCall: callStateInCall };
});

ipcMain.handle('wallpaper-mode:navigate-main', async (_event, route) => {
  try {
    const r = String(route || '');
    const allowed = ['/?call=1', '/settings'];
    if (!allowed.includes(r)) return { success: false, error: 'route not allowed: ' + r };
    const exit = await exitWallpaperMode();
    if (exit && exit.success === false) return { success: false, error: exit.error || 'exit failed' };
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { if (mainWindow.isMinimized()) mainWindow.restore(); } catch (e1) { /* noop */ }
      mainWindow.show(); mainWindow.focus();
      try { mainWindow.webContents.setBackgroundThrottling(false); } catch (e2) { /* noop */ }
      const target = 'http://127.0.0.1:' + UI_PORT + r;
      await mainWindow.webContents.executeJavaScript('window.location.assign(' + JSON.stringify(target) + ')').catch(() => {});
      log('[壁纸控制台] navigate-main ' + r);
      return { success: true, route: r };
    }
    return { success: false, error: 'main window gone' };
  } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('wallpaper-mode:get-status', () => {
  return {
    active: !!(wallpaperWindow && !wallpaperWindow.isDestroyed()),
    hasModel: !!petModelData,
  };
});

// ═══════ [2026-10-01 3D场景] 布局持久化 + 资产落盘 + 控制台直达编辑模式 ═══════
//   布局文件：USER_DATA_DIR/scene3d-layout.json（壁纸窗口经 scene3d:get-layout 读取）
//   资产目录：<app>/frontend-dist/scene3d/（5175 静态服务直达，壁纸窗口相对路径可取；
//     与 vmd 自制资产同一先例：运行期资产写入 frontend-dist）
const SCENE3D_LAYOUT_FILE = path.join(USER_DATA_DIR, 'scene3d-layout.json');
const SCENE3D_ASSET_DIR = path.join(__dirname, 'frontend-dist', 'scene3d');

function scene3dSafeRel(rel) {
  const s = String(rel || '').replace(/\\/g, '/');
  if (!s || s.startsWith('/') || s.split('/').some((seg) => !seg || seg === '.' || seg === '..' || /[:*?"<>|]/.test(seg))) {
    return null;
  }
  return s;
}

ipcMain.handle('scene3d:get-layout', async () => {
  try {
    if (!fs.existsSync(SCENE3D_LAYOUT_FILE)) return '';
    return fs.readFileSync(SCENE3D_LAYOUT_FILE, 'utf8');
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('scene3d:set-layout', async (_event, json) => {
  try {
    const s = String(json || '');
    if (s.length > 2 * 1024 * 1024) return { success: false, error: 'layout too large' };
    JSON.parse(s); // 先校验再落盘，防坏文件
    fs.writeFileSync(SCENE3D_LAYOUT_FILE, s, 'utf8');
    log('[3D场景] 布局已保存 (' + s.length + 'B)');
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('scene3d:save-asset', async (_event, relPath, data) => {
  try {
    const rel = scene3dSafeRel(relPath);
    if (!rel) return { success: false, error: 'bad path: ' + relPath };
    const target = path.join(SCENE3D_ASSET_DIR, rel);
    if (!target.startsWith(SCENE3D_ASSET_DIR)) return { success: false, error: 'path escape' };
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const buf = Buffer.from(data);
    if (buf.length > 200 * 1024 * 1024) return { success: false, error: 'asset too large' };
    fs.writeFileSync(target, buf);
    log('[3D场景] 资产已保存: ' + rel + ' (' + buf.length + 'B)');
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

// 壁纸控制台「3D 场景」：退出壁纸 → 主窗口跳 /new-page?scene3d=1（NewPage 挂载即进 3D 编辑模式）
ipcMain.handle('scene3d:enter', async () => {
  try {
    const exit = await exitWallpaperMode();
    if (exit && exit.success === false) return { success: false, error: exit.error || 'exit failed' };
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { if (mainWindow.isMinimized()) mainWindow.restore(); } catch (e1) { /* noop */ }
      mainWindow.show(); mainWindow.focus();
      try { mainWindow.webContents.setBackgroundThrottling(false); } catch (e2) { /* noop */ }
      const target = 'http://127.0.0.1:' + UI_PORT + '/new-page?scene3d=1';
      await mainWindow.webContents.executeJavaScript('window.location.assign(' + JSON.stringify(target) + ')').catch(() => {});
      log('[3D场景] 控制台直达编辑模式');
      return { success: true };
    }
    return { success: false, error: 'main window gone' };
  } catch (e) { return { success: false, error: e.message }; }
});

// [v67] 悬浮控制台悬浮球/面板两种形态切换时，渲染进程申报窗口尺寸。
//   控制台是无边框透明窗：若保持面板大小而只画一个球，透明区域会挡住下方桌面图标的点击。
//   收成球时窗口同步缩到球大小，展开时再放大，透明区域始终趋近于零。
ipcMain.handle('wallpaper-console:set-size', (_event, width, height) => {
  try {
    if (wallpaperConsoleWindow && !wallpaperConsoleWindow.isDestroyed()) {
      const b = wallpaperConsoleWindow.getBounds();
      wallpaperConsoleWindow.setBounds({
        width: Math.max(20, Math.round(width) || b.width),
        height: Math.max(20, Math.round(height) || b.height),
      });
      return { success: true };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
  return { success: false };
});

// [v69] 手动拖拽：渲染层用鼠标事件算目标坐标，经 IPC 移动窗口。
//   背景：-webkit-app-region: drag 在本透明无框窗口上实测不可用（v68 改 resizable 也没用），
//   手动拖拽不依赖窗口命中测试，保证可拖。
ipcMain.handle('wallpaper-console:get-pos', () => {
  if (wallpaperConsoleWindow && !wallpaperConsoleWindow.isDestroyed()) {
    const b = wallpaperConsoleWindow.getBounds();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }
  return null;
});
ipcMain.handle('wallpaper-console:set-pos', (_event, x, y) => {
  try {
    if (wallpaperConsoleWindow && !wallpaperConsoleWindow.isDestroyed()) {
      const wa = screen.getPrimaryDisplay().workArea;
      const b = wallpaperConsoleWindow.getBounds();
      // 夹在工作区内，球/面板拖不出屏幕
      const nx = Math.max(wa.x, Math.min(Math.round(x), wa.x + wa.width - b.width));
      const ny = Math.max(wa.y, Math.min(Math.round(y), wa.y + wa.height - b.height));
      wallpaperConsoleWindow.setPosition(nx, ny);
      return { success: true, x: nx, y: ny };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
  return { success: false };
});

// [2026-08-06 边框跟着角色放大缩小 v2] 桌宠窗口请求调整自身尺寸
// 用户需求（v2）：
//   1. 放大缩小时窗口中心点固定（同一原点），不跑来跑去
//   2. 放大到屏幕最高处时，窗口上下边自动吸附屏幕上下边（占满屏幕高度）
//   3. 最小处不主动管（相机 lowerRadiusLimit 已兜底）
//   4. 流畅稳定（渲染进程已用 rAF 合并 wheel 事件降频）
// 位置策略（中心点固定）：
//   - 放大缩小时保持窗口中心位置不变：newX = curCenterX - newW/2, newY = curCenterY - newH/2
//   - 优点：用户不动它时，放大缩小都在同一中心点，不会"从A点放大站满屏幕，缩小又到C点"
//   - 当放大到高度=屏幕工作区高度时，上下自动吸附（y=wa.y, height=wa.height）
//   - 边界保护：窗口不超出工作区
// [v36 修复] 拖拽冻结：渲染进程右键拖拽期间冻结窗口 resize（防拖拽前残留的 resize IPC 在拖拽中执行导致"闪+放大"）。
// 冻结期间收到的 resize 请求缓存最后一条，解冻时执行（保证模型加载完成补执行等场景不丢失）。
let petResizeFrozen = false;
let petPendingResize = null;
// ===== [v47 方案A] Win32 物理像素移动（C# MoveWindowHelper 常驻进程，绕开 Electron DIP 转换漂移）=====
//   实验证据：物理像素 SetWindowPos(SWP_NOSIZE) 移动 30 次 drift=0,0；Electron setBounds 同条件 +46px
//   v46 用 koffi 但部署环境无编译缓存（Cannot find the native Koffi module）→ 改 C# helper（csc 编译，零依赖）
let moveHelper = null;  // { move(hwndNum, x, y) -> bool }
let moveHelperFail = 0; // 连续失败计数（>3 降级回退 setBounds）
(function initMoveHelper() {
  try {
    const helperPath = path.join(__dirname, 'MoveWindowHelper.exe');
    if (!fs.existsSync(helperPath)) {
      log('[v47] MoveWindowHelper.exe 不存在，回退 setBounds');
      return;
    }
    const { spawn } = require('child_process');
    const proc = spawn(helperPath, [], { stdio: ['pipe', 'ignore', 'pipe'] });
    proc.on('error', (e) => { log('[v47] helper 启动失败: ' + e.message); moveHelper = null; });
    proc.on('exit', (code) => { log('[v47] helper 退出 code=' + code); moveHelper = null; });
    moveHelper = {
      move: (hwndNum, x, y) => {
        try {
          if (!proc || !proc.stdin || proc.stdin.destroyed) return false;
          proc.stdin.write(hwndNum + ' ' + x + ' ' + y + '\n');
          return true;
        } catch (e) { return false; }
      },
    };
    log('[v47] Win32 物理移动已启用 (MoveWindowHelper.exe)');
  } catch (e) {
    log('[v47] Win32 物理移动不可用，回退 setBounds: ' + e.message);
  }
})();
let petPhysPos = null; // 桌宠窗口物理像素位置 { x, y }
ipcMain.on('desktop-pet:set-resize-frozen', (_event, frozen) => {
  petResizeFrozen = !!frozen;
  if (frozen) {
    petPendingResize = null; // 拖拽开始：丢弃拖拽前残留的 resize 请求
  } else if (petPendingResize) {
    // 解冻：执行缓存的那条（渲染进程补执行时机可能早于本消息到达）
    const p = petPendingResize;
    petPendingResize = null;
    log('[桌宠窗口][resize] 解冻补执行缓存 ' + p.width + 'x' + p.height);
    try {
      // [v39 修复] 用当前位置 + 新尺寸（缓存不再记录拖拽起点 x/y，防松手瞬间窗口被拉回起点="闪"）
      const cur = petWindow.getBounds();
      // [v41 修复] 解冻补执行：尺寸再限一遍工作区（缓存路径已 clamp，此处双保险）
      const wa41 = screen.getPrimaryDisplay().workArea;
      petWindow.setBounds({
        x: cur.x, y: cur.y,
        width: Math.max(96, Math.min(wa41.width, Math.ceil(p.width))),
        height: Math.max(96, Math.min(wa41.height, Math.ceil(p.height))),
      });
    } catch (e) { log('[桌宠窗口][resize] 解冻补执行失败: ' + e.message); }
  }
});
ipcMain.on('desktop-pet:resize-window', (_event, payload) => {
  if (!petWindow || petWindow.isDestroyed()) return;
  if (petResizeFrozen) {
    // 拖拽中：只缓存最后一条，不执行（杜绝拖拽中的闪与放大）
    if (payload && typeof payload.width === 'number' && typeof payload.height === 'number') {
      // [v39] 只缓存尺寸，不缓存位置（解冻时用当前位置，防拉回起点闪跳）
      // [v41] 缓存时即限制在工作区内（防解冻补执行超屏宽）
      const wa41 = screen.getPrimaryDisplay().workArea;
      petPendingResize = {
        width: Math.max(96, Math.min(wa41.width, Math.ceil(payload.width))),
        height: Math.max(96, Math.min(wa41.height, Math.ceil(payload.height))),
      };
    }
    return;
  }
  if (!payload || typeof payload.width !== 'number' || typeof payload.height !== 'number') return;
  try {
    const display = screen.getPrimaryDisplay();
    const wa = display.workArea;
    // [v41 修复] 宽度上限：限制在工作区宽度内（修复"突破屏幕最宽处"）
    const newW = Math.max(96, Math.min(wa.width, Math.ceil(payload.width)));
    const newH = Math.max(96, Math.min(Math.ceil(payload.height), wa.height));

    const curBounds = petWindow.getBounds();
    // [诊断] 记录每次 resize 请求（含调用栈前3帧便于定位来源）
    const stack = new Error().stack || '';
    const stackLines = stack.split('\n').slice(1, 4).map(s => s.trim()).join(' | ');
    log(`[桌宠窗口][resize] 请求 ${payload.width}x${payload.height} → ${newW}x${newH} 当前=${curBounds.width}x${curBounds.height} 来源=${stackLines}`);
    // 仅当尺寸实际变化时才 setBounds（避免无谓调用触发 resize 连锁）
    if (curBounds.width === newW && curBounds.height === newH) return;

    // 中心点固定策略：保持窗口中心位置不变
    const curCenterX = curBounds.x + curBounds.width / 2;
    const curCenterY = curBounds.y + curBounds.height / 2;
    let newX = Math.round(curCenterX - newW / 2);
    let newY = Math.round(curCenterY - newH / 2);

    // 吸附：当窗口高度=屏幕工作区高度（放大到极限）时，上下边贴合屏幕上下边
    if (newH >= wa.height) {
      newY = wa.y;  // 上边贴合屏幕顶部
      // 下边自然贴合屏幕底部（newY + newH = wa.y + wa.height）
    }

    // 边界保护：高度不超出工作区，宽度允许超出（透明窗口）
    if (newY < wa.y) newY = wa.y;
    if (newY + newH > wa.y + wa.height) newY = wa.y + wa.height - newH;
    // 宽度方向：如果超出屏幕，保证窗口中心在屏幕内即可
    if (newX + newW < wa.x + 96) newX = wa.x + 96 - newW;
    if (newX > wa.x + wa.width - 96) newX = wa.x + wa.width - 96;

    petWindow.setBounds({ x: newX, y: newY, width: newW, height: newH });
  } catch (e) {
    log(`[桌宠窗口][resize] 失败: ${e.message}`);
  }
});

// [2026-08-06 右键拖拽移动窗口] 桌宠窗口请求相对移动位置
// 用户需求：鼠标右键可以把边框（角色）拖到桌面任何位置
// 设计：
//   1. 接收相对位移 { deltaX, deltaY }（渲染进程从右键 pointermove 计算）
//   2. 新位置 = 当前位置 + 相对位移
//   3. 边界保护：窗口至少有一部分在屏幕内（不要求完全在屏幕内，允许部分超出方便靠边放置）
//   4. 与 resize 独立：拖拽时不触发 resize，resize 时不触发拖拽，互不干扰
ipcMain.on('desktop-pet:move-window', (_event, payload) => {
  if (!petWindow || petWindow.isDestroyed()) return;
  if (!payload || typeof payload.deltaX !== 'number' || typeof payload.deltaY !== 'number') return;
  try {
    const curBounds = petWindow.getBounds();
    // ===== [v46 方案A] 物理像素移动（根治 125% 缩放 DIP 转换漂移）=====
    if (moveHelper && moveHelperFail < 3) {
      const sf = screen.getPrimaryDisplay().scaleFactor || 1;
      // 初始化物理位置：首次或与 DIP 位置偏差过大（窗口被系统移动过）时重建
      const dipX = Math.round(curBounds.x * sf), dipY = Math.round(curBounds.y * sf);
      if (!petPhysPos || Math.abs(petPhysPos.x - dipX) > 50 || Math.abs(petPhysPos.y - dipY) > 50) {
        petPhysPos = { x: dipX, y: dipY };
      }
      const dx = Math.round(payload.deltaX * sf);
      const dy = Math.round(payload.deltaY * sf);
      let newX = petPhysPos.x + dx;
      let newY = petPhysPos.y + dy;
      // 边界保护：窗口中心必须在屏幕内（物理像素换算）
      const wa = screen.getPrimaryDisplay().workArea;
      const physW = Math.round(curBounds.width * sf);
      const physH = Math.round(curBounds.height * sf);
      const waX = Math.round(wa.x * sf), waY = Math.round(wa.y * sf);
      const waW = Math.round(wa.width * sf), waH = Math.round(wa.height * sf);
      if (newX + physW / 2 < waX) newX = waX - physW / 2;
      if (newX + physW / 2 > waX + waW) newX = waX + waW - physW / 2;
      if (newY + physH / 2 < waY) newY = waY - physH / 2;
      if (newY + physH / 2 > waY + waH) newY = waY + waH - physH / 2;
      const fx = Math.round(newX), fy = Math.round(newY);
      if (!Number.isFinite(fx) || !Number.isFinite(fy)) {
        log(`[桌宠窗口][move][v46] 跳过：坐标非有限数 newX=${newX} newY=${newY} delta=${payload.deltaX},${payload.deltaY}`);
        return;
      }
      petPhysPos.x = fx;
      petPhysPos.y = fy;
      const hwndBuf = petWindow.getNativeWindowHandle();
      if (hwndBuf && hwndBuf.length >= 8) {
        const hwndNum = Number(hwndBuf.readBigUInt64LE(0));
        const moveOk = moveHelper.move(hwndNum, fx, fy);
        if (!moveOk) {
          moveHelperFail++;
          log(`[桌宠窗口][move][v47] helper 写入失败(${moveHelperFail})`);
          if (moveHelperFail >= 3) log('[v47] 连续失败，降级回退 setBounds');
        } else {
          moveHelperFail = 0;
        }
        return;
      }
    }
    // ===== 回退：原 setBounds 逻辑（koffi 不可用/降级时）=====
    let newX2 = Math.round(curBounds.x + payload.deltaX);
    let newY2 = Math.round(curBounds.y + payload.deltaY);
    const display = screen.getPrimaryDisplay();
    const wa2 = display.workArea;
    const centerX = newX2 + curBounds.width / 2;
    const centerY = newY2 + curBounds.height / 2;
    if (centerX < wa2.x) newX2 = Math.round(wa2.x - curBounds.width / 2);
    if (centerX > wa2.x + wa2.width) newX2 = Math.round(wa2.x + wa2.width - curBounds.width / 2);
    if (centerY < wa2.y) newY2 = Math.round(wa2.y - curBounds.height / 2);
    if (centerY > wa2.y + wa2.height) newY2 = Math.round(wa2.y + wa2.height - curBounds.height / 2);
    if (!Number.isFinite(newX2) || !Number.isFinite(newY2)) {
      log(`[桌宠窗口][move] 跳过：坐标非有限数 newX=${newX2} newY=${newY2} delta=${payload.deltaX},${payload.deltaY} bounds=${curBounds.x},${curBounds.y}`);
      return;
    }
    petWindow.setBounds({ x: newX2, y: newY2, width: curBounds.width, height: curBounds.height });
    const afterBounds = petWindow.getBounds();
    if (afterBounds.width !== curBounds.width || afterBounds.height !== curBounds.height) {
      petWindow.setBounds({ x: newX2, y: newY2, width: curBounds.width, height: curBounds.height });
      const recheck = petWindow.getBounds();
      if (recheck.width !== curBounds.width || recheck.height !== curBounds.height) {
        log(`[桌宠窗口][move][警告] 回拨后仍漂移 before=${curBounds.width}x${curBounds.height} after=${afterBounds.width}x${afterBounds.height} recheck=${recheck.width}x${recheck.height}`);
      }
    }
  } catch (e) {
    log(`[桌宠窗口][move] 失败: ${e.message}`);
  }
});

// 桌宠窗口请求显示自己（模型加载完成后调用）
// [2026-08-06 v3 修复"什么都没有"]
//   之前仅当 !isVisible() 时才 show，但 ready-to-show 已 show 过 → 此处不重 show。
//   问题：窗口虽 visible=true，但可能被主窗口遮挡、或鼠标穿透导致用户感觉"什么都没有"。
//   修复：
//     1. 无论是否 visible 都调用 focus() 置顶激活（alwaysOnTop:true 配合，确保用户能看到）
//     2. 调用 setBounds 重置位置到屏幕右下角（防止窗口被拖到屏幕外）
//     3. 短暂关闭鼠标穿透（false），让用户能感知到窗口存在（ray pick 后再切换）
//     4. 详细日志：可见性、位置、尺寸、是否聚焦，便于诊断
ipcMain.on('desktop-pet:show-window', () => {
  if (!petWindow || petWindow.isDestroyed()) {
    log('[桌宠窗口][show-window] 桌宠窗口不存在，跳过');
    return;
  }
  const bounds = petWindow.getBounds();
  const wasVisible = petWindow.isVisible();
  log(`[桌宠窗口][show-window] 进入: isVisible=${wasVisible}, bounds=${JSON.stringify(bounds)}, isFocused=${petWindow.isFocused()}`);

  if (!wasVisible) {
    petWindow.show();
    log('[桌宠窗口][show-window] 窗口未可见，已调用 show()');
  }

  // 重置位置到屏幕右下角（防止窗口被拖到屏幕外导致用户看不到）
  try {
    const display = screen.getPrimaryDisplay();
    const wa = display.workArea;
    const w = bounds.width || 400;
    const h = bounds.height || 600;
    const newX = wa.x + wa.width - w - 20;
    const newY = wa.y + wa.height - h - 20;
    // 仅当当前位置明显超出工作区时才重置（避免用户故意拖动后被强制拉回）
    const outOfBounds = bounds.x < wa.x - 50 || bounds.y < wa.y - 50
      || bounds.x + w > wa.x + wa.width + 50
      || bounds.y + h > wa.y + wa.height + 50;
    if (outOfBounds && !petResizeFrozen) { // [v37] 拖拽冻结期间跳过位置重置（防拖拽中模型重载触发 show-window 导致窗口跳变"闪"）
      petWindow.setBounds({ x: newX, y: newY, width: w, height: h });
      log(`[桌宠窗口][show-window] 窗口超出工作区，已重置到 (${newX},${newY})`);
    }
  } catch (e) {
    log(`[桌宠窗口][show-window] setBounds 失败: ${e.message}`);
  }

  // 置顶激活（让窗口浮到最前，用户能看到）
  try {
    if (petWindow.isMinimized()) {
      petWindow.restore();
    }
    if (!petResizeFrozen) { // [v39] 拖拽中不抢焦点（防拖拽中模型重载 focus 打断操作）
      petWindow.focus();
      log('[桌宠窗口][show-window] 已调用 focus() 置顶激活');
    }
  } catch (e) {
    log(`[桌宠窗口][show-window] focus 失败: ${e.message}`);
  }

  // [诊断] 输出最终状态
  setTimeout(() => {
    if (petWindow && !petWindow.isDestroyed()) {
      log(`[桌宠窗口][show-window] 最终状态: isVisible=${petWindow.isVisible()}, bounds=${JSON.stringify(petWindow.getBounds())}, isFocused=${petWindow.isFocused()}`);
    }
  }, 100);

  // [2026-08-06 v4 客观验证] 延迟截图诊断
  // 模型加载完成 + showWindow 后，截图看窗口实际渲染了什么内容
  // 延迟 3 秒是为了让 Babylon.js 完成首帧渲染
  setTimeout(() => {
    capturePetWindowDiag('show-window-3s');
  }, 3000);
  // 再延迟 8 秒截一次（防止 3 秒时模型还没加载完）
  setTimeout(() => {
    capturePetWindowDiag('show-window-8s');
  }, 8000);
});

// 窗口控制（主窗口自定义标题栏按钮）
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window:toggle-maximize', () => {
  if (!mainWindow) return;
  // [v140 证据] 代码已在 kks 且 hash 一致，但 Windows 上 setFullScreen 表现仍像伪全屏
  //   （任务栏/边框感）。真全屏改走 setKiosk（覆盖任务栏）+ setFullScreen，并打日志取证。
  const goingFs = !(mainWindow.isKiosk() || mainWindow.isFullScreen());
  log(`[全屏] toggle → ${goingFs ? '进入' : '退出'} 之前 kiosk=${mainWindow.isKiosk()} fs=${mainWindow.isFullScreen()} max=${mainWindow.isMaximized()}`);
  try {
    if (goingFs) {
      try { mainWindow.setFullScreen(true); } catch (e) { log('[全屏] setFullScreen 进入失败: ' + e.message); }
      try { mainWindow.setKiosk(true); } catch (e) { log('[全屏] setKiosk 进入失败: ' + e.message); }
    } else {
      try { mainWindow.setKiosk(false); } catch (e) { log('[全屏] setKiosk 退出失败: ' + e.message); }
      try { mainWindow.setFullScreen(false); } catch (e) { log('[全屏] setFullScreen 退出失败: ' + e.message); }
      if (!mainWindow.isMaximized()) {
        try { mainWindow.setSize(1280, 800); mainWindow.center(); } catch { /* noop */ }
      }
    }
  } catch (e) {
    log('[全屏] toggle 异常: ' + e.message);
  }
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  log(`[全屏] 结果 kiosk=${mainWindow.isKiosk()} fs=${mainWindow.isFullScreen()} bounds=${JSON.stringify(mainWindow.getBounds())} display=${JSON.stringify(display.bounds)}`);
  mainWindow.webContents.send('window:maximize-changed', goingFs);
});

// [v12/v139/v140] 查询是否处于「全屏/Kiosk/最大化」——前端按钮图标用同一 API
ipcMain.handle('window:is-maximized', () => {
  if (!mainWindow) return false;
  return mainWindow.isKiosk() || mainWindow.isFullScreen() || mainWindow.isMaximized();
});

// ========== App 生命周期 ==========
app.whenReady().then(async () => {
  // [v57] 确保 resources/.env 存在（后端 API 配置持久化目标）
  // 根因：kks 打包产物无 .env，SettingsPage 保存配置写 .env 失败 → 重启后配置丢失
  try {
    const envPath = path.join(process.resourcesPath, '.env');
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, '', 'utf8');
      log('[v57] 已创建 resources/.env（API 配置持久化目标）');
    }
  } catch (e) { /* 无权限等场景忽略 */ }
  log(`Electron ready. Packaged=${isPackaged}`);
  log(`Resources dir: ${process.resourcesPath}`);
  log(`Frontend dist: ${FRONTEND_DIST}`);
  log(`Backend dist: ${BACKEND_DIST || '(none)'}`);

  // [v13 根修缓存导致旧代码被执行] 启动前清理所有 Chromium 缓存目录
  //   [修复问题4] 直接使用USER_DATA_DIR常量，不依赖app.getPath('userData')
  //   根因（完整证据链）：
  //   1. 日志证据：22次启动无任何"启动清理"记录，说明cleanedCount=0（fs.existsSync全部返回false）
  //   2. app.getPath('userData')可能返回与USER_DATA_DIR不一致的路径
  //      （app.setPath在第167行调用，但app.getPath在app.whenReady内第1201行调用，
  //       可能因Electron内部初始化时序导致路径不一致）
  //   3. kks目录isPackaged=false（resources\下无frontend-dist），
  //      USER_DATA_DIR=__dirname\.electron-userdata=kks\resources\app\.electron-userdata
  //   4. 缓存目录确实在USER_DATA_DIR下（LS确认有GPUCache和Network），但app.getPath找不到
  //   修复：直接用USER_DATA_DIR常量，并总是输出日志（无论cleanedCount是否为0）
  try {
    const userDataPath = USER_DATA_DIR;  // [修复问题4] 直接用常量，不依赖app.getPath
    log(`[启动清理] userDataPath=${userDataPath}`);
    // [v169 缓存保留] 仅当前端产物变化（index.html 尺寸/修改时间变化）才清缓存。
    //   旧行为=每次启动全删 GPUCache/GrShaderCache/Dawn*Cache → 着色器每次启动全量重编译，
    //   模型首帧多等数秒，直接违背"后台疯狂加载"的启动目标。日常启动缓存全保留。
    const idxPath = path.join(__dirname, 'frontend-dist', 'index.html');
    let buildSig = 'unknown';
    try {
      const st = fs.statSync(idxPath);
      buildSig = `${st.size}_${Math.round(st.mtimeMs)}`;
    } catch (e) { /* 无 index.html 时按未知签名，强制清一次 */ }
    const markerPath = path.join(userDataPath, '.cache-build-sig');
    let lastSig = '';
    try { lastSig = fs.readFileSync(markerPath, 'utf8').trim(); } catch (e) { /* 首次无标记 */ }
    if (lastSig === buildSig && buildSig !== 'unknown') {
      log(`[启动清理] 前端产物未变化（sig=${buildSig}），跳过缓存清理（保留着色器/代码缓存加速启动）`);
    } else {
      const cacheDirs = ['GPUCache', 'Code Cache', 'Cache', 'Service Worker', 'GrShaderCache',
                         'DawnGraphiteCache', 'DawnWebGPUCache', 'blob_storage', 'Network'];
      let cleanedCount = 0;
      for (const dir of cacheDirs) {
        const cachePath = path.join(userDataPath, dir);
        if (fs.existsSync(cachePath)) {
          try {
            fs.rmSync(cachePath, { recursive: true, force: true });
            cleanedCount++;
            log(`[启动清理] 已删除: ${dir}`);
          } catch (e) {
            log(`[启动清理] 删除失败: ${dir} (${e.message})`);
          }
        }
      }
      try { fs.writeFileSync(markerPath, buildSig, 'utf8'); } catch (e) { /* noop */ }
      log(`[启动清理] 前端产物变化（旧=${lastSig || '无'} 新=${buildSig}），已清理 ${cleanedCount} 个目录`);
    }
  } catch (e) {
    log(`[启动清理] 异常: ${e.message}`);
  }

  try {
    // [v168 启动优先级 · 用户锁定]
    // 黽屏 = 加载页：尽量把该加载的都加载掉
    // 优先级1：3D模型（用户最先看到）+ DSH（主界面后可能立刻点）+ UI
    // 优先级2：后端/动作/语音等，进主界面后再慢慢起
    // 禁止：主界面 loadURL 后二次 reload（会打断模型加载）

    // —— 优先级1a：DSH 第一批后台狂拉，不挡建窗 ——
    log('[启动][优先级1][DSH] 立即后台拉起...');
    try {
      if (!dshHarnessBridge) {
        log('[启动][DSH] bridge 不可用');
        bootMilestone('dshReady', 'DSH 桥不可用（仅本机 UI）');
      } else if (!readDshResidentEnabled()) {
        // [v178] 「DSH 常驻服务」开关新语义 = 随软件启动预热。
        //   关 → 启动不拉 DSH（省内存/快速启动），进入 DSH 页面时 dsh-harness:start 按需拉起。
        //   注意：退出软件时 DSH 无条件一起关（v178），本开关不再影响退出行为。
        log('[启动][DSH] 常驻开关=关 → 跳过预热（按需启动）');
        bootMilestone('dshReady', 'DSH 未预热（按需启动）');
      } else {
        Promise.resolve()
          .then(() => dshHarnessBridge.start())
          .then((dshBoot) => {
            log(`[启动][DSH] ${dshBoot && dshBoot.ok ? 'OK ' + dshBoot.url + ' src=' + (dshBoot.source || '') : 'FAIL ' + ((dshBoot && dshBoot.error) || '?')}`);
            // [v174] DSH 起没起来是真实事件，成功/失败都算"这件事结束了"（失败不挡启动）
            bootMilestone('dshReady', dshBoot && dshBoot.ok ? 'DSH 服务就绪' : 'DSH 暂不可用（后台重试）');
          })
          .catch((e) => {
            log('[启动][DSH] 异常: ' + (e && e.message));
            bootMilestone('dshReady', 'DSH 暂不可用（后台重试）');
          });
      }
    } catch (e) {
      log('[启动][DSH] 异常: ' + (e && e.message));
    }

    // —— 黑屏进度页（v169：独立 splash 窗口，主窗口后台加载）——
    log('[启动] 开始创建主窗口（后台）...');
    createWindow();
    log('[启动] 主窗口创建完成');
    const splashOk = createSplashWindow();
    bootMilestone('frame');
    // [v175] 软件自己的托盘图标常开（用户要求"小托盘保留，单击=退出应用"）；
    //   软件退出后守卫图标接管（守卫探到软件端口在跑会自动隐藏，保证只有一个图标）
    createAppTray();
    if (!splashOk) {
      // splash 创建失败 → 回退 v164 行为：主窗口立即显示
      try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show(); } catch (e) { /* noop */ }
    }

    // —— 静态服务：UI 依赖，目标尽快 ——
    log('[启动] 开始启动静态服务...');
    uiServer = await startStaticServer().catch((e) => {
      log('[启动] 静态服务异常: ' + (e && e.message));
      return null;
    });
    log(uiServer ? '[启动] 静态服务启动完成' : '[启动] 静态服务未就绪（后台再试）');
    if (uiServer) bootMilestone('staticServer');
    if (!uiServer) {
      startStaticServer().then((s) => { uiServer = s; log('[启动] 静态服务迟到就绪'); }).catch(() => {});
    }

    // —— 优先级1b：黑屏阶段预热（模型第一）——
    // 默认/上次模型写入 pet-tmp，主界面一出来 NewPage 缓存/默认加载就能秒进
    try {
      const d = ensureDefaultPetModel();
      log('[启动][优先级1][模型] 预热默认3D: ' + (d ? (d.name || 'ok') : '无模型/跳过'));
      bootMilestone('modelWarm', d && d.name ? ('模型预热完成 · ' + d.name) : '模型预热完成');
      // [v174] 本次没有模型要加载 → 渲染里程碑一并判为完成，否则进度会永远差 16 分
      if (!d) bootMilestone('modelRendered', '无模型，跳过渲染');
    } catch (e) {
      log('[启动][优先级1][模型] 预热异常: ' + (e && e.message));
    }
    try {
      const warmAssets = async () => {
        const base = `http://127.0.0.1:${UI_PORT}`;
        const html = await fetch(base + '/').then((r) => r.text());
        const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
        await Promise.all(assets.map((a) => fetch(base + a).then((r) => r.arrayBuffer()).catch(() => null)));
        log(`[启动][优先级1][UI] 预热前端资源 ${assets.length} 个`);
      };
      Promise.resolve().then(() => warmAssets()).catch((e) => log('[启动] 预热前端失败: ' + (e && e.message)));
    } catch (e) { log('[启动] 预热异常: ' + (e && e.message)); }

    // —— 进主界面：只 loadURL 一次，禁止二次 reload ——
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`http://127.0.0.1:${UI_PORT}/`);
        log('[启动] 主窗口已切到主界面（单次，不二次reload）');
        bootMilestone('uiLoading');
      }
    } catch (e) {
      log('[启动] 主界面加载失败: ' + (e && e.message));
    }

    // —— 优先级2：进界面后再起，不抢模型/DSH ——
    log('[启动][优先级2] 后端/动作等后台服务...');
    backendProc = startBackend();
    startRenderScheduler();
    startJointCommandPoller();
    startCompanionTicker();
    startMotionHub();
    startBrowserSearch();
    log('[启动][优先级2] 后端 API 已发起');

    waitForBackendReady(60000).then((backendReady) => {
      log('[启动] 后端就绪: ' + (backendReady ? '是' : '超时'));
      bootBackendReady = !!backendReady;
      bootMilestone('apiReady', backendReady ? '后端服务就绪' : '后端超时（降级运行）');
      bootTryFinish(backendReady ? '后端就绪' : '后端超时放行');
      const voiceOn = readVoicePrefEnabled();
      if (voiceOn) {
        log('[启动] 用户已开启语音服务 → 拉起 TTS + speech-bridge');
        startVoiceServices('zh-CN');
      } else {
        log('[启动] 语音服务关闭（不启动 TTS/识别桥，节省后台）');
        killTTSServer();
        try { stopSpeechBridgeEdge(); } catch { /* noop */ }
      }
      log('[启动][优先级2] 开始启动 wechatbot-webhook...');
      webhookProc = startWechatbotWebhook();
      log('[启动][优先级2] wechatbot-webhook 启动完成');
    });
  } catch (err) {
    log(`[FATAL] 启动失败: ${err.message}\nStack: ${err.stack || '(无堆栈)'}`);
    const { dialog } = require('electron');
    dialog.showErrorBox(
      `${APP_NAME} - 启动失败`,
      `${err.message}\n\nFrontend: ${FRONTEND_DIST}\nBackend: ${BACKEND_DIST || '(none)'}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // [v174] 托盘常驻模式：窗口隐藏不算"全部关闭"，绝不因此退出应用
  if (appTray && !isRealQuitting) {
    log('[托盘] 窗口已全部关闭但托盘常驻中，不退出（真退出请走托盘菜单）');
    return;
  }
  log('All windows closed, quitting...');
  cleanupAndQuit();
});

app.on('before-quit', () => {
  isRealQuitting = true;   // [v174] 任何真退出路径都不再拦截关闭事件
  cleanupAndQuit();
});

function cleanupAndQuit() {
  try {
    // [v179 用户定案] 退出软件：托盘全部收掉（软件托盘 + DSH 守卫托盘），
    //   但 DSH 服务**不杀**——后台常驻无图标，唯一关闭入口=设置页「DSH 常驻服务」开关。
    //   v178「随软件退出杀 DSH」废除；v170/v174/v175「退出拉守卫托盘留守」也废除。
    log('[DSH] v179：DSH 保持后台常驻（无托盘）；关 DSH 请去设置页');
    try {
      if (dshHarnessBridge && typeof dshHarnessBridge.killGuardianTray === 'function') dshHarnessBridge.killGuardianTray();
    } catch (e) { log('[DSH] 收守卫托盘异常: ' + e.message); }
    // [2026-09-08 小脑第一步] 退出时回收 motion-hub
    if (hubProc && !hubProc.killed) {
      log('Killing motion-hub process...');
      try { hubProc.kill(); } catch (e) { /* ignore */ }
    }
    if (browserSearchProc && !browserSearchProc.killed) {
      log('Killing browser-search process...');
      try { browserSearchProc.kill(); } catch (e) { /* ignore */ }
    }
    // [v176] 退出时按 --user-data-dir 精确清理语音专用 Edge（只 kill 启动器句柄是清不掉的）
    log('Killing speech-bridge Edge...');
    try { killSpeechBridgeBrowsers(); } catch (e) { /* ignore */ }
    if (backendProc && !backendProc.killed) {
      log('Killing backend process...');
      backendProc.kill('SIGTERM');
      // 给1秒优雅关闭，否则强杀
      setTimeout(() => {
        try {
          if (backendProc && !backendProc.killed) {
            backendProc.kill('SIGKILL');
          }
        } catch (e) { /* ignore */ }
      }, 1000);
    }
    // 清理 wechatbot-webhook 子进程（与 backend 同样的优雅关闭策略）
    if (webhookProc && !webhookProc.killed) {
      log('Killing wechatbot-webhook process...');
      webhookProc.kill('SIGTERM');
      setTimeout(() => {
        try {
          if (webhookProc && !webhookProc.killed) {
            webhookProc.kill('SIGKILL');
          }
        } catch (e) { /* ignore */ }
      }, 1000);
    }
    // [v128] Vosk 识别服务清理代码已删除（STT=Edge speech-bridge）
    killTTSServer();
    if (uiServer) {
      log('Closing UI server...');
      uiServer.close();
      uiServer = null;
    }
    // [2026-08-06 缓存清理] 退出时清理 Electron 缓存目录，避免累积几个G的垃圾
    // 用户反馈：每次导入同一模型会累积临时文件，久了几个G甚至几十G
    // 清理范围：userData 下的各类缓存目录（保留 Local Storage/Session Storage/Dictionaries 等配置和登录状态）
    //   - GPUCache/Code Cache/Cache：Chromium 渲染缓存
    //   - Service Worker：PWA 缓存
    //   - GrShaderCache：GPU 着色器缓存
    //   - DawnGraphiteCache/DawnWebGPUCache：WebGPU 缓存（新版 Chromium）
    //   - blob_storage：Blob 临时存储（模型文件可能缓存于此）
    //   - Network：网络缓存
    try {
      const userDataPath = app.getPath('userData');
      const cacheDirs = ['GPUCache', 'Code Cache', 'Cache', 'Service Worker', 'GrShaderCache',
                         'DawnGraphiteCache', 'DawnWebGPUCache', 'blob_storage', 'Network'];
      for (const dir of cacheDirs) {
        const cachePath = path.join(userDataPath, dir);
        if (fs.existsSync(cachePath)) {
          try {
            fs.rmSync(cachePath, { recursive: true, force: true });
            log(`[缓存清理] 已删除: ${dir}`);
          } catch (e) { /* 清理失败不阻塞退出 */ }
        }
      }
      // [2026-08-06 桌宠临时文件清理] 清理桌宠模型临时目录
      // 每次导入模型会写入 pet-tmp/，退出时必须清理，避免累积
      if (fs.existsSync(PET_TMP_DIR)) {
        try {
          fs.rmSync(PET_TMP_DIR, { recursive: true, force: true });
          log('[缓存清理] 已删除: pet-tmp');
        } catch (e) { /* 忽略 */ }
      }
      // [v51 修复] 删除后必须立即重建目录：
      //   window-all-closed → cleanupAndQuit 会删掉整个 pet-tmp 目录，
      //   若应用未完全退出（或残留实例），后续 desktop-pet:show 写模型文件会 ENOENT
      //   → 桌宠无模型可加载 → 不显示。重建后目录始终存在。
      try { fs.mkdirSync(PET_TMP_DIR, { recursive: true }); } catch (e) { /* 忽略 */ }
    } catch (e) { /* 忽略 */ }
  } catch (e) {
    console.error('Cleanup error:', e);
  }
}

// ═══ [v79 预览页伴侣面板] 截屏 IPC（供 /new-page 页内"看屏幕"按钮调用）═══
// [v114/v117] 历史清空 / 媒体键 / 应用启动（源码同步回填，防止再被覆盖丢失）
const CHAT_HISTORY_KEYS = [
  'ruanlinyun_unified_messages',
  'ruanlinyun_main_chat',
  'ruanlinyun_chat_archive',
];
ipcMain.handle('history:clear', async () => {
  try {
    const wins = BrowserWindow.getAllWindows();
    for (const w of wins) {
      if (w.isDestroyed()) continue;
      const keys = JSON.stringify(CHAT_HISTORY_KEYS);
      await w.webContents.executeJavaScript(
        `(() => { try { ${keys}.forEach(k => localStorage.removeItem(k)); localStorage.setItem('ruanlinyun_v89_reset','done'); return true; } catch(e) { return String(e); } })()`
      ).catch(() => {});
    }
    try {
      const dsh = 'C:\\Users\\Administrator\\Desktop\\dsh-home\\.dsh\\storages\\session_projcache\\sessions';
      if (fs.existsSync(dsh)) {
        fs.rmSync(dsh, { recursive: true, force: true });
        fs.mkdirSync(dsh, { recursive: true });
      }
    } catch (e) { log('[v114] dsh clear: ' + e.message); }
    log('[v114] 历史对话已清空');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

function sendMediaKey(vk) {
  try {
    const { execFile } = require('child_process');
    const ps = `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class MK{[DllImport(\"user32.dll\")]public static extern void keybd_event(byte bVk,byte bScan,uint dwFlags,UIntPtr dwExtraInfo);public static void T(byte k){keybd_event(k,0,0,UIntPtr.Zero);keybd_event(k,0,2,UIntPtr.Zero);}}'; [MK]::T(${vk})`;
    execFile('powershell.exe', ['-NoProfile', '-Command', ps], { windowsHide: true, timeout: 8000 }, () => {});
    return true;
  } catch (e) {
    log('[v114] media key fail ' + e.message);
    return false;
  }
}

function findKuGouExe() {
  const candidates = [
    'C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\KuGou.exe',
    'C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\20.1.51.27967\\KuGou.exe',
    'C:\\Users\\Administrator\\Desktop\\酷狗音乐.lnk',
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch (e) { /* noop */ }
  }
  return null;
}

function isKuGouRunning() {
  try {
    const { execSync } = require('child_process');
    const out = execSync('tasklist /FI "IMAGENAME eq KuGou.exe" /NH', { encoding: 'utf8', windowsHide: true });
    return /KuGou\.exe/i.test(out);
  } catch { return false; }
}

async function mediaPlayCore(opts) {
  try {
    const kg = findKuGouExe();
    const { spawn } = require('child_process');
    if (kg) {
      if (!isKuGouRunning()) {
        spawn(kg, [], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
        log('[v114] 启动酷狗 ' + kg);
        await new Promise((r) => setTimeout(r, 2500));
      }
    } else {
      log('[v114] 未找到酷狗可执行文件');
    }
    const action = (opts && opts.action) || 'play';
    const map = { play: 0xB3, pause: 0xB3, next: 0xB0, prev: 0xB1, stop: 0xB2 };
    const vk = map[action] || 0xB3;
    sendMediaKey(vk);
    log('[v114] media:' + action);
    return { ok: true, action, launched: !!kg, note: '已发送系统媒体键；具体点歌需酷狗内搜索' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
// [v181] 原 ipcMain.handle 拆为核心函数 + 注册（供 5175 HTTP 捷径端点复用）
ipcMain.handle('media:play', (_e, opts) => mediaPlayCore(opts));

const APP_LAUNCH_ALIASES = [
  {
    keys: ['酷狗', 'kugou', 'kg', '酷狗音乐', '酷我'],
    paths: [
      'C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\KuGou.exe',
      'C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\20.1.51.27967\\KuGou.exe',
      'C:\\Users\\Administrator\\Desktop\\酷狗音乐.lnk',
    ],
  },
  {
    keys: ['blender', '布兰德'],
    paths: [
      'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    ],
  },
];

// ══════ [v188] 自主化软件启动：桌面优先 + 纠错层 + 默认安装根探测 + 自学习 ══════
const fs188 = require('fs');
const path188 = require('path');
const os188 = require('os');

// 黑名单：系统关键区禁碰（两条链共用）
const V188_BLACKLIST = ['c:\\windows\\', 'c:\\programdata\\microsoft\\'];

function v188_isBlacklisted(p) {
  const lower = String(p || '').toLowerCase();
  return V188_BLACKLIST.some((b) => lower.startsWith(b));
}

// 常见应用中文名→拼音首字母（纠错层用；覆盖高频软件，离线零依赖）
const V188_PINYIN_MAP = {
  '微信': 'wx', 'weixin': 'wx', 'wechat': 'wx',
  'QQ音乐': 'qqyy', 'qqmusic': 'qqyy',
  '腾讯会议': 'txhy', '企业微信': 'qywx',
  '钉钉': 'dd', 'dingtalk': 'dd',
  '抖音': 'dy', 'douyin': 'dy',
  '爱奇艺': 'aqy', '优酷': 'yk', '哔哩哔哩': 'bbl', 'bilibili': 'bbl',
  '网易云音乐': 'wyyy', 'netease music': 'wyyy',
  '浏览器': 'llq', 'chrome': 'chrome', '谷歌浏览器': 'ggllq',
  'edge': 'edge', 'firefox': 'firefox', '火狐': 'hh',
  ' Steam ': 'steam', 'epic': 'epic',
  'office': 'office', 'word': 'word', 'excel': 'excel', 'powerpoint': 'ppt', 'ppt': 'ppt',
  '记事本': 'jsb', 'notepad': 'notepad', '计算器': 'jsq', 'calculator': 'calc',
  '画图': 'ht', 'paint': 'paint', '截屏': 'jp', 'snip': 'snip',
  '文件资源管理器': 'wjzyglq', 'explorer': 'explorer', '此电脑': 'cdn',
  '控制面板': 'kzmb', '设置': 'sz', 'settings': 'settings',
  '任务管理器': 'rwglq', 'taskmanager': 'tm',
  '压缩': 'ys', '7-zip': '7z', 'winrar': 'winrar', 'bandizip': 'bdz',
  'wps': 'wps', 'photoshop': 'ps', 'ps': 'ps', 'premiere': 'pr', 'pr': 'pr',
  'blender': 'blender', 'unity': 'unity', 'vscode': 'vscode', 'visual studio code': 'vsc',
  'qq': 'qq', 'TIM': 'tim', '快手': 'ks', '小红书': 'xhs',
  '百度网盘': 'bdwp', '夸克': 'kk', '迅雷': 'xl', 'thunder': 'xl',
  '网易云音乐pc': 'wyyypc',
};

function v188_normKey(s) {
  return String(s || '').toLowerCase().replace(/[\s\-_\.（）()【】\[\]]/g, '');
}

function v88_levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

// 从 .lnk/.url 提取展示名（文件名去扩展名）
function v188_displayName(p) {
  return path188.basename(p).replace(/\.(lnk|url|exe)$/i, '').replace(/\s*-\s*快捷方式(\s*\(\d+\))?$/i, '').trim();
}

// 桌面扫描：返回 {file, name, norm} 列表
function v188_scanDesktop() {
  const desk = path188.join(os188.homedir(), 'Desktop');
  const out = [];
  try {
    for (const f of fs188.readdirSync(desk)) {
      if (!/\.(lnk|url|exe)$/i.test(f)) continue;
      out.push({ file: path188.join(desk, f), name: v188_displayName(f), norm: v188_normKey(v188_displayName(f)) });
    }
  } catch (e) { /* noop */ }
  return out;
}

// 纠错层：归一化相等 / 包含 / 编辑距离≤2 / 拼音首字母
function v188_fuzzyMatch(target, candidates) {
  const tn = v188_normKey(target);
  const tp = V188_PINYIN_MAP[tn] || null;
  let best = null, bestScore = Infinity;
  for (const c of candidates) {
    let score = Infinity;
    if (c.norm === tn) score = 0;
    else if (c.norm.includes(tn) || tn.includes(c.norm)) score = 1;
    else if (tp && (c.norm === tp || c.norm.startsWith(tp))) score = 2;
    else {
      const d = v88_levenshtein(c.norm, tn);
      const maxLen = Math.max(c.norm.length, tn.length);
      if (d <= 2 && d / maxLen <= 0.4) score = 3 + d;
    }
    if (score < bestScore) { bestScore = score; best = c; }
  }
  return bestScore <= 5 ? best : null;
}

// Uninstall 注册表探测：统计安装根（同步 reg query，节流 3s）
let _rootCache = null, _rootCacheAt = 0;
function v188_detectInstallRoots() {
  if (_rootCache && Date.now() - _rootCacheAt < 86400000) return _rootCache;
  try {
    const { execFileSync } = require('child_process');
    const keys = [
      'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    ];
    const rootCount = {};
    for (const k of keys) {
      let out = '';
      try { out = execFileSync('reg', ['query', k, '/s', '/v', 'InstallLocation'], { timeout: 4000, windowsHide: true }).toString(); } catch (e) { continue; }
      for (const m of out.matchAll(/InstallLocation\s+REG_SZ\s+(.+)/g)) {
        const loc = m[1].trim();
        if (!loc || !fs188.existsSync(loc)) continue;
        const parts = loc.replace(/\/$/, '').split('\\');
        if (parts.length >= 3) {
          const root = parts.slice(0, 2).join('\\');
          if (!/^c:\\windows$/i.test(root)) rootCount[root] = (rootCount[root] || 0) + 1;
        }
      }
    }
    // [v188.1] 多盘场景：游戏平台库（Steam/Epic 登记的库可能在任意盘）+ 常见盘符根探测
    try {
      const steamLib = path188.join('C:', 'Program Files (x86)', 'Steam', 'steamapps', 'libraryfolders.vdf');
      if (fs188.existsSync(steamLib)) {
        const vdf = fs188.readFileSync(steamLib, 'utf-8');
        for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
          const lib = m[1].replace(/\\\\/g, '\\');
          if (fs188.existsSync(lib)) rootCount[lib] = (rootCount[lib] || 0) + 3; // 平台库权重高（游戏集中地）
        }
      }
    } catch (e) { /* noop */ }
    // 常见命名根存在性探测（用户手动建的 Games/Software/软件 目录，即使无卸载登记也算）
    try {
      for (const drive of ['C', 'D', 'E', 'F', 'G']) {
        for (const seg of ['Games', 'Game', '游戏', 'Software', '软件', 'Program Files', 'Program Files (x86)']) {
          const p = drive + ':\\' + seg;
          try { if (fs188.existsSync(p) && fs188.statSync(p).isDirectory()) rootCount[p] = (rootCount[p] || 0) + 1; } catch (e2) { /* noop */ }
        }
      }
    } catch (e) { /* noop */ }
    _rootCache = Object.keys(rootCount).sort((a, b) => rootCount[b] - rootCount[a]).slice(0, 8); // 最多 8 根防失控
    _rootCacheAt = Date.now();
    return _rootCache;
  } catch (e) { return []; }
}

// 在给定根目录下按名字模糊找 exe（广度 1 层目录名匹配 + 2 层 exe 名匹配，限 8s）
function v188_findExeInRoot(root, target, deadline) {
  if (deadline && Date.now() > deadline) return null;
  const tn = v188_normKey(target);
  try {
    const dirs = fs188.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
    // 1) 目录名匹配 → 进去找主 exe
    for (const d of dirs) {
      const dn = v188_normKey(d.name);
      let score = Infinity;
      if (dn === tn || dn.includes(tn) || tn.includes(dn)) score = 0;
      else {
        const dd = v88_levenshtein(dn, tn);
        if (dd <= 2) score = 3 + dd;
      }
      if (score === 0) {
        const dir = path188.join(root, d.name);
        const exes = fs188.readdirSync(dir).filter((x) => x.toLowerCase().endsWith('.exe') && !x.startsWith('unins'));
        if (exes.length) {
          // 主 exe 优先同名
          const main = exes.find((x) => v188_normKey(x).includes(tn)) || exes.find((x) => v188_normKey(x) === dn) || exes[0];
          return path188.join(dir, main);
        }
      }
    }
    // 2) 兜底：根下直接有同名 exe
    for (const d of dirs) {
      const dir = path188.join(root, d.name);
      try {
        const exes = fs188.readdirSync(dir).filter((x) => x.toLowerCase().endsWith('.exe'));
        for (const x of exes) {
          if (v188_normKey(x).includes(tn)) return path188.join(dir, x);
        }
      } catch (e) { /* noop */ }
    }
  } catch (e) { /* noop */ }
  return null;
}

// 自学习登记
const LEARNED_PATH = path188.join(os188.homedir(), '.rl-launch-learned.json');
function v188_learn(target, resolvedPath) {
  try {
    let db = {};
    try { db = JSON.parse(fs188.readFileSync(LEARNED_PATH, 'utf-8')); } catch (e) { /* noop */ }
    db[v188_normKey(target)] = { path: resolvedPath, at: Date.now() };
    fs188.writeFileSync(LEARNED_PATH, JSON.stringify(db, null, 2));
  } catch (e) { /* noop */ }
}
function v188_getLearned(target) {
  try {
    const db = JSON.parse(fs188.readFileSync(LEARNED_PATH, 'utf-8'));
    const hit = db[v188_normKey(target)];
    if (hit && fs188.existsSync(hit.path)) return hit.path;
  } catch (e) { /* noop */ }
  return null;
}

async function v188_shellOpen(p) {
  const { shell } = require('electron');
  const err = await shell.openPath(p);
  if (!err) return { ok: true, method: 'openPath', path: p };
  return { ok: false, error: err };
}

/** [v188] 软件链：桌面优先（含纠错）→ 已学习 → 别名 → 桌面近空时 Uninstall 默认根。
 *  明确指令（opts.allowBeyondDesktop）才放行扩展。返回带 source/correctedFrom 便于 AI 汇报。 */
// ══════ [v190] DSH 密钥金库：safeStorage(DPAPI) 加密 .env，明文 .env 退役 ══════
const { safeStorage } = require('electron');
const V190_ENV_FILE = path188.join(__dirname, '..', '.env');           // 旧明文（迁移源，与 dshHarness APP_ROOT/../.env 同位）
const V190_VAULT_FILE = path188.join(__dirname, '.env.vault');   // 新密文（app 根下）

/** 解析 .env 文本 → {KEY: value} */
function v190_parseEnv(text) {
  const out = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** 序列化 env → .env 文本 */
function v190_serializeEnv(envObj) {
  return Object.keys(envObj).map((k) => k + '=' + envObj[k]).join('\r\n') + '\r\n';
}

/** 读金库（密文）→ env 对象；无金库返回 null */
function v190_readVault() {
  try {
    if (!fs188.existsSync(V190_VAULT_FILE)) return null;
    const raw = JSON.parse(fs188.readFileSync(V190_VAULT_FILE, 'utf-8'));
    if (raw.scheme !== 'safeStorage-v1' || !raw.data) return null;
    const cipher = Buffer.from(raw.data, 'base64');
    const plain = safeStorage.decryptString(cipher);
    return v190_parseEnv(plain);
  } catch (e) {
    log('[v190] vault read fail: ' + (e && e.message));
    return null;
  }
}

/** 写金库：env 对象 → safeStorage 加密 → .env.vault */
function v190_writeVault(envObj) {
  const plain = v190_serializeEnv(envObj);
  const cipher = safeStorage.encryptString(plain);
  const payload = { scheme: 'safeStorage-v1', at: new Date().toISOString(), data: cipher.toString('base64') };
  const tmp = V190_VAULT_FILE + '.tmp';
  fs188.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf-8');
  fs188.renameSync(tmp, V190_VAULT_FILE);
}

/** [v190 主入口] 获取 DSH 环境变量：
 *  优先金库；金库缺失但旧 .env 存在 → 自动迁移（加密写金库 + 删明文 .env 放备份）；都没有 → 空对象 */
function v190_getDshEnv() {
  try {
    const vault = v190_readVault();
    if (vault) return { env: vault, from: 'vault' };
    if (fs188.existsSync(V190_ENV_FILE)) {
      const envObj = v190_parseEnv(fs188.readFileSync(V190_ENV_FILE, 'utf-8'));
      if (Object.keys(envObj).length) {
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
          v190_writeVault(envObj);
          // 明文退役：移入备份库（不直接删，可恢复）
          try {
            const bkDir = 'C:\\RUANLINYUN\\备份库\\2026-09-22_密钥金库迁移';
            fs188.mkdirSync(bkDir, { recursive: true });
            fs188.renameSync(V190_ENV_FILE, path188.join(bkDir, '.env.migrated-' + Date.now()));
          } catch (e2) {
            try { fs188.unlinkSync(V190_ENV_FILE); } catch (e3) { /* noop */ }
          }
          log('[v190] .env 明文已迁移到加密金库并移除明文');
          return { env: envObj, from: 'migrated' };
        }
        return { env: envObj, from: 'plaintext-legacy' };
      }
    }
    return { env: {}, from: 'none' };
  } catch (e) {
    log('[v190] getDshEnv fail: ' + (e && e.message));
    return { env: {}, from: 'error' };
  }
}

/** 更新金库中的部分键（设置页换 key 时用） */
function v190_updateDshEnv(patch) {
  const cur = v190_readVault() || (fs188.existsSync(V190_ENV_FILE) ? v190_parseEnv(fs188.readFileSync(V190_ENV_FILE, 'utf-8')) : {});
  const next = Object.assign({}, cur, patch || {});
  if (!(safeStorage && safeStorage.isEncryptionAvailable())) return { ok: false, error: 'safeStorage unavailable' };
  v190_writeVault(next);
  // 明文残留清理
  try { if (fs188.existsSync(V190_ENV_FILE)) fs188.unlinkSync(V190_ENV_FILE); } catch (e) { /* noop */ }
  return { ok: true, keys: Object.keys(next) };
}

// ══════ [v189] 用户记忆（事实卡片）：大脑=DSH 自治写入，软件侧存取+注入 ══════
var MEMORY_DIR = path188.join(__dirname, 'dsh-workspace', 'memory');
var MEMORY_FILE = path188.join(MEMORY_DIR, 'user-preferences.json');
var MEMORY_MAX_CARDS = 500;
var MEMORY_AUTOTAG = '<!-- rl-user-profile:auto -->';

function v189_loadMemory() {
  try {
    const j = JSON.parse(fs188.readFileSync(MEMORY_FILE, 'utf-8'));
    if (j && Array.isArray(j.cards)) return j;
  } catch (e) { /* noop */ }
  return { version: 1, cards: [] };
}

function v189_saveMemoryAtomic(db) {
  try {
    fs188.mkdirSync(MEMORY_DIR, { recursive: true });
    const tmp = MEMORY_FILE + '.tmp';
    fs188.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs188.renameSync(tmp, MEMORY_FILE);
  } catch (e) { log('[v189] memory save fail: ' + (e && e.message)); }
}

async function memoryCore(action, payload) {
  try {
    const db = v189_loadMemory();
    if (action === 'save') {
      const category = String((payload && payload.category) || '事实').slice(0, 12);
      const content = String((payload && payload.content) || '').trim().slice(0, 80);
      if (!content) return { ok: false, error: 'empty content' };
      const now = Date.now();
      const key = (category + '|' + content).toLowerCase();
      const existing = db.cards.find((c) => (c.category + '|' + c.content).toLowerCase() === key);
      if (existing) {
        existing.lastConfirmedAt = now;
      } else {
        db.cards.push({
          id: 'm' + now.toString(36) + Math.random().toString(36).slice(2, 6),
          category, content,
          createdAt: now, lastConfirmedAt: now,
          source: String((payload && payload.source) || 'dsh'),
        });
      }
      if (db.cards.length > MEMORY_MAX_CARDS) {
        db.cards.sort((a, b) => (b.lastConfirmedAt || 0) - (a.lastConfirmedAt || 0));
        db.cards = db.cards.slice(0, MEMORY_MAX_CARDS);
      }
      v189_saveMemoryAtomic(db);
      return { ok: true, total: db.cards.length };
    }
    if (action === 'list') {
      const sorted = db.cards.slice().sort((a, b) => (b.lastConfirmedAt || 0) - (a.lastConfirmedAt || 0));
      return { ok: true, cards: sorted, total: sorted.length };
    }
    if (action === 'forget') {
      const id = String((payload && payload.id) || '');
      const before = db.cards.length;
      db.cards = db.cards.filter((c) => c.id !== id);
      v189_saveMemoryAtomic(db);
      return { ok: true, removed: before - db.cards.length };
    }
    return { ok: false, error: 'unknown action: ' + action };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

function v189_refreshAgentsProfile() {
  try {
    const AGENTS = path188.join(__dirname, 'dsh-workspace', 'AGENTS.md');
    const db = v189_loadMemory();
    const top = db.cards
      .slice().sort((a, b) => (b.lastConfirmedAt || 0) - (a.lastConfirmedAt || 0))
      .slice(0, 20);
    const L = [];
    if (top.length) {
      L.push(MEMORY_AUTOTAG);
      L.push('## 用户档案（自动维护，人工勿改此段）');
      for (const c of top) L.push('- [' + c.category + '] ' + c.content);
      L.push(MEMORY_AUTOTAG);
    }
    const block = L.join('\n');
    let cur = '';
    try { cur = fs188.readFileSync(AGENTS, 'utf-8'); } catch (e) { /* noop */ }
    const re = new RegExp(MEMORY_AUTOTAG + '[\\s\\S]*?' + MEMORY_AUTOTAG + '\\n?', 'g');
    let next;
    if (re.test(cur)) next = cur.replace(re, block + '\n');
    else next = cur ? cur.trimEnd() + '\n\n' + block + '\n' : block + '\n';
    if (next !== cur) {
      const tmp = AGENTS + '.tmp';
      fs188.writeFileSync(tmp, next, 'utf-8');
      fs188.renameSync(tmp, AGENTS);
    }
  } catch (e) { log('[v189] agents profile refresh fail: ' + (e && e.message)); }
}

async function v188_launchSoftware(target, opts = {}) {
  const raw = String(target || '').trim();
  // ── 0) 记忆库优先（用户拍板：熟悉了用户习惯就直接用，不翻找）──
  const learned = v188_getLearned(raw);
  if (learned) {
    const r = await v188_shellOpen(learned);
    if (r.ok) return { ...r, source: 'memory', path: learned };
    // 学习条目失效（软件卸载/移动）→ 删除脏条目
    v188_unlearn(raw);
  }
  // ── 1) 桌面与安装根【并行竞速】（用户拍板：桌面没有就同时找路径和软件，不串行等待）──
  const deskPromise = (async () => {
    const desk = v188_scanDesktop();
    const tn = v188_normKey(raw);
    let hit = desk.find((c) => c.norm === tn || c.norm.includes(tn) || tn.includes(c.norm));
    let correctedFrom = null;
    if (!hit) {
      const fz = v188_fuzzyMatch(raw, desk);
      if (fz) { hit = fz; correctedFrom = raw; }
    }
    return hit ? { hit, correctedFrom } : null;
  })();
  // 安装根并行链：桌面近空或用户已明确授权时参与竞速（不拖慢主路径，竞速限时 8s）
  const rootsPromise = (async () => {
    const desk = v188_scanDesktop();
    if (!(opts.allowBeyondDesktop || desk.length < 4)) return null;
    const roots = v188_detectInstallRoots();
    const deadline = Date.now() + 8000;
    for (const root of roots) {
      if (v188_isBlacklisted(root)) continue;
      const exe = v188_findExeInRoot(root, raw, deadline);
      if (exe) return { exe, root };
      if (Date.now() > deadline) break;
    }
    return null;
  })();
  const deskRes = await deskPromise;
  if (deskRes && deskRes.hit) {
    const r = await v188_shellOpen(deskRes.hit.file);
    if (r.ok) {
      v188_learn(raw, deskRes.hit.file);
      try { await memoryCore('save', { category: '习惯', content: '软件「' + deskRes.hit.name + '」位于 ' + deskRes.hit.file, source: 'app-launch' }); v189_refreshAgentsProfile(); } catch (eM) { /* 不阻塞启动 */ }
      return { ...r, source: 'desktop', correctedFrom: deskRes.correctedFrom, displayName: deskRes.hit.name };
    }
  }
  const rootRes = await Promise.race([rootsPromise, new Promise((res) => setTimeout(() => res(null), 8500))]);
  if (rootRes && rootRes.exe) {
    const r = await v188_shellOpen(rootRes.exe);
    if (r.ok) {
      v188_learn(raw, rootRes.exe);
      try { await memoryCore('save', { category: '习惯', content: '软件「' + raw + '」位于 ' + rootRes.exe, source: 'app-launch' }); v189_refreshAgentsProfile(); } catch (eM) { /* 不阻塞启动 */ }
      return { ...r, source: 'install-root', root: rootRes.root };
    }
  }
  // ── 2) 别名表兜底（原有，内置直达）──
  const lower = raw.toLowerCase();
  const alias = APP_LAUNCH_ALIASES.find((it) => it.keys.some((k) => lower.includes(k.toLowerCase())));
  if (alias) {
    for (const p of alias.paths) {
      if (fs188.existsSync(p)) { const r = await v188_shellOpen(p); if (r.ok) { v188_learn(raw, p); return { ...r, source: 'alias' }; } }
    }
  }
  return { ok: false, error: 'not found（桌面与已知安装根均无；请确认名称或告知位置）', hint: 'corrected' };
}

function v188_unlearn(target) {
  try {
    const db = JSON.parse(fs188.readFileSync(LEARNED_PATH, 'utf-8'));
    delete db[v188_normKey(target)];
    fs188.writeFileSync(LEARNED_PATH, JSON.stringify(db, null, 2));
  } catch (e) { /* noop */ }
}

/** [v188] 文件链：非 exe 目标（文档/文件夹/任意路径），黑名单外放行 */
async function v188_openFileTarget(target) {
  const norm = String(target || '').trim().replace(/\//g, '\\');
  if (v188_isBlacklisted(norm)) return { ok: false, error: 'blacklisted: ' + norm };
  if (fs188.existsSync(norm)) return await v188_shellOpen(norm);
  return { ok: false, error: 'not found: ' + norm };
}

// 目标分类：exe/lnk/url/别名/应用名=软件；其余=文件
function v188_isSoftwareTarget(target, explicitFile) {
  if (explicitFile) return false;
  const s = String(target || '').trim();
  if (/\.(lnk|url|exe)$/i.test(s)) return true;
  if (/^[a-z]:\\/i.test(s) && /\.(doc|docx|pdf|txt|md|xlsx|ppt|pptx|html|png|jpg|mp4|mp3|zip|rar|7z|apk|bat|cmd|ps1|py|json|csv)$/i.test(s)) return false;
  return true; // 纯名称默认当软件（用户主场景）
}

async function appLaunchCoreLegacy(target) {
  try {
    const raw = String(target || '').trim();
    if (!raw) return { ok: false, error: 'empty path' };
    const allowed = [
      'C:\\Users\\Administrator\\Desktop\\',
      'C:\\Program Files\\',
      'C:\\Program Files (x86)\\',
    ];
    const tryOpen = async (norm) => {
      if (!fs.existsSync(norm)) return { ok: false, error: 'not found: ' + norm };
      const { shell } = require('electron');
      const err = await shell.openPath(norm);
      if (err) {
        const { spawn } = require('child_process');
        const proc = spawn(norm, [], { detached: true, stdio: 'ignore', windowsHide: false });
        proc.unref();
        log('[v117] app:launch spawn ' + norm + ' pid=' + proc.pid);
        return { ok: true, method: 'spawn', pid: proc.pid, path: norm };
      }
      log('[v117] app:launch openPath ' + norm);
      return { ok: true, method: 'openPath', path: norm };
    };

    const norm = raw.replace(/\//g, '\\');
    const isAbs = /^[a-z]:\\/i.test(norm);
    if (isAbs) {
      if (!allowed.some((a) => norm.toLowerCase().startsWith(a.toLowerCase()))) {
        const lower = norm.toLowerCase();
        const hit = APP_LAUNCH_ALIASES.find((it) => it.keys.some((k) => lower.includes(k.toLowerCase())));
        if (!hit) return { ok: false, error: 'path not allowed: ' + norm };
        for (const p of hit.paths) {
          const r = await tryOpen(p);
          if (r.ok) return r;
        }
        return { ok: false, error: 'alias paths missing: ' + norm };
      }
      const direct = await tryOpen(norm);
      if (direct.ok) return direct;
      const lower = norm.toLowerCase();
      const hit = APP_LAUNCH_ALIASES.find((it) => it.keys.some((k) => lower.includes(k.toLowerCase())));
      if (hit) {
        for (const p of hit.paths) {
          const r = await tryOpen(p);
          if (r.ok) return { ...r, fallback: true };
        }
      }
      return direct;
    }

    const lower = raw.toLowerCase();
    const hit = APP_LAUNCH_ALIASES.find((it) => it.keys.some((k) => lower.includes(k.toLowerCase())));
    if (!hit) return { ok: false, error: 'unknown app: ' + raw };
    let last = { ok: false, error: 'no path' };
    for (const p of hit.paths) {
      last = await tryOpen(p);
      if (last.ok) return last;
    }
    return last;
  } catch (e) {
    log('[v117] app:launch fail ' + e.message);
    return { ok: false, error: e.message };
  }
}
// [v181] 原 ipcMain.handle 拆为核心函数 + 注册（供 5175 HTTP 捷径端点复用）
// [v188] 新 appLaunchCore：目标分类 → 软件链（桌面优先/纠错/默认根）/ 文件链（任意位置+黑名单）
async function appLaunchCore(target, opts = {}) {
  try {
    const raw = String(target || '').trim();
    if (!raw) return { ok: false, error: 'empty path' };
    const isSoftware = v188_isSoftwareTarget(raw, opts.explicitFile);
    if (isSoftware) {
      return await v188_launchSoftware(raw, opts);
    }
    const direct = await v188_openFileTarget(raw);
    if (direct.ok) return direct;
    return await appLaunchCoreLegacy(raw);
  } catch (e) {
    log('[v188] appLaunch fail: ' + (e && e.message));
    return { ok: false, error: e && e.message };
  }
}

ipcMain.handle('app:launch', (_e, target) => appLaunchCore(target));

// [v118] 通用 GUI Agent：看屏→规划→执行（天气/听歌/开关/任意可见操作）
let guiAgent = null;
try {
  guiAgent = require('C:\\RUANLINYUN\\gui-agent\\gui-agent.js');
  if (guiAgent && typeof guiAgent.startHttp === 'function') {
    try { guiAgent.startHttp(5181); } catch (e) { log('[gui-agent] http fail ' + e.message); }
  }
} catch (e) {
  log('[WARN] gui-agent load fail: ' + e.message);
}

ipcMain.handle('gui-agent:run', async (_e, goal) => {
  try {
    if (!guiAgent) return { ok: false, error: 'gui-agent not loaded' };
    const g = String(goal || '').trim();
    log('[gui-agent] run: ' + g);
    const r = await guiAgent.runTask(g, (p) => {
      try { log('[gui-agent] step ' + p.step + ' ' + p.action + ' ' + (p.thought || '').slice(0, 80)); } catch (e2) { /* noop */ }
    });
    log('[gui-agent] result ok=' + r.ok + ' ' + String(r.result || r.error || '').slice(0, 120));
    return r;
  } catch (e) {
    log('[gui-agent] fail ' + e.message);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('gui-agent:discover', async (_e, q) => {
  try {
    if (!guiAgent) return { ok: false, error: 'gui-agent not loaded' };
    const apps = guiAgent.discoverApps(60);
    if (!q) return { ok: true, apps };
    const hits = await guiAgent.launchByQuery(String(q));
    return { ok: true, apps: apps.slice(0, 20), probeLaunch: hits.ok, matched: hits.matched, error: hits.error };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// [v105/v117] Edge Web Speech 桥 IPC
ipcMain.handle('speech-bridge:start', async (_e, opts) => {
  const lang = (opts && opts.lang) || 'zh-CN';
  return startSpeechBridgeEdge(lang);
});
ipcMain.handle('speech-bridge:stop', async () => stopSpeechBridgeEdge());
ipcMain.handle('speech-bridge:set-control', async (_e, patch) => setSpeechBridgeControl(patch));
ipcMain.handle('speech-bridge:get-control', async () => ({ ok: true, ...speechBridgeControl }));

// [v147] 语音服务总开关 IPC（开=启动 TTS+识别；关=全部停止）
ipcMain.handle('voice-service:get', async () => ({
  ok: true,
  enabled: readVoicePrefEnabled(),
  ttsRunning: !!(ttsProc && !ttsProc.killed),
  speechRunning: !!(speechBridgeEdgeProc && !speechBridgeEdgeProc.killed),
}));
ipcMain.handle('voice-service:set', async (_e, enabled) => {
  if (enabled) return startVoiceServices('zh-CN');
  return stopVoiceServices();
});

ipcMain.handle('companion-console:screenshot', async () => {
  try {
    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    if (!sources || !sources.length) return { ok: false, error: '无可用屏幕源' };
    const primary = sources.find((s) => s.display_id === String(screen.getPrimaryDisplay().id())) || sources[0];
    return { ok: true, dataUrl: primary.thumbnail.toDataURL() };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});
// COMPANION_SCREENSHOT_V79_END
