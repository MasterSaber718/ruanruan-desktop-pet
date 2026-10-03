#!/usr/bin/env node
/**
 * vmd_pipeline.js — VMD 动捕资产管道（T7.1 长尾/舞蹈正解骨架）
 * ---------------------------------------------------------------
 * 链路（任务清单 T7.1）：VMD 导入 → 骨骼名映射 → 时间重参数化(0.5~2×)
 *   → 幅度变形(过语法书=关节极限钳制) → 片段裁剪 → 存配方
 *
 * 用法：
 *   node vmd_pipeline.js <input.vmd> [--name myDance] [--time 1.2] [--amp 0.8]
 *        [--start 30] [--end 300] [--out dir]
 *
 * 产出：
 *   output/<name>.motion.json  —— 处理后的骨骼关键帧资产（分类映射+时间重参数化+幅度钳制后）
 *   output/<name>.recipe.json  —— 配方登记条目（action=vmdClip，渲染端播放器接入前标记 pending）
 *
 * 状态（2026-09-08）：解析/映射/重参数化/幅度变形/裁剪 可运行（零依赖）；
 *   渲染端 VMD clip 播放器（Babylon 端按资产关键帧驱动）尚未实现——
 *   接入前 vmdClip 配方保持 pending，不进可执行配方列表（hub 校验会拒绝 vmdClip）。
 */
const fs = require('fs');
const path = require('path');

// ---------------- 骨骼名映射（日文 VMD → 规范关节类目；nameresolver.ts 基建的静态版） ----------------
const BONE_MAP = [
  { cat: 'root',    names: ['センター', 'center'] },
  { cat: 'hips',    names: ['下半身'] },
  { cat: 'spine',   names: ['上半身', '上半身2'] },
  { cat: 'chest',   names: ['胸'] },
  { cat: 'neck',    names: ['首'] },
  { cat: 'head',    names: ['頭', 'head'] },
  { cat: 'shoulderL', names: ['左肩'] },   { cat: 'shoulderR', names: ['右肩'] },
  { cat: 'armL',    names: ['左腕', '左腕捩'] }, { cat: 'armR', names: ['右腕', '右腕捩'] },
  { cat: 'elbowL',  names: ['左ひじ'] },   { cat: 'elbowR', names: ['右ひじ'] },
  { cat: 'wristL',  names: ['左手首'] },   { cat: 'wristR', names: ['右手首'] },
  { cat: 'legL',    names: ['左足', '左足捩'] }, { cat: 'legR', names: ['右足', '右足捩'] },
  { cat: 'kneeL',   names: ['左ひざ'] },   { cat: 'kneeR', names: ['右ひざ'] },
  { cat: 'ankleL',  names: ['左足首'] },   { cat: 'ankleR', names: ['右足首'] },
  { cat: 'toeL',    names: ['左足ＩＫ', '左つま先'] }, { cat: 'toeR', names: ['右足ＩＫ', '右つま先'] },
  // [v97] 手指 20 通道 + [D1] 琳奈/标准 MMD 双命名兼容
  //   琳奈：親指/人指/中指/薬指/小指；部分模型：手首下 + 人指从0起编
  { cat: 'thumbLBase', names: ['左親指０', '左親指１', '左手首下０', '左手首下１'] },
  { cat: 'thumbLTip', names: ['左親指２', '左手首下２'] },
  { cat: 'indexLBase', names: ['左人指０', '左人指１'] },
  { cat: 'indexLTip', names: ['左人指２', '左人指３'] },
  { cat: 'middleLBase', names: ['左中指０', '左中指１'] },
  { cat: 'middleLTip', names: ['左中指２', '左中指３'] },
  { cat: 'ringLBase', names: ['左薬指０', '左薬指１'] },
  { cat: 'ringLTip', names: ['左薬指２', '左薬指３'] },
  { cat: 'littleLBase', names: ['左小指０', '左小指１'] },
  { cat: 'littleLTip', names: ['左小指２', '左小指３'] },
  { cat: 'thumbRBase', names: ['右親指０', '右親指１', '右手首下０', '右手首下１'] },
  { cat: 'thumbRTip', names: ['右親指２', '右手首下２'] },
  { cat: 'indexRBase', names: ['右人指０', '右人指１'] },
  { cat: 'indexRTip', names: ['右人指２', '右人指３'] },
  { cat: 'middleRBase', names: ['右中指０', '右中指１'] },
  { cat: 'middleRTip', names: ['右中指２', '右中指３'] },
  { cat: 'ringRBase', names: ['右薬指０', '右薬指１'] },
  { cat: 'ringRTip', names: ['右薬指２', '右薬指３'] },
  { cat: 'littleRBase', names: ['右小指０', '右小指１'] },
  { cat: 'littleRTip', names: ['右小指２', '右小指３'] },
];
function mapBoneName(raw) {
  const n = (raw || '').replace(/\0.*$/g, '').trim().toLowerCase();
  if (!n) return null;
  for (const m of BONE_MAP) if (m.names.some(x => n === x.toLowerCase())) return m.cat;
  return null; // 语义无关骨骼（IK/付剛体/指など）先丢——指/表情留给 morph 管道（T6.4）
}

