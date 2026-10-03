// [v112] 语音识别统一管理器 —— Edge Web Speech 桥（无感后台）
// 本地 Zipformer/Vosk 模型已删除。所有 STT 只走这里。
// 静音 / 打断 / 挂断 / 恢复 同源 control + final 流。

export interface SpeechFinalItem {
  id: number;
  ts: number;
  text: string;
  lang?: string;
}

export interface SpeechStatus {
  listening: boolean;
  micOk: boolean;
  error?: string;
  lang?: string;
}

export type SpeechFinalHandler = (text: string, item: SpeechFinalItem) => void;
export type SpeechStateHandler = (state: SpeechState, status: SpeechStatus) => void;
export type SpeechState = 'stopped' | 'running' | 'muted';

const CTRL_URL = 'http://127.0.0.1:5175/api/speech-bridge/control';
const FINAL_URL = 'http://127.0.0.1:5175/api/speech-bridge/final';
const STATUS_URL = 'http://127.0.0.1:5175/api/speech-bridge/status';
const VOICE_ENABLED_KEY = 'ruanlinyun_voice_enabled';

class SpeechManager {
  private handlers = new Set<SpeechFinalHandler>();
  private stateHandlers = new Set<SpeechStateHandler>();
  private timer: any = null;
  private statusTimer: any = null;
  private after = 0;
  private state: SpeechState = 'stopped';
  private lang = 'zh-CN';
  private skipPending = false;
  private status: SpeechStatus = { listening: false, micOk: false };
  private userDisabled = (() => {
    try { return localStorage.getItem(VOICE_ENABLED_KEY) === 'false'; } catch { return false; }
  })();
  /** [v113] 消费者计数：聊天麦/通话共享一路 Edge */
  private consumers = 0;

  getState(): SpeechState { return this.state; }
  getStatus(): SpeechStatus { return { ...this.status }; }
  isUserDisabled(): boolean { return this.userDisabled; }

  setUserDisabled(off: boolean) {
    this.userDisabled = !!off;
    try { localStorage.setItem(VOICE_ENABLED_KEY, off ? 'false' : 'true'); } catch { /* noop */ }
    console.log('[SpeechManager] userDisabled=' + this.userDisabled);
    if (off) this.stop();
  }

  subscribe(handler: SpeechFinalHandler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  onState(handler: SpeechStateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state, this.getStatus());
    return () => { this.stateHandlers.delete(handler); };
  }

  private emitState() {
    this.stateHandlers.forEach((h) => {
      try { h(this.state, this.getStatus()); } catch (e) { console.warn(e); }
    });
  }

  private async pushControl(patch: Record<string, any>): Promise<void> {
    try {
      await fetch(CTRL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch { /* noop */ }
  }

  async start(lang?: string): Promise<void> {
    this.consumers += 1;
    if (this.userDisabled) {
      this.consumers = Math.max(0, this.consumers - 1);
      console.log('[SpeechManager] 用户已关闭语音，忽略 start');
      this.emitState();
      return;
    }
    if (this.state === 'running') {
      console.log('[SpeechManager] already running, consumers=' + this.consumers);
      return;
    }
    this.lang = lang || this.lang || 'zh-CN';
    this.state = 'running';
    this.skipPending = false;
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = (window as any).speechBridge;
      if (api && api.start) await api.start(this.lang);
    } catch (e) {
      console.warn('[SpeechManager] Edge start IPC fail', e);
    }
    // [v176] final 轮询 300ms → 100ms：识别页已经常驻，出字延迟不该再被轮询间隔拖住
    if (!this.timer) this.timer = setInterval(() => { this.poll(); }, 100);
    if (!this.statusTimer) this.statusTimer = setInterval(() => { this.pollStatus(); }, 1000);
    this.poll();
    this.pollStatus();
    console.log('[SpeechManager] Edge 语音桥已启用 lang=' + this.lang + ' consumers=' + this.consumers);
    this.emitState();
  }

  async pauseForTts(): Promise<void> {
    if (this.state !== 'running') return;
    await this.pushControl({ enabled: true, muted: true });
    try {
      const api = (window as any).speechBridge;
      if (api && api.setControl) await api.setControl({ enabled: true, muted: true });
    } catch { /* noop */ }
    console.log('[SpeechManager] pause for TTS');
    this.emitState();
  }

  async resumeAfterTts(): Promise<void> {
    if (this.userDisabled) return;
    if (this.state !== 'running') return;
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = (window as any).speechBridge;
      if (api && api.setControl) await api.setControl({ enabled: true, muted: false, lang: this.lang });
    } catch { /* noop */ }
    console.log('[SpeechManager] resume after TTS');
    this.emitState();
  }

