import { _ as __vitePreload } from "./babylon-fa4505fb.js";
import { R as React, r as reactExports, j as jsx, b as jsxs, x as Fragment } from "./mui-42cba0d1.js";
const BabylonModelViewer = React.lazy(() => __vitePreload(() => import("./BabylonModelViewer-92c63a9f.js"), true ? ["assets/BabylonModelViewer-92c63a9f.js","assets/mui-42cba0d1.js","assets/babylon-fa4505fb.js"] : void 0));
if (typeof document !== "undefined") {
  document.documentElement.style.background = "transparent";
  document.documentElement.style.backgroundColor = "transparent";
  document.body.style.background = "transparent";
  document.body.style.backgroundColor = "transparent";
}
async function fetchTextureBuffers(meta) {
  console.log(`[WallpaperPage] fetch ${meta.textureFiles.length} 个贴图...`);
  const results = await Promise.allSettled(
    meta.textureFiles.map(async (tex) => {
      const resp = await fetch(tex.url);
      if (!resp.ok)
        throw new Error(`HTTP ${resp.status}: ${tex.url}`);
      const data = await resp.arrayBuffer();
      return { name: tex.name, path: tex.path, webkitRelativePath: tex.webkitRelativePath, data };
    })
  );
  const textures = [];
  let failCount = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled")
      textures.push(r.value);
    else {
      failCount++;
      console.error(`[WallpaperPage] 贴图 fetch 失败 [${i}] ${meta.textureFiles[i].name}:`, r.reason);
    }
  }
  console.log(`[WallpaperPage] 贴图 fetch 完成: 成功 ${textures.length}/${meta.textureFiles.length}, 失败 ${failCount}`);
  return textures;
}
async function buildModelData(meta) {
  console.log("[WallpaperPage] 构建 modelData, 模型 URL:", meta.url);
  const textureFiles = await fetchTextureBuffers(meta);
  return {
    name: meta.name,
    url: meta.url,
    modelWebkitRelativePath: meta.modelWebkitRelativePath,
    textureFiles
  };
}
function WallpaperPage() {
  const [modelData, setModelData] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const currentMetaRef = reactExports.useRef(null);
  const loadedUrlRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    let unsubscribe = null;
    const init = async () => {
      var _a, _b;
      const wm = window.wallpaperMode;
      const desktopPet = window.desktopPet;
      console.log("[WallpaperPage] 初始化 wallpaperMode=", !!wm, "desktopPet=", !!desktopPet);
      if (!desktopPet) {
        setError("非 Electron 环境或 preload 未注入，壁纸页面无法工作");
        setLoading(false);
        return;
      }
      try {
        await ((_a = wm == null ? void 0 : wm.getStatus) == null ? void 0 : _a.call(wm));
      } catch {
      }
      const loadMeta = async () => {
        try {
          const meta = await desktopPet.getModel();
          if (!meta || !meta.url) {
            console.log("[WallpaperPage] 无模型缓存");
            setError("还没有模型。请先在主程序「3D 建模」导入模型，再按 F11 进入壁纸模式。");
            setLoading(false);
            return;
          }
          if (loadedUrlRef.current === (meta.url || "").split("?")[0]) {
            console.log("[WallpaperPage] 同一模型已加载，跳过");
            return;
          }
          currentMetaRef.current = meta;
          setLoading(true);
          setError(null);
          const data = await buildModelData(meta);
          loadedUrlRef.current = (meta.url || "").split("?")[0];
          setModelData(data);
          setLoading(false);
        } catch (err) {
          console.error("[WallpaperPage] 模型加载失败:", err);
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      };
      await loadMeta();
      const off = (_b = desktopPet.onModelUpdated) == null ? void 0 : _b.call(desktopPet, () => {
        loadMeta();
      });
      if (off)
        unsubscribe = off;
    };
    init();
    return () => {
      if (unsubscribe)
        unsubscribe();
    };
  }, []);
  reactExports.useEffect(() => {
    if (!modelData)
      return;
    const onWheel = (e) => {
      var _a;
      try {
        const scene = window.__babylonScene;
        const cam = ((_a = scene == null ? void 0 : scene.cameras) == null ? void 0 : _a[0]) || (scene == null ? void 0 : scene.activeCamera);
        if (cam) {
          const step = e.deltaY > 0 ? 0.9 : -0.9;
          cam.radius = Math.max(0.5, Math.min(100, cam.radius + step));
          e.preventDefault();
        }
      } catch {
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [modelData]);
  const handleModelLoaded = reactExports.useCallback(() => {
    console.log("[WallpaperPage] ✅ 模型加载成功");
    setLoading(false);
  }, []);
  const handleModelError = reactExports.useCallback((err) => {
    console.error("[WallpaperPage] ❌ 模型加载失败:", err);
    setError(err);
    setLoading(false);
  }, []);
  const handleClose = reactExports.useCallback(() => {
    console.log("[WallpaperPage] onClose 触发（壁纸模式忽略）");
  }, []);
  const handleExit = reactExports.useCallback(async () => {
    var _a;
    try {
      const wm = window.wallpaperMode;
      const r = await ((_a = wm == null ? void 0 : wm.exit) == null ? void 0 : _a.call(wm));
      console.log("[WallpaperPage] 退出壁纸模式:", r);
    } catch (e) {
      console.error("[WallpaperPage] 退出壁纸模式失败:", e);
    }
  }, []);
  if (loading && !modelData) {
    return /* @__PURE__ */ jsx("div", { style: {
      width: "100%",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      color: "#ddd",
      fontSize: 15,
      textShadow: "0 1px 4px rgba(0,0,0,0.8)",
      fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif"
    }, children: "壁纸模式启动中..." });
  }
  if (error && !modelData) {
    return /* @__PURE__ */ jsxs("div", { style: {
      width: "100%",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      background: "transparent",
      color: "#ff8a80",
      fontSize: 15,
      padding: 24,
      textAlign: "center",
      textShadow: "0 1px 4px rgba(0,0,0,0.8)",
      fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: { maxWidth: 480 }, children: error }),
      /* @__PURE__ */ jsx("button", { onClick: handleExit, style: {
        padding: "10px 22px",
        border: "none",
        borderRadius: 8,
        background: "rgba(26,26,26,0.85)",
        color: "#fff",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: "bold",
        fontFamily: "inherit"
      }, children: "退出壁纸模式 (F11)" })
    ] });
  }
  if (modelData) {
    return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(React.Suspense, { fallback: /* @__PURE__ */ jsx("div", { style: {
      width: "100%",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      color: "#ddd",
      fontSize: 15,
      textShadow: "0 1px 4px rgba(0,0,0,0.8)"
    }, children: "加载3D引擎中..." }), children: /* @__PURE__ */ jsx(
      BabylonModelViewer,
      {
        modelData,
        desktopPetMode: true,
        physicsEnabled: true,
        windEnabled: true,
        onModelLoaded: handleModelLoaded,
        onModelError: handleModelError,
        onClose: handleClose
      }
    ) }) });
  }
  return null;
}
export {
  WallpaperPage as default
};
