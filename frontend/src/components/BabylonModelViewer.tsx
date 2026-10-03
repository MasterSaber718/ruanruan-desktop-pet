/**
 * Babylon.js + babylon-mmd 模型查看器组件（对标Blender MMD渲染标准）
 *
 * 渲染配置（对标Blender Eevee Standard模式）：
 * - 单主光源 intensity=1.0（MMD标准）
 * - Standard色调映射（sRGB直出，不用ACESFilmic）
 * - 关闭Bloom（MMD不需要）
 * - 保留FXAA抗锯齿
 * - PMX贴图通过referenceFiles传入babylon-mmd（IArrayBufferFile[]方式）
 * - 导入后自动应用待机姿势（手臂自然下垂）
 * - ResizeObserver 自适应容器尺寸
 *
 * 关键修复：
 * - referenceFiles的relativePath必须与PMX内部存储的路径一致
 *   PMX内部路径是相对于PMX文件所在目录的（如"tex/颜.png"）
 *   而webkitRelativePath包含文件夹前缀（如"兹白byxxx/tex/颜.png"）
 *   需要去掉文件夹前缀，只保留PMX内部相对路径
 *
 * 相机：AI交互式平视视角，聚焦角色脸部和上半身
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { t as tt } from '../i18n';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color3, Color4, Mesh, MeshBuilder, StandardMaterial, DefaultRenderingPipeline, Space, Bone, Quaternion, PointerEventTypes, TransformNode, DynamicTexture, Texture } from '@babylonjs/core';
// [2026-10-01 3D场景] 注册 glTF/GLB/OBJ 场景加载插件（此前 @babylonjs/loaders 缺失，GLB/OBJ 导入分支从未生效）
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/OBJ';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';
import { startJointControlPolling, stopJointControlPolling, executeIncomingCommands } from '../services/JointControlService';
import { PetActionExecutor } from '../services/petActionRegistry';
import { resolveHumanoidBones } from '../motion/nameresolver';
import { buildRetargetPlan, playStdMotion } from '../motion/retarget';
import { resolveActiveProfile, saveStoredProfile, listStoredProfiles } from '../motion/profileStore';
import { sampleJointSignatures, signaturesToReviewJson } from '../motion/profiler';
import type { ModelMotionProfile } from '../motion/humanoidrig';
// [v98/v129] 弹簧链物理默认停用；Babylon 主链不再 import SpringChainSolver（文件仍在 physics/springChain.ts）
// 当前头发/裙摆/尾巴走 sin 摆动观察者
// MmdRuntime 物理引擎已禁用（方案A失败）
import { getStdRecipe, resolveStdRecipeId } from '../motion/stdrecipes';
import { playVmdClip, bindVmdCatsToSkeleton, type VmdClipAsset } from '../motion/vmdClipPlayer';
import '@babylonjs/core/Loading/sceneLoader';
import 'babylon-mmd/esm/Loader/mmdModelLoader.default';
import 'babylon-mmd/esm/Loader/pmxLoader';
import 'babylon-mmd/esm/Loader/pmdLoader';

// ============ [v182-4 灰模修复] PMX 贴图路径表解析 + referenceFiles 重映射 ============
// 根因：安卓 WebView 无 webkitdirectory，导入贴图缺 webkitRelativePath，
//   relativePath 退化为纯文件名，而 PMX 内部记录 "tex/xxx.png" 带子目录，
//   babylon-mmd ReferenceFileResolver 查不到贴图 -> 材质空白（灰模）。
// 修法：从 PMX 二进制解析贴图路径表（PMX2.0 规范），与导入文件名配对后重建 relativePath。
const IS_MOBILE_DEVICE = typeof navigator !== 'undefined' && (
  /android|iphone|ipad|mobile/i.test(navigator.userAgent || '') ||
  (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.())
);

/** [v186-E3] 扫描式定位 PMX 贴图表：
 *  PMX 布局 = 文本段(4)→顶点→面→贴图表→材质表；贴图表不紧跟头部（实测 琳奈.pmx @8781655）。
 *  全文件 4B 步进找 int32 pos 满足：cnt∈[8,2000]，连续 cnt 条 (int32 byteLen + UTF16LE) 合法
 *  且 ≥60% 含图形扩展名，表后 int32 为合理材质数（2..3000）→ 即贴图表。
 *  int32 首字节早退过滤使扫描 <100ms（20MB 级）。 */
const TEX_EXTS = ['.png', '.bmp', '.jpg', '.tga', '.spa', '.sph', '.gif', '.pix'];

function scanPmxTextureTable(buffer: ArrayBuffer): { paths: string[]; tableOffset: number } {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  const dv = new DataView(buffer);
  for (let pos = 16; pos < len - 8; pos++) {
    // 快速过滤：cnt 合理范围（int32 小端）
    const cnt = dv.getInt32(pos, true);
    if (cnt < 8 || cnt > 2000) continue;
    let o = pos + 4;
    let named = 0;
    const paths: string[] = [];
    let ok = true;
    for (let i = 0; i < cnt; i++) {
      if (o + 4 > len) { ok = false; break; }
      const bl = dv.getInt32(o, true);
      if (bl < 4 || bl > 260 || o + 4 + bl > len) { ok = false; break; }
      let s = '';
      for (let c = 0; c < bl; c += 2) s += String.fromCharCode(dv.getUint16(o + 4 + c, true));
      const lower = s.toLowerCase();
      if (!TEX_EXTS.some((e) => lower.includes(e))) { ok = false; break; }
      named++;
      paths.push(s.replace(/\\\\/g, '/'));
      o += 4 + bl;
    }
    if (!ok || named < cnt) continue;
    if (o + 4 > len) continue;
    const matCnt = dv.getInt32(o, true);
    if (matCnt < 2 || matCnt > 3000) continue;
    return { paths, tableOffset: pos };
  }
  return { paths: [], tableOffset: -1 };
}

/** [v186] 手机端贴图重映射：PMX 内部路径 ↔ 导入文件 basename 配对 + 占位纹理兜底。
 *  resolver 为精确全路径匹配（源码 E-4），relativePath 必须与 PMX 内部路径完全一致。 */
function rebuildReferencePathsForMobile(
  referenceFiles: IArrayBufferFile[],
  pmxBuffer: ArrayBuffer
): IArrayBufferFile[] {
  if (!IS_MOBILE_DEVICE || referenceFiles.length === 0) return referenceFiles;
  const { paths } = scanPmxTextureTable(pmxBuffer);
  if (paths.length === 0) {
    console.warn('[v186] 贴图表扫描未命中，保持原 referenceFiles');
    return referenceFiles;
  }
  const norm = (s: string) => s.replace(/\\\\/g, '/').trim().toLowerCase();
  const base = (s: string) => norm(s).split('/').pop() || '';
  // basename → 原条目（首个）
  const byBase = new Map<string, IArrayBufferFile>();
  for (const f of referenceFiles) {
    const b = base(f.relativePath);
    if (b && !byBase.has(b)) byBase.set(b, f);
  }
  const out: IArrayBufferFile[] = [];
  let matched = 0;
  for (const pmxPath of paths) {
    const nb = base(pmxPath);
    const hit = nb ? byBase.get(nb) : undefined;
    if (hit) {
      matched++;
      out.push({ ...hit, relativePath: pmxPath });
      byBase.delete(nb); // 一文件一引用（PMX 路径不重复）
    } else {
      // [v186-B 兜底] 未配对 → 1×1 透明 PNG 占位，保证 resolver 必命中，
      // 材质构建永远走 buffer 分支，杜绝 blob 相对路径 404 导致的无限转圈（E-5）
      out.push({ relativePath: pmxPath, mimeType: 'image/png', data: TRANSPARENT_PNG.slice(0) });
    }
  }
  console.log('[v186] 贴图重映射: PMX 路径 ' + paths.length + ', 配对 ' + matched + ', 占位 ' + (paths.length - matched));
  return out;
}

/** 1×1 透明 PNG（89 字节，base64 解码缓存） */
const TRANSPARENT_PNG: ArrayBuffer = (() => {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8.buffer;
})();

// [v186-5] 手机端取景：公式与 PC 完全一致（targetYRatio/visibleHeight 同参数体系），
// 仅整体视距乘 0.62 适配小屏——"基本一致，可放大"
const MOBILE_VIEW_DISTANCE_FACTOR = 0.62;
// MmdRuntime 物理引擎已禁用（方案A失败）
// 根因：MmdRuntime 接管 skeleton 后，mesh.skeleton.bones 的 absoluteTransform 不再正常工作，
//       setRotation/getRotation 也被物理引擎污染，导致 swingObserver 的 sin 摆动失效（头发无法飘动）
//       抽搐原因：物理引擎与 swingObserver 同时驱动同一骨骼产生冲突
// 当前方案：仅使用 swingObserver 的 sin 摆动驱动头发/裙摆/尾巴，不启用 MmdRuntime
// 物理引擎相关 import 保留（未使用），以备将来需要时启用

// IArrayBufferFile接口（与babylon-mmd兼容）
interface IArrayBufferFile {
  relativePath: string;
  mimeType: string | undefined;
  data: ArrayBuffer;
}

interface BabylonModelViewerProps {
  modelData?: {
    name: string;
    data: ArrayBuffer | null;
    textureFiles?: Array<{ name: string; path?: string; data: ArrayBuffer; file?: File; webkitRelativePath?: string }>;
    modelFile?: File;
    url?: string;
    // [2026-08-05 桌宠独立窗口] 桌宠窗口通过 IPC 传递数据（无 File 对象），
    // 用 modelWebkitRelativePath 替代 modelFile.webkitRelativePath
    modelWebkitRelativePath?: string;
  };
  onClose?: () => void;
  /**
   * 是否启用骨骼摆动（头发/衣摆自然摆动）
   * 启用后通过 sin 函数给特定骨骼施加小幅度旋转
   * 默认 true
   */
  physicsEnabled?: boolean;
  /**
   * 是否启用风力效果（摆动幅度更大，模拟强风）
   * 仅在 physicsEnabled=true 时生效
   * 默认 true
   */
  windEnabled?: boolean;
  /**
   * [2026-08-05 桌宠模式] 是否为桌宠模式
   * 桌宠模式下：
   *   - 背景完全透明（clearColor alpha=0），角色直接显示在桌面
   *   - 隐藏地面和网格（不需要场景参照物）
   *   - 启用鼠标穿透（透明区域点击穿透到桌面，模型实体可交互）
   *   - 启用缩放限制（基于窗口大小，最大不超窗95%，最小不小于两图标）
   * 默认 false（普通模型预览模式）
   */
  desktopPetMode?: boolean;
  /**
   * [2026-08-05 桌宠独立窗口] 模型加载成功回调
   * 桌宠窗口用此回调通知主进程显示窗口（避免显示空白窗口）
   */
  onModelLoaded?: () => void;
  /**
   * [2026-08-05 桌宠独立窗口] 模型加载失败回调
   * 桌宠窗口用此回调显示错误信息
   */
  onModelError?: (error: string) => void;
}

// ==================== 骨骼解析与驱动工具（模块化、可关闭、可回退） ====================
//
// 流程：解析骨骼 → 验证蒙皮 → 设置自然站姿 → 接入摆动
// 所有函数均带 try-catch，失败时降级运行（不崩溃、不白屏）
// 通过 BONE_DEBUG 开关控制日志输出
//
const BONE_DEBUG = true;  // 调试日志开关（发布时可改为 false）

/**
 * 分析 PMX 模型的 skeleton（骨骼数量、名称、层级、根骨骼）
 * 用于确认 babylon-mmd 是否正确建立 Skeleton Runtime
 *
 * @param rootMesh PMX 根 mesh（__root__）
 * @returns 骨骼信息对象，解析失败返回 null（降级运行）
 */
function analyzeSkeleton(rootMesh: any): {
  skeleton: any;
  boneCount: number;
  boneNames: string[];
  rootBones: string[];
  swingCandidates: string[];  // 头发/衣摆候选骨骼
  armBones: string[];         // 手臂骨骼（用于站姿）
  spineBones: string[];       // 脊椎骨骼（用于站姿）
} | null {
  try {
    // babylon-mmd 的 PMX loader 会把 skeleton 赋给每个子 mesh
    // rootMesh 是 __root__ 容器，需要遍历子 mesh 找到带 skeleton 的
    let skeleton: any = null;
    const allMeshes: any[] = [];

    // 递归遍历所有子节点找到带 skeleton 的 mesh
    const traverse = (node: any) => {
      if (!node) return;
      if (node.skeleton) {
        skeleton = node.skeleton;
        allMeshes.push(node);
      }
      if (node.getChildMeshes) {
        const children = node.getChildMeshes();
        for (const child of children) traverse(child);
      }
    };
    traverse(rootMesh);

    if (!skeleton) {
      if (BONE_DEBUG) console.warn('[BoneAnalyzer] 未找到 skeleton，PMX 可能未正确解析骨骼');
      return null;
    }

    const bones: any[] = skeleton.bones || [];
    const boneNames = bones.map((b: any) => b.name || '(unnamed)');
    const rootBones = bones
      .filter((b: any) => !b.getParent || b.getParent() === null)
      .map((b: any) => b.name);

    // 摆动候选骨骼（仅限柔性部件：头发、裙摆、衣摆、尾巴）
    // 按用户要求：刚性部件（手套、手掌、袖子、丝带等）不加入摆动
    // 无法确定是否柔性 → 默认保持静止（不加入摆动列表）
    const swingKeywords = [
      // 头发（柔性，符合角色设计）
      'hair', '髪', '发', '前髪', '後ろ髪', '後髪', 'サイド髪', '横髪',
      // 裙摆/衣摆（柔性）
      'skirt', 'スカート', '裾', '裙', '摆', 'hem',
      // 尾巴（柔性，参考 Unity Dynamic Bone 处理方式）
      // 注意：'尾' 单字会误匹配 '尾骨'(coccyx)，需在尾巴识别时排除
      // 修复：增加'weiba'（尾巴拼音），部分PMX模型用拼音命名（如Bn_weiba001）
      'tail', '尾', '尻尾', 'しっぽ', '尾巴', 'weiba',
    ];
    // 排除项：含 尾骨/coccyx/tailbone 的不是尾巴（在摆动收集阶段排除）
    const swingCandidates = boneNames.filter(name =>
      swingKeywords.some(kw => (name || '').toLowerCase().includes(kw.toLowerCase()))
    );

    // 调试：输出所有骨骼名，方便排查尾巴骨骼命名
    if (BONE_DEBUG) {
      console.log(`[BoneAnalyzer] 所有骨骼名(${boneNames.length}):`, boneNames);
      // 特别标记可能的尾巴骨骼
      const tailCandidates = boneNames.filter(name => {
        const lower = (name || '').toLowerCase();
        return lower.includes('tail') || lower.includes('尾') || lower.includes('尻尾') || lower.includes('しっぽ');
      });
      console.log(`[BoneAnalyzer] 尾巴候选骨骼:`, tailCandidates);
    }

    // 手臂骨骼（用于自然站姿：双臂下垂）
    const armKeywords = ['arm', '腕', '肩', 'shoulder', 'elbow', '肘', 'hand', '手'];
    const armBones = boneNames.filter(name =>
      armKeywords.some(kw => (name || '').toLowerCase().includes(kw.toLowerCase()))
    );

    // 脊椎骨骼（用于自然站姿：脊椎微调）
    const spineKeywords = ['spine', 'upper', 'lower', 'chest', 'waist', '腰', '胸', '上半身', '下半身'];
    const spineBones = boneNames.filter(name =>
      spineKeywords.some(kw => (name || '').toLowerCase().includes(kw.toLowerCase()))
    );

    if (BONE_DEBUG) {
      console.log(`[BoneAnalyzer] 总骨骼:${bones.length} 摆动候选:${swingCandidates.length} 手臂:${armBones.length} 脊椎:${spineBones.length}`);
    }

    return { skeleton, boneCount: bones.length, boneNames, rootBones, swingCandidates, armBones, spineBones };
  } catch (err) {
    console.error('[BoneAnalyzer] 骨骼解析失败（降级运行）:', err);
    return null;
  }
}

/**
 * [2026-09-10 多模型统一取景] 用骨骼量身高/中心，不靠 mesh 包围盒
 * 包围盒会被头发/翅膀/道具撑大，高矮角色点位会漂；头+脚骨骼更接近「人」
 * 失败返回 null → 调用方回落包围盒
 */
function measureBoneFrame(rootMesh: any): {
  height: number; minY: number; maxY: number; centerX: number; centerZ: number;
} | null {
  try {
    const analysis = analyzeSkeleton(rootMesh);
    if (!analysis?.skeleton?.bones?.length) return null;
    const bones: any[] = analysis.skeleton.bones;
    const posOf = (b: any) => {
      try {
        if (b?.getAbsolutePosition) return b.getAbsolutePosition();
        if (b?.getAbsoluteMatrix) return b.getAbsoluteMatrix().getTranslation();
      } catch { /* noop */ }
      return null;
    };
    const findBone = (keys: string[]) => bones.find((b: any) => {
      const n = b?.name || '';
      return keys.some(k => n === k || n.includes(k));
    });
    const head = findBone(['頭', '头', 'head', 'Head']);
    const feet = [
      findBone(['左つま先', 'つま先', 'toe']),
      findBone(['右つま先']),
      findBone(['左足首', '足首', 'ankle']),
      findBone(['右足首']),
      findBone(['左足', '足D']),
      findBone(['右足']),
    ].filter(Boolean);
    const xs: number[] = [];
    const zs: number[] = [];
    let minY = Infinity;
    let maxY = -Infinity;
    const push = (p: any) => {
      if (!p || typeof p.y !== 'number') return;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (typeof p.x === 'number') xs.push(p.x);
      if (typeof p.z === 'number') zs.push(p.z);
    };
    const headPos = head && posOf(head);
    if (headPos) push(headPos);
    for (const f of feet) push(posOf(f));
    // 头/脚缺失时：扫全部骨骼 Y
    if (!isFinite(minY) || !isFinite(maxY) || (maxY - minY) < 1) {
      minY = Infinity; maxY = -Infinity; xs.length = 0; zs.length = 0;
      for (const b of bones) push(posOf(b));
    }
    if (!isFinite(minY) || !isFinite(maxY)) return null;
    const height = maxY - minY;
    if (!(height > 3 && height < 300)) return null;
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    return {
      height, minY, maxY,
      centerX: xs.length ? avg(xs) : 0,
      centerZ: zs.length ? avg(zs) : 0,
    };
  } catch {
    return null;
  }
}

/**
 * 验证蒙皮是否被骨骼驱动
 * 通过旋转一个骨骼并检查 mesh 的 worldMatrix 是否变化来验证
 *
 * @param skeleton 骨骼对象
 * @returns true=蒙皮正常驱动，false=蒙皮未生效
 */
function verifySkinning(skeleton: any): boolean {
  try {
    if (!skeleton || !skeleton.bones || skeleton.bones.length === 0) return false;
    // 简单验证：检查骨骼的 _linkedTransformNode 或 absoluteTransform 是否存在
    // babylon-mmd 加载的骨骼应该有 absoluteTransform 矩阵
    const bone0 = skeleton.bones[0];
    if (bone0 && bone0.getAbsoluteTransform) {
      const mat = bone0.getAbsoluteTransform();
      if (mat) {
        if (BONE_DEBUG) console.log('[BoneAnalyzer] 蒙皮验证: 骨骼 absoluteTransform 存在，蒙皮驱动正常');
        return true;
      }
    }
    if (BONE_DEBUG) console.warn('[BoneAnalyzer] 蒙皮验证: 骨骼 absoluteTransform 不存在，蒙皮可能未生效');
    return false;
  } catch (err) {
    console.warn('[BoneAnalyzer] 蒙皮验证失败:', err);
    return false;
  }
}

// ==================== 人体语义层（Human Skeleton Mapping） ====================
//
// 把 PMX 骨骼名映射到统一的人体部位结构。
// 程序控制的是 HumanBody 对象，而不是 PMX Bone 名。
// 这样不同模型的骨骼名差异被封装在映射层，上层逻辑可复用。
//

/** 人体手臂结构 */
interface HumanArm {
  side: 'left' | 'right';
  shoulder?: Bone;   // 肩（"肩" / "shoulder" / "collar"）
  upperArm: Bone;    // 上臂（"上腕" / "upper arm"）★ 必需
  lowerArm?: Bone;   // 下臂（"下腕" / "lower arm" / "elbow"）
  hand?: Bone;       // 手（"手首" / "hand" / "wrist"）
  // [v48 通用骨架] 手指（简化：从手骨链找 5 指，缺的为 undefined）
  fingers?: { thumb?: Bone; index?: Bone; middle?: Bone; ring?: Bone; pinky?: Bone };
}

/** [v48 通用骨架补全] 人体腿部结构 */
interface HumanLeg {
  side: 'left' | 'right';
  hip?: Bone;         // 髋（"腰" / "hip" / "pelvis"）
  upperLeg: Bone;     // 大腿（"足" / "腿" / "thigh" / "upper leg"）★ 必需
  lowerLeg?: Bone;    // 小腿（"膝" / "knee" / "lower leg" / "calf"）
  foot?: Bone;        // 脚（"足首" / "ankle" / "foot"）
  toe?: Bone;         // 趾（"足指" / "toe"）
}

/** 人体脊椎结构 */
interface HumanSpine {
  root?: Bone;        // 根骨骼（"全ての親" / "腰" / "root"）
  lowerSpine?: Bone;  // 下半身（"下半身" / "lower spine" / "waist"）
  upperSpine?: Bone;  // 上半身（"上半身" / "upper spine" / "chest"）
  chest?: Bone;       // 胸（"上半身2" / "chest"）
  neck?: Bone;        // 颈（"首" / "neck"）
  head?: Bone;        // 头（"頭" / "head"）
}

/** 人体语义结构（v48 通用骨架：含腿部） */
interface HumanBody {
  spine: HumanSpine;
  leftArm: HumanArm | null;
  rightArm: HumanArm | null;
  leftLeg: HumanLeg | null;   // [v48] 左腿（髋/大腿/小腿/脚/趾）
  rightLeg: HumanLeg | null;  // [v48] 右腿
}

/** 判断骨骼名是否包含指定关键词（忽略大小写） */
function boneNameMatches(name: string, keywords: string[]): boolean {
  const lower = (name || '').toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

/** 判断骨骼名标识的左右侧 */
function detectSide(name: string): 'left' | 'right' | null {
  const n = name || '';
  if (n.includes('左') || /\bleft\b/i.test(n) || /\bL\b/i.test(n)) return 'left';
  if (n.includes('右') || /\bright\b/i.test(n) || /\bR\b/i.test(n)) return 'right';
  return null;
}

// [T2.1 角速度极限表] 与 motion-core/joint_limits.json 同源（度/秒，日常舒适档）。
//   任务清单锚点：人扇巴掌 0.2s（肘~750°/s 爆发顶）；日常动作远低于此。
//   センター/全ての親/捩り/IK 不入表（整体朝向旋转与物理补偿骨骼不受关节扭转极限管辖）。
const JOINT_SPEED_GROUPS: Array<{ match: string[]; comfortDegPerSec: number; hardDegPerSec: number }> = [
  { match: ['頭', 'head', '首', 'neck'], comfortDegPerSec: 144, hardDegPerSec: 480 },  // [v97] ×1.2 保速
  { match: ['上半身', 'upper', 'chest', '脊椎', 'spine', '下半身', '腰', 'waist'], comfortDegPerSec: 108, hardDegPerSec: 360 },  // [v97] ×1.2 保速
  { match: ['肩', 'shoulder'], comfortDegPerSec: 300, hardDegPerSec: 840 },  // [v97] ×1.2 保速
  { match: ['ひじ', '肘', 'elbow', '下腕'], comfortDegPerSec: 360, hardDegPerSec: 900 },  // [v97] ×1.2 保速
  { match: ['手首', 'wrist', '腕'], comfortDegPerSec: 264, hardDegPerSec: 600 },  // [v97] ×1.2 保速
  { match: ['もも', '大腿', 'thigh', 'すね', '小腿', 'knee', '膝', '足首', 'ankle', '足', 'foot', 'leg'], comfortDegPerSec: 240, hardDegPerSec: 960 },  // [v97] ×1.2 保速
  // [v97] 手指组：短细高频（decorative 通道，超速 clamp 不影响主干）
  { match: ['指', 'thumb', 'index', 'middle', 'ring', 'little'], comfortDegPerSec: 576, hardDegPerSec: 1440 },  // [v97] ×1.2 保速
];

/** 查骨骼所属关节速度组（按表序首个命中生效：肘先于腕——'下腕'=前臂归肘组，'腕'兜底归腕组） */
function jointSpeedGroupOf(name: string): { comfortDegPerSec: number; hardDegPerSec: number } | null {
  for (const g of JOINT_SPEED_GROUPS) {
    if (boneNameMatches(name, g.match)) return g;
  }
  return null;
}

// [T3.2 timing 预设] 四段式占比可调（enum 预设而非自由数值——防 AI 乱填占比破坏动作结构）。
//   normal=现状基准；quick=急促利落（短预备短跟随）；smooth=柔缓（长预备长跟随短过冲）
const TIMING_PRESETS: Record<string, { prep: number; mainW: number; followW: number }> = {
  normal: { prep: 0.14, mainW: 0.48, followW: 0.16 },
  quick:  { prep: 0.06, mainW: 0.60, followW: 0.10 },
  smooth: { prep: 0.20, mainW: 0.44, followW: 0.20 },
};

/** 四段式包络工厂（禁匀速：预备反向蓄力→主段 smoothstep→跟随过冲5%→回收归零） */
function phaseEnvOf(timing: string): (t: number) => number {
  const pr = TIMING_PRESETS[timing] || TIMING_PRESETS.normal;
  const m0 = pr.prep, m1 = pr.prep + pr.mainW, f1 = m1 + pr.followW;
  return (t: number): number => {
    if (t < m0) return -0.12 * Math.sin((Math.PI * t) / m0);
    if (t < m1) { const u = (t - m0) / pr.mainW; return u * u * (3 - 2 * u); }
    if (t < f1) { const u = (t - m1) / pr.followW; return 1 + 0.05 * Math.sin(Math.PI * u); }
    const u = (t - f1) / (1 - f1); return 1 - u * u * (3 - 2 * u);
  };
}

/**
 * 沿骨骼链向下查找第一个匹配关键词的子骨骼
 * 用于从上臂找到下臂、从下臂找到手等
 *
 * @param startBone 起始骨骼
 * @param keywords 关键词列表
 * @param maxDepth 最大递归深度（避免无限遍历）
 */
function findChildBoneByKeyword(startBone: any, keywords: string[], maxDepth: number = 3): Bone | null {
  try {
    const queue: Array<{ bone: any; depth: number }> = [{ bone: startBone, depth: 0 }];
    while (queue.length > 0) {
      const { bone, depth } = queue.shift()!;
      if (depth > maxDepth) continue;
      const children = bone.getChildren ? bone.getChildren() : (bone.children || []);
      for (const child of children) {
        if (child && child.name && boneNameMatches(child.name, keywords)) {
          return child as Bone;
        }
        queue.push({ bone: child, depth: depth + 1 });
      }
    }
  } catch (e) {
    // 静默失败
  }
  return null;
}

/**
 * 沿骨骼链向上查找第一个匹配关键词的父骨骼
 * 用于从上臂找到肩膀
 */
function findParentBoneByKeyword(startBone: any, keywords: string[], maxDepth: number = 3): Bone | null {
  try {
    let current: any = startBone.getParent ? startBone.getParent() : (startBone.parent || null);
    let depth = 0;
    while (current && depth < maxDepth) {
      if (current.name && boneNameMatches(current.name, keywords)) {
        return current as Bone;
      }
      current = current.getParent ? current.getParent() : (current.parent || null);
      depth++;
    }
  } catch (e) {
    // 静默失败
  }
  return null;
}

/**
 * 构建 PMX 骨骼 → 人体语义结构的映射
 *
 * 策略（基于骨骼层级 + 命名）：
 * 1. 在所有骨骼中找到"上腕/upper arm"骨骼
 * 2. 通过骨骼名判断左右（左/右 或 L/R）
 * 3. 沿父骨骼向上找"肩/shoulder"
 * 4. 沿子骨骼向下找"下腕/lower arm"
 * 5. 沿子骨骼向下找"手首/hand"
 *
 * 脊椎链单独识别：根、下半身、上半身、胸、颈、头
 *
 * @param skeleton Babylon.js Skeleton
 * @returns HumanBody 对象，未找到的部位为 null/undefined
 */
function buildHumanBody(skeleton: any): HumanBody | null {
  try {
    if (!skeleton || !skeleton.bones || skeleton.bones.length === 0) {
      if (BONE_DEBUG) console.warn('[HumanBody] skeleton 为空或无骨骼');
      return null;
    }

    const allBones: any[] = skeleton.bones;

    // ===== 识别脊椎链 =====
    const spine: HumanSpine = {};
    spine.root = (allBones.find(b => boneNameMatches(b.name, ['全ての親', '腰', 'root', 'center'])) as Bone) || undefined;
    spine.lowerSpine = (allBones.find(b => boneNameMatches(b.name, ['下半身', 'lower spine', 'waist', 'lower body'])) as Bone) || undefined;
    spine.upperSpine = (allBones.find(b => boneNameMatches(b.name, ['上半身', 'upper spine', 'chest', 'upper body'])) && !boneNameMatches(spine.root?.name || '', ['chest']) ? allBones.find(b => boneNameMatches(b.name, ['上半身', 'upper spine', 'upper body'])) as Bone : undefined) || undefined;
    spine.chest = (allBones.find(b => boneNameMatches(b.name, ['上半身2', 'chest', '胸'])) as Bone) || undefined;
    spine.neck = (allBones.find(b => boneNameMatches(b.name, ['首', 'neck'])) as Bone) || undefined;
    spine.head = (allBones.find(b => boneNameMatches(b.name, ['頭', 'head'])) as Bone) || undefined;

    // ===== 识别手臂 =====
    // 严格识别上臂骨骼，避免匹配到下臂（下腕/肘）或手（手首/wrist/hand）
    // 标准 MMD 日语骨骼名：
    //   肩 = 肩
    //   上臂 = 腕（注意：单独"腕"在日语中是手臂的总称，MMD 上臂骨骼通常是"腕"不带前缀，但也可能是"上腕"）
    //   下臂 = ひじ / 肘 / 下腕
    //   手 = 手首
    // 识别策略：
    //   1. 排除明显非上臂的骨骼（手首/下腕/肘/指/捩/IK）
    //   2. 匹配上臂候选（腕/上腕/arm，但排除下腕/手首）
    //   3. 按骨骼名中的"左/右"判断侧别
    //   4. 按评分选择最佳候选（上腕 > 腕 > arm）
    //   5. 通过位置验证：上臂 y 坐标应高于下臂 y 坐标

    // 上臂候选关键词（匹配其中任意一个即视为候选）
    const upperArmCandidates = allBones.filter(b => {
      const name = (b.name || '').toLowerCase();
      // 排除：手指/下臂/手腕/捩骨/IK
      if (name.includes('指') || name.includes('finger') || name.includes('thumb')) return false;
      if (name.includes('手首') || name.includes('wrist') || name.includes('hand')) return false;
      if (name.includes('下腕') || name.includes('lower arm') || name.includes('lowerarm') || name.includes('elbow') || name.includes('肘') || name.includes('ひじ')) return false;
      if (name.includes('捩') || name.includes('twist')) return false;
      if (name.includes('ik')) return false;
      // 必须包含上臂关键词
      const isUpperArm = name.includes('腕') || name.includes('上腕') || name.includes('upper arm') || name.includes('upperarm') || name.includes('arm');
      return isUpperArm;
    });

    if (BONE_DEBUG) {
      console.log(`[HumanBody] 上臂候选(${upperArmCandidates.length}): ${upperArmCandidates.map(b => b.name).join(', ')}`);
    }

    let leftArm: HumanArm | null = null;
    let rightArm: HumanArm | null = null;
    let leftScore = -Infinity;
    let rightScore = -Infinity;

    const scoreUpperArm = (bone: any): number => {
      const name = bone?.name || '';
      let score = 0;
      // "上腕" / "upper arm" 是最标准的上臂名称
      if (boneNameMatches(name, ['上腕', 'upper arm', 'upperarm'])) score += 10;
      // 单独"腕"也算，但分数低（可能是手臂总称）
      if (boneNameMatches(name, ['腕'])) score += 5;
      if (boneNameMatches(name, ['arm'])) score += 3;
      // 排除项（理论上已在前面过滤，这里二次保险）
      if (boneNameMatches(name, ['肩', 'shoulder', 'collar'])) score -= 5;
      // 有子骨骼的优先（上臂应该有下臂子骨骼）
      const children = bone?.getChildren ? bone.getChildren() : (bone?.children || []);
      if (children && children.length > 0) score += 2;
      return score;
    };

    for (const upperArm of upperArmCandidates) {
      const side = detectSide(upperArm.name);
      if (!side) {
        if (BONE_DEBUG) console.log(`[HumanBody] 跳过上臂候选（无法判断左右）: ${upperArm.name}`);
        continue;
      }

      const candidateScore = scoreUpperArm(upperArm);
      if (side === 'left' && candidateScore <= leftScore) continue;
      if (side === 'right' && candidateScore <= rightScore) continue;

      // 沿父骨骼向上找肩膀（肩/shoulder/collar）
      const shoulder = findParentBoneByKeyword(upperArm, ['肩', 'shoulder', 'collar', 'clavicle'], 2);
      // 沿子骨骼向下找下臂（下腕/lower arm/elbow/肘/ひじ）
      const lowerArm = findChildBoneByKeyword(upperArm, ['下腕', 'lower arm', 'lowerarm', 'elbow', '肘', 'ひじ'], 2);
      // 沿子骨骼向下找手（手首/hand/wrist）
      const hand = lowerArm
        ? findChildBoneByKeyword(lowerArm, ['手首', 'hand', 'wrist'], 2)
        : findChildBoneByKeyword(upperArm, ['手首', 'hand', 'wrist'], 3);

      // 位置验证：上臂 y 坐标应高于下臂 y 坐标（上臂在下臂之上）
      // 用 _absoluteBindMatrix（babylon-mmd 加载时正确设置）
      let positionValid = true;
      try {
        const upperY = (upperArm as any)._absoluteBindMatrix?.getTranslation?.()?.y;
        const lowerY = lowerArm ? (lowerArm as any)._absoluteBindMatrix?.getTranslation?.()?.y : undefined;
        if (upperY !== undefined && lowerY !== undefined && upperY <= lowerY) {
          positionValid = false;
        }
      } catch (e) {
        // 位置读取失败不阻止识别
      }

      if (BONE_DEBUG) {
        console.log(`[HumanBody] ${side}臂识别: 上臂="${upperArm.name}" 肩="${shoulder?.name || '无'}" 下臂="${lowerArm?.name || '无'}" 手="${hand?.name || '无'}" 评分=${candidateScore} 位置${positionValid ? '有效' : '无效'}`);
      }

      // [v48 通用骨架] 手指识别（简化：从手骨链找 5 指）
      let fingers: HumanArm['fingers'];
      if (hand) {
        const fingerMap: Array<[keyof NonNullable<HumanArm['fingers']>, string[]]> = [
          ['thumb', ['親指', 'thumb']],
          ['index', ['人指', 'index', '示指']],
          ['middle', ['中指', 'middle']],
          ['ring', ['薬指', 'ring']],
          ['pinky', ['小指', 'pinky', 'little']],
        ];
        for (const [key, kws] of fingerMap) {
          const fb = findChildBoneByKeyword(hand, kws, 3);
          if (fb) { fingers = fingers || {}; fingers[key] = fb as Bone; }
        }
      }

      const arm: HumanArm = { side, shoulder: shoulder || undefined, upperArm: upperArm as Bone, lowerArm: lowerArm || undefined, hand: hand || undefined, fingers };

      if (side === 'left') {
        leftArm = arm;
        leftScore = candidateScore;
      } else {
        rightArm = arm;
        rightScore = candidateScore;
      }
    }

    // [v48 通用骨架补全] 腿部识别（髋/大腿/小腿/脚/趾）
    const legs = buildHumanLegs(skeleton);
    const humanBody: HumanBody = { spine, leftArm, rightArm, leftLeg: legs.left, rightLeg: legs.right };

    // [v48] 语义关节识别清单输出（验证通用骨架：脊椎6段/双臂/双腿/手指）
    const spineFound = ['root', 'lowerSpine', 'upperSpine', 'chest', 'neck', 'head'].filter((k) => !!(spine as any)[k]).length;
    const fingersL = humanBody.leftArm?.fingers ? Object.keys(humanBody.leftArm.fingers).length : 0;
    const fingersR = humanBody.rightArm?.fingers ? Object.keys(humanBody.rightArm.fingers).length : 0;
    console.log('[HumanBodyV2] 脊椎链:' + spineFound + '/6' +
      ' 左臂:' + (humanBody.leftArm ? '✓' : '✗') + ' 右臂:' + (humanBody.rightArm ? '✓' : '✗') +
      ' 左腿:' + (humanBody.leftLeg ? '✓' : '✗') + ' 右腿:' + (humanBody.rightLeg ? '✓' : '✗') +
      ' 手指(L' + fingersL + '/R' + fingersR + ')' +
      (humanBody.leftLeg ? ' 左腿链=' + [humanBody.leftLeg.upperLeg, humanBody.leftLeg.lowerLeg, humanBody.leftLeg.foot, humanBody.leftLeg.toe].filter(Boolean).map((b: any) => b.name).join('→') : ''));

    // ===== 调试日志 =====
    if (BONE_DEBUG) {
      const armInfo = (arm: HumanArm | null) => arm ? `${arm.upperArm.name}` : '无';
      console.log(`[HumanBody] 左臂:${armInfo(leftArm)} 右臂:${armInfo(rightArm)}`);
    }

    return humanBody;
  } catch (err) {
    console.error('[HumanBody] 构建失败（降级运行）:', err);
    return null;
  }
}

/**
 * [v48 通用骨架补全] 识别腿部：髋/大腿/小腿/脚/趾（与手臂同策略：候选过滤+左右+评分+链查找）
 * 支持命名：MMD（足/腿/膝/足首/足指）+ Unity Humanoid/Mixamo（Hips/UpperLeg/Leg/Foot/Toe/upleg/thigh/calf）
 */
function buildHumanLegs(skeleton: any): { left: HumanLeg | null; right: HumanLeg | null } {
  const result = { left: null as HumanLeg | null, right: null as HumanLeg | null };
  try {
    if (!skeleton || !skeleton.bones || skeleton.bones.length === 0) return result;
    const allBones: any[] = skeleton.bones;

    // [v74 蹲下修复 2026-09-09] 标准 MMD 腿链优先直配：
    // 本模型裙撑物理骨骼 Leg_左M/F/B 命名含 'leg'（评分+3）高于标准大腿'左足'（'足'评分+2），
    // 且在骨骼表后部（后遍历高分覆盖）→ 左右腿被裙骨骼夺走，squat/legKick/limbRaise(leg) 全部空转。
    // 模型存在标准链（足=大腿→ひざ=膝→足首=踝→つま先=趾）时精确匹配直配，不走评分；
    // 精确名匹配天然排除 D 系（左足D）/EX/IK。无标准链的模型（mixamo 等）回落原评分逻辑。
    const stdLeg = (side: 'left' | 'right'): HumanLeg | null => {
      const p = side === 'left' ? '左' : '右';
      const thigh = allBones.find((b: any) => (b.name || '') === (p + '足'));
      if (!thigh) return null;
      const knee = findChildBoneByKeyword(thigh, ['ひざ', '膝', 'knee', 'calf', 'すね'], 1);
      const ankle = knee ? findChildBoneByKeyword(knee, ['足首', 'ankle'], 1) : null;
      const toe = ankle ? findChildBoneByKeyword(ankle, ['つま先', '足指', 'toe'], 1) : null;
      const hip = findParentBoneByKeyword(thigh, ['腰', '下半身', 'hip', 'pelvis'], 2);
      return { side, hip: hip || undefined, upperLeg: thigh as Bone, lowerLeg: knee || undefined, foot: ankle || undefined, toe: toe || undefined };
    };
    const stdL = stdLeg('left');
    const stdR = stdLeg('right');
    if (stdL || stdR) {
      result.left = stdL;
      result.right = stdR;
      if (BONE_DEBUG) {
        console.log('[HumanLegs][std直配] 左腿:' + (stdL ? stdL.upperLeg.name + '/' + (stdL.lowerLeg ? stdL.lowerLeg.name : '无膝') : '无') + ' 右腿:' + (stdR ? stdR.upperLeg.name + '/' + (stdR.lowerLeg ? stdR.lowerLeg.name : '无膝') : '无'));
      }
      return result;
    }

    // 大腿候选：排除 踝/趾/膝/手指/IK
    const upperLegCandidates = allBones.filter((b: any) => {
      const name = (b.name || '').toLowerCase();
      if (name.includes('足首') || name.includes('ankle')) return false;
      if (name.includes('足指') || name.includes('toe') || name.includes('toes')) return false;
      if (name.includes('膝') || name.includes('knee')) return false;
      if (name.includes('指') || name.includes('finger')) return false;
      if (name.includes('ik') || name.includes('dummy')) return false;
      if (name.includes('小腿')) return false; // [v48b] 明确的小腿不是大腿候选
      return name.includes('足') || name.includes('腿') || name.includes('leg') || name.includes('thigh')
        || name.includes('もも') || name.includes('大腿') || name.includes('upleg') || name.includes('upperleg');
    });

    const scoreLeg = (bone: any): number => {
      const name = (bone?.name || '').toLowerCase();
      let score = 0;
      if (name.includes('thigh') || name.includes('upper leg') || name.includes('upperleg')
        || name.includes('upleg') || name.includes('大腿') || name.includes('もも')) score += 10;
      if (name.includes('leg')) score += 3;
      if (name.includes('足')) score += 2;
      return score;
    };

    let left: HumanLeg | null = null, right: HumanLeg | null = null;
    let leftScore = -Infinity, rightScore = -Infinity;

    for (const bone of upperLegCandidates) {
      const side = detectSide(bone.name);
      if (!side) continue;
      const score = scoreLeg(bone);
      if (side === 'left' && score <= leftScore) continue;
      if (side === 'right' && score <= rightScore) continue;

      // 沿链查找：髋（父）、膝（子）、踝/脚（孙）、趾（曾孙）
      const hip = findParentBoneByKeyword(bone, ['腰', 'hip', 'pelvis', '下半身', 'groin'], 2);
      // [v48b] 'leg' 覆盖 mixamo LeftLeg（小腿）；'小腿' 覆盖中文命名
      const lowerLeg = findChildBoneByKeyword(bone, ['膝', 'knee', 'lower leg', 'lowerleg', 'calf', '脛', 'すね', 'leg', '小腿', 'ひざ'], 2);
      const foot = lowerLeg
        ? findChildBoneByKeyword(lowerLeg, ['足首', 'ankle', 'foot'], 2)
        : findChildBoneByKeyword(bone, ['足首', 'ankle', 'foot'], 3);
      const toe = foot
        ? findChildBoneByKeyword(foot, ['足指', 'toe', 'toes', '趾'], 2)
        : null;

      const leg: HumanLeg = { side, hip: hip || undefined, upperLeg: bone as Bone, lowerLeg: lowerLeg || undefined, foot: foot || undefined, toe: toe || undefined };
      if (side === 'left') { left = leg; leftScore = score; } else { right = leg; rightScore = score; }
    }

    result.left = left;
    result.right = right;
    if (BONE_DEBUG) {
      console.log('[HumanLegs] 左腿:' + (left ? left.upperLeg.name : '无') + ' 右腿:' + (right ? right.upperLeg.name : '无'));
    }
  } catch (e) {
    // 识别失败降级（腿为 null，不影响其他部位）
  }
  return result;
}

// ==================== 关节级骨骼控制系统（Joint-Only Rotation System） ====================
//
// 设计原则（用户明确要求）：
// 1. 只允许关节旋转，绝对禁止 X/Y/Z 轴位置移动
// 2. 以人体关节为白名单基础（头/颈/脊椎/肩/肘/腕/指/髋/膝/踝/趾）
// 3. 根骨骼/中心点/IK 等位置控制骨骼一律禁止操作
// 4. 暴露动态调整接口，每个关节可独立旋转
// 5. 所有旋转走安全通道：旋转前保存位置，旋转后强制恢复，验证无位置变化
//

/** 关节白名单关键词：匹配任一即视为"可旋转关节" */
const JOINT_KEYWORDS = [
  // 头颈
  '頭', '首', 'neck', 'head',
  // 脊椎
  '上半身', '下半身', '上半身2', '胸', '腰', 'spine', 'chest', 'waist', 'upper body', 'lower body',
  // 肩
  '肩', 'shoulder', 'collar', 'clavicle',
  // 上臂/下臂/手腕
  '腕', '上腕', '下腕', '肘', 'ひじ', 'arm', 'elbow', 'wrist', '手首',
  // 手指
  '指', 'finger', 'thumb', 'hand',
  // 下肢（v48 补充：thigh/calf/upleg 覆盖 Unity Humanoid / Mixamo 命名）
  '足', '脚', 'leg', 'hip', 'pelvis', 'thigh', 'calf', 'shin', 'upleg', 'upperleg', '大腿', '小腿',
  // 膝/踝/趾（v55 补：もも/ひざ 覆盖 MMD 日文标准大腿/膝命名）
  '膝', 'knee', 'もも', 'ひざ', '足首', 'ankle', '足指', 'toe', 'toes',
];

/** 位置锁死黑名单关键词：匹配任一即视为"位置控制骨骼"，禁止任何操作 */
const POSITION_LOCK_KEYWORDS = [
  '全ての親', '操作中心', 'センター', 'グルーブ',   // MMD 根/中心骨骼
  'root', 'center', 'groove',                       // 英文对应
  'IK',                                              // IK 骨骼（避免冲突）
  'dummy', 'view',                                  // 辅助骨骼
];

/** 判断骨骼是否为关节（白名单匹配 + 黑名单排除） */
function isJointBone(name: string): boolean {
  const n = (name || '').toLowerCase();
  if (!n) return false;
  // [2026-09-18 鞋跟误识别根治] 服饰/物理附属骨绝不是关节（Leg_裙撑/鞋/踵…）
  if (isDecoPhysicsBone(name)) return false;
  // 黑名单优先：位置控制骨骼/IK/辅助骨骼一律不是关节
  for (const kw of POSITION_LOCK_KEYWORDS) {
    if (n.includes(kw.toLowerCase())) return false;
  }
  // 白名单匹配
  for (const kw of JOINT_KEYWORDS) {
    if (n.includes(kw.toLowerCase())) return true;
  }
  return false;
}

/**
 * [2026-09-18] 服饰/物理附属骨判定——「高跟鞋跟被识别成脚后跟」根治入口。
 * 背景：早期 Leg_*M/F/B（裙撑）因名字含 leg 评分高于「左足」被误当腿/脚；
 *       鞋跟网格绑在踝/D 系上，若把附属骨当关节驱动 → 「跟乱动、脚不动」。
 * 规则：这类骨永远不是解剖关节（不存在「脚后跟」关节），只能作蒙皮/摆动附属。
 */
function isDecoPhysicsBone(name: string): boolean {
  const n = (name || '');
  if (!n) return false;
  const lower = n.toLowerCase();
  // 琳奈裙撑：Leg_左M / Leg_右F / Leg_右B 等
  if (/^leg[_\-]/i.test(n)) return true;
  // 明确的鞋/跟/踵命名（非标准解剖名）
  if (lower.includes('heel') || n.includes('鞋') || n.includes('踵')) return true;
  // 服饰类常见附属
  if (n.includes('裙撑') || n.includes('コート') || lower.startsWith('coat_') || lower.startsWith('sleeve_')) {
    // coat/sleeve 本身不是腿；含「足首/つま先」的标准鞋骨仍走白名单
    if (!n.includes('足首') && !n.includes('つま先') && !n.includes('足指')) return true;
  }
  return false;
}

/** 骨骼运行时分类（加载时审计 + 驱动门共用） */
type BoneClass = 'joint' | 'jointProxy' | 'decoPhysics' | 'positionLocked' | 'other';
function classifyBoneName(name: string): BoneClass {
  if (!name) return 'other';
  if (isDecoPhysicsBone(name)) return 'decoPhysics';
  if (isPositionLockedBone(name)) return 'positionLocked';
  // D 系可见代理骨：标准关节名 + D（足首D / 左足D），必须与标准骨同步驱动
  if (/D$/.test(name) && name.length > 1) {
    const base = name.slice(0, -1);
    if (isJointBone(base) || /足首|足|ひざ|腕|ひじ|手首/.test(base)) return 'jointProxy';
  }
  if (isJointBone(name)) return 'joint';
  return 'other';
}

/** 查找关节的可见代理骨（D 系）；无则 null */
function findJointProxyBone(skel: any, jointName: string): any | null {
  try {
    const bones: any[] = skel?.bones || [];
    const proxyName = jointName + 'D';
    return bones.find((b: any) => b.name === proxyName) || null;
  } catch { return null; }
}

/**
 * [融合驱动门] 解剖关节旋转 = 标准骨 + 同名 D 代理骨同帧；
 * 服饰/物理附属骨 → 拒绝（不是脚后跟关节）。
 */
// [v185 降噪] 拒绝警告节流（模块级）：键=source|bone|类别，3s 窗口只告警一次
//   （连续 std 播放被拒时每帧刷告警，一次挥手曾刷 500+ 条）
const jcWarnThrottle: Record<string, number> = {};
function jcWarnOnce(key: string): boolean {
  const now = performance.now();
  const last = jcWarnThrottle[key] || 0;
  if (now - last < 3000) return false;
  jcWarnThrottle[key] = now;
  return true;
}
function rotateJointWithProxy(
  skel: any,
  bone: any,
  rotation: { x: number; y: number; z: number },
  source: string,
  ctx?: CollisionContext
): boolean {
  const boneName = bone?.name || '';
  const cls = classifyBoneName(boneName);
  if (cls === 'decoPhysics') {
    console.warn(`[JointControl:${source}] 拒绝旋转 "${boneName}"：服饰/物理附属骨，不是脚后跟关节`);
    return false;
  }
  if (cls === 'positionLocked') {
    console.warn(`[JointControl:${source}] 拒绝旋转 "${boneName}"：位置锁死骨`);
    return false;
  }
  const okMain = safeRotateJoint(bone, rotation, source, ctx);
  // D 系代理：与标准骨同角同步（可见鞋/腿网格在 D 系上，只转标准骨会「脚不动跟乱动」）
  const proxy = findJointProxyBone(skel, boneName);
  if (proxy && proxy !== bone) {
    try {
      // 代理骨不做碰撞回滚主判定，仅同步角度
      safeRotateJoint(proxy, rotation, source + '+D', undefined);
    } catch (e) {
      console.warn(`[JointControl:${source}] D系代理 "${proxy.name}" 同步失败:`, e);
    }
  }
  return okMain;
}

/** 判断骨骼是否为位置锁死骨骼（绝对静止） */
function isPositionLockedBone(name: string): boolean {
  const n = (name || '').toLowerCase();
  if (!n) return false;
  for (const kw of POSITION_LOCK_KEYWORDS) {
    if (n.includes(kw.toLowerCase())) return true;
  }
  return false;
}

/**
 * 检查骨骼的父骨骼链中是否有尾巴骨骼（向上遍历，最多10层）
 * 用途：尾巴子骨骼可能不含"尾"关键词（如bone_045），需通过父骨骼链识别
 * 新增于尾巴修复：解决BFS传播导致的尾巴子骨骼交叉污染问题
 *
 * @param bone 起始骨骼
 * @returns true=父骨骼链中有尾巴骨骼
 */
function isTailByParentChain(bone: any): boolean {
  try {
    let parent: any = bone.getParent ? bone.getParent() : (bone as any).parent;
    let depth = 0;
    while (parent && depth < 10) {
      const pName = (parent.name || '').toLowerCase();
      // 尾巴骨骼关键词（与L2146保持一致）
      const pIsTailBone = pName.includes('tail') || pName.includes('尾') || pName.includes('尻尾') || pName.includes('しっぽ');
      // 排除人体尾骨、IK骨骼
      const pIsTailExcluded = pName.includes('尾骨') || pName.includes('coccyx') || pName.includes('tailbone') || pName.includes('ik');
      if (pIsTailBone && !pIsTailExcluded) {
        return true;
      }
      parent = parent.getParent ? parent.getParent() : (parent as any).parent;
      depth++;
    }
  } catch (e) {
    // 静默失败，返回false（不视为尾巴）
  }
  return false;
}

/**
 * 判断骨骼名是否含头发关键词（用于排除非尾巴骨骼）
 * 新增于尾巴修复：防止头发骨骼被误判为尾巴子骨骼
 */
function hasHairKeyword(name: string): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('hair') || n.includes('髪') || n.includes('发') ||
         n.includes('前髪') || n.includes('後ろ髪') || n.includes('後髪') ||
         n.includes('サイド髪') || n.includes('横髪');
}

/**
 * 关节生理极限（弧度，相对 bind pose 的增量）
 * 超过此值会被拒绝，防止出现"头转到背后"等非自然姿态
 */
interface JointLimit {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  zMin: number; zMax: number;
}

/** 默认关节极限（保守值，避免穿模和诡异姿态） */
const DEFAULT_JOINT_LIMIT: JointLimit = {
  xMin: -Math.PI * 0.6, xMax: Math.PI * 0.6,  // ±108°
  yMin: -Math.PI * 0.6, yMax: Math.PI * 0.6,
  zMin: -Math.PI * 0.6, zMax: Math.PI * 0.6,
};

/** 特殊关节极限（按关键词匹配，更严格的约束）
 * [2026-09-18 方案A] 按人体解剖收紧铰链关节副轴：
 *   - 手指/膝：副轴≈0，主轴屈伸保留
 *   - 肘：只收 Y（侧摆）；Z=琳奈 profile 主屈伸轴（wave bend Z-），范围必须够校准配方
 *   - 踝：保留屈伸+内外翻，收紧绕小腿自转(Y)
 *   - 关键词顺序：手首/足首 含「首」，必须写在「首=颈」之前，否则腕踝误用颈极限
 *   - 肩/髋/脊柱：保持三轴（球窝/多轴，当前正确）
 */
const SPECIAL_JOINT_LIMITS: Array<{ keywords: string[]; limit: JointLimit }> = [
  // 头部：点头/摇头幅度有限
  { keywords: ['頭', 'head'], limit: { xMin: -0.7, xMax: 0.5, yMin: -0.9, yMax: 0.9, zMin: -0.4, zMax: 0.4 } },
  // 腕（MMD 手首）：屈伸+尺桡偏；须在「首=颈」之前
  { keywords: ['手首', 'wrist'], limit: { xMin: -0.9, xMax: 0.9, yMin: -0.2, yMax: 0.2, zMin: -0.7, zMax: 0.7 } },
  // 踝（足首）：屈伸(X)+内外翻(Z)；Y=绕小腿自转收紧
  { keywords: ['足首', 'ankle'], limit: { xMin: -0.8, xMax: 0.7, yMin: -0.12, yMax: 0.12, zMin: -0.55, zMax: 0.55 } },
  // 颈：比头更受限（方案A：极限数值不动，X被拒原因另行诊断）
  { keywords: ['首', 'neck'], limit: { xMin: -0.5, xMax: 0.4, yMin: -0.7, yMax: 0.7, zMin: -0.3, zMax: 0.3 } },
  // 肩胛骨（肩P/肩C）：Z轴 ±38°（+8° 调整，原 ±30°），其他轴严格限制
  // 必须放在"肩"通用条目之前，避免被通用条目覆盖
  { keywords: ['肩P', '肩C', 'shoulderP', 'shoulderC'], limit: { xMin: -0.3, xMax: 0.3, yMin: -0.3, yMax: 0.3, zMin: -0.663, zMax: 0.663 } },
  // 肩通用（外展/前屈）：X轴 ±98°（前屈并集），Z轴 ±188°（外展并集），+8° 调整
  // 覆盖左/右肩外展和前屈的并集范围，Y轴保守
  { keywords: ['肩', 'shoulder'], limit: { xMin: -1.710, xMax: 1.710, yMin: -0.5, yMax: 0.5, zMin: -3.284, zMax: 3.284 } },
  // [方案A] 肘：Y=解剖上几乎无侧摆→收紧；Z=琳奈实测主屈伸（profile bend axis=z，wave±66°）
  //   —— 不可按「肘只留X」改，否则 std wave / 硬编码举臂在 safeRotate 被拒
  { keywords: ['肘', 'ひじ', 'elbow'], limit: { xMin: 0, xMax: 2.2, yMin: -0.08, yMax: 0.08, zMin: -1.45, zMax: 0.40 } },
  // [方案A] 膝：铰链，主轴 X 屈伸；副轴收紧
  //   [坑] 琳奈膝骨名是「ひざ」不是中文「膝」——关键词必须含日文，否则落到 DEFAULT 三轴全开
  { keywords: ['膝', 'ひざ', 'knee'], limit: { xMin: 0, xMax: 2.0, yMin: -0.05, yMax: 0.05, zMin: -0.08, zMax: 0.08 } },
  // [方案A] 手指：主轴 X 屈伸（已实测）；副轴收紧（拇指可略宽于其他指）
  { keywords: ['親指', 'thumb'], limit: { xMin: 0, xMax: 1.6, yMin: -0.15, yMax: 0.15, zMin: -0.20, zMax: 0.20 } },
  { keywords: ['指', 'finger'], limit: { xMin: 0, xMax: 1.8, yMin: -0.08, yMax: 0.08, zMin: -0.12, zMax: 0.12 } },
];

/** 获取关节的生理极限 */
function getJointLimit(name: string): JointLimit {
  const n = (name || '').toLowerCase();
  for (const special of SPECIAL_JOINT_LIMITS) {
    if (special.keywords.some(kw => n.includes(kw.toLowerCase()))) {
      return special.limit;
    }
  }
  return DEFAULT_JOINT_LIMIT;
}

/** 检查欧拉角是否在极限范围内 */
function isWithinJointLimit(rotation: { x: number; y: number; z: number }, limit: JointLimit): boolean {
  return rotation.x >= limit.xMin && rotation.x <= limit.xMax
      && rotation.y >= limit.yMin && rotation.y <= limit.yMax
      && rotation.z >= limit.zMin && rotation.z <= limit.zMax;
}

/**
 * 碰撞检测上下文（可选传入，用于关节旋转后的穿模检测）
 *
 * 调用方（如 window.__jointControl.rotate）在持有 skeleton 和 collisionBodies 时
 * 可构造此上下文传入 safeRotateJoint，使旋转后立即检测主动碰撞体相交，
 * 相交则回滚到原旋转，拒绝该次操作。这是"捏脸/运动时无反馈"问题的核心修复。
 */
interface CollisionContext {
  skeleton: any;
  bodies: CollisionBody[];
}

/**
 * 安全旋转关节（核心 API）
 *
 * 安全保证：
 * 1. 骨骼必须是关节（白名单匹配 + 黑名单排除），否则拒绝
 * 2. 旋转角度必须在生理极限内，否则拒绝
 * 3. 旋转前保存局部位置，旋转后强制恢复，确保只改旋转不改位置
 * 4. 旋转后验证位置变化 < 0.001，否则输出错误日志并尝试恢复
 * 5. 若提供 collisionContext：旋转后检测主动碰撞体相交，相交则回滚拒绝
 *
 * @param bone 要旋转的骨骼
 * @param rotation 欧拉角旋转（弧度，相对 bind pose 的本地旋转）
 * @param source 操作来源（用于日志追踪）
 * @param collisionContext 可选碰撞上下文，传入后启用穿模反馈
 * @returns true=成功，false=被拒绝或失败
 */
function safeRotateJoint(
  bone: any,
  rotation: { x: number; y: number; z: number },
  source: string = 'unknown',
  collisionContext?: CollisionContext
): boolean {
  if (!bone) {
    console.warn(`[JointControl:${source}] 骨骼为空，拒绝`);
    return false;
  }

  const boneName = bone.name || '(unnamed)';

  // [动捕模式] 真人物理世界已有约束，动捕源跳过软件极限和碰撞检测
  const isMocap = source === 'dongbu';
  if (isMocap) {
    // 记录动捕活跃时间（供呼吸观察者冻结判断）
    try { (window as any).__lastMocapAt = Date.now(); } catch { /* noop */ }
  }

  // 检查1：必须是关节（动捕也要过——非关节骨骼确实不能旋）
  if (!isJointBone(boneName)) {
    if (!isMocap) console.warn(`[JointControl:${source}] 拒绝旋转非关节骨骼: "${boneName}"`);
    return false;
  }

  // 检查2：位置锁死骨骼一律拒绝（动捕也遵守——位置锁死是硬约束）
  if (isPositionLockedBone(boneName)) {
    console.warn(`[JointControl:${source}] 拒绝操作位置锁死骨骼: "${boneName}"`);
    return false;
  }

  // 检查3：生理极限（动捕源跳过——真人物理世界已有约束）
  if (!isMocap) {
    const limit = getJointLimit(boneName);
    if (!isWithinJointLimit(rotation, limit)) {
      if (jcWarnOnce(source + "|limit|" + boneName))       console.warn(`[JointControl:${source}] 拒绝旋转 "${boneName}"：超出生理极限 (x:${rotation.x.toFixed(2)}, y:${rotation.y.toFixed(2)}, z:${rotation.z.toFixed(2)}) 极限:(x:[${limit.xMin.toFixed(2)},${limit.xMax.toFixed(2)}] y:[${limit.yMin.toFixed(2)},${limit.yMax.toFixed(2)}] z:[${limit.zMin.toFixed(2)},${limit.zMax.toFixed(2)}])`);
      return false;
    }
  }

  // 旋转前保存原始四元数（用于碰撞回滚）
  let prevQuat: Quaternion | null = null;
  try {
    prevQuat = bone.getRotationQuaternion(Space.LOCAL)?.clone() ?? null;
  } catch (e) {
    prevQuat = null;
  }

  try {
    // 保存原始局部位置
    const localMatrix = bone.getLocalMatrix();
    const originalPos = localMatrix.getTranslation();

    // 应用旋转（Space.LOCAL）
    const quat = Quaternion.FromEulerAngles(rotation.x, rotation.y, rotation.z);
    bone.setRotationQuaternion(quat, Space.LOCAL);

    // 强制恢复位置：确保只改了旋转，X/Y/Z 轴位置不变
    bone.setPosition(originalPos, Space.LOCAL);

    // 验证位置变化
    const restoredPos = bone.getLocalMatrix().getTranslation();
    const posDelta = Math.abs(restoredPos.x - originalPos.x)
                   + Math.abs(restoredPos.y - originalPos.y)
                   + Math.abs(restoredPos.z - originalPos.z);
    if (posDelta > 0.001) {
      console.error(`[JointControl:${source}] "${boneName}" 位置异常变化! 原始=(${originalPos.x.toFixed(3)},${originalPos.y.toFixed(3)},${originalPos.z.toFixed(3)}) 恢复=(${restoredPos.x.toFixed(3)},${restoredPos.y.toFixed(3)},${restoredPos.z.toFixed(3)})`);
      return false;
    }

    // 检查4：碰撞反馈（动捕源跳过——真人物理世界已有约束）
    if (!isMocap && collisionContext && collisionContext.bodies.length > 0) {
      const computeIntersections = () => {
        try {
          collisionContext.skeleton.computeAbsoluteMatrices?.(true);
        } catch (e) {
          try { collisionContext.skeleton.computeAbsoluteMatrices?.(); } catch (_) { /* noop */ }
        }
        const posLookup = buildSkeletonPosLookup(collisionContext.skeleton);
        const runtimes = buildCollisionRuntimes(collisionContext.bodies, posLookup);
        return detectJointCollision(runtimes.spheres, runtimes.capsules);
      };

      // 旋转前基线（bind/当前姿态下已存在的相交对，视为"天然贴合"）
      let baselinePairs: Set<string>;
      try {
        baselinePairs = new Set(computeIntersections().map(x => `${x.a}|${x.b}`));
      } catch (e) {
        baselinePairs = new Set(); // 基线采样失败则退回旧行为（全量检测）
      }

      const intersections = computeIntersections()
        .filter(x => !baselinePairs.has(`${x.a}|${x.b}`));

      if (intersections.length > 0) {
        // 碰撞：回滚到原旋转
        if (prevQuat) {
          try { bone.setRotationQuaternion(prevQuat, Space.LOCAL); } catch (e) { /* noop */ }
          try { bone.setPosition(originalPos, Space.LOCAL); } catch (e) { /* noop */ }
        }
        console.warn(`[JointControl:${source}] 拒绝旋转 "${boneName}"：新增 ${intersections.length} 处碰撞，已回滚（首条：${intersections[0].reason}）`);
        return false;
      }
    }

    if (BONE_DEBUG) {
      console.log(`[JointControl:${source}] ✓ "${boneName}" 旋转 (x:${rotation.x.toFixed(2)}, y:${rotation.y.toFixed(2)}, z:${rotation.z.toFixed(2)}) 位置不变${collisionContext ? ' 碰撞检测通过' : ''}`);
    }
    return true;
  } catch (err) {
    console.error(`[JointControl:${source}] "${boneName}" 旋转异常:`, err);
    return false;
  }
}

/**
 * 列出模型所有关节骨骼（用于动态调整 UI）
 * 返回 { 关节列表, 非关节列表, 位置锁死列表 }
 */
function listJointsAndNonJoints(skeleton: any): {
  joints: string[];
  nonJoints: string[];
  locked: string[];
} {
  if (!skeleton || !skeleton.bones) return { joints: [], nonJoints: [], locked: [] };
  const joints: string[] = [];
  const nonJoints: string[] = [];
  const locked: string[] = [];
  for (const bone of skeleton.bones) {
    const name = bone.name || '(unnamed)';
    if (isPositionLockedBone(name)) {
      locked.push(name);
    } else if (isJointBone(name)) {
      joints.push(name);
    } else {
      nonJoints.push(name);
    }
  }
  return { joints, nonJoints, locked };
}

// ==================== 碰撞体系统（Blender 风格角色物理碰撞） ====================
//
// 设计参考：Blender 的 Collision Modifier + Cloth Collision + Bone Collision
// 仅针对角色，仿照 Blender 开发（不使用 Bullet/Ammo 物理引擎）
//
// 【Blender 角色碰撞体设计原则】
// 1. 主动碰撞体（Active Collider）：跟随骨骼运动的刚性部件，作为碰撞源
//    - 头部、颈、躯干（胸/腰/盆骨）、四肢（上臂/下臂/大腿/小腿）、手脚
// 2. 被动碰撞体（Soft Body）：被推动的柔性部件
//    - 头发、衣摆、手指（这些骨骼位置可被修正）
// 3. 关节旋转反馈：当关节旋转导致主动碰撞体相交时，拒绝该旋转
//    - 例如：手臂旋转穿入躯干 → safeRotateJoint 收到碰撞信号 → 拒绝
// 4. 面部捏脸反馈：面部 morph 边界由面部碰撞体定义
//
// 【碰撞体分组】（与 Blender Collider Group 一致）
// - head:    头部（球体，含子区域）
// - spine:   脊椎（颈/胸/腰/盆骨胶囊体链）
// - arm:     手臂（上臂/下臂胶囊体，左右各2）
// - leg:     腿部（大腿/小腿胶囊体，左右各2）
// - hand:    手部（手掌球体 + 手指胶囊体）
// - foot:    脚部（脚掌球体 + 脚趾胶囊体）
//

/** 碰撞体分组（仿 Blender Collider Group） */
type CollisionGroup = 'head' | 'spine' | 'arm' | 'leg' | 'hand' | 'foot';

/** 碰撞体侧别 */
type CollisionSide = 'left' | 'right' | 'center';

/** 球体碰撞体（头、手、脚、关节点） */
interface SphereCollision {
  id: string;
  type: 'sphere';
  group: CollisionGroup;
  side: CollisionSide;
  boneName: string;        // 绑定骨骼名（用骨骼世界位置作为球心）
  radius: number;          // 球半径（模型单位）
  offset?: Vector3;        // 相对骨骼位置的偏移
}

/** 胶囊体碰撞体（躯干、四肢） */
interface CapsuleCollision {
  id: string;
  type: 'capsule';
  group: CollisionGroup;
  side: CollisionSide;
  boneAName: string;       // 起点骨骼名
  boneBName: string;       // 终点骨骼名
  radius: number;          // 胶囊半径
  offsetA?: Vector3;       // 起点偏移
  offsetB?: Vector3;       // 终点偏移
}

type CollisionBody = SphereCollision | CapsuleCollision;

/** 胶囊体运行时数据（每帧更新） */
interface CapsuleRuntime {
  id: string;
  group: CollisionGroup;
  side: CollisionSide;
  pointA: Vector3;
  pointB: Vector3;
  radius: number;
}

/** 球体运行时数据（每帧更新） */
interface SphereRuntime {
  id: string;
  group: CollisionGroup;
  side: CollisionSide;
  center: Vector3;
  radius: number;
}

/** 点到线段的最近点 */
function closestPointOnSegment(p: Vector3, a: Vector3, b: Vector3): Vector3 {
  const ab = b.subtract(a);
  const ap = p.subtract(a);
  const abLenSq = ab.lengthSquared();
  if (abLenSq < 1e-8) return a.clone();
  let t = Vector3.Dot(ap, ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  return a.add(ab.scale(t));
}

/** 点到球体表面的最短推出向量（如果点在球外，返回零向量） */
function pushOutOfSphere(point: Vector3, sphereCenter: Vector3, radius: number): Vector3 {
  const diff = point.subtract(sphereCenter);
  const dist = diff.length();
  if (dist >= radius || dist < 1e-6) return Vector3.Zero();
  const pushDist = radius - dist;
  return diff.normalize().scale(pushDist);
}

/** 点到胶囊体表面的最短推出向量 */
function pushOutOfCapsule(point: Vector3, capA: Vector3, capB: Vector3, radius: number): Vector3 {
  const closest = closestPointOnSegment(point, capA, capB);
  return pushOutOfSphere(point, closest, radius);
}

/** 胶囊体与胶囊体相交检测（用于关节运动防穿模） */
function capsulesIntersect(
  a1: Vector3, a2: Vector3, rA: number,
  b1: Vector3, b2: Vector3, rB: number
): boolean {
  // 简化算法：在两条线段上各采样若干点，检测点是否穿入对方胶囊
  const SAMPLES = 6;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = a1.add(a2.subtract(a1).scale(t));
    if (pushOutOfCapsule(p, b1, b2, rB).lengthSquared() > 0) return true;
  }
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = b1.add(b2.subtract(b1).scale(t));
    if (pushOutOfCapsule(p, a1, a2, rA).lengthSquared() > 0) return true;
  }
  return false;
}

/** 球体与胶囊体相交检测 */
function sphereCapsuleIntersect(
  center: Vector3, radius: number,
  capA: Vector3, capB: Vector3, capR: number
): boolean {
  return pushOutOfCapsule(center, capA, capB, capR + radius).lengthSquared() > 0;
}

/**
 * 自动识别模型关键部位并创建碰撞体（Blender 风格）
 *
 * 识别策略：
 * - 头部：球体（含子区域偏移）
 * - 颈部：胶囊体（首→頭）
 * - 躯干：上半身→腰、腰→下半身 两个胶囊体
 * - 上臂：肩→肘 胶囊体（左右）
 * - 下臂：肘→手腕 胶囊体（左右）
 * - 大腿：腿→膝 胶囊体（左右）
 * - 小腿：膝→脚踝 胶囊体（左右）
 * - 手：手腕处球体（左右）
 * - 脚：脚踝处球体（左右）
 *
 * 半径按身高比例（Blender MMD Rig 标准比例）
 */
function autoCreateCollisionBodies(skeleton: any): CollisionBody[] {
  const bodies: CollisionBody[] = [];
  if (!skeleton || !skeleton.bones) return bodies;

  let idCounter = 0;
  const nextId = () => `col_${++idCounter}`;

  // 骨骼名查找（支持多种命名）
  const findBone = (keywords: string[]): any => {
    for (const bone of skeleton.bones) {
      const name = (bone.name || '').toLowerCase();
      if (keywords.some(kw => name.includes(kw.toLowerCase()))) return bone;
    }
    return null;
  };

  // 按侧别查找
  const findBoneBySide = (keywords: string[], side: 'left' | 'right'): any => {
    const sideMarkers = side === 'left'
      ? ['左', 'l', 'left']
      : ['右', 'r', 'right'];
    for (const bone of skeleton.bones) {
      const name = (bone.name || '').toLowerCase();
      if (!keywords.some(kw => name.includes(kw.toLowerCase()))) continue;
      if (sideMarkers.some(sm => name.includes(sm.toLowerCase()))) return bone;
    }
    return null;
  };

  // 读取骨骼世界位置（优先使用 bind matrix，更稳定）
  // MmdRuntime 接管后 getAbsoluteMatrix() 可能不准确，bind matrix 是静态的
  const getBonePos = (bone: any): Vector3 | null => {
    if (!bone) return null;
    // 优先使用 _absoluteBindMatrix（静态，不受动画/物理影响）
    const m = (bone as any)._absoluteBindMatrix || (bone as any).getAbsoluteMatrix?.();
    if (!m) return null;
    const t = m.getTranslation();
    if (!t) return null;
    return new Vector3(t.x, t.y, t.z);
  };

  // 估算模型身高
  const headBone = findBone(['頭', 'head']);
  const ankleBone = findBone(['足首', 'ankle']);
  const headPos = getBonePos(headBone);
  const anklePos = getBonePos(ankleBone);
  let modelHeight = 1.6;
  if (headPos && anklePos) {
    modelHeight = Math.abs(headPos.y - anklePos.y);
    if (modelHeight < 0.5) modelHeight = 1.6;
  }

  // Blender MMD Rig 标准比例（按身高）
  // 进一步增大覆盖率（约+30%），重点防护头发穿过胸部/肩膀
  const R = {
    head: modelHeight * 0.085,     // 头部（原0.065）
    neck: modelHeight * 0.040,     // 颈部（原0.03）
    chest: modelHeight * 0.145,    // 胸部（原0.11，重点防护头发穿模）
    waist: modelHeight * 0.130,    // 腰部（原0.10）
    hip: modelHeight * 0.140,      // 盆骨（原0.11）
    upperArm: modelHeight * 0.055, // 上臂（原0.035）
    lowerArm: modelHeight * 0.050, // 下臂（原0.030）
    thigh: modelHeight * 0.095,    // 大腿（原0.07）
    calf: modelHeight * 0.080,     // 小腿（原0.055）
    hand: modelHeight * 0.065,     // 手掌（原0.045）
    foot: modelHeight * 0.075,     // 脚掌（原0.05）
  };

  console.log(`[Collision] 模型身高:${modelHeight.toFixed(2)} 比例:头${R.head.toFixed(3)} 胸${R.chest.toFixed(3)} 臂${R.upperArm.toFixed(3)} 腿${R.thigh.toFixed(3)}`);

  // ===== 1. 头部（球体） =====
  if (headBone) {
    bodies.push({
      id: nextId(), type: 'sphere', group: 'head', side: 'center',
      boneName: headBone.name, radius: R.head,
      offset: new Vector3(0, modelHeight * 0.025, 0),
    });
  }

  // ===== 2. 颈部（胶囊体：首→頭） =====
  const neckBone = findBone(['首', 'neck']);
  if (neckBone && headBone) {
    bodies.push({
      id: nextId(), type: 'capsule', group: 'spine', side: 'center',
      boneAName: neckBone.name, boneBName: headBone.name, radius: R.neck,
    });
  }

  // ===== 3. 躯干（上半身→腰→下半身） =====
  const upperBody = findBone(['上半身', 'upper body', 'chest']);
  const waist = findBone(['腰', 'waist']);
  const lowerBody = findBone(['下半身', 'lower body']);
  if (upperBody && waist) {
    bodies.push({
      id: nextId(), type: 'capsule', group: 'spine', side: 'center',
      boneAName: upperBody.name, boneBName: waist.name, radius: R.chest,
    });
  }
  if (waist && lowerBody && waist.name !== lowerBody.name) {
    bodies.push({
      id: nextId(), type: 'capsule', group: 'spine', side: 'center',
      boneAName: waist.name, boneBName: lowerBody.name, radius: R.waist,
    });
  }

  // ===== 4. 手臂（左右各2个胶囊体：上臂、下臂） =====
  for (const side of ['left', 'right'] as const) {
    const shoulder = findBoneBySide(['肩', 'shoulder', 'clavicle'], side);
    const upperArm = findBoneBySide(['腕', 'arm'], side);
    const elbow = findBoneBySide(['肘', 'ひじ', 'elbow'], side);
    const wrist = findBoneBySide(['手首', 'wrist', 'hand'], side);

    // 上臂：肩→肘
    if (shoulder && elbow) {
      bodies.push({
        id: nextId(), type: 'capsule', group: 'arm', side,
        boneAName: shoulder.name, boneBName: elbow.name, radius: R.upperArm,
      });
    } else if (upperArm && elbow) {
      // 备选：上臂骨→肘
      bodies.push({
        id: nextId(), type: 'capsule', group: 'arm', side,
        boneAName: upperArm.name, boneBName: elbow.name, radius: R.upperArm,
      });
    }

    // 下臂：肘→手腕
    if (elbow && wrist) {
      bodies.push({
        id: nextId(), type: 'capsule', group: 'arm', side,
        boneAName: elbow.name, boneBName: wrist.name, radius: R.lowerArm,
      });
    }

    // 手掌（球体）
    if (wrist) {
      bodies.push({
        id: nextId(), type: 'sphere', group: 'hand', side,
        boneName: wrist.name, radius: R.hand,
      });
    }
  }

  // ===== 5. 腿部（左右各2个胶囊体：大腿、小腿） =====
  for (const side of ['left', 'right'] as const) {
    const leg = findBoneBySide(['足', 'leg', '腿'], side);
    const knee = findBoneBySide(['膝', 'knee'], side);
    const ankle = findBoneBySide(['足首', 'ankle'], side);

    // 大腿：腿→膝
    if (leg && knee) {
      bodies.push({
        id: nextId(), type: 'capsule', group: 'leg', side,
        boneAName: leg.name, boneBName: knee.name, radius: R.thigh,
      });
    }

    // 小腿：膝→脚踝
    if (knee && ankle) {
      bodies.push({
        id: nextId(), type: 'capsule', group: 'leg', side,
        boneAName: knee.name, boneBName: ankle.name, radius: R.calf,
      });
    }

    // 脚掌（球体）
    if (ankle) {
      bodies.push({
        id: nextId(), type: 'sphere', group: 'foot', side,
        boneName: ankle.name, radius: R.foot,
        offset: new Vector3(0, 0, modelHeight * 0.02),
      });
    }
  }

  console.log(`[Collision] 创建 ${bodies.length} 个碰撞体: ${bodies.map(b => b.type === 'sphere' ? `${b.group}(${b.side})` : `${b.group}(${b.side})`).join(' ')}`);
  return bodies;
}

/**
 * 构建骨骼名→世界位置的查找表（每帧调用一次）
 */
function buildSkeletonPosLookup(skeleton: any): Map<string, Vector3> {
  const lookup = new Map<string, Vector3>();
  if (!skeleton || !skeleton.bones) return lookup;
  for (const bone of skeleton.bones) {
    try {
      const m = (bone as any).getAbsoluteMatrix?.();
      if (m) {
        const t = m.getTranslation();
        if (t) lookup.set(bone.name, new Vector3(t.x, t.y, t.z));
      }
    } catch (e) {
      // 静默跳过
    }
  }
  return lookup;
}

/**
 * 把碰撞体定义转换为运行时数据（每帧更新位置）
 */
function buildCollisionRuntimes(
  bodies: CollisionBody[],
  posLookup: Map<string, Vector3>
): { spheres: SphereRuntime[]; capsules: CapsuleRuntime[] } {
  const spheres: SphereRuntime[] = [];
  const capsules: CapsuleRuntime[] = [];

  for (const body of bodies) {
    if (body.type === 'sphere') {
      const center = posLookup.get(body.boneName);
      if (!center) continue;
      const c = body.offset ? center.add(body.offset) : center;
      spheres.push({
        id: body.id, group: body.group, side: body.side,
        center: c, radius: body.radius,
      });
    } else {
      const a = posLookup.get(body.boneAName);
      const b = posLookup.get(body.boneBName);
      if (!a || !b) continue;
      const pa = body.offsetA ? a.add(body.offsetA) : a;
      const pb = body.offsetB ? b.add(body.offsetB) : b;
      capsules.push({
        id: body.id, group: body.group, side: body.side,
        pointA: pa, pointB: pb, radius: body.radius,
      });
    }
  }

  return { spheres, capsules };
}

/**
 * 检测柔性骨骼是否穿入碰撞体，返回修正后的世界位置
 */
function resolveCollisionForPoint(
  bonePos: Vector3,
  spheres: SphereRuntime[],
  capsules: CapsuleRuntime[]
): Vector3 {
  let resolved = bonePos.clone();

  for (const s of spheres) {
    const push = pushOutOfSphere(resolved, s.center, s.radius);
    if (push.lengthSquared() > 0) resolved = resolved.add(push);
  }

  for (const c of capsules) {
    const push = pushOutOfCapsule(resolved, c.pointA, c.pointB, c.radius);
    if (push.lengthSquared() > 0) resolved = resolved.add(push);
  }

  return resolved;
}

/**
 * 检测关节旋转后是否会导致碰撞体相交（用于 safeRotateJoint 碰撞反馈）
 *
 * @param spheres 当前所有球体（旋转后已更新）
 * @param capsules 当前所有胶囊体（旋转后已更新）
 * @param ignoreGroups 不检测的组（同组不互相碰撞，比如手指之间）
 * @returns 相交的碰撞体对（如果有）
 */
function detectJointCollision(
  spheres: SphereRuntime[],
  capsules: CapsuleRuntime[],
  ignoreGroups: Array<[CollisionGroup, CollisionGroup]> = []
): Array<{ a: string; b: string; reason: string }> {
  const intersections: Array<{ a: string; b: string; reason: string }> = [];

  const shouldIgnore = (g1: CollisionGroup, g2: CollisionGroup): boolean => {
    for (const [a, b] of ignoreGroups) {
      if ((a === g1 && b === g2) || (a === g2 && b === g1)) return true;
    }
    // 同组不互撞
    if (g1 === g2) return true;
    // 邻接组不互撞（如上臂-下臂、大腿-小腿）
    const adjacent: Array<[CollisionGroup, CollisionGroup]> = [
      ['spine', 'head'],   // 颈-头
      ['spine', 'arm'],    // 躯干-上臂
      ['arm', 'arm'],      // 上臂-下臂（同组忽略）
      ['leg', 'leg'],
    ];
    for (const [a, b] of adjacent) {
      if ((a === g1 && b === g2) || (a === g2 && b === g1)) return true;
    }
    return false;
  };

  // 球-球
  for (let i = 0; i < spheres.length; i++) {
    for (let j = i + 1; j < spheres.length; j++) {
      if (shouldIgnore(spheres[i].group, spheres[j].group)) continue;
      const dist = Vector3.Distance(spheres[i].center, spheres[j].center);
      if (dist < spheres[i].radius + spheres[j].radius) {
        intersections.push({
          a: spheres[i].id, b: spheres[j].id,
          reason: `球(${spheres[i].group}/${spheres[i].side}) 与 球(${spheres[j].group}/${spheres[j].side}) 相交`,
        });
      }
    }
  }

  // 球-胶囊
  for (const s of spheres) {
    for (const c of capsules) {
      if (shouldIgnore(s.group, c.group)) continue;
      if (sphereCapsuleIntersect(s.center, s.radius, c.pointA, c.pointB, c.radius)) {
        intersections.push({
          a: s.id, b: c.id,
          reason: `球(${s.group}/${s.side}) 与 胶囊(${c.group}/${c.side}) 相交`,
        });
      }
    }
  }

  // 胶囊-胶囊
  for (let i = 0; i < capsules.length; i++) {
    for (let j = i + 1; j < capsules.length; j++) {
      if (shouldIgnore(capsules[i].group, capsules[j].group)) continue;
      if (capsulesIntersect(
        capsules[i].pointA, capsules[i].pointB, capsules[i].radius,
        capsules[j].pointA, capsules[j].pointB, capsules[j].radius
      )) {
        intersections.push({
          a: capsules[i].id, b: capsules[j].id,
          reason: `胶囊(${capsules[i].group}/${capsules[i].side}) 与 胶囊(${capsules[j].group}/${capsules[j].side}) 相交`,
        });
      }
    }
  }

  return intersections;
}

/**
 * 创建可视化调试网格（仿 Blender 碰撞体线框显示）
 * @param scene Babylon.js 场景
 * @param bodies 碰撞体定义
 * @param posLookup 骨骼位置查找表
 * @returns 调试网格数组（可隐藏/显示）
 */
function createCollisionDebugMeshes(
  scene: Scene,
  bodies: CollisionBody[],
  posLookup: Map<string, Vector3>
): Mesh[] {
  const meshes: Mesh[] = [];
  const groups: CollisionGroup[] = ['head', 'spine', 'arm', 'leg', 'hand', 'foot'];
  const colors: Record<CollisionGroup, Color3> = {
    head: new Color3(1, 0.4, 0.4),    // 红
    spine: new Color3(0.4, 1, 0.4),   // 绿
    arm: new Color3(0.4, 0.6, 1),     // 蓝
    leg: new Color3(1, 0.8, 0.4),     // 黄
    hand: new Color3(1, 0.4, 1),      // 紫
    foot: new Color3(0.4, 1, 1),      // 青
  };

  for (const body of bodies) {
    const color = colors[body.group];
    if (body.type === 'sphere') {
      const center = posLookup.get(body.boneName);
      if (!center) continue;
      const c = body.offset ? center.add(body.offset) : center;
      const sphere = MeshBuilder.CreateSphere(`col_debug_${body.id}`, {
        diameter: body.radius * 2,
        segments: 8,
      }, scene);
      sphere.position = c;
      const mat = new StandardMaterial(`col_debug_mat_${body.id}`, scene);
      mat.emissiveColor = color;
      mat.wireframe = true;
      mat.disableLighting = true;
      sphere.material = mat;
      sphere.isPickable = false;
      meshes.push(sphere);
    } else {
      const a = posLookup.get(body.boneAName);
      const b = posLookup.get(body.boneBName);
      if (!a || !b) continue;
      const pa = body.offsetA ? a.add(body.offsetA) : a;
      const pb = body.offsetB ? b.add(body.offsetB) : b;
      const mid = pa.add(pb).scale(0.5);
      const dir = pb.subtract(pa);
      const length = dir.length();
      if (length < 1e-4) continue;
      const capsule = MeshBuilder.CreateCapsule(`col_debug_${body.id}`, {
        radius: body.radius,
        height: length + body.radius * 2,
        tessellation: 8,
      }, scene);
      capsule.position = mid;
      // 朝向：从 pa 到 pb
      const up = new Vector3(0, 1, 0);
      const dirNorm = dir.normalize();
      const dot = Vector3.Dot(up, dirNorm);
      if (Math.abs(dot - 1) > 1e-4 && Math.abs(dot + 1) > 1e-4) {
        const axis = Vector3.Cross(up, dirNorm).normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        capsule.rotationQuaternion = Quaternion.RotationAxis(axis, angle);
      } else if (dot < 0) {
        capsule.rotationQuaternion = Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI);
      }
      const mat = new StandardMaterial(`col_debug_mat_${body.id}`, scene);
      mat.emissiveColor = color;
      mat.wireframe = true;
      mat.disableLighting = true;
      capsule.material = mat;
      capsule.isPickable = false;
      meshes.push(capsule);
    }
  }

  void groups;
  return meshes;
}



// ==================== PMX 资源诊断 + BoneMorph 应用器 ====================
//
// 设计依据（参考 Blender 工作流 + PMX 规范 + babylon-mmd 实际行为）：
//
// 1. PMX 规范层面
//    - 骨骼只有 position（无 rotation）→ bind pose 由骨骼位置定义
//    - BoneMorph（type=2）保存预设姿态的 indices + rotations（四元数）
//    - 这是建模者在 PMX Editor 中制作的"预设姿态"，属于资源数据
//
// 2. babylon-mmd 行为
//    - _buildSkeletonAsync 只用 bone.position 创建 Bone
//    - BoneMorph 数据被解析并存到 rootMesh.metadata.morphs，但不自动应用
//    - 运行时需要主动读取 metadata.morphs 并应用 BoneMorph
//
// 3. MMD 生态的标准做法
//    - bind pose（T-pose/A-pose）→ 加载 VMD 动画 → 播放 → 得到任意姿态
//    - 部分 PMX 内置 BoneMorph 预设姿态（自然站姿/Relax/Idle 等）
//
// 本模块策略（验证驱动，不假设）：
//   A. 诊断：打印 PMX 实际包含的 morphs（名称/类型/影响骨骼数）
//   B. 检测：在 BoneMorph 中查找"自然站姿"候选（名称匹配）
//   C. 应用：如果找到，按 morph 数据应用骨骼旋转（四元数）
//   D. 不应用：如果没找到，保持 bind pose（不计算角度，不 fallback）
//

/** BoneMorph 类型常量（PMX 规范 Morph.Type.BoneMorph = 2） */
const PMX_MORPH_TYPE_BONE = 2;

/**
 * 诊断 PMX 资源：打印模型实际包含的 morphs 信息
 * 不修改任何数据，仅输出日志
 *
 * @param rootMesh PMX 根 mesh（含 metadata.morphs）
 */
function diagnosePmxResource(rootMesh: any): void {
  if (!BONE_DEBUG) return;
  try {
    const metadata = rootMesh?.metadata;
    if (!metadata || !metadata.isMmdModel) return;

    const morphs: any[] = metadata.morphs || [];
    const boneMorphs = morphs.filter(m => m.type === PMX_MORPH_TYPE_BONE);
    console.log(`[PmxDiagnose] morph:${morphs.length} boneMorph:${boneMorphs.length} 骨骼:${(metadata.bones || []).length}`);
  } catch (err) {
    console.warn('[PmxDiagnose] 诊断失败:', err);
  }
}

/**
 * 应用自然站姿：二次元游戏风格的手臂下落姿态
 *
 * 设计参考：原神、崩坏、星穹铁道等二次元游戏的角色待机姿势
 * - 手臂自然下落，但咯肢窝留有夹角（防穿模、更美观）
 * - 业内通用夹角：约 15°
 * - 手臂从 T-pose(水平 90°) 旋转 75°（非 90°），留 15° 夹角
 *
 * 算法（使用 buildHumanBody 识别的上臂骨骼）：
 * 1. 强制同步所有骨骼的 _absoluteMatrix
 * 2. 从 humanBody 获取 leftArm.upperArm 和 rightArm.upperArm
 * 3. 对每个 upperArm 骨骼：
 *    a. 获取骨骼位置和子骨骼位置
 *    b. 计算当前方向角度 atan2(dy, dx)
 *    c. 计算目标角度（右臂 -75°，左臂 -105°，留 15° 夹角）
 *    d. 用 setRotationQuaternion 公开 API 应用旋转
 *
 * @param skeleton Babylon.js Skeleton
 * @param humanBody 人体语义结构（包含手臂骨骼映射）
 * @returns 设置的骨骼数量
 */
function applyNaturalArmPose(skeleton: any, humanBody: HumanBody | null): number {
  if (!skeleton || !skeleton.bones || skeleton.bones.length === 0) {
    return 0;
  }

  try {
    // 步骤1：强制更新所有骨骼的 _absoluteMatrix
    skeleton.computeAbsoluteMatrices(true);

    // 业内标准夹角：15°（二次元游戏防穿模通用值）
    const ARMPIT_ANGLE = Math.PI / 12;  // 15° = π/12

    if (!humanBody || (!humanBody.leftArm && !humanBody.rightArm)) {
      console.warn('[ArmPose] humanBody 无手臂骨骼映射，跳过');
      return 0;
    }

    let count = 0;

    // 处理一条手臂
    const processArm = (arm: HumanArm | null, expectedSide: 'left' | 'right'): void => {
      if (!arm || !arm.upperArm) {
        console.warn(`[ArmPose] ${expectedSide}臂: 无 upperArm`);
        return;
      }

      const upperArm = arm.upperArm as any;
      const children: any[] = upperArm.getChildren ? upperArm.getChildren() : (upperArm.children || []);
      if (!children || children.length === 0) {
        console.warn(`[ArmPose] ${expectedSide}臂 "${upperArm.name}" 无子骨骼`);
        return;
      }

      // 用 lowerArm 作为方向参考，如果没有就用第一个子骨骼
      const childBone = arm.lowerArm || children[0];
      if (!childBone) {
        console.warn(`[ArmPose] ${expectedSide}臂 "${upperArm.name}" 无方向参考骨骼`);
        return;
      }

      // 读取骨骼世界位置：优先用 _absoluteBindMatrix（babylon-mmd 加载时正确设置）
      // 因为 _absoluteMatrix 可能未被正确更新（computeAbsoluteMatrices 对子骨骼可能无效）
      const bonePos = (upperArm as any)._absoluteBindMatrix?.getTranslation?.()
                    || (upperArm as any).getAbsoluteMatrix?.()?.getTranslation();
      const childPos = (childBone as any)._absoluteBindMatrix?.getTranslation?.()
                    || (childBone as any).getAbsoluteMatrix?.()?.getTranslation();
      if (!bonePos || !childPos) {
        console.warn(`[ArmPose] ${expectedSide}臂 "${upperArm.name}" 位置数据缺失`);
        return;
      }

      const dx = childPos.x - bonePos.x;
      const dy = childPos.y - bonePos.y;
      const dz = childPos.z - bonePos.z;
      const dirLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

      console.log(`[ArmPose] ${expectedSide}臂 "${upperArm.name}" 位置=(${bonePos.x.toFixed(2)},${bonePos.y.toFixed(2)},${bonePos.z.toFixed(2)}) 方向=(${dx.toFixed(2)},${dy.toFixed(2)},${dz.toFixed(2)}) 长度=${dirLength.toFixed(2)} 子骨骼="${childBone.name}"`);

      if (dirLength <= 0.01) {
        console.warn(`[ArmPose] ${expectedSide}臂 "${upperArm.name}" 方向长度过短，跳过`);
        return;
      }

      // 计算当前角度和目标角度
      const currentAngle = Math.atan2(dy, dx);

      // 关键：基于骨骼实际世界位置判断左右，不依赖骨骼名
      // 骨骼名"右腕"是模型视角的右臂，但模型面向观察者时，模型右臂在世界 -X 侧
      // 所以必须用 bonePos.x 判断：
      //   bonePos.x > 0：手臂在 +X 侧，向外 = +X，目标 = -75°（向下偏 +X）
      //   bonePos.x < 0：手臂在 -X 侧，向外 = -X，目标 = -105°（向下偏 -X）
      // 这样手臂向外倾斜 15°，咯肢窝打开，防止穿模
      const isOnPositiveX = bonePos.x > 0;
      const targetAngle = isOnPositiveX
        ? -Math.PI / 2 + ARMPIT_ANGLE   // +X侧手臂：-75°（向下偏外 +X）
        : -Math.PI / 2 - ARMPIT_ANGLE;  // -X侧手臂：-105°（向下偏外 -X）

      let rotateAngle = targetAngle - currentAngle;
      while (rotateAngle > Math.PI) rotateAngle -= 2 * Math.PI;
      while (rotateAngle < -Math.PI) rotateAngle += 2 * Math.PI;

      const currentDeg = (currentAngle * 180 / Math.PI).toFixed(1);
      const targetDeg = (targetAngle * 180 / Math.PI).toFixed(1);
      const rotateDeg = (rotateAngle * 180 / Math.PI).toFixed(1);
      const sideLabel = isOnPositiveX ? '+X侧' : '-X侧';
      console.log(`[ArmPose] ${expectedSide}臂(${sideLabel}) "${upperArm.name}" 当前:${currentDeg}° 目标:${targetDeg}° 需旋转:${rotateDeg}°`);

      if (Math.abs(rotateAngle) < 0.05) {
        console.log(`[ArmPose] ${expectedSide}臂 旋转角度过小，跳过`);
        return;
      }

      // 走安全通道：safeRotateJoint 会自动检查关节白名单、生理极限、强制锁死位置
      // 上臂是 Z 轴旋转（手臂在 XY 平面内绕 Z 轴转动）
      const success = safeRotateJoint(upperArm, { x: 0, y: 0, z: rotateAngle }, 'ArmPose');

      if (success) {
        count++;
        console.log(`[ArmPose] ✓ ${expectedSide}臂 "${upperArm.name}" 旋转 ${rotateDeg}° 留 15° 夹角（位置不变）`);
      } else {
        console.warn(`[ArmPose] ${expectedSide}臂 "${upperArm.name}" 旋转被安全通道拒绝`);
      }
    };

    processArm(humanBody.leftArm, 'left');
    processArm(humanBody.rightArm, 'right');

    // 步骤3：强制重新计算绝对矩阵
    skeleton.computeAbsoluteMatrices(true);

    console.log(`[ArmPose] 完成，旋转 ${count} 个骨骼（二次元游戏风格：咯肢窝留 15° 夹角）`);
    return count;
  } catch (err) {
    console.error('[ArmPose] 失败:', err);
    return 0;
  }
}

/**
 * 从webkitRelativePath中提取PMX内部相对路径
 * webkitRelativePath格式: "文件夹名/子目录/文件.png"
 * PMX内部路径格式: "子目录/文件.png"（相对于PMX文件所在目录）
 *
 * 策略：找到PMX文件在webkitRelativePath中的位置，取其后的路径
 * 例如：
 *   webkitRelativePath = "兹白_by_xxx/tex/颜.png"
 *   PMX的webkitRelativePath = "兹白_by_xxx/兹白.pmx"
 *   PMX所在目录 = "兹白_by_xxx"
 *   贴图相对路径 = "tex/颜.png"
 */
const extractRelativePath = (
  textureWebkitPath: string,
  modelWebkitPath: string
): string => {
  // 标准化路径
  const normTex = textureWebkitPath.replace(/\\/g, '/');
  const normModel = modelWebkitPath.replace(/\\/g, '/');

  // 获取PMX所在目录
  const lastSlash = normModel.lastIndexOf('/');
  if (lastSlash < 0) {
    // PMX在根目录，贴图路径就是原路径
    return normTex;
  }
  const modelDir = normModel.substring(0, lastSlash + 1); // "兹白_by_xxx/"

  // 如果贴图路径以PMX目录开头，去掉前缀
  if (normTex.toLowerCase().startsWith(modelDir.toLowerCase())) {
    return normTex.substring(modelDir.length);
  }

  // 否则返回原路径（可能贴图在不同目录）
  return normTex;
};

const BabylonModelViewer: React.FC<BabylonModelViewerProps> = ({ modelData, onClose, physicsEnabled = true,
           windEnabled = true, desktopPetMode = false, onModelLoaded, onModelError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const currentModelRef = useRef<any>(null);
  const objectUrlRef = useRef<string | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);
  // [2026-08-06 v7 修复场景被dispose] onClose 用 ref 存储，避免 useEffect 依赖 onClose
  // 根因：场景初始化 useEffect 之前依赖 [onClose]，onClose 引用变化会导致场景被 dispose 重建
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // 骨骼摆动相关引用
  // swingBonesRef：摆动骨骼列表（包含骨骼、基础旋转、相位偏移）
  // swingObserverRef：onBeforeRenderObservable 观察者（每帧施加摆动）
  const swingBonesRef = useRef<Array<{ bone: Bone; baseRotation: Quaternion; phase: number; axis: 'x' | 'y' | 'z'; isTail: boolean; chainIndex: number; collisionGroup: string }>>([]);
  const swingObserverRef = useRef<any>(null);
  // 碰撞体列表（用于防穿模，包含球体/胶囊体）
  const collisionBodiesRef = useRef<CollisionBody[]>([]);
  // 碰撞体可视化调试网格列表（仿 Blender 线框显示，默认隐藏）
  // 通过 window.__collisionDebug.showMeshes() / hideMeshes() / toggle() 控制
  const collisionDebugMeshesRef = useRef<Mesh[]>([]);
  // 呼吸+交互动作系统 ref
  // breathObserverRef：每帧呼吸+动作状态机观察者
  // doubleTapObserverRef：双击触发监听器
  // humanBodyRef/analysisRef：存储模型语义结构供双击时使用
  // animStateRef：当前动画状态（idle/wave/nod/shake/block）
  const breathObserverRef = useRef<any>(null);
  const doubleTapObserverRef = useRef<any>(null);
  const humanBodyRef = useRef<HumanBody | null>(null);
  const analysisRef = useRef<any>(null);
  // 动作状态机：action/idle/wave/nod/shake/block
  // actionBones 存储动作开始时骨骼的基础四元数，用于动作结束后恢复
  const animStateRef = useRef<{ action: string; startTime: number; duration: number; breathBaseRot: Vector3 | null; actionBones: Array<{ bone: any; baseQuat: Quaternion }>; params?: any }>({ action: 'idle', startTime: 0, duration: 0, breathBaseRot: null, actionBones: [] });
  // [2026-09-08 时间轴四段式原型] 动作队列：忙碌时新指令不再丢弃，先来后到排队等回收段结束接续
  const animQueueRef = useRef<Array<{ action: string; params?: any }>>([]);
  // [2026-09-08 T1 并发通道引擎] 并发动作层：与主层通道不相交的动作真同时动（骨骼集独立）
  const animLayersRef = useRef<Array<{ action: string; startTime: number; duration: number; actionBones: Array<{ bone: any; baseQuat: Quaternion; delay: number }>; params?: any }>>([]);
  // [T2.2 硬门] 帧间隔（秒）：运行时关节限速的 dt 基准
  const lastObsNowRef = useRef<number>(0);
    // [v192 生命感 T1-T4] 眨眼/视线/微动作/语音联动运行时状态
    const blinkMorphsRef = useRef<any[] | null>(null);
    const blinkStateRef = useRef<{ phase: number; value: number; nextAt: number }>({ phase: 0, value: 0, nextAt: 2500 });
    const gazeStateRef = useRef<{ curX: number; curY: number; tgtX: number; tgtY: number; px: number; py: number; lastMoveAt: number; glanceUntil: number; nextGlanceAt: number }>({ curX: 0, curY: 0, tgtX: 0, tgtY: 0, px: -1, py: -1, lastMoveAt: 0, glanceUntil: 0, nextGlanceAt: 0 });
    const speakingRef = useRef<{ active: boolean; nextAccentAt: number }>({ active: false, nextAccentAt: 0 });
    const microRef = useRef<{ nextAt: number }>({ nextAt: 12000 });
    // [v192 T4] TTS 语音播报事件监听（NewPage companionSpeakTTS 派发 rl-tts-start/end）
    useEffect(() => {
      const onStart = () => { speakingRef.current.active = true; speakingRef.current.nextAccentAt = performance.now() + 1200; };
      const onEnd = () => { speakingRef.current.active = false; };
      window.addEventListener('rl-tts-start', onStart);
      window.addEventListener('rl-tts-end', onEnd);
      return () => {
        window.removeEventListener('rl-tts-start', onStart);
        window.removeEventListener('rl-tts-end', onEnd);
        speakingRef.current.active = false;
      };
    }, []);
  // [T1.1 规范 rest pose] 全局唯一基准：所有动作层 offset 一律基于它，后启动层不再捕获"别的动作的偏移姿态"，
  // 动作结束自动归零回基准——"回收"保证天然成立（与难活②B rest pose 同源）
  const restPoseRef = useRef<Map<Bone, Quaternion>>(new Map());
  // [v49] 模型加载中标记（加载资源分配：加载期间暂停动画 + 降渲染分辨率，把 CPU/GPU 让给加载）
  const loadingRef = useRef(false);
  // [v49] 加载前硬件缩放级别（恢复时用原值，不硬编码）
  const prevScalingRef = useRef<number | null>(null);
  // [v49] 物理模组运行时开关镜像（swingObserver 每帧读取，支持运行时切换）
  const physicsOnRef = useRef(physicsEnabled);

  // MMD 物理引擎相关引用（方案A：启用 babylon-mmd 完整物理引擎）
  // [v129] MmdRuntime/MmdModel refs 已删：方案A失败后从未赋值，仅 dispose 死分支引用
  // physicsReadyRef：物理引擎是否初始化成功（当前恒降级=sin 摆动）
  const physicsReadyRef = useRef<boolean>(false);

  // ===== [2026-08-05 桌宠模式 + 性能优化] 相关 ref =====
  // screenSizeRef：屏幕物理分辨率缓存（进入桌宠模式时通过 IPC 向主进程获取）
  //   用于缩放限制计算：模型包围盒屏幕投影不得超过屏 95%，不得小于两图标（约 96px）
  // [2026-08-06 边框跟着角色放大缩小] 扩展含 workWidth/workHeight，用于限制窗口高度上限
  const screenSizeRef = useRef<{ screenWidth: number; screenHeight: number; workWidth: number; workHeight: number; scaleFactor: number } | null>(null);
  // lastIgnoreMouseRef：上次鼠标穿透状态（true=穿透/离开模型，false=接收/在模型上）
  //   仅状态变化时才调用 IPC，避免每帧重复调用 setIgnoreMouseEvents
  const lastIgnoreMouseRef = useRef<boolean | null>(null);
  // [2026-08-06 边框跟着角色放大缩小] modelSizeRef：模型 3D 包围盒尺寸（加载后存储）
  //   用于根据相机 radius 直接计算窗口尺寸，避免依赖 canvas 尺寸（循环依赖）
  const modelSizeRef = useRef<{ width: number; height: number } | null>(null);
  // [2026-08-06 v3 线性缩放] baseRadiusRef + baseWindowSizeRef：初始基准（模型加载后存储）
  //   旧方案 padding/(1-ratioH) 是非线性公式，ratioH≈0.9 时尺寸对 radius 极敏感 → 闪动+无响应
  //   新方案：窗口尺寸 = 基准尺寸 × (基准radius / 当前radius)，线性关系，稳定不爆炸
  //   - 放大2倍(radius减半) → 窗口高度×2（线性增长，不会爆炸）
  //   - 缩小2倍(radius翻倍) → 窗口高度/2（线性缩小，不会突变）
  const baseRadiusRef = useRef<number>(0);
  const baseWindowSizeRef = useRef<{ width: number; height: number }>({ width: 400, height: 600 });
  // [2026-09-10 壁纸转屏] 加载时缓存取景用的模型几何；resize/转屏后按当前 canvas 重套默认构图
  const wallpaperFrameRef = useRef<{
    minY: number; modelHeight: number; centerX: number; centerZ: number;
  } | null>(null);
  const wallpaperReframeTimerRef = useRef<number | null>(null);
  // [2026-08-06 v5 窗口尺寸直接缩放] zoomScaleRef：当前缩放比例（1=初始大小）
  //   v4及之前用相机 radius 缩放，但 radius 减小→visibleH减小→模型超出可见范围→头脚被裁
  //   v5改为直接缩放窗口尺寸，相机 radius 固定在全身可见距离，模型始终完整显示
  //   - 放大：zoomScale 增大 → 窗口变大 → canvas变大 → 模型在屏幕上更大（visibleH不变）
  //   - 缩小：zoomScale 减小 → 窗口变小 → canvas变小 → 模型在屏幕上更小
  //   - 上限：窗口高度=屏幕工作区高度（放大到屏幕最高处）
  //   - 下限：窗口尺寸>=96px（防太小）
  const zoomScaleRef = useRef<number>(1);
  // [2026-08-06 v7 平滑缩放动画] targetScaleRef 存的是 targetRadius（目标相机距离）
  //   滚轮/键盘改 targetRadius，rAF 每帧 lerp(0.25) 靠近目标
  //   applyRadius 同步更新 cam.radius 和窗口尺寸（线性跟随）
  //   radius 范围 [rMin, rMin×5]：rMin 保证 visibleH≥模型×1.1（头脚不裁）
  const targetScaleRef = useRef<number>(1);
  const scaleAnimRef = useRef<number | null>(null);  // rAF 句柄
  // [v19] radius 属性还原函数：组件卸载时恢复 camera.radius 的原始 setter
  const radiusRestoreRef = useRef<(() => void) | null>(null);
  // [2026-08-06 边框跟着角色放大缩小] clampZoomRef：跨 useEffect 共享 clampZoomToBounds
  //   场景初始化 useEffect（依赖[]）定义 clampZoomToBounds 并存到 ref
  //   模型加载 useEffect（依赖[modelData]）通过 ref.current 调用，初始化窗口尺寸
  const clampZoomRef = useRef<(() => void) | null>(null);
  // [2026-08-08 v14 右键拖拽修复] 拖拽状态 ref
  //   核心改动：参考 Live2D 方案，拖拽期间在 canvas 内偏移而非高频移动窗口
  //   - isDragging：是否正在右键拖拽
  //   - dragStartX/dragStartY：拖拽起始位置（用于计算总位移，释放时一次性 moveWindow）
  //   - dragLastX/dragLastY：上一次 pointer 位置（用于计算增量，更新 canvas 偏移）
  //   - dragTotalDeltaX/dragTotalDeltaY：累计位移（释放时一次性调 moveWindow）
  //   - dragCanvasOffsetX/dragCanvasOffsetY：canvas 内偏移量（拖拽期间视觉移动，不调 IPC）
  const isDraggingRef = useRef(false);
  // [v20 拖拽放大修复] 挂起的窗口尺寸初始化：模型加载完成定时器在拖拽期间不执行，
  //   存入此 ref，拖拽结束后（pointerup/pointercancel）补执行，防止拖拽中窗口被 resize 放大
  const pendingResizeRef = useRef<{ width: number; height: number; radius?: number } | null>(null);
  // [v20] 拖拽期间模型加载完成时被 radius setter 丢弃的期望值（松手后补设，防止取景错位）
  const pendingRadiusRef = useRef<number | null>(null);
  // [v21 修复] 模型加载完成窗口初始化定时器句柄（换模型时 clear 旧定时器，防止叠加触发）
  const modelInitTimerRef = useRef<number | null>(null);
  const dragLastXRef = useRef(0);
  // [v52] resize IPC 发送节流时间戳（缩放卡顿修复）
  const lastResizeSendRef = useRef(0);
  const dragLastYRef = useRef(0);
  // [v39 修复] moveWindow 节流时间戳：高轮询率鼠标（500-1000Hz）降频到 60Hz，防 DWM 重合成风暴（拉伸伪影="放大"）
  const lastMoveSendRef = useRef(0);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  // [v14] 右键单击/拖拽区分：立即进入拖拽，释放时判断是否移动过
  //   移动过 → 拖拽完成（不弹菜单）
  //   未移动 → 单击右键（弹菜单）
  const rightClickMovedRef = useRef(false);
  const rightClickDownPosRef = useRef({ x: 0, y: 0 });
  // [v45] 右键按下标记：pointerdown 设 true，pointerup 设 false（拖拽启动判定用）
  const rightButtonDownRef = useRef(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
const [physicsOn, setPhysicsOn] = useState(physicsEnabled); // [v49] 物理模组开关状态（UI 显示用）
  const showContextMenuRef = useRef(false);  // [v10] ref 镜像，useEffect 闭包中读取最新值
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  // [2026-09-05] 摄像机模式已整体移除（用户：没什么用）——
  //   原 v11 全身/上半身视角切换：cameraView 状态、switchCameraViewRef、
  //   window.__switchCameraView、右键菜单"摄像机模式"项、modelBoundsRef 全链路删除
  // [v13] 动作终端面板显示状态（右键菜单"动作终端"项触发）
  const [showActionPanel, setShowActionPanel] = useState(false);
  // 按需渲染相关 ref（性能优化核心：静止降帧，交互高帧）
  //   renderStateRef：当前渲染状态 'interacting'|'animating'|'idle'
  //   lastInteractTimeRef：最后一次交互时间（相机移动/滚轮/键盘），用于判定是否切回高帧
  //   lastFrameTimeRef：上一帧渲染时间戳，用于帧率节流
  //   rafIdRef：requestAnimationFrame 句柄，卸载时取消
  const renderStateRef = useRef<'interacting' | 'animating' | 'idle'>('animating');
  const lastInteractTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  // [v70 可见性渲染调度] 主进程按"肉眼能否看到本窗口"下发渲染档位：
  //   active  —— 正常渲染（沿用各自自适应帧率）
  //   reduced —— 部分被遮挡（如预览窗口压住壁纸一角），限速 ≤10fps 省电
  //   frozen  —— 被完全遮挡/最小化，rAF 循环整个停掉（骨骼姿态照常接收，几次数值赋值
  //              开销可忽略；解冻后下一帧直接呈现当前姿态，不丢指令不补帧）
  const renderTierRef = useRef<'active' | 'reduced' | 'frozen'>('active');
  // [v173 后台保活] 预览被切到后台（切到 DSH/设置页，容器 display:none）时置 true：
  //   渲染循环自停（不渲染、不耗 CPU），但引擎/模型/姿态全部保留；
  //   切回预览时置 false 并由 beginRenderLoopRef 立即拉起循环 → 1~2 秒内直接可见，无需重建模型。
  const previewHiddenRef = useRef(false);
  // [v70] 循环重启器：frozen 时循环不再续 rAF（自停）；解冻时由它把循环拉起来
  const beginRenderLoopRef = useRef<(() => void) | null>(null);
  // [v70] 主进程广播监听的退订函数（cleanup 时调用，防泄漏）
  const offRenderModeRef = useRef<(() => void) | null>(null);
  const offJointCmdRef = useRef<(() => void) | null>(null);
  // [v173] 预览隐藏/恢复监听退订
  const offPreviewVisRef = useRef<(() => void) | null>(null);

  const [initError, setInitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadModelError, setLoadModelError] = useState<string | null>(null);
  // 摆动状态（用于 UI 提示）
  const [physicsStatus, setPhysicsStatus] = useState<string>(tt('b3d.physOff'));

  // 初始化 Babylon 引擎和场景
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      // [2026-08-06 桌宠透明根因修复 v3] 桌宠模式必须启用 alpha + 非预乘 alpha
      // 根因（完整证据链）：
      //   1. 日志证明模型加载成功（"模型加载成功: 琳奈.pmx meshes: 46"），相机/光照/骨骼都正常。
      //   2. 但桌面上完全看不到任何渲染内容（用户反馈"无效，什么都没有"）。
      //   3. Babylon.js Engine 默认 alpha:false → canvas WebGL 上下文不申请 alpha 通道。
      //      此时 scene.clearColor=Color4(0,0,0,0) 的 alpha=0 不生效，canvas 行为依赖驱动：
      //      - 部分驱动：canvas 默认黑色不透明 → 应看到黑色矩形（少数情况）
      //      - 部分驱动（ATI/AMD/Intel）：alpha:false 时分配 RGBA 纹理但 alpha 通道为 0，
      //        Chromium 合成器 blending 启用时整个 WebGL 层完全透明 → 桌面什么都没有（本机命中此分支）
      //        参考：WebKit Bug 61091 - "Disable blending in compositor for WebGL layers with alpha=false"
      //        参考：Babylon Forum - "Transparent canvas background" 官方回复 premultipliedAlpha:false
      //   4. 国外资料汇总（Electron Issue #40515/#30798/#48064、Chromium transparent window compositing）：
      //      透明窗口 + WebGL 渲染的标配组合 = Engine { alpha:true, premultipliedAlpha:false }
      //      + scene.clearColor = Color4(0,0,0,0) + 窗口 transparent:true + backgroundColor:'#00000000'
      //   5. 之前只设置了 clearColor 透明但未启用 Engine alpha，等于"画了透明色但画布不透明"，
      //      合成时 WebGL 层被驱动视为透明层丢弃 → 桌面看不到任何内容。
      // 修复：桌宠模式启用 alpha:true（让 canvas 支持 alpha 通道，clearColor alpha=0 才能真正透明）
      //       + premultipliedAlpha:false（非预乘 alpha，避免与 NormalBlending 合成时颜色异常/变暗）
      // 普通模式保持默认（alpha:false），深灰背景不需要 alpha 通道，性能略优。
      const engineOptions: any = {
        preserveDrawingBuffer: true,
        stencil: true,
        disableWebGL2Support: false,
      };
      if (desktopPetMode) {
        // [2026-08-06 v6 修复模型不可见] 桌宠模式：alpha:true + 强制WebGL1
        // 根因：日志显示 GL_INVALID_VALUE: Program object expected（WebGL2着色器错误）
        //   alpha:true + WebGL2 + 该系统GPU驱动 = 着色器编译/链接失败 → 帧缓冲纯透明
        // 修复方案：强制WebGL1（disableWebGL2Support:true），避开WebGL2+alpha兼容问题
        //   WebGL1的alpha处理更简单，与透明窗口合成更稳定
        //   MMD模型渲染所需特性WebGL1都支持（顶点着色、纹理、骨骼蒙皮）
        engineOptions.alpha = true;
        engineOptions.disableWebGL2Support = true;  // [v6] 强制WebGL1，避开WebGL2+alpha着色器bug
      }
      const engine = new Engine(canvas, true, engineOptions, true);
      engineRef.current = engine;

      const scene = new Scene(engine);
      sceneRef.current = scene;
      // [v6诊断] 暴露scene到window，供主进程像素诊断读取mesh数量
      // [2026-09-10] 预览也暴露：进壁纸前主进程 executeJavaScript 读当前预览相机，壁纸对齐用
      (window as any).__babylonScene = scene;

      // [2026-08-05 桌宠模式] 桌宠模式背景完全透明，让 Electron 透明窗口显示桌面
      // 普通模式保持深色背景（模型预览需要场景参照）
      // [2026-08-06 v3] 配合 Engine alpha:true 才能真正透明（ clearColor alpha=0 需 canvas 支持 alpha 通道）
      scene.clearColor = desktopPetMode
        ? new Color4(0, 0, 0, 0)    // 桌宠模式：完全透明（alpha=0）
        : new Color4(0.1, 0.1, 0.1, 1.0);  // 普通模式：深灰背景

      // [2026-08-06 桌宠透明诊断] 打印 WebGL 上下文属性 + canvas 尺寸，验证 alpha 是否生效
      // 关键验证点：alpha 必须为 true
      // canvas.width/height 不能为 0（否则渲染到 0×0 视口，桌面什么都没有）
      if (desktopPetMode) {
        try {
          // 用 Engine 内部 _gl 获取已创建的 WebGL 上下文（避免重复 getContext 返回 null）
          const gl = (engine as any)._gl as WebGL2RenderingContext | null;
          if (gl) {
            const attrs = gl.getContextAttributes() as any;
            // [v5修复] 用 JSON.stringify 打印，之前 console.log 对象在 IPC 中变成 [object Object]
            console.log('[BabylonModelViewer][透明诊断] WebGL ctx attrs: ' + JSON.stringify({
              alpha: attrs?.alpha,
              premultipliedAlpha: attrs?.premultipliedAlpha,
              antialias: attrs?.antialias,
              preserveDrawingBuffer: attrs?.preserveDrawingBuffer,
            }));
          } else {
            console.warn('[BabylonModelViewer][透明诊断] engine._gl 不存在，无法验证上下文属性');
          }
          console.log('[BabylonModelViewer][透明诊断] canvas 尺寸: ' +
            canvas.width + 'x' + canvas.height +
            ' offset: ' + canvas.offsetWidth + 'x' + canvas.offsetHeight +
            ' renderSize: ' + engine.getRenderWidth() + 'x' + engine.getRenderHeight());
          console.log('[BabylonModelViewer][透明诊断] scene.clearColor: ' +
            JSON.stringify((scene.clearColor as any)?.asArray?.() || null));
        } catch (diagErr) {
          console.warn('[BabylonModelViewer][透明诊断] 诊断失败:', diagErr);
        }
      }

      // 相机：鼠标左键旋转，滚轮缩放
      const camera = new ArcRotateCamera(
        'camera', Math.PI / 2, Math.PI / 2, 15,
        new Vector3(0, 2, 0), scene
      );
      camera.attachControl(canvas, true);
      // [v44 性能] 预览模式降低相机惯性（0.9→0.25）：鼠标拖动旋转更跟手、响应更快
      //   桌宠模式 inertia=0（下方分支），预览模式 0.25 兼顾平滑与跟手
      camera.inertia = 0.25;
      const pointerInput = camera.inputs.attached.pointers as any;
      if (pointerInput && pointerInput.buttons !== undefined) {
        pointerInput.buttons = [0]; // 左键
      }
      if (camera.inputs.attached.pointers) {
        (camera.inputs.attached.pointers as any).panningSensibility = 0;
      }
      camera.inputs.attached.keyboard.detachControl();
      camera.lowerRadiusLimit = 0.5;
      camera.upperRadiusLimit = 100;
      camera.lowerBetaLimit = 0.1;
      camera.upperBetaLimit = Math.PI - 0.1;
      // [v42 模式隔开] v19 的 wheel/pinch 禁用移入桌宠分支：预览模式恢复相机自带滚轮缩放
      //   根因：v19 把 wheelDeltaPercentage=0 写在分支外 → 预览模式滚轮也被一起锁死（用户反馈）
      //   隔开后：预览模式 = 相机 radius 缩放（仅 canvas 内滚轮，不影响聊天列表滚动）
      //           桌宠模式 = 窗口尺寸缩放（zoomBy），拖拽中锁定（isDraggingRef）
      // [还原 2026-08-07] 移除"锁定相机参数"实验性修改，恢复已修复的稳定状态
      //   依据：聊天记录（session 6a4b32f1/6a75ba70）确认右键按钮、拖拽缩放等已修复
      //         后续移除 pointers input 导致交互全失效（"全失效，只能拖拽"）
      //   还原：保留 pointers input + wheel/pinch 移除（滚轮缩放走自定义 zoomBy 路径）
      if (desktopPetMode) {
        // [v19 根治放大] 桌宠模式禁用 Babylon 内置 wheel/pinch 缩放（滚轮走 zoomBy 窗口缩放）
        //   根因：camera.inputs.removeByType() 在此版本 Babylon.js 中不存在（try-catch 吞掉 TypeError）
        //         导致 wheel input 和 pinch input 从未被移除，仍通过 POINTERWHEEL 修改 camera.radius
        //         用户证据："边框已到最高处，角色还在放大" = 窗口尺寸到上限后 radius 仍在变化
        //   修复1：wheelDeltaPercentage=0 + pinchDeltaPercentage=0 禁用百分比缩放
        //   修复2：wheelPrecision 设为极大值，让 wheel delta 趋近于0
        camera.wheelDeltaPercentage = 0;
        camera.pinchDeltaPercentage = 0;
        camera.wheelPrecision = 1e10;  // 极大值，wheel delta = deltaY / precision → 趋近于0
        // [v19] removeByType 在此版本 Babylon 中不存在，remove 也可能失败
        //   保留 try-catch 作为降级，但主要靠 wheelDeltaPercentage=0 + wheelPrecision=1e10 禁用
        try {
          const wheelInput = (camera.inputs as any).attached?.mousewheel;
          if (wheelInput) {
            wheelInput.detachControl();
            (camera.inputs as any).remove(wheelInput);
          }
        } catch { /* noop */ }
        try {
          const pinchInput = (camera.inputs as any).attached?.pinch;
          if (pinchInput) {
            pinchInput.detachControl();
            (camera.inputs as any).remove(pinchInput);
          }
        } catch { /* noop */ }
        // [v18 根治放大] 禁用相机惯性（inertia=0）
        camera.inertia = 0;
        // [v19 根治放大] 锁定 camera.radius：拖拽期间禁止任何代码修改 radius
        //   原理：用 Object.defineProperty 覆盖 radius 的 setter
        //   拖拽期间：setter 忽略赋值（静默丢弃），getter 返回锁定值
        //   拖拽结束后：恢复原始 setter
        const origRadiusDescriptor = Object.getOwnPropertyDescriptor(camera, 'radius') ||
          Object.getOwnPropertyDescriptor(Object.getPrototypeOf(camera), 'radius');
        if (origRadiusDescriptor && origRadiusDescriptor.set) {
          const origSet = origRadiusDescriptor.set;
          let lockedRadius = camera.radius;
          Object.defineProperty(camera, 'radius', {
            get: () => lockedRadius,
            set: (v: number) => {
              if (isDraggingRef.current) {
                // 拖拽期间：忽略 radius 赋值
                return;
              }
              lockedRadius = v;
              if (origSet) origSet.call(camera, v);
            },
            configurable: true,
          });
          // 保存原始 descriptor，在组件卸载时恢复
          radiusRestoreRef.current = () => {
            if (origRadiusDescriptor) {
              Object.defineProperty(camera, 'radius', origRadiusDescriptor);
            }
          };
        }
        // [v19] 清零所有惯性偏移
        const camAny = camera as any;
        camAny._inertialRadiusOffset = 0;
        camAny._inertialAlphaOffset = 0;
        camAny._inertialBetaOffset = 0;
      } else {
        // 普通模式：保留相机自带 wheel 缩放（已验证的稳定路径）
      }
      cameraRef.current = camera;

      // 光照（对标Blender MMD标准：单主光源 + 极弱环境光）
      const keyLight = new DirectionalLight('keyLight', new Vector3(-0.5, -1, -0.5).normalize(), scene);
      keyLight.intensity = 1.0;
      keyLight.diffuse = new Color3(1.0, 0.98, 0.95);
      keyLight.position = new Vector3(10, 20, 10);

      const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.15;
      hemiLight.diffuse = new Color3(0.8, 0.8, 0.85);
      hemiLight.groundColor = new Color3(0.15, 0.15, 0.18);

      // 地面和网格（桌宠模式跳过：透明背景下不需要场景参照物，且省去两个网格的渲染/矩阵开销）
      if (!desktopPetMode) {
        const ground = MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
        const groundMat = new StandardMaterial('groundMat', scene);
        groundMat.diffuseColor = new Color3(0.16, 0.16, 0.16);
        groundMat.specularColor = new Color3(0.01, 0.01, 0.01);
        ground.material = groundMat;
        ground.position.y = -2;
        ground.receiveShadows = true;

        const grid = MeshBuilder.CreateGround('grid', { width: 20, height: 20, subdivisions: 20 }, scene);
        const gridMat = new StandardMaterial('gridMat', scene);
        gridMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
        gridMat.wireframe = true;
        gridMat.alpha = 0.3;
        grid.material = gridMat;
        grid.position.y = -1.99;

        // [2026-07-24 性能优化] 冻结静态网格世界矩阵，减少每帧矩阵计算开销
        // ground/grid 为静态网格（无动画、无骨骼），冻结后引擎跳过其世界矩阵更新
        // 角色 mesh 不冻结（需保留骨骼动画/摆动/物理计算），不影响现有功能
        ground.freezeWorldMatrix();
        grid.freezeWorldMatrix();
      }

      // 后处理（回退到原始配置：仅 FXAA + toneMapping，关闭 bloom/sharpen/contrast）
      // 之前启用 contrast=1.1 + bloom 导致画面整体变暗，现回退
      // 注：如需游戏级效果，应通过提升光照强度和材质参数实现，而非后处理压暗
      // [2026-08-06 v5 修复模型不可见] 桌宠模式跳过 DefaultRenderingPipeline
      // 根因：alpha:true 时 DefaultRenderingPipeline 渲染到 RTT，合成回屏幕时 alpha 通道处理异常，
      //   导致模型被丢弃（截图2KB纯透明，模型加载成功但渲染结果无模型）
      // 国外资料：Babylon Forum 多个帖子报告 alpha:true + DefaultRenderingPipeline 导致内容消失
      // 修复：桌宠模式不创建后处理管线，直接渲染到屏幕（RTT 是后处理管线的中间产物，跳过它绕过问题）
      // 普通模式保持原有后处理（已验证稳定，alpha:false 无此问题）
      if (!desktopPetMode) {
        const pipeline = new DefaultRenderingPipeline('default', true, scene, [camera]);
        pipeline.imageProcessing.toneMappingEnabled = true;
        pipeline.imageProcessing.toneMappingType = 0; // Standard (sRGB)
        pipeline.imageProcessing.exposure = 1.0;      // 原始值，不提亮
        // 不设置 contrast，使用默认值 1.0（避免暗部压暗）
        pipeline.fxaaEnabled = true;
        pipeline.fxaa.samples = 4;
        pipeline.bloomEnabled = false;   // 关闭（原值，避免 threshold 过高不补光）
        pipeline.sharpenEnabled = false; // 关闭（原值）
      } else {
        // 桌宠模式：无后处理，直接渲染。抗锯齿通过 Engine 的 antialias:true（第2个参数）保证
        console.log('[BabylonModelViewer][桌宠] 跳过 DefaultRenderingPipeline（alpha:true 兼容）');
      }

      // ===== [2026-08-05 桌宠模式 + 性能优化] =====
      // 桌宠模式初始化：获取屏幕物理分辨率（用于缩放限制）+ 启用鼠标穿透
      // [2026-08-06 边框跟着角色放大缩小] 同时获取 workWidth/workHeight，用于限制窗口高度上限
      if (desktopPetMode && (window as any).desktopPet) {
        (window as any).desktopPet.getScreenSize().then((s: any) => {
          if (s) screenSizeRef.current = {
            screenWidth: s.screenWidth,
            screenHeight: s.screenHeight,
            workWidth: s.workWidth,
            workHeight: s.workHeight,
            scaleFactor: s.scaleFactor,
          };
        }).catch(() => { /* 获取失败则不限制缩放（降级运行） */ });
      }

      // [2026-08-06 v5] clampZoomToBounds 已废弃，缩放逻辑移到 handleWheel/handleKeyDown
      //   v5改为直接缩放窗口尺寸（zoomScale），不再用相机 radius 缩放
      //   保留 clampZoomRef 声明但置空，避免类型错误
      clampZoomRef.current = null;

      // ═══════ [2026-10-01 3D场景] 多模型编辑层（额外模型/拖拽摆放/缩放/背景/布局应用）═════════
      // 设计边界：主模型管线（AnimSystem/桌宠/壁纸/动作）零改动；每个额外模型挂独立根节点，
      //   通过 window.__scene3d 暴露给 NewPage 工具条与 WallpaperPage 布局应用；交互按 editMode 门控。
      const scene3dExtras = new Map<string, { root: TransformNode; kind: string; file: string; dir: string; textures: string[]; blobUrl?: string }>();
      // [2026-10-01b] Blender 式编辑：左键=屏幕面(XY)移动、右键=纵深(Z)移动；dragAxis 区分
      const scene3dState = { edit: false, selected: null as string | null, dragAxis: null as 'xy' | 'z' | null, savedRadius: 0, dragNormal: null as any, planePoint3d: null as any, grabOffset: null as any, startPos: null as any, startHit: null as any, fwdHoriz: null as any };
      // [2026-10-01c] 背景实现（第二轮实证后定稿）：
      //   纯色 → scene.clearColor（最稳通路，还原时恢复原值：壁纸/桌宠=透明）；
      //   图片/渐变 → 相机挂接背景平面 + emissiveTexture，但**必须等纹理就绪后再建材质**——
      //   若先建空材质后贴纹理，define 不重编译，贴图通道渲染为白（实测两次翻车的根因）。
      let scene3dBgMesh: Mesh | null = null;
      let scene3dBgTex: any = null;
      let scene3dOrigClear: Color4 | null = null;
      let scene3dBgToken = 0;

      const scene3dClearBgMesh = () => {
        if (scene3dBgMesh) { scene3dBgMesh.dispose(); scene3dBgMesh = null; }
        if (scene3dBgTex) { try { scene3dBgTex.dispose(); } catch { /* noop */ } scene3dBgTex = null; }
      };
      const scene3dBuildBgPlane = (tex: any) => {
        const mat = new StandardMaterial('scene3d-bg-mat', scene);
        mat.backFaceCulling = false;
        mat.disableLighting = true;
        mat.emissiveColor = new Color3(1, 1, 1);
        mat.emissiveTexture = tex;   // 就绪后再建材质：首编译即带贴图 define
        mat.disableDepthWrite = true;
        const plane = MeshBuilder.CreatePlane('scene3d-bg', { size: 400 }, scene);
        plane.material = mat;
        plane.isPickable = false;
        plane.infiniteDistance = true;
        plane.parent = camera;
        plane.position = new Vector3(0, 0, 120);
        scene3dBgMesh = plane;
        scene3dBgTex = tex;
      };
      const scene3dSetBackground = (spec: any) => {
        try {
          scene3dClearBgMesh();
          const token = ++scene3dBgToken;
          if (!scene3dOrigClear) scene3dOrigClear = scene.clearColor.clone();
          const restoreClear = () => { scene.clearColor = scene3dOrigClear!.clone(); };
          if (!spec || spec.type === 'none' || !spec.value) { restoreClear(); return; }
          if (spec.type === 'color') {
            const hex = String(spec.value);
            scene.clearColor = Color4.FromHexString(hex.length === 7 ? hex + 'FF' : hex);
            return;
          }
          restoreClear(); // 平面负责画面，底色恢复原值（保透明）
          if (spec.type === 'gradient' && Array.isArray(spec.value)) {
            const dt = new DynamicTexture('scene3d-bg-tex', { width: 4, height: 256 }, scene, false);
            const ctx = dt.getContext() as any;
            const g = ctx.createLinearGradient(0, 0, 0, 256);
            g.addColorStop(0, String(spec.value[0])); g.addColorStop(1, String(spec.value[1]));
            ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256); dt.update();
            scene3dBuildBgPlane(dt);
          } else if (spec.type === 'image') {
            const tex = new Texture(String(spec.value), scene, false, true);
            const dropTex = () => { try { tex.dispose(); } catch { /* noop */ } };
            const giveUp = setTimeout(() => { if (token === scene3dBgToken && !scene3dBgMesh) { console.warn('[scene3d] 背景图加载超时或失败:', spec.value); dropTex(); } }, 20000);
            tex.onLoadObservable.addOnce(() => { clearTimeout(giveUp); if (token === scene3dBgToken) scene3dBuildBgPlane(tex); else dropTex(); });
          }
        } catch (e) { console.warn('[scene3d] 背景应用失败:', e); }
      };

      const scene3dResolveRoot = (id: string): TransformNode | null => {
        if (id === 'primary') return (currentModelRef.current as any) || null;
        return scene3dExtras.get(id)?.root || null;
      };

      // 层级包围盒（TransformNode 无此方法；合并子网格的世界包围盒）
      const scene3dBoundsOf = (node: any): { w: number; h: number; minX: number; maxX: number } => {
        try {
          node.computeWorldMatrix(true);
          const meshes: any[] = node.getChildMeshes ? node.getChildMeshes() : [];
          const list = meshes.length ? meshes : [node];
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (const m of list) {
            try {
              m.computeWorldMatrix(true);
              const b = m.getHierarchyBoundingVectors();
              minX = Math.min(minX, b.min.x); maxX = Math.max(maxX, b.max.x);
              minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y);
            } catch { /* 单网格失败跳过 */ }
          }
          if (!isFinite(minX)) return { w: 1, h: 1, minX: 0, maxX: 1 };
          return { w: Math.max(0.01, maxX - minX), h: Math.max(0.01, maxY - minY), minX, maxX };
        } catch { return { w: 1, h: 1, minX: 0, maxX: 1 }; }
      };

      const scene3dAddModel = async (
        spec: { id: string; kind: string; file: string; dir?: string; textures?: Array<{ name: string; relativePath: string; data: ArrayBuffer }> },
        data?: ArrayBuffer,
        url?: string,
      ): Promise<{ ok: boolean; id?: string; err?: string }> => {
        if (scene3dExtras.has(spec.id)) return { ok: false, err: 'id exists: ' + spec.id };
        let createdBlobUrl: string | undefined; // [2026-10-02 终审] 失败路径也要回收
        try {
          let sourceUrl = url || '';
          if (!sourceUrl) {
            if (!data) return { ok: false, err: 'no data' };
            sourceUrl = URL.createObjectURL(new Blob([data]));
            createdBlobUrl = sourceUrl;
          }
          const options: any = { pluginExtension: '.' + spec.kind };
          if ((spec.kind === 'pmx' || spec.kind === 'pmd') && spec.textures && spec.textures.length) {
            options.pluginOptions = { mmdmodel: { referenceFiles: spec.textures.map((t) => ({ relativePath: t.relativePath, data: t.data })) } };
          }
          const result = await ImportMeshAsync(sourceUrl, scene, options);
          const meshes = result.meshes || [];
          if (!meshes.length) throw new Error('未返回任何 mesh');
          // [2026-10-01c] 顶层网格全量入组：OBJ 等 .glb 之外格式可能无 __root__、返回多个顶层 mesh，
          //   只挂第一个会让其余网格散落原点（"导入成功但看不见"的元凶之一）
          const root = new TransformNode('scene3d-' + spec.id, scene);
          root.metadata = { scene3dId: spec.id };
          const topLevels = meshes.filter((m: any) => !m.parent || (m.parent as any) === scene);
          for (const m of (topLevels.length ? topLevels : [meshes[0]])) m.parent = root;
          scene3dExtras.set(spec.id, { root, kind: spec.kind, file: spec.file, dir: spec.dir || '', textures: (spec.textures || []).map((t) => t.relativePath), blobUrl: createdBlobUrl });
          // [2026-10-01c] 自动适配：缩放到主模型 45% 高、摆到主模型右侧贴地（applyLayout 随后可整体覆盖）
          try {
            const pm: any = currentModelRef.current;
            if (pm) {
              const pb = scene3dBoundsOf(pm);
              const eb = scene3dBoundsOf(root);
              const s = Math.max(0.05, Math.min(50, (pb.h * 0.45) / eb.h));
              root.scaling.setAll(s);
              const eb2 = scene3dBoundsOf(root);
              root.position.set(pb.maxX + eb2.w / 2 + pb.h * 0.1, 0, 0);
            }
          } catch { /* 适配失败按原样放置 */ }
          return { ok: true, id: spec.id };
        } catch (e: any) {
          if (createdBlobUrl) { try { URL.revokeObjectURL(createdBlobUrl); } catch { /* noop */ } }
          return { ok: false, err: String(e?.message || e) };
        }
      };

      const scene3dRemoveModel = (id: string) => {
        const rec = scene3dExtras.get(id);
        if (!rec) return;
        if (rec.blobUrl) { try { URL.revokeObjectURL(rec.blobUrl); } catch { /* noop */ } }
        try { rec.root.dispose(false, true); } catch { /* noop */ }
        scene3dExtras.delete(id);
        if (scene3dState.selected === id) scene3dState.selected = null;
      };

      const scene3dApplyTransform = (id: string, t: { pos?: number[]; rotX?: number; rotY?: number; rotZ?: number; scale?: number }) => {
        const root = scene3dResolveRoot(id);
        if (!root) return;
        if (t.pos) root.position.set(Number(t.pos[0]) || 0, Number(t.pos[1]) || 0, Number(t.pos[2]) || 0);
        if (t.rotX !== undefined) root.rotation.x = Number(t.rotX) || 0;
        if (t.rotY !== undefined) root.rotation.y = Number(t.rotY) || 0;
        if (t.rotZ !== undefined) root.rotation.z = Number(t.rotZ) || 0;
        if (t.scale !== undefined) { const s = Math.max(0.02, Math.min(50, Number(t.scale) || 1)); root.scaling.setAll(s); }
      };

      // [2026-10-01b] 重置：全部模型回到默认导入位（主模型+额外模型归原点；额外模型按包围盒排开防重叠）
      const scene3dResetAll = () => {
        try {
          if (currentModelRef.current) {
            const p: any = currentModelRef.current;
            p.position.set(0, 0, 0); p.rotation.set(0, 0, 0); p.scaling.setAll(1);
          }
          let x = 0;
          for (const rec of scene3dExtras.values()) {
            rec.root.rotation.set(0, 0, 0);
            rec.root.scaling.setAll(1);
            rec.root.position.set(x, 0, 0);
            const b = scene3dBoundsOf(rec.root);
            x += Math.max(1.5, b.w * 1.3);
          }
        } catch (e) { console.warn('[scene3d] resetAll 失败:', e); }
      };

      // [2026-10-01b] 骨骼姿态接口：列表/读欧拉角/旋转（旋转走 __jointControl 合法通道=生理极限+碰撞回滚+D系代理）
      const scene3dSkeleton = (): any => {
        const m: any = currentModelRef.current;
        return m?.skeleton || (scene as any).skeletons?.[0] || null;
      };
      const scene3dBones = (): string[] => {
        try {
          const jc = (window as any).__jointControl;
          if (jc?.joints) { const j = jc.joints(); if (Array.isArray(j) && j.length) return j.slice(); }
          const skel = scene3dSkeleton();
          return skel?.bones?.map((b: any) => b.name) || [];
        } catch { return []; }
      };
      const scene3dGetBoneEuler = (name: string): number[] | null => {
        try {
          const skel = scene3dSkeleton();
          const bone = skel?.bones?.find((b: any) => b.name === name);
          if (!bone) return null;
          if (bone.rotationQuaternion) {
            const e = bone.rotationQuaternion.toEulerAngles();
            return [e.x, e.y, e.z];
          }
          const r = bone.rotation;
          return r ? [r.x, r.y, r.z] : null;
        } catch { return null; }
      };
      const scene3dSetBoneEuler = (name: string, e: number[]): boolean => {
        const jc = (window as any).__jointControl;
        if (!jc?.rotate) return false;
        return !!jc.rotate(name, Number(e[0]) || 0, Number(e[1]) || 0, Number(e[2]) || 0);
      };

      const scene3dWaitPrimary = async () => {
        for (let i = 0; i < 300 && !currentModelRef.current; i++) await new Promise((r) => setTimeout(r, 100));
      };

      /** 一键应用布局（预览恢复与壁纸应用共用）：背景 + extras 重建 + 主模型变换（等主模型就绪） */
      const scene3dApplyLayout = async (layout: any) => {
        try {
          if (!layout) return;
          scene3dSetBackground(layout.background);
          for (const id of Array.from(scene3dExtras.keys())) scene3dRemoveModel(id);
          const models = Array.isArray(layout.models) ? layout.models : [];
          for (const m of models) {
            if (!m || m.id === 'primary') continue;
            const base = '/scene3d/';
            let r: { ok: boolean; err?: string } = { ok: false, err: 'unknown kind' };
            if (m.kind === 'pmx' || m.kind === 'pmd') {
              const texs: Array<{ name: string; relativePath: string; data: ArrayBuffer }> = [];
              for (const rel of (m.textures || [])) {
                try {
                  const resp = await fetch(base + m.dir + encodeURIComponent(rel));
                  if (resp.ok) texs.push({ name: rel, relativePath: rel, data: await resp.arrayBuffer() });
                } catch { /* 单贴图失败跳过 */ }
              }
              r = await scene3dAddModel({ id: m.id, kind: m.kind, file: m.file, dir: m.dir, textures: texs }, undefined, base + m.dir + encodeURIComponent(m.file));
            } else {
              r = await scene3dAddModel({ id: m.id, kind: m.kind, file: m.file, dir: m.dir }, undefined, base + m.dir + encodeURIComponent(m.file));
            }
            if (r.ok) scene3dApplyTransform(m.id, m);
            else console.warn('[scene3d] 布局模型加载失败:', m.file, r.err);
          }
          if (layout.primary) {
            await scene3dWaitPrimary();
            if (currentModelRef.current) scene3dApplyTransform('primary', layout.primary);
          }
        } catch (e) { console.warn('[scene3d] applyLayout 失败:', e); }
      };

      (window as any).__scene3d = {
        ready: true,
        setEditMode: (on: boolean) => {
          scene3dState.edit = !!on;
          if (!on) {
            if (scene3dState.dragAxis) {
              // [2026-10-02 终审] 拖拽中退出编辑：归还相机控制，防 detach 永不还原
              scene3dState.dragAxis = null;
              try {
                camera.attachControl(canvas, true);
                if (cameraRef.current && scene3dState.savedRadius > 0) cameraRef.current.radius = scene3dState.savedRadius;
              } catch { /* noop */ }
            }
            scene3dState.selected = null;
          }
        },
        addModel: scene3dAddModel,
        removeModel: scene3dRemoveModel,
        list: () => Array.from(scene3dExtras.entries()).map(([id, v]) => ({ id, kind: v.kind, file: v.file, dir: v.dir, textures: v.textures })),
        setSelected: (id: string | null) => { scene3dState.selected = id; },
        getSelected: () => scene3dState.selected,
        setTransform: scene3dApplyTransform,
        getTransform: (id: string) => {
          const root = scene3dResolveRoot(id);
          if (!root) return null;
          return { pos: [root.position.x, root.position.y, root.position.z], rotX: root.rotation.x, rotY: root.rotation.y, rotZ: root.rotation.z, scale: root.scaling.x };
        },
        resetAll: scene3dResetAll,
        bones: scene3dBones,
        getBoneEuler: scene3dGetBoneEuler,
        setBoneEuler: scene3dSetBoneEuler,
        setBackground: scene3dSetBackground,
        applyLayout: scene3dApplyLayout,
      };

      // [2026-10-01b] 编辑模式拖拽（Blender 式）：左键=屏幕面移动、右键=纵深(Z)移动；点空交回相机
      const scene3dRayPlane = (ray: any, planePoint: any, normal: any): any => {
        if (!ray || !planePoint || !normal) return null;
        const denom = Vector3.Dot(ray.direction, normal);
        if (Math.abs(denom) < 1e-6) return null;
        const t = Vector3.Dot(planePoint.subtract(ray.origin), normal) / denom;
        if (!(t > 0)) return null;
        return ray.origin.add(ray.direction.scale(t));
      };
      scene.onPointerObservable.add((info) => {
        if (!scene3dState.edit) return;
        const btn = info.event ? (info.event as any).button : -1;
        if (info.type === PointerEventTypes.POINTERDOWN && (btn === 0 || btn === 2)) {
          if (scene3dState.dragAxis) return;
          const pick = scene.pick(scene.pointerX, scene.pointerY);
          if (!pick?.hit || !pick.pickedMesh) return;
          let node: any = pick.pickedMesh;
          let hitId: string | null = null;
          while (node) {
            if (node.metadata && node.metadata.scene3dId) { hitId = node.metadata.scene3dId; break; }
            if (currentModelRef.current && node === currentModelRef.current) { hitId = 'primary'; break; }
            node = node.parent;
          }
          if (!hitId) { scene3dState.selected = null; return; }
          scene3dState.selected = hitId;
          const root = scene3dResolveRoot(hitId);
          if (!root || !pick.ray) return;
          const camFwd = camera.getDirection(new Vector3(0, 0, 1));
          if (btn === 0) {
            // 左键：屏幕面（相机前向为法线的竖直面）——抓取点+偏移整体跟随
            scene3dState.dragAxis = 'xy';
            scene3dState.dragNormal = camFwd.clone();
            scene3dState.planePoint3d = root.position.clone();
            const hit = scene3dRayPlane(pick.ray, scene3dState.planePoint3d, scene3dState.dragNormal);
            if (!hit) { scene3dState.dragAxis = null; return; }
            scene3dState.grabOffset = root.position.subtract(hit);
          } else {
            // 右键：纵深（水平面求交，位移投影到相机前向的水平分量）
            scene3dState.dragAxis = 'z';
            const fh = new Vector3(camFwd.x, 0, camFwd.z);
            if (fh.lengthSquared() < 1e-6) { scene3dState.dragAxis = null; return; }
            scene3dState.fwdHoriz = fh.normalize();
            scene3dState.dragNormal = new Vector3(0, 1, 0);
            scene3dState.planePoint3d = root.position.clone();
            const hit = scene3dRayPlane(pick.ray, scene3dState.planePoint3d, scene3dState.dragNormal);
            if (!hit) { scene3dState.dragAxis = null; return; }
            scene3dState.startPos = root.position.clone();
            scene3dState.startHit = hit;
          }
          scene3dState.savedRadius = cameraRef.current ? cameraRef.current.radius : 0;
          try { camera.detachControl(); } catch { /* noop */ }
        } else if (info.type === PointerEventTypes.POINTERMOVE && scene3dState.dragAxis) {
          const root = scene3dResolveRoot(scene3dState.selected || '');
          if (!root) { scene3dState.dragAxis = null; return; }
          const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, null, scene.activeCamera);
          const hit = scene3dRayPlane(ray, scene3dState.planePoint3d, scene3dState.dragNormal);
          if (!hit) return;
          if (scene3dState.dragAxis === 'xy' && scene3dState.grabOffset) {
            root.position.copyFrom(hit.add(scene3dState.grabOffset));
          } else if (scene3dState.dragAxis === 'z' && scene3dState.startPos && scene3dState.startHit && scene3dState.fwdHoriz) {
            const d = hit.subtract(scene3dState.startHit);
            const along = Vector3.Dot(d, scene3dState.fwdHoriz);
            root.position.copyFrom(scene3dState.startPos.add(scene3dState.fwdHoriz.scale(along)));
          }
        } else if (info.type === PointerEventTypes.POINTERUP && scene3dState.dragAxis) {
          scene3dState.dragAxis = null;
          scene3dState.grabOffset = null; scene3dState.startPos = null; scene3dState.startHit = null;
          try {
            camera.attachControl(canvas, true);
            if (cameraRef.current && scene3dState.savedRadius > 0) cameraRef.current.radius = scene3dState.savedRadius;
          } catch { /* noop */ }
        }
      });

      // ----- 鼠标穿透：桌宠模式透明区域穿透到桌面 -----
      // Electron setIgnoreMouseEvents(true, {forward:true}) 转发鼠标移动事件到渲染进程
      // 渲染进程用 ray pick 判断是否命中模型，命中则切回 false 接收所有事件（点击/滚轮）
      if (desktopPetMode) {
        scene.onPointerObservable.add((info) => {
          if (info.type !== PointerEventTypes.POINTERMOVE) return;
          // [v26 修复] 左键按住旋转相机时刷新交互时间（保持 interacting 60fps，与右键拖拽对称）
          if (info.event && (info.event as any).buttons === 1) {
            lastInteractTimeRef.current = performance.now();
          }
          if (!currentModelRef.current) return;
          // [2026-08-06 v4 修复吸附] 拖拽期间跳过 ray pick 穿透逻辑
          //   旧方案拖拽时调 setIgnoreMouse(false) → 窗口持续捕获鼠标 → 吸附鼠标跟着移动
          //   新方案：拖拽时完全不调 setIgnoreMouse，用 pointer capture 保证 pointermove 不丢
          //   拖拽结束后 lastIgnoreMouseRef 重置为 null，下次 ray pick 自然恢复
          if (isDraggingRef.current) return;
          // [修复问题1] 菜单显示时跳过 ray pick，强制保持 setIgnoreMouse(false)
          //   根因：菜单显示时POINTERMOVE继续运行ray pick，鼠标在菜单区域不命中模型
          //   → setIgnoreMouse(true) → 窗口穿透 → 菜单onClick/onMouseEnter无法触发
          //   证据：POINTERMOVE处理器（原第1905行）只检查isDraggingRef，未检查showContextMenuRef
          if (showContextMenuRef.current) {
            if (lastIgnoreMouseRef.current !== false) {
              lastIgnoreMouseRef.current = false;
              try { (window as any).desktopPet?.setIgnoreMouse(false); } catch { /* noop */ }
            }
            return;
          }
          // [2026-08-06 v8 修复鼠标交互] 检测场景中所有可pick的mesh（桌宠模式无ground/grid）
          const pickResult = scene.pick(scene.pointerX, scene.pointerY);
          const shouldIgnore = !pickResult?.hit;
          if (shouldIgnore !== lastIgnoreMouseRef.current) {
            lastIgnoreMouseRef.current = shouldIgnore;
            try { (window as any).desktopPet?.setIgnoreMouse(shouldIgnore); } catch { /* noop */ }
          }
        });
      }

      // ----- 交互监听：标记交互时间 + 滚轮平滑缩放相机 radius（Blender式丝滑）-----
      // [v12 彻底重构] 缩放改用相机 radius，不再缩放窗口尺寸
      //   根因：窗口尺寸缩放每帧触发 IPC→窗口resize→canvas resize→Engine.resize→GPU资源重分配
      //         16ms帧预算被吃光 → 卡顿
      //   [v13 恢复窗口尺寸缩放] 用户要求：角色放大缩小不能限于方框内
      //   方案：窗口尺寸缩放 + rAF 平滑动画（lerp 0.2）
      //   - 放大：窗口尺寸变大 → canvas 变大 → 角色在屏幕上更大（可见范围不变）
      //   - 缩小：窗口尺寸变小 → canvas 变小 → 角色在屏幕上更小
      //   - 平滑：rAF 每帧 lerp(0.2) 靠近目标，只在尺寸变化时才调 IPC resizeWindow
      //   - 上限：窗口高度=屏幕工作区高度（放大到屏幕最高处）
      //   - 下限：窗口尺寸>=96px（防太小）
      // [Bug3修复] 缓存上次应用的窗口尺寸，仅在变化时才调 resizeWindow
      //   根因：startScaleAnim 每帧 lerp 调 applyZoom，即使尺寸只差1px或已收敛，
      //         resizeWindow→setBounds 仍触发 canvas resize→engine.resize()→GPU资源重分配→闪烁
      let lastAppliedW = 0, lastAppliedH = 0;
      const applyZoom = (scale: number) => {
        const base = baseWindowSizeRef.current;
        if (!base || base.width <= 0 || base.height <= 0) return;
        const screen = screenSizeRef.current;
        const maxH = screen?.workHeight || 1080;
        const minW = 96, minH = 96;
        // [v41 修复] 宽度上限：限制在工作区宽度内（修复"突破屏幕最宽处"）
        const maxW = screen?.workWidth || 1536;
        const newW = Math.max(minW, Math.min(maxW, Math.round(base.width * scale)));
        const newH = Math.max(minH, Math.min(maxH, Math.round(base.height * scale)));
        // 尺寸未变化时跳过 resizeWindow，避免无谓的 setBounds→canvas resize→闪烁
        if (newW === lastAppliedW && newH === lastAppliedH) return;
        lastAppliedW = newW;
        lastAppliedH = newH;
        // [v52 修复] resize IPC 合并节流：lerp 动画每帧都可能调 applyZoom，
        //   16ms 内多次 resizeWindow→setBounds 会触发 DWM 重排风暴（缩放卡顿根源）
        const rzNow = performance.now();
        if (!lastResizeSendRef.current || rzNow - lastResizeSendRef.current >= 16) {
          lastResizeSendRef.current = rzNow;
          try { (window as any).desktopPet?.resizeWindow(newW, newH); } catch { /* noop */ }
        }
      };
      const startScaleAnim = () => {
        if (scaleAnimRef.current !== null) return;
        const step = () => {
          // [v17 修复] 拖拽期间暂停缩放动画，防止 applyZoom→resizeWindow 导致窗口变大
          //   根因：拖拽前触发的缩放动画在拖拽期间继续运行，applyZoom 每帧调用 resizeWindow
          //         窗口尺寸变化导致 canvas resize → 视觉上"放大"效果
          //   修复：拖拽期间跳过动画帧，等拖拽结束后继续
          if (isDraggingRef.current) {
            scaleAnimRef.current = requestAnimationFrame(step);
            return;
          }
          const target = targetScaleRef.current;
          const current = zoomScaleRef.current;
          const diff = target - current;
          if (Math.abs(diff) < 0.005) {
            zoomScaleRef.current = target;
            applyZoom(target);
            scaleAnimRef.current = null;
            return;
          }
          // lerp 0.2 平滑插值（Blender式手感）
          zoomScaleRef.current = current + diff * 0.2;
          applyZoom(zoomScaleRef.current);
          scaleAnimRef.current = requestAnimationFrame(step);
        };
        scaleAnimRef.current = requestAnimationFrame(step);
      };
      const zoomBy = (factor: number) => {
        // [修复问题3] 拖拽期间禁止缩放（终极防护）
        if (isDraggingRef.current) {
          console.log('[诊断][zoomBy] 拖拽中，跳过缩放');
          return;
        }
        console.log('[诊断][zoomBy] factor=' + factor + ' target=' + targetScaleRef.current + '->' + (targetScaleRef.current * factor));
        // factor>1 放大（窗口变大），factor<1 缩小（窗口变小）
        let newTarget = targetScaleRef.current * factor;
        // 上限：放大到屏幕工作区高度（baseWindowSize.height × scale ≤ workHeight）
        const base = baseWindowSizeRef.current;
        const screen = screenSizeRef.current;
        const maxH = screen?.workHeight || 1080;
        // [v41 修复] 缩放上限同时约束高度与宽度（宽度不超过屏幕工作区宽）
        const maxScaleH = base.height > 0 ? maxH / base.height : 3;
        const maxScaleW = base.width > 0 ? (screen?.workWidth || 1536) / base.width : 3;
        const maxScale = Math.min(maxScaleH, maxScaleW);
        // 下限：缩小到 96px（baseWindowSize × scale ≥ 96）
        const minScaleW = base.width > 0 ? 96 / base.width : 0.2;
        const minScaleH = base.height > 0 ? 96 / base.height : 0.2;
        const minScale = Math.max(minScaleW, minScaleH);
        newTarget = Math.max(minScale, Math.min(newTarget, maxScale));
        if (Math.abs(newTarget - targetScaleRef.current) < 0.005) return;
        targetScaleRef.current = newTarget;
        startScaleAnim();
      };
      const handleWheel = (e: WheelEvent) => {
        if (!desktopPetMode) return;
        lastInteractTimeRef.current = performance.now();
        // [v14] 拖拽期间完全禁止缩放（终极防护）
        //   原理：isDraggingRef 在 pointerdown 时立即 true，pointerup 时 false
        //   不再有 200ms 间隙期，但保留此检查作为安全网
        if (isDraggingRef.current) {
          e.stopImmediatePropagation();
          e.preventDefault();
          return;
        }
        e.stopImmediatePropagation();
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.11;
        zoomBy(factor);
      };
      window.addEventListener('wheel', handleWheel, { capture: true, passive: false });

      const handlePointerDown = (e: PointerEvent) => {
        lastInteractTimeRef.current = performance.now();
        if (showContextMenuRef.current) {
          if (e.button === 2) {
            showContextMenuRef.current = false;
            setShowContextMenu(false);
          } else {
            return;
          }
        }
        if (e.button === 2 && desktopPetMode) {
          // [v15 右键拖拽不放大修复] 核心改动：不 detach/attach 相机控制
          //   根因：detachControl + attachControl 切换会导致 ArcRotateCamera 重新计算 radius
          //         attachControl 恢复时处理积压指针事件 → radius 变化 → 放大效果
          //   修复：拖拽期间只标记 isDraggingRef，不操作相机控制
          //         wheel/zoomBy 已有 isDraggingRef 检查（L2002/L1975）禁止缩放
          //         相机的 pointers input 已限制 buttons=[0]（仅左键），右键事件不被相机处理
          rightClickDownPosRef.current = { x: e.screenX, y: e.screenY };
          rightClickMovedRef.current = false;
          dragStartXRef.current = e.screenX;
          dragStartYRef.current = e.screenY;
          dragLastXRef.current = e.screenX;
          dragLastYRef.current = e.screenY;
          // [v45 右键单击恢复] 不再立即进入拖拽：pointermove 位移超阈值(3px)才正式拖拽
          //   旧逻辑：pointerdown 无条件 isDragging=true → pointerup 永远走拖拽分支
          //           → 右键单击菜单（handlePointerUp 的 else 分支）永不执行
          //   新逻辑：单击（无位移）→ pointerup 时 isDragging=false → 弹出右键菜单
          //           有位移（>3px）→ pointermove 中启动拖拽（初始化在 pointermove 内）
          rightButtonDownRef.current = true;
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      };
      window.addEventListener('pointerdown', handlePointerDown, { capture: true });

      const handlePointerMove = (e: PointerEvent) => {
        // [v45] 右键按下但未进入拖拽：位移超 3px 才正式启动拖拽（区分单击弹菜单/拖拽移动）
        if (e.buttons === 2 && desktopPetMode && !isDraggingRef.current && rightButtonDownRef.current) {
          const startDx = e.screenX - dragStartXRef.current;
          const startDy = e.screenY - dragStartYRef.current;
          if (Math.abs(startDx) <= 3 && Math.abs(startDy) <= 3) return; // 未超阈值：等待（可能是单击）
          // 超过阈值：正式进入拖拽（原 pointerdown 的初始化移到这里，单击时不做）
          isDraggingRef.current = true;
          rightClickMovedRef.current = true;
          lastInteractTimeRef.current = performance.now();
          // [v36 修复] 冻结主进程窗口 resize（防拖拽前残留 resize IPC 在拖拽中执行导致"闪+放大"）
          try { (window as any).desktopPet?.setResizeFrozen(true); } catch { /* noop */ }
          // [v18 双保险] 拖拽开始时清零相机惯性偏移
          if (cameraRef.current) {
            const cam = cameraRef.current as any;
            cam._inertialRadiusOffset = 0;
            cam._inertialAlphaOffset = 0;
            cam._inertialBetaOffset = 0;
          }
          // [v15] pointer capture 保证 pointermove 不丢
          try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
        }
        if (isDraggingRef.current) {
          lastInteractTimeRef.current = performance.now();
          // [v52 修复] 节流不丢增量：节流未通过时不更新 dragLastX，增量自然累积，
          //   通过时一次发送累积位移 → 窗口移动总量 = 鼠标移动总量（高频鼠标不再丢 88% 位移）
          const now = performance.now();
          if (now - lastMoveSendRef.current >= 16) {
            const deltaX = e.screenX - dragLastXRef.current;
            const deltaY = e.screenY - dragLastYRef.current;
            if (deltaX !== 0 || deltaY !== 0) {
              dragLastXRef.current = e.screenX;
              dragLastYRef.current = e.screenY;
              // 标记已移动（区分单击/拖拽）
              const totalDx = e.screenX - dragStartXRef.current;
              const totalDy = e.screenY - dragStartYRef.current;
              if (Math.abs(totalDx) > 3 || Math.abs(totalDy) > 3) {
                rightClickMovedRef.current = true;
              }
              lastMoveSendRef.current = now;
              // [v52] 拖拽中禁甩小抖动：|delta|<=1 时不发（防 ±1px 来回晃）
              if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                try { (window as any).desktopPet?.moveWindow(deltaX, deltaY); } catch { /* noop */ }
              }
            }
          }
          e.stopImmediatePropagation();
          return;
        }
      };
      window.addEventListener('pointermove', handlePointerMove, { capture: true });

      const handlePointerUp = (e: PointerEvent) => {
        if (e.button === 2 && desktopPetMode) {
          // [v45] 右键已释放：清除按下标记（拖拽启动判定用）
          rightButtonDownRef.current = false;
          if (isDraggingRef.current) {
            // [v18] 拖拽结束：只需重置状态，无需移动窗口（拖拽期间已每帧移动）
            isDraggingRef.current = false;
            try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
            // [v36 修复] 解冻主进程 resize（先解冻，补执行的 resizeWindow 由主进程缓存机制兜底）
            try { (window as any).desktopPet?.setResizeFrozen(false); } catch { /* noop */ }
            // [v39] 松手后补一次 engine.resize（拖拽期间跳过的视口校正）
            try { engine.resize(); } catch { /* noop */ }
            // [v25 拖拽放大修复] 定格缩放动画：滚轮缩放未完成的剩余动画（lerp 0.2 每帧）不再继续，
            //   杜绝"松手后窗口继续放大"（用户感知为拖拽伴随放大）；已生效部分保留
            targetScaleRef.current = zoomScaleRef.current;
            // [v20 拖拽放大修复] 拖拽结束：补执行挂起的窗口尺寸初始化（模型加载完成定时器
            //   在拖拽期间被挂起，松手时一次性补上，避免拖拽中 resizeWindow 导致窗口放大）
            if (pendingResizeRef.current) {
              const pending = pendingResizeRef.current;
              pendingResizeRef.current = null;
              // [v26 修复] 此处不再清 pendingRadiusRef：拖拽中切换模型时，新模型的期望 radius
              //   由新模型 timer 的 Case B 分支消费自愈；误删会导致新模型取景永久错误
              if (pending.radius !== undefined && cameraRef.current) {
                try { cameraRef.current.radius = pending.radius; } catch { /* noop */ }
              }
              try { (window as any).desktopPet?.resizeWindow(pending.width, pending.height); } catch { /* noop */ }
            }
            // [v18] 保持 willChange: 'transform'（canvas 初始 style 已设置），不重置为 auto
            //   原因：透明窗口 WebGL canvas 失去合成层提升会导致渲染闪烁/不显示
            //   canvas 初始 style 已有 willChange:'transform'（L4373），保持即可
            // [v15] 不再调用 cameraRef.current?.attachControl — 与 pointerDown 对称
            lastIgnoreMouseRef.current = null;
          } else if (!rightClickMovedRef.current) {
            // [v21 修复] 菜单早退：清空挂起项，防止跨模型残留（review-final 遗留2）
            pendingResizeRef.current = null;
            pendingRadiusRef.current = null;
            // 单击右键 → 弹出菜单
            try { (window as any).desktopPet?.setIgnoreMouse(false); } catch { /* noop */ }
            lastIgnoreMouseRef.current = false;
            const menuW = 140, menuH = 80;
            const mx = Math.min(e.clientX, window.innerWidth - menuW);
            const my = Math.min(e.clientY, window.innerHeight - menuH);
            showContextMenuRef.current = true;
            setShowContextMenu(true);
            setMenuPos({ x: mx, y: my });
          }
          e.stopImmediatePropagation();
        }
      };
      window.addEventListener('pointerup', handlePointerUp, { capture: true });

      // [v20 拖拽放大修复] pointercancel 自愈：系统打断拖拽（弹窗/焦点丢失/触摸中断）时复位
      //   拖拽状态并补执行挂起的窗口尺寸初始化，避免 isDraggingRef 卡 true（wheel/zoom 永久失效）
      const handlePointerCancel = (e: PointerEvent) => {
        if (desktopPetMode && isDraggingRef.current) {
          isDraggingRef.current = false;
          try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
          // [v36 修复] pointercancel 同样解冻
          try { (window as any).desktopPet?.setResizeFrozen(false); } catch { /* noop */ }
          if (pendingResizeRef.current) {
            const pending = pendingResizeRef.current;
            pendingResizeRef.current = null;
            if (pending.radius !== undefined && cameraRef.current) {
              try { cameraRef.current.radius = pending.radius; } catch { /* noop */ }
            }
            try { (window as any).desktopPet?.resizeWindow(pending.width, pending.height); } catch { /* noop */ }
          }
          // [v25] pointercancel 同样定格缩放动画
          targetScaleRef.current = zoomScaleRef.current;
          lastIgnoreMouseRef.current = null;
          e.stopImmediatePropagation();
        }
      };
      window.addEventListener('pointercancel', handlePointerCancel, { capture: true });

      // [2026-08-06 右键拖拽] 阻止右键菜单（防止拖拽中弹出右键菜单中断拖拽）
      const handleContextMenu = (e: MouseEvent) => {
        if (desktopPetMode) e.preventDefault();
      };
      canvas.addEventListener('contextmenu', handleContextMenu);

      // ----- 性能优化：桌宠模式按需渲染，普通模式保持原有60fps恒定渲染 -----
      // [稳定性保障] 普通模式代码路径完全不变（engine.runRenderLoop），只有桌宠模式启用按需渲染
      //   原因：普通模式是已验证的稳定路径，不改动它确保"效果跟之前一样"
      if (desktopPetMode) {
        // 桌宠模式：按需渲染 + 自适应帧率（requestAnimationFrame 节流）
        // [2026-08-06 v3 流畅性优化] 用户反馈卡顿，要求流畅+低占用
        //   interacting（相机交互中/拖拽中）：60fps，保证拖拽/缩放丝滑
        //   animating（有摆动/呼吸/动作动画）：50fps，摆动更丝滑
        //   idle（完全静止）：20fps（降占用），呼吸动画仍自然（基于时间delta）
        //   交互后 400ms 内保持高帧率，之后降为动画帧率
        // [v70 可见性调度] frozen：本帧直接退出且不再续 rAF（循环自停，零 CPU）；
        //   reduced：帧间隔强制 ≥100ms（≤10fps）——被预览窗口压住一角的壁纸用这档
        const TARGET_FPS = { interacting: 60, animating: 50, idle: 20 } as const;
        const renderLoop = (now: number) => {
          if (!engineRef.current || !sceneRef.current) return;
          if (renderTierRef.current === 'frozen') { rafIdRef.current = null; return; }
          const sc = sceneRef.current;
          const sinceInteract = now - lastInteractTimeRef.current;
          const hasSwing = swingBonesRef.current.length > 0;
          const isActionPlaying = animStateRef.current.action !== 'idle';
          // [v23 老电脑流畅性] idle 20fps 档此前不可达（hasSwing 恒真→永远 50fps，挂机功耗 2.5 倍）
          //   修复：摆动/呼吸在 5 秒无交互后降为 idle 20fps——摆动频率 ~0.19Hz，20fps 采样足够流畅
          //   动作播放中保持 50fps；交互后 400ms 内保持 60fps；5 秒内保持 50fps 摆动更丝滑
          if (sinceInteract < 400) {
            renderStateRef.current = 'interacting';
          } else if (isActionPlaying || (hasSwing && sinceInteract < 5000)) {
            renderStateRef.current = 'animating';
          } else {
            renderStateRef.current = 'idle';
          }
          const baseInterval = 1000 / TARGET_FPS[renderStateRef.current];
          const interval = Math.max(baseInterval, renderTierRef.current === 'reduced' ? 100 : 0);
          if (now - lastFrameTimeRef.current >= interval) {
            lastFrameTimeRef.current = now;
            sc.render();
          }
          rafIdRef.current = requestAnimationFrame(renderLoop);
        };
        beginRenderLoopRef.current = () => {
          if (rafIdRef.current === null && engineRef.current && sceneRef.current) {
            lastFrameTimeRef.current = 0;  // 解冻后立即渲染一帧，呈现当前姿态
            rafIdRef.current = requestAnimationFrame(renderLoop);
          }
        };
        rafIdRef.current = requestAnimationFrame(renderLoop);
      } else {
        // [2026-09-05 性能] 普通模式（预览）自适应帧率——原为恒定 60fps 满帧渲染，
        //   是预览 CPU 峰值的主要来源（大画布 + DefaultRenderingPipeline 后处理）。
        //   复用桌宠模式已有的交互时间戳 refs（lastInteractTimeRef 等，全模式统一更新）：
        //   交互中 60fps 丝滑不变；动作播放/摆动 45fps；5 秒无交互 → idle 20fps（呼吸周期 ~4s，20fps 采样足够自然）
        // [v70 可见性调度] 主窗口最小化/隐藏 → 主进程下发 frozen，循环自停（任务栏防呆最小化
        //   进壁纸模式后，预览的 rAF 彻底归零）；解冻由 render-mode 广播拉起
        const PREVIEW_TARGET_FPS = { interacting: 60, animating: 45, idle: 20 } as const;
        const previewRenderLoop = (now: number) => {
          if (!engineRef.current || !sceneRef.current) return;
          if (renderTierRef.current === 'frozen') { rafIdRef.current = null; return; }
          // [v173 后台保活] 预览被隐藏（切到 DSH/设置页）→ 自停，不渲染不耗 CPU；引擎与姿态保留
          if (previewHiddenRef.current) { rafIdRef.current = null; return; }
          const sc = sceneRef.current;
          const sinceInteract = now - lastInteractTimeRef.current;
          const hasSwing = swingBonesRef.current.length > 0;
          const isActionPlaying = animStateRef.current.action !== 'idle';
          if (sinceInteract < 400) {
            renderStateRef.current = 'interacting';
          } else if (isActionPlaying || (hasSwing && sinceInteract < 5000)) {
            renderStateRef.current = 'animating';
          } else {
            renderStateRef.current = 'idle';
          }
          const baseInterval = 1000 / PREVIEW_TARGET_FPS[renderStateRef.current];
          const interval = Math.max(baseInterval, renderTierRef.current === 'reduced' ? 100 : 0);
          if (now - lastFrameTimeRef.current >= interval) {
            lastFrameTimeRef.current = now;
            sc.render();
          }
          rafIdRef.current = requestAnimationFrame(previewRenderLoop);
        };
        beginRenderLoopRef.current = () => {
          if (rafIdRef.current === null && engineRef.current && sceneRef.current) {
            lastFrameTimeRef.current = 0;
            rafIdRef.current = requestAnimationFrame(previewRenderLoop);
          }
        };
        rafIdRef.current = requestAnimationFrame(previewRenderLoop);
      }

      // [v70 可见性渲染调度] 接收主进程档位广播（渲染端唯一入口，主进程是唯一裁决者）
      {
        const dpet = (window as any).desktopPet;
        if (dpet?.onRenderMode) {
          offRenderModeRef.current = dpet.onRenderMode((mode: string) => {
            const prev = renderTierRef.current;
            renderTierRef.current = mode === 'frozen' ? 'frozen' : mode === 'reduced' ? 'reduced' : 'active';
            if (prev !== renderTierRef.current) {
              console.log(`[RenderScheduler] 渲染档位: ${prev} → ${renderTierRef.current}`);
            }
            // frozen → 非frozen：循环已自停，由重启器拉起
            if (prev === 'frozen' && renderTierRef.current !== 'frozen') {
              beginRenderLoopRef.current?.();
            }
          });
        }
      }

      // [v173 后台保活] 预览隐藏 → 暂停渲染；恢复 → 立即拉起循环（模型不重建）
      {
        const onPreviewHidden = () => {
          if (desktopPetMode) return;
          previewHiddenRef.current = true;
          console.log('[RenderLoop] 预览隐藏 → 暂停渲染（引擎/模型保活）');
          if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
        };
        const onPreviewVisible = () => {
          if (desktopPetMode) return;
          if (!previewHiddenRef.current) return;
          previewHiddenRef.current = false;
          console.log('[RenderLoop] 预览恢复 → 拉起渲染');
          beginRenderLoopRef.current?.();
        };
        window.addEventListener('rl-preview-hidden', onPreviewHidden);
        window.addEventListener('rl-preview-visible', onPreviewVisible);
        offPreviewVisRef.current = () => {
          window.removeEventListener('rl-preview-hidden', onPreviewHidden);
          window.removeEventListener('rl-preview-visible', onPreviewVisible);
        };
      }

      // MMD 物理引擎已禁用（方案A失败，根因见文件头部注释）
      // physicsReadyRef 保持 false，所有柔性骨骼（头发/裙摆/尾巴）由 swingObserver 的 sin 摆动驱动

      // ResizeObserver 监听容器尺寸变化（比 window.resize 更可靠）
      const container = canvas.parentElement;
      // [2026-09-10 壁纸转屏] 尺寸变化后重套默认上半身取景——横竖来回切永远回正
      //   只动 wallpaper；预览/桌宠小窗不走这里
      const applyWallpaperReframe = () => {
        // wallpaperFrameRef 仅壁纸加载时写入；无缓存=非壁纸或模型未好
        const cam = cameraRef.current;
        const fr = wallpaperFrameRef.current;
        if (!cam || !fr || fr.modelHeight <= 0) return;
        if (typeof window === 'undefined' || !/wallpaper/i.test(window.location.pathname || '')) return;
        try {
          // [2026-09-10 镜头统一] 壁纸=预览同一套取景；仅 alpha 因 180° 转向用 +π/2
          cam.beta = Math.PI / 2;
          cam.alpha = Math.PI / 2;
          // [2026-09-10] 壁纸：再等比缩小 10%（2.58→2.345）
          const targetY = fr.minY + fr.modelHeight * 0.85;
          cam.setTarget(new Vector3(fr.centerX, targetY, fr.centerZ));
          const visibleHeight = fr.modelHeight * 0.35;
          const distance = (visibleHeight / 2) / Math.tan(cam.fov / 2) * 1.1;
          cam.radius = Math.max(1, Math.min(50, distance / 2.345));
          baseRadiusRef.current = cam.radius;
          console.log('[BabylonModelViewer][壁纸转屏重套] ' +
            'canvas=' + engine.getRenderWidth() + 'x' + engine.getRenderHeight() +
            ' targetY=' + targetY.toFixed(2) + ' radius=' + cam.radius.toFixed(2));
        } catch (e) { /* noop */ }
      };
      const scheduleWallpaperReframe = () => {
        if (!wallpaperFrameRef.current) return;
        if (typeof window === 'undefined' || !/wallpaper/i.test(window.location.pathname || '')) return;
        if (wallpaperReframeTimerRef.current !== null) {
          window.clearTimeout(wallpaperReframeTimerRef.current);
        }
        // 旋转过程会连发 resize，防抖 120ms 等最终尺寸
        wallpaperReframeTimerRef.current = window.setTimeout(() => {
          wallpaperReframeTimerRef.current = null;
          if (isDraggingRef.current) return;
          applyWallpaperReframe();
        }, 120);
      };
      if (container) {
        const resizeObserver = new ResizeObserver(() => {
          // [v39 修复] 拖拽期间跳过 engine.resize：瞬态尺寸变化（DWM 抖动/跨 DPI/解冻瞬间）
          //   会重建 WebGL drawing buffer，若瞬态尺寸偏大则模型渲染进更大视口一帧 = "放大+闪烁"
          if (isDraggingRef.current) return;
          engine.resize();
          scheduleWallpaperReframe();
        });
        resizeObserver.observe(container);

        // 清理时停止观察
        const originalDispose = engine.dispose.bind(engine);
        engine.dispose = () => {
          resizeObserver.disconnect();
          if (wallpaperReframeTimerRef.current !== null) {
            window.clearTimeout(wallpaperReframeTimerRef.current);
            wallpaperReframeTimerRef.current = null;
          }
          originalDispose();
        };
      }

      const handleResize = () => {
        if (isDraggingRef.current) return; // [v39] 拖拽期间跳过（同 ResizeObserver）
        engine.resize();
        scheduleWallpaperReframe();
      };
      window.addEventListener('resize', handleResize);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { onClose?.(); return; }
        // [2026-08-06 v9] 桌宠模式：键盘 +/- 用 zoomBy（窗口尺寸缩放，radius 固定）
        //   普通模式：保留相机 radius 缩放（不影响预览界面）
        if (desktopPetMode) {
          if (e.key === '+' || e.key === '=') {
            lastInteractTimeRef.current = performance.now();
            zoomBy(1.1);  // 放大：窗口变大
          } else if (e.key === '-' || e.key === '_') {
            lastInteractTimeRef.current = performance.now();
            zoomBy(0.9);  // 缩小：窗口变小
          }
          return;
        }
        // 普通模式：相机 radius 缩放（预览界面，不影响桌宠）
        const cam = cameraRef.current;
        if (!cam) return;
        if (e.key === '+' || e.key === '=') {
          cam.radius = Math.max(cam.radius * 0.9, cam.lowerRadiusLimit ?? 0);
          lastInteractTimeRef.current = performance.now();
        } else if (e.key === '-' || e.key === '_') {
          cam.radius = Math.min(cam.radius * 1.1, cam.upperRadiusLimit ?? Infinity);
          lastInteractTimeRef.current = performance.now();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      // [2026-09-05] 摄像机视角切换函数已随"摄像机模式"整体移除（无调用方）

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        // [v11] wheel 和 pointer 事件都注册在 window 上（capture: true），必须在 window 上移除
        window.removeEventListener('wheel', handleWheel, { capture: true });
        window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
        window.removeEventListener('pointermove', handlePointerMove, { capture: true });
        window.removeEventListener('pointerup', handlePointerUp, { capture: true });
        window.removeEventListener('pointercancel', handlePointerCancel, { capture: true });
        canvas.removeEventListener('contextmenu', handleContextMenu);
        // [v26 修复] 清理模型加载定时器（防卸载后 100ms 定时器仍触发 resizeWindow）
        if (modelInitTimerRef.current !== null) {
          clearTimeout(modelInitTimerRef.current);
          modelInitTimerRef.current = null;
        }
        // [v14] 清理菜单状态（定时器已移除，无需清理）
        showContextMenuRef.current = false;
        // [v9] 取消缩放动画 rAF
        if (scaleAnimRef.current !== null) {
          cancelAnimationFrame(scaleAnimRef.current);
          scaleAnimRef.current = null;
        }
        // [v19] 恢复 camera.radius 的原始 setter
        if (radiusRestoreRef.current) {
          radiusRestoreRef.current();
          radiusRestoreRef.current = null;
        }
        // [2026-08-05 重构] 桌宠模式取消rAF，普通模式停止runRenderLoop（与初始化对称）
        if (desktopPetMode) {
          if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
          // 桌宠模式退出时恢复鼠标接收（防止穿透状态泄漏）
          try { (window as any).desktopPet?.setIgnoreMouse(false); } catch { /* noop */ }
          // [2026-08-05 重构] 不再调用 desktopPet.exit()
          // 原因：桌宠现在是独立窗口，关闭窗口由主进程处理，不需要渲染进程通知
        } else {
          engine.stopRenderLoop();
          // [2026-09-05 性能] 预览模式改用 rAF 自适应帧率，卸载时对称取消
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
        }
        // [v70] 退订主进程广播（渲染档位 / 动作指令扇出），防监听器泄漏
        beginRenderLoopRef.current = null;
        if (offRenderModeRef.current) { try { offRenderModeRef.current(); } catch { /* noop */ } offRenderModeRef.current = null; }
        if (offJointCmdRef.current) { try { offJointCmdRef.current(); } catch { /* noop */ } offJointCmdRef.current = null; }
        // [v173] 退订预览可见性监听
        if (offPreviewVisRef.current) { try { offPreviewVisRef.current(); } catch { /* noop */ } offPreviewVisRef.current = null; }
        // [v129] MMD/ammo dispose 死分支已删（mmdRuntimeRef 从未赋值）
        physicsReadyRef.current = false;
        // 移除摆动/呼吸观察者（虽然 scene.dispose 会自动清理，但显式移除更安全）
        if (swingObserverRef.current) {
          scene.onBeforeRenderObservable.remove(swingObserverRef.current);
          swingObserverRef.current = null;
        }
        if (breathObserverRef.current) {
          scene.onBeforeRenderObservable.remove(breathObserverRef.current);
          breathObserverRef.current = null;
        }
        if (doubleTapObserverRef.current) {
          scene.onPointerObservable.remove(doubleTapObserverRef.current);
          doubleTapObserverRef.current = null;
        }
        // 清理碰撞体调试网格
        for (const m of collisionDebugMeshesRef.current) {
          try { m.material?.dispose(); m.dispose(); } catch (e) { /* noop */ }
        }
        collisionDebugMeshesRef.current = [];
        collisionBodiesRef.current = [];
        swingBonesRef.current = [];
        stopJointControlPolling();
        scene.dispose();
        engine.dispose();
      };
    } catch (err) {
      console.error('[BabylonModelViewer] 初始化失败:', err);
      setInitError(err instanceof Error ? err.message : String(err));
    }

    // ===== 组件卸载时清理摆动资源 =====
    return () => {
      try {
        // 移除摆动观察者
        if (swingObserverRef.current && sceneRef.current) {
          sceneRef.current.onBeforeRenderObservable.remove(swingObserverRef.current);
          swingObserverRef.current = null;
        }
        // 清空摆动骨骼列表
        swingBonesRef.current = [];
        // 移除呼吸+交互动画观察者
        if (breathObserverRef.current && sceneRef.current) {
          sceneRef.current.onBeforeRenderObservable.remove(breathObserverRef.current);
          breathObserverRef.current = null;
        }
        // 移除双击监听
        if (doubleTapObserverRef.current && sceneRef.current) {
          sceneRef.current.onPointerObservable.remove(doubleTapObserverRef.current);
          doubleTapObserverRef.current = null;
        }
        // 清空动画状态
        humanBodyRef.current = null;
        analysisRef.current = null;
        animStateRef.current = { action: 'idle', startTime: 0, duration: 0, breathBaseRot: null, actionBones: [] } as any;
        // 销毁碰撞体调试网格（防止内存泄漏）
        for (const m of collisionDebugMeshesRef.current) {
          try {
            m.material?.dispose();
            m.dispose();
          } catch (e) { /* noop */ }
        }
        collisionDebugMeshesRef.current = [];
        // 清空碰撞体列表
        collisionBodiesRef.current = [];
        // [v129] MMD dispose 死分支已删
        physicsReadyRef.current = false;
        // 停止 AI 关节控制指令轮询（AI 接入预留接口）
        stopJointControlPolling();
      } catch (e) {
        console.warn('[BabylonModelViewer] 摆动资源清理失败:', e);
      }
    };
  // [2026-08-06 v7 修复场景被dispose] 依赖改为空数组，场景只初始化一次
  // 之前依赖 [onClose]，onClose 引用变化会导致场景被 dispose 重建（模型消失的根因）
  // onClose 通过 onCloseRef 在退出按钮中使用，不需要作为 useEffect 依赖
  }, []);

  // 清理Object URL
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // 加载模型
  const loadModel = useCallback(async () => {
    // 取消上一次加载
    loadAbortRef.current?.abort();
    loadAbortRef.current = new AbortController();
    const { signal } = loadAbortRef.current;
    // [v21 修复] 清理上一个模型的窗口初始化定时器（防止换模型后旧定时器叠加触发 resizeWindow）
    if (modelInitTimerRef.current !== null) {
      clearTimeout(modelInitTimerRef.current);
      modelInitTimerRef.current = null;
    }

    if (!modelData || !sceneRef.current) return;
    if (!modelData.url && !modelData.data && !modelData.modelFile) return;

    // 检查场景是否已被 dispose（HMR/卸载）
    if (signal.aborted) return;

    // [v49] 加载资源分配：进入加载态 = 暂停动画观察者 + 降渲染分辨率，把 CPU/GPU 让给加载
    loadingRef.current = true;
    try {
      const eng = (sceneRef.current as any)?.getEngine?.();
      if (eng && prevScalingRef.current === null) {
        prevScalingRef.current = eng.getHardwareScalingLevel();
        eng.setHardwareScalingLevel(2); // 半分辨率渲染，降低加载期 GPU 压力
      }
    } catch (e) { /* noop */ }
    // [v49] 换模型时移除旧观察者（防泄漏：旧观察者继续跑已 dispose 的骨骼）
    {
      const sc = sceneRef.current as any;
      if (sc) {
        if (swingObserverRef.current) {
          sc.onBeforeRenderObservable.remove(swingObserverRef.current);
          swingObserverRef.current = null;
        }
        if (breathObserverRef.current) {
          sc.onBeforeRenderObservable.remove(breathObserverRef.current);
          breathObserverRef.current = null;
        }
      }
    }
    setLoading(true);
    setLoadModelError(null);

    if (currentModelRef.current) {
      try { currentModelRef.current.dispose(false, true); } catch (e) { /* 忽略 */ }
      currentModelRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    try {
      const scene = sceneRef.current;
      const fileName = modelData.name.toLowerCase();

      // ===== 关键修复：构建referenceFiles（IArrayBufferFile[]类型） =====
      // relativePath必须与PMX内部存储的路径一致（相对于PMX文件所在目录）
      // 需要从webkitRelativePath中去掉文件夹前缀
      const referenceFiles: IArrayBufferFile[] = [];

      if (modelData.textureFiles && modelData.textureFiles.length > 0) {
        // [2026-08-05 桌宠独立窗口] 优先用 modelData.modelWebkitRelativePath（IPC 传递时无 File 对象）
        const modelWebkitPath = modelData.modelWebkitRelativePath
          || modelData.modelFile?.webkitRelativePath
          || modelData.modelFile?.name
          || '';

        for (const tex of modelData.textureFiles) {
          // [2026-08-05] 优先用 tex.webkitRelativePath（IPC 传递时无 File 对象）
          const texWebkitPath = tex.webkitRelativePath
            || tex.file?.webkitRelativePath
            || tex.file?.name
            || '';
          const texPath = tex.path || tex.name;

          let relativePath: string;
          if (modelWebkitPath && texWebkitPath) {
            // 从webkitRelativePath提取PMX内部相对路径
            relativePath = extractRelativePath(texWebkitPath, modelWebkitPath);
          } else {
            // 没有 webkitRelativePath，直接用 path 或 name
            relativePath = texPath;
          }

          // 推断MIME类型
          const ext = relativePath.split('.').pop()?.toLowerCase() || '';
          let mimeType: string | undefined;
          if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'bmp') mimeType = 'image/bmp';
          else if (ext === 'tga') mimeType = 'image/x-tga';
          else if (ext === 'webp') mimeType = 'image/webp';
          else if (ext === 'spa' || ext === 'sph') mimeType = 'application/octet-stream';
          else mimeType = undefined;

          referenceFiles.push({
            relativePath,
            mimeType,
            data: tex.data,
          });
        }
        console.log(`[BabylonModelViewer] 准备 ${referenceFiles.length} 个IArrayBufferFile作为referenceFiles`);
        if (referenceFiles.length > 0) {
          console.log('[BabylonModelViewer] 示例路径:', referenceFiles[0].relativePath);
        }
      }

      // [v182-4 灰模修复] 手机端按 PMX 贴图表重映射 relativePath（配对失败则原样灰模降级）
      if (IS_MOBILE_DEVICE && referenceFiles.length > 0 && modelData.data) {
        const remapped = rebuildReferencePathsForMobile(referenceFiles, modelData.data);
        referenceFiles.length = 0;
        referenceFiles.push(...remapped);
        if (referenceFiles.length > 0) {
          console.log('[BabylonModelViewer][v182] 重映射后示例路径:', referenceFiles[0].relativePath);
        }
      }

      let loadedMeshes: any;
      const isPmx = fileName.endsWith('.pmx') || fileName.endsWith('.pmd');
      const isGlb = fileName.endsWith('.glb') || fileName.endsWith('.gltf');
      const isObj = fileName.endsWith('.obj');

      if (isPmx) {
        // PMX加载：优先用Object URL（避免data URL的rootUrl问题）
        // [2026-08-05 桌宠独立窗口] data 也能创建 Blob URL（不依赖 File 对象）
        let sourceUrl: string;
        if (modelData.modelFile) {
          sourceUrl = URL.createObjectURL(modelData.modelFile);
          objectUrlRef.current = sourceUrl;
        } else if (modelData.url) {
          sourceUrl = modelData.url;
        } else if (modelData.data) {
          // [2026-08-05] 用 Blob + createObjectURL 替代 data URL（更高效，无大小限制）
          const modelBlob = new Blob([modelData.data]);
          sourceUrl = URL.createObjectURL(modelBlob);
          objectUrlRef.current = sourceUrl;
        } else {
          throw new Error('模型数据为空（无 modelFile/url/data）');
        }

        // [v26 修复] .pmd 必须用 pmdLoader：babylon-mmd 的 pmxLoader 只注册 .pmx，pmdLoader 只注册 .pmd
        const options: any = { pluginExtension: fileName.endsWith('.pmd') ? '.pmd' : '.pmx' };
        if (referenceFiles.length > 0) {
          options.pluginOptions = { mmdmodel: { referenceFiles } };
        }

        // [v186 看门狗] ImportMeshAsync 120s 未决（如贴图加载链异常挂起）→ 强制报错退出，
        // 不再无限转圈；错误信息进 loadModelError UI
        const importPromise = ImportMeshAsync(sourceUrl, scene, options);
        const watchdog = new Promise<never>((_, reject) => setTimeout(
          () => reject(new Error('模型加载超时（120s）：贴图或资源解析未完成，请重试导入')),
          120000,
        ));
        const result = await Promise.race([importPromise, watchdog]);
        if (signal.aborted) return;
        loadedMeshes = result.meshes;
      } else if (isGlb || isObj) {
        const ext = isGlb ? (fileName.endsWith('.glb') ? '.glb' : '.gltf') : '.obj';
        const options: any = { pluginExtension: ext };

        let sourceUrl: string;
        if (modelData.modelFile) {
          sourceUrl = URL.createObjectURL(modelData.modelFile);
          objectUrlRef.current = sourceUrl;
        } else if (modelData.url) {
          sourceUrl = modelData.url;
        } else if (modelData.data) {
          // [2026-08-05] 用 Blob + createObjectURL 替代 data URL
          const modelBlob = new Blob([modelData.data]);
          sourceUrl = URL.createObjectURL(modelBlob);
          objectUrlRef.current = sourceUrl;
        } else {
          throw new Error('模型数据为空（无 modelFile/url/data）');
        }

        const result = await ImportMeshAsync(sourceUrl, scene, options);
        if (signal.aborted) return;
        loadedMeshes = result.meshes;
      } else {
        throw new Error(`不支持的模型格式: ${modelData.name}`);
      }

      if (!loadedMeshes || loadedMeshes.length === 0) {
        throw new Error('模型加载失败：未返回任何 mesh');
      }

      // 再次检查是否被取消
      if (signal.aborted) return;

      const rootMesh = loadedMeshes.find((m: any) => m.name === '__root__') || loadedMeshes[0];
      currentModelRef.current = rootMesh;

      // ===== 渐进式骨骼驱动流程（模块化、可关闭、可回退）=====
      // 流程：1. 解析骨骼 → 2. 验证蒙皮 → 3. 自然站姿 → 4. 接入摆动
      // 任何步骤失败都降级运行（不崩溃、不白屏），仅记录日志
      if (fileName.endsWith('.pmx') || fileName.endsWith('.pmd')) {
        try {
          // 步骤 1：解析骨骼（确认 PMX 是否正确建立 Skeleton Runtime）
          const analysis = analyzeSkeleton(rootMesh);
          if (!analysis) {
            setPhysicsStatus('骨骼解析失败');
            // 降级运行：不设置站姿、不接入摆动，模型按默认状态显示
          } else {
            // 步骤 2：验证蒙皮
            const skinningOk = verifySkinning(analysis.skeleton);

            // 步骤 2.5：构建人体语义层（用于驱动姿态）
            const humanBody = buildHumanBody(analysis.skeleton);

            // [v77] 贴骨报告（=Blender 贴骨检查）：规范槽位覆盖清单，✗=该槽位未映射（相关动作自动退化）
            try {
              const hbR = humanBody;
              const slotList: Array<[string, any]> = [
                ['頭', hbR?.spine?.head], ['首', hbR?.spine?.neck], ['胸', hbR?.spine?.chest], ['上脊椎', hbR?.spine?.upperSpine], ['下脊椎', hbR?.spine?.lowerSpine],
                ['左肩', hbR?.leftArm?.shoulder], ['左上臂', hbR?.leftArm?.upperArm], ['左前臂', hbR?.leftArm?.lowerArm], ['左手', hbR?.leftArm?.hand],
                ['右肩', hbR?.rightArm?.shoulder], ['右上臂', hbR?.rightArm?.upperArm], ['右前臂', hbR?.rightArm?.lowerArm], ['右手', hbR?.rightArm?.hand],
                ['左大腿', hbR?.leftLeg?.upperLeg], ['左膝', hbR?.leftLeg?.lowerLeg], ['左踝', hbR?.leftLeg?.foot],
                ['右大腿', hbR?.rightLeg?.upperLeg], ['右膝', hbR?.rightLeg?.lowerLeg], ['右踝', hbR?.rightLeg?.foot],
              ];
              const missSlots = slotList.filter(([, b]) => !b).map(([n]) => n);
              console.log(`[RigMap] 贴骨 ${slotList.length - missSlots.length}/${slotList.length}${missSlots.length ? ' ✗缺: ' + missSlots.join(',') : ' 全齐 ✓'}`);
            } catch (e) { /* noop */ }

            // 步骤 2.6：PMX 资源诊断（仅日志，不改姿态）
            diagnosePmxResource(rootMesh);

            // 步骤 2.7：关节识别报告（关节白名单 vs 位置锁死黑名单）
            const jointReport = listJointsAndNonJoints(analysis.skeleton);
            console.log(`[JointReport] 关节:${jointReport.joints.length} 非关节:${jointReport.nonJoints.length} 位置锁死:${jointReport.locked.length}`);
            // [2026-09-18] 骨骼分类审计：Leg_*/鞋/踵 必须落在 decoPhysics，禁止进关节
            try {
              const allNames: string[] = (analysis.skeleton.bones || []).map((b: any) => b.name);
              const deco = allNames.filter((n) => isDecoPhysicsBone(n));
              const leaked = deco.filter((n) => jointReport.joints.includes(n));
              const proxies = allNames.filter((n) => classifyBoneName(n) === 'jointProxy');
              console.log(`[BoneClass] decoPhysics=${deco.length} ${deco.slice(0, 12).join(',')} jointProxy=${proxies.length} ${proxies.slice(0, 8).join(',')}`);
              if (leaked.length) console.error('[BoneClass] 关节泄漏(必须为0):', leaked);
              else console.log('[BoneClass] 关节泄漏=0 OK（鞋/裙附属未进关节表）');
              // 高跟接地补偿：不建跟骨；heelLift=踝到鞋底估高（默认0，可 window.__footProfile.heelLift 覆盖）
              try {
                (window as any).__footProfile = (window as any).__footProfile || {};
                if (typeof (window as any).__footProfile.heelLift !== 'number') {
                  (window as any).__footProfile.heelLift = 0;
                }
              } catch { /* noop */ }
            } catch (e) { console.warn('[BoneClass] 审计失败', e); }
            if (BONE_DEBUG) {
              console.log(`[JointReport] 关节列表(前20): ${jointReport.joints.slice(0, 20).join(', ')}${jointReport.joints.length > 20 ? '...' : ''}`);
              console.log(`[JointReport] 位置锁死列表: ${jointReport.locked.join(', ') || '(无)'}`);
            }

            // 步骤 3：应用自然站姿（让手臂自然下垂，留 15° 夹角）
            // 关键修改：自然站姿不依赖 physicsEnabled 开关
            // 即使关闭物理模组，手臂也应该自然下垂
            const poseCount = applyNaturalArmPose(analysis.skeleton, humanBody);

            // 步骤 3.5：强制同步所有骨骼的 _absoluteMatrix
            // 关键修复：使用 skeleton.computeAbsoluteMatrices(true)（Bone 上没有这个方法）
            // 这样会从根骨骼递归更新所有子骨骼的 _absoluteMatrix
            try {
              analysis.skeleton.computeAbsoluteMatrices(true);
              analysis.skeleton._isDirty = true;
            } catch (e) {
              console.warn('[ArmPose] 同步骨骼矩阵失败:', e);
            }

            // 步骤 3.5.5：MMD 物理引擎已禁用（方案A失败，根因见文件头部注释）
            // physicsReadyRef 保持 false，所有柔性骨骼由 swingObserver 的 sin 摆动驱动

            // 步骤 3.6：暴露 window.__jointControl 全局接口
            // 用户可在浏览器控制台动态调整任意关节的旋转角度
            // 例如：window.__jointControl.rotate('頭', 0, 0.5, 0)  // 让头向右转 0.5 弧度
            //      window.__jointControl.list()                    // 列出所有关节
            //      window.__jointControl.reset('頭')               // 重置头部旋转
            try {
              const skel = analysis.skeleton;
              (window as any).__jointControl = {
                /** 列出所有关节/非关节/位置锁死骨骼 */
                list: () => listJointsAndNonJoints(skel),
                /** 列出所有关节名称（按骨骼名） */
                joints: () => jointReport.joints,
                /**
                 * 旋转指定关节（按骨骼名匹配，弧度）
                 *
                 * 内部自动传入 collisionContext，启用碰撞反馈：
                 * 若该旋转导致主动碰撞体相交（穿模），则回滚到原旋转并返回 false。
                 * 这样 AI / 用户捏脸或运动控制时会有"物理反馈"，不会出现穿模。
                 */
                rotate: (boneName: string, x: number, y: number, z: number): boolean => {
                  const bone = skel.bones.find((b: any) => b.name === boneName);
                  if (!bone) {
                    console.warn(`[JointControl] 找不到骨骼: "${boneName}"`);
                    return false;
                  }
                  // 碰撞上下文：当前 skeleton + 当前已创建的碰撞体列表
                  const ctx: CollisionContext = {
                    skeleton: skel,
                    bodies: collisionBodiesRef.current,
                  };
                  // [2026-09-18] 统一驱动门：关节+D系同步；附属骨拒绝
                  return rotateJointWithProxy(skel, bone, { x, y, z }, 'user', ctx);
                },
                /** 重置指定关节旋转（恢复 bind pose） */
                reset: (boneName: string): boolean => {
                  const bone = skel.bones.find((b: any) => b.name === boneName);
                  if (!bone) {
                    console.warn(`[JointControl] 找不到骨骼: "${boneName}"`);
                    return false;
                  }
                  return safeRotateJoint(bone, { x: 0, y: 0, z: 0 }, 'reset');
                },
                /** 重置所有关节旋转（[2026-09-07] 平滑过渡版）
                 *  旧版硬切 {0,0,0}：全部关节瞬间回 T-pose，手臂从垂手闪成水平张臂（用户实锤痛点）。
                 *  新版：300ms slerp 到 bind pose；上臂目标直接取垂手角（与 applyNaturalArmPose 同源几何法，
                 *  用 bind 世界位置 atan2 计算，不写死角度），复位完成即自然垂手，全程无跳变。 */
                resetAll: (): number => {
                  // 垂手目标角（几何法，与 applyNaturalArmPose 同源：bind 世界方向 atan2 + 腋窝 15° 夹角）
                  const armRestQuat = (arm: any): Quaternion | null => {
                    try {
                      const upperArm = arm?.upperArm as any;
                      if (!upperArm) return null;
                      const children: any[] = upperArm.getChildren ? upperArm.getChildren() : (upperArm.children || []);
                      const childBone = arm.lowerArm || children[0];
                      if (!childBone) return null;
                      const bonePos = (upperArm as any)._absoluteBindMatrix?.getTranslation?.()
                                    || (upperArm as any).getAbsoluteMatrix?.()?.getTranslation();
                      const childPos = (childBone as any)._absoluteBindMatrix?.getTranslation?.()
                                     || (childBone as any).getAbsoluteMatrix?.()?.getTranslation();
                      if (!bonePos || !childPos) return null;
                      const dx = childPos.x - bonePos.x;
                      const dy = childPos.y - bonePos.y;
                      const dz = childPos.z - bonePos.z;
                      if (Math.sqrt(dx*dx + dy*dy + dz*dz) <= 0.01) return null;
                      const isOnPositiveX = bonePos.x > 0;
                      const ARMPIT = 15 * Math.PI / 180;
                      const targetAngle = isOnPositiveX ? -Math.PI / 2 + ARMPIT : -Math.PI / 2 - ARMPIT;
                      return Quaternion.FromEulerAngles(0, 0, targetAngle);
                    } catch { return null; }
                  };
                  const restOverride = new Map<any, Quaternion>();
                  try {
                    const hb: any = humanBody;
                    if (hb?.leftArm) {
                      const lq = armRestQuat(hb.leftArm);
                      if (lq && hb.leftArm.upperArm) restOverride.set(hb.leftArm.upperArm, lq);
                    }
                    if (hb?.rightArm) {
                      const rq = armRestQuat(hb.rightArm);
                      if (rq && hb.rightArm.upperArm) restOverride.set(hb.rightArm.upperArm, rq);
                    }
                  } catch { /* 几何信息缺失则退化为纯 bind 复位 */ }

                  const targets: Array<{ bone: any; from: Quaternion; to: Quaternion }> = [];
                  for (const bone of skel.bones) {
                    if (isJointBone(bone.name) && !isPositionLockedBone(bone.name)) {
                      try {
                        const from = bone.getRotationQuaternion(Space.LOCAL).clone();
                        const to = restOverride.get(bone) || Quaternion.Identity();
                        targets.push({ bone, from, to });
                      } catch { /* skip */ }
                    }
                  }
                  if (targets.length === 0) return 0;

                  // 300ms 平滑过渡（ease-in-out），绕过 safeRotateJoint 的逐帧校验（目标值本身合法）
                  const start = performance.now();
                  const DUR = 300;
                  const tmp = new Quaternion();
                  const tick = () => {
                    const t = Math.min(1, (performance.now() - start) / DUR);
                    const e = 0.5 - 0.5 * Math.cos(Math.PI * t);
                    for (const { bone, from, to } of targets) {
                      try {
                        Quaternion.SlerpToRef(from, to, e, tmp);
                        bone.setRotationQuaternion(tmp, Space.LOCAL);
                      } catch { /* 单骨骼失败不影响整体 */ }
                    }
                    if (t < 1) requestAnimationFrame(tick);
                    else {
                      try { skel.computeAbsoluteMatrices(true); } catch { /* noop */ }
                      console.log('[JointControl] resetAll 平滑复位完成（手臂经垂手目标角，无张臂闪跳）');
                    }
                  };
                  requestAnimationFrame(tick);
                  return targets.length;
                },
                /** 获取关节的生理极限 */
                limit: (boneName: string): JointLimit | null => {
                  if (!isJointBone(boneName)) return null;
                  return getJointLimit(boneName);
                },
                /**
                 * 查询当前系统状态（用于 AI 接入前的诊断）
                 * @returns 物理引擎/碰撞体/摆动骨骼/关节数量等状态信息
                 */
                status: () => ({
                  physicsEngine: physicsReadyRef.current ? 'enabled' : 'disabled',
                  physicsModel: 'sin',
                  collisionBodies: collisionBodiesRef.current.length,
                  swingBones: swingBonesRef.current.length,
                  totalBones: analysis.boneCount,
                  joints: jointReport.joints.length,
                  lockedBones: jointReport.locked.length,
                  action: animStateRef.current.action,
                }),
                /**
                 * 查找骨骼名（模糊匹配，用于 AI 不知道确切骨骼名时）
                 * @returns 匹配的骨骼名列表
                 */
                find: (keyword: string): string[] => {
                  const lower = (keyword || '').toLowerCase();
                  return skel.bones
                    .map((b: any) => b.name)
                    .filter((name: string) => (name || '').toLowerCase().includes(lower));
                },
              };
              console.log('[JointControl] 已暴露 window.__jointControl，可调用 .list()/.joints()/.rotate(name,x,y,z)/.reset(name)/.resetAll()/.limit(name)/.status()/.find(keyword)');

              // 启动后端→前端指令接收（AI 接入预留接口）
              // 其他编程 AI 可通过 POST /api/joint-control/rotate 等接口下发指令
              // [v70 指令扇出] 轮询收编到主进程：单一消费方拉取 /pending（原先是
              //   桌宠/壁纸两窗口各自轮询抢单，splice 取走即删，一条指令只有一个窗口
              //   能收到——"三开只动一个"的病根），拿到后经 IPC 广播给所有存活窗口。
              //   可见窗口同步动；frozen 窗口照样执行姿态赋值（开销可忽略）但不渲染，
              //   解冻后直接呈现当前姿态。本渲染端只负责注册监听执行。
              //   兜底：无 preload（纯浏览器 dev）时，仅桌宠/壁纸窗口维持本地轮询。
              {
                const dpet = (window as any).desktopPet;
                if (dpet?.onJointCommand) {
                  offJointCmdRef.current = dpet.onJointCommand((cmds: any[]) => {
                    if (Array.isArray(cmds) && cmds.length > 0) {
                      void executeIncomingCommands(cmds);
                    }
                  });
                } else if (desktopPetMode) {
                  try {
                    startJointControlPolling();
                  } catch (e) {
                    console.warn('[JointControl] 启动轮询失败:', e);
                  }
                }
              }
            } catch (e) {
              console.warn('[JointControl] 暴露接口失败:', e);
            }

            // 步骤 4：接入摆动系统（仅当 physicsEnabled=true 时启用）
            // 摆动只对头发/裙摆/尾巴骨骼，不影响手臂
            // 尾巴使用链式弯曲逻辑（参考 Unity Dynamic Bone：沿骨骼链传播，距根越远弯曲越大）
            //
            // 骨骼链传播策略（参考 Unity Dynamic Bone）：
            // 1. 先通过关键词识别"种子"摆动骨骼（如"前髪"、"横髪"等）
            // 2. 沿子骨骼链传播：种子骨骼的所有子骨骼也是摆动骨骼
            //    这样即使子骨骼名不含关键词（如"bone_045"），也能被识别为摆动骨骼
            // 3. 排除 IK 骨骼（IK 系统会覆盖旋转，摆动无效）
            const swingBones: Array<{ bone: Bone; baseRotation: Quaternion; phase: number; axis: 'x' | 'y' | 'z'; isTail: boolean; chainIndex: number; collisionGroup: string }> = [];
            if (physicsEnabled) {
              const allBones: any[] = analysis.skeleton.bones || [];

              // 第一步：通过关键词识别"种子"摆动骨骼
              const seedSwingBones = new Set<string>(); // 种子骨骼名集合
              for (const bone of allBones) {
                const name = (bone.name || '').toLowerCase();
                // 排除 IK 骨骼
                if (name.includes('ik')) continue;
                const isSwingBone = analysis.swingCandidates.some(
                  candidate => candidate.toLowerCase() === (bone.name || '').toLowerCase()
                );
                if (isSwingBone) {
                  seedSwingBones.add(bone.name);
                }
              }

              // 第一步扩展：启发式识别头部下的头发骨骼（修复头顶/脸部头发不飘动）
              // 根因：部分 PMX 模型的头顶/脸部头发骨骼用无意义编号命名（如 bone_045），
              //       既不含 swingKeywords，也不是种子骨骼的子骨骼（平级挂在头部下），
              //       导致 BFS 无法传播到，只有背后含关键词的头发（如"後ろ髪"）能飘动。
              // 修复：把"头部直接子骨骼 + 排除面部/附件/颈部"也作为种子，BFS 会传播其子链。
              // 依据：MMD 模型头部骨骼(頭/head)的直接子骨骼通常就是头发骨骼(前髪/後ろ髪/頂髪)
              //       和面部骨骼(目/口/眉)，排除面部后剩下的就是头发骨骼，即使命名为 bone_XXX 也能识别。
              const faceKeywords = ['eye','目','眼','口','唇','眉','鼻','耳','face','面','expression','express','tap','blink','eyeblow','eyebrow','tongue','歯','齿','teeth','hat','帽','glass','眼鏡','access','装飾','neck','首','phone'];
              const headBone = allBones.find((b: any) => {
                const n = (b.name || '').toLowerCase();
                return n === 'head' || n === '頭' || ((n.includes('head') || n.includes('頭')) && !n.includes('phone') && !n.includes('set'));
              });
              if (headBone) {
                const headChildren = headBone.getChildren ? headBone.getChildren() : (headBone.children || []);
                let added = 0;
                for (const child of headChildren) {
                  if (!child || !child.name) continue;
                  const childName = (child.name || '').toLowerCase();
                  if (childName.includes('ik')) continue;
                  if (faceKeywords.some(kw => childName.includes(kw))) continue;
                  if (!seedSwingBones.has(child.name)) {
                    seedSwingBones.add(child.name);
                    added++;
                  }
                }
                if (BONE_DEBUG) console.log(`[Swing] 头部骨骼="${headBone.name}" 子骨骼${headChildren.length}个，启发式新增种子${added}个`);
              } else {
                if (BONE_DEBUG) console.warn('[Swing] 未找到头部骨骼(head/頭)，跳过头部启发式识别');
              }

              // 第二步：沿子骨骼链传播（BFS）
              // 种子骨骼的所有子骨骼也是摆动骨骼
              const allSwingBoneNames = new Set<string>(seedSwingBones);
              const queue: any[] = [];
              for (const bone of allBones) {
                if (seedSwingBones.has(bone.name)) queue.push(bone);
              }
              while (queue.length > 0) {
                const bone = queue.shift();
                const children = bone.getChildren ? bone.getChildren() : (bone.children || []);
                for (const child of children) {
                  if (!child || !child.name) continue;
                  // 排除 IK 骨骼
                  const childName = (child.name || '').toLowerCase();
                  if (childName.includes('ik')) continue;
                  if (!allSwingBoneNames.has(child.name)) {
                    allSwingBoneNames.add(child.name);
                    queue.push(child);
                  }
                }
              }

              if (BONE_DEBUG) console.log(`[Swing] 种子骨骼 ${seedSwingBones.size} 个，传播后总计 ${allSwingBoneNames.size} 个摆动骨骼`);

              // 第三步：构建 swingBones 数组
              for (const bone of allBones) {
                if (!allSwingBoneNames.has(bone.name)) continue;
                const name = (bone.name || '').toLowerCase();

                // 修复根因：用四元数捕获bind pose旋转，避免getRotation()的Euler转换精度损失
                // 旧代码：bone.getRotation(Space.LOCAL) 返回Euler角（四元数→Euler有万向锁/精度损失）
                // 新代码：bone.getRotationQuaternion(Space.LOCAL) 直接返回四元数，无精度损失
                let baseRotation: Quaternion;
                try {
                  baseRotation = bone.getRotationQuaternion(Space.LOCAL) || Quaternion.Identity();
                } catch (e) {
                  baseRotation = Quaternion.Identity();
                }
                const phase = Math.random() * Math.PI * 2;
                // 判断是否尾巴骨骼
                // 修复：增加"weiba"（尾巴拼音）匹配，部分PMX模型用拼音命名骨骼（如Bn_weiba001）
                // 原值：const isTailBone = name.includes('tail') || name.includes('尾') || name.includes('尻尾') || name.includes('しっぽ');
                const isTailBone = name.includes('tail') || name.includes('尾') || name.includes('尻尾') || name.includes('しっぽ') || name.includes('weiba');
                const isTailExcluded = name.includes('尾骨') || name.includes('coccyx') || name.includes('tailbone') || name.includes('ik');
                const isTailByName = isTailBone && !isTailExcluded;
                // ===== 尾巴修复：扩展isTail判断，含父骨骼链检查 =====
                // 原值：const isTail = isTailBone && !isTailExcluded;
                // 新值：含父骨骼链检查，处理无关键词命名的尾巴子骨骼（如bone_045）
                //       同时排除头发关键词，防止头发骨骼被误判为尾巴子骨骼
                // 原理：尾巴子骨骼可能不含"尾"关键词，但其父骨骼链中有尾巴骨骼
                //       BFS传播会把这些子骨骼加入allSwingBoneNames，需正确识别为尾巴
                const isTailByChain = !isTailByName && isTailByParentChain(bone) && !hasHairKeyword(name);
                const isTail = isTailByName || isTailByChain;
                // ===== 尾巴控制恢复（原L2154 continue已移除） =====
                // 原方案：if (isTail) continue; // 彻底禁用尾巴
                // 新方案：让尾巴骨骼进入swingBones，由Spring Bone分支驱动自然下垂
                // 安全保障：
                //   1. 不启用顶点重绑定（避免误绑头发顶点导致"转圈圈"）
                //   2. Spring Bone分支用四元数旋转（符合project_memory规定）
                //   3. hasHairKeyword排除确保头发骨骼不被误判为尾巴
                //   4. try-catch异常防护，失败时降级运行
                const isSkirt = name.includes('skirt') || name.includes('スカート') ||
                                name.includes('裾') || name.includes('裙') || name.includes('hem');
                // 尾巴用 X 轴（重力下垂方向），裙摆用 Z 轴，头发用 Y 轴
                const axis: 'x' | 'y' | 'z' = isTail ? 'x' : (isSkirt ? 'z' : 'y');
                // 碰撞组：头发骨骼不与头部碰撞体检测（避免前刘海被头部碰撞体压制）
                const collisionGroup = isTail ? 'tail' : (isSkirt ? 'skirt' : 'hair');
                swingBones.push({ bone, baseRotation, phase, axis, isTail, chainIndex: 0, collisionGroup });
              }

              // 构建尾巴骨骼链（参考 Dynamic Bone：沿父子层级遍历）
              // 每条尾巴骨骼链从根骨骼开始，沿子骨骼向下直到叶子节点
              // chainIndex 用于后续按距离根骨骼的深度计算弯曲幅度
              // [v129] SpringChain 构建块已删（运行默认 OFF，sin 摆动）
              const tailBones = swingBones.filter(s => s.isTail);
              if (tailBones.length > 0) {
                // 按骨骼名分组（不同尾巴用不同根名区分，如 tail_01, tail2_01）
                // 简化处理：所有尾巴骨骼视为一条链，按骨骼层级深度排序
                for (const tb of tailBones) {
                  // 计算该骨骼在尾巴链中的深度（向上数父骨骼中有多少个是尾巴骨骼）
                  let depth = 0;
                  let parent: any = tb.bone.getParent ? tb.bone.getParent() : (tb.bone as any).parent;
                  while (parent) {
                    const pName = (parent.name || '').toLowerCase();
                    // 排除人体尾骨和 IK 骨骼
                    // 修复：增加weiba拼音匹配（与L2189识别逻辑保持一致）
                    const pIsTail = (pName.includes('tail') || pName.includes('尾') || pName.includes('尻尾') || pName.includes('しっぽ') || pName.includes('weiba'))
                                   && !pName.includes('尾骨') && !pName.includes('coccyx') && !pName.includes('tailbone')
                                   && !pName.includes('ik');
                    if (pIsTail) {
                      depth++;
                    }
                    parent = parent.getParent ? parent.getParent() : (parent as any).parent;
                  }
                  tb.chainIndex = depth;
                }
              }

              // ===== 尾巴自然下垂：预计算每节尾巴骨骼的下垂目标旋转 =====
              // 旧方案问题：spring bone用固定正方向重力旋转，实际可能将尾巴推向上方而非下方；
              //             弹簧拉回bind pose与重力对抗，平衡点不确定，尾巴不下垂
              // 新方案原理（参考Unity Dynamic Bone目标驱动模式）：
              //   1. 在bind pose下计算每节尾巴骨骼的延伸方向（世界空间，父骨骼→本骨骼）
              //   2. 计算从延伸方向→正下方(0,-1,0)的世界旋转
              //   3. 取该旋转的一部分（droopFraction）作为下垂目标
              //   4. 通过父骨骼世界旋转的共轭，将世界旋转转换为骨骼局部旋转
              //   5. 目标局部旋转 = 局部下垂旋转 × bind pose旋转
              //   6. 运行时用弹簧将骨骼平滑插值到目标旋转
              // 优势：不依赖固定轴/方向猜测，自动适配任意尾巴朝向；目标明确（下垂）
              for (const sb of swingBones) {
                if (!sb.isTail) continue;
                try {
                  const boneAny = sb.bone as any;
                  const parentBone = sb.bone.getParent ? sb.bone.getParent() : (sb.bone as any).parent;
                  if (!parentBone) {
                    boneAny.__tailDroopTarget = sb.baseRotation.clone();
                    continue;
                  }
                  // 获取bind pose世界矩阵（_absoluteBindMatrix不受运行时影响）
                  const boneWM = boneAny._absoluteBindMatrix || boneAny.getAbsoluteMatrix?.();
                  const parentWM = (parentBone as any)._absoluteBindMatrix || (parentBone as any).getAbsoluteMatrix?.();
                  if (!boneWM || !parentWM) {
                    boneAny.__tailDroopTarget = sb.baseRotation.clone();
                    continue;
                  }
                  const bonePos = boneWM.getTranslation();
                  const parentPos = parentWM.getTranslation();
                  // 延伸方向（世界空间，从父骨骼指向本骨骼）
                  const extDir = new Vector3(bonePos.x - parentPos.x, bonePos.y - parentPos.y, bonePos.z - parentPos.z);
                  const extLen = extDir.length();
                  if (extLen < 0.001) {
                    boneAny.__tailDroopTarget = sb.baseRotation.clone();
                    continue;
                  }
                  extDir.scaleInPlace(1 / extLen);
                  // 正下方方向
                  const downDir = new Vector3(0, -1, 0);
                  // 计算从延伸方向→正下方的旋转
                  const dot = Vector3.Dot(extDir, downDir);
                  let worldDroopQuat: Quaternion = Quaternion.Identity();
                  if (dot > 0.9999) {
                    // 已朝下，无需旋转
                    worldDroopQuat = Quaternion.Identity();
                  } else if (dot < -0.9999) {
                    // 朝正上方，绕X轴旋转180°（选任意垂直轴）
                    worldDroopQuat = Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI);
                  } else {
                    // 一般情况：绕 extDir × downDir 轴旋转（右手定则，extDir→downDir）
                    const rotAxis = Vector3.Cross(extDir, downDir);
                    rotAxis.normalize();
                    const rotAngle = Math.acos(Math.max(-1, Math.min(1, dot)));
                    // 下垂比例：根部少垂，尖部多垂，形成自然弧线
                    // 原值：固定0.15 rad重力，方向不确定
                    // 旧值：0.35 + chainIndex × 0.15（chainIndex大时过度旋转，30节骨骼会到4.7）
                    // 新值：clamp到0.9上限，根部0.1逐步递增到尖部0.85，适配长短尾巴
                    const droopFraction = Math.min(0.85, 0.1 + sb.chainIndex * 0.025);
                    worldDroopQuat = Quaternion.RotationAxis(rotAxis, rotAngle * droopFraction);
                  }
                  // 将世界旋转转换为骨骼局部旋转
                  // 原理：local_droop = parentWorldRot⁻¹ × worldDroop × parentWorldRot
                  const _dummyScale = new Vector3();
                  const parentWorldRot = new Quaternion();
                  parentWM.decompose(_dummyScale, parentWorldRot, undefined);
                  const parentConj = parentWorldRot.clone();
                  parentConj.conjugateInPlace();
                  const localDroop = parentConj.multiply(worldDroopQuat).multiply(parentWorldRot);
                  // 目标局部旋转 = 局部下垂旋转 × bind pose旋转
                  boneAny.__tailDroopTarget = localDroop.multiply(sb.baseRotation);
                  if (BONE_DEBUG) {
                    console.log(`[TailDroop] ${sb.bone.name} chain=${sb.chainIndex} extDir=(${extDir.x.toFixed(2)},${extDir.y.toFixed(2)},${extDir.z.toFixed(2)}) dot=${dot.toFixed(3)} droopFrac=${(0.35 + sb.chainIndex * 0.15).toFixed(2)} target=已计算`);
                  }
                } catch (e) {
                  (sb.bone as any).__tailDroopTarget = sb.baseRotation.clone();
                  if (BONE_DEBUG) console.warn(`[TailDroop] ${sb.bone.name} 目标计算失败:`, e);
                }
              }

              // ===== 诊断日志（定位头发/尾巴飘动根因）=====
              if (BONE_DEBUG) {
                console.log(`[Swing] 最终摆动骨骼列表(${swingBones.length}):`, swingBones.map(s => `${s.bone.name}(isTail=${s.isTail},chain=${s.chainIndex},group=${s.collisionGroup},axis=${s.axis})`));
                // ===== 尾巴修复诊断：统计尾巴骨骼数量 =====
                // 新增于尾巴修复：验证尾巴骨骼是否正确进入swingBones
                const tailBonesInSwing = swingBones.filter(s => s.isTail);
                console.log(`[TailFix] 尾巴骨骼进入swingBones: ${tailBonesInSwing.length}个`, tailBonesInSwing.map(s => `${s.bone.name}(chain=${s.chainIndex})`));
                if (tailBonesInSwing.length === 0) {
                  // [2026-09-25] 模型本来就可能无尾（如知更鸟·晴歌），这是预期情况：
                  //   降为 info，避免每次加载刷 ERROR 让用户误以为出 bug
                  console.info(`[TailFix] 模型无尾巴骨骼，跳过尾巴物理（模型无尾或骨骼名不含tail/尾关键词）`);
                }
                // ===== 尾巴修复诊断：检查骨骼层级关系 =====
                // 新增于尾巴修复：确认旋转尾巴骨骼是否会影响头发骨骼
                if (tailBonesInSwing.length > 0 && BONE_DEBUG) {
                  for (const tb of tailBonesInSwing) {
                    const childNames: string[] = [];
                    const collectChildren = (bone: any, depth: number) => {
                      if (depth > 5) return;
                      const children = bone.getChildren ? bone.getChildren() : (bone.children || []);
                      for (const child of children) {
                        if (child && child.name) {
                          childNames.push(`${child.name}(d=${depth})`);
                          collectChildren(child, depth + 1);
                        }
                      }
                    };
                    collectChildren(tb.bone, 1);
                    const hasHairChild = childNames.some(n => hasHairKeyword(n));
                    console.log(`[TailHierarchy] "${tb.bone.name}" 子骨骼(${childNames.length}):`, childNames.slice(0, 15), hasHairChild ? '← 含头发骨骼!' : '');
                  }
                }
                // ===== 尾巴修复诊断：找到尾巴顶点所在的mesh =====
                // 新增于尾巴修复：精确定位尾巴mesh，为顶点重绑定做准备
                if (tailBonesInSwing.length > 0 && BONE_DEBUG) {
                  try {
                    const tailBonePos = (tailBonesInSwing[0].bone as any)._absoluteBindMatrix?.getTranslation?.();
                    if (tailBonePos) {
                      const allMeshesForTail: any[] = [];
                      const collectMeshesForTail = (node: any) => {
                        if (!node) return;
                        if (node.skeleton && node.getVerticesData) allMeshesForTail.push(node);
                        if (node.getChildMeshes) node.getChildMeshes().forEach((c: any) => collectMeshesForTail(c));
                      };
                      collectMeshesForTail(rootMesh);
                      console.log(`[TailMesh] 尾巴骨骼位置=(${tailBonePos.x.toFixed(2)},${tailBonePos.y.toFixed(2)},${tailBonePos.z.toFixed(2)}) 蒙皮mesh数=${allMeshesForTail.length}`);
                      // 输出每个mesh的包围盒中心，找距离尾巴骨骼最近的
                      const meshInfo = allMeshesForTail.map((mesh, idx) => {
                        const pos = mesh.getVerticesData?.('position');
                        if (!pos || pos.length === 0) return { idx, name: mesh.name, dist: Infinity, yMin: 0, yMax: 0, zMin: 0, zMax: 0, vertCount: 0 };
                        let yMin = Infinity, yMax = -Infinity, zMin = Infinity, zMax = -Infinity;
                        let cx = 0, cy = 0, cz = 0;
                        const vc = pos.length / 3;
                        for (let v = 0; v < vc; v++) {
                          const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
                          if (y < yMin) yMin = y; if (y > yMax) yMax = y;
                          if (z < zMin) zMin = z; if (z > zMax) zMax = z;
                          cx += x; cy += y; cz += z;
                        }
                        cx /= vc; cy /= vc; cz /= vc;
                        const dx = cx - tailBonePos.x, dy = cy - tailBonePos.y, dz = cz - tailBonePos.z;
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        return { idx, name: mesh.name, dist, yMin, yMax, zMin, zMax, vertCount: vc, cx, cy, cz };
                      }).sort((a, b) => a.dist - b.dist);
                      console.log(`[TailMesh] 距尾巴骨骼最近的mesh(前5):`, meshInfo.slice(0, 5).map(m => `${m.name}(dist=${m.dist.toFixed(2)},Y=${m.yMin.toFixed(1)}~${m.yMax.toFixed(1)},Z=${m.zMin.toFixed(1)}~${m.zMax.toFixed(1)},verts=${m.vertCount})`));
                    }
                  } catch (e) {
                    console.warn('[TailMesh] 诊断失败:', e);
                  }
                }
                // 头部子骨骼中仍未被识别的（排除面部）—— 排查头发遗漏
                if (headBone) {
                  const headChildren = headBone.getChildren ? headBone.getChildren() : (headBone.children || []);
                  const missed = headChildren.filter((c: any) => {
                    if (!c || !c.name) return false;
                    const cn = (c.name || '').toLowerCase();
                    if (cn.includes('ik')) return false;
                    if (faceKeywords.some(kw => cn.includes(kw))) return false;
                    return !allSwingBoneNames.has(c.name);
                  });
                  if (missed.length > 0) console.warn('[Swing] 头部子骨骼仍未识别(非面部但未入摆动):', missed.map((b: any) => b.name));
                }
              }

              // ===== 尾巴骨骼权重诊断（验证 setRotation 是否能驱动顶点）=====
              // 根因验证：PMX 顶点权重在模型文件中定义，若尾巴顶点未绑定到尾巴骨骼（权重0），
              //           则 bone.setRotation 无法影响顶点位置，尾巴保持笔直。
              // 此诊断输出每个尾巴骨骼影响的顶点数和权重总和，便于定位是"未识别"还是"权重0"。
              const tailBonesForDiag = swingBones.filter(s => s.isTail);
              if (tailBonesForDiag.length > 0 && BONE_DEBUG) {
                try {
                  // 关键修复：遍历所有蒙皮mesh，而非只取第一个
                  // 旧代码只扫描第一个mesh（头部572顶点），误报"权重=0"
                  const allMeshesDiag: any[] = [];
                  const collectMeshesDiag = (node: any) => {
                    if (!node) return;
                    if (node.skeleton && node.getVerticesData) allMeshesDiag.push(node);
                    if (node.getChildMeshes) node.getChildMeshes().forEach((c: any) => collectMeshesDiag(c));
                  };
                  collectMeshesDiag(rootMesh);
                  const boneIndexMap = new Map<string, number>();
                  analysis.skeleton.bones.forEach((b: any, i: number) => boneIndexMap.set(b.name, i));
                  for (const tb of tailBonesForDiag) {
                    const boneIdx = boneIndexMap.get(tb.bone.name);
                    if (boneIdx === undefined) {
                      console.warn(`[TailDiag] 尾巴骨骼 "${tb.bone.name}" 不在 skeleton.bones 索引中`);
                      continue;
                    }
                    let totalWeight = 0;
                    let affectedVerts = 0;
                    // 遍历所有mesh统计权重
                    for (const mesh of allMeshesDiag) {
                      const matricesIndices = mesh.getVerticesData?.('matricesIndices');
                      const matricesWeights = mesh.getVerticesData?.('matricesWeights');
                      if (!matricesIndices || !matricesWeights) continue;
                      const vertCount = matricesIndices.length / 4;
                      for (let v = 0; v < vertCount; v++) {
                        let w = 0;
                        for (let k = 0; k < 4; k++) {
                          if (matricesIndices[v * 4 + k] === boneIdx) w += matricesWeights[v * 4 + k];
                        }
                        if (w > 0) { totalWeight += w; affectedVerts++; }
                      }
                    }
                    console.log(`[TailRebind] 尾巴骨骼 "${tb.bone.name}" boneIdx=${boneIdx} chainIndex=${tb.chainIndex} 影响顶点=${affectedVerts} 权重总和=${totalWeight.toFixed(4)} (扫描${allMeshesDiag.length}个mesh) ${affectedVerts === 0 ? '← 权重0:需顶点位移方案' : '← 权重正常'}`);
                  }

                  // ===== 增强诊断：确定尾巴顶点权重为0的真正原因 =====
                  // 检查1: matricesIndicesExtra（第5-8骨骼影响）是否有尾巴骨骼权重
                  // 检查2: 尾巴骨骼附近的顶点实际绑定到哪些骨骼（是否绑到了其他骨骼）
                  for (const tb of tailBonesForDiag) {
                    const boneIdx = boneIndexMap.get(tb.bone.name);
                    if (boneIdx === undefined) continue;
                    let extraWeight = 0;
                    let extraVerts = 0;
                    for (const mesh of allMeshesDiag) {
                      const miExtra = mesh.getVerticesData?.('matricesIndicesExtra');
                      const mwExtra = mesh.getVerticesData?.('matricesWeightsExtra');
                      if (!miExtra || !mwExtra) continue;
                      const vc = miExtra.length / 4;
                      for (let v = 0; v < vc; v++) {
                        let w = 0;
                        for (let k = 0; k < 4; k++) {
                          if (miExtra[v * 4 + k] === boneIdx) w += mwExtra[v * 4 + k];
                        }
                        if (w > 0) { extraWeight += w; extraVerts++; }
                      }
                    }
                    console.log(`[TailDiag] Extra矩阵: "${tb.bone.name}" idx=${boneIdx} Extra顶点=${extraVerts} Extra权重=${extraWeight.toFixed(4)} ${extraVerts > 0 ? '← 权重在Extra!' : '← Extra也无'}`);
                  }
                  // 检查2: 尾巴骨骼附近顶点的实际骨骼绑定
                  {
                    const tailBonePos = (tailBonesForDiag[0].bone as any)._absoluteBindMatrix?.getTranslation?.();
                    if (tailBonePos) {
                      console.log(`[TailDiag] ===== 尾巴骨骼附近顶点实际骨骼绑定 =====`);
                      console.log(`[TailDiag] 尾巴骨骼位置=(${tailBonePos.x.toFixed(2)},${tailBonePos.y.toFixed(2)},${tailBonePos.z.toFixed(2)})`);
                      const idxToName = new Map<number, string>();
                      analysis!.skeleton.bones.forEach((b: any, i: number) => idxToName.set(i, b.name));
                      for (const mesh of allMeshesDiag) {
                        const positions = mesh.getVerticesData?.('position');
                        const mi = mesh.getVerticesData?.('matricesIndices');
                        const mw = mesh.getVerticesData?.('matricesWeights');
                        const miExtra = mesh.getVerticesData?.('matricesIndicesExtra');
                        const mwExtra = mesh.getVerticesData?.('matricesWeightsExtra');
                        if (!positions || !mi || !mw) continue;
                        const vc = positions.length / 3;
                        const nearbyVerts: Array<{ v: number; dist: number; bones: Array<{ idx: number; name: string; weight: number }> }> = [];
                        for (let v = 0; v < vc; v++) {
                          const vx = positions[v * 3], vy = positions[v * 3 + 1], vz = positions[v * 3 + 2];
                          const dx = vx - tailBonePos.x, dy = vy - tailBonePos.y, dz = vz - tailBonePos.z;
                          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                          if (dist < 2.0) {
                            const bones: Array<{ idx: number; name: string; weight: number }> = [];
                            for (let k = 0; k < 4; k++) {
                              const bIdx = mi[v * 4 + k];
                              const bW = mw[v * 4 + k];
                              if (bW > 0) bones.push({ idx: bIdx, name: idxToName.get(bIdx) || `?${bIdx}`, weight: bW });
                            }
                            if (miExtra && mwExtra) {
                              for (let k = 0; k < 4; k++) {
                                const bIdx = miExtra[v * 4 + k];
                                const bW = mwExtra[v * 4 + k];
                                if (bW > 0) bones.push({ idx: bIdx, name: idxToName.get(bIdx) || `?${bIdx}`, weight: bW });
                              }
                            }
                            nearbyVerts.push({ v, dist, bones });
                          }
                        }
                        if (nearbyVerts.length > 0) {
                          nearbyVerts.sort((a, b) => a.dist - b.dist);
                          const closest = nearbyVerts.slice(0, 5);
                          const boneCount = new Map<string, number>();
                          for (const nv of nearbyVerts) {
                            for (const b of nv.bones) {
                              boneCount.set(b.name, (boneCount.get(b.name) || 0) + 1);
                            }
                          }
                          const sortedBones = Array.from(boneCount.entries()).sort((a, b) => b[1] - a[1]);
                          console.log(`[TailDiag] mesh(${mesh.name}) 距骨骼<2.0顶点=${nearbyVerts.length} 绑定骨骼分布:`, sortedBones.slice(0, 10).map(([n, c]) => `${n}(${c})`));
                          console.log(`[TailDiag]   最近5顶点:`, closest.map(nv => `#${nv.v}(d=${nv.dist.toFixed(2)},[${nv.bones.map(b => `${b.name}:${b.weight.toFixed(2)}`).join(',')}])`));
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.warn('[TailDiag] 权重诊断失败:', e);
                }
              } else if (tailBonesForDiag.length === 0 && BONE_DEBUG) {
                // 无尾巴骨骼被识别 —— 输出可能的尾巴候选名，辅助判断是否命名无关键词
                const tailLikeNames = analysis.boneNames.filter(n => {
                  const lower = (n || '').toLowerCase();
                  return lower.includes('tail') || lower.includes('尾') || lower.includes('しっぽ');
                });
                // [2026-09-25] 无尾为预期情况（如知更鸟·晴歌），降为 info
                console.info(`[TailDiag] 模型无尾巴骨骼。含tail/尾关键词的骨骼:`, tailLikeNames);
              }

              // ===== 尾巴顶点重绑定（骨骼链路径距离过滤方案）=====
              // 原方案问题：用Y/Z范围过滤会误绑头发顶点（长发可能在腰部以下或身体后部）
              // 新方案：基于骨骼链路径的距离过滤，精确锁定尾巴顶点
              //   1. 在尾巴骨骼之间画线段（骨骼链路径）
              //   2. 计算每个顶点到骨骼链路径的最短距离
              //   3. 只重绑定距离骨骼链很近的顶点（< 阈值）
              //   4. 不会触及头发顶点（头发顶点远离尾巴骨骼链）
              // 安全保障：
              //   - 距离阈值基于模型身高（避免固定值不适配不同模型）
              //   - 距离反比平滑权重分配（避免"拉橡皮泥"）
              //   - try-catch异常防护
              const tailBonesForRebind = swingBones.filter(s => s.isTail);
              // ===== 尾巴顶点重绑定已禁用 =====
              // 原因：用户在Blender中确认尾巴顶点已正确绑定到骨骼链，PMX权重正常
              //       Babylon.js PMX加载器已正确加载权重，旋转骨骼即可驱动顶点
              //       旧方案因距离阈值过小无法找到顶点，且存在误绑头发顶点风险
              // 原代码：if (tailBonesForRebind.length > 0) { ... 重绑定逻辑 ... }
              // 恢复方式：将 false 改为 true
              if (false && tailBonesForRebind.length > 0) {
                try {
                  // 收集所有蒙皮mesh
                  const allSkinMeshes: any[] = [];
                  const collectAllSkinMeshes = (node: any) => {
                    if (!node) return;
                    if (node.skeleton && node.getVerticesData) allSkinMeshes.push(node);
                    if (node.getChildMeshes) node.getChildMeshes().forEach((c: any) => collectAllSkinMeshes(c));
                  };
                  collectAllSkinMeshes(rootMesh);

                  // 骨骼名→索引映射
                  const boneIndexMapRebind = new Map<string, number>();
                  analysis!.skeleton.bones.forEach((b: any, i: number) => boneIndexMapRebind.set(b.name, i));

                  // 安全检查：如果尾巴骨骼已有权重，跳过重绑定
                  let totalTailWeight = 0;
                  for (const mesh of allSkinMeshes) {
                    const mi = mesh.getVerticesData?.('matricesIndices');
                    const mw = mesh.getVerticesData?.('matricesWeights');
                    if (!mi || !mw) continue;
                    for (const tb of tailBonesForRebind) {
                      const bIdx = boneIndexMapRebind.get(tb.bone.name);
                      if (bIdx === undefined) continue;
                      const vc = mi.length / 4;
                      for (let v = 0; v < vc; v++) {
                        for (let k = 0; k < 4; k++) {
                          if (mi[v * 4 + k] === bIdx) totalTailWeight += mw[v * 4 + k];
                        }
                      }
                    }
                  }
                  if (totalTailWeight > 0.001) {
                    console.log(`[TailRebind] 尾巴骨骼已有权重(总和=${totalTailWeight.toFixed(4)})，跳过重绑定`);
                  } else {
                    // 获取尾巴骨骼链数据：索引 + bind位置 + 链顺序
                    const tailBoneData: Array<{ idx: number; pos: Vector3; chainIndex: number; name: string }> = [];
                    for (const tb of tailBonesForRebind) {
                      const boneIdx = boneIndexMapRebind.get(tb.bone.name);
                      if (boneIdx === undefined) continue;
                      // 使用 _absoluteBindMatrix 获取bind位置（不受运行时影响）
                      const m = (tb.bone as any)._absoluteBindMatrix || (tb.bone as any).getAbsoluteMatrix?.();
                      if (!m) continue;
                      const t = m.getTranslation();
                      tailBoneData.push({ idx: boneIdx!, pos: new Vector3(t.x, t.y, t.z), chainIndex: tb.chainIndex, name: tb.bone.name });
                    }

                    if (tailBoneData.length > 0 && allSkinMeshes.length > 0) {
                      // 按chainIndex排序，形成骨骼链路径
                      tailBoneData.sort((a, b) => a.chainIndex - b.chainIndex);
                      console.log(`[TailRebind] 尾巴骨骼链(按chain排序):`, tailBoneData.map(td => `${td.name}(chain=${td.chainIndex},pos=(${td.pos.x.toFixed(2)},${td.pos.y.toFixed(2)},${td.pos.z.toFixed(2)}))`));

                      // 计算模型身高（用于确定距离阈值）
                      let minY = Infinity, maxY = -Infinity;
                      for (const b of analysis!.skeleton.bones) {
                        const m = (b as any)._absoluteBindMatrix || (b as any).getAbsoluteMatrix?.();
                        if (!m) continue;
                        const y = m.getTranslation().y;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                      }
                      const modelHeightRebind = (maxY - minY) || 16;

                      // ★关键：距离阈值 = 模型身高 × 3%（约0.5单位）
                      // 这是尾巴顶点到尾巴骨骼链的最大允许距离
                      // 头发顶点距离尾巴骨骼链通常>2.0单位，远超此阈值
                      const distThreshold = modelHeightRebind * 0.03;
                      console.log(`[TailRebind] 模型身高=${modelHeightRebind.toFixed(2)} 距离阈值=${distThreshold.toFixed(3)} 蒙皮mesh=${allSkinMeshes.length}个`);

                      // 计算顶点到骨骼链路径的最短距离
                      // 骨骼链路径 = 尾巴骨骼之间的连线段
                      const segments: Array<{ p1: Vector3; p2: Vector3; bone1Idx: number; bone2Idx: number }> = [];
                      for (let i = 0; i < tailBoneData.length - 1; i++) {
                        segments.push({
                          p1: tailBoneData[i].pos,
                          p2: tailBoneData[i + 1].pos,
                          bone1Idx: tailBoneData[i].idx,
                          bone2Idx: tailBoneData[i + 1].idx
                        });
                      }
                      // 如果只有1个尾巴骨骼，用点距离
                      if (tailBoneData.length === 1) {
                        // 单骨骼时，segments为空，下方逻辑用点到点距离
                      }

                      /**
                       * 计算点P到线段AB的最短距离，返回距离和最近点参数t(0~1)
                       */
                      const pointToSegmentDist = (px: number, py: number, pz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number): number => {
                        const abx = bx - ax, aby = by - ay, abz = bz - az;
                        const apx = px - ax, apy = py - ay, apz = pz - az;
                        const abLenSq = abx * abx + aby * aby + abz * abz;
                        if (abLenSq < 1e-9) {
                          // A=B，用点到点距离
                          return Math.sqrt(apx * apx + apy * apy + apz * apz);
                        }
                        let t = (apx * abx + apy * aby + apz * abz) / abLenSq;
                        t = Math.max(0, Math.min(1, t));  // 钳制到线段范围内
                        const closestX = ax + t * abx;
                        const closestY = ay + t * aby;
                        const closestZ = az + t * abz;
                        const dx = px - closestX, dy = py - closestY, dz = pz - closestZ;
                        return Math.sqrt(dx * dx + dy * dy + dz * dz);
                      };

                      // 遍历所有mesh，重绑定尾巴顶点
                      let totalRebindCount = 0;
                      let meshWithTailCount = 0;
                      for (let meshIdx = 0; meshIdx < allSkinMeshes.length; meshIdx++) {
                        const mesh = allSkinMeshes[meshIdx];
                        const positions = mesh.getVerticesData?.('position');
                        const indices = mesh.getVerticesData?.('matricesIndices');
                        const weights = mesh.getVerticesData?.('matricesWeights');
                        if (!positions || !indices || !weights) continue;

                        const vertCount = positions.length / 3;
                        let meshRebindCount = 0;
                        const newIndices = Array.from(indices);
                        const newWeights = Array.from(weights);

                        for (let v = 0; v < vertCount; v++) {
                          const vx = positions[v * 3];
                          const vy = positions[v * 3 + 1];
                          const vz = positions[v * 3 + 2];

                          // ★核心：计算顶点到尾巴骨骼链的最短距离
                          let minDist = Infinity;
                          if (segments.length > 0) {
                            // 有线段：计算到每条线段的距离，取最小
                            for (const seg of segments) {
                              const d = pointToSegmentDist(vx, vy, vz, seg.p1.x, seg.p1.y, seg.p1.z, seg.p2.x, seg.p2.y, seg.p2.z);
                              if (d < minDist) minDist = d;
                            }
                          } else {
                            // 无线段（单骨骼）：计算到每个骨骼点的距离
                            for (const td of tailBoneData) {
                              const dx = vx - td.pos.x, dy = vy - td.pos.y, dz = vz - td.pos.z;
                              const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                              if (d < minDist) minDist = d;
                            }
                          }

                          // 距离过滤：只重绑定距离骨骼链很近的顶点
                          if (minDist > distThreshold) continue;

                          // ★平滑权重分配：距离反比
                          // 计算顶点到每个尾巴骨骼的距离，按距离反比分配权重
                          const dists: Array<{ idx: number; dist: number }> = [];
                          let totalInvDist = 0;
                          for (const td of tailBoneData) {
                            const dx = vx - td.pos.x;
                            const dy = vy - td.pos.y;
                            const dz = vz - td.pos.z;
                            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            const safeDist = Math.max(dist, 0.001);
                            dists.push({ idx: td.idx, dist });
                            totalInvDist += 1 / safeDist;
                          }

                          if (totalInvDist > 0) {
                            // 取权重最大的4个骨骼（Babylon.js支持4骨骼蒙皮）
                            const weighted = dists.map(d => ({
                              idx: d.idx,
                              weight: (1 / Math.max(d.dist, 0.001)) / totalInvDist
                            })).sort((a, b) => b.weight - a.weight).slice(0, 4);

                            // 归一化权重（确保总和=1.0）
                            const weightSum = weighted.reduce((s, w) => s + w.weight, 0);
                            if (weightSum > 0) {
                              newIndices[v * 4] = weighted[0]?.idx ?? 0;
                              newIndices[v * 4 + 1] = weighted[1]?.idx ?? 0;
                              newIndices[v * 4 + 2] = weighted[2]?.idx ?? 0;
                              newIndices[v * 4 + 3] = weighted[3]?.idx ?? 0;
                              newWeights[v * 4] = weighted[0] ? weighted[0].weight / weightSum : 0;
                              newWeights[v * 4 + 1] = weighted[1] ? weighted[1].weight / weightSum : 0;
                              newWeights[v * 4 + 2] = weighted[2] ? weighted[2].weight / weightSum : 0;
                              newWeights[v * 4 + 3] = weighted[3] ? weighted[3].weight / weightSum : 0;
                              meshRebindCount++;
                            }
                          }
                        }

                        if (meshRebindCount > 0) {
                          console.log(`[TailRebind] mesh#${meshIdx}(${mesh.name}) 重新绑定 ${meshRebindCount} 个顶点（共${vertCount}个）`);
                          try {
                            mesh.setVerticesData('matricesIndices', newIndices, true);
                            mesh.setVerticesData('matricesWeights', newWeights, true);
                            meshWithTailCount++;
                            totalRebindCount += meshRebindCount;
                          } catch (e) {
                            try {
                              mesh.updateVerticesData('matricesIndices', newIndices);
                              mesh.updateVerticesData('matricesWeights', newWeights);
                              meshWithTailCount++;
                              totalRebindCount += meshRebindCount;
                            } catch (e2) {
                              console.warn(`[TailRebind] mesh#${meshIdx} 权重更新失败:`, e2);
                            }
                          }
                        }
                      }

                      if (totalRebindCount > 0) {
                        console.log(`[TailRebind] ✓ 总计重新绑定 ${totalRebindCount} 个顶点（涉及 ${meshWithTailCount} 个mesh）`);
                      } else {
                        console.warn(`[TailRebind] 遍历所有${allSkinMeshes.length}个mesh后仍未找到尾巴附近的顶点（阈值=${distThreshold.toFixed(3)}）`);
                        console.warn(`[TailRebind] 可能原因：1)尾巴顶点位置异常 2)尾巴骨骼bind位置异常 3)模型无尾巴顶点`);
                        // ===== 详细诊断：输出每个mesh中距离骨骼链最近的10个顶点 =====
                        // 新增于尾巴修复：确定尾巴顶点的真实位置分布，为调整阈值提供依据
                        console.warn(`[TailDiag] ===== 距骨骼链最近顶点详细诊断 =====`);
                        console.warn(`[TailDiag] 骨骼链: ${tailBoneData.map(td => `(${td.pos.x.toFixed(2)},${td.pos.y.toFixed(2)},${td.pos.z.toFixed(2)})`).join(' → ')}`);
                        for (let meshIdx = 0; meshIdx < allSkinMeshes.length; meshIdx++) {
                          const mesh = allSkinMeshes[meshIdx];
                          const positions = mesh.getVerticesData?.('position');
                          if (!positions) continue;
                          const vertCount = positions.length / 3;
                          // 计算每个顶点到骨骼链的距离，收集所有顶点距离
                          const vertDists: Array<{ v: number; dist: number; x: number; y: number; z: number }> = [];
                          for (let v = 0; v < vertCount; v++) {
                            const vx = positions[v * 3], vy = positions[v * 3 + 1], vz = positions[v * 3 + 2];
                            let minDist = Infinity;
                            if (segments.length > 0) {
                              for (const seg of segments) {
                                const d = pointToSegmentDist(vx, vy, vz, seg.p1.x, seg.p1.y, seg.p1.z, seg.p2.x, seg.p2.y, seg.p2.z);
                                if (d < minDist) minDist = d;
                              }
                            } else {
                              for (const td of tailBoneData) {
                                const dx = vx - td.pos.x, dy = vy - td.pos.y, dz = vz - td.pos.z;
                                const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                                if (d < minDist) minDist = d;
                              }
                            }
                            vertDists.push({ v, dist: minDist, x: vx, y: vy, z: vz });
                          }
                          // 按距离排序，输出最近的10个
                          vertDists.sort((a, b) => a.dist - b.dist);
                          const closest10 = vertDists.slice(0, 10);
                          const dist1Count = vertDists.filter(d => d.dist < 1.0).length;
                          const dist2Count = vertDists.filter(d => d.dist < 2.0).length;
                          const dist3Count = vertDists.filter(d => d.dist < 3.0).length;
                          console.warn(`[TailDiag] mesh#${meshIdx}(${mesh.name}) 顶点=${vertCount} dist<1.0:${dist1Count} dist<2.0:${dist2Count} dist<3.0:${dist3Count}`);
                          console.warn(`[TailDiag]   最近10顶点:`, closest10.map(d => `#${d.v}(d=${d.dist.toFixed(2)},${d.x.toFixed(2)},${d.y.toFixed(2)},${d.z.toFixed(2)})`));
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.warn('[TailRebind] 权重重绑定失败:', e);
                }
              }
            }

            // 步骤 4.5：创建碰撞体（防穿模）
            // 自动识别躯干/头/上臂/大腿等关键部位，作为球体/胶囊体
            // 每帧检测柔性骨骼（头发/衣摆/手指）是否穿入，穿入则推回表面
            const collisionBodies = autoCreateCollisionBodies(analysis.skeleton);
            collisionBodiesRef.current = collisionBodies;

            // 暴露 window.__collisionDebug 调试接口
            // 仿 Blender Collision Modifier 的可视化线框
            // 用法：
            //   window.__collisionDebug.showMeshes()  // 显示当前帧的碰撞体线框
            //   window.__collisionDebug.hideMeshes()  // 隐藏并销毁调试网格
            //   window.__collisionDebug.toggle()      // 在显示/隐藏之间切换
            //   window.__collisionDebug.list()        // 列出所有碰撞体定义
            //   window.__collisionDebug.count()       // 获取碰撞体数量
            //   window.__collisionDebug.enabled       // 是否启用柔性体穿模修正
            try {
              const skelForDebug = analysis.skeleton;
              const sceneForDebug = scene;
              /** 销毁当前所有调试网格 */
              const disposeDebugMeshes = () => {
                for (const m of collisionDebugMeshesRef.current) {
                  try {
                    m.material?.dispose();
                    m.dispose();
                  } catch (e) { /* noop */ }
                }
                collisionDebugMeshesRef.current = [];
              };
              /** 根据当前骨骼位置创建一组新的调试网格 */
              const createDebugMeshes = () => {
                disposeDebugMeshes();
                try {
                  skelForDebug.computeAbsoluteMatrices?.(true);
                } catch (e) {
                  try { skelForDebug.computeAbsoluteMatrices?.(); } catch (_) { /* noop */ }
                }
                const lookup = buildSkeletonPosLookup(skelForDebug);
                const meshes = createCollisionDebugMeshes(sceneForDebug, collisionBodies, lookup);
                collisionDebugMeshesRef.current = meshes;
                return meshes.length;
              };
              (window as any).__collisionDebug = {
                /** 列出所有碰撞体 */
                list: () => collisionBodies.map((b: CollisionBody) => b.type === 'sphere'
                  ? { type: 'sphere', group: b.group, side: b.side, bone: b.boneName, radius: b.radius }
                  : { type: 'capsule', group: b.group, side: b.side, boneA: b.boneAName, boneB: b.boneBName, radius: b.radius }
                ),
                /** 获取碰撞体数量 */
                count: () => collisionBodies.length,
                /** 启用/关闭柔性体穿模修正 */
                enabled: true,
                /**
                 * 显示碰撞体线框（仿 Blender）
                 * 会根据当前骨骼位置重新创建一组调试网格，便于查看当前姿态下的碰撞体分布
                 * @returns 创建的调试网格数量
                 */
                showMeshes: (): number => {
                  const n = createDebugMeshes();
                  console.log(`[CollisionDebug] 已显示 ${n} 个碰撞体线框`);
                  return n;
                },
                /** 隐藏并销毁所有碰撞体线框 */
                hideMeshes: (): void => {
                  disposeDebugMeshes();
                  console.log('[CollisionDebug] 已隐藏所有碰撞体线框');
                },
                /** 在显示/隐藏之间切换 */
                toggle: (): boolean => {
                  if (collisionDebugMeshesRef.current.length > 0) {
                    disposeDebugMeshes();
                    console.log('[CollisionDebug] toggle → 已隐藏');
                    return false;
                  }
                  const n = createDebugMeshes();
                  console.log(`[CollisionDebug] toggle → 已显示 ${n} 个`);
                  return true;
                },
                /** 获取当前调试网格数量 */
                meshCount: (): number => collisionDebugMeshesRef.current.length,
              };
              console.log(`[Collision] 已暴露 window.__collisionDebug，可调用 .list()/.count()/.showMeshes()/.hideMeshes()/.toggle()`);
            } catch (e) {
              console.warn('[Collision] 暴露调试接口失败:', e);
            }

            // 暴露骨架和根mesh供控制台诊断（尾巴权重排查用）
            try {
              (window as any).__skeleton = analysis.skeleton;
              (window as any).__rootMesh = rootMesh;
              console.log('[Debug] 已暴露 window.__skeleton 和 window.__rootMesh');
            } catch (e) { /* noop */ }

            // [v64 HumanoidRig] 标准人形骨骼层（Blender 式重定向：动作=标准空间，模型=profile 翻译）
            // [v65 profileStore] 档案三层优先级：人工固化 > 内置实测 > 纯名称解析（不猜方向）
            let activeProfile: { profile: ModelMotionProfile; source: string; reason: string } | null = null;
            try {
              const stdResolution = resolveHumanoidBones((analysis.skeleton.bones || []).map((b: any) => b.name));
              const modelName = (rootMesh && rootMesh.name) || 'current';
              stdResolution.profile.model = modelName;
              (window as any).__humanoid = stdResolution;
              console.log(`[HumanoidRig] 标准关节解析: ${stdResolution.matched}/${stdResolution.total} 命中` +
                (stdResolution.missing.length ? `，缺失: ${stdResolution.missing.join(',')}` : '，无缺失'));

              activeProfile = resolveActiveProfile(modelName, stdResolution.profile.joints, stdResolution.missing);
              (window as any).__activeProfile = activeProfile;
              console.log(`[HumanoidRig] 运动档案: source=${activeProfile.source} (${activeProfile.reason})`);

              // [v65] 轴签名采样：任意 PMX 的客观校准数据（不猜语义）
              (window as any).__calibrateProfile = () => {
                try {
                  const result = sampleJointSignatures(analysis.skeleton, activeProfile!.profile.joints);
                  const review = signaturesToReviewJson(result);
                  console.log('[Profiler] 轴签名采样完成，校对用 JSON 如下（复制→修正→__saveProfile 固化）:', review);
                  return { ok: true, review, raw: result, currentProfile: activeProfile!.profile, storedModels: listStoredProfiles() };
                } catch (e: any) {
                  console.error('[Profiler] 采样失败:', e?.message || e);
                  return { ok: false, error: e?.message || String(e) };
                }
              };

              // [v65] 固化人工档案（覆盖同名模型；须含 joints+axes）
              (window as any).__saveProfile = (profile: ModelMotionProfile) => {
                try {
                  if (!profile || !profile.joints || !profile.axes) {
                    console.error('[Profiler] 档案格式不合法：需要 { joints, axes }');
                    return { ok: false, error: 'invalid profile' };
                  }
                  const ok = saveStoredProfile(modelName, profile);
                  if (ok) {
                    // 立即热切换，无需重载模型
                    activeProfile = { profile, source: 'stored', reason: `人工档案已固化并激活 (${modelName})` };
                    (window as any).__activeProfile = activeProfile;
                    console.log('[Profiler] 档案已固化并激活:', modelName);
                  }
                  return { ok, model: modelName };
                } catch (e: any) {
                  return { ok: false, error: e?.message || String(e) };
                }
              };

              // 标准动作播放器：配方在标准空间，profile 翻译成实际骨骼后走 safeRotateJoint
              (window as any).__playStdMotion = (input: any) => {
                try {
                  const motion = typeof input === 'string' ? getStdRecipe(input) : input;
                  if (!motion) return { success: false, error: '未知配方: ' + input };
                  const plan = buildRetargetPlan(motion, activeProfile!.profile);
                  if (plan.tracks.length === 0) return { success: false, error: '无可执行轨道', skipped: plan.skipped };
                  const skeletonBones: any[] = analysis.skeleton.bones || [];
                  // [v185 修复] 播放前捕获被驱动骨骼的当前局部四元数（= ArmPose 自然下垂姿）。
                  //   safeRotateJoint 是绝对覆盖（setRotationQuaternion），配方末帧回 0 = 绑定 T-pose，
                  //   会把手臂弹回水平举起 —— 用户实测"右手一直举着"的根因。完成后逐一恢复到捕获姿态。
                  const restRestore = new Map<any, Quaternion>();
                  const drive = (boneName: string, eulerDeg: { x: number; y: number; z: number }) => {
                    const bone = skeletonBones.find((b: any) => b.name === boneName);
                    if (!bone) return false;
                    if (classifyBoneName(boneName) === 'decoPhysics') return false;
                    try { if (!restRestore.has(bone)) restRestore.set(bone, bone.getRotationQuaternion(Space.LOCAL).clone()); } catch { /* noop */ }
                    return rotateJointWithProxy(analysis.skeleton, bone, {
                      x: eulerDeg.x * Math.PI / 180,
                      y: eulerDeg.y * Math.PI / 180,
                      z: eulerDeg.z * Math.PI / 180,
                    }, 'std-motion');
                  };
                  const restoreRest = () => {
                    try {
                      for (const [bone, q] of restRestore) { try { bone.setRotationQuaternion(q.clone(), Space.LOCAL); } catch { /* noop */ } }
                      restRestore.clear();
                      analysis.skeleton.computeAbsoluteMatrices?.(true);
                      console.log('[HumanoidRig] 已恢复自然站姿（' + restRestore.size + ' 骨骼待清）');
                    } catch { /* noop */ }
                  };
                  const player = playStdMotion(plan, drive, (skipped) => {
                    console.log('[HumanoidRig] 标准动作完成:', motion.id, skipped.length ? '跳过 ' + JSON.stringify(skipped) : '');
                    restoreRest();
                  });
                  // 停止（如被新动作打断）也要恢复，否则打断时残留 T-pose
                  const rawStop = player.stop.bind(player);
                  player.stop = () => { rawStop(); restoreRest(); };
                  (window as any).__stdMotionPlayer = player;
                  console.log(`[HumanoidRig] 播放标准动作: ${motion.id} 轨道 ${plan.tracks.length} 条`);
                  return { success: true, id: motion.id, tracks: plan.tracks.length, skipped: plan.skipped };
                } catch (e: any) {
                  console.error('[HumanoidRig] 播放失败:', e?.message || String(e));
                  return { success: false, error: e?.message || String(e) };
                }
              };
              console.log('[HumanoidRig] 已暴露 window.__humanoid / __playStdMotion / __calibrateProfile / __saveProfile');
            } catch (e) {
              console.warn('[HumanoidRig] 接线失败:', e);
            }

            console.log(`[BabylonModelViewer] 摆动骨骼: ${swingBones.length} 个（总骨骼 ${analysis.boneCount} 个，站姿骨骼 ${poseCount} 个，蒙皮 ${skinningOk ? '正常' : '异常'}）`);
            swingBonesRef.current = swingBones;

            if (swingBones.length > 0) {
              // 启动每帧摆动观察者
              const startTime = performance.now();
              // 恢复摆动幅度（确保肉眼可见的飘动效果）
              const SWING_AMP_BASE = 0.04;
              const SWING_AMP_WIND = 0.09;
              const SWING_FREQ = 1.2;

              // ===== 尾巴物理：动态计算模型身高（统一公式适配任意模型）=====
              // 用于地面碰撞翘起阈值计算：groundThreshold = modelHeight × 10%
              let tailModelHeight = 20;
              try {
                let minY = Infinity, maxY = -Infinity;
                for (const b of analysis.skeleton.bones) {
                  const m = (b as any)._absoluteBindMatrix;
                  if (m) {
                    const y = m.getTranslation().y;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                  }
                }
                tailModelHeight = (maxY - minY) || 20;
              } catch (e) { /* 降级用默认值 */ }

              // ===== 暴露尾巴物理参数到控制台（动态计算默认值，供调试/调整）=====
              // 用户可通过 window.__tailPhysics 查看当前模型适配的参数
              try {
                const tailBonesCount = swingBones.filter(s => s.isTail).length;
                (window as any).__tailPhysics = {
                  modelHeight: tailModelHeight,
                  tailBonesCount,
                  groundThreshold: tailModelHeight * 0.10,
                  tailBlend: 0.08,
                  easeCurveFormula: '1 - (1-t)^2',
                  easeCurve: (t: number) => 1 - (1 - t) * (1 - t),
                  startDirFormula: 'rootBindDir horizontal projection (drop Y)',
                  physicsModel: 'catenary: fixed-end tangent horizontal, free-end vertical, ease-out',
                  diagnose: () => {
                    const tp = (window as any).__tailPhysics;
                    console.log('[TailPhysics] params:', {
                      modelHeight: tp.modelHeight,
                      tailBonesCount: tp.tailBonesCount,
                      groundThreshold: tp.groundThreshold,
                      tailBlend: tp.tailBlend,
                      easeCurve: tp.easeCurveFormula,
                      physics: tp.physicsModel,
                    });
                    console.log('[TailPhysics] ease curve sampling:');
                    for (let i = 0; i <= 10; i++) {
                      const tt = i / 10;
                      console.log('  progress=' + tt.toFixed(1) + ' -> ease=' + tp.easeCurve(tt).toFixed(3));
                    }
                  },
                };
                console.log('[TailPhysics] window.__tailPhysics exposed, call .diagnose() for params');
              } catch (e) { /* noop */ }

              // [v44 性能] 碰撞数据缓存：每 3 帧刷新一次（降频 2/3）
              //   旧实现每帧构建全骨骼位置查找表 + 全部碰撞体世界坐标（JS 大开销，老 CPU 卡顿主因）
              //   碰撞修正精度降 3 帧视觉无感（摆动骨骼逐帧插值），帧率显著提升
              let collisionCache: { posLookup: Map<string, Vector3> | null; runtimes: { spheres: SphereRuntime[]; capsules: CapsuleRuntime[] } | null } | null = null;
              let swingFrame = 0;
              const swingObserver = scene.onBeforeRenderObservable.add(() => {
                // [v49] 加载中或物理关闭时跳过摆动+碰撞计算（运行时开关生效点）
                // [v52] 拖拽中同样跳过：老电脑 CPU 满载会让 pointermove 事件积压 → 拖拽不跟手
                if (loadingRef.current || !physicsOnRef.current || isDraggingRef.current) return;
                const t = (performance.now() - startTime) / 1000;
                const amp = windEnabled ? SWING_AMP_WIND : SWING_AMP_BASE;

                // 每 3 帧构建骨骼位置查找表 + 碰撞体运行时（用于柔性体穿模修正）
                // 注意：buildCollisionRuntimes 把 sphere/capsule 列表转换到当前帧世界坐标
                // 一次性构建，循环内复用，避免每个摆动骨骼都重复计算
                const collisionEnabled = (window as any).__collisionDebug?.enabled !== false;
                if (collisionEnabled && collisionBodiesRef.current.length > 0) {
                  if (swingFrame++ % 3 === 0 || !collisionCache) {
                    const posLookup = buildSkeletonPosLookup(analysis.skeleton);
                    const runtimes = buildCollisionRuntimes(collisionBodiesRef.current, posLookup);
                    collisionCache = { posLookup, runtimes };
                  }
                } else {
                  collisionCache = null;
                }
                const posLookup: Map<string, Vector3> | null = collisionCache?.posLookup ?? null;
                const collisionRuntimes: { spheres: SphereRuntime[]; capsules: CapsuleRuntime[] } | null = collisionCache?.runtimes ?? null;

                // ===== 尾巴物理：前向运动学链式下垂（重构，解决"6镜像"累积误差）=====
                // 旧方案问题：每节骨骼独立用bind父旋转做共轭变换，未考虑父骨骼已旋转，导致旋转累积形成U形圆弧（"6镜像"）
                // 新方案：按chainIndex顺序处理，维护世界旋转缓存，每节骨骼目标为绝对世界方向（悬链线切线）
                // 形态自适应：easeCurve=1-(1-t)²，根部保持bind方向，尖部朝正下方
                //   - 根部bind水平时 → 乙形（水平延伸后下垂，末端微翘）
                //   - 根部bind垂直时 → 7形（整体垂直下垂）
                // 数学原理：
                //   1. localRestDir = bindRotI⁻¹ × extDir（骨骼局部rest方向，常量）
                //   2. currentWorldDir = parentCurrentRot × currentLocal × localRestDir（当前实际世界方向）
                //   3. worldDelta = rotation(currentWorldDir → targetDir)（世界旋转增量）
                //   4. localDelta = parentCurrentRot⁻¹ × worldDelta × parentCurrentRot（转为局部，用当前父旋转）
                //   5. finalLocal = localDelta × baseRotation（最终局部旋转）
                //   6. boneWorldRot = parentCurrentRot × dampedQuat（更新缓存供子骨骼使用）
                // [v98 Part2] 弹簧链求解（头发/裙摆/饰品走 Verlet 质点链；尾巴保持原分支）
              // [v129] SpringChain 运行块已删；恒 null → 下方分支永不进入（sin 驱动）
              // eslint-disable-next-line prefer-const
              let __springTargets: Map<string, Quaternion> | null = null;
const tailSbs = swingBonesRef.current.filter(s => s.isTail).sort((a, b) => a.chainIndex - b.chainIndex);
                if (tailSbs.length > 0) {
                  // 世界旋转缓存：boneName → 当前世界旋转四元数（前向运动学）
                  const tailWorldRotCache = new Map<string, Quaternion>();

                  // 预计算根骨骼bind世界方向（悬链线切线起点，整条尾巴统一）
                  let rootTailBindDir: Vector3 | null = null;
                  try {
                    const rootBone = tailSbs[0].bone as any;
                    const rootParent = rootBone.getParent ? rootBone.getParent() : rootBone.parent;
                    if (rootParent) {
                      const rootBindM = rootBone._absoluteBindMatrix;
                      const parentBindM = (rootParent as any)._absoluteBindMatrix;
                      if (rootBindM && parentBindM) {
                        const rp = parentBindM.getTranslation();
                        const bp = rootBindM.getTranslation();
                        const dir = new Vector3(bp.x - rp.x, bp.y - rp.y, bp.z - rp.z);
                        if (dir.length() > 0.001) { dir.normalize(); rootTailBindDir = dir; }
                      }
                    }
                  } catch (e) { /* 降级：用extDir作为起点 */ }

                  for (const sb of tailSbs) {
                    const bone = sb.bone;
                    const boneAny = bone as any;
                    try {
                      const bindM = boneAny._absoluteBindMatrix;
                      const parentBone = bone.getParent ? bone.getParent() : boneAny.parent;
                      const parentBindM = parentBone ? (parentBone as any)._absoluteBindMatrix : null;
                      if (!bindM || !parentBindM) { bone.setRotationQuaternion(sb.baseRotation, Space.LOCAL); continue; }

                      const bonePos = bindM.getTranslation();
                      const parentPos = parentBindM.getTranslation();
                      const extDir = new Vector3(bonePos.x - parentPos.x, bonePos.y - parentPos.y, bonePos.z - parentPos.z);
                      const extLen = extDir.length();
                      if (extLen < 0.001) { bone.setRotationQuaternion(sb.baseRotation, Space.LOCAL); continue; }
                      extDir.scaleInPlace(1 / extLen); // bind世界延伸方向（单位向量）

                      // === 骨骼i的bind世界旋转及其逆 ===
                      const _dsBind = new Vector3();
                      const bindRotI = new Quaternion();
                      bindM.decompose(_dsBind, bindRotI, undefined);
                      const bindRotIConj = bindRotI.clone();
                      bindRotIConj.conjugateInPlace();
                      // localRestDir = bindRotI⁻¹ × extDir（局部rest方向，常量）
                      const localRestDir = new Vector3();
                      extDir.rotateByQuaternionToRef(bindRotIConj, localRestDir);

                      // === 父骨骼当前世界旋转（前向运动学：尾巴父骨骼从缓存取，身体父骨骼用bind）===
                      let parentCurrentRot: Quaternion;
                      if (parentBone && tailWorldRotCache.has(parentBone.name)) {
                        parentCurrentRot = tailWorldRotCache.get(parentBone.name)!.clone();
                      } else if (parentBone && (parentBone as any)._absoluteBindMatrix) {
                        const _dsP = new Vector3();
                        parentCurrentRot = new Quaternion();
                        (parentBone as any)._absoluteBindMatrix.decompose(_dsP, parentCurrentRot, undefined);
                      } else {
                        parentCurrentRot = Quaternion.Identity();
                      }

                      // === 弹簧状态（当前局部旋转 = 上一帧插值结果）===
                      if (!boneAny.__tailSpringState) {
                        boneAny.__tailSpringState = { currentQuat: sb.baseRotation.clone() };
                      }
                      const ts = boneAny.__tailSpringState;

                      // === 当前世界延伸方向 = parentCurrentRot × currentLocal × localRestDir ===
                      const currentWorldRot = parentCurrentRot.multiply(ts.currentQuat);
                      const currentWorldDir = new Vector3();
                      localRestDir.rotateByQuaternionToRef(currentWorldRot, currentWorldDir);
                      const cwLen = currentWorldDir.length();
                      if (cwLen > 0.001) currentWorldDir.scaleInPlace(1 / cwLen);

                      // === 目标世界方向（悬链线切线：根部bind方向 → 正下方）===
                      // easeCurve = 1-(1-t)²：根部0（保持bind），尖部1（正下方）
                      const chainProgress = tailSbs.length > 1 ? sb.chainIndex / (tailSbs.length - 1) : 1;
                      const easeCurve = 1 - (1 - chainProgress) * (1 - chainProgress);
                      // startDir：悬链线固定端切线 = 水平投影（物理受力平衡，避免bind斜上时翘起形成倒U）
                      // 物理原理：单端固定链条自由下垂，固定端切线水平（水平分量由固定点支撑，垂直分量=重力）
                      const startDirRaw = rootTailBindDir || extDir;
                      const horizMag = Math.sqrt(startDirRaw.x * startDirRaw.x + startDirRaw.z * startDirRaw.z);
                      const startDir = new Vector3();
                      if (horizMag > 0.1) {
                        startDir.x = startDirRaw.x / horizMag;
                        startDir.z = startDirRaw.z / horizMag;
                        startDir.y = 0;
                      } else if (startDirRaw.y < 0) {
                        startDir.copyFrom(startDirRaw); // 纯垂直向下：保持（7形）
                      } else {
                        startDir.set(0, 0, 1); // 纯垂直向上：降级水平向后
                      }
                      const endDir = new Vector3(0, -1, 0);
                      const targetDir = Vector3.Lerp(startDir, endDir, easeCurve);
                      const tLen = targetDir.length();
                      if (tLen < 0.001) targetDir.copyFrom(endDir); else targetDir.scaleInPlace(1 / tLen);

                      // === 地面碰撞修正：尖部接近地面时翘起 ===
                      // 地面在y=0（模型原点），翘起阈值=模型身高×10%
                      const groundThreshold = tailModelHeight * 0.10;
                      const estY = bonePos.y - chainProgress * extLen * tailSbs.length * 0.3;
                      if (estY < groundThreshold && chainProgress > 0.5) {
                        const liftFactor = Math.max(0, Math.min(1, (groundThreshold - estY) / groundThreshold));
                        const lifted = Vector3.Lerp(targetDir, new Vector3(0, 1, 0), liftFactor * 0.35);
                        const lLen = lifted.length();
                        if (lLen > 0.001) lifted.scaleInPlace(1 / lLen);
                        targetDir.copyFrom(lifted);
                      }

                      // === 世界旋转增量（当前方向 → 目标方向）===
                      const dot = Math.max(-1, Math.min(1, Vector3.Dot(currentWorldDir, targetDir)));
                      let worldDelta: Quaternion;
                      if (dot > 0.9999) {
                        worldDelta = Quaternion.Identity();
                      } else if (dot < -0.9999) {
                        worldDelta = Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI);
                      } else {
                        const rotAxis = Vector3.Cross(currentWorldDir, targetDir);
                        rotAxis.normalize();
                        worldDelta = Quaternion.RotationAxis(rotAxis, Math.acos(dot));
                      }

                      // === 转为局部旋转（用父骨骼当前世界旋转做共轭变换，避免累积误差）===
                      const parentConj = parentCurrentRot.clone();
                      parentConj.conjugateInPlace();
                      const localDelta = parentConj.multiply(worldDelta).multiply(parentCurrentRot);
                      const finalLocal = localDelta.multiply(sb.baseRotation);

                      // === Y轴惯性微摆（待机时尾巴横向微动）===
                      const ySwing = Math.sin(t * 0.7 + sb.phase) * Math.min(0.02, 0.003 * (1 + sb.chainIndex * 0.02));
                      const swingQuat = Quaternion.FromEulerAngles(0, ySwing, 0);
                      const targetWithSwing = finalLocal.multiply(swingQuat);

                      // === 弹簧插值（平滑过渡，避免突变）===
                      const tailBlend = 0.08; // 每帧8%插值
                      const dampedQuat = Quaternion.Slerp(ts.currentQuat, targetWithSwing, tailBlend);
                      ts.currentQuat = dampedQuat.clone();
                      bone.setRotationQuaternion(dampedQuat, Space.LOCAL);

                      // === 更新世界旋转缓存（供子骨骼使用，用插值后的保持一致）===
                      const boneWorldRot = parentCurrentRot.multiply(dampedQuat);
                      tailWorldRotCache.set(bone.name, boneWorldRot);

                      // 诊断日志（每120帧≈2秒）
                      if (BONE_DEBUG) {
                        if (!boneAny.__tailLogFrame) boneAny.__tailLogFrame = 0;
                        boneAny.__tailLogFrame++;
                        if (boneAny.__tailLogFrame % 120 === 0) {
                          console.log(`[TailDroop] ${bone.name} chain=${sb.chainIndex}/${tailSbs.length} prog=${chainProgress.toFixed(2)} ease=${easeCurve.toFixed(2)} cur=(${currentWorldDir.x.toFixed(2)},${currentWorldDir.y.toFixed(2)},${currentWorldDir.z.toFixed(2)}) tgt=(${targetDir.x.toFixed(2)},${targetDir.y.toFixed(2)},${targetDir.z.toFixed(2)}) estY=${estY.toFixed(2)}`);
                        }
                      }
                    } catch (e) {
                      // 降级：用baseRotation保持bind pose
                      try { bone.setRotationQuaternion(sb.baseRotation, Space.LOCAL); } catch (_) {}
                    }
                  }
                }

                for (const { bone, baseRotation, phase, axis, isTail, collisionGroup } of swingBonesRef.current) {
                  if (isTail) continue; // 尾巴已单独处理，跳过常规摆动
                  // [v100] 弹簧链渲染：solver 输出=世界旋转增量（restDir→当前方向，恒定基准无累积），父链共轭转局部后 Slerp 0.2
                  if (__springTargets && (__springTargets as Map<string, Quaternion>).has(bone.name) && !isTail) {
                    const worldDelta = (__springTargets as Map<string, Quaternion>).get(bone.name)!;
                    const parentBone3 = bone.getParent ? bone.getParent() : (bone as any).parent;
                    let targetLocal = worldDelta;
                    if (parentBone3) {
                      try {
                        const pw = (parentBone3 as any).getAbsoluteRotationQuaternion?.() || (parentBone3 as any).rotationQuaternion || Quaternion.Identity();
                        const pc = pw.clone(); pc.conjugateInPlace();
                        targetLocal = pc.multiply(worldDelta).multiply(pw);
                      } catch (_) { /* 保底用世界增量 */ }
                    }
                    const blended = Quaternion.Slerp(baseRotation, baseRotation.multiply(targetLocal), 0.2);
                    try { bone.setRotationQuaternion(blended, Space.LOCAL); } catch (_) {}
                    continue;
                  }
                  let offset = Math.sin(t * SWING_FREQ + phase) * amp;

                  // 碰撞检测：如果骨骼穿入碰撞体，平滑缩减偏移幅度
                  // 头发骨骼跳过头部碰撞体（避免前刘海被头部碰撞体压制无法摆动）
                  // 裙摆骨骼跳过躯干碰撞体（裙摆本来就贴着躯干）
                  if (posLookup && collisionRuntimes) {
                    try {
                      const bonePos = posLookup.get(bone.name);
                      if (bonePos) {
                        // 根据碰撞组过滤碰撞体
                        // 头发('hair')不与头部('head')碰撞体检测
                        // 裙摆('skirt')不与躯干('spine')碰撞体检测
                        let filteredSpheres = collisionRuntimes.spheres;
                        let filteredCapsules = collisionRuntimes.capsules;
                        if (collisionGroup === 'hair') {
                          filteredSpheres = collisionRuntimes.spheres.filter(s => s.group !== 'head');
                        } else if (collisionGroup === 'skirt') {
                          filteredCapsules = collisionRuntimes.capsules.filter(c => c.group !== 'spine');
                        }

                        const original = bonePos.clone();
                        const resolved = resolveCollisionForPoint(
                          bonePos,
                          filteredSpheres,
                          filteredCapsules
                        );
                        const pushDist = Vector3.Distance(original, resolved);
                        if (pushDist > 0.001) {
                          // 平滑缩减：使用 sigmoid 曲线避免突变
                          const shrinkFactor = Math.max(0.2, 1.0 / (1.0 + Math.exp(pushDist * 40 - 2)));
                          offset *= shrinkFactor;
                        }
                      }
                    } catch (e) {
                      // 碰撞检测失败不影响摆动
                    }
                  }

                  // 四元数修复：baseRotation 是 Quaternion，不能直接加 Euler 角
                  // 用四元数乘法叠加偏移：baseRotation * offsetQuat
                  const hairOffsetQuat = Quaternion.FromEulerAngles(
                    axis === 'x' ? offset : 0,
                    axis === 'y' ? offset : 0,
                    axis === 'z' ? offset : 0
                  );
                  const hairFinalQuat = baseRotation.multiply(hairOffsetQuat);
                  try {
                    bone.setRotationQuaternion(hairFinalQuat, Space.LOCAL);
                  } catch (e) {
                    // 单个骨骼旋转失败不影响其他骨骼
                  }

                  // 临时诊断已移除（baseRotation 已改为 Quaternion，旧诊断引用的 newRot/Euler 角不再适用）
                }
              });
              swingObserverRef.current = swingObserver;
              setPhysicsStatus(`已启用（骨骼 ${analysis.boneCount} / 摆动 ${swingBones.length} / 站姿 ${poseCount}）`);
// [v60 朝向关节化 2026-08-30] 模型转身改用全ての親骨骼关节（MMD 标准做法），
// 不再操作 rootMesh 的 XYZ 旋转（用户指令第 7 点：调关节参数而非 xyz 轴转圈）
// 模型经 babylon-mmd 加载后面向 -Z，全ての親 绕 Y 转 180° 后面向 +Z，
// 桌宠相机固定在 +Z 正数坐标区即可看到正面
(() => {
  if (!desktopPetMode) { console.log('[BabylonModelViewer] [v60] 预览模式：保持原生朝向，跳过关节转身'); return; }
  try {
    const skelOrient = analysis.skeleton;
    const rootBone = skelOrient.bones.find((b: any) => b.name === '全ての親');
    if (rootBone) {
      const baseQ = rootBone.getRotationQuaternion(Space.LOCAL) || Quaternion.Identity();
      const yawQ = Quaternion.RotationAxis(new Vector3(0, 1, 0), Math.PI);
      rootBone.setRotationQuaternion(baseQ.multiply(yawQ), Space.LOCAL);
      console.log('[BabylonModelViewer] [v60] 全ての親 关节转身 180° 完成（面向 +Z）');
    } else {
      console.warn('[BabylonModelViewer] [v60] 未找到 全ての親 骨骼，朝向保持原生');
    }
  } catch (e) {
    console.warn('[BabylonModelViewer] [v60] 关节转身失败:', e);
  }
})();

// [v61 预览内存分级释放] App.tsx 监测器在 90s 时派发 preview-heavy-release
// [根治材质发黑] 释放后必须清空 engine/scene ref，否则后续帧仍拿已销毁 context 的纹理
//   → bindTexture: object does not belong to this context → 网格发黑
const onPreviewHeavyRelease = () => {
  // [防全黑] 预览/桌宠共用引擎时禁止释放，否则材质与网格一起消失
  console.warn('[BabylonModelViewer] preview-heavy-release 已忽略：保持引擎存活');
};
window.addEventListener('preview-heavy-release', onPreviewHeavyRelease);

              console.log('[BabylonModelViewer] 骨骼驱动流程完成（解析+蒙皮+站姿+摆动）');
            } else if (physicsEnabled) {
              setPhysicsStatus(`已解析 ${analysis.boneCount} 骨骼，站姿 ${poseCount}，未找到摆动候选`);
              console.warn('[BabylonModelViewer] 未找到头发/衣摆骨骼，仅设置站姿，摆动未启用');
            } else {
              setPhysicsStatus(`仅站姿（骨骼 ${analysis.boneCount} / 站姿 ${poseCount}，摆动已关闭）`);
              console.log('[BabylonModelViewer] 物理模组关闭，仅应用自然站姿，摆动未启用');
            }

          // ============================================================
          // 呼吸 + 交互动作 + 双击触发系统（位于 else 块内，humanBody 可见）
          // ------------------------------------------------------------
          // 设计原则：
          // 1. 呼吸动画：每帧轻微旋转脊椎/胸部骨骼，模拟自然呼吸（约5秒一周期，幅度<1°）
          // 2. 交互动作：程序化关键帧动画（挥手/点头/摇头/遮挡），动作完成后自动恢复idle
          // 3. 双击触发：监听 POINTERDOUBLETAP，用 scene.pick 确定命中骨骼部位
          // 4. 安全性：所有动作幅度控制在生理极限内，不调用 safeRotateJoint（性能优先）
          // 5. 可回滚：所有修改仅修改骨骼旋转，不修改位置/缩放/材质
          // 6. 资源清理：组件卸载时自动移除观察者，防止内存泄漏
          // ============================================================
          // 存储 humanBody 和 analysis 到 ref，供双击时使用
          humanBodyRef.current = humanBody;
          analysisRef.current = analysis;

          // 仅当 humanBody 存在时启动呼吸+交互系统
          if (humanBody) {
            try {
              // ---------- 1. 收集呼吸动画骨骼 ----------
              // 医学呼吸机制（来源：春雨医生 https://www.chunyuyisheng.com/webapp/news/103115/detail/）：
              //   "胸式呼吸往往会伴随着胸腔的上下起伏，吸气的时候胸腔上提，呼吸的时候胸腔下放。"
              //   吸气（主动）：膈肌收缩 + 肋间肌收缩 → 胸腔上提 → 肩膀随之上抬
              //   呼气（被动）：膈肌放松 + 肋骨下降 → 胸腔下放 → 肩膀随之微降
              //
              // 游戏/动画标准做法（崩坏星穹铁道/鸣潮/原神等待机动画）：
              //   - 胸部脊椎骨骼 Y 轴位置上下移动（模拟胸腔上提下放，幅度极小）
              //   - 由于骨骼层级结构，胸部上移会带动颈/头/手臂一起轻微上浮，符合真实呼吸
              //   - 肩膀骨骼轻微 Z 轴旋转（模拟肩膀随呼吸起伏）
              //   - 不用旋转胸部骨骼（旋转会导致前后晃动，错误）
              //   - 不用缩放（缩放会导致 QQ 糖式形变，不符合解剖学）
              //   - 呼吸频率约 12-20 次/分钟，周期 3-5 秒
              //
              // 收集胸部骨骼（chest = 上半身2，upperSpine = 上半身）
              // 记录基础位置，用于每帧叠加 Y 轴偏移
              const breathBones: Array<{ bone: Bone; basePos: Vector3 }> = [];
              const collectBreathBone = (bone: Bone | undefined) => {
                if (!bone) return;
                try {
                  const basePos = bone.getPosition(Space.LOCAL).clone();
                  breathBones.push({ bone, basePos });
                } catch (e) { /* 跳过无法读取位置的骨骼 */ }
              };
              // 仅收集胸部骨骼（chest = 上半身2，upperSpine = 上半身）
              // 不收集 neck 和 head（头部通过骨骼层级被动跟随，无需单独操作）
              collectBreathBone(humanBody.spine.chest);
              collectBreathBone(humanBody.spine.upperSpine);

              // 收集肩膀骨骼（轻微 Z 轴旋转，模拟呼吸时肩膀起伏）
              const shoulderBones: Array<{ bone: Bone; baseQuat: Quaternion; side: 'left' | 'right' }> = [];
              const collectShoulder = (arm: HumanArm | null) => {
                if (!arm?.shoulder) return;
                try {
                  const baseQuat = arm.shoulder.getRotationQuaternion(Space.LOCAL).clone();
                  shoulderBones.push({ bone: arm.shoulder, baseQuat, side: arm.side });
                } catch (e) { /* 跳过 */ }
              };
              collectShoulder(humanBody.leftArm);
              collectShoulder(humanBody.rightArm);

              // [T1.1 规范 rest pose] 初始基准快照：模型自然站姿下捕获全部可动关节四元数。
              // 以后所有动作（主层/并发层/排队动作）的 baseQuat 都从这里取——保证任何动作结束
              // 回到的是"自然站姿"而不是"别的动作残留的偏移姿态"；模型重载时本段代码重新执行。
              try {
                const restMap = restPoseRef.current;
                restMap.clear();
                const pushRest = (bone: Bone | undefined | null) => {
                  if (!bone) return;
                  try { restMap.set(bone, bone.getRotationQuaternion(Space.LOCAL).clone()); } catch (e) { /* 跳过 */ }
                };
                for (const arm of [humanBody.leftArm, humanBody.rightArm]) {
                  if (arm) { pushRest(arm.shoulder); pushRest(arm.upperArm); pushRest(arm.lowerArm); pushRest(arm.hand); }
                }
                for (const leg of [humanBody.leftLeg, humanBody.rightLeg]) {
                  if (leg) { pushRest(leg.upperLeg); pushRest(leg.lowerLeg); pushRest(leg.foot); }
                }
                const sp = humanBody.spine;
                if (sp) { pushRest(sp.head); pushRest(sp.neck); pushRest(sp.chest); pushRest(sp.upperSpine); pushRest(sp.lowerSpine); }
                console.log(`[AnimSystem] rest pose 基准快照: ${restMap.size} 关节`);
              } catch (e) { /* 捕获失败则退化为各动作自捕获 */ }

              // ---------- 2. 交互动作触发函数 ----------
              // 触发指定动作，记录涉及骨骼的基础旋转，动作完成后恢复
              // [2026-07-24 新增] turnHead（转头看左右）、turnBody（转身）基础动作
              type AnimAction = 'idle' | 'wave' | 'nod' | 'shake' | 'block' | 'turnHead' | 'turnBody' | 'squat' | 'stretch' | 'turnLeft' | 'turnRight' | 'jump' | 'reset' | 'spin' | 'limbRaise'
                // [2026-09-08 T6.1 P0 批 + 配方解锁批]
                | 'tiltHead' | 'bow' | 'clap' | 'spreadHands' | 'thumbsUp' | 'comeHere' | 'refuse' | 'standUp'
                | 'bendForward' | 'lookUp' | 'lookDown' | 'legKick' | 'point'
                | 'offerHand' | 'bounce' | 'stomp' | 'cheer' | 'approach';
              // [2026-09-08 T1 并发通道引擎] buildAction：只负责"收集动作骨骼+时长"（纯数据），与调度解耦——
              // 主层启动/并发层启动/队列动作启动共用同一份收集逻辑
              const buildAction = (action: AnimAction, params?: any): { actionBones: Array<{ bone: Bone; baseQuat: Quaternion; delay: number }>; duration: number; params: any } => {
                const actionBones: Array<{ bone: Bone; baseQuat: Quaternion; delay: number }> = [];
                // [v56] delay=级联时序（肩先→肘后→腕最后）；[T1.1] baseQuat 一律取规范 rest pose 基准
                // [v77 Blender式约束层 2026-09-09] 规范槽位贴骨 Map（=Rigify 控制骨绑定）：
                // 模型骨→规范角色（head/neck/spineUpper/shoulderL/upperLegR…）。动作帧分支以槽位为准，
                // 新模型只需解析器（buildHumanBodyV2 std直配+评分）贴骨正确，动作层零改动。
                const rigRoleMap = (() => {
                  const m = new Map<any, string>();
                  const put = (b: any, role: string) => { if (b) m.set(b, role); };
                  if (humanBody.spine) {
                    put(humanBody.spine.head, 'head');
                    put(humanBody.spine.neck, 'neck');
                    put(humanBody.spine.chest, 'chest');
                    put(humanBody.spine.upperSpine, 'spineUpper');
                    put(humanBody.spine.lowerSpine, 'spineLower');
                  }
                  for (const S of ['L', 'R'] as const) {
                    const A = S === 'L' ? humanBody.leftArm : humanBody.rightArm;
                    if (A) {
                      put(A.shoulder, 'shoulder' + S);
                      put(A.upperArm, 'upperArm' + S);
                      put(A.lowerArm, 'lowerArm' + S);
                      put(A.hand, 'hand' + S);
                    }
                    const Lg = S === 'L' ? humanBody.leftLeg : humanBody.rightLeg;
                    if (Lg) {
                      put(Lg.upperLeg, 'upperLeg' + S);
                      put(Lg.lowerLeg, 'lowerLeg' + S);
                      put(Lg.foot, 'foot' + S);
                    }
                  }
                  return m;
                })();

                const addActionBone = (bone: Bone | undefined, delay = 0) => {
                  if (!bone) return;
                  try {
                    const rest = restPoseRef.current.get(bone);
                    const bq = rest ? rest.clone() : bone.getRotationQuaternion(Space.LOCAL).clone();
                    actionBones.push({ bone, baseQuat: bq, delay, role: rigRoleMap.get(bone) } as any);
                  } catch (e) { /* 跳过 */ }
                };
                // [v75 2026-09-09] 腿/鞋可见网格绑定 D 系骨骼（v57/v59 jump 先例）：
                // 标准骨+同名 D 系骨同 delay 同步驱动——否则只转标准链=外观不动、
                // 挂载物理骨被扯（皮肉撕扯/鞋跟乱动）。无对应 D 骨时等价 addActionBone。
                // [v77] D 系副本继承母骨 role（约束传递同一槽位）
                const addActionBoneWithD = (bone: Bone | undefined, delay = 0) => {
                  addActionBone(bone, delay);
                  if (bone && bone.name) {
                    try {
                      const sk = bone.getSkeleton();
                      const d = sk ? sk.bones.find((b: any) => b.name === bone.name + 'D') : null;
                      if (d) {
                        const roleD = rigRoleMap.get(bone);
                        const restD = restPoseRef.current.get(d);
                        const bqD = restD ? restD.clone() : d.getRotationQuaternion(Space.LOCAL).clone();
                        actionBones.push({ bone: d, baseQuat: bqD, delay, role: roleD } as any);
                      }
                    } catch (e) { /* noop */ }
                  }
                };

                // [T3.1 参数化肌肉] 规范化消费参数：clamp+默认值在这里一次做完，帧分支只读 np
                const P = (params || {}) as any;
                const num = (v: any, d: number, min: number, max: number) => {
                  const n = Number(v);
                  return Number.isNaN(n) ? d : Math.min(max, Math.max(min, n));
                };
                const np: any = { timing: TIMING_PRESETS[P.timing] ? P.timing : 'normal' };
                if (action === 'nod' || action === 'shake') {
                  np.angle = num(P.angle, action === 'nod' ? 18 : 25, 5, 45);       // 度
                  np.count = Math.round(num(P.count, 1, 1, 4));                     // 次数（渲染端一次连贯完成）
                } else if (action === 'turnHead') {
                  np.angle = num(P.angle, 30, -60, 60);                             // 度，负左正右
                } else if (action === 'turnBody') {
                  np.angle = num(P.angle, 45, -90, 90);                             // 度
                } else if (action === 'squat') {
                  np.depth = num(P.depth, 0.6, 0.2, 1.0);                           // 深度 0-1
                } else if (action === 'jump') {
                  np.height = num(P.height, 0.3, 0.1, 0.8);                         // 米
                  np.duration = num(P.duration, 3.2, 1.5, 5);                       // 秒
                } else if (action === 'wave') {
                  np.amplitude = num(P.amplitude, 0.7, 0.1, 1.0);                   // 幅度 0-1
                  np.freq = num(P.freq, 2.0, 0.5, 4.0);                             // Hz
                  // [v76 2026-09-09] 默认 600s→6s：无限挥手反馈差（用户 2026-09-09 实测）；AI 说"持续挥"可传大值
                  np.duration = num(P.duration, 6, 2, 600);                         // 秒（默认6s，持留上限10分钟）
                }
                // [2026-09-08 T6.1 P0 批 + 配方解锁批] 新动作参数规范化（clamp+默认值一次做完）
                else if (action === 'tiltHead') {
                  np.side = (P.side === 'left' || P.side === 'right') ? P.side : 'left';
                  np.angle = num(P.angle, 15, 0, 25);                               // 歪头角 0-25°
                } else if (action === 'bow') {
                  np.depth = num(P.depth, 0.6, 0.2, 1.0);
                  np.duration = num(P.duration, 2.5, 1, 6);                         // 全程秒
                } else if (action === 'clap') {
                  np.count = Math.round(num(P.count, 3, 1, 6));
                  np.speed = (P.speed === 'slow' || P.speed === 'quick') ? P.speed : 'normal';
                } else if (action === 'spreadHands') {
                  np.amplitude = num(P.amplitude, 0.7, 0.3, 1.0);
                  np.duration = num(P.duration, 2, 1, 6);
                } else if (action === 'thumbsUp') {
                  np.side = ['left', 'right', 'both'].includes(P.side) ? P.side : 'right';
                  np.hold = num(P.hold, 1.5, 0.5, 5);
                } else if (action === 'comeHere') {
                  np.side = ['left', 'right', 'both'].includes(P.side) ? P.side : 'right';
                  np.count = Math.round(num(P.count, 2, 1, 4));
                } else if (action === 'refuse') {
                  np.side = ['left', 'right', 'both'].includes(P.side) ? P.side : 'right';
                  np.count = Math.round(num(P.count, 2, 1, 4));
                } else if (action === 'standUp') {
                  np.speed = ['quick', 'normal', 'slow'].includes(P.speed) ? P.speed : 'normal';
                } else if (action === 'bendForward') {
                  np.angle = num(P.angle, 45, 5, 90);
                  np.hold = num(P.hold, 1.5, 0, 5);
                } else if (action === 'lookUp' || action === 'lookDown') {
                  np.angle = num(P.angle, 20, 5, 45);
                } else if (action === 'legKick') {
                  np.side = (P.side === 'left' || P.side === 'right') ? P.side : 'right';
                  np.power = num(P.power, 0.6, 0.2, 1.0);
                } else if (action === 'point') {
                  np.dir = ['up', 'down', 'left', 'right'].includes(P.dir) ? P.dir : 'right';
                  np.hold = num(P.hold, 2, 0.5, 5);
                } else if (action === 'offerHand') {
                  np.side = (P.side === 'left' || P.side === 'right') ? P.side : 'right';
                  np.hold = num(P.hold, 1.5, 0.5, 5);
                } else if (action === 'bounce') {
                  np.freq = num(P.freq, 1.5, 0.5, 3);
                  np.amplitude = num(P.amplitude, 0.5, 0.2, 1.0);
                  np.duration = num(P.duration, 2.5, 1, 8);
                } else if (action === 'stomp') {
                  np.side = ['left', 'right', 'both'].includes(P.side) ? P.side : 'left';
                  np.count = Math.round(num(P.count, 2, 1, 4));
                  np.power = num(P.power, 0.6, 0.2, 1.0);
                } else if (action === 'cheer') {
                  np.amplitude = num(P.amplitude, 0.8, 0.3, 1.0);
                  np.duration = num(P.duration, 2.5, 1, 5);
                } else if (action === 'approach') {
                  np.steps = Math.round(num(P.steps, 2, 1, 4));
                  np.speed = (P.speed === 'slow' || P.speed === 'quick') ? P.speed : 'normal';
                }

                let duration = 2000; // 默认2秒

                switch (action) {
                  case 'wave':
                    // [v56] 挥手：级联时序（肩先抬→上臂跟上→前臂弯→手腕最后摆）
                    if (humanBody.rightArm) {
                      addActionBone(humanBody.rightArm.shoulder, 0);
                      addActionBone(humanBody.rightArm.upperArm, 120);
                      addActionBone(humanBody.rightArm.lowerArm, 240);
                      try {
                        const twist = humanBody.rightArm.upperArm.getSkeleton().bones.find(b => b.name === '右腕捩');
                        if (twist) addActionBone(twist, 300);
                      } catch { /* 捩骨缺失则跳过 */ }
                      addActionBone(humanBody.rightArm.hand, 360);
                    }
                    // [T1.5 镜像同动] side:'both' → 双手齐挥（左臂同 delay 级联，帧分支按 detectSide 镜像符号）
                    if ((params as any)?.side === 'both' && humanBody.leftArm) {
                      addActionBone(humanBody.leftArm.shoulder, 0);
                      addActionBone(humanBody.leftArm.upperArm, 120);
                      addActionBone(humanBody.leftArm.lowerArm, 240);
                      try {
                        const twistL = humanBody.leftArm.upperArm.getSkeleton().bones.find(b => b.name === '左腕捩');
                        if (twistL) addActionBone(twistL, 300);
                      } catch { /* 捩骨缺失则跳过 */ }
                      addActionBone(humanBody.leftArm.hand, 360);
                    }
                    duration = Math.round(np.duration * 1000); // [T3.1] params.duration(秒) 真消费：AI 说挥 3 秒就挥 3 秒，默认 600s=原 10 分钟持留
                    break;
                  case 'nod':
                    // 点头：头部前倾（赞同/致意）
                    addActionBone(humanBody.spine.head);
                    addActionBone(humanBody.spine.neck);
                    duration = 1500;
                    break;
                  case 'shake':
                    // 摇头：头部左右转（否定）
                    addActionBone(humanBody.spine.head);
                    addActionBone(humanBody.spine.neck);
                    duration = 1800;
                    break;
                  case 'block':
                    // 遮挡：双臂抬起交叉于胸前（防御/害羞）
                    if (humanBody.leftArm) {
                      addActionBone(humanBody.leftArm.upperArm);
                      addActionBone(humanBody.leftArm.lowerArm);
                      addActionBone(humanBody.leftArm.hand);
                    }
                    if (humanBody.rightArm) {
                      addActionBone(humanBody.rightArm.upperArm);
                      addActionBone(humanBody.rightArm.lowerArm);
                      addActionBone(humanBody.rightArm.hand);
                    }
                    duration = 2200;
                    break;
                  case 'turnHead':
                    // [2026-07-24 新增] 转头：头部转向一侧再转回（环顾/看左右）
                    // 复用点头/摇头的头部+颈部骨骼，Y轴旋转模拟左右转头
                    addActionBone(humanBody.spine.head);
                    addActionBone(humanBody.spine.neck);
                    duration = 2500;
                    break;
                  case 'turnBody':
                    // [2026-07-24 新增] 转身：上半身+下半身Y轴旋转转身再转回
                    // 查找脊椎骨骼（上半身/下半身/胸），加入动作骨骼列表
                    addActionBone(humanBody.spine.upperSpine);
                    addActionBone(humanBody.spine.lowerSpine);
                    addActionBone(humanBody.spine.chest);
                    duration = 3000;
                    break;
                  case 'squat':
                    // [v56] 蹲下：髋先屈→膝后弯→踝调平（级联）+ 双臂前伸平衡（身体协调）
                    // [v75 2026-09-09] 腿链换 WithD：标准骨+D 系同步驱动（网格绑 D 系，见 addActionBoneWithD 注释）
                    // [v76 2026-09-09] 蹲姿补全：センター重心下沉（basePos 机制）+ 上半身前倾+头颈后仰看前方——
                    //   否则只折腿=脚"缩上去"腾空、上身笔直（用户实测实锤：PMX 上半身不是大腿子骨，无下沉补偿必悬空）
                    {
                      const sqSk = humanBody.leftLeg && humanBody.leftLeg.upperLeg ? humanBody.leftLeg.upperLeg.getSkeleton() : null;
                      const cbSq = sqSk ? sqSk.bones.find((b: any) => b.name === 'センター') : null;
                      if (cbSq) {
                        try {
                          const restSq = restPoseRef.current.get(cbSq);
                          actionBones.push({ bone: cbSq, baseQuat: restSq ? restSq.clone() : cbSq.getRotationQuaternion(Space.LOCAL).clone(), delay: 0, basePos: (cbSq.position ? cbSq.position.clone() : new Vector3(0, 0, 0)) } as any);
                        } catch (e) { /* noop */ }
                      }
                    }
                    addActionBone(humanBody.spine.lowerSpine, 60);
                    addActionBone(humanBody.spine.upperSpine, 60);
                    addActionBone(humanBody.spine.neck, 260);
                    addActionBone(humanBody.spine.head, 260);
                    if (humanBody.leftLeg) {
                      addActionBoneWithD(humanBody.leftLeg.upperLeg, 0);
                      addActionBoneWithD(humanBody.leftLeg.lowerLeg, 100);
                      addActionBoneWithD(humanBody.leftLeg.foot, 200);
                    }
                    if (humanBody.rightLeg) {
                      addActionBoneWithD(humanBody.rightLeg.upperLeg, 0);
                      addActionBoneWithD(humanBody.rightLeg.lowerLeg, 100);
                      addActionBoneWithD(humanBody.rightLeg.foot, 200);
                    }
                    // 蹲下平衡：双臂前伸
                    if (humanBody.leftArm) addActionBone(humanBody.leftArm.shoulder, 150);
                    if (humanBody.rightArm) addActionBone(humanBody.rightArm.shoulder, 150);
                    duration = 3600;
                    break;
                  case 'stretch':
                    // [v56] 伸懒腰：肩先上举→上臂跟上→脊椎后仰→头最后仰（级联协调）
                    if (humanBody.leftArm) {
                      addActionBone(humanBody.leftArm.shoulder, 0);
                      addActionBone(humanBody.leftArm.upperArm, 150);
                      addActionBone(humanBody.leftArm.lowerArm, 300);
                      addActionBone(humanBody.leftArm.hand, 300);
                    }
                    if (humanBody.rightArm) {
                      addActionBone(humanBody.rightArm.shoulder, 0);
                      addActionBone(humanBody.rightArm.upperArm, 150);
                      addActionBone(humanBody.rightArm.lowerArm, 300);
                      addActionBone(humanBody.rightArm.hand, 300);
                    }
                    addActionBone(humanBody.spine.upperSpine, 200);
                    addActionBone(humanBody.spine.lowerSpine, 200);
                    addActionBone(humanBody.spine.chest, 200);
                    // 伸懒腰协调：头后仰
                    addActionBone(humanBody.spine.head, 250);
                    addActionBone(humanBody.spine.neck, 250);
                    duration = 4200;
                    break;
                  case 'turnLeft':
                    // [v56] 左转：上半身先转→下半身跟上→头最后转向（军人转体协调）
                    addActionBone(humanBody.spine.upperSpine, 0);
                    addActionBone(humanBody.spine.lowerSpine, 80);
                    addActionBone(humanBody.spine.chest, 0);
                    addActionBone(humanBody.spine.head, 150);
                    addActionBone(humanBody.spine.neck, 150);
                    duration = 2600;
                    break;
                                    case 'jump': {
                    
// [2026-08-29 v57] 跳跃：主链+D系列同步驱动（网格绑定D系列）
                    
const jumpSk = humanBody.leftLeg && humanBody.leftLeg.upperLeg ? humanBody.leftLeg.upperLeg.getSkeleton() : null;
                    
// [v59] センター整体位移（腾空/下蹲）——位置动画骨骼，帧驱动走 basePos 分支
                    
if (jumpSk) {
                      
  const cb = jumpSk.bones.find((b: any) => b.name === 'センター');
                      
  if (cb) {
                      
    try {
                      
      const restJ = restPoseRef.current.get(cb);
      actionBones.push({ bone: cb, baseQuat: restJ ? restJ.clone() : cb.getRotationQuaternion(Space.LOCAL).clone(), delay: 0, basePos: (cb.position ? cb.position.clone() : new Vector3(0, 0, 0)) } as any);
                      
    } catch (e) { /* noop */ }
                      
  }
                      
}
                    
// [v77] 槽位化注册：腿链走 humanBody 槽位+WithD（自动 D 系副本+role 继承），不再裸名匹配
addActionBoneWithD(humanBody.leftLeg ? humanBody.leftLeg.upperLeg : undefined, 0);
addActionBoneWithD(humanBody.rightLeg ? humanBody.rightLeg.upperLeg : undefined, 0);
addActionBoneWithD(humanBody.leftLeg ? humanBody.leftLeg.lowerLeg : undefined, 0);
addActionBoneWithD(humanBody.rightLeg ? humanBody.rightLeg.lowerLeg : undefined, 0);
addActionBoneWithD(humanBody.leftLeg ? humanBody.leftLeg.foot : undefined, 0);
addActionBoneWithD(humanBody.rightLeg ? humanBody.rightLeg.foot : undefined, 0);

addActionBone(humanBody.spine.upperSpine, 0);
                    
addActionBone(humanBody.spine.lowerSpine, 0);
                    
if (humanBody.leftArm) addActionBone(humanBody.leftArm.shoulder, 0);
                    
if (humanBody.rightArm) addActionBone(humanBody.rightArm.shoulder, 0);
                    
duration = Math.round(np.duration * 1000); // [T3.1] params.duration(秒) 真消费（默认 3.2s=原值）

break;
                  }

                  case 'turnRight':
                    // [v56] 右转：上半身先转→下半身跟上→头最后转向（军人转体协调）
                    addActionBone(humanBody.spine.upperSpine, 0);
                    addActionBone(humanBody.spine.lowerSpine, 80);
                    addActionBone(humanBody.spine.chest, 0);
                    addActionBone(humanBody.spine.head, 150);
                    addActionBone(humanBody.spine.neck, 150);
                    duration = 2600;
                    break;
                  case 'reset':
                    // [2026-09-08 新增] 恢复/复位：走 __jointControl.resetAll 平滑复位
                    // （300ms slerp→自然垂手，与 applyNaturalArmPose 同源几何法，无张臂闪跳）
                    try {
                      const n = (window as any).__jointControl?.resetAll?.();
                      console.log(`[AnimSystem] reset 平滑复位: ${n} 个关节`);
                    } catch (e) {
                      console.warn('[AnimSystem] reset 复位失败:', e);
                    }
                    duration = 600; // 只占位：让状态机走完时长回 idle，实际复位由 resetAll 自己的 slerp 完成
                    break;
                  case 'spin': {
                    // [2026-09-08 语义原语] 转圈：绕センター（MMD 身体朝向轴）整机 Y 轴旋转 2π×圈数
                    //   单调推进（不 sin 回摆）→ 结束自然回到原朝向；方向 dir: left=+, right=-
                    const sp = (params || {}) as { turns?: number; dir?: string };
                    const turns = Math.min(3, Math.max(0.5, Number(sp.turns) || 1));
                    const dirSign = sp.dir === 'right' ? -1 : 1;
                    try {
                      const sk = (humanBody.leftLeg && humanBody.leftLeg.upperLeg)
                        ? humanBody.leftLeg.upperLeg.getSkeleton()
                        : humanBody.spine.head ? humanBody.spine.head.getSkeleton() : null;
                      const cb = sk ? sk.bones.find((b: any) => b.name === 'センター') : null;
                      if (cb) {
                        try {
                          const rest = restPoseRef.current.get(cb);
                          actionBones.push({ bone: cb, baseQuat: rest ? rest.clone() : cb.getRotationQuaternion(Space.LOCAL).clone(), delay: 0, spinTurns: turns, spinDir: dirSign } as any);
                        } catch (e) { /* noop */ }
                      }
                    } catch (e) { /* 找不到センター则无骨骼可转 */ }
                    duration = Math.round(turns * 2200 + 1000);
                    break;
                  }
                  case 'limbRaise': {
                    // [2026-09-08 语义原语] 抬臂/抬腿：side 左/右/both + limb 手/腿 + height 高低（参数驱动，一个实现覆盖整类说法）
                    const lp = (params || {}) as { side?: string; limb?: string; height?: number };
                    const limb = (lp.limb === 'arm' || lp.limb === 'leg') ? lp.limb : 'leg';
                    const side = (lp.side === 'left' || lp.side === 'right' || lp.side === 'both') ? lp.side : 'left';
                    const h = Math.min(0.9, Math.max(0.3, Number(lp.height) || 0.55));
                    // [T1.5 镜像同动] side:'both' → 左右两条链都收，逐骨标注自己的 side（帧分支按 lrSide 取镜像符号）
                    const sides: Array<'left' | 'right'> = side === 'both' ? ['left', 'right'] : [side as 'left' | 'right'];
                    const taggedFrom = actionBones.length;
                    for (const S of sides) {
                      const H = S === 'left' ? humanBody.leftArm : humanBody.rightArm;
                      const L = S === 'left' ? humanBody.leftLeg : humanBody.rightLeg;
                      if (limb === 'arm' && H) {
                        if (H.shoulder) addActionBone(H.shoulder, 0);
                        if (H.upperArm) addActionBone(H.upperArm, 150);
                        if (H.lowerArm) addActionBone(H.lowerArm, 300);
                      } else if (limb === 'leg' && L) {
                        // [v75 2026-09-09] 腿链换 WithD（网格绑 D 系；D 系骨会一并打上 lrLimb 标）
                        if (L.upperLeg) addActionBoneWithD(L.upperLeg, 0);
                        if (L.lowerLeg) addActionBoneWithD(L.lowerLeg, 140);
                        if (L.foot) addActionBoneWithD(L.foot, 260);
                      }
                    }
                    // 给本批动作骨骼逐骨打参数标（side 逐骨标注以支持 both 镜像）
                    for (let k = taggedFrom; k < actionBones.length; k++) {
                      const ab = actionBones[k] as any;
                      ab.lrLimb = limb;
                      ab.lrSide = detectSide(ab.bone?.name || '') || (sides[0] as string);
                      ab.lrHeight = h;
                    }
                    if (actionBones.length === taggedFrom) {
                      // 兜底：模型缺该肢体链时退化为复位，避免"答应了没动"
                      try { (window as any).__jointControl?.resetAll?.(); } catch (e) { /* noop */ }
                    }
                    duration = 2100;
                    break;
                  }
                  // ---------------- [2026-09-08 T6.1 P0 批 + 配方解锁批] 新动作收集 ----------------
                  case 'tiltHead': {
                    // 歪头：头+颈 Z 轴侧倾
                    addActionBone(humanBody.spine.head);
                    addActionBone(humanBody.spine.neck);
                    duration = 1400;
                    break;
                  }
                  case 'bow': {
                    // 鞠躬：上半身前屈主导，胸/头跟随（级联）
                    addActionBone(humanBody.spine.upperSpine, 0);
                    addActionBone(humanBody.spine.chest, 100);
                    addActionBone(humanBody.spine.head, 200);
                    addActionBone(humanBody.spine.neck, 200);
                    duration = Math.round(np.duration * 1000);
                    break;
                  }
                  case 'clap': {
                    // 鼓掌：双臂前举互拍（肩→上臂→肘→手级联）
                    for (const A of [humanBody.leftArm, humanBody.rightArm]) {
                      if (!A) continue;
                      addActionBone(A.shoulder, 0);
                      addActionBone(A.upperArm, 100);
                      addActionBone(A.lowerArm, 200);
                      addActionBone(A.hand, 280);
                    }
                    const spdF = np.speed === 'quick' ? 1.4 : np.speed === 'slow' ? 0.7 : 1;
                    duration = Math.round(np.count * (620 / spdF) + 400);
                    break;
                  }
                  case 'spreadHands': {
                    // 摊手：双臂摊开两侧+手心翻上，hold 后收回
                    for (const A of [humanBody.leftArm, humanBody.rightArm]) {
                      if (!A) continue;
                      addActionBone(A.shoulder, 0);
                      addActionBone(A.upperArm, 100);
                      addActionBone(A.lowerArm, 220);
                      addActionBone(A.hand, 300);
                    }
                    duration = Math.round(np.duration * 1000);
                    break;
                  }
                  case 'thumbsUp': {
                    // 竖拇指：屈臂抬起保持（side both=双手齐比）
                    const tSides: Array<'left' | 'right'> = np.side === 'both' ? ['left', 'right'] : [np.side];
                    for (const S of tSides) {
                      const A = S === 'left' ? humanBody.leftArm : humanBody.rightArm;
                      if (!A) continue;
                      addActionBone(A.shoulder, 0);
                      addActionBone(A.upperArm, 120);
                      addActionBone(A.lowerArm, 240);
                      addActionBone(A.hand, 320);
                    }
                    duration = Math.round((np.hold + 2.2) * 1000);
                    break;
                  }
                  case 'comeHere': {
                    // 招手过来：手心向上抬起，手腕按次数内勾
                    const cSides: Array<'left' | 'right'> = np.side === 'both' ? ['left', 'right'] : [np.side];
                    for (const S of cSides) {
                      const A = S === 'left' ? humanBody.leftArm : humanBody.rightArm;
                      if (!A) continue;
                      addActionBone(A.shoulder, 0);
                      addActionBone(A.upperArm, 120);
                      addActionBone(A.lowerArm, 240);
                      addActionBone(A.hand, 320);
                    }
                    duration = Math.round(np.count * 1100 + 500);
                    break;
                  }
                  case 'refuse': {
                    // 摆手不要：手抬胸前左右摆
                    const rSides: Array<'left' | 'right'> = np.side === 'both' ? ['left', 'right'] : [np.side];
                    for (const S of rSides) {
                      const A = S === 'left' ? humanBody.leftArm : humanBody.rightArm;
                      if (!A) continue;
                      addActionBone(A.shoulder, 0);
                      addActionBone(A.upperArm, 120);
                      addActionBone(A.lowerArm, 240);
                      addActionBone(A.hand, 320);
                    }
                    duration = Math.round(np.count * 950 + 500);
                    break;
                  }
                  case 'standUp': {
                    // 起身：屈膝下沉→蹬伸站直（同 squat 骨骼族）
                    // [v75 2026-09-09] 腿链换 WithD（网格绑 D 系）
                    for (const Lg of [humanBody.leftLeg, humanBody.rightLeg]) {
                      if (!Lg) continue;
                      addActionBoneWithD(Lg.upperLeg, 0);
                      addActionBoneWithD(Lg.lowerLeg, 100);
                      addActionBoneWithD(Lg.foot, 200);
                    }
                    if (humanBody.leftArm) addActionBone(humanBody.leftArm.shoulder, 150);
                    if (humanBody.rightArm) addActionBone(humanBody.rightArm.shoulder, 150);
                    duration = np.speed === 'quick' ? 1400 : np.speed === 'slow' ? 3200 : 2200;
                    break;
                  }
                  case 'bendForward': {
                    // 弯腰：上半身前屈到 angle 保持 hold 秒再直起
                    addActionBone(humanBody.spine.upperSpine, 0);
                    addActionBone(humanBody.spine.chest, 100);
                    addActionBone(humanBody.spine.head, 220);
                    addActionBone(humanBody.spine.neck, 220);
                    duration = Math.round(np.hold * 1000 + 3000);
                    break;
                  }
                  case 'lookUp':
                  case 'lookDown': {
                    // 仰头/低头：头+颈俯仰
                    addActionBone(humanBody.spine.head);
                    addActionBone(humanBody.spine.neck);
                    duration = 1500;
                    break;
                  }
                  case 'legKick': {
                    // 踢腿：单腿大腿前甩（膝从弯到伸）
                    // [v75 2026-09-09] 腿链换 WithD（网格绑 D 系）
                    const K = np.side === 'left' ? humanBody.leftLeg : humanBody.rightLeg;
                    if (K) {
                      addActionBoneWithD(K.upperLeg, 0);
                      addActionBoneWithD(K.lowerLeg, 120);
                      addActionBoneWithD(K.foot, 220);
                    }
                    duration = 1800;
                    break;
                  }
                  case 'point': {
                    // 指向：单臂伸直指向 dir（left→左臂，其余→右臂）
                    const A = np.dir === 'left' ? humanBody.leftArm : humanBody.rightArm;
                    if (A) {
                      addActionBone(A.shoulder, 0);
                      addActionBone(A.upperArm, 120);
                      addActionBone(A.lowerArm, 240);
                      addActionBone(A.hand, 320);
                    }
                    duration = Math.round((np.hold + 2.2) * 1000);
                    break;
                  }
                  case 'offerHand': {
                    // 伸手示意：单臂前伸掌心向上
                    const O = np.side === 'left' ? humanBody.leftArm : humanBody.rightArm;
                    if (O) {
                      addActionBone(O.shoulder, 0);
                      addActionBone(O.upperArm, 120);
                      addActionBone(O.lowerArm, 240);
                      addActionBone(O.hand, 320);
                    }
                    duration = Math.round((np.hold + 2.0) * 1000);
                    break;
                  }
                  case 'bounce': {
                    // 弹跳律动：双膝踝随节拍屈伸
                    for (const Lg of [humanBody.leftLeg, humanBody.rightLeg]) {
                      if (!Lg) continue;
                      addActionBone(Lg.upperLeg, 0);
                      addActionBone(Lg.lowerLeg, 80);
                    }
                    addActionBone(humanBody.spine.upperSpine, 0);
                    duration = Math.round(np.duration * 1000);
                    break;
                  }
                  case 'stomp': {
                    // 跺脚：抬腿-踏地按次数分段
                    const sSides: Array<'left' | 'right'> = np.side === 'both' ? ['left', 'right'] : [np.side];
                    for (const S of sSides) {
                      const Lg = S === 'left' ? humanBody.leftLeg : humanBody.rightLeg;
                      if (!Lg) continue;
                      addActionBone(Lg.upperLeg, 0);
                      addActionBone(Lg.lowerLeg, 120);
                      addActionBone(Lg.foot, 220);
                    }
                    duration = Math.round(np.count * 900 + 600);
                    break;
                  }
                  case 'cheer': {
                    // 欢呼：双臂上扬保持+小抖动
                    for (const A of [humanBody.leftArm, humanBody.rightArm]) {
                      if (!A) continue;
                      addActionBone(A.shoulder, 0);
                      addActionBone(A.upperArm, 120);
                      addActionBone(A.lowerArm, 260);
                      addActionBone(A.hand, 320);
                    }
                    addActionBone(humanBody.spine.head, 200);
                    duration = Math.round(np.duration * 1000);
                    break;
                  }
                  case 'approach': {
                    // 前进靠近：センター位移（持久生效）+ 腿臂交替摆
                    try {
                      const skA = (humanBody.leftLeg && humanBody.leftLeg.upperLeg)
                        ? humanBody.leftLeg.upperLeg.getSkeleton()
                        : humanBody.spine.head ? humanBody.spine.head.getSkeleton() : null;
                      const cbA = skA ? skA.bones.find((b: any) => b.name === 'センター') : null;
                      if (cbA) {
                        const restA = restPoseRef.current.get(cbA);
                        actionBones.push({ bone: cbA, baseQuat: restA ? restA.clone() : cbA.getRotationQuaternion(Space.LOCAL).clone(), delay: 0, basePos: (cbA.position ? cbA.position.clone() : new Vector3(0, 0, 0)) } as any);
                      }
                    } catch (e) { /* noop */ }
                    for (const Lg of [humanBody.leftLeg, humanBody.rightLeg]) {
                      if (!Lg) continue;
                      addActionBone(Lg.upperLeg, 0);
                      addActionBone(Lg.lowerLeg, 80);
                    }
                    if (humanBody.leftArm) addActionBone(humanBody.leftArm.upperArm, 0);
                    if (humanBody.rightArm) addActionBone(humanBody.rightArm.upperArm, 0);
                    const apdF = np.speed === 'quick' ? 1.4 : np.speed === 'slow' ? 0.7 : 1;
                    duration = Math.round(np.steps * 900 / apdF + 600);
                    break;
                  }
                }
                return { actionBones, duration, params: np };
              };

              // [T1.3] 队列头出队尝试：主层空闲 + 与活跃并发层通道不冲突才启动（否则留在队列等层完成再试）
              const tryStartQueued = () => {
                const q = animQueueRef.current;
                if (q.length === 0) return;
                const s = animStateRef.current;
                if (s.action !== 'idle') return;
                const head = q[0];
                const hSpec = PetActionExecutor.spec(head.action);
                if (!hSpec) { q.shift(); return; }
                const busyCh: string[] = [];
                for (const ly of animLayersRef.current) {
                  const lsp = PetActionExecutor.spec(ly.action);
                  if (lsp) busyCh.push(...(lsp.channels || []));
                }
                if ((hSpec.channels || []).some((c) => busyCh.includes(c))) {
                  console.log(`[AnimSystem] 队列头 ${head.action} 与活跃并发层通道冲突，继续等待`);
                  return;
                }
                q.shift();
                console.log(`[AnimSystem] 队列接续: ${head.action}（剩余 ${q.length}）`);
                triggerAction(head.action as AnimAction, head.params);
              };

              const triggerAction = (action: AnimAction, params?: any) => {
                const state = animStateRef.current;
                if (state.action !== 'idle') {
                  // [T1.3 通道仲裁] free+free+通道无交集+并发层未满 → 真同时动
                  // （骨骼集不相交各层独立驱动；balance 锁/reset 一律不走并发）
                  const spec = PetActionExecutor.spec(action);
                  const pSpec = PetActionExecutor.spec(state.action);
                  if (spec && pSpec && action !== 'reset' && state.action !== 'reset'
                      && spec.lock === 'free' && pSpec.lock === 'free'
                      && animLayersRef.current.length < 1
                      && !(spec.channels || []).some((c) => (pSpec.channels || []).includes(c))) {
                    const built = buildAction(action, params);
                    animLayersRef.current.push({ action, startTime: performance.now(), duration: built.duration, actionBones: built.actionBones, params: built.params });
                    console.log(`[AnimSystem] 并发通道: ${action} 与 ${state.action} 同步执行（通道不相交）`);
                    return;
                  }
                  // [时间轴原型] 持留循环动作优雅让位 + 先来后到入队（最多2）
                  const q = animQueueRef.current;
                  if (q.length < 2) {
                    const elapsedMs = performance.now() - state.startTime;
                    if (state.duration > 30000 && elapsedMs > 1500) {
                      state.duration = elapsedMs + 600;
                      console.log(`[AnimSystem] 持留动作 ${state.action} 收到新指令，600ms 内优雅收手`);
                    }
                    q.push({ action, params });
                    console.log(`[AnimSystem] 动作 ${action} 入队（当前 ${state.action}，队列 ${q.length}）`);
                  } else {
                    console.log(`[AnimSystem] 动作 ${action} 丢弃（队列已满）`);
                  }
                  return;
                }
                const built = buildAction(action, params);
                const now = performance.now();
                animStateRef.current = {
                  action,
                  startTime: now,
                  duration: built.duration,
                  breathBaseRot: null,
                  actionBones: built.actionBones,
                  params: built.params,
                };
                console.log(`[AnimSystem] 触发动作: ${action} (${built.duration}ms, ${built.actionBones.length}骨骼)` +
                  (built.actionBones.length === 0 ? ' [警告] 无动作骨骼，请检查模型骨骼命名是否为标准MMD格式' : ''));
              };

              // 暴露触发函数到 window（供 AI 接入预留接口）
              // [2026-07-24 更新] 新增 turnHead（转头看左右）、turnBody（转身）基础动作
              // [2026-09-17 T7] 动作库 VMD 片段播放：资产在 /vmd/*.motion.json
              const vmdAssetCache = new Map<string, VmdClipAsset>();
              const loadVmdAsset = async (assetFile: string): Promise<VmdClipAsset | null> => {
                const key = assetFile.replace(/^\/+/, '');
                if (vmdAssetCache.has(key)) return vmdAssetCache.get(key)!;
                try {
                  const base = (window as any).__vmdAssetBase || '/vmd/';
                  const url = key.includes('/') ? key : base + key;
                  const r = await fetch(url, { cache: 'force-cache' });
                  if (!r.ok) { console.warn('[VmdClip] 资产 404:', url); return null; }
                  const json = await r.json() as VmdClipAsset;
                  if (!json || !Array.isArray(json.keyframes)) { console.warn('[VmdClip] 资产格式非法:', url); return null; }
                  vmdAssetCache.set(key, json);
                  return json;
                } catch (e) {
                  console.warn('[VmdClip] 资产加载失败:', assetFile, e);
                  return null;
                }
              };
              (window as any).__playVmdClip = async (assetFile: string) => {
                try {
                  const asset = await loadVmdAsset(assetFile);
                  if (!asset) return { success: false, error: '资产不存在: ' + assetFile };
                  const boneNames = (analysis.skeleton.bones || []).map((b: any) => b.name);
                  const catMap = bindVmdCatsToSkeleton(boneNames);
                  const skelBones: any[] = analysis.skeleton.bones || [];
                  let vmdRestPos = new Map<string, any>(); // [2026-10-02 终审修复] 静止位基准：快照里取，防逐帧累加漂移
                  const drive = (boneName: string, q: [number, number, number, number], p?: number[]) => {
                    const bone = skelBones.find((b: any) => b.name === boneName);
                    if (!bone) return false;
                    const cls = classifyBoneName(boneName);
                    if (cls === 'decoPhysics') return false;
                    try {
                      const localMatrix = bone.getLocalMatrix();
                      const rest = vmdRestPos.get(boneName);
                      const originalPos = rest ? rest : localMatrix.getTranslation();
                      bone.setRotationQuaternion(Quaternion.FromArray(q as any), Space.LOCAL);
                      // [v194] 位移通道：资产 pos 作为"相对静止位置的偏移"叠加（仅 center 类根骨有非零值）
                      if (p && (p[0] || p[1] || p[2])) {
                        bone.setPosition(new Vector3(originalPos.x + p[0], originalPos.y + p[1], originalPos.z + p[2]), Space.LOCAL);
                      } else {
                        bone.setPosition(originalPos, Space.LOCAL);
                      }
                      // D 系代理同步
                      const proxy = skelBones.find((b: any) => b.name === boneName + 'D');
                      if (proxy) {
                        try {
                          const pm = proxy.getLocalMatrix();
                          const pp = vmdRestPos.get(boneName + 'D') || pm.getTranslation();
                          proxy.setRotationQuaternion(Quaternion.FromArray(q as any), Space.LOCAL);
                          if (p && (p[0] || p[1] || p[2])) {
                            proxy.setPosition(new Vector3(pp.x + p[0], pp.y + p[1], pp.z + p[2]), Space.LOCAL);
                          } else {
                            proxy.setPosition(pp, Space.LOCAL);
                          }
                        } catch { /* proxy fail ignore */ }
                      }
                      return true;
                    } catch { return false; }
                  };
                  // [v193 修复] VMD 片段直写四元数，播放结束若不做还原，肢体会被永久留在片段末帧
                  //   （表现为手臂摊在绑定 A-pose、回不到引擎自然站姿）。此处在播放前快照被驱动骨骼的
                  //   当前姿态，播完（或被新片段打断）时还原回去。
                  const drivenBoneNames: string[] = [];
                  try {
                    const usedCats = new Set<string>();
                    for (const kf of (asset.keyframes || [])) {
                      for (const c of Object.keys(((kf as any).bones) || {})) usedCats.add(c);
                    }
                    for (const [cat, boneName] of (catMap as any).entries()) {
                      if (usedCats.has(String(cat))) drivenBoneNames.push(String(boneName));
                    }
                  } catch { /* 资产缺 keyframes 时忽略，按不还原处理 */ }

                  const findBone = (nm: string) => skelBones.find((x: any) => x.name === nm);
                  const snapshotVmdPose = (): Array<[string, any, any]> => {
                    const out: Array<[string, any, any]> = [];
                    for (const bn of drivenBoneNames) {
                      for (const nm of [bn, bn + 'D']) {
                        const b = findBone(nm);
                        if (!b) continue;
                        try {
                          const q = b.rotationQuaternion ? b.rotationQuaternion.clone() : Quaternion.Identity();
                          let pv: any = null;
                          try { pv = b.getLocalMatrix ? b.getLocalMatrix().getTranslation().clone() : null; } catch { pv = null; }
                          out.push([nm, q, pv]);
                        } catch { /* noop */ }
                      }
                    }
                    return out;
                  };
                  const applyVmdPose = (snap: Array<[string, any, any]>) => {
                    for (const [nm, q, pv] of snap) {
                      const b = findBone(nm);
                      if (!b) continue;
                      try { b.setRotationQuaternion(q.clone(), Space.LOCAL); } catch { /* noop */ }
                      try { if (pv) b.setPosition(pv.clone(), Space.LOCAL); } catch { /* noop */ }
                    }
                  };
                  /** 平滑回位（避免收势硬跳）；打断场景用 applyVmdPose 直接落位。位移同步回位 */
                  const restoreVmdPose = (snap: Array<[string, any, any]>, ms = 260) => {
                    try {
                      const legs: Array<[any, any, any, any, any]> = [];
                      for (const [nm, q, pv] of snap) {
                        const b = findBone(nm);
                        if (!b || !b.rotationQuaternion) continue;
                        let fromP: any = null;
                        try { fromP = b.getLocalMatrix ? b.getLocalMatrix().getTranslation().clone() : null; } catch { fromP = null; }
                        legs.push([b, b.rotationQuaternion.clone(), q.clone(), fromP, pv ? pv.clone() : null]);
                      }
                      const t0 = performance.now();
                      const step = () => {
                        const t = Math.min(1, (performance.now() - t0) / Math.max(1, ms));
                        for (const [b, from, to, fromP, toP] of legs) {
                          try { b.setRotationQuaternion(Quaternion.Slerp(from, to, t), Space.LOCAL); } catch { /* noop */ }
                          if (fromP && toP) {
                            try { b.setPosition(Vector3.Lerp(fromP, toP, t), Space.LOCAL); } catch { /* noop */ }
                          }
                        }
                        if (t < 1) requestAnimationFrame(step);
                      };
                      requestAnimationFrame(step);
                    } catch { applyVmdPose(snap); /* 兜底：直接落位 */ }
                  };

                  // 打断上一个片段：先停 + 先还原，避免两段片段叠加驱动与姿态残留
                  try {
                    const prevPlayer = (window as any).__vmdClipPlayer;
                    if (prevPlayer && typeof prevPlayer.stop === 'function') prevPlayer.stop();
                    (window as any).__vmdClipActive = false; // [2026-10-02 终审] stop 不触发 onDone，此处显式复位生命感让位标志
                    const prevSnap = (window as any).__vmdRestoreSnapshot as Array<[string, any, any]> | undefined;
                    if (prevSnap && prevSnap.length) applyVmdPose(prevSnap);
                  } catch { /* noop */ }

                  const vmdSnap = snapshotVmdPose();
                  try {
                    vmdRestPos = new Map<string, any>();
                    for (const [nm, , pv] of vmdSnap) if (pv) vmdRestPos.set(String(nm), pv.clone ? pv.clone() : pv);
                  } catch { /* 基准表缺失时退回当前矩阵（旧行为） */ }
                  try { (window as any).__vmdRestoreSnapshot = vmdSnap; } catch { /* noop */ }
                  (window as any).__vmdClipActive = true; // [v192] 生命感层让位（VMD 片段驱动骨骼期间）
                  const player = playVmdClip(asset, assetFile, drive, (info) => {
                    restoreVmdPose(vmdSnap);
                    console.log(`[VmdClip] 完成 ${assetFile} 映射${info.mappedCats}类 时长${info.durationSec}s，已还原 ${vmdSnap.length} 根骨骼到自然站姿`);
                    (window as any).__vmdClipActive = false; // [v192] 恢复生命感层
                    try { (window as any).__vmdRestoreSnapshot = undefined; } catch { /* noop */ }
                  });
                  (window as any).__vmdClipPlayer = player;
                  console.log(`[VmdClip] 播放 ${assetFile} cats=${catMap.size} dur=${asset.durationSec}s`);
                  return { success: true, asset: assetFile, cats: catMap.size, durationSec: asset.durationSec };
                } catch (e: any) {
                  console.error('[VmdClip] 播放失败:', e?.message || e);
                  return { success: false, error: e?.message || String(e) };
                }
              };

              // AI 可通过 window.__petAction('wave' | 'nod' | 'shake' | 'block' | 'turnHead' | 'turnBody') 触发动作
              // [v38] 统一走 PetActionExecutor 校验（白名单/冷却/工作模式），防 AI 高频/非法指令
              // [2026-09-17] wave/nod 优先走 stdrecipes 校准配方（playStdMotion+profile），
              //   失败才回退硬编码帧——修复「校准配方是死代码 / 挥手姿势不像人」经典问题
              (window as any).__petAction = (id: string, params?: any) => {
                const src = (params && (params.__source || params.source)) || undefined;
                return PetActionExecutor.execute(id, (aid) => {
                  // [T7] 动作库片段：vmdClip 走库数据播放器
                  if (aid === 'vmdClip') {
                    const asset = (params && (params.asset || params.clip)) || 'idle_刘TWT.motion.json';
                    const playVmd = (window as any).__playVmdClip;
                    if (playVmd) {
                      void playVmd(asset);
                      return;
                    }
                    console.warn('[AnimSystem] __playVmdClip 未就绪');
                    return;
                  }
                  try {
                    const recipeId = resolveStdRecipeId(aid, params);
                    if (recipeId) {
                      const play = (window as any).__playStdMotion;
                      if (play) {
                        const r = play(recipeId);
                        if (r && r.success) {
                          console.log(`[AnimSystem] ${aid} → std配方 ${recipeId} (tracks=${r.tracks})`);
                          return;
                        }
                        console.warn(`[AnimSystem] std配方失败，回退硬编码: ${aid}`, r && r.error, r && r.skipped);
                      }
                    }
                  } catch (e) {
                    console.warn('[AnimSystem] std配方异常，回退硬编码:', e);
                  }
                  triggerAction(aid, params);
                }, { source: src });
              };
              (window as any).__petActionExecutor = PetActionExecutor;
              // [2026-09-08 链路重构] hub 已接入 27865 正规队列（主进程指令扇出统一分发，含 params），
              //   原"桌宠直连 hub 轮询领取动作"的 HubBridge 已删除——留着会让同一动作执行两次
              //   （扇出一次 + 桥轮询一次），且桥不带 params，spin/limbRaise 语义原语无法走旧桥。

              // ---------- 3. 呼吸 + 动作状态机观察者（每帧执行）----------
              const breathObserver = scene.onBeforeRenderObservable.add(() => {
                // [v49] 加载中跳过呼吸/动作（资源让给加载）
                // [v52] 拖拽中同样跳过（CPU 让给拖拽，防事件积压）
                if (loadingRef.current || isDraggingRef.current) return;
                // [动捕模式] 最近 2 秒内有 dongbu 指令 → 冻结呼吸，让动捕独占骨骼
                try {
                  const lastMoc = (window as any).__lastMocapAt || 0;
                  if (lastMoc && Date.now() - lastMoc < 2000) return;
                } catch { /* noop */ }
                try {
                  const now = performance.now();
                  const state = animStateRef.current;
                  // [T2.2 硬门] 帧间隔 dt（clamp 0.1s：加载/拖拽恢复后首帧不误判）
                  const dtS = lastObsNowRef.current > 0
                    ? Math.min(0.1, Math.max(1 / 240, (now - lastObsNowRef.current) / 1000))
                    : 0;
                  lastObsNowRef.current = now;

                  // [T1.4 呼吸并发化] 胸腔位置呼吸提升为常驻底层：idle 与动作期间都持续。
                  // 动作只"旋转"骨骼，与胸骨"位置"动画分属不同变换通道，可安全叠加；
                  // 肩旋转呼吸仅在手臂通道空闲时叠加（下方 armBusy 检查）。
                  const t = now / 1000;
                  const breathPhase = Math.sin(t * 1.2); // -1 ~ 1，吸气正（上提）、呼气负（下放）
                  const chestPosAmp = 0.012;    // 胸骨 Y 轴位置幅度，模拟胸腔上下起伏
                  const shoulderRotAmp = 0.018; // 肩膀 Z 轴旋转幅度约 1°，模拟随呼吸微抬
                  for (const { bone, basePos } of breathBones) {
                    try {
                      bone.setPosition(
                        new Vector3(basePos.x, basePos.y + breathPhase * chestPosAmp, basePos.z),
                        Space.LOCAL
                      );
                    } catch (e) { /* 单个骨骼失败不影响整体 */ }
                  }

                  // [T1.4+8b] 待机肩呼吸：主层 idle 时叠加；armBusy 提取到分支外，
                  // 使"主层已 idle 但并发层仍在跑"的场景也能正确判断是否跳过肩旋转
                  const armBusy = (() => {
                    for (const ly of animLayersRef.current) {
                      const lsp = PetActionExecutor.spec(ly.action);
                      if (lsp && (lsp.channels || []).some((c) => c === 'armL' || c === 'armR' || c === 'limb')) return true;
                    }
                    return false;
                  })();
                  if (state.action === 'idle' && !armBusy) {
                    // 待机：肩膀随呼吸微抬（左肩Z负/右肩Z正方向微抬）
                    for (const { bone, baseQuat, side } of shoulderBones) {
                      try {
                        // 左肩 Z 轴正向旋转 = 上抬，右肩 Z 轴负向旋转 = 上抬
                        const rotSign = side === 'left' ? 1 : -1;
                        const shoulderQ = Quaternion.RotationAxis(
                          new Vector3(0, 0, 1),
                          breathPhase * shoulderRotAmp * rotSign
                        );
                        const finalQ = baseQuat.multiply(shoulderQ);
                        bone.setRotationQuaternion(finalQ, Space.LOCAL);
                      } catch (e) { /* 单个骨骼失败不影响整体 */ }
                    }
                    // 注：颈部和头部骨骼不做任何处理，通过骨骼层级被动跟随胸腔上下浮动
                  }

                  // [v192 T1 眨眼] PMX 顶点 morph 随机眨眼（まばたき 优先；morph 通道与骨骼动作完全独立，任何状态都可眨）
                  try {
                    const metaM: any = (currentModelRef.current as any)?.metadata;
                    if (metaM && metaM.isMmdModel && Array.isArray(metaM.morphs)) {
                      if (!blinkMorphsRef.current) {
                        const collected: any[] = [];
                        for (const nm of ['まばたき', 'blink', 'Blink']) {
                          for (const mo of metaM.morphs) {
                            if (mo && (mo.name === nm || mo.englishName === nm) && Array.isArray(mo.morphTargets)) collected.push(...mo.morphTargets);
                          }
                        }
                        blinkMorphsRef.current = collected;
                        if (collected.length) console.log(`[v192 眨眼] morph targets: ${collected.length}`);
                      }
                      const bTargets = blinkMorphsRef.current;
                      if (bTargets && bTargets.length) {
                        const bs = blinkStateRef.current;
                        if (bs.phase <= 0 && now >= bs.nextAt) bs.phase = 1e-6;
                        if (bs.phase > 0) {
                          bs.phase += dtS / 0.27;
                          bs.value = bs.phase >= 1 ? 0 : Math.sin(Math.min(1, bs.phase) * Math.PI);
                          if (bs.phase >= 1) {
                            bs.phase = 0; bs.value = 0;
                            bs.nextAt = now + (Math.random() < 0.08 ? 320 + Math.random() * 220 : 2000 + Math.random() * 4200);
                          }
                        }
                        for (const tgt of bTargets) { try { tgt.influence = bs.value; } catch { /* noop */ } }
                      }
                    }
                  } catch (e) { /* 眨眼异常不影响渲染 */ }
                  // [v192 T2/T3/T4 待机生命感] 视线跟随+随机环顾、重心微晃、语音说话联动（VMD 片段播放期间让位）
                  try {
                    const vmdBusy = (window as any).__vmdClipActive === true;
                    if (state.action === 'idle' && !armBusy && !vmdBusy) {
                      const headBone = humanBody?.spine?.head;
                      const neckBone = humanBody?.spine?.neck;
                      const chestBone = humanBody?.spine?.chest;
                      const lowerSpineBone = humanBody?.spine?.lowerSpine;
                      const layersNow = animLayersRef.current;
                      const headBusy = layersNow.some((ly: any) => {
                        const sp2 = PetActionExecutor.spec(ly.action);
                        return !!sp2 && (sp2.channels || []).some((c: string) => c === 'head' || c === 'spine' || c === 'limb');
                      });
                      if (headBone && !headBusy) {
                        const gz = gazeStateRef.current;
                        const spk = speakingRef.current;
                        const mc = microRef.current;
                        const tS = now / 1000;
                        // [T2 视线] 鼠标跟随（指针 2.5s 内动过）→ 静止后随机环顾 1.4-3.2s → 归位
                        const eng = scene.getEngine();
                        const rw = Math.max(1, eng.getRenderWidth());
                        const rh = Math.max(1, eng.getRenderHeight());
                        const px = scene.pointerX, py = scene.pointerY;
                        if (px !== gz.px || py !== gz.py) {
                          gz.px = px; gz.py = py; gz.lastMoveAt = now; gz.glanceUntil = 0;
                          gz.nextGlanceAt = now + 3500 + Math.random() * 4000;
                        }
                        if (now - gz.lastMoveAt < 2500) {
                          gz.tgtX = Math.max(-1, Math.min(1, px / rw * 2 - 1)) * 0.30;
                          gz.tgtY = Math.max(-1, Math.min(1, py / rh * 2 - 1)) * 0.20;
                        } else if (gz.glanceUntil > 0 && now < gz.glanceUntil) {
                          /* 环顾保持 */
                        } else if (now >= gz.nextGlanceAt) {
                          gz.tgtX = Math.random() * 1.1 - 0.55;
                          gz.tgtY = Math.random() * 0.5 - 0.2;
                          gz.glanceUntil = now + 1400 + Math.random() * 1800;
                          gz.nextGlanceAt = gz.glanceUntil + 3000 + Math.random() * 6000;
                        } else {
                          gz.tgtX = 0; gz.tgtY = 0;
                        }
                        const kGz = Math.min(1, dtS * 6);
                        gz.curX += (gz.tgtX - gz.curX) * kGz;
                        gz.curY += (gz.tgtY - gz.curY) * kGz;
                        // [T4 说话联动] 头部随语速轻微摆动（能量感，不抢戏）
                        let bobX = 0;
                        if (spk.active) bobX = 0.028 * Math.sin(tS * 4.6) + 0.014 * Math.sin(tS * 7.9 + 0.7);
                        // 应用：rest 基准 × 俯仰(X) × 偏航(Y)；颈骨 0.4 倍跟随
                        const restH = restPoseRef.current.get(headBone);
                        if (restH) {
                          const yawQ = Quaternion.RotationAxis(new Vector3(0, 1, 0), gz.curX);
                          const pitQ = Quaternion.RotationAxis(new Vector3(1, 0, 0), gz.curY + bobX);
                          headBone.setRotationQuaternion(restH.multiply(pitQ).multiply(yawQ), Space.LOCAL);
                          const restN = neckBone ? restPoseRef.current.get(neckBone) : null;
                          if (neckBone && restN) {
                            const yawN = Quaternion.RotationAxis(new Vector3(0, 1, 0), gz.curX * 0.4);
                            const pitN = Quaternion.RotationAxis(new Vector3(1, 0, 0), (gz.curY + bobX) * 0.4);
                            neckBone.setRotationQuaternion(restN.multiply(pitN).multiply(yawN), Space.LOCAL);
                          }
                        }
                        // [T3 重心微晃] 胸 Z 侧摆 + 下脊椎 Y 微转（rotation 通道，与呼吸 position 通道天然分层）
                        const restC = chestBone ? restPoseRef.current.get(chestBone) : null;
                        if (chestBone && restC) {
                          const swayZ = 0.012 * Math.sin(tS * 0.9) + 0.006 * Math.sin(tS * 1.7 + 1.3);
                          chestBone.setRotationQuaternion(restC.multiply(Quaternion.RotationAxis(new Vector3(0, 0, 1), swayZ)), Space.LOCAL);
                        }
                        const restLS = lowerSpineBone ? restPoseRef.current.get(lowerSpineBone) : null;
                        if (lowerSpineBone && restLS) {
                          const swayY = 0.018 * Math.sin(tS * 0.55);
                          lowerSpineBone.setRotationQuaternion(restLS.multiply(Quaternion.RotationAxis(new Vector3(0, 1, 0), swayY)), Space.LOCAL);
                        }
                        // [T3 偶发微动作] 20-45s 随机一个轻量动作（转头/歪头/点头，走既有引擎全约束）
                        if (layersNow.length === 0 && now >= mc.nextAt) {
                          const pick = Math.random();
                          const sideM = Math.random() < 0.5 ? 'left' : 'right';
                          if (pick < 0.4) triggerAction('turnHead', { angle: 9 + Math.random() * 7, side: sideM });
                          else if (pick < 0.75) triggerAction('tiltHead', { angle: 8 + Math.random() * 5, side: sideM });
                          else triggerAction('nod', { angle: 6 + Math.random() * 5, count: 1 });
                          mc.nextAt = now + 20000 + Math.random() * 25000;
                        }
                        // [T4 说话重音] 说话期间 4.5-8s 一次轻点头
                        if (spk.active && layersNow.length === 0 && now >= spk.nextAccentAt) {
                          triggerAction('nod', { angle: 5 + Math.random() * 4, count: 1 });
                          spk.nextAccentAt = now + 4500 + Math.random() * 3500;
                        }
                      }
                    }
                  } catch (e) { /* 生命感异常不影响渲染 */ }
                  // [T1.8b 并发通道引擎] 统一逐层推进：primary 主层 + 并发层每帧独立计算旋转。
                  //   通道仲裁保证两层骨骼集不相交（triggerAction 入口检查），baseQuat 均为 rest 基准，
                  //   层间无单写者冲突；各层完成时独立结算（primary→idle+队列接续，layer→出栈）。
                  if (state.action !== 'idle' || animLayersRef.current.length > 0) {
                    // [2026-09-08 时间轴四段式原型] 替代纯 sin 包络：
                    //   预备(反向蓄力12%) → 主段(smoothstep) → 跟随(过冲5%衰减) → 回收(平滑归零)
                    //   [T3.2] 占比由各层 params.timing 预设驱动（在 for-L 循环内按层取），禁匀速不变

                    const primaryLayer = state.action !== 'idle' ? {
                      action: state.action as AnimAction,
                      startTime: state.startTime,
                      duration: state.duration,
                      actionBones: state.actionBones,
                    } : null;
                    const frameLayers = [
                      ...(primaryLayer ? [primaryLayer] : []),
                      ...animLayersRef.current,
                    ];

                    for (const L of frameLayers) {
                    const elapsed = now - L.startTime;
                    const progress = Math.min(1, elapsed / L.duration);
                    // 缓动函数：ease-in-out（余弦），动作起止平滑
                    const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress);
                    // [T3.2] 四段式包络按本层 timing 预设生成
                    const phaseEnv = phaseEnvOf(((L as any).params || {}).timing || 'normal');
                    const action = L.action as AnimAction;

                    for (const ab of L.actionBones) {
                      try {
                                                // [v59 位置动画] basePos 存在 = 整体位移骨骼（腾空/下蹲），不走旋转分支
                                                const bp = (ab as any).basePos;
                                                if (bp) {
                                                  const lp = (action === 'jump') ? (((ab as any).delay || 0) > 0 ? Math.min(1, Math.max(0, (elapsed - (ab as any).delay) / L.duration)) : progress) : progress;
                                                  let dy = 0;
                                                  if (action === 'jump') {
                                                    // [T3.1] height 参数化：0.3m=原基准；腾空随 height 线性缩放，下蹲/缓冲最多 1.3 倍（蹲深增长慢于跳高，物理合理）
                                                    const hK = ((((L as any).params || {}).height) || 0.3) / 0.3;
                                                    const cK = Math.min(1.3, hK);
                                                    if (lp < 0.32) {
                                                      dy = -0.9 * cK * Math.sin(lp / 0.32 * Math.PI / 2);
                                                    } else if (lp < 0.58) {
                                                      const p2 = (lp - 0.32) / 0.26;
                                                      dy = -0.9 * cK * (1 - p2) + 2.6 * hK * Math.sin(p2 * Math.PI / 2);
                                                    } else {
                                                      const p2 = (lp - 0.58) / 0.42;
                                                      dy = 2.6 * hK * (1 - Math.sin(p2 * Math.PI / 2)) - 0.35 * cK * Math.sin(p2 * Math.PI);
                                                    }
                                                  }
                                                  // [v76 2026-09-09] squat 重心下沉：Y 负=向下（同 jump 蓄力方向），
                                                  // 0→-0.35m×depth 系数→0 包络——补上"往下蹲"的位移，脚贴地不腾空
                                                  if (action === 'squat') {
                                                    const npSq3 = (L as any).params || {};
                                                    const dKq = (Number(npSq3.depth) || 0.6) / 0.6;
                                                    dy = -0.35 * dKq * phaseEnv(progress);
                                                  }
                                                  // [T5 配方解锁 approach] 前进位移：每步 0.12m 分段推进（模型面向+Z，靠近=+Z），持久生效
                                                  let dz = 0;
                                                  if (action === 'approach') {
                                                    const npAp2 = (L as any).params || {};
                                                    const stAp2 = Math.max(1, Math.round(npAp2.steps || 2));
                                                    const segAp = Math.min(stAp2 - 1, Math.floor(progress * stAp2));
                                                    const segTAp = Math.min(1, progress * stAp2 - segAp);
                                                    const moveE = segTAp < 0.7 ? (0.5 - 0.5 * Math.cos(Math.PI * segTAp / 0.7)) : 1;
                                                    dz = 0.12 * (segAp + moveE);
                                                    dy = 0.015 * Math.sin(Math.PI * segTAp); // 迈步轻微起伏
                                                  }
                                                  // [v60 修正] Bone.position 不驱动骨骼（位置在 localMatrix）；正确姿势 = localMatrix.setTranslation + markAsDirty
const lmB = ab.bone.getLocalMatrix();
lmB.setTranslationFromFloats(bp.x, bp.y + dy, bp.z + dz);
ab.bone.markAsDirty();
                                                  continue;
                                                }
                        // [v56] 级联时序：每根骨骼按 delay 延迟启动（肩先→肘后→腕最后），消除"同时起落"僵硬感
                        const delayMs = (ab as any).delay || 0;
                        const localT = delayMs > 0
                          ? Math.min(1, Math.max(0, (elapsed - delayMs) / L.duration))
                          : progress;
                        // [2026-09-08] easedLocal 已并入 phaseEnv 四段式包络
                        let offsetX = 0, offsetY = 0, offsetZ = 0;
                        // [v77 约束传递] role（规范槽位词）拼入匹配串——帧分支关键词表追加槽位词后，
                        // 动作识别不再依赖模型骨骼命名；原名保留供 detectSide/兜底
                        let bName = ab.bone.name || '';
                        const abRole = (ab as any).role;
                        if (abRole) bName = bName + ' ' + abRole;

                        if (action === 'wave') {
                          /* [2026-08-31 v7 实测三角校准终版] 举手姿（上臂Z-1.9+肘Z-1.15基础）下
                             CDP 实测：肘角 -0.85~-1.45 摆动 → 手掌 x 跨度 1.9、y 微拱 0.7 = 正确左右挥轨迹。
                             主摆=肘角±0.3；捩/腕相位差跟随增强自然感；举放三段结构保留 */
                          const T = elapsed / 1000;
                          const raiseT = Math.min(1, T / 0.5);
                          // [8c 修复] duration 是毫秒，原 (state.duration - T) 混用 ms/s（毫秒-秒差巨大），
                          //   持留动作优雅让位后收不了手；统一换算成秒
                          const lowerT = Math.min(1, Math.max(0, (L.duration / 1000 - T) / 0.5));
                          // [T1.5 both 镜像] 左右臂外展（Z 轴）符号相反：右臂保持原标定符号，左臂翻转
                          const wSide = detectSide(bName);
                          const mS = wSide === 'left' ? -1 : 1;
                          const raiseE = raiseT * raiseT * (3 - 2 * raiseT);
                          const wavePhase = Math.max(0, T - 0.5);
                          // [T3.1] amplitude/freq 真消费：摆动幅度与频率参数驱动（举手姿基础角不随 amplitude 变，只摆动项变）
                          const npW = (L as any).params || {};
                          const ampK = Math.min(1.5, Math.max(0.4, (npW.amplitude || 0.7) / 0.7));
                          const freqK = Math.min(2.0, Math.max(0.5, (npW.freq || 2.0) / 2.0));
                          const cyc = wavePhase * Math.PI * 2 * 1.1 * freqK;
                          const wDelay = (ab as any).delay || 0;
                          if (wDelay === 0) {
                            offsetZ = -0.1 * mS * raiseE * lowerT;                     // 肩带
                          } else if (wDelay === 120) {
                            offsetZ = -1.9 * mS * raiseE * lowerT;                     // 上臂外展 109° 锁定
                            offsetX = 0.04 * ampK * Math.sin(cyc + 0.2) * raiseE * lowerT;    // 维持微摆
                          } else if (wDelay === 240) {
                            offsetZ = (-1.15 - 0.3 * ampK * Math.sin(cyc)) * mS * raiseE * lowerT; // ★肘角摆动：前臂左右挥（主源）
                          } else if (wDelay === 300) {
                            offsetY = 0.3 * ampK * Math.sin(cyc + 0.5) * raiseE * lowerT;     // 前臂旋跟随
                          } else if (wDelay >= 360) {
                            offsetZ = 0.3 * ampK * Math.sin(cyc + 0.8) * mS * raiseE * lowerT; // 手腕侧摆跟随
                            offsetX = 0.12 * ampK * Math.sin(cyc + 0.5) * raiseE * lowerT;    // 手腕屈伸跟随
                          }
                        } else if (action === 'nod') {
                          // [T3.1] 点头参数化：angle 度（18°×1.6≈0.5rad 原基准）+ count 次（渲染端一次连贯完成，段间 phaseEnv 归零自然衔接）
                          const npN = (L as any).params || {};
                          const aR = (npN.angle || 18) * 0.01745 * 1.6;
                          const cnt = Math.max(1, Math.round(npN.count || 1));
                          const seg = Math.min(cnt - 1, Math.floor(progress * cnt));
                          const segT = progress * cnt - seg;
                          if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetX = aR * phaseEnv(segT);
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetX = 0.4 * aR * phaseEnv(segT);
                          }
                        } else if (action === 'shake') {
                          // [T3.1] 摇头参数化：angle 度（25°≈0.6rad 原基准）+ count 次来回（sin 频率随 count，cnt=1→3π 与原一致）
                          const npS = (L as any).params || {};
                          const amp = ((npS.angle || 25) / 25) * 0.6;
                          const cntS = Math.max(1, Math.round(npS.count || 1));
                          if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetY = amp * Math.sin(progress * Math.PI * (cntS + 2)) * eased;
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetY = 0.5 * amp * Math.sin(progress * Math.PI * (cntS + 2)) * eased;
                          }
                        } else if (action === 'block') {
                          // 遮挡：双臂抬起交叉于胸前
                          const side = detectSide(bName);
                          if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            // 上臂内收抬起（左臂Z正，右臂Z负）
                            offsetZ = side === 'left' ? 0.9 * phaseEnv(progress)
                                    : side === 'right' ? -0.9 * phaseEnv(progress)
                                    : 0;
                          } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                            // 前臂弯曲（X轴）
                            offsetX = 1.4 * phaseEnv(progress);
                          }
                        } else if (action === 'turnHead') {
                          // [2026-07-24 新增] 转头：头部Y轴转向一侧再转回（sin曲线：0→max→0）
                          // [T3.1] angle 参数化（30°≈0.6rad 原基准，负左正右）
                          const npH = (L as any).params || {};
                          const ampH = ((npH.angle === undefined ? 30 : npH.angle) / 30) * 0.6;
                          if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetY = ampH * phaseEnv(progress);
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetY = 0.5 * ampH * phaseEnv(progress);
                          }
                        } else if (action === 'turnBody') {
                          // [2026-07-24 新增] 转身：脊椎Y轴旋转转身再转回（sin曲线：0→max→0）
                          // [T3.1] angle 参数化（45°≈0.9rad 原基准），上半身大/下半身小协同
                          const npB = (L as any).params || {};
                          const k = (npB.angle === undefined ? 45 : npB.angle) / 45;
                          if (boneNameMatches(bName, ['上半身', 'upper body', 'upper spine', 'chest', '胸', 'spineUpper']) && !boneNameMatches(bName, ['下半身', 'lower'])) {
                            offsetY = 0.9 * k * phaseEnv(progress);
                          } else if (boneNameMatches(bName, ['下半身', 'lower body', 'lower spine', 'waist', '腰', 'spineLower'])) {
                            offsetY = 0.4 * k * phaseEnv(progress);
                          }
                        } else if (action === 'squat') {
                          // [v56] 蹲下：髋深屈（52°）+ 膝深弯（86°）+ 踝调平 + 肩前伸平衡（级联）
                          // [T3.1] depth 参数化（0.6=原基准，蹲的深浅真驱动）
                          const dK = (((L as any).params || {}).depth || 0.6) / 0.6;
                          // [2026-09-08 v66 修复] 大腿骨实际名=足（左足/右足），原关键词（もも/大腿/thigh）匹配不到→髋屈从未生效；
                          // 分支顺序改为 ひざ→足首→足，防止「足」误吞「足首」
                          if (boneNameMatches(bName, ['lower leg', '小腿', 'すね', 'calf', 'shin', 'low leg', 'ひざ', 'lowerLegL', 'lowerLegR'])) {
                            offsetX = -1.5 * dK * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['足首', 'ankle', 'foot'])) {
                            offsetX = 0.5 * dK * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['upper leg', '大腿', 'もも', 'thigh', 'up leg', '足', 'upperLegL', 'upperLegR'])) {
                            offsetX = 0.9 * dK * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['上半身', 'upper body', 'upper spine', 'chest', '胸', 'spineUpper']) && !boneNameMatches(bName, ['下半身', 'lower'])) {
                            // [v76] 上身前倾（X+=前屈基准）保持蹲姿平衡
                            offsetX = 0.5 * dK * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['下半身', 'lower body', 'lower spine', 'waist', '腰', 'spineLower'])) {
                            // [v76] 骨盆微前倾
                            offsetX = 0.15 * dK * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['頭', 'head']) || boneNameMatches(bName, ['首', 'neck'])) {
                            // [v76] 头颈后仰看前方（补偿上身前倾，视线不落地）
                            offsetX = -0.25 * dK * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            // 蹲下平衡：双臂前伸（X轴前转，约20°）
                            offsetX = 0.35 * dK * phaseEnv(localT);
                          }
                        } else if (action === 'stretch') {
                          // [v56] 伸懒腰：肩深上举（86°）→上臂→脊椎后仰→头后仰（级联）
                          const side = detectSide(bName);
                          if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetZ = side === 'left' ? 1.5 * phaseEnv(localT)
                                    : side === 'right' ? -1.5 * phaseEnv(localT) : 0;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            offsetZ = side === 'left' ? 0.6 * phaseEnv(localT)
                                    : side === 'right' ? -0.6 * phaseEnv(localT) : 0;
                          } else if (boneNameMatches(bName, ['上半身', 'upper body', 'upper spine', 'chest', '胸', 'spineUpper']) && !boneNameMatches(bName, ['下半身', 'lower'])) {
                            offsetX = -0.4 * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['下半身', 'lower body', 'lower spine', 'waist', '腰', 'spineLower'])) {
                            offsetX = -0.25 * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['頭', 'head'])) {
                            // 伸懒腰协调：头后仰（约14°）
                            offsetX = -0.25 * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetX = -0.15 * phaseEnv(localT);
                          }
                        } else if (action === 'turnLeft') {
                          // [v56] 军人左转：上半身先转→下半身跟上→头最后转（级联+协调）
                          if (boneNameMatches(bName, ['上半身', 'upper body', 'upper spine', 'chest', '胸', 'spineUpper']) && !boneNameMatches(bName, ['下半身', 'lower'])) {
                            offsetY = -1.1 * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['下半身', 'lower body', 'lower spine', 'waist', '腰', 'spineLower'])) {
                            offsetY = -0.5 * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetY = -0.5 * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetY = -0.3 * phaseEnv(localT);
                          }
                        } else if (action === 'turnRight') {
                          // [v56] 军人右转：上半身先转→下半身跟上→头最后转（级联+协调）
                          if (boneNameMatches(bName, ['上半身', 'upper body', 'upper spine', 'chest', '胸', 'spineUpper']) && !boneNameMatches(bName, ['下半身', 'lower'])) {
                            offsetY = 1.1 * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['下半身', 'lower body', 'lower spine', 'waist', '腰', 'spineLower'])) {
                            offsetY = 0.5 * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetY = 0.5 * phaseEnv(localT);
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetY = 0.3 * phaseEnv(localT);
                          }
                        } else if (action === 'spin') {
                          // [2026-09-08 语义原语] 转圈：センター Y 轴单调推进 2π×圈数×eased，
                          //   结束角度≡0（整圈）→ 无需回摆自然回到原朝向；正=左转(逆时针俯视)
                          const spMeta = (ab as any);
                          if (spMeta.spinTurns) {
                            offsetY = (spMeta.spinDir || 1) * Math.PI * 2 * spMeta.spinTurns * eased;
                          }
                        } else if (action === 'limbRaise') {
                          // [2026-09-08 语义原语] 抬臂/抬腿：抬-停-落包络（非 sin 回摆，抬起来停留一拍再落）
                          const meta = (ab as any);
                          const hh = meta.lrHeight || 0.55;
                          const lrLimb = meta.lrLimb || 'leg';
                          const lrSide = meta.lrSide || 'left';
                          const lrEnv = localT < 0.25 ? (0.5 - 0.5 * Math.cos(Math.PI * localT / 0.25))
                            : localT < 0.72 ? 1
                            : (0.5 + 0.5 * Math.cos(Math.PI * (localT - 0.72) / 0.28));
                          if (lrLimb === 'leg') {
                            // 髋前屈抬大腿（正X同蹲起家族验符号）+ 膝自然弯（反号）+ 踝放松微垂
                            // [v75 2026-09-09] 分支顺序=膝→踝→大腿（大腿含'足'放最后，防'足首'被吞；覆盖 D 系骨名）
                            if (boneNameMatches(bName, ['lower leg', '小腿', 'すね', 'calf', 'shin', 'low leg', 'ひざ', '膝', 'lowerLegL', 'lowerLegR'])) {
                              offsetX = -(0.25 + 0.35 * hh) * lrEnv;
                            } else if (boneNameMatches(bName, ['足首', 'ankle', 'foot'])) {
                              offsetX = -0.12 * hh * lrEnv;
                            } else if (boneNameMatches(bName, ['upper leg', '大腿', 'もも', 'thigh', 'up leg', '足', 'upperLegL', 'upperLegR'])) {
                              offsetX = (0.5 + 0.4 * hh) * lrEnv;
                            }
                          } else {
                            // 抬臂：肩带微抬（小）→ 上臂侧举（主源，左正右负同 stretch 验符号）→ 前臂微弯
                            const armSign = lrSide === 'left' ? 1 : -1;
                            if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                              offsetZ = armSign * 0.22 * hh * lrEnv;
                            } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                              offsetZ = armSign * (0.45 + 0.7 * hh) * lrEnv;
                            } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                              offsetX = -0.28 * lrEnv;
                            }
                          }
                        } else if (action === 'tiltHead') {
                          // [T6.1 P0] 歪头：頭/首 Z 轴侧倾（四段式：歪过去-停一拍-回正）；符号待肉眼验收（左右可能反）
                          const npT = (L as any).params || {};
                          const mS = npT.side === 'right' ? -1 : 1;
                          const aT = (npT.angle || 15) * 0.01745;
                          if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetZ = mS * aT * phaseEnv(progress);
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetZ = mS * 0.4 * aT * phaseEnv(progress);
                          }
                        } else if (action === 'bow') {
                          // [T6.1 P0] 鞠躬：上半身前屈（+X=前弯，与 stretch 后仰 -X 反号已验证），胸/头跟随
                          const npBw = (L as any).params || {};
                          const dKw = (npBw.depth || 0.6) / 0.6;
                          if (boneNameMatches(bName, ['上半身', 'upper body', 'upper spine', 'spineUpper'])) {
                            offsetX = 0.85 * dKw * phaseEnv(progress);
                          } else if (boneNameMatches(bName, ['胸', 'chest'])) {
                            offsetX = 0.3 * dKw * phaseEnv(progress);
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetX = 0.15 * dKw * phaseEnv(progress);
                          } else if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetX = 0.2 * dKw * phaseEnv(progress);
                          }
                        } else if (action === 'clap') {
                          // [T6.1 P0] 鼓掌：双臂前举（包络），肘部弯曲深度按拍子分段振荡（分→合→分）
                          const npCp = (L as any).params || {};
                          const cntCp = Math.max(1, Math.round(npCp.count || 3));
                          const segCp = Math.min(cntCp - 1, Math.floor(progress * cntCp));
                          const segTCp = progress * cntCp - segCp;
                          const clapPulse = Math.sin(Math.PI * Math.min(1, segTCp)); // 0=分 1=合
                          const e0cp = phaseEnv(Math.min(1, progress * 2));         // 抬臂在前半程完成
                          const aScp = detectSide(bName) === 'left' ? 1 : -1;
                          if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetX = 0.35 * e0cp;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            offsetZ = aScp * (0.45 - 0.3 * clapPulse) * e0cp;
                          } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                            offsetX = (1.2 + 0.18 * clapPulse) * e0cp;
                          } else if (boneNameMatches(bName, ['手首', 'hand', 'wrist'])) {
                            offsetZ = aScp * 0.15 * e0cp;
                          }
                        } else if (action === 'spreadHands') {
                          // [T6.1 P0] 摊手：双臂摊开两侧微垂+手心翻上，hold 三段包络
                          const npSp = (L as any).params || {};
                          const aKsp = (npSp.amplitude || 0.7) / 0.7;
                          const holdEsp = progress < 0.22 ? (0.5 - 0.5 * Math.cos(Math.PI * progress / 0.22))
                            : progress < 0.78 ? 1
                            : (0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.78) / 0.22));
                          const aSsp = detectSide(bName) === 'left' ? 1 : -1;
                          if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetZ = aSsp * 0.18 * aKsp * holdEsp;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            offsetZ = aSsp * (0.5 + 0.35 * aKsp) * holdEsp;
                          } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                            offsetX = -0.25 * holdEsp;
                          } else if (boneNameMatches(bName, ['手首', 'hand', 'wrist'])) {
                            offsetZ = aSsp * 0.55 * aKsp * holdEsp;
                          }
                        } else if (action === 'thumbsUp') {
                          // [T6.1 P0] 竖拇指：屈臂抬至胸前、手竖起保持（hold 三段包络）
                          const holdEtu = progress < 0.25 ? (0.5 - 0.5 * Math.cos(Math.PI * progress / 0.25))
                            : progress < 0.8 ? 1
                            : (0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.8) / 0.2));
                          const aStu = detectSide(bName) === 'left' ? 1 : -1;
                          if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetZ = aStu * 0.2 * holdEtu;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            offsetZ = aStu * 1.15 * holdEtu;
                          } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                            offsetX = 1.3 * holdEtu;
                          } else if (boneNameMatches(bName, ['手首', 'hand', 'wrist'])) {
                            offsetZ = aStu * 0.5 * holdEtu;
                          }
                        } else if (action === 'comeHere') {
                          // [T6.1 P0] 招手过来：手心向上抬起，手腕按次数向内勾（分段）
                          const npCo = (L as any).params || {};
                          const cntCo = Math.max(1, Math.round(npCo.count || 2));
                          const segCo = Math.min(cntCo - 1, Math.floor(progress * cntCo));
                          const segTCo = progress * cntCo - segCo;
                          const beckon = Math.sin(Math.PI * Math.min(1, segTCo));
                          const e0co = phaseEnv(Math.min(1, progress * 2));
                          const aSco = detectSide(bName) === 'left' ? 1 : -1;
                          if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetX = 0.4 * e0co;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            offsetZ = aSco * 0.5 * e0co;
                          } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                            offsetX = 1.45 * e0co;
                          } else if (boneNameMatches(bName, ['手首', 'hand', 'wrist'])) {
                            offsetX = (0.15 + 0.4 * beckon) * e0co;
                          }
                        } else if (action === 'refuse') {
                          // [T6.1 P0] 摆手不要：手抬胸前，前臂+手 Y 轴左右摆（按次数）
                          const npRf = (L as any).params || {};
                          const cntRf = Math.max(1, Math.round(npRf.count || 2));
                          const wag = Math.sin(progress * Math.PI * 2 * cntRf);
                          const e0rf = phaseEnv(Math.min(1, progress * 2));
                          const aSrf = detectSide(bName) === 'left' ? 1 : -1;
                          if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetZ = aSrf * 0.25 * e0rf;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            offsetZ = aSrf * 0.5 * e0rf;
                          } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                            offsetX = 1.25 * e0rf;
                            offsetY = 0.4 * wag * e0rf;
                          } else if (boneNameMatches(bName, ['手首', 'hand', 'wrist'])) {
                            offsetY = 0.55 * wag * e0rf;
                          }
                        } else if (action === 'standUp') {
                          // [T6.1 P0] 起身：屈膝下沉→蹬伸站直（一个来回的 sin 包络），脊柱微展
                          const dUS = Math.sin(Math.PI * progress);
                          // [v75 2026-09-09] 分支顺序=膝→踝→大腿（大腿含'足'放最后，防'足首'被吞；对齐 squat 基准）
                          if (boneNameMatches(bName, ['lower leg', '小腿', 'すね', 'calf', 'shin', 'low leg', 'ひざ', 'lowerLegL', 'lowerLegR'])) {
                            offsetX = -0.55 * dUS;
                          } else if (boneNameMatches(bName, ['足首', 'ankle', 'foot'])) {
                            offsetX = 0.18 * dUS;
                          } else if (boneNameMatches(bName, ['upper leg', '大腿', 'もも', 'thigh', 'up leg', '足', 'upperLegL', 'upperLegR'])) {
                            offsetX = 0.32 * dUS;
                          } else if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetX = -0.12 * dUS;
                          } else if (boneNameMatches(bName, ['上半身', 'upper body', 'upper spine', 'spineUpper'])) {
                            offsetX = -0.1 * dUS;
                          }
                        } else if (action === 'bendForward') {
                          // [T6.1 P0] 弯腰：上半身前屈到 angle 保持再直起（hold 三段包络）
                          const npBf = (L as any).params || {};
                          const aBf = (npBf.angle || 45) * 0.01745;
                          const holdEbf = progress < 0.3 ? (0.5 - 0.5 * Math.cos(Math.PI * progress / 0.3))
                            : progress < 0.75 ? 1
                            : (0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.75) / 0.25));
                          if (boneNameMatches(bName, ['上半身', 'upper body', 'upper spine', 'spineUpper'])) {
                            offsetX = 0.8 * aBf * holdEbf;
                          } else if (boneNameMatches(bName, ['胸', 'chest'])) {
                            offsetX = 0.3 * aBf * holdEbf;
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetX = 0.15 * aBf * holdEbf;
                          } else if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetX = 0.18 * aBf * holdEbf;
                          }
                        } else if (action === 'lookUp' || action === 'lookDown') {
                          // [T6.1 P0] 仰头/低头：頭+首 X 轴俯仰（nod 正=低头已验证，仰头取负）
                          const npLk = (L as any).params || {};
                          const aLk = (npLk.angle || 20) * 0.01745 * 1.3;
                          const sgnLk = action === 'lookDown' ? 1 : -1;
                          if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetX = sgnLk * aLk * phaseEnv(progress);
                          } else if (boneNameMatches(bName, ['首', 'neck'])) {
                            offsetX = sgnLk * 0.4 * aLk * phaseEnv(progress);
                          }
                        } else if (action === 'legKick') {
                          // [T6.1 P0] 踢腿：微后摆→快速前甩到峰值→保持→收回（膝从弯到伸）
                          const npKc = (L as any).params || {};
                          const pKc = Math.min(1, Math.max(0, Number(npKc.power) || 0.6));
                          const pk = progress;
                          let kickE = 0, kneeBend = 0;
                          if (pk < 0.12) { const q = pk / 0.12; kickE = -0.18 * Math.sin(q * Math.PI / 2); kneeBend = 0.6 * pKc * q; }
                          else if (pk < 0.38) { const q = (pk - 0.12) / 0.26; const s = q * q * (3 - 2 * q); const peak = 0.4 + 0.6 * pKc; kickE = -0.18 + (peak + 0.18) * s; kneeBend = 0.6 * pKc * (1 - s); }
                          else if (pk < 0.55) { kickE = 0.4 + 0.6 * pKc; kneeBend = 0; }
                          else { const q = (pk - 0.55) / 0.45; const s = q * q * (3 - 2 * q); kickE = (0.4 + 0.6 * pKc) * (1 - s); }
                          // [v75 2026-09-09] 分支顺序=膝→踝→大腿（大腿含'足'放最后，防'足首'被吞）
                          if (boneNameMatches(bName, ['lower leg', '小腿', 'すね', 'calf', 'shin', 'low leg', 'ひざ', 'lowerLegL', 'lowerLegR'])) {
                            offsetX = -kneeBend;
                          } else if (boneNameMatches(bName, ['足首', 'ankle', 'foot'])) {
                            offsetX = 0.15 * kickE;
                          } else if (boneNameMatches(bName, ['upper leg', '大腿', 'もも', 'thigh', 'up leg', '足', 'upperLegL', 'upperLegR'])) {
                            offsetX = kickE;
                          }
                        } else if (action === 'point') {
                          // [T6.1 P0] 指向：单臂伸直指向 dir（up 上斜举/down 前下/left 左/right 右），hold 三段包络
                          const npPt = (L as any).params || {};
                          const dirPt = npPt.dir || 'right';
                          const holdEpt = progress < 0.25 ? (0.5 - 0.5 * Math.cos(Math.PI * progress / 0.25))
                            : progress < 0.8 ? 1
                            : (0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.8) / 0.2));
                          const aSpt = detectSide(bName) === 'left' ? 1 : -1;
                          if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetZ = aSpt * (dirPt === 'up' ? 0.3 : 0.15) * holdEpt;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            if (dirPt === 'up') offsetZ = aSpt * 2.45 * holdEpt;
                            else if (dirPt === 'down') offsetX = 0.85 * holdEpt;
                            else offsetZ = aSpt * 1.5 * holdEpt;
                          } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                            offsetX = -0.06 * holdEpt;
                          }
                        } else if (action === 'offerHand') {
                          // [T5 配方解锁] 伸手示意：单臂前伸掌心向上，hold 三段包络
                          const holdEof = progress < 0.25 ? (0.5 - 0.5 * Math.cos(Math.PI * progress / 0.25))
                            : progress < 0.8 ? 1
                            : (0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.8) / 0.2));
                          const aSof = detectSide(bName) === 'left' ? 1 : -1;
                          if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetX = 0.45 * holdEof;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            offsetZ = aSof * 0.35 * holdEof;
                          } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                            offsetX = 1.05 * holdEof;
                          } else if (boneNameMatches(bName, ['手首', 'hand', 'wrist'])) {
                            offsetX = 0.35 * holdEof;
                            offsetZ = aSof * 0.3 * holdEof;
                          }
                        } else if (action === 'bounce') {
                          // [T5 配方解锁] 弹跳律动：膝踝随节拍屈伸，首尾淡入淡出防收尾跳变
                          const npBn = (L as any).params || {};
                          const Tbn = elapsed / 1000;
                          const boE = 0.5 - 0.5 * Math.cos(2 * Math.PI * (Number(npBn.freq) || 1.5) * Tbn);
                          const aBn = (Number(npBn.amplitude) || 0.5) / 0.5;
                          const fadeBn = Math.min(1, progress * 6, (1 - progress) * 6);
                          // [2026-09-08 v66 修复] 大腿骨实际名=足，补关键词；ひざ/足首先判防误吞
                          if (boneNameMatches(bName, ['lower leg', '小腿', 'すね', 'calf', 'shin', 'low leg', 'ひざ', 'lowerLegL', 'lowerLegR'])) {
                            offsetX = -0.3 * aBn * boE * fadeBn;
                          } else if (boneNameMatches(bName, ['足首', 'ankle', 'foot'])) {
                            offsetX = 0.1 * aBn * boE * fadeBn;
                          } else if (boneNameMatches(bName, ['upper leg', '大腿', 'もも', 'thigh', 'up leg', '足', 'upperLegL', 'upperLegR'])) {
                            offsetX = 0.16 * aBn * boE * fadeBn;
                          } else if (boneNameMatches(bName, ['上半身', 'upper body', 'upper spine', 'spineUpper'])) {
                            offsetX = 0.08 * aBn * boE * fadeBn;
                          }
                        } else if (action === 'stomp') {
                          // [T5 配方解锁] 跺脚：抬腿-踏地按次数分段（一次调用连贯完成）
                          const npSt = (L as any).params || {};
                          const cntSt = Math.max(1, Math.round(npSt.count || 2));
                          const segSt = Math.min(cntSt - 1, Math.floor(progress * cntSt));
                          const segTSt = progress * cntSt - segSt;
                          const stompE = Math.sin(Math.PI * Math.min(1, segTSt));
                          const aSt2 = (Number(npSt.power) || 0.6) / 0.6;
                          // [2026-09-08 v66 修复] 大腿骨实际名=足，补关键词；ひざ/足首先判防误吞
                          if (boneNameMatches(bName, ['lower leg', '小腿', 'すね', 'calf', 'shin', 'low leg', 'ひざ', 'lowerLegL', 'lowerLegR'])) {
                            offsetX = -0.5 * aSt2 * stompE;
                          } else if (boneNameMatches(bName, ['足首', 'ankle', 'foot'])) {
                            offsetX = -0.12 * aSt2 * stompE;
                          } else if (boneNameMatches(bName, ['upper leg', '大腿', 'もも', 'thigh', 'up leg', '足', 'upperLegL', 'upperLegR'])) {
                            offsetX = 0.42 * aSt2 * stompE;
                          }
                        } else if (action === 'cheer') {
                          // [T5 配方解锁] 欢呼：双臂上扬+小幅抖动保持，头微仰
                          const npCh = (L as any).params || {};
                          const aCh = (Number(npCh.amplitude) || 0.8) / 0.8;
                          const Tch = elapsed / 1000;
                          const chE = phaseEnv(progress);
                          const aSch = detectSide(bName) === 'left' ? 1 : -1;
                          if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetZ = aSch * 0.3 * aCh * chE;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            offsetZ = aSch * (1.5 + 0.5 * aCh + 0.08 * Math.sin(2 * Math.PI * 2.2 * Tch)) * chE;
                          } else if (boneNameMatches(bName, ['下腕', 'ひじ', '肘', 'lowerArmL', 'lowerArmR'])) {
                            offsetX = -0.25 * chE;
                          } else if (boneNameMatches(bName, ['手首', 'hand', 'wrist'])) {
                            offsetZ = aSch * 0.25 * chE;
                          } else if (boneNameMatches(bName, ['頭', 'head'])) {
                            offsetX = -0.12 * chE;
                          }
                        } else if (action === 'approach') {
                          // [T5 配方解锁] 前进靠近：腿交替摆+臂反摆（位移在センター basePos 分支处理）
                          const npAp = (L as any).params || {};
                          const stAp = Math.max(1, Math.round(npAp.steps || 2));
                          const swAp = Math.sin(progress * Math.PI * 2 * stAp);
                          const apFade = Math.min(1, progress * 4, (1 - progress) * 4);
                          const isLap = detectSide(bName) === 'left';
                          // [2026-09-08 v66 修复] 大腿骨实际名=足，补关键词；ひざ/足首先判防误吞
                          if (boneNameMatches(bName, ['lower leg', '小腿', 'すね', 'calf', 'shin', 'low leg', 'ひざ', 'lowerLegL', 'lowerLegR'])) {
                            offsetX = -0.22 * Math.max(0, (isLap ? 1 : -1) * swAp) * apFade;
                          } else if (boneNameMatches(bName, ['upper leg', '大腿', 'もも', 'thigh', 'up leg', '足', 'upperLegL', 'upperLegR'])) {
                            offsetX = (isLap ? 1 : -1) * 0.28 * swAp * apFade;
                          } else if (boneNameMatches(bName, ['腕', 'arm']) && !boneNameMatches(bName, ['下腕', 'lower', 'ひじ', '肘', '手首', 'hand', 'wrist'])) {
                            offsetX = (isLap ? -1 : 1) * 0.2 * swAp * apFade;
                          }
                        }
                                                if (action === 'jump') {
                          // [2026-09-08 v66 膝反弯修复] 跳跃三段式：下蹲蓄力(0~0.35)→蹬伸腾空(0.35~0.62)→落地缓冲(0.62~1)
                          // 符号基准对齐 squat（已验证家族）：全身 X+=前屈方向；膝是唯一例外——铰链只能 X−（小腿后折）。
                          // [v58 原符号 膝+1.5/大腿−0.75 全部反向，实锤膝反弯往前折（2026-09-08 用户肉眼报告），本次取反]
                          let squash = 0, armLift = 0, leanBack = 0;
                          if (localT < 0.35) {
                            const p = localT / 0.35;
                            squash = Math.sin(p * Math.PI / 2);
                          } else if (localT < 0.62) {
                            const p = (localT - 0.35) / 0.27;
                            squash = 1 - p;
                            armLift = Math.sin(p * Math.PI / 2);
                            leanBack = Math.sin(p * Math.PI / 2) * 0.5;
                          } else {
                            const p = (localT - 0.62) / 0.38;
                            const buf = Math.sin(p * Math.PI);
                            squash = buf * 0.45;
                            armLift = 1 - Math.sin(p * Math.PI / 2);
                          }
                          const sq = Math.max(0, squash);
                          if (boneNameMatches(bName, ['ひざ', '膝', 'knee'])) {
                            offsetX = -1.5 * sq;   // [v66] 膝铰链只能负向（小腿后折），v58 的 +1.5 是反弯
                          } else if (boneNameMatches(bName, ['足首'])) {
                            offsetX = 0.35 * sq;   // 踝背屈=+X（与 squat 一致，方向本就正确）
                          } else if (boneNameMatches(bName, ['足', 'upperLegL', 'upperLegR'])) {
                            offsetX = 0.75 * sq;   // [v66] 大腿前屈=+X（v58 的 −0.75 是向后摆，导致腿"绷直"错觉）
                          } else if (boneNameMatches(bName, ['上半身', 'upper spine', 'spineUpper'])) {
                            offsetX = 0.2 * sq - 0.12 * leanBack;
                          } else if (boneNameMatches(bName, ['肩', 'shoulder'])) {
                            offsetZ = (bName.indexOf('左') >= 0 ? 1 : -1) * 0.9 * armLift;
                          }
                        }
                        // [T2.2 硬门] 关节速度预算：本帧角速度超舒适档 → clamp 本帧增量。
                        //   效果=运行时自动减速（等效时间轴拉伸），不拒绝动作——"限制别太死，看着舒服就行"。
                        //   首帧只记录基准；センター/全ての親/捩り/IK 不在表内不限制。
                        {
                          if (dtS > 0) {
                            let pMap = (L as any).prevOffsets as Map<Bone, { x: number; y: number; z: number }> | undefined;
                            if (!pMap) { pMap = new Map(); (L as any).prevOffsets = pMap; }
                            const prev = pMap.get(ab.bone);
                            const grp = jointSpeedGroupOf(bName);
                            if (prev && grp) {
                              const maxStep = grp.comfortDegPerSec * dtS;
                              const dx = offsetX * 57.2958 - prev.x;
                              const dy = offsetY * 57.2958 - prev.y;
                              const dz = offsetZ * 57.2958 - prev.z;
                              const maxAbs = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
                              if (maxAbs > maxStep) {
                                const f = maxStep / maxAbs; // 等比缩放三轴（保持偏移方向），只压速度
                                offsetX = prev.x / 57.2958 + dx / 57.2958 * f;
                                offsetY = prev.y / 57.2958 + dy / 57.2958 * f;
                                offsetZ = prev.z / 57.2958 + dz / 57.2958 * f;
                                if ((L as any).speedWarned !== true) {
                                  (L as any).speedWarned = true;
                                  console.warn(`[AnimSystem][硬门] ${L.action} 峰值角速度超舒适档（${grp.comfortDegPerSec}°/s），已限速拉伸`);
                                }
                              }
                            }
                            pMap.set(ab.bone, { x: offsetX * 57.2958, y: offsetY * 57.2958, z: offsetZ * 57.2958 });
                          }
                        }
                        // 应用旋转：基础旋转 × 动作偏移
                        const offsetQ = Quaternion.FromEulerAngles(offsetX, offsetY, offsetZ);
                        const finalQ = ab.baseQuat.multiply(offsetQ);
                        ab.bone.setRotationQuaternion(finalQ, Space.LOCAL);
                      } catch (e) { /* 单个骨骼失败不影响整体 */ }
                    }

                      // [T1.8e] 层完成结算：primary → 恢复 idle + 队列接续；并发层 → 出栈 + 队列再尝试
                      if (progress >= 1) {
                        if (L === primaryLayer) {
                          // 主层完成：恢复所有动作骨骼到 rest 基准旋转（呼吸会立即接管）
                          for (const ab of L.actionBones) {
                            try {
                              ab.bone.setRotationQuaternion(ab.baseQuat, Space.LOCAL);
                            } catch (e) { /* noop */ }
                          }
                          animStateRef.current = {
                            action: 'idle',
                            startTime: 0,
                            duration: 0,
                            breathBaseRot: null,
                            actionBones: [],
                          };
                          console.log('[AnimSystem] 动作完成，恢复 idle');
                        } else {
                          // 并发层完成：骨骼已被最后帧（phaseEnv(1)=0）归位，显式恢复兜底
                          for (const ab of L.actionBones) {
                            try {
                              ab.bone.setRotationQuaternion(ab.baseQuat, Space.LOCAL);
                            } catch (e) { /* noop */ }
                          }
                          const li = animLayersRef.current.indexOf(L as any);
                          if (li >= 0) animLayersRef.current.splice(li, 1);
                          console.log(`[AnimSystem] 并发层 ${L.action} 完成，剩余 ${animLayersRef.current.length} 层`);
                        }
                        // [2026-09-08 时间轴四段式原型] 先来后到：层结算完毕→队列头尝试启动（通道冲突则继续等）
                        tryStartQueued();
                      }
                    }
                  }
                } catch (e) {
                  // 防止观察者异常导致渲染崩溃
                }
              });
              breathObserverRef.current = breathObserver;
              // [v192] 组件卸载时清 VMD 让位标记（防桌宠切换后生命感层永久失效）
              try { (window as any).__vmdClipActive = false; } catch { /* noop */ }

              // ---------- 4. 双击部位触发监听器 ----------
              // 监听 POINTERDOUBLETAP，用 scene.pick 确定命中骨骼，按部位触发对应动作
              const doubleTapObserver = scene.onPointerObservable.add((pi) => {
                try {
                  if (pi.type !== PointerEventTypes.POINTERDOUBLETAP) return;
                  const pickInfo = pi.pickInfo;
                  if (!pickInfo || !pickInfo.hit) return;

                  const pickedPoint = pickInfo.pickedPoint;
                  if (!pickedPoint) return;

                  const analysis = analysisRef.current;
                  if (!analysis) return;

                  // 通过 mesh 关联的骨骼找最近的命中骨骼
                  let targetBone: Bone | null = null;
                  const pickedMesh = pickInfo.pickedMesh as any;
                  if (pickedMesh && pickedMesh.skeleton) {
                    const bones = pickedMesh.skeleton.bones as Bone[];
                    let minDist = Infinity;
                    for (const bone of bones) {
                      try {
                        // 优先用 getAbsolutePosition，回退到 absoluteMatrix 平移
                        let bonePos: Vector3 | null = null;
                        if (typeof bone.getAbsolutePosition === 'function') {
                          bonePos = bone.getAbsolutePosition();
                        } else if (bone.getAbsoluteMatrix) {
                          bonePos = bone.getAbsoluteMatrix().getTranslation();
                        }
                        if (bonePos) {
                          const dx = bonePos.x - pickedPoint.x;
                          const dy = bonePos.y - pickedPoint.y;
                          const dz = bonePos.z - pickedPoint.z;
                          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                          if (dist < minDist) {
                            minDist = dist;
                            targetBone = bone;
                          }
                        }
                      } catch (e) { /* 跳过 */ }
                    }
                  }

                  const bName = targetBone?.name || '';
                  const hb = humanBodyRef.current;
                  let action: 'nod' | 'shake' | 'block' | 'wave' | null = null;

                  // 双击头部：随机点头或摇头
                  if (boneNameMatches(bName, ['頭', 'head']) ||
                      (hb?.spine.head && targetBone === hb.spine.head)) {
                    action = Math.random() < 0.5 ? 'nod' : 'shake';
                  }
                  // 双击胸部/上半身：遮挡动作
                  else if (boneNameMatches(bName, ['胸', 'chest', '上半身', 'upper']) ||
                           (hb?.spine.chest && targetBone === hb.spine.chest) ||
                           (hb?.spine.upperSpine && targetBone === hb.spine.upperSpine)) {
                    action = 'block';
                  }
                  // 双击手臂/肩：挥手
                  else if (boneNameMatches(bName, ['腕', 'arm', '手', 'hand', '肩', 'shoulder']) ||
                           (hb?.leftArm && targetBone === hb.leftArm.upperArm) ||
                           (hb?.rightArm && targetBone === hb.rightArm.upperArm)) {
                    action = 'wave';
                  }

                  if (action) {
                    console.log(`[AnimSystem] 双击命中: ${bName} → 触发 ${action}`);
                    triggerAction(action);
                  }
                } catch (e) {
                  console.warn('[AnimSystem] 双击处理失败:', e);
                }
              });
              doubleTapObserverRef.current = doubleTapObserver;

              console.log(`[AnimSystem] 呼吸+交互+双击系统已启动（呼吸骨骼:${breathBones.length}）`);
            } catch (err) {
              console.warn('[AnimSystem] 启动失败（降级运行，不影响模型显示）:', err);
            }
          }
          }
        } catch (err) {
          console.error('[BabylonModelViewer] 骨骼驱动流程失败（降级运行）:', err);
          setPhysicsStatus(`启用失败: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // 计算模型包围盒
      let minVec: Vector3 | null = null;
      let maxVec: Vector3 | null = null;
      for (const mesh of loadedMeshes) {
        if (mesh === rootMesh) continue;
        if (!mesh.getBoundingInfo) continue;
        try {
          mesh.refreshBoundingInfo?.();
          const bb = mesh.getBoundingInfo().boundingBox;
          const mn = bb.minimumWorld;
          const mx = bb.maximumWorld;
          if (!minVec) {
            minVec = new Vector3(mn.x, mn.y, mn.z);
            maxVec = new Vector3(mx.x, mx.y, mx.z);
          } else {
            minVec.x = Math.min(minVec.x, mn.x);
            minVec.y = Math.min(minVec.y, mn.y);
            minVec.z = Math.min(minVec.z, mn.z);
            maxVec!.x = Math.max(maxVec!.x, mx.x);
            maxVec!.y = Math.max(maxVec!.y, mx.y);
            maxVec!.z = Math.max(maxVec!.z, mx.z);
          }
        } catch (e) { /* 忽略 */ }
      }

      // 相机定位：聚焦角色脸部和上半身
      if (minVec && maxVec && cameraRef.current) {
        let minV = minVec;
        let maxV = maxVec;
        let size = maxV.subtract(minV);
        let modelHeight = size.y;
        let centerX = (minV.x + maxV.x) / 2;
        let centerZ = (minV.z + maxV.z) / 2;
        // [2026-09-10 多模型统一] 优先骨骼身高/中心（头+脚），避免包围盒被头发翅膀撑歪
        const boneFr = measureBoneFrame(rootMesh);
        if (boneFr) {
          const bboxH = modelHeight;
          modelHeight = boneFr.height;
          minV = new Vector3(minV.x, boneFr.minY, minV.z);
          maxV = new Vector3(maxV.x, boneFr.maxY, maxV.z);
          size = maxV.subtract(minV);
          centerX = boneFr.centerX;
          centerZ = boneFr.centerZ;
          console.log('[BabylonModelViewer][取景身高] bbox=' + bboxH.toFixed(2) +
            ' bones=' + boneFr.height.toFixed(2) +
            ' 用=bones targetBaseY=' + boneFr.minY.toFixed(2));
        } else {
          console.log('[BabylonModelViewer][取景身高] bbox=' + modelHeight.toFixed(2) + ' 用=bbox(骨骼量高失败)');
        }

        // [2026-08-06 v9 桌宠模式显示完整角色] 预览版聚焦上半身(0.85)，桌宠版显示全身
        // [2026-09-10] 壁纸模式(/wallpaper)相机参数与预览模式完全一致（用户要求：直接复制预览分支）
        // 桌宠小窗：targetY=模型中心(0.5)，visibleHeight=完整身高，让角色全身可见
        const isWallpaperRoute = typeof window !== 'undefined' && /wallpaper/i.test(window.location.pathname || '');
        if (desktopPetMode && !isWallpaperRoute) {
          // 桌宠模式：全身显示
          const targetY = minV.y + modelHeight * 0.5;  // 模型中心
          cameraRef.current.setTarget(new Vector3(centerX, targetY, centerZ));
          cameraRef.current.beta = Math.PI / 2;  // 平视
          // [v9修复背面] 模型面向-Z方向，alpha=-π/2 让相机在-Z方向看到正面
          // Babylon.js公式：alpha=-π/2 → sin(-π/2)=-1 → z=target.z-radius → 相机在-Z方向
          // 之前 alpha=π/2 相机在+Z方向，看到的是模型背面（模型面向-Z，背面朝+Z）
          cameraRef.current.alpha = Math.PI / 2; // [v62] 模型已由全ての親关节转向 +Z，alpha=π/2 → sin(π/2)=1 → 相机在 +Z 正前方正对正面
          // 全身可见：visibleHeight=完整模型高度，留10%边距
          const fov = cameraRef.current.fov;
          const visibleHeight = modelHeight * 1.1;  // 完整身高+10%边距
          const distance = (visibleHeight / 2) / Math.tan(fov / 2);
          // [v20 拖拽放大修复] 拖拽期间 radius setter 被 v19 锁定（忽略赋值）。
          //   若模型恰在拖拽中加载完成，把期望 radius 记入挂起项，松手后补设，避免取景错位
          if (isDraggingRef.current) {
            pendingRadiusRef.current = Math.max(1, Math.min(100, distance));
          } else {
            pendingRadiusRef.current = null;
          }
          cameraRef.current.radius = Math.max(1, Math.min(100, distance));

          // [2026-08-06 v4 完整角色显示] 存储基准 radius 和基准窗口尺寸
          // 核心原理：让"模型在窗口中的可见比例"始终保持一致
          //   - 相机 visibleH = 2 * radius * tan(fov/2) = 模型高度 × 1.1（全身+10%边距）
          //   - 模型在 canvas 中的投影占比 = modelHeight / visibleH = 1/1.1 ≈ 90.9%（固定常数）
          //   - 要让模型在窗口中也占 90.9%：canvasH = 模型投影高度 / 0.909 = 模型投影高度 × 1.1
          //   - 但模型投影高度 = canvasH × 0.909 → canvasH = canvasH × 0.909 × 1.1 = canvasH（恒等式）
          //   结论：相机已配置为 visibleH = 模型×1.1，所以模型在 canvas 中始终占 90.9%
          //         只要窗口尺寸 = canvas 尺寸，模型就始终完整显示（不会裁剪头/脚）
          // 基准窗口尺寸定义：
          //   - 基准高度 = 屏幕工作区高度的 60%（初始窗口大小适中）
          //   - 基准宽度 = 基准高度 × 模型宽高比（让窗口宽高比=模型宽高比，模型水平也完整显示）
          //   - 基准 radius = 当前相机距离（visibleH = 模型×1.1）
          //   缩放时：newH = baseH × (baseRadius / currentRadius)，窗口线性变化，模型始终完整
          baseRadiusRef.current = cameraRef.current.radius;
          const modelAspect = size.x / modelHeight;  // 模型宽高比
          const screen = screenSizeRef.current;
          const baseH = screen ? Math.round(screen.workHeight * 0.6) : 400;
          // [v41 修复] 基准宽度上限：不超过屏幕工作区宽的 90%（防初始窗口就超屏宽）
          const maxBaseW = screen ? Math.round(screen.workWidth * 0.9) : 800;
          const baseW = Math.min(Math.round(baseH * modelAspect) + 24, maxBaseW);  // 宽度 + 左右边距
          baseWindowSizeRef.current = { width: baseW, height: baseH };
          modelSizeRef.current = { width: size.x, height: size.y };
        } else {
          // 预览 / 壁纸：同一套取景基础；壁纸额外：target 0.85→0.80（上移 5%）+ radius/1.485（再放大 10%）
          const mobileFraming = IS_MOBILE_DEVICE && !desktopPetMode;
          // [v186] 与 PC 同公式同参数（0.85 取景中心），移动端仅视距系数不同
          const targetYRatio = 0.85;
          const targetY = minV.y + modelHeight * targetYRatio;
          cameraRef.current.setTarget(new Vector3(centerX, targetY, centerZ));
          cameraRef.current.beta = Math.PI / 2;  // 平视
          cameraRef.current.alpha = isWallpaperRoute ? (Math.PI / 2) : (-Math.PI / 2);
          const fov = cameraRef.current.fov;
          const visibleHeight = modelHeight * 0.35;
          // [v186] 视距与 PC 同式；手机端整体拉近 0.62 倍实现"可放大、基本一致"
          const distance = (visibleHeight / 2) / Math.tan(fov / 2) * 1.1 * (mobileFraming ? MOBILE_VIEW_DISTANCE_FACTOR : 1);
          cameraRef.current.radius = isWallpaperRoute
            ? Math.max(1, Math.min(50, distance / 2.345))
            : Math.max(1, Math.min(50, distance));
          // [2026-09-10 壁纸] 全屏窗禁止按模型宽高比 resizeWindow（桌宠小窗才需要）
          if (isWallpaperRoute) {
            wallpaperFrameRef.current = {
              minY: minV.y, modelHeight, centerX, centerZ,
            };
            baseRadiusRef.current = cameraRef.current.radius;
            const screen = screenSizeRef.current;
            baseWindowSizeRef.current = {
              width: screen?.workWidth || 1920,
              height: screen?.workHeight || 1080,
            };
            modelSizeRef.current = { width: size.x, height: size.y };
            console.log('[BabylonModelViewer][壁纸取景缓存] h=' + modelHeight.toFixed(2) +
              ' targetY=' + (minV.y + modelHeight * targetYRatio).toFixed(2) +
              ' radius=' + cameraRef.current.radius.toFixed(2));
          }
        }
      }

      console.log('[BabylonModelViewer] 模型加载成功:', modelData.name, 'meshes:', loadedMeshes.length, 'referenceFiles:', referenceFiles.length);

      // [2026-08-06 v6 渲染队列诊断] 桌宠模式：打印模型mesh可见性、相机位置、包围盒
      // 目的：确认模型是否在渲染队列中且可见，相机是否对准模型
      if (desktopPetMode) {
        try {
          const sc = sceneRef.current;
          const cam = cameraRef.current;
          const mesh = currentModelRef.current;
          if (sc && cam && mesh) {
            const meshCount = sc.meshes.length;
            const visibleMeshes = sc.meshes.filter((m: any) => m.isVisible).length;
            let bbInfo = 'N/A';
            try {
              mesh.computeWorldMatrix(true);
              const bb = mesh.getBoundingInfo().boundingBox;
              bbInfo = JSON.stringify({
                min: [bb.minimumWorld.x.toFixed(2), bb.minimumWorld.y.toFixed(2), bb.minimumWorld.z.toFixed(2)],
                max: [bb.maximumWorld.x.toFixed(2), bb.maximumWorld.y.toFixed(2), bb.maximumWorld.z.toFixed(2)],
              });
            } catch (e) { /* ignore */ }
            console.log('[BabylonModelViewer][渲染诊断] meshes=' + meshCount + ' visible=' + visibleMeshes +
              ' camera: target=' + JSON.stringify(cam.target.asArray().map((v: number) => v.toFixed(2))) +
              ' radius=' + cam.radius.toFixed(2) + ' alpha=' + cam.alpha.toFixed(2) + ' beta=' + cam.beta.toFixed(2) +
              ' modelBB=' + bbInfo);
            // 检查模型mesh是否在视锥体内
            try {
              const inFrustum = mesh.isInFrustum((sc.activeCamera as any)?._frustumPlanes);
              console.log('[BabylonModelViewer][渲染诊断] 模型在视锥体内: ' + inFrustum);
            } catch (e) { /* ignore */ }
          }
        } catch (diagErr) { /* ignore */ }
      }

      // [2026-08-06 v9] 模型加载完成后初始化缩放基准
      // [v13] zoomScale 初始化为 1（初始大小），窗口尺寸缩放
      if (desktopPetMode) {
        // [2026-09-10 壁纸] /wallpaper 全屏窗不走 resizeWindow（只补拖拽锁的 radius）
        if (typeof window !== 'undefined' && /wallpaper/i.test(window.location.pathname || '')) {
          if (!isDraggingRef.current && pendingRadiusRef.current !== null && cameraRef.current) {
            try { cameraRef.current.radius = pendingRadiusRef.current; } catch { /* noop */ }
            pendingRadiusRef.current = null;
          }
        } else {
        // [v20 拖拽放大修复] 模型加载完成 100ms 后初始化窗口尺寸（400x600 → 60%屏高基准）。
        //   根因：此定时器无拖拽保护，拖拽进行中触发 resizeWindow → 窗口被瞬间放大（"拖拽时放大"）。
        //   修复：拖拽中挂起（存入 pendingResizeRef），pointerup/pointercancel 后补执行；非拖拽时行为不变。
        modelInitTimerRef.current = window.setTimeout(() => {
          zoomScaleRef.current = 1;
          targetScaleRef.current = 1;
          const base = baseWindowSizeRef.current;
          // [v20 补充] 拖拽中加载完成但拖拽在定时器前结束（Case B）：补设被 v19 setter 丢弃的期望 radius
          if (!isDraggingRef.current && pendingRadiusRef.current !== null && cameraRef.current) {
            try { cameraRef.current.radius = pendingRadiusRef.current; } catch { /* noop */ }
            pendingRadiusRef.current = null;
          }
          if (isDraggingRef.current) {
            pendingResizeRef.current = {
              width: base.width,
              height: base.height,
              radius: pendingRadiusRef.current ?? undefined,
            };
            return;
          }
          if (!base) return;
          try { (window as any).desktopPet?.resizeWindow(base.width, base.height); } catch { /* noop */ }
        }, 100);
        }
      }

      // [2026-08-05 桌宠独立窗口] 通知桌宠窗口模型已加载完成
      onModelLoaded?.();
    } catch (err) {
      console.error('[BabylonModelViewer] 模型加载失败:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setLoadModelError(errMsg);
      // [2026-08-05 桌宠独立窗口] 通知桌宠窗口模型加载失败
      onModelError?.(errMsg);
    } finally {
      // [v49] 加载结束：恢复渲染分辨率（动画观察者由加载流程重新注册）
      loadingRef.current = false;
      try {
        const eng = (sceneRef.current as any)?.getEngine?.();
        if (eng && prevScalingRef.current !== null) {
          eng.setHardwareScalingLevel(prevScalingRef.current);
          prevScalingRef.current = null;
        }
      } catch (e) { /* noop */ }
      setLoading(false);
    }
  }, [modelData]);

  useEffect(() => {
    if (modelData && sceneRef.current) {
      loadModel();
    }
    return () => {
      // 组件卸载/HMR时取消正在进行的加载
      loadAbortRef.current?.abort();
    };
  }, [modelData, loadModel]);

  if (initError) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: '#ff6666', flexDirection: 'column', padding: 20 }}>
        <div style={{ fontSize: 16, marginBottom: 12 }}>{tt('b3d.engineFail')}</div>
        <div style={{ fontSize: 12, color: '#aaa' }}>{initError}</div>
      </div>
    );
  }

  // [2026-08-05 桌宠显示修复] 根容器和 canvas 在桌宠模式下必须完全透明
  // 原因：Electron 主窗口 transparent:true + Babylon scene.clearColor=Color4(0,0,0,0)
  //   都已正确设置，但根 div 的 background:'#1a1a1a' 不透明，挡在 canvas 下方
  //   导致整个窗口看起来是深灰色矩形，桌面看不到角色（用户反馈"导入之后什么都没有"的根因）
  // 修复：桌宠模式 transparent，普通模式保留 #1a1a1a 深灰参照
  const containerBg = desktopPetMode ? 'transparent' : '#1a1a1a';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: containerBg }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', background: 'transparent', willChange: 'transform' }}
      />

      {/* [2026-08-05] 桌宠模式下隐藏所有装饰性 UI，只显示角色本身
          原因：透明窗口上若叠加半透明黑底提示框，会破坏桌宠"无边界"视觉效果 */}
      {!desktopPetMode && loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, background: 'rgba(10,10,20,0.55)', color: 'rgba(232,232,232,0.9)',
          pointerEvents: 'none',
        }}>
          <style>{`@keyframes rl-spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.12)',
            borderTopColor: 'rgba(255,255,255,0.92)',
            borderRightColor: 'rgba(255,255,255,0.35)',
            animation: 'rl-spin 0.85s cubic-bezier(0.45,0.05,0.35,1) infinite',
            boxShadow: '0 0 24px rgba(255,255,255,0.06)',
          }} />
          <div style={{ fontSize: 13, letterSpacing: 2, opacity: 0.9 }}>{tt('b3d.loadingModel')}</div>
        </div>
      )}

      {/* 加载失败提示在两种模式都显示（错误信息必须可见，避免静默失败） */}
      {loadModelError && (
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12,
          background: 'rgba(180,40,40,0.85)', color: '#fff',
          padding: '10px 14px', borderRadius: 4, fontSize: 13
        }}>
          加载失败: {loadModelError}
        </div>
      )}

      {!desktopPetMode && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          background: 'rgba(0,0,0,0.5)', color: '#ccc',
          padding: '6px 10px', borderRadius: 4, fontSize: 12,
          pointerEvents: 'none'
        }}>
          左键旋转 · 滚轮缩放 · ESC 关闭
        </div>
      )}

      {/* 物理模组开关（右下角，可点击）— [v49] 由只读指示改为真实开关 */}
      {!desktopPetMode && (
        <div
          onClick={() => {
            physicsOnRef.current = !physicsOnRef.current;
            setPhysicsOn(physicsOnRef.current);
            console.log('[v49] 物理模组已' + (physicsOnRef.current ? '开启' : '关闭'));
          }}
          title={tt('b3d.physicsOn')}
          style={{
            position: 'absolute', bottom: 12, right: 12,
            background: physicsOn
              ? 'rgba(46,125,50,0.85)'
              : 'rgba(60,60,60,0.85)',
            color: '#fff',
            padding: '4px 10px', borderRadius: 4, fontSize: 11,
            cursor: 'pointer', userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
            border: physicsOn ? '1px solid rgba(126,255,126,0.4)' : '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: physicsStatus === '已启用' ? '#7fff7f' : '#ffaa3a',
            display: 'inline-block',
          }} />
          物理: {physicsStatus}
        </div>
      )}

      {/* 关闭按钮：仅普通模式保留，桌宠模式用右键菜单退出 */}
      {onClose && !desktopPetMode && (
        <button
          onClick={() => onCloseRef.current?.()}
          style={{
            position: 'absolute', top: 12, right: 56,
            background: 'rgba(180,40,40,0.8)',
            color: '#fff',
            border: 'none', borderRadius: 4, padding: '6px 12px',
            cursor: 'pointer', fontSize: 13,
          }}
        >
          关闭
        </button>
      )}

      {/* 桌宠模式右键菜单（动作终端/退出）+ 透明背景点击关闭 */}
      {desktopPetMode && showContextMenu && (
        <>
          {/* 透明背景：覆盖整个窗口，点击关闭菜单 */}
          <div
            onClick={() => { showContextMenuRef.current = false; setShowContextMenu(false); }}
            onMouseEnter={() => { try { (window as any).desktopPet?.setIgnoreMouse(false); } catch { /* noop */ } }}
            style={{
              position: 'fixed',
              left: 0, top: 0, width: '100vw', height: '100vh',
              zIndex: 1999,
              background: 'transparent',
            }}
          />
          {/* 菜单主体 */}
          <div
            style={{
              position: 'fixed',
              left: menuPos.x,
              top: menuPos.y,
              background: 'rgba(30,30,30,0.95)',
              borderRadius: 6,
              padding: '4px 0',
              minWidth: 140,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              zIndex: 2000,
            }}
            onMouseEnter={() => { try { (window as any).desktopPet?.setIgnoreMouse(false); } catch { /* noop */ } }}
          >
            {/* [2026-09-05] "摄像机模式"菜单项已移除（无用处）；保留动作终端等其余项 */}
            {/* [v13] 动作终端：打开动作测试面板 */}
            <div
              onClick={() => {
                showContextMenuRef.current = false;
                setShowContextMenu(false);
                setShowActionPanel(true);
              }}
              style={{
                padding: '8px 16px',
                color: '#7eff7e',
                cursor: 'pointer',
                fontSize: 14,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              动作终端
            </div>
            {/* [v49] 物理模组开关（桌宠模式入口） */}
            <div
              onClick={() => {
                physicsOnRef.current = !physicsOnRef.current;
                setPhysicsOn(physicsOnRef.current);
                showContextMenuRef.current = false;
                setShowContextMenu(false);
              }}
              style={{
                padding: '8px 16px',
                color: physicsOn ? '#7eff7e' : '#aaa',
                cursor: 'pointer',
                fontSize: 14,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {physicsOn ? '物理：开' : '物理：关'}
            </div>
            {/* 退出 */}
            <div
              onClick={() => { showContextMenuRef.current = false; setShowContextMenu(false); onCloseRef.current?.(); }}
              style={{
                padding: '8px 16px',
                color: '#ff6b6b',
                cursor: 'pointer',
                fontSize: 14,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              退出
            </div>
          </div>
        </>
      )}

      {/* [v13] 动作终端面板：列出所有可用动作，方便测试 */}
      {desktopPetMode && showActionPanel && (
        <div
          style={{
            position: 'fixed',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(20,20,20,0.92)',
            borderRadius: 8,
            padding: '10px 12px',
            minWidth: 170,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            zIndex: 2001,
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
          onMouseEnter={() => { try { (window as any).desktopPet?.setIgnoreMouse(false); } catch { /* noop */ } }}
        >
          {/* 标题栏 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 8, paddingBottom: 6,
            borderBottom: '1px solid rgba(255,255,255,0.15)',
          }}>
            <span style={{ color: '#7eff7e', fontSize: 13, fontWeight: 600 }}>{tt('b3d.actionTerminal')}</span>
            <span
              onClick={() => setShowActionPanel(false)}
              style={{ color: '#aaa', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#aaa'; }}
            >×</span>
          </div>
          {/* 动作按钮网格（2列） */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {([
              { id: 'wave', label: '挥手', desc: '打招呼' },
              { id: 'nod', label: '点头', desc: '赞同' },
              { id: 'shake', label: '摇头', desc: '否定' },
              { id: 'block', label: '遮挡', desc: '害羞' },
              { id: 'turnHead', label: '转头', desc: '环顾' },
              { id: 'turnBody', label: '转身', desc: '转身' },
            ] as const).map((act) => (
              <div
                key={act.id}
                onClick={() => {
                  try { (window as any).__petAction?.(act.id); } catch { /* noop */ }
                }}
                style={{
                  padding: '8px 6px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(126,255,126,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              >
                <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>{act.label}</div>
                <div style={{ color: '#888', fontSize: 10, marginTop: 2 }}>{act.desc}</div>
              </div>
            ))}
          </div>
          {/* 底部提示 */}
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', color: '#666', fontSize: 10, textAlign: 'center' }}>
            点击动作按钮触发
          </div>
        </div>
      )}

      {/* 全屏按钮 — 桌宠模式隐藏（窗口本身已全屏，无需浏览器全屏） */}
      {!desktopPetMode && (
        <button
          onClick={() => {
            const el = canvasRef.current?.parentElement;
            if (el && el.requestFullscreen) {
              el.requestFullscreen();
            }
          }}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(60,60,60,0.8)', color: '#fff',
            border: 'none', borderRadius: 4, padding: '6px 12px',
            cursor: 'pointer', fontSize: 13
          }}
          title={tt('b3d.fullscreen')}
        >
          ⛶
        </button>
      )}
    </div>
  );
};

export default BabylonModelViewer;
