/**
 * companion.ts — 陪伴调度（v1 · 2026-09-20 用户定稿；v1.1 · 2026-10-01 接线+防打扰）
 *
 * 职责：
 *   1. 闲置判定：只看「对话」——距 max(用户最后说话, AI 最后回复) ≥ 3 分钟 = 闲置
 *   2. 闲置小动作：本地动作袋优先（不重复轮回）；袋空时尝试 AI 生成新动作（1-3步），
 *      生成失败自动回退本地袋。动作经 hub(9877) 参数校验后入 27865 队列 → 主进程选主画面广播
 *   3. 小时计时器：软件启动起算每 60 分钟 → 伸懒腰 + 台词（对话中顺延，计时不清零）
 *   4. 生成动作存储：data/companion/generated/，配额 2GB / 300 个；满了优先清理只用过 1-2 次的
 *   5. 跳舞 = 纯点播：模型选配方；本模块维护「不重复轮换」提示（/dance-hint）与历史（/dance-did）
 *   [v1.1 接线] electron-main 每 30s POST /idle-tick {kind:'idle', inCall, systemIdleSec}；
 *   小时节拍在同一次心跳里顺带判定（集中管理，主进程不养第二个计时器）。
 *   [v1.1 防打扰] hourly 台词：通话中 → 顺延（节拍不推进，通话结束自动补）；
 *   夜间（默认 23-8 点，PET_COMPANION_QUIET_START/END 可调）→ 照常伸懒腰但不播台词（ttsSuppressed）。
 *   闲置小动作不说话、不进聊天框（v1 定稿保留），故不因 DSH 使用/系统闲置而抑制。
 * 不做：7x24 监控/截屏看用户（省 token，预留）；主动说话入聊天框（v1 只做动作+TTS台词）
 */
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import http from 'http';
import aiHubRouter, { runBrain, getActivity } from './aiHub';

const router = Router();

// ---------------- 配置 ----------------
const HUB_PORT = Number(process.env.PET_MOTION_HUB_PORT || 9877);
const STORE_DIR = process.env.PET_COMPANION_STORE_DIR || path.join(__dirname, '..', '..', 'data', 'companion', 'generated');
const QUOTA_BYTES = Number(process.env.PET_COMPANION_QUOTA_BYTES) || 2 * 1024 * 1024 * 1024; // 用户定：最多 2GB
const QUOTA_COUNT = Number(process.env.PET_COMPANION_QUOTA_COUNT) || 300;
const CONVERSATION_IDLE_MS = Number(process.env.PET_COMPANION_IDLE_MS) || 3 * 60 * 1000; // 1+2 = 3 分钟观察窗
const IDLE_MIN_GAP_MS = Number(process.env.PET_COMPANION_GAP_MS) || 3 * 60 * 1000;
const HOUR_MS = Number(process.env.PET_COMPANION_HOUR_MS) || 60 * 60 * 1000;
const STEP_STAGGER_MS = Number(process.env.PET_COMPANION_STAGGER_MS) || 3500;
const QUIET_START_HOUR = Number(process.env.PET_COMPANION_QUIET_START || 23); // 夜间静音起（台词不播，动作照常）
const QUIET_END_HOUR = Number(process.env.PET_COMPANION_QUIET_END || 8);      // 夜间静音止
const PROCESS_START_AT = Date.now();

// ---------------- 本地待机动作袋（shuffle-bag 不重复轮回） ----------------
interface IdleStep { action: string; params: Record<string, unknown>; }
const IDLE_PRESETS: IdleStep[] = [
  { action: 'stretch', params: {} },
  { action: 'turnHead', params: { dir: 'left' } },
  { action: 'turnHead', params: { dir: 'right' } },
  { action: 'lookUp', params: {} },
  { action: 'lookDown', params: {} },
  { action: 'tiltHead', params: { side: 'left' } },
  { action: 'tiltHead', params: { side: 'right' } },
  { action: 'turnBody', params: {} },
  { action: 'clap', params: { count: 2 } },
  { action: 'bow', params: { depth: 0.4 } },
  { action: 'limbRaise', params: { side: 'both', height: 0.6 } },
];
let idleBag: IdleStep[] = [];
function refillIdleBag(): void {
  idleBag = IDLE_PRESETS.map((s, i) => ({ s, k: Math.random() + i * 1e-9 }))
    .sort((a, b) => a.k - b.k).map((x) => x.s);
}
refillIdleBag();

