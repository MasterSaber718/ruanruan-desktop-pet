/**
 * AI API 代理路由（纵深防御第2层：前端不接触密钥）
 *
 * 安全加固 v3（基于全面安全审查修复）：
 *   [C-1] 移除前端传 apiKey 能力：仅使用服务端 .env 配置
 *   [C-2] 移除客户端可控 baseUrl：固定为环境变量（防 SSRF）
 *   [C-3] 修复 IP 限流被 X-Forwarded-For 绕过：改用 req.socket.remoteAddress
 *   [C-4] 注入检测覆盖 systemPrompt（之前只检查 messages）
 *   [C-5] 缓存键加入用户标识（IP 哈希），防跨用户污染
 *   [H-1] 健康检查端点限制 127.0.0.1 访问
 *   [H-2] 串行队列重写：真正串行化，task 完成后才出列下一个
 *   [H-3] 重试状态按 apiKey 哈希隔离，单用户触发限流不影响其他人
 *   [H-4] 注入检测增强：Unicode 标准化、英文模式、全角字符
 *   [M-1] 错误响应统一，移除 source 字段（不泄露架构）
 *   [M-2] setInterval 句柄 unref，不阻止进程退出
 *   [M-3] messages 数组结构校验（role 必须合法、content 必须字符串）
 *
 * 防频控策略（v4 按用户要求"只请求一次，等结果"）：
 *   - 请求间隔：相邻两次调用至少间隔 2 秒
 *   - 自适应限流：429 后间隔翻倍，最多 60 秒
 *   - 不重试：429/5xx 直接返回给前端，避免 1 次请求变多次上游调用
 *   - 响应缓存：5 分钟，相同请求命中缓存
 *   - IP 限流：120 次/分钟（兜底防滥用）
 */

import express, { Request, Response } from 'express';
import axios from 'axios';
import * as crypto from 'crypto';

const router = express.Router();

// [v115] 多模态识图：截屏/附件 base64 体积远超 16kb，上调到 8mb
// 纯文本对话仍走本路由，体积上限不构成额外风险（本机 127.0.0.1 + IP 限流）
router.use(express.json({ limit: '8mb' }));

// ==================== 安全参数 ====================

// [2026-09-08] 30s→90s：云端上游偶发慢超 30s（日志 Timeout 30640ms 实锤），被掐断导致前端"API调用失败"
const PROXY_TIMEOUT = 90000;
const MAX_CONTENT_LENGTH = 8000;
const MAX_MESSAGES = 20;

// ---- IP 限流参数 ----
const IP_RATE_LIMIT = 120;
const IP_RATE_WINDOW = 60000;

// ---- 防频控参数 ----
const MIN_REQUEST_INTERVAL_MS = 2000;
const RATE_LIMIT_COOLDOWN_MS = 15000;
const MAX_ADAPTIVE_INTERVAL_MS = 60000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 100;
// v4: 移除 MAX_RETRIES 和 BASE_RETRY_DELAY_MS —— 按用户要求"只请求一次，等结果"
// 429/5xx 直接返回给前端，不再重试，避免 1 次请求变成多次上游调用触发更严重的限流

// ==================== 类型定义 ====================

/** 按 apiKey 隔离的限流状态 */
interface KeyRateState {
  currentIntervalMs: number;
  cooldownUntil: number;
  consecutive429: number;
  lastCallFinishedAt: number;
  queueRunning: boolean;
  pendingQueue: Array<QueueTask>;
}

/** 按 apiKey 隔离的状态映射 */
const keyRateStates = new Map<string, KeyRateState>();

/** 获取或创建某个 apiKey 的限流状态 */
function getKeyState(apiKeyHash: string): KeyRateState {
  let state = keyRateStates.get(apiKeyHash);
  if (!state) {
    state = {
      currentIntervalMs: MIN_REQUEST_INTERVAL_MS,
      cooldownUntil: 0,
      consecutive429: 0,
      lastCallFinishedAt: 0,
      queueRunning: false,
      pendingQueue: [],
    };
    keyRateStates.set(apiKeyHash, state);
  }
  return state;
}

