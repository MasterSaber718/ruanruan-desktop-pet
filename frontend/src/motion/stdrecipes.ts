// ============================================================================
// stdRecipes.ts — 标准空间动作配方库（AI/创作者/内置共用）
// ----------------------------------------------------------------------------
// 每个配方 = StdMotion（标准空间）。换模型零改动（经 profile 翻译）。
// 挥手配方 = v7 实测校准参数翻译到标准空间（2026-08-31 世界坐标验证）。
// ============================================================================
import type { StdMotion } from './humanoidrig';

/** 挥手（右侧，v7 校准版）：上臂抬 43° + 肘弯 66° 锁定 → 捩±31° + 腕±29° 循环 → 收尾 */
export const WAVE_RIGHT: StdMotion = {
  id: 'wave_right_v7',
  name: '挥手（右）',
  durationMs: 3400,
  loop: false,
  tracks: [
    // 起始段 0-500ms：上臂 Z-43°、肘 Z-66°（竖前臂）
    { joint: 'rightUpperArm', semantic: 'lift', keys: [ { t: 0, deg: 0 }, { t: 500, deg: 43 } ] },
    { joint: 'rightLowerArm', semantic: 'bend', keys: [ { t: 0, deg: 0 }, { t: 500, deg: 66 } ] },
    // 主体段 500-2900ms：捩 Y±31° + 腕 Z±29°（1.2Hz，肩肘锁定不变）
    { joint: 'rightLowerArm', semantic: 'twist', keys: [
      { t: 500, deg: 0 }, { t: 1000, deg: 31 }, { t: 1500, deg: -31 },
      { t: 2000, deg: 31 }, { t: 2500, deg: -31 }, { t: 2900, deg: 0 },
    ] },
    { joint: 'rightHand', semantic: 'side', keys: [
      { t: 500, deg: 0 }, { t: 1000, deg: 29 }, { t: 1500, deg: -29 },
      { t: 2000, deg: 29 }, { t: 2500, deg: -29 }, { t: 2900, deg: 0 },
    ] },
    // 收尾段 2900-3400ms：全轴回零
    { joint: 'rightUpperArm', semantic: 'lift', keys: [ { t: 2900, deg: 43 }, { t: 3400, deg: 0 } ] },
    { joint: 'rightLowerArm', semantic: 'bend', keys: [ { t: 2900, deg: 66 }, { t: 3400, deg: 0 } ] },
  ],
};

/** 挥手（左侧）：镜像关节，参数同 v7 校准版（profile 侧再镜像轴向） */
export const WAVE_LEFT: StdMotion = {
  id: 'wave_left_v7',
  name: '挥手（左）',
  durationMs: 3400,
  loop: false,
  tracks: [
    { joint: 'leftUpperArm', semantic: 'lift', keys: [ { t: 0, deg: 0 }, { t: 500, deg: 43 } ] },
    { joint: 'leftLowerArm', semantic: 'bend', keys: [ { t: 0, deg: 0 }, { t: 500, deg: 66 } ] },
    { joint: 'leftLowerArm', semantic: 'twist', keys: [
      { t: 500, deg: 0 }, { t: 1000, deg: 31 }, { t: 1500, deg: -31 },
      { t: 2000, deg: 31 }, { t: 2500, deg: -31 }, { t: 2900, deg: 0 },
    ] },
    { joint: 'leftHand', semantic: 'side', keys: [
      { t: 500, deg: 0 }, { t: 1000, deg: 29 }, { t: 1500, deg: -29 },
      { t: 2000, deg: 29 }, { t: 2500, deg: -29 }, { t: 2900, deg: 0 },
    ] },
    { joint: 'leftUpperArm', semantic: 'lift', keys: [ { t: 2900, deg: 43 }, { t: 3400, deg: 0 } ] },
    { joint: 'leftLowerArm', semantic: 'bend', keys: [ { t: 2900, deg: 66 }, { t: 3400, deg: 0 } ] },
  ],
};

/** 挥手（双手）：左右轨道并行同相位 */
export const WAVE_BOTH: StdMotion = {
  id: 'wave_both_v7',
  name: '挥手（双）',
  durationMs: 3400,
  loop: false,
  tracks: [
    ...WAVE_RIGHT.tracks,
    ...WAVE_LEFT.tracks,
  ],
};

/** 点头（head nod）——两段往返 */
export const NOD: StdMotion = {
  id: 'nod_v1',
  name: '点头',
  durationMs: 1200,
  loop: false,
  tracks: [
    { joint: 'head', semantic: 'lean' as any, keys: [
      { t: 0, deg: 0 }, { t: 300, deg: 14 }, { t: 600, deg: 4 }, { t: 900, deg: 12 }, { t: 1200, deg: 0 },
    ] },
    { joint: 'neck', semantic: 'lean' as any, keys: [
      { t: 0, deg: 0 }, { t: 300, deg: 8 }, { t: 600, deg: 2 }, { t: 900, deg: 7 }, { t: 1200, deg: 0 },
    ] },
  ],
};

// 说明：nod 的 lean 绑定依赖 profile.axes.head/neck.lean；缺失时自动 skip 并回退硬编码。
export const STD_RECIPES: Record<string, StdMotion> = {
  [WAVE_RIGHT.id]: WAVE_RIGHT,
  [WAVE_LEFT.id]: WAVE_LEFT,
  [WAVE_BOTH.id]: WAVE_BOTH,
  [NOD.id]: NOD,
};

/** petAction id + side → 标准配方 id */
export function resolveStdRecipeId(action: string, params?: any): string | undefined {
  if (action === 'wave') {
    const side = (params && params.side) || 'right';
    if (side === 'left') return WAVE_LEFT.id;
    if (side === 'both') return WAVE_BOTH.id;
    return WAVE_RIGHT.id;
  }
  if (action === 'nod') return NOD.id;
  return undefined;
}

export function getStdRecipe(id: string): StdMotion | undefined {
  return STD_RECIPES[id];
}
