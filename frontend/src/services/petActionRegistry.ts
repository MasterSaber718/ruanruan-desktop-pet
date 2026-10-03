// ============================================================================
// petActionRegistry.ts — AI→动作映射层（对应 Unity 参考工程的 ActionRegistry 思路）
// 职责：AI/外部指令 -> 动作白名单校验 -> 冷却检查 -> 执行
// 接入：BabylonModelViewer 暴露的 window.__petAction / window.__petActionExecutor
// 设计参考：ep（Unity AI 动作框架）的 ActionRegistry/ActionExecutor 白名单+二次校验理念
// ============================================================================

export type PetActionId = 'wave' | 'nod' | 'shake' | 'block' | 'turnHead' | 'turnBody' | 'squat' | 'stretch' | 'turnLeft' | 'turnRight' | 'jump' | 'reset' | 'spin' | 'limbRaise'
  // [2026-09-08 T6.1 P0 批 + 配方解锁批]
  | 'tiltHead' | 'bow' | 'clap' | 'spreadHands' | 'thumbsUp' | 'comeHere' | 'refuse' | 'standUp'
  | 'bendForward' | 'lookUp' | 'lookDown' | 'legKick' | 'point'
  | 'offerHand' | 'bounce' | 'stomp' | 'cheer' | 'approach'
  // [2026-09-17 T7] 动作库 VMD 片段
  | 'vmdClip';

export interface PetActionSpec {
  id: PetActionId;
  label: string;
  desc: string;
  /** 冷却时间 ms：防止 AI 高频重复触发同一动作（动画穿帮/抽搐） */
  cooldownMs: number;
  /** 工作模式是否允许（true=任何模式可执行；false=工作中拒绝） */
  allowedInWork: boolean;
  /** [2026-09-08 时间轴原型] 平衡锁：balance=执行中全身锁定（跳/蹲/转圈等，期间拒绝叠加其它动作）
   *  free=表达动作（只占 channels 列出的通道，未来通道并发调度依据） */
  lock: 'balance' | 'free';
  /** 通道占用：head/spine/armL/armR/legL/legR/root/limb（元数据，人味评估门的硬门输入） */
  channels: string[];
}

