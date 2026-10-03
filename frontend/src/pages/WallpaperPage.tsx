import React, { useState, useEffect, useRef, useCallback } from 'react';
import { t as tt } from '../i18n';
// [2026-08-31 v62 壁纸模式] F11 全屏 → 角色成为桌面壁纸层（WorkerW 挂载）
// 技术形态：与 Wallpaper Engine / 米哈游《人工桌面》《BSide: Olivia Lin》同形态
// 窗口由主进程创建（全屏透明），挂载到 WorkerW 壁纸层（图标之下、壁纸之上）
//
// 数据流：复用桌宠的文件中转方案（零 IPC 大数据）：
//   主进程 petModelData 缓存（desktop-pet:show 写入 pet-tmp）→ 本页 getModel() 取 URL
//   → fetch 模型/贴图 → BabylonModelViewer(desktopPetMode) 渲染
//
// 与 PetPage 的差异：
//   - 全屏窗口（主窗口 hide 后的壁纸本体），非右下角小窗
//   - 控制台固定右上（fixed 定位，"禁止一动不动"——用户原话）
//   - 控制台新增「桌面宠物模式」「退出壁纸模式」两个入口
//   - 滚轮缩放：本页自接 wheel → camera.radius（desktopPetMode 禁 wheel 走 zoomBy，
//     zoomBy 是改窗口尺寸——壁纸窗口固定全屏不适用，故在页面层恢复滚轮缩放）
const BabylonModelViewer = React.lazy(() => import('../components/BabylonModelViewer'));

// [透明修复] 模块加载时立即设置 body 透明（照 PetPage 双保险）
if (typeof document !== 'undefined') {
  document.documentElement.style.background = 'transparent';
  document.documentElement.style.backgroundColor = 'transparent';
  document.body.style.background = 'transparent';
  document.body.style.backgroundColor = 'transparent';
}

/** 模型元数据（与桌宠 PetModelMeta 同构，复用 pet-tmp 静态服务） */
type WallpaperModelMeta = {
  name: string;
  modelWebkitRelativePath: string;
  url: string;  // http://127.0.0.1:5175/pet-tmp/xxx.pmx
  textureFiles: Array<{ name: string; path: string; webkitRelativePath: string; url: string }>;
};

