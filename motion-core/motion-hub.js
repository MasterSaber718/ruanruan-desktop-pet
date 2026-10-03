#!/usr/bin/env node
/**
 * motion-hub.js — 阮琳云「小脑」动作协议 · 独立验证枢纽（V3 协议层）
 * ---------------------------------------------------------------
 * 零依赖：只用 Node 内置模块。与源码版 routes/motion.ts 保持同一协议契约，
 * 用于在不动主后端的情况下先行跑通/测试/演示协议全流程。
 *
 * 端点：
 *   GET  /api/motion/primitives   原语库+参数模板（附可执行配方清单）
 *   GET  /api/motion/state        状态机状态
 *   POST /api/motion/request      模式A(param)/模式B(script)/模式C(recipe)
 *   POST /api/motion/interrupt    打断
 *   GET  /api/motion/events       SSE 事件流
 *   GET  /api/motion/history      软分历史（环形10条）
 *   GET  /api/recipes             配方库（含 runnable/missing/verified）
 *   POST /api/recipes/verify      配方 verified 写回（试跑确认回路）
 *   GET  /console                 观测控制台（T8，浏览器打开）
 *   GET  /health                  存活探测
 *
 * 启动：node motion-hub.js [端口默认9877]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---------------- 原语库 v1（与设计稿V3对齐；边界=生理极限百分比上限） ----------------
const PRIMITIVES = {
  idle:     { label: '待机呼吸', params: {} },
  wave:     { label: '挥手', params: {
      side:      { type:'enum', options:['left','right','both'], default:'right', desc:'left左手/right右手/both双手齐挥' },
      amplitude: { type:'number', min:0.1, max:1.0, default:0.7, desc:'摆动幅度0-1' },
      freq:      { type:'number', min:0.5, max:4.0, default:2.0, desc:'摆动频率Hz' },
      duration:  { type:'number', min:0.4, max:3600.0, default:6, desc:'秒（真消费：说3秒就挥3秒；默认6秒防无限挥，持续挥手需明确说）' } } },
  nod:      { label: '点头', params: {
      angle: { type:'number', min:5, max:35, default:18, desc:'角度°' },
      count: { type:'number', min:1, max:4, default:1, desc:'次数（一次调用连贯完成）' },
      timing:{ type:'enum', options:['normal','quick','smooth'], default:'normal', desc:'节奏' } } },
  shake:    { label: '摇头', params: {
      angle: { type:'number', min:10, max:45, default:25, desc:'角度°' },
      count: { type:'number', min:1, max:4, default:2, desc:'次数（一次调用连贯完成）' },
      timing:{ type:'enum', options:['normal','quick','smooth'], default:'normal', desc:'节奏' } } },
  turnHead: { label: '转头', params: {
      angle: { type:'number', min:-60, max:60, default:30, desc:'°负左正右' },
      timing:{ type:'enum', options:['normal','quick','smooth'], default:'normal', desc:'节奏' } } },
  turnBody: { label: '转身', params: {
      angle: { type:'number', min:-90, max:90, default:45, desc:'°' },
      timing:{ type:'enum', options:['normal','quick','smooth'], default:'normal', desc:'节奏' } } },
  squat:    { label: '蹲下', params: {
      depth: { type:'number', min:0.2, max:1.0, default:0.6, desc:'深度0-1（真消费：蹲多深）' },
      timing:{ type:'enum', options:['normal','quick','smooth'], default:'normal', desc:'节奏' } } },
  stretch:  { label: '伸展', params: {
      style: { type:'enum', options:['up','side','back'], default:'up', desc:'方向（T6 消费）' },
      timing:{ type:'enum', options:['normal','quick','smooth'], default:'normal', desc:'节奏' } } },
  block:    { label: '防御遮挡', params: {} },
  reset:    { label: '恢复站姿', params: {} },
  // [2026-09-08 语义原语] 转圈：真实整机旋转 N 圈（参数透传到渲染端，非库内固定动作）
  spin:     { label: '转圈', params: {
      turns: { type:'number', min:0.5, max:3, default:1, desc:'圈数0.5-3' },
      dir:   { type:'enum', options:['left','right'], default:'left', desc:'left逆时针/right顺时针(俯视)' } } },
  // [2026-09-08 语义原语] 抬臂/抬腿：side+limb+height 参数驱动（覆盖"抬左腿/抬右手/抬高点"整类说法）
  limbRaise: { label: '抬臂抬腿', params: {
      side:   { type:'enum', options:['left','right','both'], default:'left', desc:'左/右/both双侧（leg 双侧=站不稳，渲染端自动降级单腿）' },
      limb:   { type:'enum', options:['arm','leg'], default:'leg', desc:'arm手/leg腿' },
      height: { type:'number', min:0.3, max:0.9, default:0.55, desc:'抬起高度0.3-0.9' } } },
  jump:     { label: '跳跃', params: {
      height:   { type:'number', min:0.1, max:0.8, default:0.3, desc:'米' },
      power:    { type:'enum', options:['soft','normal','strong'], default:'normal', desc:'力度' },
      style:    { type:'enum', options:['cute','playful','tired'], default:null, desc:'风格可空' },
      duration: { type:'number', min:0.5, max:3.0, default:1.2, desc:'秒' } } },
  // ---------------- [T6.1 P0 批 + 配方解锁批 2026-09-08] 19 个新原语 ----------------
  tiltHead: { label: '歪头', params: {
      side:  { type:'enum', options:['left','right'], default:'left', desc:'往哪边歪' },
      angle: { type:'number', min:0, max:25, default:15, desc:'歪头角度°(0-25)' },
      timing:{ type:'enum', options:['normal','quick','smooth'], default:'normal', desc:'节奏' } } },
  bow:      { label: '鞠躬', params: {
      depth:    { type:'number', min:0.2, max:1.0, default:0.6, desc:'弯腰深度0-1' },
      duration: { type:'number', min:1, max:6, default:2.5, desc:'全程秒' } } },
  clap:     { label: '鼓掌', params: {
      count: { type:'number', min:1, max:6, default:3, desc:'拍几下' },
      speed: { type:'enum', options:['slow','normal','quick'], default:'normal', desc:'节奏' } } },
  spreadHands: { label: '摊手', params: {
      amplitude: { type:'number', min:0.3, max:1.0, default:0.7, desc:'摊开幅度0-1' },
      duration:  { type:'number', min:1, max:6, default:2, desc:'保持秒数' } } },
  thumbsUp: { label: '竖拇指', params: {
      side: { type:'enum', options:['left','right','both'], default:'right', desc:'哪只手' },
      hold: { type:'number', min:0.5, max:5, default:1.5, desc:'保持秒数' } } },
  comeHere: { label: '招手过来', params: {
      side:  { type:'enum', options:['left','right','both'], default:'right', desc:'哪只手招' },
      count: { type:'number', min:1, max:4, default:2, desc:'招几下' } } },
  refuse:   { label: '摆手不要', params: {
      side:  { type:'enum', options:['left','right','both'], default:'right', desc:'哪只手摆' },
      count: { type:'number', min:1, max:4, default:2, desc:'摆几次' } } },
  // [2026-09-17 T7] 动作库 VMD 片段：asset=motion.json 文件名（相对 vmd 资产目录）
  vmdClip:  { label: '动作库片段', params: {
      asset: { type:'string', default:'idle_刘TWT.motion.json', desc:'motion.json 资产文件名' },
      timeScale: { type:'number', min:0.5, max:2.0, default:1.0, desc:'播放速度倍率' } } },
  standUp:  { label: '起身', params: {
      speed: { type:'enum', options:['quick','normal','slow'], default:'normal', desc:'起身速度' } } },
  bendForward: { label: '弯腰', params: {
      angle: { type:'number', min:5, max:90, default:45, desc:'弯腰角度°' },
      hold:  { type:'number', min:0, max:5, default:1.5, desc:'保持秒数' } } },
  lookUp:   { label: '仰头', params: {
      angle: { type:'number', min:5, max:45, default:20, desc:'仰头角度°' } } },
  lookDown: { label: '低头', params: {
      angle: { type:'number', min:5, max:45, default:20, desc:'低头角度°' } } },
  legKick:  { label: '踢腿', params: {
      side:  { type:'enum', options:['left','right'], default:'right', desc:'哪条腿' },
      power: { type:'number', min:0.2, max:1.0, default:0.6, desc:'力度0-1' } } },
  point:    { label: '指向', params: {
      dir:  { type:'enum', options:['up','down','left','right'], default:'right', desc:'指的方向' },
      hold: { type:'number', min:0.5, max:5, default:2, desc:'保持秒数' } } },
  // [T5 配方解锁批] 以下 5 个来自 P1 批，先落地以解锁 10 个预置配方可执行
  offerHand: { label: '伸手示意', params: {
      side: { type:'enum', options:['left','right'], default:'right', desc:'哪只手' },
      hold: { type:'number', min:0.5, max:5, default:1.5, desc:'保持秒数' } } },
  bounce:   { label: '弹跳律动', params: {
      freq:      { type:'number', min:0.5, max:3, default:1.5, desc:'节奏Hz' },
      amplitude: { type:'number', min:0.2, max:1.0, default:0.5, desc:'弹动幅度0-1' },
      duration:  { type:'number', min:1, max:8, default:2.5, desc:'持续秒数' } } },
  stomp:    { label: '跺脚', params: {
      side:  { type:'enum', options:['left','right','both'], default:'left', desc:'哪只脚' },
      count: { type:'number', min:1, max:4, default:2, desc:'跺几下' },
      power: { type:'number', min:0.2, max:1.0, default:0.6, desc:'力度0-1' } } },
  cheer:    { label: '欢呼', params: {
      amplitude: { type:'number', min:0.3, max:1.0, default:0.8, desc:'双臂上扬幅度' },
      duration:  { type:'number', min:1, max:5, default:2.5, desc:'持续秒数' } } },
  approach: { label: '前进靠近', params: {
      steps: { type:'number', min:1, max:4, default:2, desc:'走几步（位移持久生效）' },
      speed: { type:'enum', options:['slow','normal','quick'], default:'normal', desc:'步速' } } },
};

let state = 'idle', curReqId = null, curAction = null, curParams = {}, interruptFlag = false, seq = (Date.now() % 100000000) * 10; // [2026-08-30 修复] seq 用时间基址，重启不重置（防 reqId 撞车被桥去重跳过）
const listeners = new Set();
function emit(type, payload) {
  const evt = { type, ts: Date.now(), ...payload };
  process.stdout.write(`[emit] ${type} ${JSON.stringify(payload).slice(0,110)}\n`);
  for (const l of listeners) { try { l(evt); } catch {} }
}
function setState(next, extra={}) { state = next; emit('motion_state', { state, currentAction:curAction, currentReqId:curReqId, ...extra }); }

function resolveParams(def, raw) {
  const resolved = {}, violations = [], warnings = [];
  const r = (raw && typeof raw === 'object') ? raw : {};
  for (const [name, tpl] of Object.entries(def.params)) {
    if (!(name in r)) { if (tpl.default !== null && tpl.default !== undefined) resolved[name] = tpl.default; continue; }
    const v = r[name];
    if (tpl.type === 'number') {
      if (typeof v !== 'number' || Number.isNaN(v)) { violations.push({param:name, reason:'需为数字'}); continue; }
      if (tpl.min !== undefined && v < tpl.min) { violations.push({param:name, reason:`小于下限 ${tpl.min}`}); continue; }
      if (tpl.max !== undefined && v > tpl.max) { violations.push({param:name, reason:`超过上限 ${tpl.max}`}); continue; }
      resolved[name] = v;
    } else if (tpl.type === 'enum') {
      if ((v === null || v === '') && !tpl.options.includes(v)) { if (tpl.default !== null && tpl.default !== undefined) resolved[name] = tpl.default; continue; } // [2026-10-02 终审] 显式空值也落默认值（原样跳过会丢 default）
      if (!tpl.options.includes(v)) { violations.push({param:name, reason:`需为 ${JSON.stringify(tpl.options)} 之一`}); continue; }
      resolved[name] = v;
    } else resolved[name] = !!v;
  }
  for (const k of Object.keys(r)) if (!(k in def.params)) warnings.push(`未知参数已忽略: ${k}`);
  return { resolved, violations, warnings };
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// [2026-09-08 Phase2] 求解器接通桌宠正规链路：
//   原实现=空壳只睡时长（"Phase 2 替换"挂点）。现映射到 27865 pet-action 队列
//   （→ 主进程指令扇出 → 渲染端动画系统），动作仍走白名单/冷却/三层保护。
//   两类参数语义：
//   - nod/shake 的 count 次数 → hub 侧展开多次下发（2.6s 间隔避开互斥）；
//   - spin/limbRaise 语义原语 → 参数整体透传（turns/dir/side/limb/height 由渲染端模板驱动）。
//   idle → reset（恢复自然站姿）。
const PET_ACTION_PORT = Number(process.env.PET_BACKEND_PORT) || 27865;
function postPetAction(actionId, params) {
  return new Promise((resolve) => {
    try {
      const payload = { actionId, source: 'motion-hub' };
      if (params && typeof params === 'object') payload.params = params;
      const body = JSON.stringify(payload);
      const req = http.request(
        { host: '127.0.0.1', port: PET_ACTION_PORT, path: '/api/v1/joint-control/pet-action', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        (res) => {
          res.resume();
          res.on('end', () => {
            const ok = !!res.statusCode && res.statusCode < 300;
            console.log(`[postPetAction] ${actionId} → HTTP ${res.statusCode}`);
            if (!ok) emit('motion_error', { action: actionId, error: 'pet-action HTTP ' + res.statusCode }); // [2026-10-02 终审] 白名单拒绝等 4xx/5xx 不再当成功
            resolve();
          });
        }
      );
      req.on('error', (e) => { console.log(`[postPetAction] ${actionId} → ERROR ${e.message}`); resolve(); });
      req.write(body); req.end();
    } catch (e) { console.log(`[postPetAction] ${actionId} → THROW ${e.message}`); resolve(); }
  });
}
// [2026-09-08] 参数透传动作集：params 由渲染端参数化模板消费
// [T1.5 修复] wave 必须透传——side:'both'（双手齐挥）参数不过这里就到不了渲染端，T1.5 白做
// [T3.1] 全参数动作透传：nod/shake 的 count 改渲染端一次连贯完成（hub 不再 count 展开，避免 count² 叠加）
// [T6.1] 新增 19 个参数化动作全部透传
const PARAM_PASSTHROUGH = new Set([
  'spin', 'limbRaise', 'wave', 'nod', 'shake', 'turnHead', 'turnBody', 'squat', 'jump', 'stretch', 'block',
  'tiltHead', 'bow', 'clap', 'spreadHands', 'thumbsUp', 'comeHere', 'refuse', 'standUp',
  'bendForward', 'lookUp', 'lookDown', 'legKick', 'point',
  'offerHand', 'bounce', 'stomp', 'cheer', 'approach',
  'vmdClip',
]);

// ---------------- [T2.3 软分 v1] 人味评估——只管美不美，不拒绝（硬门在渲染端运行时限速） ----------------
const motionHistory = []; // 环形 10 条：{ts, action, params, warnings}
function softGate(action, params) {
  const w = [];
  const prev = motionHistory[motionHistory.length - 1];
  // 连贯性：同动作相邻两次，幅度类参数跳变过大
  if (prev && prev.action === action) {
    for (const k of ['amplitude', 'height', 'depth', 'angle', 'turns']) {
      const a = Number(params[k]), b = Number(prev.params[k]);
      if (!Number.isNaN(a) && !Number.isNaN(b) && Math.abs(a - b) > 0.5) {
        w.push(`连贯性：${action} 的 ${k} 从 ${b} 跳到 ${a}（跳变>0.5），建议渐变过渡`);
      }
    }
  }
  // 节奏：挥手类持留动作给太短
  if (action === 'wave') {
    const dur = Number(params.duration);
    if (!Number.isNaN(dur) && dur < 2) w.push(`节奏：wave 时长 ${dur}s 过短，手还没挥起来就收了（建议 ≥2s）`);
  }
  // 记录历史（环形 10 条，供 /api/motion/history 观测与后续软分扩展）
  motionHistory.push({ ts: Date.now(), action, params, warnings: w });
  if (motionHistory.length > 10) motionHistory.shift();
  return w;
}

async function solve(action, params) {
  const mapped = action === 'idle' ? 'reset' : action; // idle=回到自然姿态 → 复位
  const pass = PARAM_PASSTHROUGH.has(action);
  const times = pass ? 1 : Math.max(1, Math.min(4, Math.round(Number(params.count) || 1)));
  for (let i = 0; i < times; i++) {
    if (interruptFlag) return;                 // 打断→自然收敛回 idle
    await postPetAction(mapped, pass ? params : undefined);
    if (times > 1 && i < times - 1) await sleep(1200); // [2026-09-08 时间轴原型] 渲染端有动作队列接续，间隔收紧到 1.2s 保持连贯
  }
}

// ---------------- [T4.1 script 编排执行器] 步间等待 = 动作估时表 ----------------
// v1 定案：渲染端有先来后到动作队列（天然保证顺序执行），hub 步间按估时下发即"等完成"；
// 真实完成事件回传（渲染端 → hub）留观测控制台之后改进。估时来自各动作渲染端 duration。
const TIMING_FACTOR = { quick: 0.75, normal: 1, smooth: 1.4 };
const SPEED_FACTOR = { slow: 0.7, normal: 1, quick: 1.4 };
function estimateDuration(action, p) {
  const f = TIMING_FACTOR[p.timing] || 1;
  const cnt = Math.max(1, Math.round(Number(p.count) || 1));
  switch (action) {
    case 'wave': { const d = Number(p.duration) || 0.6; return (d <= 8 ? d : 3) + 0.5; } // 持留挂机型 wave 等 3s 让下步优雅接手
    case 'nod': return cnt * 0.65 * f + 0.35;
    case 'shake': return cnt * 0.75 * f + 0.35;
    case 'turnHead': return 1.4 * f + 0.2;
    case 'turnBody': return 2.2 * f + 0.3;
    case 'squat': return 3.0 * f + 0.6;
    case 'stretch': return 4.6;
    case 'block': return 2.5;
    case 'spin': return Math.min(3, Math.max(0.5, Number(p.turns) || 1)) * 2.2 + 1.0;
    case 'limbRaise': return 2.6;
    case 'jump': return Math.min(5, Math.max(1.5, Number(p.duration) || 3.2)) * 0.8 + 0.5;
    case 'tiltHead': return 1.3 * f + 0.2;
    case 'bow': return Math.min(7, (Number(p.duration) || 2.5) + 0.5);
    case 'clap': return cnt * (0.62 / (SPEED_FACTOR[p.speed] || 1)) + 0.4;
    case 'spreadHands': return Math.min(6, (Number(p.duration) || 2) + 0.4);
    case 'thumbsUp': return Math.min(8, (Number(p.hold) || 1.5) + 2.0);
    case 'comeHere': return cnt * 1.1 + 0.5;
    case 'refuse': return cnt * 0.95 + 0.5;
    case 'standUp': return ({ quick: 1.6, normal: 2.4, slow: 3.4 })[p.speed] || 2.4;
    case 'bendForward': return Math.min(8, (Number(p.hold) || 1.5) + 2.4);
    case 'lookUp': case 'lookDown': return 1.4;
    case 'legKick': return 1.8;
    case 'point': return Math.min(8, (Number(p.hold) || 2) + 2.2);
    case 'offerHand': return Math.min(8, (Number(p.hold) || 1.5) + 2.0);
    case 'bounce': return Math.min(9, (Number(p.duration) || 2.5) + 0.4);
    case 'stomp': return cnt * 0.9 + 0.6;
    case 'cheer': return Math.min(6, (Number(p.duration) || 2.5) + 0.5);
    case 'approach': return Math.max(1, Math.round(Number(p.steps) || 2)) * (0.9 / (SPEED_FACTOR[p.speed] || 1)) + 0.6;
    case 'reset': case 'idle': return 0.9;
    default: return 2.0;
  }
}

/**
 * [T4.1] 脚本真实执行：steps（已展开为纯原语）逐步 下发→等估时→下一步；
 * [T4.2] 循环末隐式追加 reset——任何组合结束回自然站姿。
 * 中断语义：被新请求顶替（curReqId 变了）→ 不复位（新动作接管姿态）；
 *          用户 interrupt / 自然结束 → 复位回站姿。
 */
