/**
 * LLM API调用服务
 *
 * 调用优先级：
 *   1. 后端代理（密钥在服务端.env）
 *   2. 直连模式（AES-256-GCM加密localStorage）
 *   3. 本地AI
 *
 * 统一协议支持：
 *   - OpenAI Messages API 格式（/v1/chat/completions）
 *   - Anthropic Messages API 格式（/v1/messages）
 *   - 所有调用通过统一接口，自动适配不同提供商
 */

import { ApiProviderConfig } from './ApiConfigService';
import apiConfigService from './ApiConfigService';
import { MessageRole, AIMessage, AIResponse, AIRequestOptions, IAIProvider, AICapabilities, TrainingFeedback, ProtocolConverter, OpenAIRequest, OpenAIResponse, AnthropicRequest, AnthropicResponse } from '../ai/AIProvider';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  // [v115] 多模态：string 或 OpenAI content parts（含 image_url）
  content: string | any[];
}

// 安全参数
// v4: 移除 MAX_RETRIES 和 BASE_RETRY_DELAY —— 按用户要求"只请求一次，等结果"，不再重试
// [2026-09-08] 30s→90s：云端上游/本地3B CPU 偶发慢（日志实锤 30.6s 被掐），30s 太紧导致
// "signal is aborted without reason"（前端先 abort）+ "[AI Proxy] Timeout"（后端 30s 掐断）
const REQUEST_TIMEOUT = 90000;

// [v61d] 后端代理探测失败后的重试冷却（毫秒）
// 根因：后端启动约需 1-2 分钟（老电脑加载 446 依赖包 + 路由 + llama 模型），
//       前端单次 3 秒探测失败若永久缓存"不可用"，会导致后端就绪后仍报错。
// 策略：失败后不永久缓存，冷却期内不重复探测，冷却后重新探测直到后端就绪。
const PROXY_RETRY_COOLDOWN = 5000;
const RATE_LIMIT_PER_MINUTE = 60;
// v4: 移除 CIRCUIT_BREAKER_THRESHOLD —— 不再 fallback 直连，断路器不再触发
const CIRCUIT_BREAKER_COOLDOWN = 60000;

// ---- 防频控参数（模拟正常用户行为） ----
// 客户端最小请求间隔（毫秒）。模拟用户思考/打字时间，避免突发请求
const CLIENT_MIN_INTERVAL_MS = 1500;
// 相同消息去重窗口（毫秒）。3秒内相同消息只发送一次
const DEDUP_WINDOW_MS = 3000;
// 429 后客户端冷却时间（毫秒）
const CLIENT_COOLDOWN_MS = 10000;

/**
 * 动态获取后端 API 主机
 *
 * 设计目的：从局域网 IP 访问前端（如 http://192.168.1.14:5175）时，
 * 浏览器里运行的 JS 必须用 192.168.1.14:27865 而不是 127.0.0.1:27865，
 * 否则 127.0.0.1 在访问者（如手机）上指向访问者自己，导致连接失败。
 *
 * Electron 环境下 window.location.hostname 可能为空，降级到 127.0.0.1。
 */
const API_HOST = (typeof window !== 'undefined' && window.location && window.location.hostname) || '127.0.0.1';
const PROXY_BASE = `http://${API_HOST}:27865/api/v1/ai`;

/** [v183-T3] 手机本机直连判定：安卓/iOS WebView（Capacitor）或移动 UA。
 *  局域网方案已被用户否决：手机上没有 27865 后端，聊天必须直连云端 provider（手机本机决策）。 */
const IS_NATIVE_MOBILE = typeof navigator !== 'undefined' && (
  ((window as any).Capacitor?.isNativePlatform?.()) ||
  /android|iphone|ipad|mobile/i.test(navigator.userAgent || '')
);

function sanitizeInput(input: string): string {
  const cleaned = input.trim();
  if (!cleaned) throw new Error('输入为空');
  return cleaned.length > 8000 ? cleaned.slice(0, 8000) : cleaned;
}

/** [v115] 多模态 content：只 sanitize 文本段，image_url 原样保留 */
function sanitizeMessageContent(content: string | any[]): string | any[] {
  if (typeof content === 'string') return sanitizeInput(content);
  if (!Array.isArray(content) || content.length === 0) throw new Error('输入为空');
  return content.map((part) => {
    if (part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string') {
      return { ...part, text: part.text.trim().slice(0, 8000) };
    }
    return part;
  });
}