/** fetch 全部贴图 ArrayBuffer（照 PetPage：本地 HTTP，不经 IPC，100% 可靠） */
async function fetchTextureBuffers(
  meta: WallpaperModelMeta
): Promise<Array<{ name: string; path: string; webkitRelativePath: string; data: ArrayBuffer }>> {
  console.log(`[WallpaperPage] fetch ${meta.textureFiles.length} 个贴图...`);
  const results = await Promise.allSettled(
    meta.textureFiles.map(async (tex) => {
      const resp = await fetch(tex.url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${tex.url}`);
      const data = await resp.arrayBuffer();
      return { name: tex.name, path: tex.path, webkitRelativePath: tex.webkitRelativePath, data };
    })
  );
  const textures: Array<{ name: string; path: string; webkitRelativePath: string; data: ArrayBuffer }> = [];
  let failCount = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') textures.push(r.value);
    else { failCount++; console.error(`[WallpaperPage] 贴图 fetch 失败 [${i}] ${meta.textureFiles[i].name}:`, r.reason); }
  }
  console.log(`[WallpaperPage] 贴图 fetch 完成: 成功 ${textures.length}/${meta.textureFiles.length}, 失败 ${failCount}`);
  return textures;
}

/** 从 meta 构建 BabylonModelViewer 需要的 modelData（模型走 URL，贴图走 ArrayBuffer） */
async function buildModelData(meta: WallpaperModelMeta) {
  console.log('[WallpaperPage] 构建 modelData, 模型 URL:', meta.url);
  const textureFiles = await fetchTextureBuffers(meta);
  return {
    name: meta.name,
    url: meta.url,
    modelWebkitRelativePath: meta.modelWebkitRelativePath,
    textureFiles,
  };
}

function WallpaperPage() {
  const [modelData, setModelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // [2026-09-05] modelName/attached 状态随页面内 DOM 控制台一并移除（悬浮球不再需要）
  // 防重复加载（同 PetPage：getModel 与 model-updated 为同一模型时只 set 一次）
  const currentMetaRef = useRef<WallpaperModelMeta | null>(null);
  const loadedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      const wm = (window as any).wallpaperMode;
      const desktopPet = (window as any).desktopPet;
      console.log('[WallpaperPage] 初始化 wallpaperMode=', !!wm, 'desktopPet=', !!desktopPet);
      if (!desktopPet) {
        setError(tt('wall.errNoElectron'));
        setLoading(false);
        return;
      }

      // 挂载状态查询（原供 DOM 控制台显示；保留空操作占位避免动初始化流程）
      try {
        await wm?.getStatus?.();
      } catch { /* noop */ }

      const loadMeta = async () => {
        try {
          const meta = await desktopPet.getModel();
          if (!meta || !meta.url) {
            console.log('[WallpaperPage] 无模型缓存');
            setError(tt('wall.errNoModel'));
            setLoading(false);
            return;
          }
          if (loadedUrlRef.current === (meta.url || '').split('?')[0]) {
            console.log('[WallpaperPage] 同一模型已加载，跳过');
            return;
          }
          currentMetaRef.current = meta;
          setLoading(true);
          setError(null);
          const data = await buildModelData(meta);
          loadedUrlRef.current = (meta.url || '').split('?')[0];
          setModelData(data);
          setLoading(false);
        } catch (err) {
          console.error('[WallpaperPage] 模型加载失败:', err);
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      };

      await loadMeta();

      // 模型更新（主窗口在壁纸模式期间不太可能导入，但保留通道）
      const off = desktopPet.onModelUpdated?.(() => { loadMeta(); });
      if (off) unsubscribe = off;
    };

    init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  /** 滚轮缩放：壁纸模式下恢复 Blender 式滚轮缩放（走相机 radius，不改窗口尺寸） */
  useEffect(() => {
    if (!modelData) return;
    const onWheel = (e: WheelEvent) => {
      try {
        const scene = (window as any).__babylonScene;
        const cam = scene?.cameras?.[0] || scene?.activeCamera;
        if (cam) {
          const step = e.deltaY > 0 ? 0.9 : -0.9;
          cam.radius = Math.max(0.5, Math.min(100, cam.radius + step));
          e.preventDefault();
        }
      } catch { /* noop */ }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [modelData]);

  // ═══ [2026-10-01 3D场景] 应用保存的场景布局（extras/背景/主模型变换）——生效范围含壁纸时 ═══
  useEffect(() => {
    if (!modelData) return;
    let alive = true;
    (async () => {
      try {
        const s3 = (window as any).scene3d;
        if (!s3?.getLayout) return;
        const raw = await s3.getLayout();
        if (!raw || !alive) return;
        if (typeof raw === 'object' && (raw as any).success === false) return; // [2026-10-02 终审] 主进程错误对象不当布局用
        const layout = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!layout || layout.scope === 'preview') return;
        for (let i = 0; i < 100 && !(window as any).__scene3d?.applyLayout; i++) {
          await new Promise((r) => setTimeout(r, 100));
          if (!alive) return;
        }
        if (!alive) return;
        await (window as any).__scene3d.applyLayout(layout);
        console.log('[WallpaperPage] 3D 场景布局已应用: models=' + (layout.models || []).length);
      } catch (e) {
        console.warn('[WallpaperPage] 3D 布局应用失败:', e);
      }
    })();
    return () => { alive = false; };
  }, [modelData]);

  /** 模型加载完成/失败回调（照 PetPage，但壁纸窗口主进程已显示，无需 showWindow） */
  const handleModelLoaded = useCallback(() => {
    console.log('[WallpaperPage] ✅ 模型加载成功');
    setLoading(false);
  }, []);
  const handleModelError = useCallback((err: string) => {
    console.error('[WallpaperPage] ❌ 模型加载失败:', err);
    setError(err);
    setLoading(false);
  }, []);
  const handleClose = useCallback(() => {
    // 组件 onClose（桌宠模式语义是 hide 窗口）——壁纸模式下无操作，退出走控制台/F11
    console.log('[WallpaperPage] onClose 触发（壁纸模式忽略）');
  }, []);

  /** 退出壁纸模式（回主窗口，WE 恢复）——错误/无模型兜底页仍用，悬浮球走主进程链路 */
  const handleExit = useCallback(async () => {
    try {
      const wm = (window as any).wallpaperMode;
      const r = await wm?.exit?.();
      console.log('[WallpaperPage] 退出壁纸模式:', r);
    } catch (e) {
      console.error('[WallpaperPage] 退出壁纸模式失败:', e);
    }
  }, []);

  // ═══════════ 渲染 ═══════════
  // [2026-09-05] 页面内 DOM 控制台（consolePanel/collapsedButton）已整体移除——
  //   壁纸窗口挂在桌面图标层之下，DOM 控制台永远收不到鼠标（"隔玻璃"），
  //   其职责由主进程独立悬浮窗（白色悬浮球 console.html）接管。

  // 加载态
  if (loading && !modelData) {
    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', color: '#ddd', fontSize: 15,
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
      }}>
        壁纸模式启动中...
      </div>
    );
  }

  // 错误/无模型态（保留退出按钮，避免用户被困在全屏里）
  if (error && !modelData) {
    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'transparent', color: '#ff8a80', fontSize: 15, padding: 24,
        textAlign: 'center', textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
      }}>
        <div style={{ maxWidth: 480 }}>{error}</div>
        <button onClick={handleExit} style={{
          padding: '10px 22px', border: 'none', borderRadius: 8,
          background: 'rgba(26,26,26,0.85)', color: '#fff', cursor: 'pointer',
          fontSize: 14, fontWeight: 'bold', fontFamily: 'inherit',
        }}>
          退出壁纸模式 (F11)
        </button>
      </div>
    );
  }

  // 正常渲染：3D 模型（全屏透明）+ 固定控制台
  if (modelData) {
    return (
      <>
        <React.Suspense fallback={
          <div style={{
            width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: '#ddd', fontSize: 15,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            加载3D引擎中...
          </div>
        }>
          <BabylonModelViewer
            modelData={modelData}
            desktopPetMode={true}
            physicsEnabled={true}
            windEnabled={true}
            onModelLoaded={handleModelLoaded}
            onModelError={handleModelError}
            onClose={handleClose}
          />
        </React.Suspense>
      </>
    );
  }

  return null;
}

export default WallpaperPage;