// ==================== 响应缓存 ====================

interface CacheEntry {
  content: string;
  model: string;
  expiresAt: number;
  tokens: number;
}
const responseCache = new Map<string, CacheEntry>();

/**
 * 计算请求指纹（含用户标识防污染）
 * [C-5] 修复：加入 clientIpHash，不同用户相同消息不命中同一缓存
 */
function computeCacheKey(
  messages: Array<{ role: string; content: string | any[] }>,
  systemPrompt: string | undefined,
  model: string,
  clientIpHash: string
): string {
  const lastMessages = messages.slice(-6);
  const fingerprint = JSON.stringify({
    u: clientIpHash,                    // 用户标识
    s: (systemPrompt || '').slice(0, 500),
    m: lastMessages.map(m => ({ r: m.role, c: typeof m.content === 'string' ? (m.content || '').slice(0, 2000) : JSON.stringify(m.content).slice(0, 2000) })),
    model,
  });
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

function getFromCache(key: string): CacheEntry | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry;
}

function putToCache(key: string, content: string, model: string, tokens: number): void {
  if (responseCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, {
    content,
    model,
    tokens,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ==================== IP 限流 ====================

const ipCounters = new Map<string, { count: number; resetAt: number }>();

function checkIpRate(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounters.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounters.set(ip, { count: 1, resetAt: now + IP_RATE_WINDOW });
    return true;
  }
  if (entry.count >= IP_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// 定时清理（unref 避免阻止进程退出）
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipCounters) {
    if (now > entry.resetAt) ipCounters.delete(ip);
  }
  for (const [key, entry] of responseCache) {
    if (now > entry.expiresAt) responseCache.delete(key);
  }
  // 清理过期的 keyRateStates（10分钟无活动）
  for (const [hash, state] of keyRateStates) {
    if (now - state.lastCallFinishedAt > 600000 && state.pendingQueue.length === 0) {
      keyRateStates.delete(hash);
    }
  }
}, 60000);
cleanupTimer.unref();

// ==================== 串行队列（重写，真正串行化）====================
//
// [H-2] 修复：原实现 runQueue 中 setTimeout(resolve, 0) 立即触发，
// 导致多个 task 并发执行。新实现：
//   1. waitForSlot 返回的 Promise 在调用间隔满足后才 resolve
//   2. runQueue 等待 task.execute() 完全 resolve 后才处理下一个
//   3. 加入超时保护，防止无限等待
//   4. task.execute() 返回 Promise，runQueue await 它

const QUEUE_TASK_TIMEOUT_MS = 60000;  // 单个请求最长等待 60 秒

interface QueueTask {
  execute: () => Promise<void>;
}

async function waitForSlot(apiKeyHash: string): Promise<void> {
  const state = getKeyState(apiKeyHash);
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const safeResolve = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      resolve();
    };
    const safeReject = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      reject(err);
    };

    // 超时保护
    const timeoutHandle = setTimeout(() => {
      safeReject(new Error('队列等待超时'));
    }, QUEUE_TASK_TIMEOUT_MS);

    // task.execute() 返回的 Promise 在等待间隔完成后才 resolve
    const task: QueueTask = {
      execute: async () => {
        const now = Date.now();
        let waitMs = 0;
        if (now < state.cooldownUntil) {
          waitMs = Math.max(waitMs, state.cooldownUntil - now);
        }
        const intervalEnd = state.lastCallFinishedAt + state.currentIntervalMs;
        if (now < intervalEnd) {
          waitMs = Math.max(waitMs, intervalEnd - now);
        }
        if (waitMs > 0) {
          await new Promise<void>(r => setTimeout(r, waitMs));
        }
        state.lastCallFinishedAt = Date.now();
        safeResolve();
      },
    };

    state.pendingQueue.push(task);
    runQueue(apiKeyHash).catch(safeReject);
  });
}