async function runScript(reqId, steps, label) {
  setState('solving', { currentAction: label });
  for (let i = 0; i < steps.length; i++) {
    if (interruptFlag || curReqId !== reqId) { emit('motion_interrupted', { reqId, at: i, note: '打断/被新请求顶替，脚本终止' }); break; } // [2026-10-02 终审] 代际比较：顶替标志同步自清除对旧协程无效，改比 curReqId
    const st = steps[i];
    const rr = resolveParams(PRIMITIVES[st.action], st.params || {});
    curAction = st.action; curParams = rr.resolved;
    const w = softGate(st.action, rr.resolved);
    emit('motion_step', { reqId, step: i + 1, total: steps.length, action: st.action, params: rr.resolved, warnings: w });
    await solve(st.action, rr.resolved);
    const est = estimateDuration(st.action, rr.resolved);
    await sleep(Math.round(est * 1000));
  }
  if (curReqId === reqId) { // 未被顶替：收尾回站姿
    if (interruptFlag) { // 用户打断也回自然姿态（T4.2 精神）
      await solve('reset', {}).catch(() => {});
      await sleep(600);
    } else {
      emit('motion_step', { reqId, step: steps.length + 1, total: steps.length + 1, action: 'reset', implicit: true });
      await solve('reset', {});
      await sleep(900);
    }
  }
}

