import React, { useState, useEffect } from 'react';
import { t as tt } from './i18n';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

// [2026-08-05 启动优化] 页面懒加载：各路由页面拆分到独立chunk，首页只加载当前路由代码
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const NewPage = React.lazy(() => import('./pages/NewPage'));
// [2026-08-05 桌宠独立窗口] 桌宠窗口专用页面，只在 /pet 路由加载
const PetPage = React.lazy(() => import('./pages/PetPage'));
import { DeviceOptimizer } from './utils/DeviceOptimizer';
// [v12] Windows 通用窗口控制栏（最小化/最大化/关闭），全局固定在右上角
import WindowControls from './components/WindowControls';
// [移动端适配] 移动端布局组件
import MobileLayout from './components/MobileLayout';
import MobileChatHost from './components/MobileChatHost';
import { useMobileLayout, isNativePlatform } from './mobile';
import HomePage from './pages/HomePage'; // [2026-08-29 修复] 原为 React.lazy 动态导入：rollup 把 HomePage 模块内联进 App chunk 后仍生成 1 字节空壳 HomePage-xxx.js，React.lazy 运行时拿到空模块 → React #306 → 主窗口黑屏（8-27 起存在）。主窗口首屏组件本就无需懒加载，改静态导入绕过。
// [1:1搬运] 移动端桌宠（独立于 PC 端 PetPage，不依赖 Electron IPC）
const MobilePet = React.lazy(() => import('./components/MobilePet'));

// [v185] 设置页预取：主页空闲时提前拉取 SettingsPage chunk，消除首次进设置的"加载一会"
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  (window as any).requestIdleCallback(() => { import('./pages/SettingsPage').catch(() => {}); }, { timeout: 5000 });
} else {
  setTimeout(() => { import('./pages/SettingsPage').catch(() => {}); }, 3000);
}

// 主题配置
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

// [v173 保活] 预览常驻：离开预览**不再释放、不再整页 reload**。
//  用户要求：切到 DSH/设置时模型留在后台"待着"（暂停渲染省 CPU），回来 1~2 秒内直接恢复可见，
//  绝不出现"回来模型没了、又得重新加载几秒"。
//  暂停/恢复通过 rl-preview-hidden / rl-preview-visible 事件下发到 BabylonModelViewer 的 rAF 循环。
function PreviewKeepAlive() {
  const location = useLocation();
  // [v80] 预览即主界面：/ 与 /new-page 都算预览态
  const onPreview = location.pathname === '/new-page' || location.pathname === '/';
  useEffect(() => {
    if (onPreview) {
      try { window.dispatchEvent(new CustomEvent('rl-preview-visible')); } catch { /* noop */ }
      console.log('[PreviewMemory] 进入预览（渲染恢复，建模保留）');
      return;
    }
    // 离开预览：保持挂载 + 暂停渲染（不释放内存、不 reload）
    try { window.dispatchEvent(new CustomEvent('rl-preview-hidden')); } catch { /* noop */ }
    console.log('[PreviewMemory] 离开预览（后台保活 + 暂停渲染）');
  }, [onPreview]);
  return (
    // [手机复刻PC] 加 className 供手机模式 CSS 覆盖（导航栏让位/层级）
    <div className="rl-kal-layer rl-kal-preview" style={{ display: onPreview ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 1200 }}>
      <NewPage />
    </div>
  );
}