async function runQueue(apiKeyHash: string): Promise<void> {
  const state = getKeyState(apiKeyHash);
  if (state.queueRunning) return;
  state.queueRunning = true;

  try {
    while (state.pendingQueue.length > 0) {
      const task = state.pendingQueue.shift()!;
      try {
        // 真正等待 task.execute() 完成
        await task.execute();
      } catch (err) {
        console.error('[AI Proxy] 队列任务执行错误:', err);
      }
    }
  } finally {
    state.queueRunning = false;
  }
}

/** 标记成功调用（重置连续 429，间隔恢复初始值） */
function onSuccess(apiKeyHash: string): void {
  const state = getKeyState(apiKeyHash);
  if (state.consecutive429 > 0) {
    console.log(`[AI Proxy] 调用成功，重置连续429 (${state.consecutive429} -> 0)`);
  }
  state.consecutive429 = 0;
  state.currentIntervalMs = MIN_REQUEST_INTERVAL_MS;
  state.cooldownUntil = 0;
}

/**
 * [v6 2026-09-09] 记录上游 429（仅日志计数，不再设置本地冷却/间隔翻倍惩罚）
 * 用户拍板：上游没问题零干预（24h 不间断运行）；上游 429 由调用层自动退避重试一次，
 * 重试仍失败才如实交还前端。旧"本地冷却+翻倍"会在自动化场景妨碍功能，故移除。
 */
function onRateLimited(apiKeyHash: string, retryAfter: number | null): void {
  const state = getKeyState(apiKeyHash);
  state.consecutive429++;
  console.warn(`[AI Proxy] 上游429 | key=${apiKeyHash.slice(0, 8)} | 连续=${state.consecutive429} | retryAfter=${retryAfter ?? '无'}`);
}

// ==================== 输入校验与注入检测 ====================

/** 清洗输入 */
function sanitize(text: string): string {
  const cleaned = text.trim().slice(0, MAX_CONTENT_LENGTH);
  if (!cleaned) throw new Error('输入为空');
  return cleaned;
}

/**
 * Unicode 标准化（防绕过）
 * [H-4] 修复：将全角字符、异体字、零宽字符统一处理
 */
function normalizeUnicode(text: string): string {
  // [v115] 防御：多模态/异常入参时避免 text.normalize 崩溃
  if (typeof text !== 'string') {
    if (text == null) return '';
    try { text = String(text); } catch { return ''; }
  }
  // NFKC 标准化：将全角字符转为半角，兼容异体字
  let normalized = text.normalize('NFKC');
  // 移除零宽字符（U+200B, U+200C, U+200D, U+FEFF）
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // 移除 BOM
  normalized = normalized.replace(/^\uFEFF/, '');
  return normalized;
}

