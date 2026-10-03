// ============================================================================
// vmdClipPlayer.ts — 动作库 VMD 资产播放器（T7 渲染侧）
// ----------------------------------------------------------------------------
// 输入：vmd-pipeline 产出的 motion.json（format=ruanlinyun-vmd-asset-v1）
//   keyframes[].bones = { cat: { quat:[x,y,z,w], pos:[x,y,z] } }
// 驱动：cat → 模型骨骼名（多候选）→ setRotationQuaternion(Space.LOCAL)
// 定位：动作库是「无基础动作」时的唯一自然度参考源；本播放器让库数据可直接上桌宠。
// ============================================================================

export interface VmdClipAsset {
  format?: string;
  source?: string;
  durationSec: number;
  timeScale?: number;
  ampScale?: number;
  keyframes: Array<{
    frame: number;
    t: number;
    bones: Record<string, { quat: number[]; pos?: number[] }>;
  }>;
}

export interface VmdClipPlayer {
  stop: () => void;
  finish: () => void;
  assetId: string;
}

/**
 * 管道 cat → 模型骨骼候选名（按优先级）。
 * 琳奈 MMD 命名；腿优先 D 系（网格绑 D 骨，与 squat/jump 同因）。
 * root/センター 是位置锁死骨，v1 只做旋转，不在此表。
 */
export const VMD_CAT_TO_BONE: Record<string, string[]> = {
  // [v194] 可位移的根骨：蹲的下沉 / 跳的腾空 / 走路的位移都靠它（只在此表里做 pos 位移）
  center: ['センター', '全ての親'],
  hips: ['下半身'],
  spine: ['上半身'],
  chest: ['上半身1', '上半身2'],
  neck: ['首'],
  head: ['頭'],
  shoulderL: ['左肩'],
  shoulderR: ['右肩'],
  armL: ['左腕'],
  armR: ['右腕'],
  elbowL: ['左ひじ'],
  elbowR: ['右ひじ'],
  wristL: ['左手首'],
  wristR: ['右手首'],
  legL: ['左足D', '左足'],
  legR: ['右足D', '右足'],
  kneeL: ['左ひざ'],
  kneeR: ['右ひざ'],
  ankleL: ['左足首'],
  ankleR: ['右足首'],
  toeL: ['左つま先'],
  toeR: ['右つま先'],
};

function slerpQuat(a: number[], b: number[], t: number): number[] {
  let [ax, ay, az, aw] = a;
  let [bx, by, bz, bw] = b;
  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; cos = -cos; }
  let s0 = 1 - t, s1 = t;
  if (cos > 0.9995) {
    return [s0 * ax + s1 * bx, s0 * ay + s1 * by, s0 * az + s1 * bz, s0 * aw + s1 * bw];
  }
  const theta = Math.acos(Math.min(1, cos));
  const sin = Math.sin(theta);
  s0 = Math.sin((1 - t) * theta) / sin;
  s1 = Math.sin(t * theta) / sin;
  return [s0 * ax + s1 * bx, s0 * ay + s1 * by, s0 * az + s1 * bz, s0 * aw + s1 * bw];
}

/** 在 skeleton 中解析 cat → Bone（找不到返回 null） */
export function resolveVmdBones(
  skeletonBones: Array<{ name: string }>,
  cats?: string[]
): Map<string, { name: string }> {
  const out = new Map<string, { name: string }>();
  const names = new Set(skeletonBones.map(b => b.name));
  const keys = cats || Object.keys(VMD_CAT_TO_BONE);
  for (const cat of keys) {
    const cands = VMD_CAT_TO_BONE[cat];
    if (!cands) continue;
    for (const n of cands) {
      if (names.has(n)) { out.set(cat, { name: n }); break; }
    }
  }
  return out;
}

