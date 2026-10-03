// springChain.ts — 通用 Verlet 弹簧链模拟器（v100 修正版）
// 取材评估（Godot + Blender，2026-09-16）：
//   [Godot] SkeletonModifier3D/SpringBone3D：链式关节 + 刚度(stiffness)/阻尼(drag)/重力(gravity) 二阶响应——参数语义对齐
//   [Godot] Cloth 软体（Bullet 软体）：网格级太重，不采
//   [Blender] 布料解算器（Cloth.cpp）：Verlet 质点积分 + 距离约束松弛——骨架级简化采用
//   结论：骨架级"布料" = Blender Verlet 质点链 + Godot SpringBone 参数语义，纯 TS（无语言桥）。
//   许可证：Godot MIT / Blender GPL——本文件为思想级实现（算法原理+参数语义），无源码复制，无许可证传染。
//
// [v100 修正·头发炸开根因] v98 版用「上一帧质点位置差 prev」当「绑定方向」——每帧拿上一帧的模拟
//   误差生成本帧旋转，误差逐帧累积 → 发束离心炸开（2026-09-16 用户肉眼+截图证实）。
//   修正三件套：
//   1) 构建链时存每粒子 restDir（绑定姿态世界方向，构建后永不变）
//   2) 运行时 worldQ = restDir → 当前质点方向（纯几何，无历史反馈，不累积误差）
//   3) 单帧旋转钳制 ±55°；BV 侧父链共轭转局部 + Slerp 0.2/帧平滑
import { Vector3, Quaternion } from '@babylonjs/core';

export interface SpringChainParams {
  stiffness: number;   // [Godot SpringBone] 约束第二遍松弛系数 0~1
  drag: number;        // [Godot SpringBone] 速度阻尼 0~1（每帧保留比例）
  gravity: number;     // [Blender Cloth] 重力标量
  inertia: number;     // 预留：外部移动传递率（未启用）
}

export const DEFAULT_CHAIN_PARAMS: SpringChainParams = {
  stiffness: 0.35,
  drag: 0.82,
  gravity: -0.9,
  inertia: 0.85,
};

interface ChainParticle {
  pos: Vector3;        // 当前世界坐标
  prev: Vector3;       // 上一帧世界坐标（Verlet 速度源）
  restLen: number;     // 到上一质点的静止距离（结构约束目标长度）
  restDir: Vector3;    // [v100] 绑定姿态下 父粒子→本粒子 的世界方向（永不变）
  boneName: string;    // 本粒子驱动的骨骼
  baseLocal: Quaternion; // 骨骼 bind 局部旋转（BV 侧父链共轭时用）
  parentName: string | null;
}

interface SpringChain {
  id: string;
  group: string;
  rootBoneName: string; // 链首骨骼（根质点钉在它的实时世界坐标上）
  particles: ChainParticle[];
  params: SpringChainParams;
}

const MAX_STEP_ANGLE = 0.96; // 单帧目标旋转钳制 ±55°（防任何来源的尖峰）

export class SpringChainSolver {
  private chains: SpringChain[] = [];
  private wind: { enabled: boolean; amp: number } = { enabled: false, amp: 0 };

  setWind(enabled: boolean, amp: number) { this.wind = { enabled, amp }; }

