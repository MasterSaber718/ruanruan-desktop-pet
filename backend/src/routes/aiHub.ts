// ============================================================================
// aiHub.ts — AI 对话总站（v2 · 一切走 API 调用）
// ----------------------------------------------------------------------------
// [2026-09-20 v2] 用户决策：语音/聊天等**一切服务直接走 API 调用**，
//   不再 spawn `dsh --profile headless` 子进程（慢，且本地千问 2048ctx 必超限）。
//   模型目标解析（顶层统一 = DSH 的 providers.json）：
//     ① PET_BRAIN_* 环境变量（显式覆盖，排障用）
//     ② dsh-workspace/providers.json 的 active provider（apiKey 为占位符则跳过）
//     ③ resources/.env（后端进程已注入 DEEPSEEK_* 三件套，key+base+model 配套不混搭）
//     ④ 本地 OpenAI 兼容 :11434（兜底）
//        [2026-09-20 v175.4] 本地千问已外置到桌面（软件不再自动启动它）；
//        用户自己双击桌面的 start-qwen-server.bat 起了服务，这条兜底才生效。
//        本地端点不需要 API Key（apiKey 传空即是），云端/本地同一套 OpenAI 兼容链路。
//   旧链路保留：PET_BRAIN_MODE=dsh 时仍走 dsh CLI。
// 小脑=joint-control/motion-hub：总站在正文抽 [MOTION] 下发动作。
// ============================================================================
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { enqueuePetAction } from './jointControl';

const router = express.Router();

const APP_ROOT = process.env.DSH_APP_ROOT || path.join(__dirname, '..', '..');
const PROVIDERS_FILE = process.env.PET_PROVIDERS_FILE
  || path.join(APP_ROOT, 'dsh-workspace', 'providers.json');
const ENV_FILE = process.env.APP_ENV_FILE || path.join(__dirname, '..', '..', '..', '.env');

const BRAIN_TIMEOUT_MS = Number(process.env.PET_BRAIN_TIMEOUT_MS || 60000);
const BRAIN_MAX_TOKENS = Number(process.env.PET_BRAIN_MAX_TOKENS || 1536);

/** 本地兜底目标（运行期现读 env，改了不用重启，便于排障）
 *  [2026-10-03] 本地模型内置化：Ollama + qwen3:0.6b（用户定案）。
 *  推荐参数落地：thinking 关（/no_think + think:false）、temperature 0.7（适中）、
 *  num_ctx 2048（context 不过大）、stream（内部聚合，接口不变）、GPU 由 Ollama 自动调度。 */
function localTarget(): BrainTarget {
  return {
    baseUrl: process.env.PET_LOCAL_BASE_URL || 'http://127.0.0.1:11434/v1',
    model: process.env.PET_LOCAL_MODEL || 'qwen3:0.6b',
    apiKey: '',
    source: 'local-default',
  };
}

/** [2026-10-03] Ollama 本地兜底专用通道（qwen3:0.6b）：
 *  走原生 /api/chat（stream NDJSON 内部聚合成完整文本，调用方接口不变）；
 *  think:false 关思维链；options 受控（temperature/num_ctx）。GPU 由 Ollama 自动调度。 */