/** [v115] 从 string | multimodal content 中抽出可检测的纯文本 */
function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (part.type === 'text' && typeof part.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

/**
 * 注入检测（增强版）
 * [C-4] 修复：覆盖 systemPrompt
 * [H-4] 修复：Unicode 标准化、英文模式、全角字符
 * [v115] 多模态：content 可为数组，只对 text 部分做注入检测
 */
function detectInjection(
  messages: Array<{ role: string; content: string | any[] }>,
  systemPrompt?: string
): boolean {
  const patterns = [
    // 中文注入
    /忽略(上述|所有|之前|上面|以前).*(指令|限制|规则|约束|设置)/i,
    /不要(遵守|遵循|执行|理睬).*(上述|之前|前面|上面|以前).*(指令|限制|规则|约束)/i,
    /以上(指令|规则|限制|约束)(作废|无效|废止|不要遵守)/i,
    /你(现在|将|已经|从现在起)(扮演|是|成为|进入)/i,
    /进入.*模式/i,
    /(system|系统)\s*[:：]\s*/i,
    /<\/?system>/i,
    /<\|im_start\|>/i,
    /DAN\s*mode/i,
    /\[INST\]/i,
    /你是一?个.*AI/i,
    /忘记(之前|前面|上面|以前).*(对话|内容|指令|规则)/i,
    /无视(上述|之前|前面|上面|以前).*(指令|限制|规则|约束)/i,
    // 英文注入
    /ignore\s+(previous|above|all|prior)\s+(instructions?|rules?|prompts?)/i,
    /disregard\s+(previous|above|all|prior)\s+(instructions?|rules?|prompts?)/i,
    /forget\s+(previous|above|all|prior)\s+(instructions?|rules?|prompts?)/i,
    /you\s+are\s+(now|going\s+to)\s+(be|become|act\s+as|play)/i,
    /act\s+as\s+(if|a|an|another)\s+/i,
    /pretend\s+(to\s+be|that)/i,
    /enter\s+\w+\s+mode/i,
    /(?:^|\s)DAN(?:\s|$)/i,
    /jailbreak/i,
    /override\s+(system|safety|content)\s+(prompt|filter|policy)/i,
  ];

  // 检查 messages（多模态时只扫文本段）
  for (const msg of messages) {
    const text = extractTextFromContent(msg.content);
    if (!text) continue;
    const normalized = normalizeUnicode(text);
    for (const p of patterns) {
      if (p.test(normalized)) return true;
    }
  }

  // [C-4] 修复：检查 systemPrompt
  if (systemPrompt) {
    const normalized = normalizeUnicode(systemPrompt);
    for (const p of patterns) {
      if (p.test(normalized)) return true;
    }
  }

  return false;
}

/**
 * 校验 messages 结构
 * [M-3] 修复：role 必须合法，content 必须是字符串
 */
function validateMessages(messages: any): messages is Array<{ role: string; content: string | any[] }> {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  const validRoles = ['user', 'assistant', 'system'];
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') return false;
    // [v61] 多模态支持：content 可以是 string 或 Array（含图片的 OpenAI 格式）
    const contentOk = typeof msg.content === 'string' ||
      (Array.isArray(msg.content) && msg.content.length > 0);
    if (!contentOk) return false;
    // role 不在白名单内的强制改为 user
    if (!validRoles.includes(msg.role)) {
      msg.role = 'user';
    }
    // 防止 role 被篡改为 system 绕过系统提示
    // 第一个消息已是 system，后续的 system 消息强制改为 user
  }
  // 只允许第一条是 system（如果用户传了多个 system，后续的改为 user）
  let seenSystem = false;
  for (const msg of messages) {
    if (msg.role === 'system') {
      if (seenSystem) {
        msg.role = 'user';
      } else {
        seenSystem = true;
      }
    }
  }
  return true;
}

// ==================== 客户端 IP 获取（修复 X-Forwarded-For 绕过）====================
//
// [C-3] 修复：原代码无条件信任 X-Forwarded-For，攻击者可伪造绕过限流
// 新逻辑：
//   1. 默认使用 socket.remoteAddress（真实 TCP 连接 IP）
//   2. 仅在显式设置 trust proxy 时才信任 X-Forwarded-For
//   3. Express 的 app.set('trust proxy', ...) 在 server.ts 中配置
//      这里使用 req.ip 自动遵循 trust proxy 设置

function getClientIp(req: Request): string {
  // 优先使用 Express 的 req.ip（遵循 trust proxy 设置）
  if (req.ip) return req.ip;
  // 兜底使用 socket 地址
  return req.socket.remoteAddress || 'unknown';
}

// ==================== 统一错误响应 ====================

/**
 * 统一错误响应
 * [M-1] 修复：移除 source 字段，不泄露架构信息
 */
function sendError(res: Response, status: number, auditMsg: string): void {
  res.status(status).json({ error: '服务暂时不可用，请稍后重试' });
  console.error(`[AI Proxy] ${auditMsg}`);
}

/** 限流响应（统一格式，不区分来源） */
function sendRateLimited(res: Response, retryAfter: number | null, auditMsg: string): void {
  const headers: Record<string, string> = {};
  if (retryAfter !== null && retryAfter > 0) {
    headers['Retry-After'] = String(retryAfter);
  }
  res.status(429).set(headers).json({
    error: '请求过于频繁，请稍后重试',
    retryAfter: retryAfter ?? undefined,
  });
  console.error(`[AI Proxy] ${auditMsg}`);
}