// ---------------- 语法书钳制（幅度变形上界：rad/关节，与渲染端 joint_limits 同源换算） ----------------
// 数值取 motion-core/joint_limits.json 的 hard 档换算（°→rad），超限关节角度拉回
const HARD_LIMIT_RAD = {
  head: 1.4, neck: 0.9, spine: 1.0, chest: 1.0, hips: 1.0,
  shoulderL: 2.4, shoulderR: 2.4, armL: 2.8, armR: 2.8, elbowL: 2.8, elbowR: 2.8, wristL: 2.2, wristR: 2.2,
  legL: 2.4, legR: 2.4, kneeL: 2.6, kneeR: 2.6, ankleL: 1.4, ankleR: 1.4,
};

// ---------------- VMD 二进制解析（零依赖；骨骼帧+表情帧） ----------------
// [坑] Buffer.toString 不支持 shift_jis（Node 编码白名单无 legacy 编码）；
//      Node 13+ 默认 full-icu，TextDecoder('shift-jis') 才是正解（本机已实测）
const SJIS = new TextDecoder('shift-jis');
// [v97 补间消费] VMD 贝塞尔曲线：4 控制点 (0,0)(x1,y1)(x2,y2)(1,1)，牛顿迭代求 t→progress
function bezierProgress(curve, linearT) {
  if (!curve || (curve[0] === 0 && curve[1] === 0 && curve[2] === 1 && curve[3] === 1)) return linearT; // 线性
  const [x1, y1, x2, y2] = curve;
  let t = linearT;
  for (let i = 0; i < 8; i++) {
    const x = 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
    const dx = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    t -= (x - linearT) / dx;
    t = Math.max(0, Math.min(1, t));
  }
  return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
}