// ---------------- 跳舞轮换（点播制） ----------------
const DANCE_RECIPES: Array<[string, string]> = [
  ['greet', '打招呼'], ['shyGreet', '害羞问好'], ['celebrate', '庆祝'], ['comfort', '安慰'],
  ['deny', '拒绝'], ['think', '思考'], ['sleepy', '困了'], ['excited', '兴奋'],
  ['invite', '邀约'], ['shyCome', '害羞招手'], ['cheerSpin', '庆祝转圈'],
];
const danceHistory: Array<{ id: string; at: number }> = [];
function danceHintText(): string {
  const recent = danceHistory.slice(0, 4).map((r) => r.id);
  const lines = [
    '舞蹈配方（仅当用户明确要求跳舞/来一个/助助兴时使用，格式 {"hub":{"recipe":"配方id"}}）：',
    DANCE_RECIPES.map(([id, label]) => `${id}=${label}`).join('，'),
    '若用户指名（如"刚刚那个""来一遍刚才的"），就跳用户指名的那个。',
  ];
  if (recent.length) lines.push(`轮换提示：最近已跳过 ${recent.join('、')}，优先选其它配方（跳完一轮再从头轮）。`);
  return lines.join('\n');
}

// ---------------- 状态 ----------------
let lastIdleFiredAt = 0;
let lastFiredHourIndex = 0;
let generating = false;
let lastTickAt = 0;
let lastTickContext: { inCall: boolean; systemIdleSec: number } = { inCall: false, systemIdleSec: -1 };

function isQuietHours(now: number): boolean {
  const h = new Date(now).getHours();
  if (QUIET_START_HOUR === QUIET_END_HOUR) return false;
  if (QUIET_START_HOUR > QUIET_END_HOUR) return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
  return h >= QUIET_START_HOUR && h < QUIET_END_HOUR;
}

// ---------------- hub 调用 ----------------
function hubPost(apiPath: string, body: unknown, timeoutMs = 8000): Promise<{ status: number; json: any }> {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(body);
      const req = http.request({
        host: '127.0.0.1', port: HUB_PORT, path: apiPath, method: 'POST', timeout: timeoutMs,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, (res) => {
        let data = '';
        res.on('data', (c: Buffer) => { data += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode || 0, json: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode || 0, json: null }); }
        });
      });
      req.on('error', () => resolve({ status: 0, json: null }));
      req.on('timeout', () => { try { req.destroy(); } catch { /* noop */ } resolve({ status: 0, json: null }); });
      req.write(payload);
      req.end();
    } catch { resolve({ status: 0, json: null }); }
  });
}

