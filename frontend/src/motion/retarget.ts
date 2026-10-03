// ============================================================================
// retarget.ts — 标准空间动作 → 实际骨骼驱动（AxisAdapter + 播放器）
// ----------------------------------------------------------------------------
// 输入：StdMotion（标准空间配方）+ ModelMotionProfile（模型运动档案）
// 输出：按时间轴驱动实际骨骼（drive 回调由宿主注入——BabylonModelViewer 接 safeRotateJoint）
//
// 翻译规则：
//   track(joint, semantic, keys) → profile.axes[joint][semantic]（AxisBinding）
//   → boneName = binding.bone ?? profile.joints[joint]
//   → 实际欧拉角：binding.axis 分量 = deg * sign（度→弧度），其他分量保持 0
//   多 track 同一实际骨骼时按轴合并（各轴独立插值后合成欧拉角）
// ============================================================================
import type { StdMotion, ModelMotionProfile, StdJoint, SemanticAxis } from './humanoidrig';

export interface RetargetTrack {
  boneName: string;
  axis: 'x' | 'y' | 'z';
  sign: 1 | -1;
  keys: Array<{ t: number; deg: number }>;  // 度
}

export interface RetargetPlan {
  durationMs: number;
  loop: boolean;
  tracks: RetargetTrack[];
  /** 翻译报告：跳过的 track（关节/语义无绑定） */
  skipped: Array<{ joint: StdJoint; semantic: SemanticAxis; reason: string }>;
}

/** 标准动作 → 实际驱动计划（纯查表，可缓存） */
export function buildRetargetPlan(motion: StdMotion, profile: ModelMotionProfile): RetargetPlan {
  const skipped: RetargetPlan['skipped'] = [];
  const grouped: Record<string, RetargetTrack> = {};

  for (const track of motion.tracks) {
    const jointAxes = profile.axes[track.joint];
    const binding = jointAxes ? jointAxes[track.semantic] : undefined;
    if (!binding) {
      skipped.push({ joint: track.joint, semantic: track.semantic, reason: 'profile 无该语义轴绑定' });
      continue;
    }
    const boneName = binding.bone || profile.joints[track.joint];
    if (!boneName) {
      skipped.push({ joint: track.joint, semantic: track.semantic, reason: 'profile 无该关节骨骼映射' });
      continue;
    }
    const key = boneName;
    if (!grouped[key]) grouped[key] = { boneName, axis: 'x', sign: 1, keys: [] };
    // 同一骨骼多条 track（不同轴）→ 拆成独立 axisEntry；同轴冲突取后者（后写覆盖）
    // 这里用 "boneName|axis" 作为合并键——sign 不同轴同键会覆盖，调用方配方应避免同骨骼同轴双语义
    const gkey = boneName + '|' + binding.axis;
    if (!grouped[gkey]) grouped[gkey] = { boneName, axis: binding.axis, sign: binding.sign, keys: [] };
    grouped[gkey].keys.push(...track.keys.map(k => ({ t: k.t, deg: k.deg * binding.sign })));
  }

  return {
    durationMs: motion.durationMs,
    loop: !!motion.loop,
    tracks: Object.values(grouped),
    skipped,
  };
}

/** 关键帧插值（线性，首尾 clamp）——度 */
export function evalKeys(keys: Array<{ t: number; deg: number }>, tMs: number): number {
  if (keys.length === 0) return 0;
  if (tMs <= keys[0].t) return keys[0].deg;
  const last = keys[keys.length - 1];
  if (tMs >= last.t) return last.deg;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (tMs >= a.t && tMs <= b.t) {
      const span = b.t - a.t;
      if (span <= 0) return b.deg;
      const k = (tMs - a.t) / span;
      // 平滑插值（smoothstep，比线性更接近弹簧感，零成本）
      const s = k * k * (3 - 2 * k);
      return a.deg + (b.deg - a.deg) * s;
    }
  }
  return last.deg;
}

/** 播放器句柄（宿主用于取消） */
export interface StdMotionPlayer {
  stop: () => void;
  /** 循环动作手动结束（走收尾） */
  finishLoop: () => void;
}

/**
 * 播放标准动作（宿主注入 drive 与 onDone）
 * drive(boneName, eulerDeg {x,y,z}) —— 角度为度，宿主负责转弧度并安全驱动
 */
export function playStdMotion(
  plan: RetargetPlan,
  drive: (boneName: string, eulerDeg: { x: number; y: number; z: number }) => boolean,
  onDone?: (skipped: RetargetPlan['skipped']) => void
): StdMotionPlayer {
  const start = performance.now();
  let stopped = false;
  let loopEnd = plan.loop ? false : true;

  const tick = () => {
    if (stopped) return;
    const elapsed = performance.now() - start;
    let t = elapsed;
    if (plan.loop) {
      if (loopEnd) {
        // 循环被手动结束：停在当前相位，走一个 300ms 收尾回零
        t = plan.durationMs;
      }
    }
    const effT = plan.loop && !loopEnd ? (elapsed % plan.durationMs) : Math.min(t, plan.durationMs);

    // 合成每骨骼欧拉角
    const frame: Record<string, { x: number; y: number; z: number }> = {};
    for (const tr of plan.tracks) {
      const deg = evalKeys(tr.keys, effT);
      const e = (frame[tr.boneName] = frame[tr.boneName] || { x: 0, y: 0, z: 0 });
      e[tr.axis] = deg * tr.sign;
    }
    for (const [bone, e] of Object.entries(frame)) {
      drive(bone, e);
    }

    if (plan.loop && !loopEnd) {
      requestAnimationFrame(tick);
      return;
    }
    if (elapsed < plan.durationMs) {
      requestAnimationFrame(tick);
      return;
    }
    if (onDone) onDone(plan.skipped);
  };
  requestAnimationFrame(tick);

  return {
    stop: () => { stopped = true; },
    finishLoop: () => { loopEnd = true; },
  };
}
