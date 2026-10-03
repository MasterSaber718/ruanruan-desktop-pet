// ============================================================================
// Motion Router — 动作协议路由（V3 统一架构 · Phase「协议层」实现）
// ============================================================================
//
// 【定位】
//   大脑(AI) ⇄ 小脑(本模块) 的动作协议入口，位于 jointControl（低层骨骼队列）之上。
//   AI 不再生成骨骼数据/关键帧，只提交「原语+参数」（模式A）或「脚本序列」（模式B）。
//   本模块负责：参数模板、两级校验、状态机(idle↔solving)、事件广播(SSE)。
//
// 【对应设计稿】
//   LW《设计稿V3-整理修订版.txt》第三部分「数据与协议设计」：
//     - 3.1 两种模式 JSON
//     - 3.2 参数模板 min/max/default（解决"AI不会用"——GET /primitives 即用法）
//     - 2.4 前置参数级校验 + 结果级复核挂点
//     - 2.3 状态机 idle↔solving + interrupt；9# 最新指令优先
//     - 2.5 通信：REST(命令) + SSE(事件广播)——零新依赖，socket.io 后续可并行接
//
// 【端点】
//   GET  /api/motion/primitives   原语库+参数模板（AI 提示词固定上下文来源）
//   GET  /api/motion/state        当前状态机状态
//   POST /api/motion/request      提交 motion_request（模式A/B），返回校验结果
//   POST /api/motion/interrupt    打断当前动作（最新指令优先由 request 自动触发）
//   GET  /api/motion/events       SSE 事件流：motion_verify/motion_state/motion_complete/motion_error
//
// 【求解器挂点】
//   solvePrimitive() 当前为占位（Phase 2 接正弦/弹簧求解器与 jointControl 下发）。
//   协议行为(校验/状态/事件)已完整，求解实现可独立替换不影响协议稳定。

import { Router, Request, Response } from 'express';

const router = Router();

// ---------------------------------------------------------------- 原语库 v1
// 参数边界即生理极限的百分比上限（安全网在 JointLimits，这里挡住离谱值）
interface ParamTemplate {
  type: 'number' | 'enum' | 'boolean';
  min?: number;
  max?: number;
  options?: string[];
  default: any;
  desc: string;
}
interface PrimitiveDef {
  label: string;
  params: Record<string, ParamTemplate>;
}

export const PRIMITIVES: Record<string, PrimitiveDef> = {
  idle:      { label: '待机呼吸', params: {} },
  wave:      { label: '挥手', params: {
      amplitude: { type: 'number', min: 0.1, max: 1.0, default: 0.7, desc: '幅度0-1' },
      freq:      { type: 'number', min: 0.5, max: 4.0, default: 2.0, desc: '频率Hz' },
      duration:  { type: 'number', min: 0.4, max: 6.0, default: 1.8, desc: '秒' },
  }},
  nod:       { label: '点头', params: {
      angle:     { type: 'number', min: 5, max: 35, default: 18, desc: '角度°' },
      count:     { type: 'number', min: 1, max: 4, default: 1, desc: '次数' },
  }},
  shake:     { label: '摇头', params: {
      angle:     { type: 'number', min: 10, max: 45, default: 25, desc: '角度°' },
      count:     { type: 'number', min: 1, max: 4, default: 2, desc: '次数' },
  }},
  turnHead:  { label: '转头', params: {
      angle:     { type: 'number', min: -60, max: 60, default: 30, desc: '角度°负左正右' },
  }},
  turnBody:  { label: '转身', params: {
      angle:     { type: 'number', min: -90, max: 90, default: 45, desc: '角度°' },
  }},
  squat:     { label: '蹲下', params: {
      depth:     { type: 'number', min: 0.2, max: 1.0, default: 0.6, desc: '深度0-1' },
  }},
  stretch:   { label: '伸展', params: {
      style:     { type: 'enum', options: ['up','side','back'], default: 'up', desc: '方向' },
  }},
  block:     { label: '防御遮挡', params: {} },
  jump:      { label: '跳跃', params: {
      height:    { type: 'number', min: 0.1, max: 0.8, default: 0.3, desc: '视觉高度米' },
      power:     { type: 'enum', options: ['soft','normal','strong'], default: 'normal', desc: '力度' },
      style:     { type: 'enum', options: ['cute','playful','tired'], default: undefined as any, desc: '风格可空' },
      duration:  { type: 'number', min: 0.5, max: 3.0, default: 1.2, desc: '秒' },
  }},
};