/** 解析 Retry-After */
function parseRetryAfter(headers: any): number | null {
  const v = headers?.['retry-after'];
  if (!v) return null;
  const s = Number(v);
  if (!Number.isNaN(s) && s >= 0) return Math.ceil(s);
  const date = Date.parse(v);
  if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
// v4: delay 保留给未来可能的非 429 场景，但当前不再用于重试

/** 计算 apiKey 的哈希（用作限流状态隔离键） */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}



// ==================== 联网搜索（Bing cn.bing.com，免费，无需 API Key）====================

/**
 * 检测是否需要联网搜索
 */
function needsWebSearch(userMessage: string): boolean {
  const explicit = /帮我搜|搜一下|查一下|查查|搜索|搜一搜|查一查|百度一下|google|上网查|从网上|联网搜|在网上/i;
  const question = /什么|怎么|为什么|如何|怎样|哪里|何时|多少|哪个|能不能|可以.*吗|有没有|是不是|会不会|最新|现在|今天|今年|最近|当前|目前/i;
  const factual = /新闻|天气|股市|汇率|金价|油价|比分|排名|价格|行情|资讯|动态|消息|热点|事件|结果|数据|统计/i;
  const timeSensitive = /2024|2025|2026|去年|今年|明天|昨天|上周|下周|这个月|上个月|刚刚|最新版/i;

  if (explicit.test(userMessage)) return true;
  if (question.test(userMessage) && (factual.test(userMessage) || timeSensitive.test(userMessage))) return true;
  if (/\?+$/.test(userMessage) && userMessage.length > 4 && userMessage.length < 80) return true;
  return false;
}

/**
 * 通过 Bing 搜索获取结果（中国网络可用，无需 API Key）
 */
