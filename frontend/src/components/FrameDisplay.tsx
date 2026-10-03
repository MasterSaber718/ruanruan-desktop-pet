/**
 * 桌宠/壁纸显示端：只接收主窗口 Preview Owner 的 30fps 帧流
 * 不再加载 Babylon / PMX
 */
import React, { useEffect, useRef } from 'react';
import { t as tt } from '../i18n';

export default function FrameDisplay({ channel }: { channel: 'pet' | 'wallpaper' }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = React.useState<string>(tt('frame.waiting'));

  useEffect(() => {
    const dp = (window as any).desktopPet;
    if (!dp?.onRenderFrame) {
      setStatus(tt('frame.notReady'));
      return;
    }
    try { dp.setRenderChannel?.(channel, true); } catch { /* noop */ }
    const off = dp.onRenderFrame((frame: any) => {
      if (imgRef.current && frame?.dataUrl) {
        imgRef.current.src = frame.dataUrl;
        setStatus('');
      }
    });
    // 桌宠：请求显示窗口；壁纸窗口已由主进程挂载
    if (channel === 'pet') {
      try { dp.showWindow?.(); } catch { /* noop */ }
    }
    return () => {
      try { off?.(); } catch { /* noop */ }
      try { dp.setRenderChannel?.(channel, false); } catch { /* noop */ }
    };
  }, [channel]);

  return (
    <div style={{ width: '100%', height: '100vh', background: 'transparent', position: 'relative' }}>
      <img
        ref={imgRef}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: 'transparent',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      {status ? (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(200,220,255,0.75)', fontSize: 13, pointerEvents: 'none', textAlign: 'center', padding: 16,
        }}>{status}</div>
      ) : null}
    </div>
  );
}
