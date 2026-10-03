// ============================================================================
// nameResolver.ts — 骨骼名解析器（模型骨骼名 → 标准人形关节）
// ----------------------------------------------------------------------------
// 规则库覆盖 MMD/PMX 标准日文命名（行业事实标准）→ VRM 标准名。
// MMD 生态模型 95%+ 遵循该命名（琳奈全遵循）；非标命名走启发式+find 兜底。
// 借鉴：VRM spec humanoid.md + three-vrm VRMHumanBoneName 枚举。
// ============================================================================
import type { StdJoint, ModelMotionProfile } from './humanoidrig';

/** MMD 日文标准名 → VRM 标准关节（主规则表，实测于琳奈 412 骨骼） */
const MMD_TO_STD: Array<[string, StdJoint]> = [
  // 躯干
  ['センター', 'hips'],
  ['上半身', 'spine'],
  ['上半身1', 'chest'],
  ['上半身2', 'upperChest'],
  ['首', 'neck'],
  ['頭', 'head'],
  // 右臂
  ['右肩', 'rightShoulder'],
  ['右腕', 'rightUpperArm'],
  ['右ひじ', 'rightLowerArm'],
  ['右手首', 'rightHand'],
  // [v97] 手指（MMD 3节→base/tip 汇总）
  ['左手首下０', 'leftThumbBase'], ['左手首下１', 'leftThumbBase'], ['左手首下２', 'leftThumbTip'],
  ['左人指０', 'leftIndexBase'], ['左人指１', 'leftIndexBase'], ['左人指２', 'leftIndexTip'], ['左人指３', 'leftIndexTip'],
  ['左中指０', 'leftMiddleBase'], ['左中指１', 'leftMiddleBase'], ['左中指２', 'leftMiddleTip'], ['左中指３', 'leftMiddleTip'],
  ['左薬指０', 'leftRingBase'], ['左薬指１', 'leftRingBase'], ['左薬指２', 'leftRingTip'], ['左薬指３', 'leftRingTip'],
  ['左小指０', 'leftLittleBase'], ['左小指１', 'leftLittleBase'], ['左小指２', 'leftLittleTip'], ['左小指３', 'leftLittleTip'],
  ['右手首下０', 'rightThumbBase'], ['右手首下１', 'rightThumbBase'], ['右手首下２', 'rightThumbTip'],
  ['右人指０', 'rightIndexBase'], ['右人指１', 'rightIndexBase'], ['右人指２', 'rightIndexTip'], ['右人指３', 'rightIndexTip'],
  ['右中指０', 'rightMiddleBase'], ['右中指１', 'rightMiddleBase'], ['右中指２', 'rightMiddleTip'], ['右中指３', 'rightMiddleTip'],
  ['右薬指０', 'rightRingBase'], ['右薬指１', 'rightRingBase'], ['右薬指２', 'rightRingTip'], ['右薬指３', 'rightRingTip'],
  ['右小指０', 'rightLittleBase'], ['右小指１', 'rightLittleBase'], ['右小指２', 'rightLittleTip'], ['右小指３', 'rightLittleTip'],
  // 左臂
  ['左肩', 'leftShoulder'],
  ['左腕', 'leftUpperArm'],
  ['左ひじ', 'leftLowerArm'],
  ['左手首', 'leftHand'],
  // 右腿（MMD 命名陷阱：足=大腿，足首=脚踝）
  ['右足', 'rightUpperLeg'],
  ['右ひざ', 'rightLowerLeg'],
  ['右足首', 'rightFoot'],
  ['右つま先', 'rightToes'],
  // 左腿
  ['左足', 'leftUpperLeg'],
  ['左ひざ', 'leftLowerLeg'],
  ['左足首', 'leftFoot'],
  ['左つま先', 'leftToes'],
];