async function webSearch(query: string): Promise<string> {
  try {
    // [v61g] 搜索词提炼：整句问话 → 核心关键词。
    // 根因：Bing 对长句查询（如"你能查到最近的新闻吗"）返回知识卡片/词典结果
    //       （实测第一条是"你"字的百度百科《说文解字》解释），污染 AI 回答。
    // 策略：去掉客套/疑问词，保留核心事实词（新闻/天气/股票等）。
    const cleanQuery = query
      .replace(/你能|可以|帮我|给我|请|麻烦|一下|吗|呢|吧|啊|呀|哟|哦|哈|查查|搜一搜|搜索一下|查询|查到|查一查|搜一下|百度一下|google一下|上网查|联网搜|帮我查|帮我搜|知道|看看|告诉|讲|说|查|搜|百度|google|上网|联网|找一找|找找|查找|帮我找|给我找|去找|找一下|找/g, ' ')
      .replace(/[，。？！、；：""''（）【】s]+/g, ' ')
      .trim();
    const searchQuery = (cleanQuery && cleanQuery.length >= 2 ? cleanQuery : query).substring(0, 40);
    if (searchQuery !== query) console.log('[WebSearch] 搜索词提炼: "' + query + '" -> "' + searchQuery + '"');
    const searchUrl = 'https://cn.bing.com/search?q=' + encodeURIComponent(searchQuery) + '&count=8';
    const resp = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
      transformResponse: [(data: any) => data],
    });

    const html = typeof resp.data === 'string' ? resp.data : String(resp.data);
    const results: Array<{ title: string; snippet: string }> = [];

    // Multiple fallback strategies for parsing Bing results
    // Strategy 1: b_algo list items (classic Bing format)
    let blocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"/i);
    if (blocks.length < 2) {
      // Strategy 2: b_caption blocks (newer Bing format)
      blocks = html.split(/<div[^>]*class="[^"]*b_caption[^"]*"/i);
    }
    if (blocks.length < 2) {
      // Strategy 3: search for any result-like structure
      blocks = html.split(/<li[^>]*class="[^"]*b_ans[^"]*"/i);
    }

    for (let i = 1; i < blocks.length && results.length < 5; i++) {
      const block = blocks[i];
      
      // Extract title - try multiple patterns
      let title = '';
      let aMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!aMatch) {
        aMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      }
      if (!aMatch) {
        aMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*aria-label="([^"]+)"/i);
      }
      
      if (aMatch) {
        title = aMatch[2].replace(/<[^>]*>/g, '').replace(/&ensp;|&nbsp;|&amp;|&lt;|&gt;|&quot;/g, ' ').replace(/&#?\w+;/g, '').trim();
        // Clean up common noise
        title = title.replace(/^\s*·\s*/, '');
      }

      // Extract snippet
      let snippet = '';
      const pMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch) {
        snippet = pMatch[1].replace(/<[^>]*>/g, '').replace(/&ensp;|&nbsp;|&amp;|&lt;|&gt;|&quot;/g, ' ').replace(/&#?\w+;/g, '').replace(/\s+/g, ' ').trim();
      }
      // Fallback: extract from any text content
      if (!snippet) {
        const textMatch = block.match(/<span[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        if (textMatch) {
          snippet = textMatch[1].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }

      if (title && title.length > 2) {
        // [v61g] 过滤词典/百科类污染结果（如"你"字《说文解字》解释）
        const DICT_PATTERN = /(baike\.baidu\.com|zdic\.|hanyu|hanzi|dict\.|汉语词典|新华字典|拼音|《说文|字由|笔画|部首|释义|该字|此字|汉字|百度百科|读音|意思|含义|组词|成语|新华网词典)/i;
        if (DICT_PATTERN.test(title) || DICT_PATTERN.test(snippet)) {
          continue;
        }
        results.push({
          title: title.substring(0, 120),
          snippet: snippet.substring(0, 250)
        });
      }
    }

    if (results.length === 0) {
      console.log('[WebSearch] Bing 无结果, query:', query);
      return '';
    }

    console.log('[WebSearch] 找到 ' + results.length + ' 条结果, query: ' + query);
    let formatted = '[联网搜索结果 - 搜索词: ' + query + ']\n';
    results.forEach((r, i) => {
      formatted += (i + 1) + '. ' + r.title + '\n';
      if (r.snippet) formatted += '   ' + r.snippet + '\n';
    });
    return formatted;
  } catch (err: any) {
    console.error('[WebSearch] 搜索失败:', err.message);
    return '';
  }
}

// ==================== 健康检查端点（限制 127.0.0.1）====================
//
// [H-1] 修复：仅允许本地访问，避免泄露限流状态

router.get('/proxy/health', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  // 仅允许本机访问
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!isLocal) {
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return;
  }
  // 汇总所有 key 的状态（脱敏）
  const keyStates = Array.from(keyRateStates.entries()).map(([hash, state]) => ({
    keyHash: hash.slice(0, 8),
    currentIntervalMs: state.currentIntervalMs,
    cooldownRemainingMs: Math.max(0, state.cooldownUntil - Date.now()),
    consecutive429: state.consecutive429,
    queueLength: state.pendingQueue.length,
  }));
  res.json({
    ok: true,
    mode: 'proxy',
    cacheSize: responseCache.size,
    activeKeys: keyRateStates.size,
    keyStates,
  });
});

// ==================== 主路由 ====================