/** [v115] 从 content 提取纯文本（去重指纹用） */
function contentToText(content: string | any[]): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((p: any) => (p && p.type === 'text' && typeof p.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('\n');
}

/**
 * 限流错误（HTTP 429 专用）
 *
 * 设计目的：与普通错误区分，让上层可以：
 * 1. 不重试（429 重试只会加剧上游限流）
 * 2. 不计入断路器（限流是上游问题，不是服务挂了）
 * 3. 按 Retry-After 头等待（OpenAI 协议规范）
 *
 * source 字段区分 429 来源：
 *   - 'upstream'          上游 API 限流（如 DeepSeek），需按 Retry-After 等待
 *   - 'backend_ip_limit'  后端 IP 限流，60 秒后重置
 *   - 'frontend_limit'    前端 TokenBucket 限流，稍后即可
 */
export type RateLimitSource = 'upstream' | 'backend_ip_limit' | 'frontend_limit';

export class RateLimitError extends Error {
  readonly retryAfter: number | null;
  readonly source: RateLimitSource;
  constructor(message: string, retryAfter: number | null, source: RateLimitSource = 'upstream') {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.source = source;
  }
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(private capacity: number) { this.tokens = capacity; this.lastRefill = Date.now(); }
  consume(count = 1): boolean {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.lastRefill) / 1000 * (this.capacity / 60));
    this.lastRefill = now;
    if (this.tokens >= count) { this.tokens -= count; return true; }
    return false;
  }
}

// ==================== 统一 AI 提供商实现 ====================

/**
 * OpenAI 格式提供商实现
 * 兼容所有 OpenAI API 格式的提供商（DeepSeek、智谱、本地 Ollama 等）
 */
export class OpenAICompatibleProvider implements IAIProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    const request: OpenAIRequest = {
      model: this.model,
      messages: ProtocolConverter.fromUnified(messages),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stopSequences,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `OpenAI API 错误 HTTP ${resp.status}`);
    }

    const data = await resp.json() as OpenAIResponse;
    return {
      id: data.id,
      object: data.object,
      created: data.created,
      model: data.model,
      choices: data.choices.map(c => ({
        index: c.index,
        message: { role: c.message.role as MessageRole, content: c.message.content },
        finish_reason: c.finish_reason,
      })),
      usage: data.usage,
    };
  }

  async generateStream(_messages: AIMessage[], _onChunk: (chunk: string) => void, _options?: AIRequestOptions): Promise<void> {
    throw new Error('Streaming not implemented in OpenAICompatibleProvider');
  }

  getCapabilities(): AICapabilities {
    return {
      supportsStreaming: false,
      supportsImages: this.model.includes('vision') || this.model.includes('4o'),
      supportsTools: false,
      maxTokens: 4096,
      contextWindow: 128000,
    };
  }

  async train(_feedback: TrainingFeedback): Promise<void> {
    // OpenAI 格式不提供直接训练接口，训练数据存储在本地
    console.log('[OpenAIProvider] Training feedback received:', _feedback);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/models`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      });
      return resp.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Anthropic 格式提供商实现
 * 兼容 Claude API
 */
export class AnthropicCompatibleProvider implements IAIProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    // 分离 system 消息
    const systemMessage = messages.find(m => m.role === MessageRole.System);
    const userMessages = messages.filter(m => m.role !== MessageRole.System);

    const request: AnthropicRequest = {
      model: this.model,
      messages: userMessages.map(m => ({
        role: m.role === MessageRole.User ? 'user' : 'assistant',
        content: [typeof m.content === 'string' ? m.content : m.content.map(c => c.type === 'text' ? c.text : '').join('\n')],
      })),
      system: systemMessage?.content && typeof systemMessage.content === 'string' ? systemMessage.content : undefined,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature,
      top_p: options?.topP,
      stop_sequences: options?.stopSequences,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const resp = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `Anthropic API 错误 HTTP ${resp.status}`);
    }

    const data = await resp.json() as AnthropicResponse;
    return ProtocolConverter.toUnified(data, this.model);
  }

  async generateStream(_messages: AIMessage[], _onChunk: (chunk: string) => void, _options?: AIRequestOptions): Promise<void> {
    throw new Error('Streaming not implemented in AnthropicCompatibleProvider');
  }

  getCapabilities(): AICapabilities {
    return {
      supportsStreaming: true,
      supportsImages: this.model.includes('sonnet') || this.model.includes('opus'),
      supportsTools: this.model.includes('claude-3'),
      maxTokens: 4096,
      contextWindow: 200000,
    };
  }

  async train(_feedback: TrainingFeedback): Promise<void> {
    console.log('[AnthropicProvider] Training feedback received:', _feedback);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/v1/models`, {
        headers: { 'x-api-key': this.apiKey },
      });
      return resp.ok;
    } catch {
      return false;
    }
  }
}

