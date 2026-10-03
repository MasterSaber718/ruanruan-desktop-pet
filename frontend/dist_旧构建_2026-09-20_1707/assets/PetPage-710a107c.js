import { _ as __vitePreload } from "./babylon-72e1e591.js";
import { R as React, a as reactExports, j as jsx } from "./mui-096207bc.js";
const BabylonModelViewer = React.lazy(() => __vitePreload(() => import("./BabylonModelViewer-a9c8f453.js"), true ? ["assets/BabylonModelViewer-a9c8f453.js","assets/mui-096207bc.js","assets/babylon-72e1e591.js"] : void 0));
async function buildModelData(meta) {
  await fetch(meta.url + "?t=" + Date.now());
  const textureFiles = [];
  for (const tex of meta.textureFiles || []) {
    try {
      const r = await fetch(tex.url + "?t=" + Date.now());
      if (!r.ok)
        continue;
      const d = await r.arrayBuffer();
      if (!d.byteLength)
        continue;
      textureFiles.push({
        name: tex.name,
        path: tex.path || tex.name,
        data: d,
        webkitRelativePath: tex.webkitRelativePath || ""
      });
    } catch {
    }
  }
  return {
    name: meta.name,
    url: meta.url,
    modelWebkitRelativePath: meta.modelWebkitRelativePath || meta.name,
    textureFiles
  };
}
function PetPage() {
  const [modelData, setModelData] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const loadedUrlRef = reactExports.useRef(null);
  const showCalledRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    try {
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
    } catch {
    }
    let off = null;
    const dp = window.desktopPet;
    (async () => {
      if (!dp?.getModel) {
        setError("preload 未注入 desktopPet");
        return;
      }
      const meta = await dp.getModel();
      if (meta?.url && loadedUrlRef.current !== meta.url) {
        const data = await buildModelData(meta);
        loadedUrlRef.current = meta.url;
        setModelData(data);
      }
      off = dp.onModelUpdated?.(async (newMeta) => {
        if (!newMeta?.url || loadedUrlRef.current === newMeta.url)
          return;
        const data = await buildModelData(newMeta);
        loadedUrlRef.current = newMeta.url;
        setModelData(data);
      }) || null;
    })().catch((e) => setError(e?.message || String(e)));
    return () => {
      try {
        off?.();
      } catch {
      }
    };
  }, []);
  const onModelLoaded = reactExports.useCallback(() => {
    try {
      if (!showCalledRef.current) {
        showCalledRef.current = true;
        window.desktopPet?.showWindow?.();
      }
    } catch {
    }
  }, []);
  if (error && !modelData) {
    return /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#f66", fontSize: 14, padding: 20, textAlign: "center" }, children: error });
  }
  if (!modelData) {
    return /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#ccc", fontSize: 14 }, children: "等待模型数据..." });
  }
  return /* @__PURE__ */ jsx(React.Suspense, { fallback: /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#ccc", fontSize: 14 }, children: "加载3D引擎中..." }), children: /* @__PURE__ */ jsx(
    BabylonModelViewer,
    {
      modelData,
      desktopPetMode: true,
      physicsEnabled: true,
      windEnabled: true,
      onModelLoaded,
      onModelError: (err) => {
        console.error("[PetPage] model error", err);
      },
      onClose: () => {
        try {
          window.desktopPet?.hide?.();
        } catch {
        }
      }
    }
  ) });
}
export {
  PetPage as default
};
