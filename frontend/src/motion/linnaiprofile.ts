// ============================================================================
// linnaiProfile.ts — 琳奈（PMX 412 骨骼）运动档案
// ----------------------------------------------------------------------------
// 来源：2026-08-31 CDP 世界坐标采样实测（0.5rad 逐轴测试）。
// 右侧为直接实测；左侧按镜像假设生成（X 语义取反，Y/Z 同向）——
// 首次使用左手动作时若方向相反，运行 sign 取反即可（App 侧可暴露修正开关）。
// ============================================================================
import type { ModelMotionProfile } from './humanoidrig';

const R_ARM_LIFT = { axis: 'z' as const, sign: -1 as const, note: 'Z+ 使手落下 y-2.67 → Z-=上抬' };
const R_ARM_FWd = { axis: 'x' as const, sign: 1 as const, note: 'X+ 前臂向前抬 z+1.40' };
const R_ARM_BACK = { axis: 'y' as const, sign: 1 as const, note: 'Y+ 水平面内向后摆 z-2.16' };

export const LINNAI_PROFILE: ModelMotionProfile = {
  model: '琳奈_泳装',
  generator: 'hand-calibrated',
  generatedAt: '2026-09-02',
  joints: {
    hips: 'センター',
    spine: '上半身',
    chest: '上半身1',
    upperChest: '上半身2',
    neck: '首',
    head: '頭',
    rightShoulder: '右肩',
    rightUpperArm: '右腕',
    rightLowerArm: '右ひじ',
    rightHand: '右手首',
    leftShoulder: '左肩',
    leftUpperArm: '左腕',
    leftLowerArm: '左ひじ',
    leftHand: '左手首',
    rightUpperLeg: '右足D',
    rightLowerLeg: '右ひざ',
    rightFoot: '右足首',
    leftUpperLeg: '左足D',
    leftLowerLeg: '左ひざ',
    leftFoot: '左足首',
  },
  axes: {
    head: {
      lean: { axis: 'x', sign: 1, note: '頭 X+ 点头前倾（nod 主源，待实测可调 sign）' },
      turn: { axis: 'y', sign: 1, note: '頭 Y+ 水平转（shake/turnHead）' },
    },
    neck: {
      lean: { axis: 'x', sign: 1, note: '首 X+ 点头跟随' },
      turn: { axis: 'y', sign: 1, note: '首 Y+ 水平转跟随' },
    },
    rightUpperArm: {
      lift: R_ARM_LIFT,
      swingFwd: R_ARM_FWd,
      swingBack: R_ARM_BACK,
    },
    leftUpperArm: {
      lift: { axis: 'z', sign: -1, note: '镜像假设（未实测）' },
      swingFwd: { axis: 'x', sign: -1, note: '镜像假设' },
      swingBack: { axis: 'y', sign: 1, note: '镜像假设' },
    },
    rightLowerArm: {
      bend: { axis: 'z', sign: -1, note: '肘 Z- 前臂向头侧上竖 y+1.37（挥手竖前臂关键）' },
    },
    leftLowerArm: {
      bend: { axis: 'z', sign: -1, note: '镜像假设（未实测）' },
    },
    rightHand: {
      side: { axis: 'z', sign: 1, note: '腕 Z 侧摆（挥手主源，幅度可放大）' },
      flex: { axis: 'x', sign: 1, note: 'X+ 手掌屈伸 z+0.15' },
    },
    leftHand: {
      side: { axis: 'z', sign: 1, note: '镜像假设' },
      flex: { axis: 'x', sign: 1, note: '镜像假设' },
    },
    rightShoulder: {
      drop: { axis: 'z', sign: 1, note: '肩 Z+ 下沉 y-0.54' },
    },
    leftShoulder: {
      drop: { axis: 'z', sign: 1, note: '镜像假设' },
    },
    rightUpperLeg: {
      swingFwd: { bone: '右足D', axis: 'x', sign: 1, note: '大腿前摆（未逐轴实测，待 Profiler 校准）' },
    },
    rightLowerLeg: {
      bend: { axis: 'x', sign: 1, note: '膝 X 单轴 小腿摆 z+1.97' },
    },
    leftLowerLeg: {
      bend: { axis: 'x', sign: 1, note: '镜像假设' },
    },
    spine: {
      lean: { axis: 'x', sign: 1, note: '上半身 X+ 后仰 z-1.38' },
      turn: { axis: 'y', sign: 1, note: '上半身 Y+ 左转 x-0.20' },
    },
    // 前臂捩（twist）在 MMD 是独立骨骼链：右腕捩1-3（肘与腕之间）
    // twist 语义的 bone 覆盖到捩骨：
    // （放在 rightLowerArm.twist —— retarget 时 bone 覆盖优先生效）
  },
};

// 补充：twist 绑定（独立骨骼）
LINNAI_PROFILE.axes.rightLowerArm!.twist = { bone: '右腕捩1', axis: 'y', sign: 1, note: '前臂自转 位移1.5 大幅可用' };
LINNAI_PROFILE.axes.leftLowerArm!.twist = { bone: '左腕捩1', axis: 'y', sign: 1, note: '镜像假设' };
LINNAI_PROFILE.axes.rightHand!.twist = { bone: '右手捩1', axis: 'y', sign: 1, note: '手部捩' };
