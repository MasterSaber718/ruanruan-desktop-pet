// ============================================================================
// companionAI.ts — 统一 AI 入口（聊天 / 通话共用；原伴侣面板 UI 已删）
// ----------------------------------------------------------------------------
// [2026-09-18 统一改造] scene: 'companion' 仅作历史兼容（NewPage 通话引擎仍可能用口语化 prompt）。
// 本模块提供：
//   - apiBase()          统一 27865 主机（兼容局域网 IP）
//   - buildSystemPrompt  统一 system（人设 + 时间 + MOTION 协议）
//   - askUnified         统一调用：llmApi 优先 → proxy 退避 → 本地 qwen
//   - parseAndDispatchMotion  统一 [MOTION]/裸 JSON 解析并派发动作
//   - notifyActionIntent 统一关键词意图（fire-and-forget）
// ============================================================================

export type AIScene = 'chat' | 'call' | 'companion';

const HOST = (typeof window !== 'undefined' && window.location && window.location.hostname) || '127.0.0.1';

export function apiBase(): string {
  return `http://${HOST}:27865`;
}

/** 与 HomePage 历史协议保持一致的静态 MOTION 说明（动态配方由 setMotionRecipes 注入） */
export const MOTION_PROTOCOL_LINES: string[] = [
  '[动作能力] 你可以用 [MOTION]标签[/MOTION] 控制角色动作。标签内容为 JSON：',
  '{"petAction":"动作名"}——内置动作：wave挥手 nod点头 shake摇头 block遮挡害羞 turnHead转头 turnBody转身 squat蹲下 stretch伸懒腰 turnLeft左转 turnRight右转 jump跳跃 reset恢复站姿 tiltHead歪头 bow鞠躬 clap鼓掌 spreadHands摊手 thumbsUp竖拇指 comeHere招手过来 refuse摆手不要 standUp起身 bendForward弯腰 lookUp仰头 lookDown低头 legKick踢腿 point指向 offerHand伸手 bounce弹跳 stomp跺脚 cheer欢呼 approach走近 vmdClip动作库片段',
  '多个动作顺序执行：{"petActions":["wave","nod"]}',
  '示例：用户说"跳一下"→你回复：好呀，看我跳～[MOTION]{"petAction":"jump"}[/MOTION]',
  '进阶：[MOTION]{"hub":{"action":"动作名","params":{...}}}[/MOTION]（wave amplitude/freq/duration/side；nod angle/count 等）',
  '跳舞（仅当用户明确要求"跳个舞/来一个/助助兴"）：{"hub":{"recipe":"配方id"}}。配方：celebrate庆祝 excited兴奋 cheerSpin庆祝转圈 invite邀约 greet打招呼 shyGreet害羞问好 comfort安慰 think思考 sleepy困了 deny拒绝 shyCome害羞招手。用户指名（如"刚刚那个"）就跳指名的；没指名就优先选最近没跳过的（系统会提示）。',
  '规则：仅当用户明确要求做动作时，才在回复最末尾附 MOTION 标签；一条回复最多 2 个标签。问候类情绪反馈由系统自动做，你不必重复输出标签。',
];

let motionRecipesExtra = '';
export function setMotionRecipes(extra: string): void {
  motionRecipesExtra = extra || '';
}

/**
 * [2026-09-20 陪伴调度] 拉取跳舞轮换提示注入提示词。
 * 调用时机：模块加载后（延迟，等后端就绪）+ 每次派发舞蹈后，保证下一次询问带上最新轮换状态。
 */
export async function refreshMotionRecipes(): Promise<void> {
  try {
    const resp = await fetch(`${apiBase()}/api/v1/companion/dance-hint`);
    if (!resp.ok) return;
    const data = await resp.json();
    if (data && typeof data.text === 'string' && data.text) setMotionRecipes(data.text);
  } catch { /* 静默：后端未起不影响聊天 */ }
}
// 模块加载后延迟刷新一次（此时软件刚起，后端可能未监听；失败静默，下次派发舞蹈后仍会刷新）
setTimeout(() => { void refreshMotionRecipes(); }, 8000);