/** 采样资产在 tSec 时刻的 cat→pos（位移通道，缺省全 0；用于蹲的下沉、跳的腾空等整体位移） */
export function sampleVmdClipPos(asset: VmdClipAsset, tSec: number): Record<string, number[]> {
  const kfs = asset.keyframes || [];
  if (!kfs.length) return {};
  const t = Math.max(0, Math.min(asset.durationSec || 0, tSec));
  let i0 = 0;
  for (let i = 0; i < kfs.length; i++) {
    if (kfs[i].t <= t) i0 = i; else break;
  }
  const i1 = Math.min(kfs.length - 1, i0 + 1);
  const a = kfs[i0], b = kfs[i1];
  const span = (b.t - a.t) || 1;
  const k = i1 === i0 ? 0 : Math.max(0, Math.min(1, (t - a.t) / span));
  const cats = new Set([...Object.keys(a.bones || {}), ...Object.keys(b.bones || {})]);
  const out: Record<string, number[]> = {};
  for (const cat of cats) {
    const pa = a.bones?.[cat]?.pos;
    const pb = b.bones?.[cat]?.pos;
    if (!pa && !pb) continue;
    const A = pa || [0, 0, 0];
    const B = pb || [0, 0, 0];
    out[cat] = [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
  }
  return out;
}

/** 采样资产在 tSec 时刻的 cat→quat */
export function sampleVmdClip(asset: VmdClipAsset, tSec: number): Record<string, number[]> {
  const kfs = asset.keyframes || [];
  if (!kfs.length) return {};
  const t = Math.max(0, Math.min(asset.durationSec || 0, tSec));
  let i0 = 0;
  for (let i = 0; i < kfs.length; i++) {
    if (kfs[i].t <= t) i0 = i; else break;
  }
  const i1 = Math.min(kfs.length - 1, i0 + 1);
  const a = kfs[i0], b = kfs[i1];
  const span = (b.t - a.t) || 1;
  const k = i1 === i0 ? 0 : Math.max(0, Math.min(1, (t - a.t) / span));
  const cats = new Set([...Object.keys(a.bones || {}), ...Object.keys(b.bones || {})]);
  const frame: Record<string, number[]> = {};
  for (const cat of cats) {
    const qa = a.bones?.[cat]?.quat;
    const qb = b.bones?.[cat]?.quat;
    if (qa && qb) frame[cat] = slerpQuat(qa, qb, k);
    else if (qa) frame[cat] = qa;
    else if (qb) frame[cat] = qb;
  }
  return frame;
}

/**
 * 播放 VMD 资产（旋转通道）。
 * drive(boneName, quat[x,y,z,w]) 由宿主注入（走 safeRotate 或直设四元数）。
 */
export function playVmdClip(
  asset: VmdClipAsset,
  assetId: string,
  drive: (boneName: string, quat: [number, number, number, number], pos?: number[]) => boolean,
  onDone?: (info: { mappedCats: number; durationSec: number }) => void
): VmdClipPlayer {
  const start = performance.now();
  let stopped = false;
  let forceEnd = false;
  const durationMs = Math.max(200, (asset.durationSec || 1) * 1000);
  // 预解析映射由宿主做；这里每帧 sample 后把 cat 交给 drive 的 boneName 参数
  // 宿主传入 catToBone: cat → boneName
  const catToBone = (playVmdClip as any)._catToBone as Map<string, string> | undefined;
  if (!catToBone) {
    console.warn('[VmdClip] 未设置 catToBone，先调用 setVmdCatToBone');
  }

  const tick = () => {
    if (stopped) return;
    const elapsed = performance.now() - start;
    const tSec = forceEnd ? (asset.durationSec || 0) : Math.min(asset.durationSec || 0, elapsed / 1000);
    const frame = sampleVmdClip(asset, tSec);
    const framePos = sampleVmdClipPos(asset, tSec);
    if (catToBone) {
      for (const [cat, q] of Object.entries(frame)) {
        const boneName = catToBone.get(cat);
        if (!boneName || !q || q.length < 4) continue;
        drive(boneName, [q[0], q[1], q[2], q[3]], framePos[cat]);
      }
    }
    if (!forceEnd && elapsed < durationMs) {
      requestAnimationFrame(tick);
      return;
    }
    if (onDone) {
      onDone({
        mappedCats: catToBone ? catToBone.size : 0,
        durationSec: asset.durationSec || 0,
      });
    }
  };
  requestAnimationFrame(tick);

  return {
    assetId,
    stop: () => { stopped = true; },
    finish: () => { forceEnd = true; },
  };
}

/** 宿主注入：cat → 当前模型骨骼名 */
export function setVmdCatToBone(map: Map<string, string> | Record<string, string>): void {
  const m = map instanceof Map ? map : new Map(Object.entries(map));
  (playVmdClip as any)._catToBone = m;
}

/** 从骨架 bone.name 列表构建 cat→boneName 映射并注入 */
export function bindVmdCatsToSkeleton(boneNames: string[]): Map<string, string> {
  const names = new Set(boneNames);
  const map = new Map<string, string>();
  for (const [cat, cands] of Object.entries(VMD_CAT_TO_BONE)) {
    for (const n of cands) {
      if (names.has(n)) { map.set(cat, n); break; }
    }
  }
  setVmdCatToBone(map);
  return map;
}