  async mute(): Promise<void> {
    if (this.state === 'stopped') return;
    this.state = 'muted';
    await this.pushControl({ enabled: true, muted: true });
    try {
      const api = (window as any).speechBridge;
      if (api && api.setControl) await api.setControl({ enabled: true, muted: true });
    } catch { /* noop */ }
    console.log('[SpeechManager] muted');
    this.emitState();
  }

  async unmute(): Promise<void> {
    if (this.userDisabled || this.state === 'stopped') return;
    this.state = 'running';
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = (window as any).speechBridge;
      if (api && api.setControl) await api.setControl({ enabled: true, muted: false, lang: this.lang });
    } catch { /* noop */ }
    console.log('[SpeechManager] unmuted');
    this.emitState();
  }

  interrupt(): void {
    this.skipPending = true;
    console.log('[SpeechManager] interrupt');
  }

  /** 减一个使用者；无人用时才真停 */
  async release(): Promise<void> {
    this.consumers = Math.max(0, this.consumers - 1);
    console.log('[SpeechManager] release consumers=' + this.consumers);
    if (this.consumers === 0) await this.stop();
  }

  async stop(): Promise<void> {
    this.consumers = 0;
    this.state = 'stopped';
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.statusTimer) { clearInterval(this.statusTimer); this.statusTimer = null; }
    await this.pushControl({ enabled: false, muted: false });
    try {
      const api = (window as any).speechBridge;
      if (api && api.stop) await api.stop();
    } catch { /* noop */ }
    this.handlers.clear();
    this.status = { listening: false, micOk: false };
    console.log('[SpeechManager] stopped');
    this.emitState();
  }

  private async pollStatus(): Promise<void> {
    try {
      const r = await fetch(STATUS_URL, { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      if (!d || !d.ok) return;
      const next: SpeechStatus = {
        listening: !!d.listening,
        micOk: !!d.micOk,
        error: d.error || '',
        lang: d.lang || this.lang,
      };
      const changed =
        next.listening !== this.status.listening ||
        next.micOk !== this.status.micOk ||
        next.error !== this.status.error;
      this.status = next;
      if (changed) this.emitState();
    } catch { /* noop */ }
  }

  private async poll(): Promise<void> {
    if (this.state === 'stopped') return;
    try {
      const r = await fetch(FINAL_URL + '?after=' + this.after, { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      if (!data || !data.ok || !Array.isArray(data.items)) return;
      if (this.skipPending) {
        for (const it of data.items) this.after = Math.max(this.after, Number(it.id) || 0);
        this.skipPending = false;
        return;
      }
      if (this.state === 'muted') {
        for (const it of data.items) this.after = Math.max(this.after, Number(it.id) || 0);
        return;
      }
      for (const it of data.items) {
        this.after = Math.max(this.after, Number(it.id) || 0);
        const t = String(it.text || '').trim();
        if (!t) continue;
        console.log('[SpeechManager] final #' + it.id, t);
        this.handlers.forEach((h) => {
          try { h(t, it as SpeechFinalItem); } catch (e) { console.warn(e); }
        });
      }
    } catch { /* noop */ }
  }
}

export const speechManager = new SpeechManager();