export class LLMApiService {
  private static instance: LLMApiService;
  private rateLimiter = new TokenBucket(RATE_LIMIT_PER_MINUTE);
  private consecutiveFailures = 0;
  private circuitOpen = false;
  private circuitOpenTime = 0;
  private proxyChecked = false;
  private proxyAvailable = false;
  private lastProxyCheckAt = 0;  // [v61d] 上次代理探测时间戳（失败重试冷却）

  // ---- 防频控状态 ----
  // 上次请求发起时间戳（用于请求间隔控制）
  private lastRequestAt = 0;
  // 客户端冷却到期时间（429 后设置）
  private clientCooldownUntil = 0;
  // 最近发送的消息指纹列表（用于去重）
  private recentMessages: Array<{ key: string; ts: number }> = [];
  // 当前是否有请求正在进行（防止并发）
  private requestInFlight = false;
  // 等待队列（串行化请求）
  private waitQueue: Array<() => void> = [];

  static getInstance(): LLMApiService {
    if (!LLMApiService.instance) LLMApiService.instance = new LLMApiService();
    return LLMApiService.instance;
  }

  /**
   * 等待请求间隔（模拟用户思考时间）
   * 1. 如果处于冷却期，等到冷却结束
   * 2. 距离上次请求不足间隔，等到间隔满足
   * 3. 如果有请求正在进行，排队等待
   */
  private async waitForRequestSlot(): Promise<void> {
    // 如果有请求正在进行，加入等待队列
    if (this.requestInFlight) {
      await new Promise<void>((resolve) => {
        this.waitQueue.push(resolve);
      });
    }
    this.requestInFlight = true;

    const now = Date.now();
    let waitMs = 0;
    // 1. 冷却期检查
    if (now < this.clientCooldownUntil) {
      waitMs = Math.max(waitMs, this.clientCooldownUntil - now);
    }
    // 2. 请求间隔检查
    const intervalEnd = this.lastRequestAt + CLIENT_MIN_INTERVAL_MS;
    if (now < intervalEnd) {
      waitMs = Math.max(waitMs, intervalEnd - now);
    }
    if (waitMs > 0) {
      await new Promise(r => setTimeout(r, waitMs));
    }
    this.lastRequestAt = Date.now();
  }

  /** 释放请求锁，唤醒下一个排队请求 */
  private releaseRequestSlot(): void {
    this.requestInFlight = false;
    const next = this.waitQueue.shift();
    if (next) next();
  }

  /**
   * 检查消息去重（短时间内相同消息不重复发送）
   * @returns true=可发送, false=被去重过滤
   */
  private checkDedup(userMessage: string): boolean {
    const now = Date.now();
    // 清理过期记录
    this.recentMessages = this.recentMessages.filter(r => now - r.ts < DEDUP_WINDOW_MS);
    // 计算消息指纹（取前200字符避免长消息影响性能）
    const key = userMessage.slice(0, 200);
    // 查找是否已存在
    const exists = this.recentMessages.some(r => r.key === key);
    if (exists) {
      console.warn('[AI] 检测到重复请求（去重过滤）:', key.slice(0, 50));
      return false;
    }
    this.recentMessages.push({ key, ts: now });
    return true;
  }

  /** 标记客户端限流冷却 */
  private triggerClientCooldown(retryAfter: number | null): void {
    const cooldown = retryAfter && retryAfter > 0
      ? Math.min(retryAfter * 1000, 60000)
      : CLIENT_COOLDOWN_MS;
    this.clientCooldownUntil = Date.now() + cooldown;
    console.warn(`[AI] 触发客户端冷却 ${cooldown}ms`);
  }

  async init(): Promise<void> { await this.checkProxyHealth(); }