// ---------------- [T5.1 配方固化回路] recipes.json 载入/校验/试跑/verified 写回 ----------------
const RECIPE_PATH = (() => {
  const local = path.join(__dirname, 'recipes.json');
  if (fs.existsSync(local)) return local;
  return 'C:\\RUANLINYUN\\motion-core\\recipes.json'; // 部署副本缺文件时回落源码库
})();
const RECIPES = new Map(); // id -> { def, runnable, missing[] }

/** 展开：recipe 步骤 → 纯原语序列（配方可嵌套，depth 防死循环）；返回缺动作清单 */
function expandScript(rawScript, overrides, depth = 0) {
  const out = [], missing = [];
  if (depth > 2 || !Array.isArray(rawScript)) return { out, missing: depth > 2 ? ['嵌套过深'] : [] };
  for (const st of rawScript) {
    const a = st && st.action;
    if (!a) continue;
    if (PRIMITIVES[a]) {
      out.push({ action: a, params: Object.assign({}, st.params || {}, overrides || {}) });
    } else if (RECIPES.has(a)) {
      const r = RECIPES.get(a);
      const sub = expandScript(r.def.steps, overrides, depth + 1);
      out.push(...sub.out); missing.push(...sub.missing);
    } else {
      missing.push(a);
    }
  }
  return { out, missing };
}