export function buildSystemPrompt(scene: AIScene, opts?: { imageDataUrl?: string; ctxBlock?: string; extra?: string }): string {
  const now = new Date();
  const timeInfo = `[当前时间] ${now.toLocaleString('zh-CN', { hour12: false })}（${'日一二三四五六'[now.getDay()]}）`;
  let base = '你是阮琳云，一个友好、温暖的AI助手。你以爱为核心哲学，说话自然有逻辑，懂情绪会共情。请用中文回复。';
  if (scene === 'call') {
    base += '你正在和用户进行语音通话，请用中文口语化回复，语气亲切自然，回答简洁（一般不超过3句话，适合语音播报）。';
  } else if (scene === 'companion') {
    base += '你是用户的AI伴侣。用中文口语化回复，简洁自然（不超过3句话）。';
  }
  if (opts?.imageDataUrl) base += '若消息附带图片，请直接根据图像内容回答用户问题。';
  const motion = MOTION_PROTOCOL_LINES.join('\n') + (motionRecipesExtra ? '\n' + motionRecipesExtra : '');
  const ctx = opts?.ctxBlock ? `\n近期对话记录：\n${opts.ctxBlock}` : '';
  return `${base}\n\n${timeInfo}\n请基于此时间回答时间相关问题，不要编造。\n${motion}${opts?.extra ? '\n' + opts.extra : ''}${ctx}`;
}

/** [v115] 多模态 user content */
function buildUserContent(userText: string, imageDataUrl?: string): string | any[] {
  if (!imageDataUrl) return userText;
  return [
    { type: 'text', text: userText },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ];
}

export interface AskUnifiedOptions {
  scene: AIScene;
  history?: Array<{ role: 'user' | 'assistant'; content: string | any[] }>;
  userText: string;
  imageDataUrl?: string;
  systemPrompt?: string;
  signal?: AbortSignal;
  /** true=允许走本地 qwen 兜底（聊天/通话默认开；伴侣也可开） */
  allowLocalQwen?: boolean;
}

export interface AskUnifiedResult {
  text: string;
  route: 'api' | 'proxy' | 'qwen' | 'error';
  error?: string;
}

/** 从 localStorage 统一仓取近期上下文（伴侣/通话可用） */
export function loadUnifiedCtxBlock(max = 12): string {
  try {
    const arr = JSON.parse(localStorage.getItem('ruanlinyun_unified_messages') || '[]').slice(-max);
    return arr.map((m: any) => (m.sender === 'me' ? '用户' : '你') + '：' + m.text).join('\n');
  } catch {
    return '';
  }
}

/** 统一调用：设置里的 API → 后端 proxy → 本地 qwen */
export async function askUnified(opts: AskUnifiedOptions): Promise<AskUnifiedResult> {
  const systemPrompt = opts.systemPrompt
    || buildSystemPrompt(opts.scene, {
      imageDataUrl: opts.imageDataUrl,
      ctxBlock: opts.scene === 'companion' ? loadUnifiedCtxBlock() : undefined,
    });
  const history = (opts.history || []).slice(-20);
  const base = apiBase();

  // ① 设置里的 API（HomePage/通话同款）
  try {
    const { llmApiService } = await import('./LLMApiService');
    if (llmApiService.isConfigured()) {
      const text = await llmApiService.askWithHistory(
        history,
        opts.userText,
        systemPrompt,
      );
      return { text: (text || '').trim(), route: 'api' };
    }
  } catch (e: any) {
    console.warn('[companionAI] api route fail, fallback proxy:', e?.message || e);
  }

  // ② 后端 proxy（DeepSeek/GLM，与伴侣面板同构 + 429 退避）
  try {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (opts.signal) {
      if (opts.signal.aborted) ctrl.abort();
      else opts.signal.addEventListener('abort', onAbort, { once: true });
    }
    const timer = setTimeout(() => ctrl.abort(), 90000);
    try {
      let resp: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const messages: any[] = [
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: buildUserContent(opts.userText, opts.imageDataUrl) },
        ];
        resp = await fetch(`${base}/api/v1/ai/proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, systemPrompt }),
          signal: ctrl.signal,
        });
        if (resp.status === 429 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          continue;
        }
        break;
      }
      if (resp && resp.ok) {
        const data = await resp.json() as { content?: string };
        const out = (data.content || '').trim();
        if (out) return { text: out, route: 'proxy' };
      } else if (resp) {
        const errJson = await resp.json().catch(() => ({} as any));
        throw new Error(errJson.error || `proxy HTTP ${resp.status}`);
      }
    } finally {
      clearTimeout(timer);
      if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
    }
  } catch (e: any) {
    console.warn('[companionAI] proxy fail:', e?.message || e);
  }

  // ③ 本地 qwen
  if (opts.allowLocalQwen !== false) {
    try {
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: opts.userText },
      ];
      const resp = await fetch('http://127.0.0.1:11434/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5-3b-instruct-q4_k_m',
          messages,
          max_tokens: opts.scene === 'call' ? 512 : 2048,
          temperature: 0.7,
          stream: false,
        }),
      });
      if (resp.ok) {
        const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
        const out = (data.choices?.[0]?.message?.content || '').trim();
        if (out) return { text: out, route: 'qwen' };
      }
    } catch (e: any) {
      console.warn('[companionAI] qwen fail:', e?.message || e);
    }
  }

  return { text: '', route: 'error', error: 'AI 全链路不可用（api/proxy/qwen）' };
}

function postJSON(url: string, body: any): void {
  try {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  } catch { /* noop */ }
}

export function dispatchPetAction(actionId: string, source = 'ai-chat'): void {
  postJSON(`${apiBase()}/api/v1/joint-control/pet-action`, { actionId, source: source || 'ai-chat' });
}

/** 关键词意图（与聊天 handleSend 同一条，通话/伴侣共用） */
export function notifyActionIntent(message: string, source = 'ai-chat'): void {
  try {
    void source; // 预留：后端 action-intent 目前只收 message；source 与 pet-action 对齐
    fetch(`${apiBase()}/api/v1/ai/action-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.actionId) console.log('[companionAI] action-intent:', d.actionId);
      })
      .catch(() => {});
  } catch { /* noop */ }
}