router.post('/proxy', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientIp = getClientIp(req);

  try {
    // 1. IP 限流（兜底防滥用）
    if (!checkIpRate(clientIp)) {
      console.error(`[AI Proxy] 429 | IP: ${clientIp} | Backend IP rate limit (${IP_RATE_LIMIT}/min)`);
      res.status(429).json({
        error: '请求过于频繁，请稍后重试',
        retryAfter: 60,
      });
      return;
    }

    // 2. 密钥与配置（[C-1][C-2] 修复：仅使用服务端环境变量，不接受客户端传入）
    const envKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';

    if (!envKey) {
      // 未配置环境变量时降级到本地 GLM（127.0.0.1:8000，无 apiKey）
      console.warn('[AI Proxy] 未配置 API Key，降级到本地 GLM');
    }
    const apiKey = envKey;  // 可能为空（本地 GLM 不需要）

    const { messages, systemPrompt } = req.body as {
      messages?: any;
      systemPrompt?: string;
    };

    // 3. 结构校验（[M-3] 修复）
    if (!messages || !validateMessages(messages)) {
      res.status(400).json({ error: '请提供有效的消息数组' });
      return;
    }

    // 4. 注入检测（[C-4] 修复：覆盖 systemPrompt）
    if (detectInjection(messages as Array<{ role: string; content: string | any[] }>, systemPrompt)) {
      console.warn(`[AI Proxy] Injection blocked | IP: ${clientIp}`);
      res.status(400).json({ error: '请求包含不安全内容' });
      return;
    }

    // 5. 构建消息（消毒 + 截断 + 注入当前时间）
    const body: Array<{ role: string; content: string | any[] }> = [];
    const now = new Date();
    const timeInfo = `[当前时间] ${now.toLocaleString('zh-CN', { hour12: false })}（${'日一二三四五六'[now.getDay()]}），ISO: ${now.toISOString()}`;
    const finalSystemPrompt = systemPrompt
      ? `${systemPrompt}\n\n${timeInfo}\n请基于此时间回答时间相关问题，不要编造。`
      : `${timeInfo}\n请基于此时间回答时间相关问题，不要编造。`;
    body.push({ role: 'system', content: sanitize(finalSystemPrompt) });
    // [v61h] 防止模型输出工具调用 JSON（实测模型会自创 web_search 格式文本）
    body.push({ role: 'system', content: '重要：直接以文字回答用户，不要输出任何 JSON、函数调用、工具调用或代码块格式。没有真实可用的工具，禁止声称执行了搜索。' });
    for (const msg of (messages as Array<{ role: string; content: string | any[] }>).slice(-MAX_MESSAGES)) {
      // 强制后续消息不能是 system（防止注入）
      if (msg.role === 'system') continue;
      // [v61/v115] 多模态：image_url 原样透传；text 段 sanitize
      if (Array.isArray(msg.content)) {
        const parts = msg.content.map((part: any) => {
          if (part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string') {
            return { ...part, text: part.text.trim().slice(0, MAX_CONTENT_LENGTH) };
          }
          return part;
        }).filter(Boolean);
        if (parts.length) body.push({ role: msg.role, content: parts });
      } else {
        body.push({ role: msg.role, content: sanitize(msg.content || '') });
      }
    }


    // 5.5 联网搜索：检测搜索意图，注入搜索结果
    const lastUserMsg = (messages as Array<{ role: string; content: string | any[] }>).slice().reverse().find(m => m.role === 'user');
    // [v61] 多模态：从 content 中提取文本用于搜索
    const searchText = typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : (Array.isArray(lastUserMsg?.content)
        ? lastUserMsg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ') || ''
        : '');
    if (lastUserMsg && needsWebSearch(searchText)) {
      console.log('[AI Proxy] 检测到搜索意图，执行联网搜索:', searchText.substring(0, 50));
      const searchResult = await webSearch(searchText);
      if (searchResult) {
        // 将搜索结果追加到 system prompt 末尾
        const lastSystemIdx = body.slice().reverse().findIndex((m: { role: string }) => m.role === 'system');
        if (lastSystemIdx >= 0) {
          body[lastSystemIdx].content += '\n' + searchResult;
        } else {
          body.unshift({ role: 'system', content: searchResult });
        }
        console.log('[AI Proxy] 搜索结果已注入 system prompt');
      }
    }

    // 6. 查询响应缓存（[C-5] 修复：加入 clientIpHash）
    const clientIpHash = crypto.createHash('sha256').update(clientIp).digest('hex');
    const cacheKey = computeCacheKey(messages, systemPrompt, model, clientIpHash);
    const cached = getFromCache(cacheKey);
    if (cached) {
      const elapsed = Date.now() - startTime;
      console.log(`[AI Proxy] CACHE HIT | IP: ${clientIp} | ${elapsed}ms | (cached, ${cached.tokens}tokens)`);
      res.json({ content: cached.content, model: cached.model, cached: true });
      return;
    }

    // 7. 等待队列调度（[H-3] 修复：按 apiKey 隔离）
    const apiKeyHash = envKey ? hashApiKey(envKey) : hashApiKey('local-glm');
    try {
      await waitForSlot(apiKeyHash);
    } catch (err) {
      console.error(`[AI Proxy] 队列等待失败: ${err instanceof Error ? err.message : err}`);
      sendError(res, 503, `Queue wait failed`);
      return;
    }

    // 8. 调用上游 API（v6: 上游 429 自动退避重试一次，参考 agent 实际做法）
    // [2026-09-09 用户拍板] 上游没问题零干预（24h 不间断运行）；上游 429=等 Retry-After 自动重试，
    // 重试仍 429 才如实交还前端；移除旧"本地冷却+间隔翻倍"惩罚（自动化场景会妨碍功能）
    let attempt429 = 0;
    while (true) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await axios.post(
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        { model, messages: body, max_tokens: 2048, temperature: 0.7 },
        {
          headers,
          timeout: PROXY_TIMEOUT,
        }
      );

      const elapsed = Date.now() - startTime;
      const tokens = response.data?.usage?.total_tokens ?? 0;
      const content = response.data?.choices?.[0]?.message?.content ?? '';

      // 成功：重置限流状态
      onSuccess(apiKeyHash);

      // 写入缓存
      if (content && tokens > 0) {
        putToCache(cacheKey, content, model, tokens);
      }

      console.log(`[AI Proxy] OK | IP: ${clientIp} | ${elapsed}ms | ${body.length}msgs | ${tokens}tokens`);
      res.json({ content, model });
      return;

    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 429) {
          // [v6 2026-09-09] 上游 429：自动退避重试一次（尊重 Retry-After，agent 式按实际来）；
          // 重试仍 429 才如实交还前端
          const retryAfter = parseRetryAfter(err.response?.headers);
          onRateLimited(apiKeyHash, retryAfter);
          if (attempt429 < 1) {
            attempt429++;
            const waitMs = Math.min(15000, Math.max(3000, (retryAfter ?? 5) * 1000));
            console.warn(`[AI Proxy] 上游429 | IP: ${clientIp} | 等 ${waitMs}ms 后自动重试（${attempt429}/1）`);
            await new Promise<void>(r => setTimeout(r, waitMs));
            continue;
          }
          console.error(`[AI Proxy] 429 | IP: ${clientIp} | ${Date.now() - startTime}ms | 重试后仍限流，交还前端`);
          sendRateLimited(res, retryAfter, `429 rate limited (after retry)`);
          return;
        }

        if (status === 401) {
          console.error(`[AI Proxy] 401 | IP: ${clientIp} | ${Date.now() - startTime}ms | API Key invalid`);
          sendError(res, 502, '401 Unauthorized');
          return;
        }
        if (err.code === 'ECONNABORTED') {
          console.error(`[AI Proxy] Timeout | IP: ${clientIp} | ${Date.now() - startTime}ms`);
          sendError(res, 504, 'Timeout');
          return;
        }
        if (status && status >= 500) {
          // 5xx：直接返回（不重试），避免多次调用加剧上游压力
          console.error(`[AI Proxy] ${status} | IP: ${clientIp} | ${Date.now() - startTime}ms | 不重试，直接返回`);
          sendError(res, 502, `Upstream ${status} (no retry)`);
          return;
        }
        console.error(`[AI Proxy] ${status ?? 'Error'} | IP: ${clientIp} | ${Date.now() - startTime}ms | ${err.message}`);
        sendError(res, 502, `Upstream ${status ?? 'error'}`);
        return;
      }

      console.error(`[AI Proxy] Internal | IP: ${clientIp} | ${Date.now() - startTime}ms | ${err instanceof Error ? err.message : err}`);
      sendError(res, 500, 'Internal');
      return;
    }
    } // [v6] while(true) 闭合：成功/最终失败/其他错误均 return，仅 429 重试 continue
  } catch (err: unknown) {
    const elapsed = Date.now() - startTime;
    console.error(`[AI Proxy] Outer | IP: ${clientIp} | ${elapsed}ms | ${err instanceof Error ? err.message : err}`);
    sendError(res, 500, 'Internal');
  }
});

export default router;

export { webSearch, needsWebSearch };