function loadRecipes() {
  try {
    const raw = JSON.parse(fs.readFileSync(RECIPE_PATH, 'utf8'));
    const arr = Array.isArray(raw) ? raw : (Array.isArray(raw.recipes) ? raw.recipes : []);
    for (const r of arr) {
      if (!r || typeof r.id !== 'string' || !Array.isArray(r.steps) || r.steps.length === 0) continue;
      const { missing } = expandScript(r.steps);
      RECIPES.set(r.id, { def: r, runnable: missing.length === 0, missing });
    }
    const ok = [...RECIPES.values()].filter(r => r.runnable).length;
    console.log(`[recipes] 载入 ${RECIPES.size} 个配方（${ok} 可执行）`);
    for (const [id, r] of RECIPES) {
      if (!r.runnable) console.log(`[recipes] ${id} 不可执行，缺动作: ${r.missing.join('、')}`);
    }
  } catch (e) { console.log(`[recipes] 载入失败（${e.message}）——配方功能降级`); }
}

function recipesSummary() {
  const list = [];
  for (const [id, r] of RECIPES) {
    list.push({ id, label: r.def.label || id, verbs: r.def.verbs || [], verified: !!r.def.verified,
      runnable: r.runnable, missing: r.missing, steps: r.def.steps.length, author: r.def.author || 'ai' });
  }
  return list;
}