export interface MotionParseResult {
  cleanText: string;
  hadMotion: boolean;
}

// ==================== [方案B] AI 总站 askHub + 双窗事件 ====================

export interface HubAskResult {
  ok: boolean;
  requestId: string;
  text: string;
  route?: string;
  motion?: Array<{ actionId: string }>;
  aborted?: boolean;
  error?: string;
}

export type HubEventType = 'ask' | 'thinking' | 'done' | 'error' | 'abort';

export interface HubEvent {
  type: HubEventType;
  requestId: string;
  from?: string;
  scene?: string;
  text?: string;
  message?: string;
  motion?: any;
}

function hubEmit(evt: HubEvent): void {
  try {
    const h = (window as any).aiHub;
    if (h && typeof h.emit === 'function') h.emit(evt);
  } catch { /* noop */ }
}

let hubUnsub: (() => void) | null = null;
const hubListeners = new Set<(e: HubEvent) => void>();

/** 订阅总站事件（页面挂载时调用一次） */
export function subscribeHubEvents(cb: (e: HubEvent) => void): () => void {
  hubListeners.add(cb);
  if (!hubUnsub) {
    const h = (window as any).aiHub;
    if (h && typeof h.onEvent === 'function') {
      hubUnsub = h.onEvent((e: HubEvent) => {
        hubListeners.forEach((fn) => { try { fn(e); } catch { /* noop */ } });
      });
    } else {
      hubUnsub = () => {};
    }
  }
  return () => { hubListeners.delete(cb); };
}

export function abortHub(requestId: string): void {
  try {
    fetch(`${apiBase()}/api/v1/ai/hub/abort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    }).catch(() => {});
  } catch { /* noop */ }
  hubEmit({ type: 'abort', requestId });
}

/**
 * 总站询问：只调一次 backend /ai/hub/ask。
 * [方案B定稿] 大脑=DeepSeek Harness；hub 失败不再 fallback 本地 qwen/proxy 换脑。
 */
export async function askHub(opts: {
  scene: AIScene;
  from: 'home' | 'preview' | 'call';
  userText: string;
  imageDataUrl?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string | any[] }>;
  systemPrompt?: string;
  persona?: string;
  signal?: AbortSignal;
}): Promise<HubAskResult> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  hubEmit({ type: 'ask', requestId, from: opts.from, scene: opts.scene, text: opts.userText });
  hubEmit({ type: 'thinking', requestId, from: opts.from, scene: opts.scene });
  try {
    const resp = await fetch(`${apiBase()}/api/v1/ai/hub/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        text: opts.userText,
        scene: opts.scene === 'call' ? 'call' : 'chat',
        sessionId: 'default',
        from: opts.from,
        persona: opts.persona,
      }),
      signal: opts.signal,
    });
    const data = await resp.json().catch(() => ({} as any));
    if (data && data.aborted) {
      hubEmit({ type: 'abort', requestId });
      return { ok: false, requestId, text: '', aborted: true };
    }
    if (!data || data.success !== true) {
      const msg = data?.error || `hub HTTP ${resp.status}（大脑 DeepSeek Harness 不可用）`;
      hubEmit({ type: 'error', requestId, message: msg });
      return { ok: false, requestId, text: '', error: msg };
    }
    const text = (data.text || '').trim();
    hubEmit({ type: 'done', requestId, from: opts.from, text, scene: opts.scene, motion: data.cerebellum });
    return { ok: true, requestId, text, route: data.route || 'dsh-headless', motion: data.cerebellum };
  } catch (e: any) {
    if (opts.signal?.aborted || e?.name === 'AbortError') {
      abortHub(requestId);
      return { ok: false, requestId, text: '', aborted: true };
    }
    const msg = e?.message || 'hub 网络失败（大脑未连通）';
    hubEmit({ type: 'error', requestId, message: msg });
    return { ok: false, requestId, text: '', error: msg };
  }
}