  /** build 阶段：从骨骼链构建质点链（bind pose 世界坐标） */
  addChain(id: string, group: string, boneInfos: Array<{ name: string; parentName: string | null; pos: Vector3; baseLocal: Quaternion }>, params?: Partial<SpringChainParams>) {
    if (boneInfos.length < 2) return;
    const particles: ChainParticle[] = [];
    let prevPos: Vector3 | null = null;
    for (const bi of boneInfos) {
      const p: ChainParticle = {
        pos: bi.pos.clone(), prev: bi.pos.clone(),
        restLen: prevPos ? Vector3.Distance(prevPos, bi.pos) : 0,
        restDir: Vector3.Zero(),
        boneName: bi.name, baseLocal: bi.baseLocal.clone(), parentName: bi.parentName,
      };
      particles.push(p);
      prevPos = bi.pos.clone();
    }
    // [v100] 绑定方向：bind 世界坐标差，构建后只读
    for (let i = 1; i < particles.length; i++) {
      const d = particles[i].pos.subtract(particles[i - 1].pos);
      if (d.length() > 1e-6) { d.normalize(); particles[i].restDir = d; }
      else { particles[i].restDir = new Vector3(0, -1, 0); }
    }
    this.chains.push({ id, group, rootBoneName: boneInfos[0].name, particles, params: { ...DEFAULT_CHAIN_PARAMS, ...params } });
  }

  get chainCount() { return this.chains.length; }

  /** 链根锚点骨骼名（根质点钉在它的实时世界坐标） */
  getRootAnchorBoneName(chainId: string): string | null {
    const c = this.chains.find(x => x.id === chainId);
    return c ? c.rootBoneName : null;
  }

  clear() { this.chains = []; }

  /** 每帧求解：Verlet 积分 → 距离约束松弛 → restDir→当前方向 输出世界旋转（钳制） */
  step(dtRaw: number, rootPositions: Map<string, Vector3>, gravityDir: Vector3): Map<string, Quaternion> {
    const dt = Math.max(0.008, Math.min(0.033, dtRaw));
    const out = new Map<string, Quaternion>();
    for (const chain of this.chains) {
      const p = chain.particles;
      const root = rootPositions.get(chain.id);
      if (root) { p[0].pos.copyFrom(root); p[0].prev.copyFrom(root); }
      // 1) Verlet 积分（Blender Cloth：惯性+重力+阻尼；风力为 sin 扰动）
      for (let i = 1; i < p.length; i++) {
        const cur = p[i];
        const vel = cur.pos.subtract(cur.prev).scale(chain.params.drag);
        cur.prev.copyFrom(cur.pos);
        let wind = Vector3.Zero();
        if (this.wind.enabled) {
          const t = performance.now() / 1000;
          wind = new Vector3(Math.sin(t * 1.2 + i) * this.wind.amp * 0.6, 0, Math.cos(t * 0.9 + i * 0.7) * this.wind.amp * 0.3);
        }
        const acc = gravityDir.scale(chain.params.gravity).add(wind);
        cur.pos = cur.pos.add(vel).add(acc.scale(dt * dt * 60));
      }
      // 2) 距离约束松弛 ×2（根固定，末端让位；第二遍按 stiffness）
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 1; i < p.length; i++) {
          const a = p[i - 1], b = p[i];
          const d = b.pos.subtract(a.pos);
          const len = d.length();
          if (len < 1e-6) continue;
          const diff = (len - b.restLen) / len;
          b.pos = b.pos.subtract(d.scale(diff * (iter === 0 ? 1 : chain.params.stiffness)));
        }
      }
      // 3) [v100] 旋转输出：restDir（绑定，恒定）→ dirW（当前质点方向）。无历史反馈。
      for (let i = 1; i < p.length; i++) {
        const par = p[i - 1], cur = p[i];
        const dirW = cur.pos.subtract(par.pos);
        if (dirW.length() < 1e-6) continue;
        dirW.normalize();
        const dot = Math.max(-1, Math.min(1, Vector3.Dot(cur.restDir, dirW)));
        const axis = Vector3.Cross(cur.restDir, dirW);
        if (axis.length() < 1e-6) {
          out.set(cur.boneName, dot > 0.999 ? Quaternion.Identity() : Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.min(MAX_STEP_ANGLE, Math.PI)));
        } else {
          let ang = Math.acos(dot);
          if (ang > MAX_STEP_ANGLE) ang = MAX_STEP_ANGLE;
          out.set(cur.boneName, Quaternion.RotationAxis(axis.normalize(), ang));
        }
      }
    }
    return out;
  }
}
