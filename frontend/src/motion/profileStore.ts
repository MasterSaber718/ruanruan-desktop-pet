// ============================================================================
// profileStore.ts — 模型运动档案仓库（任意 PMX 通用的档案解析入口）
// ----------------------------------------------------------------------------
// 档案来源三层优先级（高→低）：
//   1. stored   人工/AI 校对后固化的档案（localStorage 按模型名持久化）
//   2. builtin  内置实测档案（目前仅琳奈，模型名含"琳奈"才命中）
//   3. auto     纯名称解析（nameResolver 结果，只有 joints 没有 axes——
//               配方播放时会按 retarget 规则跳过并报告，绝不猜方向）
// 换模型的正确姿势：
//   a) 载入 PMX → window.__humanoid 看名称解析命中率
//   b) window.__calibrateProfile() 采样轴签名 → 校对 JSON
//   c) 写好档案 → window.__saveProfile(档案) 固化 → 以后自动命中 stored
// ============================================================================

import type { ModelMotionProfile } from './humanoidrig';
import { LINNAI_PROFILE } from './linnaiprofile';

const KEY_PREFIX = 'pet.profile.v1:';

/** 从 localStorage 读人工固化档案 */
export function loadStoredProfile(modelName: string): ModelMotionProfile | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + modelName);
    if (!raw) return null;
    const p = JSON.parse(raw) as ModelMotionProfile;
    if (!p || typeof p !== 'object' || !p.joints) return null;
    p.generator = p.generator || 'stored';
    return p;
  } catch (_) {
    return null;
  }
}

/** 固化人工档案（覆盖同名模型） */
export function saveStoredProfile(modelName: string, profile: ModelMotionProfile): boolean {
  try {
    profile.model = modelName;
    profile.generator = profile.generator || 'stored';
    localStorage.setItem(KEY_PREFIX + modelName, JSON.stringify(profile));
    return true;
  } catch (_) {
    return false;
  }
}

/** 删除人工档案（回退到内置/自动） */
export function clearStoredProfile(modelName: string): void {
  try { localStorage.removeItem(KEY_PREFIX + modelName); } catch (_) { /* noop */ }
}

/** 列出所有已固化档案的模型名 */
export function listStoredProfiles(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) out.push(k.slice(KEY_PREFIX.length));
    }
  } catch (_) { /* noop */ }
  return out;
}

export interface ActiveProfile {
  profile: ModelMotionProfile;
  /** 'stored'=人工固化 | 'builtin'=内置实测 | 'auto'=纯名称解析 */
  source: 'stored' | 'builtin' | 'auto';
  /** 选择依据说明（给控制台/自检报告用） */
  reason: string;
}

/**
 * 解析当前模型应使用的运动档案。
 * 有 axes 才能执行标准配方；auto 来源没有 axes，配方会全部跳过（符合"不猜方向"原则）。
 */
export function resolveActiveProfile(
  modelName: string,
  autoJoints: ModelMotionProfile['joints'],
  missing?: string[]
): ActiveProfile {
  const stored = loadStoredProfile(modelName);
  if (stored && Object.keys(stored.axes || {}).length > 0) {
    return { profile: stored, source: 'stored', reason: `命中人工固化档案 (${modelName})` };
  }
  if (modelName.includes('琳奈')) {
    const p: ModelMotionProfile = JSON.parse(JSON.stringify(LINNAI_PROFILE));
    if (stored) {
      // 人工 joints 覆盖内置（人工优先，axes 仍用内置实测值）
      p.joints = { ...p.joints, ...stored.joints };
    }
    return { profile: p, source: 'builtin', reason: `命中内置实测档案 (${modelName})` };
  }
  const auto: ModelMotionProfile = {
    model: modelName,
    generator: 'auto-name-resolver',
    joints: (stored ? { ...autoJoints, ...stored.joints } : autoJoints),
    axes: {},
    missing: (missing || []) as any,
  };
  const storedNote = stored ? '（含人工 joints 修正）' : '';
  return {
    profile: auto,
    source: 'auto',
    reason: `无档案，纯名称解析${storedNote}——可播放配方为 0，请先 __calibrateProfile 校准`,
  };
}