async function callOllamaChat(target: BrainTarget, task: string, signal?: AbortSignal, systemOverride?: string): Promise<string> {
  const base = String(target.baseUrl).replace(/\/v1\/?$/, '').replace(/\/+$/, '');
  const url = base + '/api/chat';
  const ac = new AbortController();
  const onAbort = () => { try { ac.abort(); } catch { /* noop */ } };
  if (signal) {
    if (signal.aborted) ac.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { ac.abort(); } catch { /* noop */ } }, BRAIN_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: target.model,
        messages: [
          { role: 'system', content: (systemOverride || MOTION_PROTOCOL) + '\n/no_think' },
          { role: 'user', content: task },
        ],
        stream: true,
        think: false,
        options: { temperature: 0.7, num_ctx: 2048, num_predict: BRAIN_MAX_TOKENS },
      }),
      signal: ac.signal,
    });
    if (!resp.ok || !resp.body) {
      const body = await resp.text().catch(() => '');
      const err: any = new Error(`${target.source} HTTP ${resp.status}${body ? ' | ' + body.slice(0, 200) : ''}`);
      err.status = resp.status;
      throw err;
    }
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let out = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const j = JSON.parse(line);
          if (j && j.message && typeof j.message.content === 'string') out += j.message.content;
        } catch { /* 半行/噪声跳过 */ }
      }
    }
    const text = out.trim();
    if (!text) throw new Error(`${target.source} 返回空正文（model=${target.model}）`);
    return text;
  } catch (e: any) {
    if (timedOut) throw new Error(`大脑 API 超时 ${BRAIN_TIMEOUT_MS}ms（${target.source} / ${target.model}）`);
    throw e;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

// 旧链路（仅在 PET_BRAIN_MODE=dsh 时使用）
const NODE_BIN = process.env.MIMO_NODE_PATH || 'C:\\Program Files\\nodejs\\node.exe';
const DSH_HOME = process.env.DSH_HOME || 'C:\\Users\\Administrator\\Desktop\\dsh-home';
const DSH_CLI = process.env.DSH_CLI
  || 'C:\\Users\\Administrator\\Desktop\\dsh-home\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js';
const DSH_PROFILE = process.env.DSH_PROFILE || 'headless';
const DSH_TIMEOUT_MS = Number(process.env.DSH_TIMEOUT_MS || 120000);

interface BrainTarget {
  baseUrl: string;
  model: string;
  apiKey: string;
  source: string;
}

// 占位符 key 一律当"没配"：这些值是历史遗留的假 key（"0" / DUMMY_KEY / 本地占位）
const PLACEHOLDER_KEYS = new Set([
  '', '0', 'dummy', 'dummy_key', 'dummy-key', 'null', 'undefined', 'none',
  'local-qwen-no-auth', 'ruanlinyun-local', 'your-api-key', 'sk-xxx', 'changeme',
]);

// [2026-09-20] 动作协议注入：让模型知道有 [MOTION] 这回事（此前完全没注入，
//   所以动作只能靠后端 5 个关键词兜底 → 用户感知"动作很笨"）
const MOTION_PROTOCOL = [
  '你是阮琳云（MMD 桌面宠物）。用中文简短回复，1-3 句，口语化。',
  '需要做动作时，在回复最末尾另起一行输出动作标签，标签不会显示给用户：',
  '单个：[MOTION]{"petAction":"wave"}[/MOTION]',
  '多个：[MOTION]{"petActions":["wave","nod"]}[/MOTION]',
  '可用动作：wave挥手 nod点头 shake摇头 jump跳 squat下蹲 spin转圈 clap鼓掌 thumbsUp点赞 bow鞠躬 tiltHead歪头 turnHead转头 turnBody转身 stretch伸展 bendForward前倾 lookUp抬头 lookDown低头 point指 comeHere招手过来 offerHand伸手 bounce蹦 cheer欢呼 stomp跺脚 block抱臂 refuse拒绝 reset复位',
  '不需要动作就不要输出该标签。',
].join('\n');

// [v185 省 token] 动作协议分级：不是每句话都注入全量 25 动作菜单。
//   任务/指令型消息（打开XX、搜索、查、执行…）→ 只注入身份 + 禁大动作 + 4 个自然微动作
//   （用户预期："打开酷狗"→ 顶多回头看一眼屏幕，别挥手蹦跳）；聊天消息 → 全量协议。
//   本地关键词判定，零额外 LLM 成本；任务型每条省约 280 tokens。
const TASKY_RE = /(打开|启动|开启|关闭|退出|关掉|搜索|搜一下|查一?下|查查|帮我查|执行|运行|安装|卸载|删除|清理|截屏|截图|看屏幕|识别|发邮件|下载|上传|保存|导出)/;
const MICRO_ACTIONS = 'turnHead转头（可“回头看屏幕”） tiltHead歪头 nod点头 shake摇头';
const MICRO_PROTOCOL = [
  '本回合是任务/指令型对话：不要任何大动作（wave/jump/clap 等一律不用）；若确需小演出，仅可用：' + MICRO_ACTIONS + '。仍按 [MOTION] 格式输出。',
].join('\n');
function buildSystemPrompt(userText: string): string {
  if (TASKY_RE.test(userText)) {
    // L0+L1：首行身份 + 微动作约束（不注入全清单）
    const firstLine = MOTION_PROTOCOL.split('\n')[0];
    return firstLine + '\n' + MICRO_PROTOCOL;
  }
  return MOTION_PROTOCOL;
}

/** requestId → abort */
const inflight = new Map<string, AbortController>();
// [2026-09-20 陪伴调度] 会话活动戳：companion.ts 同进程直读，判定"对话是否闲置"
const companionActivity = { lastUserAskAt: 0, lastAiReplyAt: 0 };
export function getActivity() {
  return { lastUserAskAt: companionActivity.lastUserAskAt, lastAiReplyAt: companionActivity.lastAiReplyAt };
}

function isPlaceholderKey(k: any): boolean {
  const v = String(k == null ? '' : k).trim();
  if (!v) return true;
  return PLACEHOLDER_KEYS.has(v.toLowerCase());
}

let envFileCache: Record<string, string> | null = null;
/** 读 resources/.env（后端进程可能没有全部注入，这里补一层） */
function readEnvFile(): Record<string, string> {
  if (envFileCache) return envFileCache;
  const out: Record<string, string> = {};
  try {
    const raw = fs.readFileSync(ENV_FILE, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch { /* noop */ }
  envFileCache = out;
  return out;
}

/** 解析大脑目标（每次请求现读 providers.json → 设置页改完即时生效，无需重启） */
function resolveBrain(): BrainTarget {
  // ① 显式覆盖
  if (process.env.PET_BRAIN_BASE_URL) {
    return {
      baseUrl: String(process.env.PET_BRAIN_BASE_URL),
      model: String(process.env.PET_BRAIN_MODEL || 'deepseek-chat'),
      apiKey: String(process.env.PET_BRAIN_API_KEY || ''),
      source: 'env-override',
    };
  }
  // ② 顶层 = DSH 的 providers.json active
  try {
    const store = JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf8'));
    const list: any[] = Array.isArray(store.providers) ? store.providers : [];
    // [v176] 选条目规则：优先「activeId 指向且真有 key」；若 active 是个没 key 的历史占位条目，
    //   回落到「已启用且真有 key」的那一个 —— 用户自己填的配置必须优先于 .env 兜底。
    //   旧写法 `find(activeId) || find(enabled)` 有短路陷阱：find(activeId) 只要命中（哪怕是个
    //   空 key 的占位 provider）就永远到不了右边 → 用户在设置页填好的 provider 被彻底无视，
    //   一路用 .env 的配置（"我这里填了，DSH 那边却用不了"的后端侧根因）。
    const byActive = list.find((p) => p && p.id === store.activeId);
    const usable = (p: any) => !!(p && p.baseUrl && p.model && !isPlaceholderKey(p.apiKey));
    const byEnabled = list.find((p) => p && p.enabled && usable(p));
    const act = usable(byActive) ? byActive : (byEnabled || byActive);
    if (usable(act)) {
      return {
        baseUrl: String(act.baseUrl),
        model: String(act.model),
        apiKey: String(act.apiKey),
        source: 'providers.json',
      };
    }
  } catch { /* noop */ }
  // ③ resources/.env（key/base/model 配套，不混搭）
  const env = readEnvFile();
  const key = String(process.env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY || '');
  if (!isPlaceholderKey(key)) {
    return {
      baseUrl: String(process.env.DEEPSEEK_BASE_URL || env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'),
      model: String(process.env.DEEPSEEK_MODEL || env.DEEPSEEK_MODEL || 'deepseek-chat'),
      apiKey: key,
      source: 'resources/.env',
    };
  }
  // ④ 本地兜底
  return localTarget();
}

/** 单次 API 调用（OpenAI 兼容 /chat/completions） */
async function callBrainAPI(target: BrainTarget, task: string, signal?: AbortSignal, systemOverride?: string): Promise<string> {
  const url = String(target.baseUrl).replace(/\/+$/, '') + '/chat/completions';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (target.apiKey) headers['Authorization'] = 'Bearer ' + target.apiKey;

  const ac = new AbortController();
  const onAbort = () => { try { ac.abort(); } catch { /* noop */ } };
  if (signal) {
    if (signal.aborted) ac.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { ac.abort(); } catch { /* noop */ } }, BRAIN_TIMEOUT_MS);

  try {
    // [2026-10-03] 本地兜底（llama.cpp）专用参数：qwen3 关思维链 + 适中温度
    const extra: Record<string, unknown> = {};
    if (target.source === 'local-default') {
      extra.temperature = 0.7;
      extra.chat_template_kwargs = { enable_thinking: false };
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: target.model,
        messages: [
          { role: 'system', content: systemOverride || MOTION_PROTOCOL },
          { role: 'user', content: task },
        ],
        max_tokens: BRAIN_MAX_TOKENS,
        temperature: 0.8,
        stream: false,
        ...extra,
      }),
      signal: ac.signal,
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      const err: any = new Error(`${target.source} HTTP ${resp.status}${body ? ' | ' + body.slice(0, 200) : ''}`);
      err.status = resp.status;
      throw err;
    }
    const data = await resp.json() as any;
    const msg = (data && data.choices && data.choices[0] && data.choices[0].message) || {};
    // 推理模型（如 agnes-2.0）：reasoning_content 是思维链，绝不能当正文回给用户
    const out = String(msg.content || '').trim();
    if (!out) throw new Error(`${target.source} 返回空正文（model=${target.model}）`);
    return out;
  } catch (e: any) {
    if (timedOut) throw new Error(`大脑 API 超时 ${BRAIN_TIMEOUT_MS}ms（${target.source} / ${target.model}）`);
    throw e;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/**
 * 大脑入口：默认 API 直连；PET_BRAIN_MODE=dsh 时回退旧 dsh CLI
 *
 * [v176] 必须 export：同进程的 companion.ts 用 `import { runBrain } from './aiHub'` 复用。
 *   此前漏了 export → tsc 编译报错，部署时只能在 dist 里手工补 `module.exports.runBrain`
 *   （dist 被手改 = 下次构建就丢 = companion 静默坏掉）。加 export 后构建自然带出，消除漂移。
 */
export async function runBrain(task: string, signal?: AbortSignal, systemOverride?: string): Promise<{ text: string; route: string; target: BrainTarget }> {
  const sig = signal ?? new AbortController().signal;
  if (String(process.env.PET_BRAIN_MODE || 'api').toLowerCase() === 'dsh') {
    return legacyDshBrain(task, sig);
  }
  const primary = resolveBrain();
  try {
    const text = await callBrainAPI(primary, task, sig, systemOverride);
    return { text, route: `brain-api:${primary.source}`, target: primary };
  } catch (e: any) {
    if (e?.name === 'AbortError' || signalAborted(e)) throw e;
    // 主目标失败 → 本地兜底一次（best effort）
    if (primary.source !== 'local-default') {
      const local: BrainTarget = localTarget();
      try {
        const text = await ((String(process.env.PET_LOCAL_RUNTIME || 'llama-cpp').toLowerCase() === 'ollama')
          ? callOllamaChat(local, task, sig, systemOverride)
          : callBrainAPI(local, task, sig, systemOverride)); // [2026-10-03] 本地运行时路由（默认 llama.cpp）
        return { text, route: 'brain-api:local-fallback', target: local };
      } catch (e2: any) {
        const err: any = new Error(`${e?.message || e} ｜ 本地兜底也失败：${e2?.message || e2}`);
        err.raw = e?.message || String(e);
        throw err;
      }
    }
    throw e;
  }
}

/** [旧链路] dsh CLI 子进程大脑（PET_BRAIN_MODE=dsh 时启用，排障用） */
function legacyDshBrain(task: string, signal?: AbortSignal): Promise<{ text: string; route: string; target: BrainTarget }> {
  const sig = signal ?? new AbortController().signal;
  return new Promise((resolve, reject) => {
    if (!task || !task.trim()) {
      reject(new Error('任务为空'));
      return;
    }
    if (task.startsWith('-')) { // [2026-10-02 安全加固] 防参数被当作 CLI 选项（选项注入）
      reject(new Error('任务文本不能以 "-" 开头'));
      return;
    }
    const env = { ...process.env, DSH_HOME } as Record<string, string>;
    const target = resolveBrain();
    env.DUMMY_KEY = env.DUMMY_KEY || 'local-qwen-no-auth';
    env.DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY || target.apiKey || 'local-qwen-no-auth';
    env.DEEPSEEK_BASE_URL = env.DEEPSEEK_BASE_URL || target.baseUrl;
    const child = spawn(NODE_BIN, [DSH_CLI, '--profile', DSH_PROFILE, task], {
      cwd: DSH_HOME,
      env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch { /* noop */ }
      reject(new Error(`dsh 超时 ${DSH_TIMEOUT_MS}ms`));
    }, DSH_TIMEOUT_MS);
    const onAbort = () => {
      try { child.kill('SIGTERM'); } catch { /* noop */ }
    };
    sig.addEventListener('abort', onAbort, { once: true });
    child.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    child.on('error', (e) => {
      clearTimeout(timer);
      sig.removeEventListener('abort', onAbort);
      reject(e);
    });
    child.on('close', async (code) => {
      clearTimeout(timer);
      sig.removeEventListener('abort', onAbort);
      const text = (stdout || '').trim();
      if (code === 0 && text) {
        resolve({ text, route: 'dsh-cli', target: { source: 'dsh-cli', baseUrl: DSH_HOME, model: DSH_PROFILE, apiKey: '' } });
        return;
      }
      const errLine = (stderr || '').split('\n').filter((l) => l.startsWith('dsh:')).pop();
      const detail = errLine || `dsh 退出码 ${code}${stderr ? ' | ' + stderr.slice(0, 240) : ''}`;
      // 本地千问直连兜底
      try {
        const local: BrainTarget = localTarget();
        // [2026-10-03] 本地运行时路由：ollama → 原生通道；默认 llama.cpp → OpenAI 兼容（带 qwen3 参数）
        const fallback = String(process.env.PET_LOCAL_RUNTIME || 'llama-cpp').toLowerCase() === 'ollama'
          ? await callOllamaChat(local, task, sig)
          : await callBrainAPI(local, task, sig);
        resolve({ text: fallback, route: 'brain-api:local-fallback', target: local });
        return;
      } catch (fbErr: any) {
        const err: any = new Error(`dsh: ${detail} ｜ 本地千问回退也失败: ${fbErr?.message || fbErr}`);
        err.raw = detail;
        reject(err);
        return;
      }
    });
  });
}

/** 从大脑正文中抽动作（MOTION 或关键词）→ 小脑 joint-control */
function dispatchCerebellum(text: string): Array<{ actionId: string }> {
  const actions: Array<{ actionId: string }> = [];
  const push = (id: string) => { if (id && !actions.some((a) => a.actionId === id)) actions.push({ actionId: id }); };
  const re = /\[MOTION\]([\s\S]*?)\[\/MOTION\]/g;
  const reUnclosed = /\[MOTION\]([^\[]{3,600})/g; // [2026-10-02 终审] 模型漏写闭合标签时的兜底匹配
  let m: RegExpExecArray | null;
  let matched = false;
  let body = text || '';
  while ((m = re.exec(body)) !== null) {
    matched = true;
    try {
      const cmd = JSON.parse(m[1].trim());
      if (typeof cmd.petAction === 'string') push(cmd.petAction);
      if (Array.isArray(cmd.petActions)) cmd.petActions.forEach((id: string) => push(id));
    } catch { /* noop */ }
  }
  if (!matched) {
    while ((m = reUnclosed.exec(body)) !== null) {
      try {
        const cmd = JSON.parse(m[1].trim());
        if (typeof cmd.petAction === 'string') push(cmd.petAction);
        if (Array.isArray(cmd.petActions)) cmd.petActions.forEach((id: string) => push(id));
      } catch { /* noop */ }
    }
  }
  body = body.replace(/\[\/?MOTION\]/g, '');
  if (!actions.length) {
    const kw: Array<[RegExp, string]> = [
      [/挥手|招手|hello|\bhi\b|打招呼/i, 'wave'], // [2026-10-02 终审] hi 加词边界（原会命中 think/this）
      [/点头|同意|好的/, 'nod'],
      [/摇头|不对/, 'shake'],
      [/跳个?舞|跳舞/, 'jump'],
      [/蹲/, 'squat'],
    ];
    for (const [re2, id] of kw) {
      if (re2.test(body)) { push(id); break; }
    }
  }
  for (const a of actions) {
    try { enqueuePetAction(a.actionId, 'brain-dsh'); } catch { /* noop */ }
  }
  return actions;
}

async function saveHistory(sessionId: string, role: string, content: string): Promise<void> {
  try {
    // [2026-10-02 安全加固] 端口必须为 1-65535 的纯数字，杜绝 URL 拼进非法值
    const port = Number(process.env.PORT);
    const safePort = (Number.isInteger(port) && port >= 1 && port <= 65535) ? port : 27865;
    await fetch('http://127.0.0.1:' + safePort + '/api/v1/ai/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, role, content }),
    });
  } catch { /* noop */ }
}

/**
 * POST /api/v1/ai/hub/ask
 * body: { requestId?, text, scene?, sessionId?, from? }
 * 链路：收到即应答加载（前端）→ 大脑 API（云端/本地）→ 文字回总站 + 动作入小脑
 */
router.post('/ask', async (req: Request, res: Response) => {
  const { requestId, text, scene, sessionId, from, persona } = (req.body || {}) as {
    requestId?: string; text?: string; scene?: string; sessionId?: string; from?: string; persona?: string;
  };
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, error: '缺少 text' });
  }
  const rid = requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sid = sessionId || 'default';
  const sc = scene === 'call' ? 'call' : 'chat';

  if (inflight.has(rid)) {
    return res.status(409).json({ success: false, requestId: rid, error: 'requestId 重复且进行中' });
  }
  const ac = new AbortController();
  inflight.set(rid, ac);
  companionActivity.lastUserAskAt = Date.now();

  try {
    await saveHistory(sid, 'user', text.trim());
    // [v185 人物设定] 用户自定义人设优先；通话场景追加通话约束
    const customPersona = String(persona || '').trim();
    const effectivePersona = customPersona
      ? (sc === 'call'
          ? customPersona + '\n（当前处于语音通话中：中文口语化，不超过3句。）'
          : customPersona)
      : (sc === 'call'
          ? '你是阮琳云，语音通话中，中文口语化，不超过3句。'
          : '你是阮琳云，友好温暖，中文回复，简短自然。');
    const task = `${effectivePersona}\n用户：${text.trim()}`;
    // [v185 省 token] 按消息意图分级注入动作协议
    const sys = buildSystemPrompt(text.trim());
    const { text: brainOut, route, target } = await runBrain(task, ac.signal, sys);
    const motion = dispatchCerebellum(brainOut);
    const clean = brainOut.replace(/\[MOTION\][\s\S]*?\[\/MOTION\]/g, '').replace(/\[\/?MOTION\]/g, '').trim();
    await saveHistory(sid, 'assistant', clean || brainOut);
    companionActivity.lastAiReplyAt = Date.now();
    inflight.delete(rid);
    return res.json({
      success: true,
      requestId: rid,
      text: clean || brainOut,
      raw: brainOut,
      route,
      brain: 'api',
      brainTarget: { source: target?.source, baseUrl: target?.baseUrl, model: target?.model },
      cerebellum: motion,
      scene: sc,
      from: from || 'unknown',
    });
  } catch (e: any) {
    inflight.delete(rid);
    if (e?.name === 'AbortError' || signalAborted(e)) {
      return res.json({ success: false, requestId: rid, aborted: true, error: '已打断' });
    }
    console.error('[AIHub][大脑API] 失败:', e?.message || e);
    return res.status(502).json({
      success: false,
      requestId: rid,
      brain: 'api',
      error: e?.message || '大脑 API 不可用',
    });
  }
});

