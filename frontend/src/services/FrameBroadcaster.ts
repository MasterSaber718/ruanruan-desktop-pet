/**
 * FrameBroadcaster — 预览主窗唯一渲染源的画面分发
 * 默认 30fps；截取 Babylon canvas → PNG dataURL → desktopPet.sendRenderFrame
 * 桌宠/壁纸窗口只订阅显示，不再各自 new Engine。
 */
export type RenderFrame = {
  format: 'png';
  width: number;
  height: number;
  dataUrl: string;
  t: number;
  source: 'preview-owner';
};

const DEFAULT_FPS = 30;
const MAX_WIDTH = 960;

let rafId = 0;
let lastTs = 0;
let running = false;
let fps = DEFAULT_FPS;
let engineRef: any = null;
let canvasRef: HTMLCanvasElement | null = null;
let sendCount = 0;
let lastError = '';

function getCanvas(): HTMLCanvasElement | null {
  if (canvasRef && canvasRef.isConnected) return canvasRef;
  try {
    const c = engineRef?.getRenderingCanvas?.() || null;
    if (c) canvasRef = c as HTMLCanvasElement;
  } catch { /* noop */ }
  return canvasRef;
}

function captureOnce() {
  const dp = (window as any).desktopPet;
  if (!dp?.sendRenderFrame) return;
  const canvas = getCanvas();
  if (!canvas || !canvas.width || !canvas.height) return;
  try {
    const w = canvas.width;
    const h = canvas.height;
    const scale = w > MAX_WIDTH ? MAX_WIDTH / w : 1;
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const off = document.createElement('canvas');
    off.width = cw;
    off.height = ch;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(canvas, 0, 0, cw, ch);
    const dataUrl = off.toDataURL('image/png');
    const frame: RenderFrame = {
      format: 'png',
      width: cw,
      height: ch,
      dataUrl,
      t: Date.now(),
      source: 'preview-owner',
    };
    dp.sendRenderFrame(frame);
    sendCount++;
  } catch (e: any) {
    lastError = e?.message || String(e);
  }
}

function loop(ts: number) {
  if (!running) return;
  rafId = requestAnimationFrame(loop);
  const interval = 1000 / Math.max(1, fps);
  if (ts - lastTs < interval - 1) return;
  lastTs = ts;
  captureOnce();
}

export const FrameBroadcaster = {
  get fps() { return fps; },
  setFps(v: number) { fps = Math.max(5, Math.min(60, v || DEFAULT_FPS)); },
  isRunning() { return running; },
  stats() { return { running, fps, sendCount, lastError }; },
  /** 主窗口模型就绪后调用：engine + 可选 canvas */
  start(engine: any, canvas?: HTMLCanvasElement | null) {
    engineRef = engine || engineRef;
    if (canvas) canvasRef = canvas;
    if (running) return true;
    running = true;
    lastTs = 0;
    rafId = requestAnimationFrame(loop);
    console.log('[FrameBroadcaster] start fps=' + fps + ' (preview=sole render owner)');
    return true;
  },
  stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    console.log('[FrameBroadcaster] stop');
  },
  /** 手动测一帧 */
  captureOnce,
};

if (typeof window !== 'undefined') {
  (window as any).__FrameBroadcaster = FrameBroadcaster;
}

export default FrameBroadcaster;