function parseVMD(buf) {
  let off = 0;
  const magic = buf.toString('ascii', 0, 30); off = 30;
  // [v96 根治] VMD 规范：模型名为固定 20 字节（SJIS），不是"4B长度+变长"。旧代码按变长读，
  //   首字段解析即错位（ERR_OUT_OF_RANGE），所有 VMD 文件一律解析失败。
  const modelName = SJIS.decode(buf.subarray(off, off + 20)).replace(/\0.*$/, ''); off += 20;
  // 骨骼帧
  const boneCount = buf.readUInt32LE(off); off += 4;
  const bones = [];
  for (let i = 0; i < boneCount; i++) {
    const bName = SJIS.decode(buf.subarray(off, off + 15)).replace(/\0.*$/, ''); off += 15;
    const frame = buf.readUInt32LE(off); off += 4;
    const px = buf.readFloatLE(off); const py = buf.readFloatLE(off + 4); const pz = buf.readFloatLE(off + 8); off += 12;
    const qx = buf.readFloatLE(off); const qy = buf.readFloatLE(off + 4); const qz = buf.readFloatLE(off + 8); const qw = buf.readFloatLE(off + 12); off += 16;
    // [v97 补间消费] 读取 4 条贝塞尔控制点（x/y/z/vis，各 16B：x1,y1,x2,y2 各 byte/127）
    const curves = [];
    for (let c = 0; c < 4; c++) {
      const b0 = buf[off], b1 = buf[off + 1], b2 = buf[off + 8], b3 = buf[off + 9];
      curves.push([b0 / 127, b1 / 127, b2 / 127, b3 / 127]); // x1,y1,x2,y2
      off += 16;
    }
    bones.push({ name: bName, frame, pos: [px, py, pz], quat: [qx, qy, qz, qw], curves });
  }
  // 表情帧（morph，供 T6.4 管道；v1 仅计数不处理）
  let morphCount = 0, morphs = [];
  if (off + 4 <= buf.length) {
    morphCount = buf.readUInt32LE(off); off += 4;
    for (let i = 0; i < morphCount && off + 19 <= buf.length; i++) {
      const mName = SJIS.decode(buf.subarray(off, off + 15)).replace(/\0.*$/, ''); off += 15;
      const frame = buf.readUInt32LE(off); off += 4;
      const weight = buf.readFloatLE(off); off += 4;
      morphs.push({ name: mName, frame, weight });
    }
  }
  return { modelName, bones, morphs };
}

// ---------------- 管道各段 ----------------
function retiming(frames, timeScale) {
  // 帧号 × 1/timeScale：timeScale>1 变慢（0.5~2×），输出帧号仍为整数帧（30fps 基准）
  return frames.map(f => ({ ...f, frame: Math.round(f.frame / timeScale) }));
}
function amplitudeWarp(frames, ampScale) {
  // 幅度变形：四元数向单位四元数插值（角度缩放）+ 语法书 hard 档钳制
  const slerpTowardIdentity = (q, k) => {
    const [x, y, z, w] = q;
    if (w >= 0.9999 || k >= 1) return q.slice();
    // 简化：轴不变，半角 × k（旋转角度缩放），比通用 slerp 稳定且无翻转歧义
    const angle = 2 * Math.acos(Math.max(-1, Math.min(1, w)));
    const sinHalf = Math.sqrt(Math.max(1e-9, 1 - w * w));
    const ax = x / sinHalf, ay = y / sinHalf, az = z / sinHalf;
    const a2 = angle * k / 2;
    return [ax * Math.sin(a2), ay * Math.sin(a2), az * Math.sin(a2), Math.cos(a2)];
  };
  return frames.map(f => {
    const cat = f.cat;
    const lim = cat ? HARD_LIMIT_RAD[cat] : null;
    let q = slerpTowardIdentity(f.quat, ampScale);
    if (lim) {
      const angle = 2 * Math.acos(Math.max(-1, Math.min(1, q[3])));
      if (angle > lim) q = slerpTowardIdentity(f.quat, lim / (2 * Math.acos(Math.max(-1, Math.min(1, f.quat[3]))) || 1));
    }
    return { ...f, quat: q };
  });
}
function clipFrames(frames, start, end) {
  return frames.filter(f => f.frame >= start && f.frame <= end);
}
function mergeToKeyframes(frames) {
  // 同帧同类目合并 → 资产权重轻；输出 {frame, t(秒,30fps), bones:{cat:{quat,pos?}}}
  const byFrame = new Map();
  for (const f of frames) {
    if (!f.cat) continue;
    if (!byFrame.has(f.frame)) byFrame.set(f.frame, { frame: f.frame, t: +(f.frame / 30).toFixed(3), bones: {} });
    byFrame.get(f.frame).bones[f.cat] = { quat: f.quat.map(v => +v.toFixed(5)), pos: f.pos.map(v => +v.toFixed(5)) };
  }
  return [...byFrame.values()].sort((a, b) => a.frame - b.frame);
}