function signalAborted(e: any): boolean {
  return !!e && (String(e.message || '').includes('abort') || e.killed === true);
}

/** POST /api/v1/ai/hub/abort { requestId } */
router.post('/abort', (req: Request, res: Response) => {
  const { requestId } = req.body || {};
  if (!requestId || typeof requestId !== 'string') {
    return res.status(400).json({ success: false, error: '缺少 requestId' });
  }
  const ac = inflight.get(requestId);
  if (ac) {
    ac.abort();
    inflight.delete(requestId);
    return res.json({ success: true, requestId, aborted: true });
  }
  return res.json({ success: true, requestId, aborted: false, note: '无进行中回合' });
});

/** GET /api/v1/ai/hub/health —— 带解析后的大脑目标（不含 key），方便核对"顶层统一"是否生效 */
router.get('/health', (_req: Request, res: Response) => {
  const t = resolveBrain();
  res.json({
    ok: true,
    service: 'ai-hub',
    brain: 'api',
    brainMode: String(process.env.PET_BRAIN_MODE || 'api'),
    cerebellum: 'joint-control',
    target: { source: t.source, baseUrl: t.baseUrl, model: t.model, hasKey: !!t.apiKey },
    providersFile: PROVIDERS_FILE,
    envFile: ENV_FILE,
    timeoutMs: BRAIN_TIMEOUT_MS,
    inflight: inflight.size,
    activity: getActivity(),
  });
});

export default router;
