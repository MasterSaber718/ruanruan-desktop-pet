import ReactDOM from 'react-dom/client';
import { t as tt } from './i18n';

// [v185 自愈] Vite 动态导入失败（部署后 chunk 错位）→ 重载一次页面拿新资源清单
window.addEventListener('vite:preloadError', () => {
  try {
    if (!sessionStorage.getItem('rl-chunk-heal')) {
      sessionStorage.setItem('rl-chunk-heal', '1');
      window.location.reload();
    }
  } catch { /* noop */ }
});
// index.css 仅含布局重置（margin/padding/box-sizing/html,body,#root 100% 高度），
// 不含 body 背景色，桌宠窗口加载它不会引入白底，且保证 #root 撑满窗口
import './index.css';
import { isNativePlatform } from './mobile';

// [修复 HIGH-7 安全区] 在原生容器中给 <html> 打标记类。
//   index.css 里的安全区规则依赖 .capacitor-native 选择器（原来错误地依赖
//   @media (display-mode: standalone)，在 WebView 中恒为 false，导致规则从未生效）。
//   必须在首次渲染前同步执行，避免出现"先无避让、后跳变"的闪烁。
if (isNativePlatform()) {
  document.documentElement.classList.add('capacitor-native');
}

// [2026-08-06 桌宠窗口透明修复] /pet 路由完全独立入口，绕过 App 包装
// 根因：App.tsx 的 <CssBaseline /> 在亮色模式下注入 body { background-color: #fff }，
//   emotion 注入的 <style> 在主进程 insertCSS 之后，覆盖透明背景 → 桌宠窗口白底。
//   且 App 的 useEffect 会调用后端 API 下发 AI 配置，拖慢桌宠窗口首次显示。
// 解决：/pet 直接渲染 PetPage，不加载 ThemeProvider/CssBaseline/Router/DeviceOptimizer/ApiConfigService，
//   桌宠窗口无白底、无初始化开销，秒级显示。
const root = document.getElementById('root')!;

// [修复 BLOCKER-1 真正根因] 这里的 /pet 快捷入口是深链白屏的源头。
//   它在 React 之前就按路径分流，直接渲染 Electron 专用的 PetPage，
//   完全绕过 App.tsx 里的路由与平台判断。因此只改 App.tsx 是无效的——
//   安卓上冷启动直达 /pet（或 WebView 恢复上次路径）必定命中这里，
//   PetPage 因取不到 window.desktopPet 而显示 "非 Electron 环境，桌宠页面无法工作"，
//   且该轻量入口没有 Router、没有底部导航栏，用户被彻底困死在此页。
//
//   该快捷入口的收益（避开 CssBaseline 白底、省初始化开销）只对 Electron 独立桌宠窗口
//   有意义，故用 isNativePlatform() 把原生端排除在外，让安卓走完整 App 流程，
//   由 App 的路由渲染 MobilePet。
const isPetWindow = window.location.pathname === '/pet' && !isNativePlatform();

// [2026-08-31 v62] 壁纸模式窗口：同样独立轻量入口（透明、无 App 初始化开销）
const isWallpaperWindow = window.location.pathname === '/wallpaper' && !isNativePlatform();

if (isWallpaperWindow) {
  import('./pages/WallpaperPage').then(({ default: WallpaperPage }) => {
    ReactDOM.createRoot(root).render(<WallpaperPage />);
  }).catch((err) => {
    console.error('[index] 壁纸页面加载失败:', err);
    root.innerHTML = '<div style="color:#f66;padding:20px;font-size:13px;">' + tt('wall.loadFail') + err.message + '</div>';
  });
} else if (isPetWindow) {
  // 桌宠窗口（仅 Electron）：独立轻量入口（不走 App，避免 CssBaseline 白底 + 初始化开销）
  import('./pages/PetPage').then(({ default: PetPage }) => {
    ReactDOM.createRoot(root).render(<PetPage />);
  }).catch((err) => {
    console.error('[index] 桌宠页面加载失败:', err);
    root.innerHTML = '<div style="color:#f66;padding:20px;font-size:13px;">' + tt('petPage.loadFail') + err.message + '</div>';
  });
} else {
  // 主窗口：正常 App 入口
  import('./App').then(({ default: App }) => {
    ReactDOM.createRoot(root).render(<App />);
  });
}
