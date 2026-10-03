// [v106] Edge Web Speech 桥客户端：轮询主进程 5175 /api/speech-bridge/final
// 识别由 Edge 打开 speech-bridge.html 完成；本模块只负责取 final 文本。

export interface SpeechBridgeItem {
  id: number;
  ts: number;
  text: string;
  lang?: string;
}

type OnFinal = (text: string, item: SpeechBridgeItem) => void;

export class SpeechBridgeClient {
  private timer: any = null;
  private after = 0;
  private onFinal: OnFinal | null = null;
  private running = false;

  get isActive(): boolean {
    return this.running;
  }

  start(onFinal: OnFinal, opts?: { lang?: string }): void {
    this.stop();
    this.onFinal = onFinal;
    this.after = 0;
    this.running = true;
    const lang = (opts && opts.lang) || 'zh-CN';
    try {
      const api = (window as any).speechBridge;
      if (api && api.start) api.start(lang);
    } catch (e) {
      console.warn('[SpeechBridge] start IPC fail', e);
    }
    // [v176] 350ms → 100ms：常驻识别页后，轮询间隔成了主要的出字延迟来源
    this.timer = setInterval(() => { this.poll(); }, 100);
    this.poll();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    try {
      const api = (window as any).speechBridge;
      if (api && api.stop) api.stop();
    } catch { /* noop */ }
  }

  private async poll(): Promise<void> {
    if (!this.running) return;
    try {
      const r = await fetch('http://127.0.0.1:5175/api/speech-bridge/final?after=' + this.after, { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      if (!data || !data.ok || !Array.isArray(data.items)) return;
      for (const it of data.items) {
        this.after = Math.max(this.after, Number(it.id) || 0);
        const t = String(it.text || '').trim();
        if (!t || !this.onFinal) continue;
        this.onFinal(t, it as SpeechBridgeItem);
      }
    } catch { /* 静默重试 */ }
  }
}

export const speechBridgeClient = new SpeechBridgeClient();