// ---------------- [T2.3] 请求处理 ----------------
async function handleRequest(body, res) {
  const mode = body.mode === 'script' ? 'script' : (body.mode === 'recipe' ? 'recipe' : 'param');
  if (mode === 'param' && typeof body.action !== 'string')
    return send(res, 400, { ok:false, code:'BAD_REQUEST', error:'mode=param 需要字符串 action' });

  // [T5.1] mode=recipe：按配方 id 展开为脚本执行（配方级 params 覆盖同名步骤参数）
  if (mode === 'recipe') {
    const rid = body.recipe || body.action;
    const rec = typeof rid === 'string' ? RECIPES.get(rid) : null;
    if (!rec) return send(res, 400, { ok:false, code:'UNKNOWN_RECIPE', error:`配方未注册: ${rid}`, knownRecipes:[...RECIPES.keys()] });
    if (!rec.runnable) return send(res, 400, { ok:false, code:'RECIPE_NOT_RUNNABLE', recipe:rid, missing:rec.missing });
    const { out } = expandScript(rec.def.steps, body.params);
    return startScript(out, `配方:${rid}`, res);
  }

  // [T4.1] mode=script：steps 序列真实执行（步间等完成估时 + 末步隐式 reset）
  if (mode === 'script') {
    const script = body.script;
    if (!Array.isArray(script) || script.length === 0)
      return send(res, 400, { ok:false, code:'BAD_SCRIPT', error:'需要 script 数组' });
    const { out, missing } = expandScript(script);
    if (missing.length)
      return send(res, 400, { ok:false, code:'UNKNOWN_ACTION', error:`脚本含未注册动作: ${missing.join('、')}`, knownActions:Object.keys(PRIMITIVES), knownRecipes:[...RECIPES.keys()] });
    for (let i=0;i<out.length;i++) {
      const rr = resolveParams(PRIMITIVES[out[i].action], out[i].params);
      if (rr.violations.length) return send(res, 400, { ok:false, code:'PARAM_OUT_OF_RANGE', error:`第${i}步(${out[i].action})越界`, violations:rr.violations });
    }
    return startScript(out, `script(${out.length}步)`, res);
  }

  // mode=param：原语直调；action 是配方 id 时同样走脚本展开（提示词注入后 AI 的主路径）
  let def = PRIMITIVES[body.action];
  if (!def && RECIPES.has(body.action)) {
    const rec = RECIPES.get(body.action);
    if (!rec.runnable) return send(res, 400, { ok:false, code:'RECIPE_NOT_RUNNABLE', recipe:body.action, missing:rec.missing });
    const { out } = expandScript(rec.def.steps, body.params);
    return startScript(out, `配方:${body.action}`, res);
  }
  if (!def) return send(res, 400, { ok:false, code:'UNKNOWN_ACTION', error:`动作未注册: ${body.action}`, knownActions:Object.keys(PRIMITIVES), knownRecipes:[...RECIPES.keys()] });

  const { resolved, violations, warnings } = resolveParams(def, body.params);
  if (violations.length)
    return send(res, 400, { ok:false, code:'PARAM_OUT_OF_RANGE', action:body.action, violations, hint:'GET /api/motion/primitives' });

  // [T2.3 软分] 硬校验过后跑人味软分（只 warning 不拒绝；渲染端硬门做速度兜底）
  const softWarnings = softGate(body.action, resolved);
  const allWarnings = [...(warnings || []), ...softWarnings];

  const replaced = state === 'solving';
  if (replaced) interruptFlag = true;          // V3#9 最新指令优先

  const id = `mr_${++seq}`;
  curReqId = id; curAction = body.action; curParams = resolved;
  emit('motion_verify', { ok:true, reqId:id, action:body.action, params:resolved, warnings:allWarnings, softWarnings, replaced });

  interruptFlag = false;
  setState('solving', { interruptedPrevious: replaced });
  send(res, 200, { ok:true, code:'ACCEPTED', reqId:id, action:body.action, params:resolved, warnings:allWarnings, softWarnings, replaced });

  solve(body.action, resolved).catch(e => emit('motion_error', { reqId:id, error:String(e) }))
   .finally(() => {
     if (curReqId === id) { curReqId=null; curAction=null; setState('idle'); emit('motion_complete',{reqId:id, action:body.action}); }
   });
}

