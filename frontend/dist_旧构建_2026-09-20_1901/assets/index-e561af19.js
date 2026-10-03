import { _ as __vitePreload } from "./babylon-fa4505fb.js";
import { a2 as reactDomExports, r as reactExports, j as jsx } from "./mui-bbeacffb.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity)
      fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy)
      fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
var client = {};
var m = reactDomExports;
{
  client.createRoot = m.createRoot;
  client.hydrateRoot = m.hydrateRoot;
}
const index = "";
function isNativePlatform() {
  var _a, _b;
  if (typeof window === "undefined")
    return false;
  const w = window;
  const cap = w.Capacitor;
  if (cap) {
    if (typeof cap.isNativePlatform === "function" && cap.isNativePlatform())
      return true;
    const platform = typeof cap.getPlatform === "function" ? cap.getPlatform() : void 0;
    if (platform === "android" || platform === "ios")
      return true;
  }
  if (w.androidBridge)
    return true;
  if ((_b = (_a = w.webkit) == null ? void 0 : _a.messageHandlers) == null ? void 0 : _b.bridge)
    return true;
  return false;
}
function isMobile() {
  if (isNativePlatform())
    return true;
  const uaElectron = (navigator.userAgent || "").includes("Electron");
  if (uaElectron)
    return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
  if (isMobileUA)
    return true;
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return true;
  }
  return false;
}
function useMobileLayout() {
  const [mobile, setMobile] = reactExports.useState(isMobile);
  reactExports.useEffect(() => {
    let raf = 0;
    const handleResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMobile(isMobile()));
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    let tries = 0;
    const timer = window.setInterval(() => {
      tries++;
      const next = isMobile();
      if (next) {
        setMobile(true);
        window.clearInterval(timer);
      } else if (tries >= 20) {
        window.clearInterval(timer);
      }
    }, 100);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);
  return mobile;
}
if (isNativePlatform()) {
  document.documentElement.classList.add("capacitor-native");
}
const root = document.getElementById("root");
const isPetWindow = window.location.pathname === "/pet" && !isNativePlatform();
const isWallpaperWindow = window.location.pathname === "/wallpaper" && !isNativePlatform();
if (isWallpaperWindow) {
  __vitePreload(() => import("./WallpaperPage-f024dbdc.js"), true ? ["assets/WallpaperPage-f024dbdc.js","assets/babylon-fa4505fb.js","assets/mui-bbeacffb.js"] : void 0).then(({ default: WallpaperPage }) => {
    client.createRoot(root).render(/* @__PURE__ */ jsx(WallpaperPage, {}));
  }).catch((err) => {
    console.error("[index] 壁纸页面加载失败:", err);
    root.innerHTML = '<div style="color:#f66;padding:20px;font-size:13px;">壁纸页面加载失败: ' + err.message + "</div>";
  });
} else if (isPetWindow) {
  __vitePreload(() => import("./pages-63a295eb.js").then((n) => n.P), true ? ["assets/pages-63a295eb.js","assets/babylon-fa4505fb.js","assets/mui-bbeacffb.js"] : void 0).then(({ default: PetPage }) => {
    client.createRoot(root).render(/* @__PURE__ */ jsx(PetPage, {}));
  }).catch((err) => {
    console.error("[index] 桌宠页面加载失败:", err);
    root.innerHTML = '<div style="color:#f66;padding:20px;font-size:13px;">桌宠页面加载失败: ' + err.message + "</div>";
  });
} else {
  __vitePreload(() => import("./App-60958f34.js"), true ? ["assets/App-60958f34.js","assets/babylon-fa4505fb.js","assets/mui-bbeacffb.js","assets/pages-63a295eb.js"] : void 0).then(({ default: App }) => {
    client.createRoot(root).render(/* @__PURE__ */ jsx(App, {}));
  });
}
export {
  isNativePlatform as i,
  useMobileLayout as u
};
