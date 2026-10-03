// ============================================================================
// humanoidRig.ts — 标准人形关节抽象层（v64 通用骨骼层·核心定义）
// ----------------------------------------------------------------------------
// 借鉴：Unity Humanoid Avatar（动作定义在模板空间，与具体骨架解耦）
//       VRM 1.0 规范的标准人形骨骼名（vrm-c/vrm-specification humanoid.md）
//       Blender 约束式重定向（动作→标准骨架→角色骨架跟随）
//
// 设计：动作配方/导入动作（VMD/BVH）一律定义在"标准关节+语义轴"空间，
//       经 NameResolver（模型骨骼名↔标准关节）与 AxisAdapter（语义轴→实际轴）
//       翻译后驱动任意人形模型。换模型 = 换 profile，动作零改动。
// ============================================================================

/** 标准关节名（VRM 1.0 风格，全模型统一词汇表） */
export type StdJoint =
  | 'hips'
  | 'spine' | 'chest' | 'upperChest'
  | 'neck' | 'head'
  | 'leftShoulder' | 'rightShoulder'
  | 'leftUpperArm' | 'rightUpperArm'
  | 'leftLowerArm' | 'rightLowerArm'      // 前臂/肘
  | 'leftHand' | 'rightHand'
  | 'leftUpperLeg' | 'rightUpperLeg'      // 大腿（MMD"足"）
  | 'leftLowerLeg' | 'rightLowerLeg'      // 小腿（MMD"ひざ"）
  | 'leftFoot' | 'rightFoot'              // 脚踝（MMD"足首"）
  | 'leftToes' | 'rightToes'             // 脚尖（MMD"つま先"）
  // [v97] 手指通道（20 条）：{thumb,index,middle,ring,little} × {base,tip} × 左右
  //   MMD 指骨 3 节：base=第1节, tip=第2+3节合并驱动（省通道保表现）
  | 'leftThumbBase' | 'leftThumbTip' | 'leftIndexBase' | 'leftIndexTip'
  | 'leftMiddleBase' | 'leftMiddleTip' | 'leftRingBase' | 'leftRingTip'
  | 'leftLittleBase' | 'leftLittleTip'
  | 'rightThumbBase' | 'rightThumbTip' | 'rightIndexBase' | 'rightIndexTip'
  | 'rightMiddleBase' | 'rightMiddleTip' | 'rightRingBase' | 'rightRingTip'
  | 'rightLittleBase' | 'rightLittleTip';

/** 全部标准关节 */
export const ALL_STD_JOINTS: StdJoint[] = [
  'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftShoulder', 'rightShoulder',
  'leftUpperArm', 'rightUpperArm',
  'leftLowerArm', 'rightLowerArm',
  'leftHand', 'rightHand',
  'leftUpperLeg', 'rightUpperLeg',
  'leftLowerLeg', 'rightLowerLeg',
  'leftFoot', 'rightFoot', 'leftToes', 'rightToes',
  // [v97] 手指 20 通道
  'leftThumbBase', 'leftThumbTip', 'leftIndexBase', 'leftIndexTip',
  'leftMiddleBase', 'leftMiddleTip', 'leftRingBase', 'leftRingTip',
  'leftLittleBase', 'leftLittleTip',
  'rightThumbBase', 'rightThumbTip', 'rightIndexBase', 'rightIndexTip',
  'rightMiddleBase', 'rightMiddleTip', 'rightRingBase', 'rightRingTip',
  'rightLittleBase', 'rightLittleTip',
];

/** 语义轴：动作词汇表（配方/AI 用语义，不碰物理轴） */
export type SemanticAxis =
  | 'lift'        // 抬起（上臂上抬/举手）
  | 'drop'        // 放下（lift 反向，肩下沉类）
  | 'swingFwd'    // 前摆
  | 'swingBack'   // 后摆
  | 'swingSide'   // 侧摆（水平面）
  | 'bend'        // 单向弯曲（肘/膝）
  | 'twist'       // 绕骨骼长轴自转（前臂捩/手掌翻转）
  | 'side'        // 侧偏（腕侧摆）
  | 'flex'        // 屈伸（腕/踝）
  | 'turn'        // 水平转动（颈/腰）
  | 'lean'        // 前后倾（脊柱）
  | 'tilt';       // 侧倾（头/脊柱）

/** 一个标准关节的关键帧轨道（配方/AI 的最小单元） */
export interface StdTrack {
  joint: StdJoint;
  semantic: SemanticAxis;
  /** 时间轴关键帧：t=ms（相对动作开始），deg=目标角度（度） */
  keys: Array<{ t: number; deg: number }>;
}

/** 标准空间动作（与模型无关，可保存/分享/导入导出） */
export interface StdMotion {
  id: string;
  name?: string;
  durationMs: number;
  loop?: boolean;
  tracks: StdTrack[];
}

/** 语义轴 → 实际骨骼局部轴映射项 */
export interface AxisBinding {
  /** 实际骨骼名（缺省 = 该标准关节的默认骨骼） */
  bone?: string;
  axis: 'x' | 'y' | 'z';
  sign: 1 | -1;
  /** 实测备注（采样位移量等） */
  note?: string;
}

/** 模型运动档案：标准关节 → 骨骼名 + 语义轴绑定 */
export interface ModelMotionProfile {
  model: string;
  /** 标准关节 → 实际骨骼名（NameResolver 结果） */
  joints: Partial<Record<StdJoint, string>>;
  /** 标准关节 → 语义轴绑定（ModelProfiler 结果 / 手测冷启动） */
  axes: Partial<Record<StdJoint, Partial<Record<SemanticAxis, AxisBinding>>>>;
  /** 未匹配的标准关节 */
  missing?: StdJoint[];
  generatedAt?: string;
  generator?: 'hand-calibrated' | 'profiler' | 'hand-calibrated(mirror-left)'
    | 'stored'            // 人工/AI 校对后经 profileStore 固化的档案
    | 'auto-name-resolver'; // 仅名称解析（无 axes，配方不可播放）
}