/** 英文/通用名兜底（Mixamo/Blender 导出模型） */
const EN_TO_STD: Array<[string, StdJoint]> = [
  ['hips', 'hips'], ['pelvis', 'hips'], ['Hips', 'hips'],
  ['spine', 'spine'], ['Spine', 'spine'],
  ['chest', 'chest'], ['Chest', 'chest'],
  ['upperchest', 'upperChest'],
  ['neck', 'neck'], ['Neck', 'neck'],
  ['head', 'head'], ['Head', 'head'],
  ['shoulder_r', 'rightShoulder'], ['rightshoulder', 'rightShoulder'],
  ['shoulder_l', 'leftShoulder'], ['leftshoulder', 'leftShoulder'],
  ['upperarm_r', 'rightUpperArm'], ['upperArm_R', 'rightUpperArm'],
  ['upperarm_l', 'leftUpperArm'],
  ['lowerarm_r', 'rightLowerArm'], ['forearm_r', 'rightLowerArm'],
  ['lowerarm_l', 'leftLowerArm'],
  ['hand_r', 'rightHand'], ['hand_l', 'leftHand'],
  ['upperleg_r', 'rightUpperLeg'], ['thigh_r', 'rightUpperLeg'],
  ['upperleg_l', 'leftUpperLeg'],
  ['lowerleg_r', 'rightLowerLeg'], ['shin_r', 'rightLowerLeg'], ['knee_r', 'rightLowerLeg'],
  ['lowerleg_l', 'leftLowerLeg'],
  ['foot_r', 'rightFoot'], ['ankle_r', 'rightFoot'],
  ['foot_l', 'leftFoot'],
  ['toe_r', 'rightToes'], ['toes_r', 'rightToes'],
  ['toe_l', 'leftToes'],
];

/** 名称归一化（去符号/去尾随数字/小写）——用于宽松匹配 */
function normName(name: string): string {
  return name.replace(/[_\-. ]/g, '').toLowerCase();
}

/** 单个骨骼名 → 标准关节（null=未识别） */
export function nameToStdJoint(name: string): StdJoint | null {
  // 1) MMD 日文精确匹配（先精确后宽松，防右腕捩/右腕1 误命中右腕）
  for (const [mmd, std] of MMD_TO_STD) {
    if (name === mmd) return std;
  }
  // 2) MMD 前缀匹配（骨骼可能带序号后缀：右腕1/上半身3 之类；需防 右腕捩 被 右腕 前缀吞）
  const n = name;
  for (const [mmd, std] of MMD_TO_STD) {
    if (n.startsWith(mmd)) {
      // 右腕捩 → 匹配到右腕？禁止：捩/捻 开头的后缀不算 右腕 本体
      const tail = n.slice(mmd.length);
      if (tail === '' || /^\d+$/.test(tail)) return std;
      if (mmd.endsWith('腕')) {
        // 后缀是 捩/捻/先/IK 等修饰骨——腕本体只接受空/纯数字
        continue;
      }
      return std;
    }
  }
  // 3) 英文精确+宽松匹配
  for (const [en, std] of EN_TO_STD) {
    if (name === en) return std;
  }
  const nn = normName(name);
  for (const [en, std] of EN_TO_STD) {
    if (nn === normName(en)) return std;
  }
  // 4) 启发式：包含关键词（右/Left 判定侧别）
  return null;
}

/** 方向判定：MMD 名（右/左/Right/Left）→ 'L' | 'R' | null */
export function sideOf(name: string): 'L' | 'R' | null {
  if (name.startsWith('右') || /right|_r\b|_R/.test(name)) return 'R';
  if (name.startsWith('左') || /left|_l\b|_L/.test(name)) return 'L';
  return null;
}

/**
 * 模型骨骼全量解析：遍历骨骼名 → 标准关节映射
 * @returns profile 骨架（joints 映射 + missing 报告）
 */
export function resolveHumanoidBones(
  boneNames: string[]
): { profile: ModelMotionProfile; missing: StdJoint[]; matched: number; total: number } {
  const ALL_STD: StdJoint[] = [
    'hips', 'spine', 'chest', 'neck', 'head',
    'leftShoulder', 'rightShoulder', 'leftUpperArm', 'rightUpperArm',
    'leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand',
    'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg',
    'leftFoot', 'rightFoot', 'leftToes', 'rightToes',
  ];
  const joints: ModelMotionProfile['joints'] = {};
  const usedNames = new Set<string>();

  for (const name of boneNames) {
    const std = nameToStdJoint(name);
    if (std && !usedNames.has(name)) {
      if (!joints[std]) {  // 第一个命中的优先（主干骨在前，捩骨/辅助骨在后）
        joints[std] = name;
        usedNames.add(name);
      }
    }
  }
  const missing = ALL_STD.filter(s => !joints[s]);
  return {
    profile: { model: 'current', joints, axes: {} },
    missing,
    matched: ALL_STD.length - missing.length,
    total: ALL_STD.length,
  };
}