/** 统一 [MOTION] / 裸 JSON 解析；派发动作；返回剥离后的干净文本 */
export function parseAndDispatchMotion(text: string): MotionParseResult {
  let hadMotion = false;
  if (!text) return { cleanText: text, hadMotion };
  const dispatchCmd = (cmd: any) => {
    if (typeof cmd.petAction === 'string') {
      hadMotion = true;
      console.log('[MOTION] 派发动作:', cmd.petAction);
      dispatchPetAction(cmd.petAction, 'ai-chat');
    } else if (Array.isArray(cmd.petActions)) {
      hadMotion = true;
      console.log('[MOTION] 派发动作序列:', cmd.petActions.join(' → '));
      cmd.petActions.forEach((aid: string, idx: number) => {
        setTimeout(() => dispatchPetAction(aid, 'ai-chat'), idx * 1200);
      });
    } else if (cmd.hub) {
      hadMotion = true;
      if (typeof (cmd.hub as any).recipe === 'string') {
        // [2026-09-20] 跳舞点播：hub 配方模式 + 轮换记账
        const rid = (cmd.hub as any).recipe;
        console.log('[MOTION] 派发舞蹈配方:', rid);
        postJSON('http://127.0.0.1:9877/api/motion/request', { mode: 'recipe', recipe: rid });
        void fetch(`${apiBase()}/api/v1/companion/dance-did`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId: rid }),
        }).catch(() => { /* noop */ });
        void refreshMotionRecipes();
      } else {
        postJSON('http://127.0.0.1:9877/api/motion/request', { mode: 'param', ...cmd.hub });
      }
    }
  };
  let clean = text;
  if (text.includes('[MOTION]')) {
    const re = /\[MOTION\]([\s\S]*?)\[\/MOTION\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      try { dispatchCmd(JSON.parse(m[1].trim())); } catch (e) { console.warn('[MOTION] 解析失败', m[1], e); }
      clean = clean.replace(m[0], '');
    }
  } else {
    const bare = /\{\s*"petActions?"\s*:\s*(?:"[a-zA-Z]{1,20}"|\[\s*"[a-zA-Z]{1,20}"(?:\s*,\s*"[a-zA-Z]{1,20}")*\s*\])\s*\}/g;
    let m2: RegExpExecArray | null;
    while ((m2 = bare.exec(text)) !== null) {
      try { dispatchCmd(JSON.parse(m2[0])); clean = clean.replace(m2[0], ''); } catch { /* noop */ }
    }
    const bareHub = /\{\s*"hub"\s*:\s*\{\s*"(?:action|recipe)"\s*:\s*"[a-zA-Z]{1,24}"(?:\s*,\s*"params"\s*:\s*\{[^{}]{0,220}\})?\s*\}\s*\}/g;
    let m3: RegExpExecArray | null;
    while ((m3 = bareHub.exec(text)) !== null) {
      try { dispatchCmd(JSON.parse(m3[0])); clean = clean.replace(m3[0], ''); } catch { /* noop */ }
    }
  }
  if (clean === text) return { cleanText: text, hadMotion };
  return { cleanText: clean.replace(/\n{3,}/g, '\n\n').replace(/[，,]\s*$/, '').trim(), hadMotion };
}