/** [T4.1] 脚本/配方统一入口：校验通过即受理，后台异步执行 */
function startScript(outSteps, label, res) {
  const replaced = state === 'solving';
  if (replaced) interruptFlag = true;
  const id = `ms_${++seq}`;
  curReqId = id; curAction = label; curParams = {};
  emit('motion_verify', { ok:true, reqId:id, action:label, steps:outSteps.map(s=>s.action), replaced });
  interruptFlag = false;
  setState('solving', { interruptedPrevious: replaced });
  send(res, 200, { ok:true, code:'SCRIPT_ACCEPTED', reqId:id, label,
    steps: outSteps.map(s => ({ action: s.action, params: s.params })),
    replaced, note:'T4.1 步间等完成估时（v1）；T4.2 末步隐式 reset' });
  runScript(id, outSteps, label).catch(e => emit('motion_error', { reqId:id, error:String(e) }))
    .finally(() => {
      if (curReqId === id) { curReqId=null; curAction=null; setState('idle'); emit('motion_complete',{reqId:id, action:label}); }
    });
}

function send(res, code, obj) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  const data = JSON.stringify(obj);
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'});
  res.end(data);
}

// ---------------- [T8.1 观测控制台] 静态页（浅色主题，用户拒绝暗色） ----------------
const CONSOLE_HTML = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>阮琳云 · 小脑观测台</title>
<style>
  :root { --bg:#f7f8fa; --card:#ffffff; --line:#e3e6ea; --tx:#2a2f36; --sub:#6b7280; --ok:#16a34a; --warn:#d97706; --bad:#dc2626; --accent:#2563eb; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--tx); font:14px/1.55 "Segoe UI","Microsoft YaHei",sans-serif; padding:16px; }
  h1 { font-size:18px; margin-bottom:10px; } h1 .badge { font-size:12px; padding:2px 10px; border-radius:10px; background:#e8f0fe; color:var(--accent); vertical-align:middle; margin-left:8px; }
  h2 { font-size:14px; color:var(--sub); margin:0 0 8px; }
  .grid { display:grid; grid-template-columns:340px 1fr; gap:12px; max-width:1280px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px; margin-bottom:12px; }
  .kv { display:flex; justify-content:space-between; padding:3px 0; } .kv b { font-weight:600; }
  .state-idle { color:var(--ok); } .state-solving { color:var(--accent); font-weight:700; }
  table { width:100%; border-collapse:collapse; font-size:12.5px; }
  th,td { text-align:left; padding:4px 6px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--sub); font-weight:600; background:#fafbfc; position:sticky; top:0; }
  td code, .ev code { background:#f1f3f5; padding:1px 5px; border-radius:4px; font-size:12px; }
  .warn { color:var(--warn); } .missing { color:var(--bad); }
  .scroll { max-height:300px; overflow:auto; }
  .ev { font-size:12px; padding:2px 0; border-bottom:1px dashed #eef0f2; word-break:break-all; }
  .ev .t { color:var(--sub); margin-right:6px; }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; background:var(--ok); }
  .foot { color:var(--sub); font-size:12px; margin-top:8px; max-width:1280px; }
</style></head><body>
<h1>阮琳云 · 小脑观测台 <span class="badge" id="proto">motion-hub</span></h1>
<div class="grid">
  <div>
    <div class="card"><h2>状态机</h2><div id="state"></div></div>
    <div class="card"><h2>实时事件（SSE）</h2><div class="scroll" id="events"><div class="ev"><span class="t">--:--:--</span>等待事件…</div></div></div>
  </div>
  <div>
    <div class="card"><h2>原语库（<span id="primCount">0</span>）</h2><div class="scroll"><table id="prims"><thead><tr><th style="width:110px">动作</th><th>参数模板</th></tr></thead><tbody></tbody></table></div></div>
    <div class="card"><h2>配方库</h2><div class="scroll"><table id="recipes"><thead><tr><th style="width:100px">id</th><th style="width:70px">状态</th><th>组成</th></tr></thead><tbody></tbody></table></div></div>
    <div class="card"><h2>动作历史（软分环形 10 条）</h2><div class="scroll"><table id="hist"><thead><tr><th style="width:120px">时间</th><th style="width:100px">动作</th><th>参数 / warning</th></tr></thead><tbody></tbody></table></div></div>
  </div>
</div>
<div class="foot">T8.1 观测控制台 · 状态/历史 2-5s 轮询 + SSE 实时事件 · 端点同 /api/motion/* /api/recipes</div>
<script>
function fmtTs(ts){ var d=new Date(ts); function p(n){return (n<10?'0':'')+n;} return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function j(o){ try { return JSON.stringify(o); } catch(e){ return String(o); } }
function pollState(){ fetch('/api/motion/state').then(function(r){return r.json();}).then(function(d){
  var el=document.getElementById('state');
  el.innerHTML='<div class="kv"><span>状态</span><b class="state-'+esc(d.state)+'">'+esc(d.state)+'</b></div>'
    +'<div class="kv"><span>当前动作</span><b>'+esc(d.currentAction||'-')+'</b></div>'
    +'<div class="kv"><span>reqId</span><code>'+esc(d.currentReqId||'-')+'</code></div>'
    +'<div class="kv"><span>参数</span><code>'+esc(j(d.currentParams))+'</code></div>'
    +'<div class="kv"><span>SSE 监听</span><b>'+esc(d.listeners)+'</b></div>';
}).catch(function(){}); }
function pollPrims(){ fetch('/api/motion/primitives').then(function(r){return r.json();}).then(function(d){
  var tb=document.querySelector('#prims tbody'); var ks=Object.keys(d.primitives||{});
  document.getElementById('primCount').textContent=ks.length;
  tb.innerHTML=ks.map(function(k){ var p=d.primitives[k]; var ps=Object.keys(p.params||{}).map(function(n){
    var t=p.params[n]; return '<code>'+esc(n)+'</code> '+esc(t.type)+(t.default!==null&&t.default!==undefined?'='+esc(j(t.default)):'')+(t.desc?' <span style="color:var(--sub)">'+esc(t.desc)+'</span>':'');
  }).join('<br>'); return '<tr><td><b>'+esc(k)+'</b><br><span style="color:var(--sub)">'+esc(p.label)+'</span></td><td>'+(ps||'<span style="color:var(--sub)">无参数</span>')+'</td></tr>'; }).join('');
}).catch(function(){}); }
function pollRecipes(){ fetch('/api/recipes').then(function(r){return r.json();}).then(function(d){
  var tb=document.querySelector('#recipes tbody'); var rs=d.recipes||[];
  tb.innerHTML=rs.map(function(r){
    var st=r.runnable ? (r.verified?'<span style="color:var(--ok)">✓已验证</span>':'可试跑') : '<span class="missing">缺: '+esc((r.missing||[]).join(','))+'</span>';
    var steps=(r.steps||[]).map(function(s){ return esc(s.action); }).join(' → ');
    return '<tr><td><b>'+esc(r.id)+'</b><br><span style="color:var(--sub)">'+esc(r.label||'')+'</span></td><td>'+st+'</td><td>'+steps+'</td></tr>';
  }).join('');
}).catch(function(){}); }
function pollHist(){ fetch('/api/motion/history').then(function(r){return r.json();}).then(function(d){
  var tb=document.querySelector('#hist tbody'); var h=(d.history||[]).slice().reverse();
  tb.innerHTML=h.map(function(x){
    return '<tr><td>'+fmtTs(x.ts)+'</td><td><b>'+esc(x.action)+'</b></td><td><code>'+esc(j(x.params))+'</code>'
      +(x.warnings&&x.warnings.length?'<br><span class="warn">'+esc(x.warnings.join('；'))+'</span>':'')+'</td></tr>';
  }).join('') || '<tr><td colspan="3" style="color:var(--sub)">暂无记录</td></tr>';
}).catch(function(){}); }
function listenEvents(){
  try {
    var es=new EventSource('/api/motion/events'); var box=document.getElementById('events');
    es.onmessage=function(){};
    ['motion_verify','motion_step','motion_state','motion_complete','motion_error','motion_interrupted'].forEach(function(t){
      es.addEventListener(t,function(e){
        var d={}; try{ d=JSON.parse(e.data);}catch(err){}
        var div=document.createElement('div'); div.className='ev';
        div.innerHTML='<span class="t">'+fmtTs(d.ts||Date.now())+'</span><b>'+esc(t)+'</b> <code>'+esc(j(d).slice(0,220))+'</code>';
        box.insertBefore(div,box.firstChild);
        while(box.children.length>40) box.removeChild(box.lastChild);
      });
    });
  } catch(e){}
}
pollState(); pollPrims(); pollRecipes(); pollHist(); listenEvents();
setInterval(pollState,2000); setInterval(pollHist,5000); setInterval(pollRecipes,10000);
</script></body></html>`;

loadRecipes();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  // [v193 修复] 原来 writeHead(204) 之后再 setHeader → 抛 ERR_HTTP_HEADERS_SENT（无 uncaughtException 兜底 → 进程直接崩）。
  //   跨端口页面（5175 → 9877）带 Content-Type 的请求必然先发 OPTIONS 预检 → 小脑一被前端调用就自杀。改为一次写全头。
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    });
    res.end();
    return;
  }
  if (p === '/health') return send(res, 200, { ok:true, service:'motion-hub', protocol:'v1', port, primitives:Object.keys(PRIMITIVES).length, recipes:RECIPES.size });
  if (p === '/console') { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); return res.end(CONSOLE_HTML); }
  if (p === '/api/motion/history')
    return send(res, 200, { success:true, history:motionHistory, note:'T2.3 软分记录（最近10条）' });
  if (p === '/api/motion/primitives')
    return send(res, 200, { success:true, version:'motion_protocol_v1', primitives:PRIMITIVES,
      recipes: recipesSummary().filter(r=>r.runnable).map(r=>r.id),
      usage:'POST /api/motion/request {"mode":"param","action":"jump","params":{}} 或 {"mode":"script","script":[{"action":"wave","params":{}}]} 或 {"mode":"recipe","recipe":"invite"}' });
  if (p === '/api/motion/state')
    return send(res, 200, { success:true, state, currentAction:curAction, currentReqId:curReqId, currentParams:curParams, listeners:listeners.size });
  if (p === '/api/recipes' && req.method === 'GET')
    return send(res, 200, { success:true, recipes: recipesSummary(),
      usage:'POST /api/motion/request {"mode":"recipe","recipe":"invite","params":{}}；试跑确认后 POST /api/recipes/verify {"id":"invite","verified":true} 写回' });
  if (p === '/api/recipes/verify' && req.method === 'POST') {
    let buf=''; req.on('data',c=>buf+=c);
    req.on('end',()=>{
      try {
        const b = JSON.parse(buf||'{}');
        const rec = typeof b.id === 'string' ? RECIPES.get(b.id) : null;
        if (!rec) return send(res, 404, { ok:false, error:'配方不存在: ' + b.id });
        rec.def.verified = !!b.verified;
        try {
          const raw = JSON.parse(fs.readFileSync(RECIPE_PATH, 'utf8'));
          const arr = Array.isArray(raw) ? raw : raw.recipes;
          const it = arr.find(x => x && x.id === b.id);
          if (it) it.verified = !!b.verified;
          const tmp = RECIPE_PATH + '.tmp';
          fs.writeFileSync(tmp, JSON.stringify(raw, null, 2));
          fs.renameSync(tmp, RECIPE_PATH);
          emit('recipe_verified', { id:b.id, verified:!!b.verified });
          return send(res, 200, { ok:true, id:b.id, verified:!!b.verified, note:'已写回 recipes.json' });
        } catch (e2) { return send(res, 500, { ok:false, error:'写回失败: ' + e2.message }); }
      } catch (e) { return send(res, 400, { ok:false, error:String(e) }); }
    });
    return;
  }
  if (p === '/api/motion/request' && req.method === 'POST') {
    let buf=''; req.on('data',c=>buf+=c);
    req.on('end',()=>{ try { handleRequest(JSON.parse(buf||'{}'), res); } catch(e){ send(res,400,{ok:false,code:'BAD_JSON',error:String(e)}); } });
    return;
  }
  if (p === '/api/motion/interrupt') {
    if (state !== 'solving') return send(res, 200, { ok:true, state, note:'当前无进行中动作' });
    interruptFlag = true;
    return send(res, 200, { ok:true, note:'打断信号已发出，求解器下一拍收敛回 idle' });
  }
  if (p === '/api/motion/events') {
    res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
    res.write(`event: hello\ndata: ${JSON.stringify({state,currentAction:curAction})}\n\n`);
    const l = evt => { try{ res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`);}catch{} };
    listeners.add(l);
    req.on('close', ()=>listeners.delete(l));
    return;
  }
  send(res, 404, { ok:false, error:'not found', endpoints:['/health','/console','/api/motion/primitives','/api/motion/state','/api/motion/request','/api/motion/interrupt','/api/motion/events','/api/motion/history','/api/recipes','/api/recipes/verify'] });
});

const port = Number(process.argv[2]) || 9877;
server.listen(port, '127.0.0.1', () => console.log(`[motion-hub] listening http://127.0.0.1:${port} (protocol v1, primitives=${Object.keys(PRIMITIVES).length}, recipes=${RECIPES.size})`));