async function hubPrimitives(): Promise<Record<string, any> | null> {
  return new Promise((resolve) => {
    try {
      const req = http.get({ host: '127.0.0.1', port: HUB_PORT, path: '/api/motion/primitives', timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (c: Buffer) => { data += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            resolve(j && j.primitives ? j.primitives : null);
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { try { req.destroy(); } catch { /* noop */ } resolve(null); });
    } catch { resolve(null); }
  });
}

function dispatchStep(step: IdleStep, genId?: string): void {
  void hubPost('/api/motion/request', {
    mode: 'param', action: step.action, params: step.params || {}, source: genId ? 'companion-gen' : 'companion-idle',
  }).then((r) => {
    if (!r.status || r.status >= 300) console.warn(`[companion] 动作下发异常 hub=${r.status} action=${step.action}`);
  });
}
function dispatchSteps(steps: IdleStep[], genId?: string): void {
  steps.forEach((step, i) => {
    setTimeout(() => dispatchStep(step, genId), i * STEP_STAGGER_MS);
  });
}

// ---------------- 生成动作：本地库优先，袋空才问 AI ----------------
let primitivesCache: Record<string, any> | null = null;
let primitivesCacheAt = 0;
async function getPrimitivesCached(): Promise<Record<string, any> | null> {
  if (primitivesCache && Date.now() - primitivesCacheAt < 10 * 60 * 1000) return primitivesCache;
  const p = await hubPrimitives();
  if (p) { primitivesCache = p; primitivesCacheAt = Date.now(); }
  return primitivesCache;
}

async function generateIdleAction(): Promise<{ label: string; steps: IdleStep[] } | null> {
  if (generating) return null;
  generating = true;
  try {
    const primitives = await getPrimitivesCached();
    if (!primitives) return null;
    const catalog = Object.entries(primitives).slice(0, 40).map(([id, spec]: [string, any]) => {
      return `${id}: ${spec?.label || ''} 参数=${JSON.stringify(spec?.params || {})}`;
    }).join('\n');
    const task = [
      '你是动作编舞助手。请从下面的动作原语中选 1-3 步，编一个「待机小动作」：',
      '要求：原地、小幅、不位移、单次总量不超过6秒、参数保守（幅度≤0.7）。',
      '只输出一行 JSON，不要解释：{"label":"简短中文名","steps":[{"action":"原语id","params":{}}]}',
      '动作原语库：',
      catalog,
    ].join('\n');
    const { text } = await runBrain(task);
    const m = String(text || '').match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    const rawSteps = Array.isArray(parsed.steps) ? parsed.steps.slice(0, 3) : null;
    if (!rawSteps || !rawSteps.length) return null;
    const primitiveIds = new Set(Object.keys(primitives));
    const clean: IdleStep[] = [];
    for (const st of rawSteps) {
      if (!st || typeof st.action !== 'string' || !primitiveIds.has(st.action)) return null; // 白名单外一律拒绝
      const params: Record<string, unknown> = {};
      if (st.params && typeof st.params === 'object') {
        for (const [k, v] of Object.entries(st.params)) {
          if (typeof v === 'number' && isFinite(v)) params[k] = v;
          else if (typeof v === 'string' && v.length <= 12) params[k] = v;
        }
      }
      clean.push({ action: st.action, params });
    }
    return { label: String(parsed.label || 'AI待机动作').slice(0, 20), steps: clean };
  } catch {
    return null;
  } finally {
    generating = false;
  }
}

// ---------------- 生成动作存储（2GB 配额 + 低频优先清理） ----------------
function ensureStore(): void {
  try { fs.mkdirSync(STORE_DIR, { recursive: true }); } catch { /* noop */ }
}
function storeStats(): { count: number; bytes: number } {
  ensureStore();
  let count = 0; let bytes = 0;
  try {
    for (const f of fs.readdirSync(STORE_DIR)) {
      if (!f.endsWith('.json')) continue;
      count++;
      try { bytes += fs.statSync(path.join(STORE_DIR, f)).size; } catch { /* noop */ }
    }
  } catch { /* noop */ }
  return { count, bytes };
}
function evictIfNeeded(excludeId?: string): { evicted: number } {
  ensureStore();
  let { count, bytes } = storeStats();
  if (count <= QUOTA_COUNT && bytes <= QUOTA_BYTES) return { evicted: 0 };
  let evicted = 0;
  try {
    const files = fs.readdirSync(STORE_DIR).filter((f) => f.endsWith('.json'));
    const metas: Array<{ file: string; useCount: number; lastUsedAt: number }> = [];
    for (const f of files) {
      if (excludeId && f === `${excludeId}.json`) continue; // [2026-10-02 终审] 本次刚写入的不进驱逐序
      try {
        const j = JSON.parse(fs.readFileSync(path.join(STORE_DIR, f), 'utf8'));
        metas.push({ file: f, useCount: j.useCount | 0, lastUsedAt: j.lastUsedAt || 0 });
      } catch {
        metas.push({ file: f, useCount: 0, lastUsedAt: 0 }); // 坏文件视作最该清
      }
    }
    metas.sort((a, b) => {
      const la = a.useCount <= 2 ? 0 : 1;
      const lb = b.useCount <= 2 ? 0 : 1;
      if (la !== lb) return la - lb;
      if (a.useCount !== b.useCount) return a.useCount - b.useCount;
      return a.lastUsedAt - b.lastUsedAt;
    });
    for (const m of metas) {
      if (count <= QUOTA_COUNT && bytes <= QUOTA_BYTES) break;
      try {
        bytes -= fs.statSync(path.join(STORE_DIR, m.file)).size;
        fs.unlinkSync(path.join(STORE_DIR, m.file));
        count--; evicted++;
      } catch { /* noop */ }
    }
  } catch { /* noop */ }
  return { evicted };
}
function saveGenerated(gen: { label: string; steps: IdleStep[] }): { id: string; evicted: number } {
  ensureStore();
  const id = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const record = { id, label: gen.label, steps: gen.steps, useCount: 0, createdAt: Date.now(), lastUsedAt: 0 };
  try {
    fs.writeFileSync(path.join(STORE_DIR, `${id}.json`), JSON.stringify(record), 'utf8');
    const r = evictIfNeeded(id);
    return { id, evicted: r.evicted };
  } catch {
    return { id: '', evicted: 0 };
  }
}
function listGenerated(): any[] {
  ensureStore();
  const out: any[] = [];
  try {
    for (const f of fs.readdirSync(STORE_DIR)) {
      if (!f.endsWith('.json')) continue;
      try { out.push(JSON.parse(fs.readFileSync(path.join(STORE_DIR, f), 'utf8'))); } catch { /* noop */ }
    }
  } catch { /* noop */ }
  return out;
}
function markUsed(id: string): void {
  try {
    const file = path.join(STORE_DIR, `${id}.json`);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    j.useCount = (j.useCount | 0) + 1;
    j.lastUsedAt = Date.now();
    fs.writeFileSync(file, JSON.stringify(j), 'utf8');
  } catch { /* noop */ }
}

// ---------------- 闲置判定 ----------------
function conversationIdleFor(): number {
  const a = getActivity();
  const last = Math.max(a.lastUserAskAt || 0, a.lastAiReplyAt || 0);
  return last ? Date.now() - last : Infinity; // 从未对话 = 天然闲置
}

// ---------------- 路由 ----------------
/** POST /idle-tick {kind:'idle'|'hourly', inCall?, systemIdleSec?}
 *  electron-main 每 30s 调一次（kind 固定 'idle'）；本模块是唯一节奏管理者：
 *  同一次心跳里先判定「小时节拍」（到点且不在通话 → 伸懒腰+台词，夜间静音），再判定「闲置小动作」。 */
router.post('/idle-tick', async (req: Request, res: Response) => {
  const body = (req.body || {}) as { kind?: string; inCall?: boolean; systemIdleSec?: number };
  const kind = body.kind === 'hourly' ? 'hourly' : 'idle';
  const now = Date.now();
  const idleMs = conversationIdleFor();
  lastTickAt = now;
  lastTickContext = { inCall: !!body.inCall, systemIdleSec: Number(body.systemIdleSec ?? -1) };

  // ── 小时节拍（kind='idle' 的常规心跳也会顺带判定；kind='hourly' 仅供显式触发/测试）──
  const hourIndex = Math.floor((now - PROCESS_START_AT) / HOUR_MS);
  const hourlyDue = hourIndex >= 1 && hourIndex > lastFiredHourIndex;
  if (hourlyDue && idleMs >= CONVERSATION_IDLE_MS) {
    if (lastTickContext.inCall) {
      // 通话中不打扰：节拍不推进，通话结束后首个心跳自动补
      return res.json({ fired: false, reason: 'in-call-deferred', kind: 'hourly', hourIndex, idleMs });
    }
    lastFiredHourIndex = hourIndex;
    const steps: IdleStep[] = [{ action: 'stretch', params: {} }];
    dispatchSteps(steps, '');
    if (isQuietHours(now)) {
      return res.json({ fired: true, kind: 'hourly', ttsSuppressed: true, line: null, steps });
    }
    const line = '坐了好久呀……你也起来活动一下吧。';
    return res.json({ fired: true, kind: 'hourly', steps, line });
  }
  if (kind === 'hourly') {
    return res.json({ fired: false, reason: hourlyDue ? 'deferred-conversation' : 'not-due', hourIndex, idleMs });
  }

  // ── 闲置小动作（kind='idle' 且小时节拍未触发时走到这里）──
  if (idleMs < CONVERSATION_IDLE_MS) return res.json({ fired: false, reason: 'conversation-active', idleMs });
  if (now - lastIdleFiredAt < IDLE_MIN_GAP_MS) return res.json({ fired: false, reason: 'cooldown', idleMs });
  lastIdleFiredAt = now;
  if (idleBag.length === 0) {
    const gen = await generateIdleAction();
    if (gen) {
      const saved = saveGenerated(gen);
      dispatchSteps(gen.steps, saved.id);
      if (saved.id) markUsed(saved.id);
      return res.json({ fired: true, source: 'generated', label: gen.label, steps: gen.steps, evicted: saved.evicted });
    }
    console.warn('[companion] AI 生成动作失败，回退预设袋');
    refillIdleBag();
  }
  const step = idleBag.pop();
  if (!step) { refillIdleBag(); }
  const step2 = step || idleBag.pop();
  if (!step2) return res.json({ fired: false, reason: 'no-step' });
  dispatchSteps([step2], '');
  return res.json({ fired: true, source: 'preset', label: step2.action, steps: [step2] });
});

/** GET /dance-hint —— 提示词注入（轮换提示） */
router.get('/dance-hint', (_req: Request, res: Response) => {
  res.json({ success: true, text: danceHintText() });
});

/** POST /dance-did {recipeId} —— 记录已跳 */
router.post('/dance-did', (req: Request, res: Response) => {
  const { recipeId } = req.body || {};
  if (!recipeId || typeof recipeId !== 'string') return res.status(400).json({ success: false, error: '缺少 recipeId' });
  const idx = danceHistory.findIndex((r) => r.id === recipeId);
  if (idx >= 0) danceHistory.splice(idx, 1);
  danceHistory.unshift({ id: recipeId, at: Date.now() });
  if (danceHistory.length > 20) danceHistory.length = 20;
  res.json({ success: true, history: danceHistory.map((r) => r.id) });
});

/** GET /state —— 排障用 */
router.get('/state', (_req: Request, res: Response) => {
  const st = storeStats();
  res.json({
    success: true,
    activity: getActivity(),
    conversationIdleForMs: conversationIdleFor(),
    lastTickAt,
    lastTickContext,
    lastIdleFiredAt,
    lastFiredHourIndex,
    quietHours: { start: QUIET_START_HOUR, end: QUIET_END_HOUR, active: isQuietHours(Date.now()) },
    idleBagLeft: idleBag.length,
    generated: { count: st.count, bytes: st.bytes, quotaBytes: QUOTA_BYTES, quotaCount: QUOTA_COUNT },
    danceHistory: danceHistory.map((r) => r.id),
  });
});

/** GET /generated —— 生成动作清单 */
router.get('/generated', (_req: Request, res: Response) => {
  res.json({ success: true, actions: listGenerated() });
});

/** POST /generate —— 手动触发一次生成（排障/演示用） */
router.post('/generate', async (_req: Request, res: Response) => {
  const gen = await generateIdleAction();
  if (!gen) return res.status(502).json({ success: false, error: '生成失败（大脑不可用或输出不合法）' });
  const saved = saveGenerated(gen);
  res.json({ success: true, action: gen, id: saved.id, evicted: saved.evicted });
});

export default router;