const ACTION_SPECS: Record<PetActionId, PetActionSpec> = {
  wave:      { id: 'wave',      label: '挥手', desc: '打招呼(side=left/right/both)', cooldownMs: 2500, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  nod:       { id: 'nod',       label: '点头', desc: '赞同',   cooldownMs: 1500, allowedInWork: true,  lock: 'free',    channels: ['head'] },
  shake:     { id: 'shake',     label: '摇头', desc: '否定',   cooldownMs: 1500, allowedInWork: true,  lock: 'free',    channels: ['head'] },
  block:     { id: 'block',     label: '遮挡', desc: '害羞',   cooldownMs: 3000, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  turnHead:  { id: 'turnHead',  label: '转头', desc: '环顾',   cooldownMs: 2500, allowedInWork: true,  lock: 'free',    channels: ['head'] },
  turnBody:  { id: 'turnBody',  label: '转身', desc: '转身',   cooldownMs: 3000, allowedInWork: false, lock: 'free',    channels: ['spine'] },
  squat:     { id: 'squat',     label: '蹲下', desc: '下蹲',   cooldownMs: 4000, allowedInWork: false, lock: 'balance', channels: ['legL', 'legR', 'spine', 'armL', 'armR'] },
  stretch:   { id: 'stretch',   label: '伸懒腰', desc: '伸展', cooldownMs: 5000, allowedInWork: false, lock: 'balance', channels: ['armL', 'armR', 'spine', 'head'] },
  turnLeft:  { id: 'turnLeft',  label: '左转', desc: '向左转', cooldownMs: 3000, allowedInWork: true,  lock: 'free',    channels: ['spine', 'head'] },
  turnRight: { id: 'turnRight', label: '右转', desc: '向左转', cooldownMs: 3000, allowedInWork: true,  lock: 'free',    channels: ['spine', 'head'] },
  jump:      { id: 'jump',      label: '跳跃', desc: '原地跳跃', cooldownMs: 3500, allowedInWork: false, lock: 'balance', channels: ['legL', 'legR', 'spine', 'armL', 'armR', 'head'] },
  reset:     { id: 'reset',     label: '恢复', desc: '回到自然站姿', cooldownMs: 1000, allowedInWork: true, lock: 'free', channels: [] },
  spin:      { id: 'spin',      label: '转圈', desc: '原地旋转N圈(turns/方向dir)', cooldownMs: 4000, allowedInWork: true, lock: 'balance', channels: ['root'] },
  limbRaise: { id: 'limbRaise', label: '抬臂抬腿', desc: '抬单侧手/腿(side/limb/height，side=both双臂)', cooldownMs: 2200, allowedInWork: true, lock: 'free', channels: ['limb', 'armL', 'armR', 'legL', 'legR'] },
  // ---------------- [2026-09-08 T6.1 P0 批 13+镜像=14] ----------------
  tiltHead:   { id: 'tiltHead',   label: '歪头', desc: '卖萌歪头(side=left/right,angle=0-25°)', cooldownMs: 1800, allowedInWork: true,  lock: 'free',    channels: ['head'] },
  bow:        { id: 'bow',        label: '鞠躬', desc: '礼貌鞠躬(depth=0-1,duration=秒)', cooldownMs: 3000, allowedInWork: true,  lock: 'free',    channels: ['spine', 'head'] },
  clap:       { id: 'clap',       label: '鼓掌', desc: '鼓掌(count=1-6,speed=slow/normal/quick)', cooldownMs: 2500, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  spreadHands:{ id: 'spreadHands',label: '摊手', desc: '无奈摊手(amplitude=0-1,duration=保持秒)', cooldownMs: 2500, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  thumbsUp:   { id: 'thumbsUp',   label: '竖拇指', desc: '点赞(side=left/right/both,hold=保持秒)', cooldownMs: 2500, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  comeHere:   { id: 'comeHere',   label: '招手过来', desc: '招手让人过来(side,count=1-4)', cooldownMs: 2500, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  refuse:     { id: 'refuse',     label: '摆手不要', desc: '摆手拒绝(side,count=1-4)', cooldownMs: 2000, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  standUp:    { id: 'standUp',    label: '起身', desc: '蹲后起身站直(speed=quick/normal/slow)', cooldownMs: 3500, allowedInWork: false, lock: 'balance', channels: ['legL', 'legR', 'spine', 'armL', 'armR'] },
  bendForward:{ id: 'bendForward',label: '弯腰', desc: '弯腰(angle=5-90°,hold=保持秒)', cooldownMs: 3500, allowedInWork: true,  lock: 'free',    channels: ['spine', 'head'] },
  lookUp:     { id: 'lookUp',     label: '仰头', desc: '抬头看上方(angle=5-45°)', cooldownMs: 1800, allowedInWork: true,  lock: 'free',    channels: ['head'] },
  lookDown:   { id: 'lookDown',   label: '低头', desc: '低头看下方/沮丧(angle=5-45°)', cooldownMs: 1800, allowedInWork: true,  lock: 'free',    channels: ['head'] },
  legKick:    { id: 'legKick',    label: '踢腿', desc: '向前踢腿(side=left/right,power=0-1)', cooldownMs: 2500, allowedInWork: false, lock: 'free',    channels: ['legL', 'legR'] },
  point:      { id: 'point',      label: '指向', desc: '指出方向(dir=up/down/left/right,hold=保持秒)', cooldownMs: 2500, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  // ---------------- [2026-09-08 T5 配方解锁批（P1 子集）] ----------------
  offerHand:  { id: 'offerHand',  label: '伸手示意', desc: '掌心向上伸出手(side,hold=保持秒)', cooldownMs: 2500, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  bounce:     { id: 'bounce',     label: '弹跳律动', desc: '原地开心弹跳(freq=Hz,amplitude=0-1,duration=秒)', cooldownMs: 2500, allowedInWork: false, lock: 'free',    channels: ['legL', 'legR', 'spine'] },
  stomp:      { id: 'stomp',      label: '跺脚', desc: '生气跺脚(side,count=1-4,power=0-1)', cooldownMs: 3000, allowedInWork: false, lock: 'free',    channels: ['legL', 'legR'] },
  cheer:      { id: 'cheer',      label: '欢呼', desc: '双臂上扬欢呼(amplitude=0-1,duration=秒)', cooldownMs: 3000, allowedInWork: true,  lock: 'free',    channels: ['armL', 'armR'] },
  approach:   { id: 'approach',   label: '前进靠近', desc: '朝用户走近(steps=1-4步,位移持久生效,speed)', cooldownMs: 4000, allowedInWork: false, lock: 'balance', channels: ['root', 'legL', 'legR', 'armL', 'armR'] },
  // [2026-09-17 T7] 动作库 VMD 片段（库数据=无基础动作时的自然度参考源）
  vmdClip:    { id: 'vmdClip',    label: '动作库片段', desc: '播放VMD资产(params.asset=idle_刘TWT/js_芝麻凛等)', cooldownMs: 1500, allowedInWork: true, lock: 'free', channels: ['spine', 'armL', 'armR', 'legL', 'legR', 'head'] },
};

/** 校验结果 */
export interface ActionCheckResult {
  ok: boolean;
  reason?: string;
}

export class PetActionExecutor {
  private static lastExecuted: Record<string, number> = {};
  private static working = false;

  /** 查询动作规格（AI 可用，决定动作选择） */
  static specs(): PetActionSpec[] {
    return Object.values(ACTION_SPECS);
  }

  static spec(id: string): PetActionSpec | undefined {
    return ACTION_SPECS[id as PetActionId];
  }

  /** 设置工作模式（工作中 turnBody 等动作会被拒绝） */
  static setWorking(working: boolean): void {
    PetActionExecutor.working = working;
  }

  /**
   * 冷却槽位：显式指令（user/api/mcp）与情绪自动反馈分槽，避免自动挥手吃掉用户命令
   * [2026-09-17] 经典问题修复：你好→自动wave→用户再命令挥手被2.5s冷却拒绝
   */
  private static cooldownKey(id: string, source?: string): string {
    const s = (source || '').toLowerCase();
    const explicit = s === 'user' || s === 'api' || s === 'mcp' || s === 'console' || s === 'workbuddy-mcp' || s === 'ai-chat' || s === 'motion' || s === 'diag';
    return explicit ? id + ':user' : id;
  }

  /** 校验：动作是否存在 + 工作模式 + 冷却 */
  static check(id: string, source?: string): ActionCheckResult {
    const spec = ACTION_SPECS[id as PetActionId];
    if (!spec) return { ok: false, reason: '未知动作: ' + id };
    if (PetActionExecutor.working && !spec.allowedInWork) {
      return { ok: false, reason: '工作模式禁止动作: ' + id };
    }
    const key = PetActionExecutor.cooldownKey(id, source);
    const last = PetActionExecutor.lastExecuted[key] || 0;
    const elapsed = performance.now() - last;
    if (elapsed < spec.cooldownMs) {
      return { ok: false, reason: '冷却中: ' + id + '（剩余 ' + Math.ceil((spec.cooldownMs - elapsed) / 1000) + 's）' };
    }
    return { ok: true };
  }

  /**
   * 执行动作（AI 入口）：校验通过才执行
   * @param id 动作 id
   * @param run 实际执行回调（由渲染层提供，如 Babylon 的 triggerAction）
   * @param opts.source 指令来源——显式来源与自动情绪分冷却槽
   */
  static execute(
    id: string,
    run: (id: PetActionId) => void,
    opts?: { source?: string }
  ): ActionCheckResult {
    const check = PetActionExecutor.check(id, opts?.source);
    if (!check.ok) return check;
    PetActionExecutor.lastExecuted[PetActionExecutor.cooldownKey(id, opts?.source)] = performance.now();
    try {
      run(id as PetActionId);
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: '动作执行异常: ' + (e as Error).message };
    }
  }
}

// 全局暴露（供 AI 大脑/外部调用）
(window as any).__petActionExecutor = PetActionExecutor;