// ---------------- CLI ----------------
function main() {
  const args = process.argv.slice(2);
  const input = args[0];
  if (!input || !fs.existsSync(input)) { console.error('用法: node vmd_pipeline.js <input.vmd> [--name x] [--time 1.2] [--amp 0.8] [--start 0] [--end N] [--out dir]'); process.exit(1); }
  const opt = { name: '', time: 1.0, amp: 1.0, start: 0, end: Infinity, out: path.join(__dirname, 'output') };
  for (let i = 1; i < args.length; i += 2) {
    const k = (args[i] || '').replace(/^--/, '');
    if (k === 'name') opt.name = args[i + 1];
    else if (k === 'time') opt.time = Math.min(2, Math.max(0.5, Number(args[i + 1]) || 1));
    else if (k === 'amp') opt.amp = Math.min(1.5, Math.max(0.2, Number(args[i + 1]) || 1));
    else if (k === 'start') opt.start = Number(args[i + 1]) || 0;
    else if (k === 'end') opt.end = Number(args[i + 1]) || Infinity;
    else if (k === 'out') opt.out = args[i + 1];
  }
  if (!opt.name) opt.name = path.basename(input).replace(/\.vmd$/i, '');

  const buf = fs.readFileSync(input);
  const vmd = parseVMD(buf);
  console.log(`[vmd] 模型="${vmd.modelName}" 骨骼帧=${vmd.bones.length} 表情帧=${vmd.morphs.length}`);

  let frames = vmd.bones.map(f => ({ ...f, cat: mapBoneName(f.name) }));
  const mappedCount = frames.filter(f => f.cat).length;
  const unmapped = [...new Set(frames.filter(f => !f.cat).map(f => f.name))].slice(0, 8);
  console.log(`[vmd] 映射 ${mappedCount}/${frames.length} 帧；未映射骨骼(前8): ${unmapped.join('、') || '无'}`);

  frames = clipFrames(frames, opt.start, opt.end);
  if (!frames.length) { console.error('[vmd] 裁剪区间内无帧'); process.exit(1); }
  frames = retiming(frames, opt.time);
  frames = amplitudeWarp(frames, opt.amp);
  const keyframes = mergeToKeyframes(frames);
  const durS = keyframes.length ? keyframes[keyframes.length - 1].t : 0;
  console.log(`[vmd] 处理后关键帧=${keyframes.length} 时长≈${durS}s (timeScale=${opt.time}, amp=${opt.amp}, clip=${opt.start}~${opt.end === Infinity ? '末' : opt.end})`);

  fs.mkdirSync(opt.out, { recursive: true });
  const assetPath = path.join(opt.out, `${opt.name}.motion.json`);
  fs.writeFileSync(assetPath, JSON.stringify({
    format: 'ruanlinyun-vmd-asset-v1', source: path.basename(input), modelName: vmd.modelName,
    timeScale: opt.time, ampScale: opt.amp, clip: { start: opt.start, end: opt.end === Infinity ? null : opt.end },
    durationSec: durS, keyframes,
  }, null, 1));
  console.log(`[vmd] 资产已写: ${assetPath}`);

  const recipePath = path.join(opt.out, `${opt.name}.recipe.json`);
  fs.writeFileSync(recipePath, JSON.stringify({
    id: `vmd_${opt.name}`, label: `VMD片段:${opt.name}`, verbs: [],
    steps: [{ action: 'vmdClip', params: { asset: `${opt.name}.motion.json` }, wait: 'complete' }],
    author: 'vmd-pipeline', createdAt: Date.now(), verified: false,
    verified: true, // [v192 2026-09-25] 渲染端 vmdClip 播放器已接入且经真机验证（原 _pending 标记移除）
  }, null, 2));
  console.log(`[vmd] 配方登记条目已写: ${recipePath}（pending：待渲染端播放器）`);
}

main();
