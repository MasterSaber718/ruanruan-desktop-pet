// ============================================================================
// profiler.ts — 模型轴签名采样器（任意 PMX 通用的客观校准数据源）
// ----------------------------------------------------------------------------
// 设计原则（自辩结论 2026-09-05）：本模块【不做语义猜测】。
// 它只回答一个客观问题：把某根骨骼沿某条局部轴转 testAngle，末端（子骨骼头）
// 在世界空间里往哪边移动、动了多少。这是 100% 可复现的测量数据。
// 语义固化（这个轴=lift/bend/twist）由人工或 AI 校对签名 JSON 后写入 profile，
// 避免"模型朝向不同 → 方向猜反 → 日志全对但动作反着来"的幻觉路径。
//
// 用法（引擎控制台）：
//   const r = window.__calibrateProfile();   // 采样当前模型全部标准关节
//   console.table(r.errors);                 // 看失败原因
//   复制 r.signatures JSON → 校对后写入 profileStore（window.__saveProfile）
// ============================================================================

import { Quaternion, Space } from '@babylonjs/core';
import type { StdJoint } from './humanoidrig';

/** 单轴采样结果 */
export interface AxisSample {
  axis: 'x' | 'y' | 'z';
  /** 末端世界位移（模型当前朝向的世界系，注意含引擎级转身的影响） */
  dx: number;
  dy: number;
  dz: number;
  /** 位移模长 */
  mag: number;
  /** 模长/骨长。经验阈值：≈0 视为绕骨骼长轴自转（twist 候选） */
  relMag: number;
}

/** 单个标准关节的签名 */
export interface JointSignature {
  joint: StdJoint;
  /** 实际被采样的骨骼名 */
  bone: string;
  /** 作为末端观测点的子骨骼名（null=无子骨骼，未能采样） */
  tipBone: string | null;
  /** 骨长（骨骼头到子骨骼头距离），位移相对值的分母 */
  boneLen: number;
  samples: AxisSample[];
}

export interface SignatureResult {
  signatures: Partial<Record<StdJoint, JointSignature>>;
  errors: string[];
}

const TEST_ANGLE = 0.5; // rad，与琳奈档案人工校准时的角度一致，数据可比

/**
 * 采样一批标准关节的轴签名。
 * @param skeleton Babylon Skeleton（analysis.skeleton.bones 的宿主）
 * @param joints 标准关节 → 骨骼名 映射（来自 profile.joints）
 */
export function sampleJointSignatures(
  skeleton: any,
  joints: Partial<Record<StdJoint, string>>,
  testAngle: number = TEST_ANGLE
): SignatureResult {
  const signatures: Partial<Record<StdJoint, JointSignature>> = {};
  const errors: string[] = [];
  const bones: any[] = skeleton?.bones || [];
  const findBone = (name: string) => bones.find((b: any) => b.name === name);

  const updateMatrices = () => {
    try {
      skeleton.computeAbsoluteMatrices?.(true);
    } catch (_) {
      try { skeleton.computeAbsoluteMatrices?.(); } catch (_2) { /* noop */ }
    }
  };

  for (const joint of Object.keys(joints) as StdJoint[]) {
    const boneName = joints[joint]!;
    const bone = findBone(boneName);
    if (!bone) {
      errors.push(`${joint}: 骨骼 "${boneName}" 不存在`);
      continue;
    }

    // 末端观测点：第一个有绝对位置的子骨骼
    let tipBone: any = null;
    try {
      const children: any[] = bone.getChildren ? bone.getChildren() : (bone.children || []);
      tipBone = children.find((c: any) => typeof c.getAbsolutePosition === 'function') || null;
    } catch (_) {
      tipBone = (bone.children || []).find((c: any) => typeof c.getAbsolutePosition === 'function') || null;
    }
    if (!tipBone) {
      errors.push(`${joint}: 骨骼 "${boneName}" 无可用子骨骼作末端观测点，跳过`);
      continue;
    }

    updateMatrices();
    let before: any;
    try {
      before = tipBone.getAbsolutePosition().clone();
    } catch (e: any) {
      errors.push(`${joint}: 读取末端绝对位置失败 (${e?.message || e})`);
      continue;
    }

    // 骨长 = 骨骼头到末端观测点的距离（静置姿态下）
    let boneHead: any;
    try {
      boneHead = bone.getAbsolutePosition();
    } catch (_) { boneHead = null; }
    const boneLen = boneHead
      ? Math.sqrt((before.x - boneHead.x) ** 2 + (before.y - boneHead.y) ** 2 + (before.z - boneHead.z) ** 2)
      : 0;

    // 保存原始姿态（与 safeRotateJoint 同路径：LOCAL 四元数 + 位置强制还原）
    let prevQuat: any = null;
    try {
      prevQuat = bone.getRotationQuaternion(Space.LOCAL)?.clone() ?? null;
    } catch (_) { prevQuat = null; }
    let originalPos: any = null;
    try {
      originalPos = bone.getLocalMatrix().getTranslation().clone();
    } catch (_) { originalPos = null; }

    const samples: AxisSample[] = [];
    for (const axis of ['x', 'y', 'z'] as const) {
      const rx = axis === 'x' ? testAngle : 0;
      const ry = axis === 'y' ? testAngle : 0;
      const rz = axis === 'z' ? testAngle : 0;
      try {
        const quat = Quaternion.FromEulerAngles(rx, ry, rz);
        bone.setRotationQuaternion(quat, Space.LOCAL);
        if (originalPos) bone.setPosition(originalPos, Space.LOCAL);
        updateMatrices();
        const after = tipBone.getAbsolutePosition();
        const dx = after.x - before.x;
        const dy = after.y - before.y;
        const dz = after.z - before.z;
        const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
        samples.push({ axis, dx, dy, dz, mag, relMag: boneLen > 1e-6 ? mag / boneLen : 0 });
      } catch (e: any) {
        errors.push(`${joint}.${axis}: 采样失败 (${e?.message || e})`);
      } finally {
        // 无条件还原原始姿态
        try {
          if (prevQuat) bone.setRotationQuaternion(prevQuat, Space.LOCAL);
          else bone.setRotationQuaternion(Quaternion.Identity(), Space.LOCAL);
          if (originalPos) bone.setPosition(originalPos, Space.LOCAL);
          updateMatrices();
        } catch (_) { /* noop */ }
      }
    }

    signatures[joint] = { joint, bone: boneName, tipBone: tipBone.name || null, boneLen, samples };
  }

  return { signatures, errors };
}

/**
 * 把签名结果整理成便于人工/AI 校对的紧凑 JSON（每关节一行：轴→位移向量）。
 */
export function signaturesToReviewJson(result: SignatureResult): object {
  const out: Record<string, any> = {};
  for (const [joint, sig] of Object.entries(result.signatures)) {
    const s = sig as JointSignature;
    out[joint] = {
      bone: s.bone,
      tip: s.tipBone,
      boneLen: Number(s.boneLen.toFixed(4)),
      axes: Object.fromEntries(
        s.samples.map((sp) => [
          sp.axis,
          { d: [+sp.dx.toFixed(4), +sp.dy.toFixed(4), +sp.dz.toFixed(4)], rel: +sp.relMag.toFixed(3) },
        ])
      ),
    };
  }
  out._errors = result.errors;
  return out;
}