  async checkProxyHealth(): Promise<boolean> {
    // [v61d] 后端启动慢：失败后不永久缓存，冷却后允许重试（见 PROXY_RETRY_COOLDOWN）
    const now = Date.now();
    if (!this.proxyAvailable && this.lastProxyCheckAt && now - this.lastProxyCheckAt < PROXY_RETRY_COOLDOWN) {
      return false; // 冷却期内，不重复探测（避免每次发消息都等 3 秒超时）
    }
    this.lastProxyCheckAt = now;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const resp = await fetch(`${PROXY_BASE}/proxy/health`, { signal: ctrl.signal });
      clearTimeout(t);
      if (resp.ok && ((await resp.json()) as { ok: boolean }).ok) {
        this.proxyAvailable = true;
        this.proxyChecked = true;
        return true;
      }
    } catch { /* empty */ }
    this.proxyAvailable = false;
    this.proxyChecked = false; // 失败后允许下次重试（原为 true 导致永久放弃）
    return false;
  }

  isConfigured(): boolean {
    // 开关必须启用（任一provider enabled=true）才允许API调用
    const anyEnabled = apiConfigService.getAll().some((c) => c.enabled);
    if (!anyEnabled) return false;
    // 代理优先（密钥在服务端，不需要前端key）
    if (this.proxyChecked && this.proxyAvailable) return true;
    // 直连模式（需要前端有key）
    return apiConfigService.hasConfigured();
  }

  isProxyMode(): boolean { return this.proxyAvailable; }

  getActiveProvider(): ApiProviderConfig | null {
    if (this.proxyAvailable) {
      return { id: 'proxy', name: '阮琳云', baseUrl: PROXY_BASE, apiKey: '', model: 'proxy', enabled: true };
    }
    if (this.circuitOpen) return null;
    return apiConfigService.getActive();
  }

  getCircuitBreakerReason(): string | null {
    if (!this.circuitOpen) return null;
    const r = Math.ceil((this.circuitOpenTime + CIRCUIT_BREAKER_COOLDOWN - Date.now()) / 1000);
    return r > 0 ? `API暂停（${this.consecutiveFailures}次失败），${r}秒后恢复` : null;
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const body: ChatMessage[] = systemPrompt
      ? [{ role: 'system', content: sanitizeInput(systemPrompt) }, ...messages.map((m) => ({ ...m, content: sanitizeMessageContent(m.content) }))]
      : messages.map((m) => ({ ...m, content: sanitizeMessageContent(m.content) }));
    const trimmed = body.slice(-20);

    // 获取前端配置的 provider（仅用于判断是否配置，实际调用走后端代理）
    const provider = apiConfigService.getActive();
    if (!provider) throw new Error(this.getCircuitBreakerReason() ?? '请先在设置中配置并启用AI模型API');

    if (!this.rateLimiter.consume()) throw new RateLimitError('请求频繁，请稍后（60次/分钟）', 60, 'frontend_limit');

    // 消息去重（取最后一条 user 消息作为去重指纹；多模态只取文本段）
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg && !this.checkDedup(contentToText(lastUserMsg.content))) {
      throw new RateLimitError('检测到重复请求，已自动过滤', 2, 'frontend_limit');
    }

    // 等待请求间隔（串行化，模拟正常用户节奏）
    await this.waitForRequestSlot();

    try {
      // v4: 只走后端代理，不再 fallback 直连上游
      // 按用户要求"先发第一轮用户发送的信息，直接发送给对应端等待返回结果"
      // 后端代理失败/429 直接抛错，不再直连上游，避免 1 次请求变成 2 次上游调用
      if (!this.proxyChecked) await this.checkProxyHealth();
      if (!this.proxyAvailable) {
        throw new Error('后端代理服务不可用，请检查后端是否启动');
      }

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
      const resp = await fetch(`${PROXY_BASE}/proxy`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: trimmed,
          systemPrompt,
          // 不传 provider 字段（apiKey/baseUrl/model 由后端 .env 控制）
        }),
        signal: ctrl.signal,
      });
      clearTimeout(t);

      if (!resp.ok) {
        // 429 透传识别：上游/后端限流时按 Retry-After 等待，不重试
        if (resp.status === 429) {
          const retryAfter = this.parseRetryAfter(resp.headers.get('retry-after'));
          const errBody = await resp.json().catch(() => ({} as { retryAfter?: number }));
          const wait = retryAfter ?? errBody.retryAfter ?? null;
          this.triggerClientCooldown(wait);
          throw new RateLimitError('请求过于频繁，请稍后重试', wait, 'upstream');
        }
        // 非 429 错误：直接抛错，不再 fallback 直连
        const errJson = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(errJson.error ?? `代理错误 HTTP ${resp.status}`);
      }

      const data = await resp.json() as { content?: string; cached?: boolean };
      this.consecutiveFailures = 0;
      if (data.cached) {
        console.log('[AI] 命中后端缓存，未触发上游调用');
      }
      return data.content ?? '';
    } finally {
      // 释放请求锁，唤醒下一个排队请求
      this.releaseRequestSlot();
    }
  }

  /** 解析 Retry-After 头（支持秒数或 HTTP 日期），返回等待秒数；无则返回 null */
  private parseRetryAfter(value: string | null): number | null {
    if (!value) return null;
    const s = Number(value);
    if (!Number.isNaN(s) && s >= 0) return Math.ceil(s);
    const date = Date.parse(value);
    if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
    return null;
  }

  async ask(userMessage: string, systemPrompt?: string): Promise<string> {
    return this.chat([{ role: 'user', content: userMessage }], systemPrompt);
  }

  /**
   * 带对话历史的 AI 调用（OpenAI 标准协议）
   *
   * 设计目的：解决旧方案把对话历史拼接成字符串塞进单条 user 消息导致的角色混淆问题。
   * 旧方案：`${对话历史}\n用户: ${text}` → AI 误以为历史中"阮琳云:"是用户名
   * 新方案：每条消息独立 role=user/assistant，符合 OpenAI Messages API 协议规范
   *
   * @param history 对话历史，role 必须是 'user' 或 'assistant'
   * @param userMessage 当前用户消息
   * @param systemPrompt 系统提示词
   */
  /** [v183-T3] 手机本机直连聊天：直连 provider（OpenAI 兼容 /v1/chat/completions），
   *  不依赖 27865 后端代理（手机上不存在）。Anthropic 端点同样直连（x-api-key 头）。 */
  private async chatDirectOnMobile(
    history: Array<{ role: 'user' | 'assistant'; content: string | any[] }>,
    userMessage: string,
    systemPrompt?: string
  ): Promise<string> {
    const provider = apiConfigService.getActive();
    if (!provider || !provider.enabled) {
      throw new Error('请先在设置中配置并启用AI模型API（手机直连模式）');
    }
    const messages: AIMessage[] = [
      ...(systemPrompt ? [{ role: 'system' as MessageRole, content: systemPrompt }] : []),
      ...history.slice(-20).map((m) => ({ role: m.role as MessageRole, content: m.content as any })),
      ...(userMessage && userMessage.trim() ? [{ role: 'user' as MessageRole, content: userMessage }] : []),
    ];
    const base = provider.baseUrl.replace(/\/$/, '');
    const isAnthropic = /anthropic/i.test(base);
    const url = isAnthropic ? `${base}/v1/messages` : `${base}/chat/completions`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAnthropic
            ? { 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01' }
            : { Authorization: `Bearer ${provider.apiKey}` }),
        },
        body: JSON.stringify(isAnthropic
          ? { model: provider.model, max_tokens: 2048, system: systemPrompt || undefined,
              messages: messages.filter((m) => m.role !== 'system')
                .map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })) }
          : { model: provider.model, messages, temperature: 0.7, max_tokens: 2048 }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as any;
        throw new Error(err?.error?.message ?? `API 错误 HTTP ${resp.status}`);
      }
      const data = await resp.json() as any;
      if (isAnthropic) {
        const text = (data.content || []).map((c: any) => c?.text || '').join('');
        return text || '（空回复）';
      }
      return data.choices?.[0]?.message?.content ?? '（空回复）';
    } finally {
      clearTimeout(t);
    }
  }

  async askWithHistory(
    history: Array<{ role: 'user' | 'assistant'; content: string | any[] }>,
    userMessage: string,
    systemPrompt?: string
  ): Promise<string> {
    // [v183-T3] 手机本机直连分支：先于代理探测（手机无 27865，探测只会白等 3 秒）
    if (IS_NATIVE_MOBILE) {
      return this.chatDirectOnMobile(history, userMessage, systemPrompt);
    }
    // [v115] userMessage 为空时不再追加空 user 条（多模态历史已含当前消息）
    const messages: ChatMessage[] = [
      ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      ...(userMessage && userMessage.trim()
        ? [{ role: 'user' as const, content: userMessage }]
        : []),
    ];
    return this.chat(messages, systemPrompt);
  }

  // ============================================================
  // 自研大脑接口（Python 神经网络大脑，端口 27900）
  // 返回完整思考过程数据，供前端可视化
  // ============================================================
  async checkBrainHealth(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const resp = await fetch('http://127.0.0.1:27900/api/v1/ai/health', { signal: ctrl.signal });
      clearTimeout(t);
      if (resp.ok) {
        const data = await resp.json() as { status?: string };
        return data.status === 'ok';
      }
      return false;
    } catch {
      return false;
    }
  }

  async askBrain(userMessage: string, reward = 0.5): Promise<BrainResponse> {
    const message = sanitizeInput(userMessage);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
    try {
      const resp = await fetch('http://127.0.0.1:27900/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, reward }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { message?: string; offline?: boolean };
        throw new Error(err.message ?? `自研大脑错误 HTTP ${resp.status}`);
      }
      return (await resp.json()) as BrainResponse;
    } finally {
      clearTimeout(t);
    }
  }

  async sendBrainFeedback(rating: number, comment?: string): Promise<void> {
    try {
      await fetch('http://127.0.0.1:27900/api/v1/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment ?? null }),
      });
    } catch {
      // 反馈失败不影响主流程
    }
  }

  async testConnection(provider: ApiProviderConfig): Promise<{ ok: boolean; message: string }> {
    // [2026-08-27 P1 修复] 首连超时：10s→20s + 首次超时自动重试一次
    //   根因：TLS/DNS 冷启动或本地模型首载未热，首次探测常超 10s；第二次复用连接即成功。
    const attemptOnce = async (): Promise<{ ok: boolean; message: string }> => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 20000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;
      const resp = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: provider.model, messages: [{ role: 'user', content: '你好，回复"连接成功"' }], max_tokens: 20, stream: false }),
        signal: ctrl.signal,
      });
        clearTimeout(t);
        if (resp.ok) {
          const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
          return { ok: true, message: `连接成功 → ${(data.choices?.[0]?.message?.content ?? '').substring(0, 50)}` };
        }
        const st = resp.status;
        if (st === 401) return { ok: false, message: 'API Key无效' };
        if (st === 403) return { ok: false, message: '模型名称错误或无权限' };
        return { ok: false, message: `HTTP ${st}` };
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return { ok: false, message: '__TIMEOUT__' };
        return { ok: false, message: (err instanceof Error ? err.message : String(err)).substring(0, 150) };
      }
    };
    try {
      let r = await attemptOnce();
      if (!r.ok && r.message === '__TIMEOUT__') {
        // 首次超时自动重试一次（第二次常命中已热的连接/服务）
        r = await attemptOnce();
        if (!r.ok && r.message === '__TIMEOUT__') return { ok: false, message: '连接超时（已自动重试一次），检查Base URL或网络' };
      }
      return r;
    } catch (err: unknown) {
      return { ok: false, message: (err instanceof Error ? err.message : String(err)).substring(0, 150) };
    }
  }
}

