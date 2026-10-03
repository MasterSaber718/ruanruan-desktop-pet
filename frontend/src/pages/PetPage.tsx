/**
 * 桌宠窗口：加载模型并用 BabylonModelViewer(desktopPetMode) 渲染
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { t as tt } from '../i18n';

const BabylonModelViewer = React.lazy(() => import('../components/BabylonModelViewer'));

async function buildModelData(meta: any) {
  const modelResp = await fetch(meta.url + '?t=' + Date.now());
  // 桌宠链：模型用 url，贴图 fetch ArrayBuffer
  const textureFiles: any[] = [];
  for (const tex of meta.textureFiles || []) {
    try {
      const r = await fetch(tex.url + '?t=' + Date.now());
      if (!r.ok) continue;
      const d = await r.arrayBuffer();
      if (!d.byteLength) continue;
      textureFiles.push({
        name: tex.name,
        path: tex.path || tex.name,
        data: d,
        webkitRelativePath: tex.webkitRelativePath || '',
      });
    } catch { /* noop */ }
  }
  void modelResp;
  return {
    name: meta.name,
    url: meta.url,
    modelWebkitRelativePath: meta.modelWebkitRelativePath || meta.name,
    textureFiles,
  };
}

function PetPage() {
  const [modelData, setModelData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedUrlRef = useRef<string | null>(null);
  const showCalledRef = useRef(false);

  useEffect(() => {
    try {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
    } catch { /* noop */ }
    let off: (() => void) | null = null;
    const dp = (window as any).desktopPet;
    (async () => {
      if (!dp?.getModel) {
        setError(tt('pet.errNoPreload'));
        return;
      }
      const meta = await dp.getModel();
      if (meta?.url && loadedUrlRef.current !== meta.url) {
        const data = await buildModelData(meta);
        loadedUrlRef.current = meta.url;
        setModelData(data);
      }
      off = dp.onModelUpdated?.(async (newMeta: any) => {
        if (!newMeta?.url || loadedUrlRef.current === newMeta.url) return;
        const data = await buildModelData(newMeta);
        loadedUrlRef.current = newMeta.url;
        setModelData(data);
      }) || null;
    })().catch((e: any) => setError(e?.message || String(e)));
    return () => { try { off?.(); } catch { /* noop */ } };
  }, []);

  const onModelLoaded = useCallback(() => {
    try {
      if (!showCalledRef.current) {
        showCalledRef.current = true;
        (window as any).desktopPet?.showWindow?.();
      }
    } catch { /* noop */ }
  }, []);

  if (error && !modelData) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#f66', fontSize: 14, padding: 20, textAlign: 'center' }}>
        {error}
      </div>
    );
  }
  if (!modelData) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#ccc', fontSize: 14 }}>
        等待模型数据...
      </div>
    );
  }
  return (
    <React.Suspense fallback={<div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#ccc', fontSize: 14 }}>{tt('pet.loadingEngine')}</div>}>
      <BabylonModelViewer
        modelData={modelData}
        desktopPetMode={true}
        physicsEnabled={true}
        windEnabled={true}
        onModelLoaded={onModelLoaded}
        onModelError={(err: any) => { console.error('[PetPage] model error', err); }}
        onClose={() => { try { (window as any).desktopPet?.hide?.(); } catch { /* noop */ } }}
      />
    </React.Suspense>
  );
}

export default PetPage;