// ---------------------------------------------------------------- 状态机
type State = 'idle' | 'solving';
let state: State = 'idle';
let currentReqId: string | null = null;
let currentAction: string | null = null;
let interruptFlag = false;
let reqSeq = 1000;

// 事件订阅（SSE 客户端）
type Listener = (evt: any) => void;
const listeners = new Set<Listener>();
function emit(type: string, payload: any) {
  const evt = { type, ts: Date.now(), ...payload };
  for (const l of listeners) { try { l(evt); } catch { /* 忽略单个客户端异常 */ } }
}

function setState(next: State, extra: Record<string, any> = {}) {
  state = next;
  emit('motion_state', { state, currentAction, currentReqId, ...extra });
}

// ---------------------------------------------------------------- 两级校验
function resolveParams(def: PrimitiveDef, raw: any) {
  const resolved: Record<string, any> = {};
  const violations: Array<{ param: string; reason: string }> = [];
  const warnings: string[] = [];
  const rawObj = (raw && typeof raw === 'object') ? raw : {};
  for (const [name, tpl] of Object.entries(def.params)) {
    if (!(name in rawObj)) {
      if (tpl.default !== undefined) resolved[name] = tpl.default;
      continue;
    }
    const v = rawObj[name];
    if (tpl.type === 'number') {
      if (typeof v !== 'number' || Number.isNaN(v)) { violations.push({param:name, reason:'需为数字'}); continue; }
      if (tpl.min !== undefined && v < tpl.min) { violations.push({param:name, reason:`小于下限 ${tpl.min}`}); continue; }
      if (tpl.max !== undefined && v > tpl.max) { violations.push({param:name, reason:`超过上限 ${tpl.max}`}); continue; }
      resolved[name] = v;
    } else if (tpl.type === 'enum') {
      if (!tpl.options || !tpl.options.includes(v)) {
        if (v === null || v === '' ) continue; // 可空枚举允许空
        violations.push({param:name, reason:`需为 ${JSON.stringify(tpl.options)} 之一`});
        continue;
      }
      resolved[name] = v;
    } else if (tpl.type === 'boolean') {
      resolved[name] = !!v;
    }
  }
  // 未登记参数 → 仅警告不拒绝（宽容但留痕）
  for (const k of Object.keys(rawObj)) {
    if (!(k in def.params)) warnings.push(`未知参数已忽略: ${k}`);
  }
  return { resolved, violations, warnings };
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** 求解器挂点（Phase 2 替换）：占位=按参数时长模拟 solving */
async function solvePrimitive(action: string, params: Record<string, any>): Promise<void> {
  const dur = Math.max(300, Math.min(6000, Math.round((params.duration ?? params.dur ?? 1.2) * 1000)));
  const step = 120;
  let elapsed = 0;
  while (elapsed < dur) {
    if (interruptFlag) return;                    // interrupt → 收敛回 idle（无需专门回退动画）
    await sleep(Math.min(step, dur - elapsed));
    elapsed += step;
  }
}

// ---------------------------------------------------------------- 端点
router.get('/primitives', (_req: Request, res: Response) => {
  res.json({ success: true, version: 'motion_protocol_v1', primitives: PRIMITIVES,
             usage: 'POST /api/motion/request {"mode":"param","action":"jump","params":{...},"context":"用户说:跳一下"}' });
});

router.get('/state', (_req: Request, res: Response) => {
  res.json({ success: true, state, currentAction, currentReqId, listeners: listeners.size });
});

router.post('/request', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const mode = body.mode === 'script' ? 'script' : 'param';

  // ---- 协议格式粗校验
  if (mode === 'param' && (typeof body.action !== 'string')) {
    return res.status(400).json({ ok: false, code: 'BAD_REQUEST',
      error: 'mode=param 需要字符串 action 字段' });
  }

  // ---- 模式B（脚本序列）：Phase 4 完整执行器就位前，逐项预检并明确告知
  if (mode === 'script') {
    const script = body.script;
    if (!Array.isArray(script) || script.length === 0) {
      return res.status(400).json({ ok:false, code:'BAD_SCRIPT', error:'mode=script 需要 script 数组' });
    }
    // 先整体过一遍参数级校验（_any_ 步骤违规即拒绝——前置校验原则）
    for (let i = 0; i < script.length; i++) {
      const step = script[i] ?? {};
      const def = PRIMITIVES[step.action];
      if (!def) return res.status(400).json({ ok:false, code:'UNKNOWN_ACTION',
        error:`第${i}步动作未注册`, knownActions: Object.keys(PRIMITIVES) });
      const r = resolveParams(def, step.params);
      if (r.violations.length) return res.status(400).json({ ok:false, code:'PARAM_OUT_OF_RANGE',
        error:`第${i}步(${step.action})参数越界`, violations: r.violations });
    }
    return res.json({ ok:true, code:'SCRIPT_ACCEPTED_DEFERRED',
      message:'脚本参数全部通过前置校验；顺序执行器属 Phase 4，当前以首步动作近似播报' });
  }

  // ---- 模式A：查白名单
  const def = PRIMITIVES[body.action];
  if (!def) {
    return res.status(400).json({ ok:false, code:'UNKNOWN_ACTION',
      error:`动作未注册: ${body.action}`, knownActions: Object.keys(PRIMITIVES) });
  }

  // ---- 参数级前置校验（不过 → 就地拒绝，AI 按原因重发；最多重试语义由大脑侧控制）
  const { resolved, violations, warnings } = resolveParams(def, body.params);
  if (violations.length) {
    return res.status(400).json({ ok:false, code:'PARAM_OUT_OF_RANGE',
      action: body.action, violations,
      hint:`可用范围见 GET /api/motion/primitives` });
  }

  const replaced = state === 'solving';
  if (replaced) interruptFlag = true;              // V3#9 最新指令优先

  const id = `mr_${++reqSeq}`;
  currentReqId = id; currentAction = body.action;

  // ---- 校验通过事件（含解析后的实际参数——大脑/前端都知道将执行什么）
  emit('motion_verify', { ok:true, reqId:id, action:body.action,
                          params:resolved, warnings, replaced });

  // ---- 进入 solving（异步执行，HTTP 立即返回受理结果）
  interruptFlag = false;
  setState('solving', { interruptedPrevious: replaced });

  res.json({ ok:true, code:'ACCEPTED', reqId:id, action:body.action,
             params:resolved, warnings, replaced,
             stateEndpoint:'/api/motion/state', eventsEndpoint:'/api/motion/events' });

  solvePrimitive(body.action, resolved)
    .catch(() => { emit('motion_error', { reqId:id, error:'solve exception' }); })
    .finally(() => {
      if (currentReqId === id) {                   // 若已被更新指令接管则不再收敛
        currentReqId = null; currentAction = null;
        setState('idle');
        emit('motion_complete', { reqId:id, action:body.action });
      }
    });
});

router.post('/interrupt', (_req: Request, res: Response) => {
  if (state !== 'solving') return res.json({ ok:true, state, note:'当前无进行中动作' });
  interruptFlag = true;
  emit('motion_state', { state:'solving', note:'interrupt requested', currentReqId, currentAction });
  res.json({ ok:true, note:'打断信号已发出，求解器将在下一拍收敛回 idle（200ms 级自然过渡）' });
});

// SSE 事件流（渲染端/AI 监听用）
router.get('/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`event: hello\ndata: ${JSON.stringify({ state, currentAction })}\n\n`);
  const listener: Listener = evt => {
    try { res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`); } catch { /* noop */ }
  };
  listeners.add(listener);
  req.on('close', () => listeners.delete(listener));
});

export default router;