/**
 * 工厂方法：根据 provider 配置自动创建统一 AI 提供商实例
 */
export function createAIProvider(config: ApiProviderConfig): IAIProvider {
  // 检测是否为 Anthropic Claude API（baseUrl 包含 anthropic 或模型名以 claude 开头）
  const isAnthropic = config.baseUrl.includes('anthropic') || config.model.toLowerCase().includes('claude');

  if (isAnthropic) {
    return new AnthropicCompatibleProvider(config.baseUrl, config.apiKey, config.model);
  }

  // 默认使用 OpenAI 兼容格式（DeepSeek、智谱、OpenAI、本地 Ollama 等都支持）
  return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, config.model);
}

export const llmApiService = LLMApiService.getInstance();
export default llmApiService;

// ============================================================
// 自研大脑响应类型定义（思考过程可视化数据）
// ============================================================
export interface BrainThoughtChain {
  phases?: string[];
  direction?: string;
  goal?: string;
}

export interface BrainMetacognition {
  understanding?: number;
  confidence?: number;
  knowledge_gap?: string;
  strategy?: string;
}

export interface BrainKnowledgeQuery {
  source?: string;
  key_points?: string[];
}

export interface BrainSelfNarrative {
  thought?: string;
  feeling?: string;
}

export interface BrainState {
  activity?: number;
  mood?: string;
  active_concepts?: string[];
  mood_label?: string;
  thought_chain?: BrainThoughtChain;
  active_goal?: string;
  self_narrative?: BrainSelfNarrative;
  metacognition?: BrainMetacognition;
  knowledge_query?: BrainKnowledgeQuery;
}

export interface BrainResponse {
  content: string;
  confidence: number;
  emotional_tone: number;
  response_time: number;
  intents?: Array<{ type: string; confidence: number }>;
  active_topics?: string[];
  brain_state?: BrainState;
}