// [v173 保活] DSH 聊天页常驻：离开 /chat 只隐藏不卸载（iframe/DSH 会话保持存活），
//  切回来秒显示，不再重新加载等待几秒。启动即挂载 => DSH 在后台随启动流程一起预热。
function ChatKeepAlive() {
  const location = useLocation();
  const onChat = location.pathname === '/chat';
  return (
    // [手机复刻PC] 加 className 供手机模式 CSS 覆盖（导航栏让位/层级）
    <div className="rl-kal-layer rl-kal-chat" style={{ display: onChat ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 900 }}>
      <Box sx={{
        bgcolor: 'background.default',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <HomePage />
      </Box>
    </div>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  // [修复 BLOCKER-1 深链白屏] 必须使用响应式 hook，不能用一次性函数调用。
  //   旧实现 checkIsMobile() 只在首次渲染求值一次，当 WebView 冷启动直达 /pet 时，
  //   若此刻 window.Capacitor 尚未注入完成，mobileMode 会被永久锁定为 false，
  //   于是渲染 PC 版 PetPage → 其依赖 window.desktopPet（Electron 专有）→ 报
  //   "非 Electron 环境，桌宠页面无法工作" 且无导航栏，形成无法退出的死页。
  //   useMobileLayout 内部监听 resize/orientationchange 并在挂载后复检，保证最终一致。
  const mobileMode = useMobileLayout();

  const theme = isDarkMode ? darkTheme : lightTheme;

  // [修复 HIGH-5 暗色撕裂] 把应用主题同步到 <html data-theme>，
  //   index.css 中的移动端深色规则据此生效。
  //   原来这些规则跟随 @media (prefers-color-scheme)（系统深色），
  //   与 MUI 的 isDarkMode 各走各的，系统深色 + 应用浅色时会出现
  //   "深色导航栏 + 深色文字" 的不可读画面。现在两者严格同源。
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    // 同步通知浏览器/WebView 当前配色，影响滚动条、输入框等原生控件的默认样式
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  // [手机复刻PC] 标记当前 UI 模式：手机分支复用 PC 三页渲染层，
  //   index.css 据此把两层压到导航栏之上并留出底部导航高度
  useEffect(() => {
    document.documentElement.setAttribute('data-ui-mode', mobileMode ? 'mobile' : 'desktop');
  }, [mobileMode]);

  // 初始化设备优化器 + [v139] 后台自动系统优化（设置页卡片已移除，功能保留）
  useEffect(() => {
    const deviceOptimizer = DeviceOptimizer.getInstance();
    deviceOptimizer.applyOptimizations();
    console.log('[App] 设备优化器已初始化');
    const runSystemOptimize = async () => {
      try {
        const host = window.location.hostname || '127.0.0.1';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(`http://${host}:27865/api/v1/optimization/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: 'high' }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (resp.ok) console.log('[App] 后台设备优化完成');
      } catch {
        console.warn('[App] 后台设备优化跳过（后端未就绪）');
      }
    };
    const t = window.setTimeout(runSystemOptimize, 8000);
    const iv = window.setInterval(runSystemOptimize, 5 * 60 * 1000);
    return () => { window.clearTimeout(t); window.clearInterval(iv); };
  }, []);

  // [v182] 原「启动时自动下发 API Key 到后端 /api/v1/wechat-bot/ai-mode」已删除：
  //   微信机器人后端路由已在 v181 移除（routes/index.ts 不再挂载），该调用必然 404，
  //   且 3s AbortController 超时会在启动日志刷 "signal is aborted without reason"。
  //   AI 配置唯一下发通道 = SettingsPage 保存时的 dshHarness.providersSync（DSH providers.json）。

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {/* [v16] WindowControls 在 Electron 桌面环境始终渲染
            原因：之前只在非 mobileMode 下渲染，但用户缩小窗口到768px以下时
            mobileMode=true 导致按钮消失（用户反馈"没有按钮"）
            修复：只要 window.windowControls 存在（Electron环境）就渲染，不受 mobileMode 影响
            注意：WindowControls 内部已处理 /pet 路由（返回null），不会在桌宠窗口显示 */}
        {(window as any).windowControls && <WindowControls />}
        {mobileMode ? (
          <MobileLayout>
            {/* [v183-T3/R6/R9] 聊天改回 MobileChat：手机本机直连云端（LLMApiService 手机直连分支），
                不再渲染 PC HomePage（其 DSH iframe 在手机上必然"桥不可用"）。
                [手机复刻PC 2026-09-21] 主页 3D/设置仍复用 PC 页面；
                复用 PC 端页面：/ = 3D 预览主页（PreviewKeepAlive 常驻层），/settings = PC 设置页。
                /chat = MobileChat（手机本机直连云端，v183-T3）。
                仅 /pet 保留 MobilePet（不依赖 Electron 桥）。
                底部导航由 MobileLayout 提供，层级/让位规则见 index.css [data-ui-mode='mobile'] */}
            {/* [v61] 预览 keep-alive 常驻挂载（内部按路由显示/隐藏+分级内存监测） */}
            <PreviewKeepAlive />
            {/* [v183-T3] 手机分支不再挂 ChatKeepAlive：聊天=MobileChat 本机直连，
                DSH iframe（PC HomePage）在手机上必然"桥不可用"，常驻空耗且报错 */}
            {/* [修复] 移动端路由必须包 Suspense：SettingsPage/MobilePet 均为 React.lazy，
                缺少 Suspense 会导致点击对应 tab 时抛 "suspended but no fallback" 错误，
                进而整棵 React 树崩溃白屏。与 PC 分支保持一致的兜底渲染。 */}
            <React.Suspense fallback={
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, height: '100vh', bgcolor: '#12121a', color: 'rgba(232,232,232,0.85)' }}>
                <CircularProgress size={36} thickness={4} sx={{ color: '#fff' }} />
                <Box sx={{ fontSize: 13, letterSpacing: 2 }}>{tt('app.loading')}</Box>
              </Box>
            }>
              <Routes>
                {/* / /new-page /chat 由上方常驻层渲染（与 PC 分支同构） */}
                {/* [v186-T3] 聊天=本机 DSH 优先（127.0.0.1:5190），未就绪回退 MobileChat 直连 */}
                <Route path="/chat" element={<MobileChatHost />} />
                <Route path="/" element={null} />
                <Route path="/new-page" element={null} />
                {/* 设置页：手机直接用 PC 版 SettingsPage（1:1）
                    [v182-7 滚动修复] 原 minHeight:100vh + pb 只留导航高度，页面内容被
                    MobileLayout 的 overflow:hidden 容器裁死 → 无法下拉。
                    改为 height:100% + overflowY:auto 内部滚动容器，滚动到底可见全部设置项。 */}
                <Route path="/settings" element={
                  <Box sx={{
                    bgcolor: 'background.default',
                    width: '100%',
                    height: '100%',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    display: 'flex',
                    flexDirection: 'column',
                    pb: '72px', /* 底部导航栏 56px + 余量 */
                  }}>
                    <SettingsPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
                  </Box>
                } />
                {/* [修复 BLOCKER-1 双保险] MobilePet 不依赖 Electron 桥，原生平台安全 */}
                <Route path="/pet" element={<MobilePet />} />
              </Routes>
            </React.Suspense>
          </MobileLayout>
        ) : (
          <>
            {/* [v61] 预览 keep-alive 常驻挂载（内部按路由显示/隐藏+分级内存监测） */}
            <PreviewKeepAlive />
            {/* [v173] DSH 聊天页常驻挂载（切页不销毁 iframe；DSH 随启动后台预热） */}
            <ChatKeepAlive />
            {/* [v16] WindowControls 已移到 mobileMode 判断之前统一渲染，此处不再重复 */}
            <React.Suspense fallback={
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, height: '100vh', bgcolor: '#12121a', color: 'rgba(232,232,232,0.85)' }}>
                <CircularProgress size={36} thickness={4} sx={{ color: '#fff' }} />
                <Box sx={{ fontSize: 13, letterSpacing: 2 }}>{tt('app.loading')}</Box>
              </Box>
            }>
              <Routes>
                {/* [v80] 预览模式升级为主界面：/ 直达 3D 预览（PreviewKeepAlive fixed 层渲染），聊天挪到 /chat */}
                <Route path="/" element={null} />
                {/* [v141 调查结论] 聊天页伪全屏根因=Container maxWidth="lg"（约1200px）夹住 UI。
                    顶栏「阮琳云」横线随 Container 变窄 → 窗口拉大仍像被框住。
                    去掉 lg 限制，聊天 UI（含横线/DSH 区）铺满窗口宽。 */}
                {/* [v173 保活] /chat 改由 ChatKeepAlive 常驻层渲染（切页不销毁 iframe/会话） */}
                <Route path="/chat" element={null} />
                {/* [v141] 设置页同步铺满，避免聊天全宽、设置仍居中的割裂 */}
                <Route path="/settings" element={
                  <Box sx={{
                    bgcolor: 'background.default',
                    width: '100%',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <SettingsPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
                  </Box>
                } />
                <Route path="/new-page" element={null} />
                {/* [2026-08-05 桌宠独立窗口] 桌宠窗口加载此路由，只渲染 3D 模型 */}
                {/* [修复 BLOCKER-1 双保险] PetPage 强依赖 window.desktopPet（Electron preload 注入）。
                    即便 mobileMode 因极端时序误判为 false，只要处于原生平台就必须回退到 MobilePet，
                    绝不允许渲染出无法退出的 "非 Electron 环境" 死页。 */}
                <Route path="/pet" element={isNativePlatform() ? <MobilePet /> : <PetPage />} />
              </Routes>
            </React.Suspense>
          </>
        )}
      </Router>
    </ThemeProvider>
  );
}

export default App;
