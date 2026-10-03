/**
 * TTS 语音合成服务 — AI 通话女声音色
 *
 * [2026-07-24 新增] 用于 AI 通话场景，AI 回复时用清晰女声播报
 *
 * 方案策略（分层回退，保证可用性）：
 *   1. 优先：本地 TTS 服务（HTTP 127.0.0.1:9881，scripts/tts_server.py）
 *      - Edge-TTS 神经女声「晓晓 zh-CN-XiaoxiaoNeural」，接近真人、自然好听
 *      - 启动：python scripts/tts_server.py（依赖 pip install edge-tts，需联网）
 *      - 同一端口也兼容 Sherpa-ONNX 开源 TTS（vits-melo-tts-zh_en）离线方案
 *   2. 回退：浏览器 SpeechSynthesis API（调用系统女声）
 *      - 零依赖，立即可用
 *      - 女声优先级：晓晓(Xiaoxiao Natural) > 瑶瑶(Yaoyao) > 慧慧(Huihui) > 任意中文女声
 *
 * 设计原则：
 *   - 不影响现有功能：仅提供 speak(text) 接口，由调用方决定何时播报
 *   - 兼容性：Electron/Chrome/Edge 均支持 SpeechSynthesis
 *   - 可用性优先：本地服务不可用/合成失败时自动回退系统女声
 */

// 本地 TTS 服务地址（scripts/tts_server.py，Edge-TTS 晓晓女声；启动则优先使用）
const LOCAL_TTS_URL = 'http://127.0.0.1:9881';  // [v61e] 9880 被 GPT-SoVITS 占用，改 9881
// 检测超时（本地服务未启动时快速回退，不阻塞）
const LOCAL_TTS_PROBE_TIMEOUT = 800;

/**
 * 中文女声 TTS 服务
 */
class ChineseFemaleTTS {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private voicesReady: boolean = false;
  // 本地 TTS 服务可用性缓存（避免每次播报都探测）
  private localTTSAvailable: boolean | null = null;

  constructor() {
    // 仅在浏览器/Electron 环境初始化
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      // Chrome/Electron 的 voices 异步加载，需监听事件
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  /**
   * 加载并选择最佳中文女声
   * 优先级：Win11 晓晓神经女声 > 瑶瑶 > 慧慧 > 任意中文女声
   */
  private loadVoices(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (voices.length === 0) return;

    // 女声优先级列表（从高到低）
    const preferredFemale = [
      'Microsoft Xiaoxiao (Natural)',  // Win11 神经女声，接近真人
      'Microsoft Yaoyao Desktop',       // Win10 中文女声
      'Microsoft Huihui Desktop',       // Win7/8/10 中文女声
      'Microsoft Yaoyao',
      'Microsoft Huihui',
      'Microsoft Zira',                 // 英文女声（兜底）
    ];

    for (const name of preferredFemale) {
      const v = voices.find(v => v.name === name && v.lang && v.lang.startsWith('zh'));
      if (v) { this.voice = v; this.voicesReady = true; return; }
    }

    // 回退：任意中文语音
    const zhVoice = voices.find(v => v.lang && v.lang.startsWith('zh'));
    if (zhVoice) {
      this.voice = zhVoice;
      this.voicesReady = true;
      console.log('[TTS] 使用系统中文语音:', zhVoice.name);
    }
  }

  /**
   * 探测本地 TTS 服务（Edge-TTS 晓晓女声）是否可用
   * 缓存结果，避免每次播报都发探测请求
   */
  private async probeLocalTTS(): Promise<boolean> {
    if (this.localTTSAvailable !== null) return this.localTTSAvailable;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LOCAL_TTS_PROBE_TIMEOUT);
      // /health 由本地 HTTP 服务瞬时响应，不触发真实合成
      const resp = await fetch(`${LOCAL_TTS_URL}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      this.localTTSAvailable = resp.ok;
      if (this.localTTSAvailable) {
        console.log('[TTS] 检测到本地 Edge-TTS 女声服务（晓晓），将优先使用');
      }
    } catch {
      this.localTTSAvailable = false;
    }
    return this.localTTSAvailable;
  }

  /**
   * 通过本地 TTS 服务合成语音（Edge-TTS 晓晓神经女声，接近真人）
   * 注：该端口同样兼容 Sherpa-ONNX 开源 TTS（vits-melo-tts-zh_en），
   *     若用户自行启动 sherpa tts_server.py 也可直接使用
   */
  private async speakViaLocalTTS(text: string, speed: number = 1.0, pitch: number = 1.0): Promise<boolean> {
    try {
      // 默认音高(1.0)不传参，沿用服务端默认（晓晓 +5Hz）；仅显式调整时附加 pitch 参数
      let url = `${LOCAL_TTS_URL}/tts?text=${encodeURIComponent(text)}&speed=${speed}`;
      if (pitch !== 1.0) {
        const hz = Math.round((pitch - 1.0) * 20); // 1.25 -> +5Hz，0.9 -> -2Hz
        url += `&pitch=${hz >= 0 ? '+' : ''}${hz}Hz`;
      }
      const resp = await fetch(url);
      if (!resp.ok) return false;
      const blob = await resp.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 通过浏览器 SpeechSynthesis 合成语音（系统女声，零依赖）
   */
  private speakViaWebSpeech(text: string, speed: number = 1.0, pitch: number = 1.0): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.synth) { resolve(false); return; }
      try {
        const utter = new SpeechSynthesisUtterance(text);
        if (this.voice) utter.voice = this.voice;
        utter.lang = 'zh-CN';
        utter.rate = speed;   // 语速 0.5-2.0，默认 1.0
        utter.pitch = pitch;  // 音调 0-2，默认 1.0（女声微提 pitch 更柔和）
        utter.volume = 1.0;
        utter.onend = () => resolve(true);
        utter.onerror = () => resolve(false);
        // 清空队列避免叠加
        this.synth.cancel();
        this.synth.speak(utter);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * 播报文本（对外接口）
   * 优先本地 Edge-TTS 晓晓女声，回退系统女声
   *
   * @param text 要播报的文本
   * @param options.speed 语速（0.5-2.0，默认1.0）
   * @param options.pitch 音调（0-2，默认1.0；本地 Edge-TTS 与系统语音回退均生效）
   * @returns true=播报成功
   */
  async speak(text: string, options?: { speed?: number; pitch?: number }): Promise<boolean> {
    if (!text || !text.trim()) return false;
    const speed = options?.speed ?? 1.0;
    const pitch = options?.pitch ?? 1.0;

    // 优先尝试本地 Edge-TTS 女声（晓晓，音质更好）；失败自动回退系统女声
    if (await this.probeLocalTTS()) {
      const ok = await this.speakViaLocalTTS(text, speed, pitch);
      if (ok) return true;
    }

    // 回退到系统女声
    return this.speakViaWebSpeech(text, speed, pitch);
  }

  /**
   * 停止播报
   */
  stop(): void {
    if (this.synth) this.synth.cancel();
  }

  /**
   * 是否就绪（至少有一种 TTS 方式可用）
   */
  isReady(): boolean {
    return this.voicesReady || this.localTTSAvailable === true;
  }

  /**
   * 获取当前使用的音色名称（用于调试/UI显示）
   */
  getVoiceName(): string {
    if (this.localTTSAvailable) return 'Edge-TTS 晓晓（本地服务）';
    return this.voice?.name ?? '未就绪';
  }
}

// 单例导出
export const ttsService = new ChineseFemaleTTS();
export default ttsService;
