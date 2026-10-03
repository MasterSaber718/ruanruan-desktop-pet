var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { r as reactExports, b as jsxs, j as jsx, x as Fragment } from "./mui-2c02b512.js";
import { S as Space, Q as Quaternion, V as Vector3, E as Engine, a as Scene, C as Color4, A as ArcRotateCamera, D as DirectionalLight, b as Color3, H as HemisphericLight, M as MeshBuilder, c as StandardMaterial, d as DefaultRenderingPipeline, P as PointerEventTypes, I as ImportMeshAsync } from "./babylon-fa4505fb.js";
const API_HOST = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
const API_BASE_URL = `http://${API_HOST}:27865/api/v1`;
function getJointControl() {
  return window.__jointControl || null;
}
let polling = false;
let pollTimer = null;
const POLL_INTERVAL_MS = 1e3;
async function executeCommand(cmd) {
  const jc = getJointControl();
  if (!jc) {
    return { success: false, error: "window.__jointControl 未就绪（模型可能未加载）" };
  }
  try {
    switch (cmd.action) {
      case "rotate": {
        if (!cmd.boneName || !cmd.rotation) {
          return { success: false, error: "参数缺失: boneName 或 rotation" };
        }
        const ok = jc.rotate(cmd.boneName, cmd.rotation.x, cmd.rotation.y, cmd.rotation.z);
        return { success: ok, error: ok ? void 0 : "safeRotateJoint 拒绝（非关节/超极限/位置锁死）" };
      }
      case "reset": {
        if (!cmd.boneName) {
          return { success: false, error: "参数缺失: boneName" };
        }
        const ok = jc.reset(cmd.boneName);
        return { success: ok, error: ok ? void 0 : "重置被拒绝" };
      }
      case "resetAll": {
        const n = jc.resetAll();
        return { success: true, data: { resetCount: n } };
      }
      case "list": {
        const data = jc.list();
        return { success: true, data };
      }
      case "limit": {
        if (!cmd.boneName) {
          return { success: false, error: "参数缺失: boneName" };
        }
        const data = jc.limit(cmd.boneName);
        return {
          success: data !== null,
          data: data || void 0,
          error: data === null ? "骨骼不是关节或不存在" : void 0
        };
      }
      case "status": {
        const data = jc.status();
        return { success: true, data };
      }
      case "find": {
        if (!cmd.keyword) {
          return { success: false, error: "参数缺失: keyword" };
        }
        const data = jc.find(cmd.keyword);
        return { success: true, data };
      }
      case "petAction": {
        if (!cmd.actionId) {
          return { success: false, error: "参数缺失: actionId" };
        }
        const pa = window.__petAction;
        if (!pa) {
          return { success: false, error: "window.__petAction 未就绪（模型可能未加载）" };
        }
        const r = pa(cmd.actionId, cmd.params);
        return {
          success: !!r && r.ok === true,
          error: r && !r.ok ? r.reason || "动作校验拒绝" : void 0
        };
      }
      default:
        return { success: false, error: `未知 action: ${cmd.action}` };
    }
  } catch (err) {
    return {
      success: false,
      error: "执行异常: " + (err instanceof Error ? err.message : String(err))
    };
  }
}
async function reportResult(id, success, data, error) {
  try {
    await fetch(`${API_BASE_URL}/joint-control/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        success,
        error,
        data,
        executedAt: Date.now()
      })
    });
  } catch (err) {
    console.warn("[JointControlClient] 回传结果失败:", err);
  }
}
async function executeIncomingCommands(commands) {
  for (const cmd of commands) {
    const result = await executeCommand(cmd);
    await reportResult(cmd.id, result.success, result.data, result.error);
    console.log(`[JointControlClient] 指令 ${cmd.id} (${cmd.action}) 执行: ${result.success ? "成功" : "失败"}`);
  }
}
async function pollOnce() {
  let commands = [];
  try {
    const resp = await fetch(`${API_BASE_URL}/joint-control/pending`, {
      method: "GET"
    });
    if (!resp.ok)
      return;
    const data = await resp.json();
    if (!data.success || !data.commands || data.commands.length === 0)
      return;
    commands = data.commands;
  } catch (err) {
    return;
  }
  await executeIncomingCommands(commands);
}
function startJointControlPolling() {
  if (polling)
    return;
  polling = true;
  console.log("[JointControlClient] 启动关节控制指令轮询（间隔 1s）");
  pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
  void pollOnce();
}
function stopJointControlPolling() {
  if (!polling)
    return;
  polling = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log("[JointControlClient] 停止关节控制指令轮询");
}
const ACTION_SPECS = {
  wave: { id: "wave", label: "挥手", desc: "打招呼(side=left/right/both)", cooldownMs: 2500, allowedInWork: true, lock: "free", channels: ["armR"] },
  nod: { id: "nod", label: "点头", desc: "赞同", cooldownMs: 1500, allowedInWork: true, lock: "free", channels: ["head"] },
  shake: { id: "shake", label: "摇头", desc: "否定", cooldownMs: 1500, allowedInWork: true, lock: "free", channels: ["head"] },
  block: { id: "block", label: "遮挡", desc: "害羞", cooldownMs: 3e3, allowedInWork: true, lock: "free", channels: ["armL", "armR"] },
  turnHead: { id: "turnHead", label: "转头", desc: "环顾", cooldownMs: 2500, allowedInWork: true, lock: "free", channels: ["head"] },
  turnBody: { id: "turnBody", label: "转身", desc: "转身", cooldownMs: 3e3, allowedInWork: false, lock: "free", channels: ["spine"] },
  squat: { id: "squat", label: "蹲下", desc: "下蹲", cooldownMs: 4e3, allowedInWork: false, lock: "balance", channels: ["legL", "legR", "spine", "armL", "armR"] },
  stretch: { id: "stretch", label: "伸懒腰", desc: "伸展", cooldownMs: 5e3, allowedInWork: false, lock: "balance", channels: ["armL", "armR", "spine", "head"] },
  turnLeft: { id: "turnLeft", label: "左转", desc: "向左转", cooldownMs: 3e3, allowedInWork: true, lock: "free", channels: ["spine", "head"] },
  turnRight: { id: "turnRight", label: "右转", desc: "向左转", cooldownMs: 3e3, allowedInWork: true, lock: "free", channels: ["spine", "head"] },
  jump: { id: "jump", label: "跳跃", desc: "原地跳跃", cooldownMs: 3500, allowedInWork: false, lock: "balance", channels: ["legL", "legR", "spine", "armL", "armR", "head"] },
  reset: { id: "reset", label: "恢复", desc: "回到自然站姿", cooldownMs: 1e3, allowedInWork: true, lock: "free", channels: [] },
  spin: { id: "spin", label: "转圈", desc: "原地旋转N圈(turns/方向dir)", cooldownMs: 4e3, allowedInWork: true, lock: "balance", channels: ["root"] },
  limbRaise: { id: "limbRaise", label: "抬臂抬腿", desc: "抬单侧手/腿(side/limb/height，side=both双臂)", cooldownMs: 2200, allowedInWork: true, lock: "free", channels: ["limb", "armL", "armR", "legL", "legR"] },
  // ---------------- [2026-09-08 T6.1 P0 批 13+镜像=14] ----------------
  tiltHead: { id: "tiltHead", label: "歪头", desc: "卖萌歪头(side=left/right,angle=0-25°)", cooldownMs: 1800, allowedInWork: true, lock: "free", channels: ["head"] },
  bow: { id: "bow", label: "鞠躬", desc: "礼貌鞠躬(depth=0-1,duration=秒)", cooldownMs: 3e3, allowedInWork: true, lock: "free", channels: ["spine", "head"] },
  clap: { id: "clap", label: "鼓掌", desc: "鼓掌(count=1-6,speed=slow/normal/quick)", cooldownMs: 2500, allowedInWork: true, lock: "free", channels: ["armL", "armR"] },
  spreadHands: { id: "spreadHands", label: "摊手", desc: "无奈摊手(amplitude=0-1,duration=保持秒)", cooldownMs: 2500, allowedInWork: true, lock: "free", channels: ["armL", "armR"] },
  thumbsUp: { id: "thumbsUp", label: "竖拇指", desc: "点赞(side=left/right/both,hold=保持秒)", cooldownMs: 2500, allowedInWork: true, lock: "free", channels: ["armL", "armR"] },
  comeHere: { id: "comeHere", label: "招手过来", desc: "招手让人过来(side,count=1-4)", cooldownMs: 2500, allowedInWork: true, lock: "free", channels: ["armL", "armR"] },
  refuse: { id: "refuse", label: "摆手不要", desc: "摆手拒绝(side,count=1-4)", cooldownMs: 2e3, allowedInWork: true, lock: "free", channels: ["armL", "armR"] },
  standUp: { id: "standUp", label: "起身", desc: "蹲后起身站直(speed=quick/normal/slow)", cooldownMs: 3500, allowedInWork: false, lock: "balance", channels: ["legL", "legR", "spine", "armL", "armR"] },
  bendForward: { id: "bendForward", label: "弯腰", desc: "弯腰(angle=5-90°,hold=保持秒)", cooldownMs: 3500, allowedInWork: true, lock: "free", channels: ["spine", "head"] },
  lookUp: { id: "lookUp", label: "仰头", desc: "抬头看上方(angle=5-45°)", cooldownMs: 1800, allowedInWork: true, lock: "free", channels: ["head"] },
  lookDown: { id: "lookDown", label: "低头", desc: "低头看下方/沮丧(angle=5-45°)", cooldownMs: 1800, allowedInWork: true, lock: "free", channels: ["head"] },
  legKick: { id: "legKick", label: "踢腿", desc: "向前踢腿(side=left/right,power=0-1)", cooldownMs: 2500, allowedInWork: false, lock: "free", channels: ["legL", "legR"] },
  point: { id: "point", label: "指向", desc: "指出方向(dir=up/down/left/right,hold=保持秒)", cooldownMs: 2500, allowedInWork: true, lock: "free", channels: ["armL", "armR"] },
  // ---------------- [2026-09-08 T5 配方解锁批（P1 子集）] ----------------
  offerHand: { id: "offerHand", label: "伸手示意", desc: "掌心向上伸出手(side,hold=保持秒)", cooldownMs: 2500, allowedInWork: true, lock: "free", channels: ["armL", "armR"] },
  bounce: { id: "bounce", label: "弹跳律动", desc: "原地开心弹跳(freq=Hz,amplitude=0-1,duration=秒)", cooldownMs: 2500, allowedInWork: false, lock: "free", channels: ["legL", "legR", "spine"] },
  stomp: { id: "stomp", label: "跺脚", desc: "生气跺脚(side,count=1-4,power=0-1)", cooldownMs: 3e3, allowedInWork: false, lock: "free", channels: ["legL", "legR"] },
  cheer: { id: "cheer", label: "欢呼", desc: "双臂上扬欢呼(amplitude=0-1,duration=秒)", cooldownMs: 3e3, allowedInWork: true, lock: "free", channels: ["armL", "armR"] },
  approach: { id: "approach", label: "前进靠近", desc: "朝用户走近(steps=1-4步,位移持久生效,speed)", cooldownMs: 4e3, allowedInWork: false, lock: "balance", channels: ["root", "legL", "legR", "armL", "armR"] }
};
const _PetActionExecutor = class _PetActionExecutor {
  /** 查询动作规格（AI 可用，决定动作选择） */
  static specs() {
    return Object.values(ACTION_SPECS);
  }
  static spec(id) {
    return ACTION_SPECS[id];
  }
  /** 设置工作模式（工作中 turnBody 等动作会被拒绝） */
  static setWorking(working) {
    _PetActionExecutor.working = working;
  }
  /** 校验：动作是否存在 + 工作模式 + 冷却 */
  static check(id) {
    const spec = ACTION_SPECS[id];
    if (!spec)
      return { ok: false, reason: "未知动作: " + id };
    if (_PetActionExecutor.working && !spec.allowedInWork) {
      return { ok: false, reason: "工作模式禁止动作: " + id };
    }
    const last = _PetActionExecutor.lastExecuted[id] || 0;
    const elapsed = performance.now() - last;
    if (elapsed < spec.cooldownMs) {
      return { ok: false, reason: "冷却中: " + id + "（剩余 " + Math.ceil((spec.cooldownMs - elapsed) / 1e3) + "s）" };
    }
    return { ok: true };
  }
  /**
   * 执行动作（AI 入口）：校验通过才执行
   * @param id 动作 id
   * @param run 实际执行回调（由渲染层提供，如 Babylon 的 triggerAction）
   */
  static execute(id, run) {
    const check = _PetActionExecutor.check(id);
    if (!check.ok)
      return check;
    _PetActionExecutor.lastExecuted[id] = performance.now();
    try {
      run(id);
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: "动作执行异常: " + e.message };
    }
  }
};
__publicField(_PetActionExecutor, "lastExecuted", {});
__publicField(_PetActionExecutor, "working", false);
let PetActionExecutor = _PetActionExecutor;
window.__petActionExecutor = PetActionExecutor;
const MMD_TO_STD = [
  // 躯干
  ["センター", "hips"],
  ["上半身", "spine"],
  ["上半身1", "chest"],
  ["上半身2", "upperChest"],
  ["首", "neck"],
  ["頭", "head"],
  // 右臂
  ["右肩", "rightShoulder"],
  ["右腕", "rightUpperArm"],
  ["右ひじ", "rightLowerArm"],
  ["右手首", "rightHand"],
  // [v97] 手指（MMD 3节→base/tip 汇总）
  ["左手首下０", "leftThumbBase"],
  ["左手首下１", "leftThumbBase"],
  ["左手首下２", "leftThumbTip"],
  ["左人指０", "leftIndexBase"],
  ["左人指１", "leftIndexBase"],
  ["左人指２", "leftIndexTip"],
  ["左人指３", "leftIndexTip"],
  ["左中指０", "leftMiddleBase"],
  ["左中指１", "leftMiddleBase"],
  ["左中指２", "leftMiddleTip"],
  ["左中指３", "leftMiddleTip"],
  ["左薬指０", "leftRingBase"],
  ["左薬指１", "leftRingBase"],
  ["左薬指２", "leftRingTip"],
  ["左薬指３", "leftRingTip"],
  ["左小指０", "leftLittleBase"],
  ["左小指１", "leftLittleBase"],
  ["左小指２", "leftLittleTip"],
  ["左小指３", "leftLittleTip"],
  ["右手首下０", "rightThumbBase"],
  ["右手首下１", "rightThumbBase"],
  ["右手首下２", "rightThumbTip"],
  ["右人指０", "rightIndexBase"],
  ["右人指１", "rightIndexBase"],
  ["右人指２", "rightIndexTip"],
  ["右人指３", "rightIndexTip"],
  ["右中指０", "rightMiddleBase"],
  ["右中指１", "rightMiddleBase"],
  ["右中指２", "rightMiddleTip"],
  ["右中指３", "rightMiddleTip"],
  ["右薬指０", "rightRingBase"],
  ["右薬指１", "rightRingBase"],
  ["右薬指２", "rightRingTip"],
  ["右薬指３", "rightRingTip"],
  ["右小指０", "rightLittleBase"],
  ["右小指１", "rightLittleBase"],
  ["右小指２", "rightLittleTip"],
  ["右小指３", "rightLittleTip"],
  // 左臂
  ["左肩", "leftShoulder"],
  ["左腕", "leftUpperArm"],
  ["左ひじ", "leftLowerArm"],
  ["左手首", "leftHand"],
  // 右腿（MMD 命名陷阱：足=大腿，足首=脚踝）
  ["右足", "rightUpperLeg"],
  ["右ひざ", "rightLowerLeg"],
  ["右足首", "rightFoot"],
  ["右つま先", "rightToes"],
  // 左腿
  ["左足", "leftUpperLeg"],
  ["左ひざ", "leftLowerLeg"],
  ["左足首", "leftFoot"],
  ["左つま先", "leftToes"]
];
const EN_TO_STD = [
  ["hips", "hips"],
  ["pelvis", "hips"],
  ["Hips", "hips"],
  ["spine", "spine"],
  ["Spine", "spine"],
  ["chest", "chest"],
  ["Chest", "chest"],
  ["upperchest", "upperChest"],
  ["neck", "neck"],
  ["Neck", "neck"],
  ["head", "head"],
  ["Head", "head"],
  ["shoulder_r", "rightShoulder"],
  ["rightshoulder", "rightShoulder"],
  ["shoulder_l", "leftShoulder"],
  ["leftshoulder", "leftShoulder"],
  ["upperarm_r", "rightUpperArm"],
  ["upperArm_R", "rightUpperArm"],
  ["upperarm_l", "leftUpperArm"],
  ["lowerarm_r", "rightLowerArm"],
  ["forearm_r", "rightLowerArm"],
  ["lowerarm_l", "leftLowerArm"],
  ["hand_r", "rightHand"],
  ["hand_l", "leftHand"],
  ["upperleg_r", "rightUpperLeg"],
  ["thigh_r", "rightUpperLeg"],
  ["upperleg_l", "leftUpperLeg"],
  ["lowerleg_r", "rightLowerLeg"],
  ["shin_r", "rightLowerLeg"],
  ["knee_r", "rightLowerLeg"],
  ["lowerleg_l", "leftLowerLeg"],
  ["foot_r", "rightFoot"],
  ["ankle_r", "rightFoot"],
  ["foot_l", "leftFoot"],
  ["toe_r", "rightToes"],
  ["toes_r", "rightToes"],
  ["toe_l", "leftToes"]
];
function normName(name) {
  return name.replace(/[_\-. ]/g, "").toLowerCase();
}
function nameToStdJoint(name) {
  for (const [mmd, std] of MMD_TO_STD) {
    if (name === mmd)
      return std;
  }
  const n = name;
  for (const [mmd, std] of MMD_TO_STD) {
    if (n.startsWith(mmd)) {
      const tail = n.slice(mmd.length);
      if (tail === "" || /^\d+$/.test(tail))
        return std;
      if (mmd.endsWith("腕")) {
        continue;
      }
      return std;
    }
  }
  for (const [en, std] of EN_TO_STD) {
    if (name === en)
      return std;
  }
  const nn = normName(name);
  for (const [en, std] of EN_TO_STD) {
    if (nn === normName(en))
      return std;
  }
  return null;
}
function resolveHumanoidBones(boneNames) {
  const ALL_STD = [
    "hips",
    "spine",
    "chest",
    "neck",
    "head",
    "leftShoulder",
    "rightShoulder",
    "leftUpperArm",
    "rightUpperArm",
    "leftLowerArm",
    "rightLowerArm",
    "leftHand",
    "rightHand",
    "leftUpperLeg",
    "rightUpperLeg",
    "leftLowerLeg",
    "rightLowerLeg",
    "leftFoot",
    "rightFoot",
    "leftToes",
    "rightToes"
  ];
  const joints = {};
  const usedNames = /* @__PURE__ */ new Set();
  for (const name of boneNames) {
    const std = nameToStdJoint(name);
    if (std && !usedNames.has(name)) {
      if (!joints[std]) {
        joints[std] = name;
        usedNames.add(name);
      }
    }
  }
  const missing = ALL_STD.filter((s) => !joints[s]);
  return {
    profile: { model: "current", joints, axes: {} },
    missing,
    matched: ALL_STD.length - missing.length,
    total: ALL_STD.length
  };
}
function buildRetargetPlan(motion, profile) {
  const skipped = [];
  const grouped = {};
  for (const track of motion.tracks) {
    const jointAxes = profile.axes[track.joint];
    const binding = jointAxes ? jointAxes[track.semantic] : void 0;
    if (!binding) {
      skipped.push({ joint: track.joint, semantic: track.semantic, reason: "profile 无该语义轴绑定" });
      continue;
    }
    const boneName = binding.bone || profile.joints[track.joint];
    if (!boneName) {
      skipped.push({ joint: track.joint, semantic: track.semantic, reason: "profile 无该关节骨骼映射" });
      continue;
    }
    const key = boneName;
    if (!grouped[key])
      grouped[key] = { boneName, axis: "x", sign: 1, keys: [] };
    const gkey = boneName + "|" + binding.axis;
    if (!grouped[gkey])
      grouped[gkey] = { boneName, axis: binding.axis, sign: binding.sign, keys: [] };
    grouped[gkey].keys.push(...track.keys.map((k) => ({ t: k.t, deg: k.deg * binding.sign })));
  }
  return {
    durationMs: motion.durationMs,
    loop: !!motion.loop,
    tracks: Object.values(grouped),
    skipped
  };
}
function evalKeys(keys, tMs) {
  if (keys.length === 0)
    return 0;
  if (tMs <= keys[0].t)
    return keys[0].deg;
  const last = keys[keys.length - 1];
  if (tMs >= last.t)
    return last.deg;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (tMs >= a.t && tMs <= b.t) {
      const span = b.t - a.t;
      if (span <= 0)
        return b.deg;
      const k = (tMs - a.t) / span;
      const s = k * k * (3 - 2 * k);
      return a.deg + (b.deg - a.deg) * s;
    }
  }
  return last.deg;
}
function playStdMotion(plan, drive, onDone) {
  const start = performance.now();
  let stopped = false;
  let loopEnd = plan.loop ? false : true;
  const tick = () => {
    if (stopped)
      return;
    const elapsed = performance.now() - start;
    let t = elapsed;
    if (plan.loop) {
      if (loopEnd) {
        t = plan.durationMs;
      }
    }
    const effT = plan.loop && !loopEnd ? elapsed % plan.durationMs : Math.min(t, plan.durationMs);
    const frame = {};
    for (const tr of plan.tracks) {
      const deg = evalKeys(tr.keys, effT);
      const e = frame[tr.boneName] = frame[tr.boneName] || { x: 0, y: 0, z: 0 };
      e[tr.axis] = deg * tr.sign;
    }
    for (const [bone, e] of Object.entries(frame)) {
      drive(bone, e);
    }
    if (plan.loop && !loopEnd) {
      requestAnimationFrame(tick);
      return;
    }
    if (elapsed < plan.durationMs) {
      requestAnimationFrame(tick);
      return;
    }
    if (onDone)
      onDone(plan.skipped);
  };
  requestAnimationFrame(tick);
  return {
    stop: () => {
      stopped = true;
    },
    finishLoop: () => {
      loopEnd = true;
    }
  };
}
const R_ARM_LIFT = { axis: "z", sign: -1, note: "Z+ 使手落下 y-2.67 → Z-=上抬" };
const R_ARM_FWd = { axis: "x", sign: 1, note: "X+ 前臂向前抬 z+1.40" };
const R_ARM_BACK = { axis: "y", sign: 1, note: "Y+ 水平面内向后摆 z-2.16" };
const LINNAI_PROFILE = {
  model: "琳奈_泳装",
  generator: "hand-calibrated",
  generatedAt: "2026-09-02",
  joints: {
    hips: "センター",
    spine: "上半身",
    chest: "上半身1",
    upperChest: "上半身2",
    neck: "首",
    head: "頭",
    rightShoulder: "右肩",
    rightUpperArm: "右腕",
    rightLowerArm: "右ひじ",
    rightHand: "右手首",
    leftShoulder: "左肩",
    leftUpperArm: "左腕",
    leftLowerArm: "左ひじ",
    leftHand: "左手首",
    rightUpperLeg: "右足D",
    rightLowerLeg: "右ひざ",
    rightFoot: "右足首",
    leftUpperLeg: "左足D",
    leftLowerLeg: "左ひざ",
    leftFoot: "左足首"
  },
  axes: {
    rightUpperArm: {
      lift: R_ARM_LIFT,
      swingFwd: R_ARM_FWd,
      swingBack: R_ARM_BACK
    },
    leftUpperArm: {
      lift: { axis: "z", sign: -1, note: "镜像假设（未实测）" },
      swingFwd: { axis: "x", sign: -1, note: "镜像假设" },
      swingBack: { axis: "y", sign: 1, note: "镜像假设" }
    },
    rightLowerArm: {
      bend: { axis: "z", sign: -1, note: "肘 Z- 前臂向头侧上竖 y+1.37（挥手竖前臂关键）" }
    },
    leftLowerArm: {
      bend: { axis: "z", sign: -1, note: "镜像假设（未实测）" }
    },
    rightHand: {
      side: { axis: "z", sign: 1, note: "腕 Z 侧摆（挥手主源，幅度可放大）" },
      flex: { axis: "x", sign: 1, note: "X+ 手掌屈伸 z+0.15" }
    },
    leftHand: {
      side: { axis: "z", sign: 1, note: "镜像假设" },
      flex: { axis: "x", sign: 1, note: "镜像假设" }
    },
    rightShoulder: {
      drop: { axis: "z", sign: 1, note: "肩 Z+ 下沉 y-0.54" }
    },
    leftShoulder: {
      drop: { axis: "z", sign: 1, note: "镜像假设" }
    },
    rightUpperLeg: {
      swingFwd: { bone: "右足D", axis: "x", sign: 1, note: "大腿前摆（未逐轴实测，待 Profiler 校准）" }
    },
    rightLowerLeg: {
      bend: { axis: "x", sign: 1, note: "膝 X 单轴 小腿摆 z+1.97" }
    },
    leftLowerLeg: {
      bend: { axis: "x", sign: 1, note: "镜像假设" }
    },
    spine: {
      lean: { axis: "x", sign: 1, note: "上半身 X+ 后仰 z-1.38" },
      turn: { axis: "y", sign: 1, note: "上半身 Y+ 左转 x-0.20" }
    }
    // 前臂捩（twist）在 MMD 是独立骨骼链：右腕捩1-3（肘与腕之间）
    // twist 语义的 bone 覆盖到捩骨：
    // （放在 rightLowerArm.twist —— retarget 时 bone 覆盖优先生效）
  }
};
LINNAI_PROFILE.axes.rightLowerArm.twist = { bone: "右腕捩1", axis: "y", sign: 1, note: "前臂自转 位移1.5 大幅可用" };
LINNAI_PROFILE.axes.leftLowerArm.twist = { bone: "左腕捩1", axis: "y", sign: 1, note: "镜像假设" };
LINNAI_PROFILE.axes.rightHand.twist = { bone: "右手捩1", axis: "y", sign: 1, note: "手部捩" };
const KEY_PREFIX = "pet.profile.v1:";
function loadStoredProfile(modelName) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + modelName);
    if (!raw)
      return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object" || !p.joints)
      return null;
    p.generator = p.generator || "stored";
    return p;
  } catch (_) {
    return null;
  }
}
function saveStoredProfile(modelName, profile) {
  try {
    profile.model = modelName;
    profile.generator = profile.generator || "stored";
    localStorage.setItem(KEY_PREFIX + modelName, JSON.stringify(profile));
    return true;
  } catch (_) {
    return false;
  }
}
function listStoredProfiles() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX))
        out.push(k.slice(KEY_PREFIX.length));
    }
  } catch (_) {
  }
  return out;
}
function resolveActiveProfile(modelName, autoJoints, missing) {
  const stored = loadStoredProfile(modelName);
  if (stored && Object.keys(stored.axes || {}).length > 0) {
    return { profile: stored, source: "stored", reason: `命中人工固化档案 (${modelName})` };
  }
  if (modelName.includes("琳奈")) {
    const p = JSON.parse(JSON.stringify(LINNAI_PROFILE));
    if (stored) {
      p.joints = { ...p.joints, ...stored.joints };
    }
    return { profile: p, source: "builtin", reason: `命中内置实测档案 (${modelName})` };
  }
  const auto = {
    model: modelName,
    generator: "auto-name-resolver",
    joints: stored ? { ...autoJoints, ...stored.joints } : autoJoints,
    axes: {},
    missing: missing || []
  };
  const storedNote = stored ? "（含人工 joints 修正）" : "";
  return {
    profile: auto,
    source: "auto",
    reason: `无档案，纯名称解析${storedNote}——可播放配方为 0，请先 __calibrateProfile 校准`
  };
}
const TEST_ANGLE = 0.5;
function sampleJointSignatures(skeleton, joints, testAngle = TEST_ANGLE) {
  var _a;
  const signatures = {};
  const errors = [];
  const bones = (skeleton == null ? void 0 : skeleton.bones) || [];
  const findBone = (name) => bones.find((b) => b.name === name);
  const updateMatrices = () => {
    var _a2, _b;
    try {
      (_a2 = skeleton.computeAbsoluteMatrices) == null ? void 0 : _a2.call(skeleton, true);
    } catch (_) {
      try {
        (_b = skeleton.computeAbsoluteMatrices) == null ? void 0 : _b.call(skeleton);
      } catch (_2) {
      }
    }
  };
  for (const joint of Object.keys(joints)) {
    const boneName = joints[joint];
    const bone = findBone(boneName);
    if (!bone) {
      errors.push(`${joint}: 骨骼 "${boneName}" 不存在`);
      continue;
    }
    let tipBone = null;
    try {
      const children = bone.getChildren ? bone.getChildren() : bone.children || [];
      tipBone = children.find((c) => typeof c.getAbsolutePosition === "function") || null;
    } catch (_) {
      tipBone = (bone.children || []).find((c) => typeof c.getAbsolutePosition === "function") || null;
    }
    if (!tipBone) {
      errors.push(`${joint}: 骨骼 "${boneName}" 无可用子骨骼作末端观测点，跳过`);
      continue;
    }
    updateMatrices();
    let before;
    try {
      before = tipBone.getAbsolutePosition().clone();
    } catch (e) {
      errors.push(`${joint}: 读取末端绝对位置失败 (${(e == null ? void 0 : e.message) || e})`);
      continue;
    }
    let boneHead;
    try {
      boneHead = bone.getAbsolutePosition();
    } catch (_) {
      boneHead = null;
    }
    const boneLen = boneHead ? Math.sqrt((before.x - boneHead.x) ** 2 + (before.y - boneHead.y) ** 2 + (before.z - boneHead.z) ** 2) : 0;
    let prevQuat = null;
    try {
      prevQuat = ((_a = bone.getRotationQuaternion(Space.LOCAL)) == null ? void 0 : _a.clone()) ?? null;
    } catch (_) {
      prevQuat = null;
    }
    let originalPos = null;
    try {
      originalPos = bone.getLocalMatrix().getTranslation().clone();
    } catch (_) {
      originalPos = null;
    }
    const samples = [];
    for (const axis of ["x", "y", "z"]) {
      const rx = axis === "x" ? testAngle : 0;
      const ry = axis === "y" ? testAngle : 0;
      const rz = axis === "z" ? testAngle : 0;
      try {
        const quat = Quaternion.FromEulerAngles(rx, ry, rz);
        bone.setRotationQuaternion(quat, Space.LOCAL);
        if (originalPos)
          bone.setPosition(originalPos, Space.LOCAL);
        updateMatrices();
        const after = tipBone.getAbsolutePosition();
        const dx = after.x - before.x;
        const dy = after.y - before.y;
        const dz = after.z - before.z;
        const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
        samples.push({ axis, dx, dy, dz, mag, relMag: boneLen > 1e-6 ? mag / boneLen : 0 });
      } catch (e) {
        errors.push(`${joint}.${axis}: 采样失败 (${(e == null ? void 0 : e.message) || e})`);
      } finally {
        try {
          if (prevQuat)
            bone.setRotationQuaternion(prevQuat, Space.LOCAL);
          else
            bone.setRotationQuaternion(Quaternion.Identity(), Space.LOCAL);
          if (originalPos)
            bone.setPosition(originalPos, Space.LOCAL);
          updateMatrices();
        } catch (_) {
        }
      }
    }
    signatures[joint] = { joint, bone: boneName, tipBone: tipBone.name || null, boneLen, samples };
  }
  return { signatures, errors };
}
function signaturesToReviewJson(result) {
  const out = {};
  for (const [joint, sig] of Object.entries(result.signatures)) {
    const s = sig;
    out[joint] = {
      bone: s.bone,
      tip: s.tipBone,
      boneLen: Number(s.boneLen.toFixed(4)),
      axes: Object.fromEntries(
        s.samples.map((sp) => [
          sp.axis,
          { d: [+sp.dx.toFixed(4), +sp.dy.toFixed(4), +sp.dz.toFixed(4)], rel: +sp.relMag.toFixed(3) }
        ])
      )
    };
  }
  out._errors = result.errors;
  return out;
}
const DEFAULT_CHAIN_PARAMS = {
  stiffness: 0.35,
  drag: 0.82,
  gravity: -0.9,
  inertia: 0.85
};
const MAX_STEP_ANGLE = 0.96;
class SpringChainSolver {
  constructor() {
    __publicField(this, "chains", []);
    __publicField(this, "wind", { enabled: false, amp: 0 });
  }
  setWind(enabled, amp) {
    this.wind = { enabled, amp };
  }
  /** build 阶段：从骨骼链构建质点链（bind pose 世界坐标） */
  addChain(id, group, boneInfos, params) {
    if (boneInfos.length < 2)
      return;
    const particles = [];
    let prevPos = null;
    for (const bi of boneInfos) {
      const p = {
        pos: bi.pos.clone(),
        prev: bi.pos.clone(),
        restLen: prevPos ? Vector3.Distance(prevPos, bi.pos) : 0,
        restDir: Vector3.Zero(),
        boneName: bi.name,
        baseLocal: bi.baseLocal.clone(),
        parentName: bi.parentName
      };
      particles.push(p);
      prevPos = bi.pos.clone();
    }
    for (let i = 1; i < particles.length; i++) {
      const d = particles[i].pos.subtract(particles[i - 1].pos);
      if (d.length() > 1e-6) {
        d.normalize();
        particles[i].restDir = d;
      } else {
        particles[i].restDir = new Vector3(0, -1, 0);
      }
    }
    this.chains.push({ id, group, rootBoneName: boneInfos[0].name, particles, params: { ...DEFAULT_CHAIN_PARAMS, ...params } });
  }
  get chainCount() {
    return this.chains.length;
  }
  /** 链根锚点骨骼名（根质点钉在它的实时世界坐标） */
  getRootAnchorBoneName(chainId) {
    const c = this.chains.find((x) => x.id === chainId);
    return c ? c.rootBoneName : null;
  }
  clear() {
    this.chains = [];
  }
  /** 每帧求解：Verlet 积分 → 距离约束松弛 → restDir→当前方向 输出世界旋转（钳制） */
  step(dtRaw, rootPositions, gravityDir) {
    const dt = Math.max(8e-3, Math.min(0.033, dtRaw));
    const out = /* @__PURE__ */ new Map();
    for (const chain of this.chains) {
      const p = chain.particles;
      const root = rootPositions.get(chain.id);
      if (root) {
        p[0].pos.copyFrom(root);
        p[0].prev.copyFrom(root);
      }
      for (let i = 1; i < p.length; i++) {
        const cur = p[i];
        const vel = cur.pos.subtract(cur.prev).scale(chain.params.drag);
        cur.prev.copyFrom(cur.pos);
        let wind = Vector3.Zero();
        if (this.wind.enabled) {
          const t = performance.now() / 1e3;
          wind = new Vector3(Math.sin(t * 1.2 + i) * this.wind.amp * 0.6, 0, Math.cos(t * 0.9 + i * 0.7) * this.wind.amp * 0.3);
        }
        const acc = gravityDir.scale(chain.params.gravity).add(wind);
        cur.pos = cur.pos.add(vel).add(acc.scale(dt * dt * 60));
      }
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 1; i < p.length; i++) {
          const a = p[i - 1], b = p[i];
          const d = b.pos.subtract(a.pos);
          const len = d.length();
          if (len < 1e-6)
            continue;
          const diff = (len - b.restLen) / len;
          b.pos = b.pos.subtract(d.scale(diff * (iter === 0 ? 1 : chain.params.stiffness)));
        }
      }
      for (let i = 1; i < p.length; i++) {
        const par = p[i - 1], cur = p[i];
        const dirW = cur.pos.subtract(par.pos);
        if (dirW.length() < 1e-6)
          continue;
        dirW.normalize();
        const dot = Math.max(-1, Math.min(1, Vector3.Dot(cur.restDir, dirW)));
        const axis = Vector3.Cross(cur.restDir, dirW);
        if (axis.length() < 1e-6) {
          out.set(cur.boneName, dot > 0.999 ? Quaternion.Identity() : Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.min(MAX_STEP_ANGLE, Math.PI)));
        } else {
          let ang = Math.acos(dot);
          if (ang > MAX_STEP_ANGLE)
            ang = MAX_STEP_ANGLE;
          out.set(cur.boneName, Quaternion.RotationAxis(axis.normalize(), ang));
        }
      }
    }
    return out;
  }
}
const WAVE_RIGHT = {
  id: "wave_right_v7",
  name: "挥手（右）",
  durationMs: 3400,
  loop: false,
  tracks: [
    // 起始段 0-500ms：上臂 Z-43°、肘 Z-66°（竖前臂）
    { joint: "rightUpperArm", semantic: "lift", keys: [{ t: 0, deg: 0 }, { t: 500, deg: 43 }] },
    { joint: "rightLowerArm", semantic: "bend", keys: [{ t: 0, deg: 0 }, { t: 500, deg: 66 }] },
    // 主体段 500-2900ms：捩 Y±31° + 腕 Z±29°（1.2Hz，肩肘锁定不变）
    { joint: "rightLowerArm", semantic: "twist", keys: [
      { t: 500, deg: 0 },
      { t: 1e3, deg: 31 },
      { t: 1500, deg: -31 },
      { t: 2e3, deg: 31 },
      { t: 2500, deg: -31 },
      { t: 2900, deg: 0 }
    ] },
    { joint: "rightHand", semantic: "side", keys: [
      { t: 500, deg: 0 },
      { t: 1e3, deg: 29 },
      { t: 1500, deg: -29 },
      { t: 2e3, deg: 29 },
      { t: 2500, deg: -29 },
      { t: 2900, deg: 0 }
    ] },
    // 收尾段 2900-3400ms：全轴回零
    { joint: "rightUpperArm", semantic: "lift", keys: [{ t: 2900, deg: 43 }, { t: 3400, deg: 0 }] },
    { joint: "rightLowerArm", semantic: "bend", keys: [{ t: 2900, deg: 66 }, { t: 3400, deg: 0 }] }
  ]
};
const STD_RECIPES = {
  [WAVE_RIGHT.id]: WAVE_RIGHT
};
function getStdRecipe(id) {
  return STD_RECIPES[id];
}
const BONE_DEBUG = true;
function analyzeSkeleton(rootMesh) {
  try {
    let skeleton = null;
    const allMeshes = [];
    const traverse = (node) => {
      if (!node)
        return;
      if (node.skeleton) {
        skeleton = node.skeleton;
        allMeshes.push(node);
      }
      if (node.getChildMeshes) {
        const children = node.getChildMeshes();
        for (const child of children)
          traverse(child);
      }
    };
    traverse(rootMesh);
    if (!skeleton) {
      if (BONE_DEBUG)
        console.warn("[BoneAnalyzer] 未找到 skeleton，PMX 可能未正确解析骨骼");
      return null;
    }
    const bones = skeleton.bones || [];
    const boneNames = bones.map((b) => b.name || "(unnamed)");
    const rootBones = bones.filter((b) => !b.getParent || b.getParent() === null).map((b) => b.name);
    const swingKeywords = [
      // 头发（柔性，符合角色设计）
      "hair",
      "髪",
      "发",
      "前髪",
      "後ろ髪",
      "後髪",
      "サイド髪",
      "横髪",
      // 裙摆/衣摆（柔性）
      "skirt",
      "スカート",
      "裾",
      "裙",
      "摆",
      "hem",
      // 尾巴（柔性，参考 Unity Dynamic Bone 处理方式）
      // 注意：'尾' 单字会误匹配 '尾骨'(coccyx)，需在尾巴识别时排除
      // 修复：增加'weiba'（尾巴拼音），部分PMX模型用拼音命名（如Bn_weiba001）
      "tail",
      "尾",
      "尻尾",
      "しっぽ",
      "尾巴",
      "weiba"
    ];
    const swingCandidates = boneNames.filter(
      (name) => swingKeywords.some((kw) => (name || "").toLowerCase().includes(kw.toLowerCase()))
    );
    if (BONE_DEBUG) {
      console.log(`[BoneAnalyzer] 所有骨骼名(${boneNames.length}):`, boneNames);
      const tailCandidates = boneNames.filter((name) => {
        const lower = (name || "").toLowerCase();
        return lower.includes("tail") || lower.includes("尾") || lower.includes("尻尾") || lower.includes("しっぽ");
      });
      console.log(`[BoneAnalyzer] 尾巴候选骨骼:`, tailCandidates);
    }
    const armKeywords = ["arm", "腕", "肩", "shoulder", "elbow", "肘", "hand", "手"];
    const armBones = boneNames.filter(
      (name) => armKeywords.some((kw) => (name || "").toLowerCase().includes(kw.toLowerCase()))
    );
    const spineKeywords = ["spine", "upper", "lower", "chest", "waist", "腰", "胸", "上半身", "下半身"];
    const spineBones = boneNames.filter(
      (name) => spineKeywords.some((kw) => (name || "").toLowerCase().includes(kw.toLowerCase()))
    );
    if (BONE_DEBUG) {
      console.log(`[BoneAnalyzer] 总骨骼:${bones.length} 摆动候选:${swingCandidates.length} 手臂:${armBones.length} 脊椎:${spineBones.length}`);
    }
    return { skeleton, boneCount: bones.length, boneNames, rootBones, swingCandidates, armBones, spineBones };
  } catch (err) {
    console.error("[BoneAnalyzer] 骨骼解析失败（降级运行）:", err);
    return null;
  }
}
function measureBoneFrame(rootMesh) {
  var _a, _b;
  try {
    const analysis = analyzeSkeleton(rootMesh);
    if (!((_b = (_a = analysis == null ? void 0 : analysis.skeleton) == null ? void 0 : _a.bones) == null ? void 0 : _b.length))
      return null;
    const bones = analysis.skeleton.bones;
    const posOf = (b) => {
      try {
        if (b == null ? void 0 : b.getAbsolutePosition)
          return b.getAbsolutePosition();
        if (b == null ? void 0 : b.getAbsoluteMatrix)
          return b.getAbsoluteMatrix().getTranslation();
      } catch {
      }
      return null;
    };
    const findBone = (keys) => bones.find((b) => {
      const n = (b == null ? void 0 : b.name) || "";
      return keys.some((k) => n === k || n.includes(k));
    });
    const head = findBone(["頭", "头", "head", "Head"]);
    const feet = [
      findBone(["左つま先", "つま先", "toe"]),
      findBone(["右つま先"]),
      findBone(["左足首", "足首", "ankle"]),
      findBone(["右足首"]),
      findBone(["左足", "足D"]),
      findBone(["右足"])
    ].filter(Boolean);
    const xs = [];
    const zs = [];
    let minY = Infinity;
    let maxY = -Infinity;
    const push = (p) => {
      if (!p || typeof p.y !== "number")
        return;
      if (p.y < minY)
        minY = p.y;
      if (p.y > maxY)
        maxY = p.y;
      if (typeof p.x === "number")
        xs.push(p.x);
      if (typeof p.z === "number")
        zs.push(p.z);
    };
    const headPos = head && posOf(head);
    if (headPos)
      push(headPos);
    for (const f of feet)
      push(posOf(f));
    if (!isFinite(minY) || !isFinite(maxY) || maxY - minY < 1) {
      minY = Infinity;
      maxY = -Infinity;
      xs.length = 0;
      zs.length = 0;
      for (const b of bones)
        push(posOf(b));
    }
    if (!isFinite(minY) || !isFinite(maxY))
      return null;
    const height = maxY - minY;
    if (!(height > 3 && height < 300))
      return null;
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      height,
      minY,
      maxY,
      centerX: xs.length ? avg(xs) : 0,
      centerZ: zs.length ? avg(zs) : 0
    };
  } catch {
    return null;
  }
}
function verifySkinning(skeleton) {
  try {
    if (!skeleton || !skeleton.bones || skeleton.bones.length === 0)
      return false;
    const bone0 = skeleton.bones[0];
    if (bone0 && bone0.getAbsoluteTransform) {
      const mat = bone0.getAbsoluteTransform();
      if (mat) {
        if (BONE_DEBUG)
          console.log("[BoneAnalyzer] 蒙皮验证: 骨骼 absoluteTransform 存在，蒙皮驱动正常");
        return true;
      }
    }
    if (BONE_DEBUG)
      console.warn("[BoneAnalyzer] 蒙皮验证: 骨骼 absoluteTransform 不存在，蒙皮可能未生效");
    return false;
  } catch (err) {
    console.warn("[BoneAnalyzer] 蒙皮验证失败:", err);
    return false;
  }
}
function boneNameMatches(name, keywords) {
  const lower = (name || "").toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}
function detectSide(name) {
  const n = name || "";
  if (n.includes("左") || /\bleft\b/i.test(n) || /\bL\b/i.test(n))
    return "left";
  if (n.includes("右") || /\bright\b/i.test(n) || /\bR\b/i.test(n))
    return "right";
  return null;
}
const JOINT_SPEED_GROUPS = [
  { match: ["頭", "head", "首", "neck"], comfortDegPerSec: 144, hardDegPerSec: 480 },
  // [v97] ×1.2 保速
  { match: ["上半身", "upper", "chest", "脊椎", "spine", "下半身", "腰", "waist"], comfortDegPerSec: 108, hardDegPerSec: 360 },
  // [v97] ×1.2 保速
  { match: ["肩", "shoulder"], comfortDegPerSec: 300, hardDegPerSec: 840 },
  // [v97] ×1.2 保速
  { match: ["ひじ", "肘", "elbow", "下腕"], comfortDegPerSec: 360, hardDegPerSec: 900 },
  // [v97] ×1.2 保速
  { match: ["手首", "wrist", "腕"], comfortDegPerSec: 264, hardDegPerSec: 600 },
  // [v97] ×1.2 保速
  { match: ["もも", "大腿", "thigh", "すね", "小腿", "knee", "膝", "足首", "ankle", "足", "foot", "leg"], comfortDegPerSec: 240, hardDegPerSec: 960 },
  // [v97] ×1.2 保速
  // [v97] 手指组：短细高频（decorative 通道，超速 clamp 不影响主干）
  { match: ["指", "thumb", "index", "middle", "ring", "little"], comfortDegPerSec: 576, hardDegPerSec: 1440 }
  // [v97] ×1.2 保速
];
function jointSpeedGroupOf(name) {
  for (const g of JOINT_SPEED_GROUPS) {
    if (boneNameMatches(name, g.match))
      return g;
  }
  return null;
}
const TIMING_PRESETS = {
  normal: { prep: 0.14, mainW: 0.48, followW: 0.16 },
  quick: { prep: 0.06, mainW: 0.6, followW: 0.1 },
  smooth: { prep: 0.2, mainW: 0.44, followW: 0.2 }
};
function phaseEnvOf(timing) {
  const pr = TIMING_PRESETS[timing] || TIMING_PRESETS.normal;
  const m0 = pr.prep, m1 = pr.prep + pr.mainW, f1 = m1 + pr.followW;
  return (t) => {
    if (t < m0)
      return -0.12 * Math.sin(Math.PI * t / m0);
    if (t < m1) {
      const u2 = (t - m0) / pr.mainW;
      return u2 * u2 * (3 - 2 * u2);
    }
    if (t < f1) {
      const u2 = (t - m1) / pr.followW;
      return 1 + 0.05 * Math.sin(Math.PI * u2);
    }
    const u = (t - f1) / (1 - f1);
    return 1 - u * u * (3 - 2 * u);
  };
}
function findChildBoneByKeyword(startBone, keywords, maxDepth = 3) {
  try {
    const queue = [{ bone: startBone, depth: 0 }];
    while (queue.length > 0) {
      const { bone, depth } = queue.shift();
      if (depth > maxDepth)
        continue;
      const children = bone.getChildren ? bone.getChildren() : bone.children || [];
      for (const child of children) {
        if (child && child.name && boneNameMatches(child.name, keywords)) {
          return child;
        }
        queue.push({ bone: child, depth: depth + 1 });
      }
    }
  } catch (e) {
  }
  return null;
}
function findParentBoneByKeyword(startBone, keywords, maxDepth = 3) {
  try {
    let current = startBone.getParent ? startBone.getParent() : startBone.parent || null;
    let depth = 0;
    while (current && depth < maxDepth) {
      if (current.name && boneNameMatches(current.name, keywords)) {
        return current;
      }
      current = current.getParent ? current.getParent() : current.parent || null;
      depth++;
    }
  } catch (e) {
  }
  return null;
}
function buildHumanBody(skeleton) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  try {
    if (!skeleton || !skeleton.bones || skeleton.bones.length === 0) {
      if (BONE_DEBUG)
        console.warn("[HumanBody] skeleton 为空或无骨骼");
      return null;
    }
    const allBones = skeleton.bones;
    const spine = {};
    spine.root = allBones.find((b) => boneNameMatches(b.name, ["全ての親", "腰", "root", "center"])) || void 0;
    spine.lowerSpine = allBones.find((b) => boneNameMatches(b.name, ["下半身", "lower spine", "waist", "lower body"])) || void 0;
    spine.upperSpine = (allBones.find((b) => boneNameMatches(b.name, ["上半身", "upper spine", "chest", "upper body"])) && !boneNameMatches(((_a = spine.root) == null ? void 0 : _a.name) || "", ["chest"]) ? allBones.find((b) => boneNameMatches(b.name, ["上半身", "upper spine", "upper body"])) : void 0) || void 0;
    spine.chest = allBones.find((b) => boneNameMatches(b.name, ["上半身2", "chest", "胸"])) || void 0;
    spine.neck = allBones.find((b) => boneNameMatches(b.name, ["首", "neck"])) || void 0;
    spine.head = allBones.find((b) => boneNameMatches(b.name, ["頭", "head"])) || void 0;
    const upperArmCandidates = allBones.filter((b) => {
      const name = (b.name || "").toLowerCase();
      if (name.includes("指") || name.includes("finger") || name.includes("thumb"))
        return false;
      if (name.includes("手首") || name.includes("wrist") || name.includes("hand"))
        return false;
      if (name.includes("下腕") || name.includes("lower arm") || name.includes("lowerarm") || name.includes("elbow") || name.includes("肘") || name.includes("ひじ"))
        return false;
      if (name.includes("捩") || name.includes("twist"))
        return false;
      if (name.includes("ik"))
        return false;
      const isUpperArm = name.includes("腕") || name.includes("上腕") || name.includes("upper arm") || name.includes("upperarm") || name.includes("arm");
      return isUpperArm;
    });
    if (BONE_DEBUG) {
      console.log(`[HumanBody] 上臂候选(${upperArmCandidates.length}): ${upperArmCandidates.map((b) => b.name).join(", ")}`);
    }
    let leftArm = null;
    let rightArm = null;
    let leftScore = -Infinity;
    let rightScore = -Infinity;
    const scoreUpperArm = (bone) => {
      const name = (bone == null ? void 0 : bone.name) || "";
      let score = 0;
      if (boneNameMatches(name, ["上腕", "upper arm", "upperarm"]))
        score += 10;
      if (boneNameMatches(name, ["腕"]))
        score += 5;
      if (boneNameMatches(name, ["arm"]))
        score += 3;
      if (boneNameMatches(name, ["肩", "shoulder", "collar"]))
        score -= 5;
      const children = (bone == null ? void 0 : bone.getChildren) ? bone.getChildren() : (bone == null ? void 0 : bone.children) || [];
      if (children && children.length > 0)
        score += 2;
      return score;
    };
    for (const upperArm of upperArmCandidates) {
      const side = detectSide(upperArm.name);
      if (!side) {
        if (BONE_DEBUG)
          console.log(`[HumanBody] 跳过上臂候选（无法判断左右）: ${upperArm.name}`);
        continue;
      }
      const candidateScore = scoreUpperArm(upperArm);
      if (side === "left" && candidateScore <= leftScore)
        continue;
      if (side === "right" && candidateScore <= rightScore)
        continue;
      const shoulder = findParentBoneByKeyword(upperArm, ["肩", "shoulder", "collar", "clavicle"], 2);
      const lowerArm = findChildBoneByKeyword(upperArm, ["下腕", "lower arm", "lowerarm", "elbow", "肘", "ひじ"], 2);
      const hand = lowerArm ? findChildBoneByKeyword(lowerArm, ["手首", "hand", "wrist"], 2) : findChildBoneByKeyword(upperArm, ["手首", "hand", "wrist"], 3);
      let positionValid = true;
      try {
        const upperY = (_d = (_c = (_b = upperArm._absoluteBindMatrix) == null ? void 0 : _b.getTranslation) == null ? void 0 : _c.call(_b)) == null ? void 0 : _d.y;
        const lowerY = lowerArm ? (_g = (_f = (_e = lowerArm._absoluteBindMatrix) == null ? void 0 : _e.getTranslation) == null ? void 0 : _f.call(_e)) == null ? void 0 : _g.y : void 0;
        if (upperY !== void 0 && lowerY !== void 0 && upperY <= lowerY) {
          positionValid = false;
        }
      } catch (e) {
      }
      if (BONE_DEBUG) {
        console.log(`[HumanBody] ${side}臂识别: 上臂="${upperArm.name}" 肩="${(shoulder == null ? void 0 : shoulder.name) || "无"}" 下臂="${(lowerArm == null ? void 0 : lowerArm.name) || "无"}" 手="${(hand == null ? void 0 : hand.name) || "无"}" 评分=${candidateScore} 位置${positionValid ? "有效" : "无效"}`);
      }
      let fingers;
      if (hand) {
        const fingerMap = [
          ["thumb", ["親指", "thumb"]],
          ["index", ["人指", "index", "示指"]],
          ["middle", ["中指", "middle"]],
          ["ring", ["薬指", "ring"]],
          ["pinky", ["小指", "pinky", "little"]]
        ];
        for (const [key, kws] of fingerMap) {
          const fb = findChildBoneByKeyword(hand, kws, 3);
          if (fb) {
            fingers = fingers || {};
            fingers[key] = fb;
          }
        }
      }
      const arm = { side, shoulder: shoulder || void 0, upperArm, lowerArm: lowerArm || void 0, hand: hand || void 0, fingers };
      if (side === "left") {
        leftArm = arm;
        leftScore = candidateScore;
      } else {
        rightArm = arm;
        rightScore = candidateScore;
      }
    }
    const legs = buildHumanLegs(skeleton);
    const humanBody = { spine, leftArm, rightArm, leftLeg: legs.left, rightLeg: legs.right };
    const spineFound = ["root", "lowerSpine", "upperSpine", "chest", "neck", "head"].filter((k) => !!spine[k]).length;
    const fingersL = ((_h = humanBody.leftArm) == null ? void 0 : _h.fingers) ? Object.keys(humanBody.leftArm.fingers).length : 0;
    const fingersR = ((_i = humanBody.rightArm) == null ? void 0 : _i.fingers) ? Object.keys(humanBody.rightArm.fingers).length : 0;
    console.log("[HumanBodyV2] 脊椎链:" + spineFound + "/6 左臂:" + (humanBody.leftArm ? "✓" : "✗") + " 右臂:" + (humanBody.rightArm ? "✓" : "✗") + " 左腿:" + (humanBody.leftLeg ? "✓" : "✗") + " 右腿:" + (humanBody.rightLeg ? "✓" : "✗") + " 手指(L" + fingersL + "/R" + fingersR + ")" + (humanBody.leftLeg ? " 左腿链=" + [humanBody.leftLeg.upperLeg, humanBody.leftLeg.lowerLeg, humanBody.leftLeg.foot, humanBody.leftLeg.toe].filter(Boolean).map((b) => b.name).join("→") : ""));
    if (BONE_DEBUG) {
      const armInfo = (arm) => arm ? `${arm.upperArm.name}` : "无";
      console.log(`[HumanBody] 左臂:${armInfo(leftArm)} 右臂:${armInfo(rightArm)}`);
    }
    return humanBody;
  } catch (err) {
    console.error("[HumanBody] 构建失败（降级运行）:", err);
    return null;
  }
}
function buildHumanLegs(skeleton) {
  const result = { left: null, right: null };
  try {
    if (!skeleton || !skeleton.bones || skeleton.bones.length === 0)
      return result;
    const allBones = skeleton.bones;
    const stdLeg = (side) => {
      const p = side === "left" ? "左" : "右";
      const thigh = allBones.find((b) => (b.name || "") === p + "足");
      if (!thigh)
        return null;
      const knee = findChildBoneByKeyword(thigh, ["ひざ", "膝", "knee", "calf", "すね"], 1);
      const ankle = knee ? findChildBoneByKeyword(knee, ["足首", "ankle"], 1) : null;
      const toe = ankle ? findChildBoneByKeyword(ankle, ["つま先", "足指", "toe"], 1) : null;
      const hip = findParentBoneByKeyword(thigh, ["腰", "下半身", "hip", "pelvis"], 2);
      return { side, hip: hip || void 0, upperLeg: thigh, lowerLeg: knee || void 0, foot: ankle || void 0, toe: toe || void 0 };
    };
    const stdL = stdLeg("left");
    const stdR = stdLeg("right");
    if (stdL || stdR) {
      result.left = stdL;
      result.right = stdR;
      if (BONE_DEBUG) {
        console.log("[HumanLegs][std直配] 左腿:" + (stdL ? stdL.upperLeg.name + "/" + (stdL.lowerLeg ? stdL.lowerLeg.name : "无膝") : "无") + " 右腿:" + (stdR ? stdR.upperLeg.name + "/" + (stdR.lowerLeg ? stdR.lowerLeg.name : "无膝") : "无"));
      }
      return result;
    }
    const upperLegCandidates = allBones.filter((b) => {
      const name = (b.name || "").toLowerCase();
      if (name.includes("足首") || name.includes("ankle"))
        return false;
      if (name.includes("足指") || name.includes("toe") || name.includes("toes"))
        return false;
      if (name.includes("膝") || name.includes("knee"))
        return false;
      if (name.includes("指") || name.includes("finger"))
        return false;
      if (name.includes("ik") || name.includes("dummy"))
        return false;
      if (name.includes("小腿"))
        return false;
      return name.includes("足") || name.includes("腿") || name.includes("leg") || name.includes("thigh") || name.includes("もも") || name.includes("大腿") || name.includes("upleg") || name.includes("upperleg");
    });
    const scoreLeg = (bone) => {
      const name = ((bone == null ? void 0 : bone.name) || "").toLowerCase();
      let score = 0;
      if (name.includes("thigh") || name.includes("upper leg") || name.includes("upperleg") || name.includes("upleg") || name.includes("大腿") || name.includes("もも"))
        score += 10;
      if (name.includes("leg"))
        score += 3;
      if (name.includes("足"))
        score += 2;
      return score;
    };
    let left = null, right = null;
    let leftScore = -Infinity, rightScore = -Infinity;
    for (const bone of upperLegCandidates) {
      const side = detectSide(bone.name);
      if (!side)
        continue;
      const score = scoreLeg(bone);
      if (side === "left" && score <= leftScore)
        continue;
      if (side === "right" && score <= rightScore)
        continue;
      const hip = findParentBoneByKeyword(bone, ["腰", "hip", "pelvis", "下半身", "groin"], 2);
      const lowerLeg = findChildBoneByKeyword(bone, ["膝", "knee", "lower leg", "lowerleg", "calf", "脛", "すね", "leg", "小腿", "ひざ"], 2);
      const foot = lowerLeg ? findChildBoneByKeyword(lowerLeg, ["足首", "ankle", "foot"], 2) : findChildBoneByKeyword(bone, ["足首", "ankle", "foot"], 3);
      const toe = foot ? findChildBoneByKeyword(foot, ["足指", "toe", "toes", "趾"], 2) : null;
      const leg = { side, hip: hip || void 0, upperLeg: bone, lowerLeg: lowerLeg || void 0, foot: foot || void 0, toe: toe || void 0 };
      if (side === "left") {
        left = leg;
        leftScore = score;
      } else {
        right = leg;
        rightScore = score;
      }
    }
    result.left = left;
    result.right = right;
    if (BONE_DEBUG) {
      console.log("[HumanLegs] 左腿:" + (left ? left.upperLeg.name : "无") + " 右腿:" + (right ? right.upperLeg.name : "无"));
    }
  } catch (e) {
  }
  return result;
}
const JOINT_KEYWORDS = [
  // 头颈
  "頭",
  "首",
  "neck",
  "head",
  // 脊椎
  "上半身",
  "下半身",
  "上半身2",
  "胸",
  "腰",
  "spine",
  "chest",
  "waist",
  "upper body",
  "lower body",
  // 肩
  "肩",
  "shoulder",
  "collar",
  "clavicle",
  // 上臂/下臂/手腕
  "腕",
  "上腕",
  "下腕",
  "肘",
  "ひじ",
  "arm",
  "elbow",
  "wrist",
  "手首",
  // 手指
  "指",
  "finger",
  "thumb",
  "hand",
  // 下肢（v48 补充：thigh/calf/upleg 覆盖 Unity Humanoid / Mixamo 命名）
  "足",
  "脚",
  "leg",
  "hip",
  "pelvis",
  "thigh",
  "calf",
  "shin",
  "upleg",
  "upperleg",
  "大腿",
  "小腿",
  // 膝/踝/趾（v55 补：もも/ひざ 覆盖 MMD 日文标准大腿/膝命名）
  "膝",
  "knee",
  "もも",
  "ひざ",
  "足首",
  "ankle",
  "足指",
  "toe",
  "toes"
];
const POSITION_LOCK_KEYWORDS = [
  "全ての親",
  "操作中心",
  "センター",
  "グルーブ",
  // MMD 根/中心骨骼
  "root",
  "center",
  "groove",
  // 英文对应
  "IK",
  // IK 骨骼（避免冲突）
  "dummy",
  "view"
  // 辅助骨骼
];
function isJointBone(name) {
  const n = (name || "").toLowerCase();
  if (!n)
    return false;
  for (const kw of POSITION_LOCK_KEYWORDS) {
    if (n.includes(kw.toLowerCase()))
      return false;
  }
  for (const kw of JOINT_KEYWORDS) {
    if (n.includes(kw.toLowerCase()))
      return true;
  }
  return false;
}
function isPositionLockedBone(name) {
  const n = (name || "").toLowerCase();
  if (!n)
    return false;
  for (const kw of POSITION_LOCK_KEYWORDS) {
    if (n.includes(kw.toLowerCase()))
      return true;
  }
  return false;
}
function isTailByParentChain(bone) {
  try {
    let parent = bone.getParent ? bone.getParent() : bone.parent;
    let depth = 0;
    while (parent && depth < 10) {
      const pName = (parent.name || "").toLowerCase();
      const pIsTailBone = pName.includes("tail") || pName.includes("尾") || pName.includes("尻尾") || pName.includes("しっぽ");
      const pIsTailExcluded = pName.includes("尾骨") || pName.includes("coccyx") || pName.includes("tailbone") || pName.includes("ik");
      if (pIsTailBone && !pIsTailExcluded) {
        return true;
      }
      parent = parent.getParent ? parent.getParent() : parent.parent;
      depth++;
    }
  } catch (e) {
  }
  return false;
}
function hasHairKeyword(name) {
  const n = (name || "").toLowerCase();
  return n.includes("hair") || n.includes("髪") || n.includes("发") || n.includes("前髪") || n.includes("後ろ髪") || n.includes("後髪") || n.includes("サイド髪") || n.includes("横髪");
}
const DEFAULT_JOINT_LIMIT = {
  xMin: -Math.PI * 0.6,
  xMax: Math.PI * 0.6,
  // ±108°
  yMin: -Math.PI * 0.6,
  yMax: Math.PI * 0.6,
  zMin: -Math.PI * 0.6,
  zMax: Math.PI * 0.6
};
const SPECIAL_JOINT_LIMITS = [
  // 头部：点头/摇头幅度有限
  { keywords: ["頭", "head"], limit: { xMin: -0.7, xMax: 0.5, yMin: -0.9, yMax: 0.9, zMin: -0.4, zMax: 0.4 } },
  // 颈：比头更受限
  { keywords: ["首", "neck"], limit: { xMin: -0.5, xMax: 0.4, yMin: -0.7, yMax: 0.7, zMin: -0.3, zMax: 0.3 } },
  // 肩胛骨（肩P/肩C）：Z轴 ±38°（+8° 调整，原 ±30°），其他轴严格限制
  // 必须放在"肩"通用条目之前，避免被通用条目覆盖
  { keywords: ["肩P", "肩C", "shoulderP", "shoulderC"], limit: { xMin: -0.3, xMax: 0.3, yMin: -0.3, yMax: 0.3, zMin: -0.663, zMax: 0.663 } },
  // 肩通用（外展/前屈）：X轴 ±98°（前屈并集），Z轴 ±188°（外展并集），+8° 调整
  // 覆盖左/右肩外展和前屈的并集范围，Y轴保守
  { keywords: ["肩", "shoulder"], limit: { xMin: -1.71, xMax: 1.71, yMin: -0.5, yMax: 0.5, zMin: -3.284, zMax: 3.284 } },
  // 肘：只能单方向弯曲（人肘不能反向）
  { keywords: ["肘", "ひじ", "elbow"], limit: { xMin: 0, xMax: 2.2, yMin: -0.3, yMax: 0.3, zMin: -0.5, zMax: 0.5 } },
  // 膝：只能向后弯
  { keywords: ["膝", "knee"], limit: { xMin: 0, xMax: 2, yMin: -0.2, yMax: 0.2, zMin: -0.3, zMax: 0.3 } },
  // 手指：弯曲范围
  { keywords: ["指", "finger", "thumb"], limit: { xMin: 0, xMax: 1.8, yMin: -0.3, yMax: 0.3, zMin: -0.5, zMax: 0.5 } }
];
function getJointLimit(name) {
  const n = (name || "").toLowerCase();
  for (const special of SPECIAL_JOINT_LIMITS) {
    if (special.keywords.some((kw) => n.includes(kw.toLowerCase()))) {
      return special.limit;
    }
  }
  return DEFAULT_JOINT_LIMIT;
}
function isWithinJointLimit(rotation, limit) {
  return rotation.x >= limit.xMin && rotation.x <= limit.xMax && rotation.y >= limit.yMin && rotation.y <= limit.yMax && rotation.z >= limit.zMin && rotation.z <= limit.zMax;
}
function safeRotateJoint(bone, rotation, source = "unknown", collisionContext) {
  var _a;
  if (!bone) {
    console.warn(`[JointControl:${source}] 骨骼为空，拒绝`);
    return false;
  }
  const boneName = bone.name || "(unnamed)";
  const isMocap = source === "dongbu";
  if (isMocap) {
    try {
      window.__lastMocapAt = Date.now();
    } catch {
    }
  }
  if (!isJointBone(boneName)) {
    if (!isMocap)
      console.warn(`[JointControl:${source}] 拒绝旋转非关节骨骼: "${boneName}"`);
    return false;
  }
  if (isPositionLockedBone(boneName)) {
    console.warn(`[JointControl:${source}] 拒绝操作位置锁死骨骼: "${boneName}"`);
    return false;
  }
  if (!isMocap) {
    const limit = getJointLimit(boneName);
    if (!isWithinJointLimit(rotation, limit)) {
      console.warn(`[JointControl:${source}] 拒绝旋转 "${boneName}"：超出生理极限 (x:${rotation.x.toFixed(2)}, y:${rotation.y.toFixed(2)}, z:${rotation.z.toFixed(2)}) 极限:(x:[${limit.xMin.toFixed(2)},${limit.xMax.toFixed(2)}] y:[${limit.yMin.toFixed(2)},${limit.yMax.toFixed(2)}] z:[${limit.zMin.toFixed(2)},${limit.zMax.toFixed(2)}])`);
      return false;
    }
  }
  let prevQuat = null;
  try {
    prevQuat = ((_a = bone.getRotationQuaternion(Space.LOCAL)) == null ? void 0 : _a.clone()) ?? null;
  } catch (e) {
    prevQuat = null;
  }
  try {
    const localMatrix = bone.getLocalMatrix();
    const originalPos = localMatrix.getTranslation();
    const quat = Quaternion.FromEulerAngles(rotation.x, rotation.y, rotation.z);
    bone.setRotationQuaternion(quat, Space.LOCAL);
    bone.setPosition(originalPos, Space.LOCAL);
    const restoredPos = bone.getLocalMatrix().getTranslation();
    const posDelta = Math.abs(restoredPos.x - originalPos.x) + Math.abs(restoredPos.y - originalPos.y) + Math.abs(restoredPos.z - originalPos.z);
    if (posDelta > 1e-3) {
      console.error(`[JointControl:${source}] "${boneName}" 位置异常变化! 原始=(${originalPos.x.toFixed(3)},${originalPos.y.toFixed(3)},${originalPos.z.toFixed(3)}) 恢复=(${restoredPos.x.toFixed(3)},${restoredPos.y.toFixed(3)},${restoredPos.z.toFixed(3)})`);
      return false;
    }
    if (!isMocap && collisionContext && collisionContext.bodies.length > 0) {
      const computeIntersections = () => {
        var _a2, _b, _c, _d;
        try {
          (_b = (_a2 = collisionContext.skeleton).computeAbsoluteMatrices) == null ? void 0 : _b.call(_a2, true);
        } catch (e) {
          try {
            (_d = (_c = collisionContext.skeleton).computeAbsoluteMatrices) == null ? void 0 : _d.call(_c);
          } catch (_) {
          }
        }
        const posLookup = buildSkeletonPosLookup(collisionContext.skeleton);
        const runtimes = buildCollisionRuntimes(collisionContext.bodies, posLookup);
        return detectJointCollision(runtimes.spheres, runtimes.capsules);
      };
      let baselinePairs;
      try {
        baselinePairs = new Set(computeIntersections().map((x) => `${x.a}|${x.b}`));
      } catch (e) {
        baselinePairs = /* @__PURE__ */ new Set();
      }
      const intersections = computeIntersections().filter((x) => !baselinePairs.has(`${x.a}|${x.b}`));
      if (intersections.length > 0) {
        if (prevQuat) {
          try {
            bone.setRotationQuaternion(prevQuat, Space.LOCAL);
          } catch (e) {
          }
          try {
            bone.setPosition(originalPos, Space.LOCAL);
          } catch (e) {
          }
        }
        console.warn(`[JointControl:${source}] 拒绝旋转 "${boneName}"：新增 ${intersections.length} 处碰撞，已回滚（首条：${intersections[0].reason}）`);
        return false;
      }
    }
    if (BONE_DEBUG) {
      console.log(`[JointControl:${source}] ✓ "${boneName}" 旋转 (x:${rotation.x.toFixed(2)}, y:${rotation.y.toFixed(2)}, z:${rotation.z.toFixed(2)}) 位置不变${collisionContext ? " 碰撞检测通过" : ""}`);
    }
    return true;
  } catch (err) {
    console.error(`[JointControl:${source}] "${boneName}" 旋转异常:`, err);
    return false;
  }
}
function listJointsAndNonJoints(skeleton) {
  if (!skeleton || !skeleton.bones)
    return { joints: [], nonJoints: [], locked: [] };
  const joints = [];
  const nonJoints = [];
  const locked = [];
  for (const bone of skeleton.bones) {
    const name = bone.name || "(unnamed)";
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
function closestPointOnSegment(p, a, b) {
  const ab = b.subtract(a);
  const ap = p.subtract(a);
  const abLenSq = ab.lengthSquared();
  if (abLenSq < 1e-8)
    return a.clone();
  let t = Vector3.Dot(ap, ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  return a.add(ab.scale(t));
}
function pushOutOfSphere(point, sphereCenter, radius) {
  const diff = point.subtract(sphereCenter);
  const dist = diff.length();
  if (dist >= radius || dist < 1e-6)
    return Vector3.Zero();
  const pushDist = radius - dist;
  return diff.normalize().scale(pushDist);
}
function pushOutOfCapsule(point, capA, capB, radius) {
  const closest = closestPointOnSegment(point, capA, capB);
  return pushOutOfSphere(point, closest, radius);
}
function capsulesIntersect(a1, a2, rA, b1, b2, rB) {
  const SAMPLES = 6;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = a1.add(a2.subtract(a1).scale(t));
    if (pushOutOfCapsule(p, b1, b2, rB).lengthSquared() > 0)
      return true;
  }
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = b1.add(b2.subtract(b1).scale(t));
    if (pushOutOfCapsule(p, a1, a2, rA).lengthSquared() > 0)
      return true;
  }
  return false;
}
function sphereCapsuleIntersect(center, radius, capA, capB, capR) {
  return pushOutOfCapsule(center, capA, capB, capR + radius).lengthSquared() > 0;
}
function autoCreateCollisionBodies(skeleton) {
  const bodies = [];
  if (!skeleton || !skeleton.bones)
    return bodies;
  let idCounter = 0;
  const nextId = () => `col_${++idCounter}`;
  const findBone = (keywords) => {
    for (const bone of skeleton.bones) {
      const name = (bone.name || "").toLowerCase();
      if (keywords.some((kw) => name.includes(kw.toLowerCase())))
        return bone;
    }
    return null;
  };
  const findBoneBySide = (keywords, side) => {
    const sideMarkers = side === "left" ? ["左", "l", "left"] : ["右", "r", "right"];
    for (const bone of skeleton.bones) {
      const name = (bone.name || "").toLowerCase();
      if (!keywords.some((kw) => name.includes(kw.toLowerCase())))
        continue;
      if (sideMarkers.some((sm) => name.includes(sm.toLowerCase())))
        return bone;
    }
    return null;
  };
  const getBonePos = (bone) => {
    var _a;
    if (!bone)
      return null;
    const m = bone._absoluteBindMatrix || ((_a = bone.getAbsoluteMatrix) == null ? void 0 : _a.call(bone));
    if (!m)
      return null;
    const t = m.getTranslation();
    if (!t)
      return null;
    return new Vector3(t.x, t.y, t.z);
  };
  const headBone = findBone(["頭", "head"]);
  const ankleBone = findBone(["足首", "ankle"]);
  const headPos = getBonePos(headBone);
  const anklePos = getBonePos(ankleBone);
  let modelHeight = 1.6;
  if (headPos && anklePos) {
    modelHeight = Math.abs(headPos.y - anklePos.y);
    if (modelHeight < 0.5)
      modelHeight = 1.6;
  }
  const R = {
    head: modelHeight * 0.085,
    // 头部（原0.065）
    neck: modelHeight * 0.04,
    // 颈部（原0.03）
    chest: modelHeight * 0.145,
    // 胸部（原0.11，重点防护头发穿模）
    waist: modelHeight * 0.13,
    // 腰部（原0.10）
    hip: modelHeight * 0.14,
    // 盆骨（原0.11）
    upperArm: modelHeight * 0.055,
    // 上臂（原0.035）
    lowerArm: modelHeight * 0.05,
    // 下臂（原0.030）
    thigh: modelHeight * 0.095,
    // 大腿（原0.07）
    calf: modelHeight * 0.08,
    // 小腿（原0.055）
    hand: modelHeight * 0.065,
    // 手掌（原0.045）
    foot: modelHeight * 0.075
    // 脚掌（原0.05）
  };
  console.log(`[Collision] 模型身高:${modelHeight.toFixed(2)} 比例:头${R.head.toFixed(3)} 胸${R.chest.toFixed(3)} 臂${R.upperArm.toFixed(3)} 腿${R.thigh.toFixed(3)}`);
  if (headBone) {
    bodies.push({
      id: nextId(),
      type: "sphere",
      group: "head",
      side: "center",
      boneName: headBone.name,
      radius: R.head,
      offset: new Vector3(0, modelHeight * 0.025, 0)
    });
  }
  const neckBone = findBone(["首", "neck"]);
  if (neckBone && headBone) {
    bodies.push({
      id: nextId(),
      type: "capsule",
      group: "spine",
      side: "center",
      boneAName: neckBone.name,
      boneBName: headBone.name,
      radius: R.neck
    });
  }
  const upperBody = findBone(["上半身", "upper body", "chest"]);
  const waist = findBone(["腰", "waist"]);
  const lowerBody = findBone(["下半身", "lower body"]);
  if (upperBody && waist) {
    bodies.push({
      id: nextId(),
      type: "capsule",
      group: "spine",
      side: "center",
      boneAName: upperBody.name,
      boneBName: waist.name,
      radius: R.chest
    });
  }
  if (waist && lowerBody && waist.name !== lowerBody.name) {
    bodies.push({
      id: nextId(),
      type: "capsule",
      group: "spine",
      side: "center",
      boneAName: waist.name,
      boneBName: lowerBody.name,
      radius: R.waist
    });
  }
  for (const side of ["left", "right"]) {
    const shoulder = findBoneBySide(["肩", "shoulder", "clavicle"], side);
    const upperArm = findBoneBySide(["腕", "arm"], side);
    const elbow = findBoneBySide(["肘", "ひじ", "elbow"], side);
    const wrist = findBoneBySide(["手首", "wrist", "hand"], side);
    if (shoulder && elbow) {
      bodies.push({
        id: nextId(),
        type: "capsule",
        group: "arm",
        side,
        boneAName: shoulder.name,
        boneBName: elbow.name,
        radius: R.upperArm
      });
    } else if (upperArm && elbow) {
      bodies.push({
        id: nextId(),
        type: "capsule",
        group: "arm",
        side,
        boneAName: upperArm.name,
        boneBName: elbow.name,
        radius: R.upperArm
      });
    }
    if (elbow && wrist) {
      bodies.push({
        id: nextId(),
        type: "capsule",
        group: "arm",
        side,
        boneAName: elbow.name,
        boneBName: wrist.name,
        radius: R.lowerArm
      });
    }
    if (wrist) {
      bodies.push({
        id: nextId(),
        type: "sphere",
        group: "hand",
        side,
        boneName: wrist.name,
        radius: R.hand
      });
    }
  }
  for (const side of ["left", "right"]) {
    const leg = findBoneBySide(["足", "leg", "腿"], side);
    const knee = findBoneBySide(["膝", "knee"], side);
    const ankle = findBoneBySide(["足首", "ankle"], side);
    if (leg && knee) {
      bodies.push({
        id: nextId(),
        type: "capsule",
        group: "leg",
        side,
        boneAName: leg.name,
        boneBName: knee.name,
        radius: R.thigh
      });
    }
    if (knee && ankle) {
      bodies.push({
        id: nextId(),
        type: "capsule",
        group: "leg",
        side,
        boneAName: knee.name,
        boneBName: ankle.name,
        radius: R.calf
      });
    }
    if (ankle) {
      bodies.push({
        id: nextId(),
        type: "sphere",
        group: "foot",
        side,
        boneName: ankle.name,
        radius: R.foot,
        offset: new Vector3(0, 0, modelHeight * 0.02)
      });
    }
  }
  console.log(`[Collision] 创建 ${bodies.length} 个碰撞体: ${bodies.map((b) => b.type === "sphere" ? `${b.group}(${b.side})` : `${b.group}(${b.side})`).join(" ")}`);
  return bodies;
}
function buildSkeletonPosLookup(skeleton) {
  var _a;
  const lookup = /* @__PURE__ */ new Map();
  if (!skeleton || !skeleton.bones)
    return lookup;
  for (const bone of skeleton.bones) {
    try {
      const m = (_a = bone.getAbsoluteMatrix) == null ? void 0 : _a.call(bone);
      if (m) {
        const t = m.getTranslation();
        if (t)
          lookup.set(bone.name, new Vector3(t.x, t.y, t.z));
      }
    } catch (e) {
    }
  }
  return lookup;
}
function buildCollisionRuntimes(bodies, posLookup) {
  const spheres = [];
  const capsules = [];
  for (const body of bodies) {
    if (body.type === "sphere") {
      const center = posLookup.get(body.boneName);
      if (!center)
        continue;
      const c = body.offset ? center.add(body.offset) : center;
      spheres.push({
        id: body.id,
        group: body.group,
        side: body.side,
        center: c,
        radius: body.radius
      });
    } else {
      const a = posLookup.get(body.boneAName);
      const b = posLookup.get(body.boneBName);
      if (!a || !b)
        continue;
      const pa = body.offsetA ? a.add(body.offsetA) : a;
      const pb = body.offsetB ? b.add(body.offsetB) : b;
      capsules.push({
        id: body.id,
        group: body.group,
        side: body.side,
        pointA: pa,
        pointB: pb,
        radius: body.radius
      });
    }
  }
  return { spheres, capsules };
}
function resolveCollisionForPoint(bonePos, spheres, capsules) {
  let resolved = bonePos.clone();
  for (const s of spheres) {
    const push = pushOutOfSphere(resolved, s.center, s.radius);
    if (push.lengthSquared() > 0)
      resolved = resolved.add(push);
  }
  for (const c of capsules) {
    const push = pushOutOfCapsule(resolved, c.pointA, c.pointB, c.radius);
    if (push.lengthSquared() > 0)
      resolved = resolved.add(push);
  }
  return resolved;
}
function detectJointCollision(spheres, capsules, ignoreGroups = []) {
  const intersections = [];
  const shouldIgnore = (g1, g2) => {
    for (const [a, b] of ignoreGroups) {
      if (a === g1 && b === g2 || a === g2 && b === g1)
        return true;
    }
    if (g1 === g2)
      return true;
    const adjacent = [
      ["spine", "head"],
      // 颈-头
      ["spine", "arm"],
      // 躯干-上臂
      ["arm", "arm"],
      // 上臂-下臂（同组忽略）
      ["leg", "leg"]
    ];
    for (const [a, b] of adjacent) {
      if (a === g1 && b === g2 || a === g2 && b === g1)
        return true;
    }
    return false;
  };
  for (let i = 0; i < spheres.length; i++) {
    for (let j = i + 1; j < spheres.length; j++) {
      if (shouldIgnore(spheres[i].group, spheres[j].group))
        continue;
      const dist = Vector3.Distance(spheres[i].center, spheres[j].center);
      if (dist < spheres[i].radius + spheres[j].radius) {
        intersections.push({
          a: spheres[i].id,
          b: spheres[j].id,
          reason: `球(${spheres[i].group}/${spheres[i].side}) 与 球(${spheres[j].group}/${spheres[j].side}) 相交`
        });
      }
    }
  }
  for (const s of spheres) {
    for (const c of capsules) {
      if (shouldIgnore(s.group, c.group))
        continue;
      if (sphereCapsuleIntersect(s.center, s.radius, c.pointA, c.pointB, c.radius)) {
        intersections.push({
          a: s.id,
          b: c.id,
          reason: `球(${s.group}/${s.side}) 与 胶囊(${c.group}/${c.side}) 相交`
        });
      }
    }
  }
  for (let i = 0; i < capsules.length; i++) {
    for (let j = i + 1; j < capsules.length; j++) {
      if (shouldIgnore(capsules[i].group, capsules[j].group))
        continue;
      if (capsulesIntersect(
        capsules[i].pointA,
        capsules[i].pointB,
        capsules[i].radius,
        capsules[j].pointA,
        capsules[j].pointB,
        capsules[j].radius
      )) {
        intersections.push({
          a: capsules[i].id,
          b: capsules[j].id,
          reason: `胶囊(${capsules[i].group}/${capsules[i].side}) 与 胶囊(${capsules[j].group}/${capsules[j].side}) 相交`
        });
      }
    }
  }
  return intersections;
}
function createCollisionDebugMeshes(scene, bodies, posLookup) {
  const meshes = [];
  const colors = {
    head: new Color3(1, 0.4, 0.4),
    // 红
    spine: new Color3(0.4, 1, 0.4),
    // 绿
    arm: new Color3(0.4, 0.6, 1),
    // 蓝
    leg: new Color3(1, 0.8, 0.4),
    // 黄
    hand: new Color3(1, 0.4, 1),
    // 紫
    foot: new Color3(0.4, 1, 1)
    // 青
  };
  for (const body of bodies) {
    const color = colors[body.group];
    if (body.type === "sphere") {
      const center = posLookup.get(body.boneName);
      if (!center)
        continue;
      const c = body.offset ? center.add(body.offset) : center;
      const sphere = MeshBuilder.CreateSphere(`col_debug_${body.id}`, {
        diameter: body.radius * 2,
        segments: 8
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
      if (!a || !b)
        continue;
      const pa = body.offsetA ? a.add(body.offsetA) : a;
      const pb = body.offsetB ? b.add(body.offsetB) : b;
      const mid = pa.add(pb).scale(0.5);
      const dir = pb.subtract(pa);
      const length = dir.length();
      if (length < 1e-4)
        continue;
      const capsule = MeshBuilder.CreateCapsule(`col_debug_${body.id}`, {
        radius: body.radius,
        height: length + body.radius * 2,
        tessellation: 8
      }, scene);
      capsule.position = mid;
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
  return meshes;
}
const PMX_MORPH_TYPE_BONE = 2;
function diagnosePmxResource(rootMesh) {
  try {
    const metadata = rootMesh == null ? void 0 : rootMesh.metadata;
    if (!metadata || !metadata.isMmdModel)
      return;
    const morphs = metadata.morphs || [];
    const boneMorphs = morphs.filter((m) => m.type === PMX_MORPH_TYPE_BONE);
    console.log(`[PmxDiagnose] morph:${morphs.length} boneMorph:${boneMorphs.length} 骨骼:${(metadata.bones || []).length}`);
  } catch (err) {
    console.warn("[PmxDiagnose] 诊断失败:", err);
  }
}
function applyNaturalArmPose(skeleton, humanBody) {
  if (!skeleton || !skeleton.bones || skeleton.bones.length === 0) {
    return 0;
  }
  try {
    skeleton.computeAbsoluteMatrices(true);
    const ARMPIT_ANGLE = Math.PI / 12;
    if (!humanBody || !humanBody.leftArm && !humanBody.rightArm) {
      console.warn("[ArmPose] humanBody 无手臂骨骼映射，跳过");
      return 0;
    }
    let count = 0;
    const processArm = (arm, expectedSide) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      if (!arm || !arm.upperArm) {
        console.warn(`[ArmPose] ${expectedSide}臂: 无 upperArm`);
        return;
      }
      const upperArm = arm.upperArm;
      const children = upperArm.getChildren ? upperArm.getChildren() : upperArm.children || [];
      if (!children || children.length === 0) {
        console.warn(`[ArmPose] ${expectedSide}臂 "${upperArm.name}" 无子骨骼`);
        return;
      }
      const childBone = arm.lowerArm || children[0];
      if (!childBone) {
        console.warn(`[ArmPose] ${expectedSide}臂 "${upperArm.name}" 无方向参考骨骼`);
        return;
      }
      const bonePos = ((_b = (_a = upperArm._absoluteBindMatrix) == null ? void 0 : _a.getTranslation) == null ? void 0 : _b.call(_a)) || ((_d = (_c = upperArm.getAbsoluteMatrix) == null ? void 0 : _c.call(upperArm)) == null ? void 0 : _d.getTranslation());
      const childPos = ((_f = (_e = childBone._absoluteBindMatrix) == null ? void 0 : _e.getTranslation) == null ? void 0 : _f.call(_e)) || ((_h = (_g = childBone.getAbsoluteMatrix) == null ? void 0 : _g.call(childBone)) == null ? void 0 : _h.getTranslation());
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
      const currentAngle = Math.atan2(dy, dx);
      const isOnPositiveX = bonePos.x > 0;
      const targetAngle = isOnPositiveX ? -Math.PI / 2 + ARMPIT_ANGLE : -Math.PI / 2 - ARMPIT_ANGLE;
      let rotateAngle = targetAngle - currentAngle;
      while (rotateAngle > Math.PI)
        rotateAngle -= 2 * Math.PI;
      while (rotateAngle < -Math.PI)
        rotateAngle += 2 * Math.PI;
      const currentDeg = (currentAngle * 180 / Math.PI).toFixed(1);
      const targetDeg = (targetAngle * 180 / Math.PI).toFixed(1);
      const rotateDeg = (rotateAngle * 180 / Math.PI).toFixed(1);
      const sideLabel = isOnPositiveX ? "+X侧" : "-X侧";
      console.log(`[ArmPose] ${expectedSide}臂(${sideLabel}) "${upperArm.name}" 当前:${currentDeg}° 目标:${targetDeg}° 需旋转:${rotateDeg}°`);
      if (Math.abs(rotateAngle) < 0.05) {
        console.log(`[ArmPose] ${expectedSide}臂 旋转角度过小，跳过`);
        return;
      }
      const success = safeRotateJoint(upperArm, { x: 0, y: 0, z: rotateAngle }, "ArmPose");
      if (success) {
        count++;
        console.log(`[ArmPose] ✓ ${expectedSide}臂 "${upperArm.name}" 旋转 ${rotateDeg}° 留 15° 夹角（位置不变）`);
      } else {
        console.warn(`[ArmPose] ${expectedSide}臂 "${upperArm.name}" 旋转被安全通道拒绝`);
      }
    };
    processArm(humanBody.leftArm, "left");
    processArm(humanBody.rightArm, "right");
    skeleton.computeAbsoluteMatrices(true);
    console.log(`[ArmPose] 完成，旋转 ${count} 个骨骼（二次元游戏风格：咯肢窝留 15° 夹角）`);
    return count;
  } catch (err) {
    console.error("[ArmPose] 失败:", err);
    return 0;
  }
}
const extractRelativePath = (textureWebkitPath, modelWebkitPath) => {
  const normTex = textureWebkitPath.replace(/\\/g, "/");
  const normModel = modelWebkitPath.replace(/\\/g, "/");
  const lastSlash = normModel.lastIndexOf("/");
  if (lastSlash < 0) {
    return normTex;
  }
  const modelDir = normModel.substring(0, lastSlash + 1);
  if (normTex.toLowerCase().startsWith(modelDir.toLowerCase())) {
    return normTex.substring(modelDir.length);
  }
  return normTex;
};
const BabylonModelViewer = ({
  modelData,
  onClose,
  physicsEnabled = true,
  windEnabled = true,
  desktopPetMode = false,
  onModelLoaded,
  onModelError
}) => {
  const canvasRef = reactExports.useRef(null);
  const engineRef = reactExports.useRef(null);
  const sceneRef = reactExports.useRef(null);
  const cameraRef = reactExports.useRef(null);
  const currentModelRef = reactExports.useRef(null);
  const objectUrlRef = reactExports.useRef(null);
  const loadAbortRef = reactExports.useRef(null);
  const onCloseRef = reactExports.useRef(onClose);
  reactExports.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const swingBonesRef = reactExports.useRef([]);
  const swingObserverRef = reactExports.useRef(null);
  const collisionBodiesRef = reactExports.useRef([]);
  const collisionDebugMeshesRef = reactExports.useRef([]);
  const breathObserverRef = reactExports.useRef(null);
  const doubleTapObserverRef = reactExports.useRef(null);
  const humanBodyRef = reactExports.useRef(null);
  const analysisRef = reactExports.useRef(null);
  const animStateRef = reactExports.useRef({ action: "idle", startTime: 0, duration: 0, breathBaseRot: null, actionBones: [] });
  const animQueueRef = reactExports.useRef([]);
  const animLayersRef = reactExports.useRef([]);
  const lastObsNowRef = reactExports.useRef(0);
  const restPoseRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const loadingRef = reactExports.useRef(false);
  const prevScalingRef = reactExports.useRef(null);
  const physicsOnRef = reactExports.useRef(physicsEnabled);
  const mmdRuntimeRef = reactExports.useRef(null);
  const mmdModelRef = reactExports.useRef(null);
  const physicsReadyRef = reactExports.useRef(false);
  const screenSizeRef = reactExports.useRef(null);
  const lastIgnoreMouseRef = reactExports.useRef(null);
  const modelSizeRef = reactExports.useRef(null);
  const baseRadiusRef = reactExports.useRef(0);
  const baseWindowSizeRef = reactExports.useRef({ width: 400, height: 600 });
  const wallpaperFrameRef = reactExports.useRef(null);
  const wallpaperReframeTimerRef = reactExports.useRef(null);
  const zoomScaleRef = reactExports.useRef(1);
  const targetScaleRef = reactExports.useRef(1);
  const scaleAnimRef = reactExports.useRef(null);
  const radiusRestoreRef = reactExports.useRef(null);
  const clampZoomRef = reactExports.useRef(null);
  const isDraggingRef = reactExports.useRef(false);
  const pendingResizeRef = reactExports.useRef(null);
  const pendingRadiusRef = reactExports.useRef(null);
  const modelInitTimerRef = reactExports.useRef(null);
  const dragLastXRef = reactExports.useRef(0);
  const lastResizeSendRef = reactExports.useRef(0);
  const dragLastYRef = reactExports.useRef(0);
  const lastMoveSendRef = reactExports.useRef(0);
  const dragStartXRef = reactExports.useRef(0);
  const dragStartYRef = reactExports.useRef(0);
  const rightClickMovedRef = reactExports.useRef(false);
  const rightClickDownPosRef = reactExports.useRef({ x: 0, y: 0 });
  const rightButtonDownRef = reactExports.useRef(false);
  const [showContextMenu, setShowContextMenu] = reactExports.useState(false);
  const [physicsOn, setPhysicsOn] = reactExports.useState(physicsEnabled);
  const showContextMenuRef = reactExports.useRef(false);
  const [menuPos, setMenuPos] = reactExports.useState({ x: 0, y: 0 });
  const [showActionPanel, setShowActionPanel] = reactExports.useState(false);
  const renderStateRef = reactExports.useRef("animating");
  const lastInteractTimeRef = reactExports.useRef(0);
  const lastFrameTimeRef = reactExports.useRef(0);
  const rafIdRef = reactExports.useRef(null);
  const renderTierRef = reactExports.useRef("active");
  const beginRenderLoopRef = reactExports.useRef(null);
  const offRenderModeRef = reactExports.useRef(null);
  const offJointCmdRef = reactExports.useRef(null);
  const [initError, setInitError] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(false);
  const [loadModelError, setLoadModelError] = reactExports.useState(null);
  const [physicsStatus, setPhysicsStatus] = reactExports.useState("未启用");
  reactExports.useEffect(() => {
    var _a, _b, _c, _d;
    if (!canvasRef.current)
      return;
    try {
      const canvas = canvasRef.current;
      const engineOptions = {
        preserveDrawingBuffer: true,
        stencil: true,
        disableWebGL2Support: false
      };
      if (desktopPetMode) {
        engineOptions.alpha = true;
        engineOptions.disableWebGL2Support = true;
      }
      const engine = new Engine(canvas, true, engineOptions, true);
      engineRef.current = engine;
      const scene = new Scene(engine);
      sceneRef.current = scene;
      window.__babylonScene = scene;
      scene.clearColor = desktopPetMode ? new Color4(0, 0, 0, 0) : new Color4(0.1, 0.1, 0.1, 1);
      if (desktopPetMode) {
        try {
          const gl = engine._gl;
          if (gl) {
            const attrs = gl.getContextAttributes();
            console.log("[BabylonModelViewer][透明诊断] WebGL ctx attrs: " + JSON.stringify({
              alpha: attrs == null ? void 0 : attrs.alpha,
              premultipliedAlpha: attrs == null ? void 0 : attrs.premultipliedAlpha,
              antialias: attrs == null ? void 0 : attrs.antialias,
              preserveDrawingBuffer: attrs == null ? void 0 : attrs.preserveDrawingBuffer
            }));
          } else {
            console.warn("[BabylonModelViewer][透明诊断] engine._gl 不存在，无法验证上下文属性");
          }
          console.log("[BabylonModelViewer][透明诊断] canvas 尺寸: " + canvas.width + "x" + canvas.height + " offset: " + canvas.offsetWidth + "x" + canvas.offsetHeight + " renderSize: " + engine.getRenderWidth() + "x" + engine.getRenderHeight());
          console.log("[BabylonModelViewer][透明诊断] scene.clearColor: " + JSON.stringify(((_b = (_a = scene.clearColor) == null ? void 0 : _a.asArray) == null ? void 0 : _b.call(_a)) || null));
        } catch (diagErr) {
          console.warn("[BabylonModelViewer][透明诊断] 诊断失败:", diagErr);
        }
      }
      const camera = new ArcRotateCamera(
        "camera",
        Math.PI / 2,
        Math.PI / 2,
        15,
        new Vector3(0, 2, 0),
        scene
      );
      camera.attachControl(canvas, true);
      camera.inertia = 0.25;
      const pointerInput = camera.inputs.attached.pointers;
      if (pointerInput && pointerInput.buttons !== void 0) {
        pointerInput.buttons = [0];
      }
      if (camera.inputs.attached.pointers) {
        camera.inputs.attached.pointers.panningSensibility = 0;
      }
      camera.inputs.attached.keyboard.detachControl();
      camera.lowerRadiusLimit = 0.5;
      camera.upperRadiusLimit = 100;
      camera.lowerBetaLimit = 0.1;
      camera.upperBetaLimit = Math.PI - 0.1;
      if (desktopPetMode) {
        camera.wheelDeltaPercentage = 0;
        camera.pinchDeltaPercentage = 0;
        camera.wheelPrecision = 1e10;
        try {
          const wheelInput = (_c = camera.inputs.attached) == null ? void 0 : _c.mousewheel;
          if (wheelInput) {
            wheelInput.detachControl();
            camera.inputs.remove(wheelInput);
          }
        } catch {
        }
        try {
          const pinchInput = (_d = camera.inputs.attached) == null ? void 0 : _d.pinch;
          if (pinchInput) {
            pinchInput.detachControl();
            camera.inputs.remove(pinchInput);
          }
        } catch {
        }
        camera.inertia = 0;
        const origRadiusDescriptor = Object.getOwnPropertyDescriptor(camera, "radius") || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(camera), "radius");
        if (origRadiusDescriptor && origRadiusDescriptor.set) {
          const origSet = origRadiusDescriptor.set;
          let lockedRadius = camera.radius;
          Object.defineProperty(camera, "radius", {
            get: () => lockedRadius,
            set: (v) => {
              if (isDraggingRef.current) {
                return;
              }
              lockedRadius = v;
              if (origSet)
                origSet.call(camera, v);
            },
            configurable: true
          });
          radiusRestoreRef.current = () => {
            if (origRadiusDescriptor) {
              Object.defineProperty(camera, "radius", origRadiusDescriptor);
            }
          };
        }
        const camAny = camera;
        camAny._inertialRadiusOffset = 0;
        camAny._inertialAlphaOffset = 0;
        camAny._inertialBetaOffset = 0;
      } else {
      }
      cameraRef.current = camera;
      const keyLight = new DirectionalLight("keyLight", new Vector3(-0.5, -1, -0.5).normalize(), scene);
      keyLight.intensity = 1;
      keyLight.diffuse = new Color3(1, 0.98, 0.95);
      keyLight.position = new Vector3(10, 20, 10);
      const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.15;
      hemiLight.diffuse = new Color3(0.8, 0.8, 0.85);
      hemiLight.groundColor = new Color3(0.15, 0.15, 0.18);
      if (!desktopPetMode) {
        const ground = MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
        const groundMat = new StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new Color3(0.16, 0.16, 0.16);
        groundMat.specularColor = new Color3(0.01, 0.01, 0.01);
        ground.material = groundMat;
        ground.position.y = -2;
        ground.receiveShadows = true;
        const grid = MeshBuilder.CreateGround("grid", { width: 20, height: 20, subdivisions: 20 }, scene);
        const gridMat = new StandardMaterial("gridMat", scene);
        gridMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
        gridMat.wireframe = true;
        gridMat.alpha = 0.3;
        grid.material = gridMat;
        grid.position.y = -1.99;
        ground.freezeWorldMatrix();
        grid.freezeWorldMatrix();
      }
      if (!desktopPetMode) {
        const pipeline = new DefaultRenderingPipeline("default", true, scene, [camera]);
        pipeline.imageProcessing.toneMappingEnabled = true;
        pipeline.imageProcessing.toneMappingType = 0;
        pipeline.imageProcessing.exposure = 1;
        pipeline.fxaaEnabled = true;
        pipeline.fxaa.samples = 4;
        pipeline.bloomEnabled = false;
        pipeline.sharpenEnabled = false;
      } else {
        console.log("[BabylonModelViewer][桌宠] 跳过 DefaultRenderingPipeline（alpha:true 兼容）");
      }
      if (desktopPetMode && window.desktopPet) {
        window.desktopPet.getScreenSize().then((s) => {
          if (s)
            screenSizeRef.current = {
              screenWidth: s.screenWidth,
              screenHeight: s.screenHeight,
              workWidth: s.workWidth,
              workHeight: s.workHeight,
              scaleFactor: s.scaleFactor
            };
        }).catch(() => {
        });
      }
      clampZoomRef.current = null;
      if (desktopPetMode) {
        scene.onPointerObservable.add((info) => {
          var _a2, _b2;
          if (info.type !== PointerEventTypes.POINTERMOVE)
            return;
          if (info.event && info.event.buttons === 1) {
            lastInteractTimeRef.current = performance.now();
          }
          if (!currentModelRef.current)
            return;
          if (isDraggingRef.current)
            return;
          if (showContextMenuRef.current) {
            if (lastIgnoreMouseRef.current !== false) {
              lastIgnoreMouseRef.current = false;
              try {
                (_a2 = window.desktopPet) == null ? void 0 : _a2.setIgnoreMouse(false);
              } catch {
              }
            }
            return;
          }
          const pickResult = scene.pick(scene.pointerX, scene.pointerY);
          const shouldIgnore = !(pickResult == null ? void 0 : pickResult.hit);
          if (shouldIgnore !== lastIgnoreMouseRef.current) {
            lastIgnoreMouseRef.current = shouldIgnore;
            try {
              (_b2 = window.desktopPet) == null ? void 0 : _b2.setIgnoreMouse(shouldIgnore);
            } catch {
            }
          }
        });
      }
      let lastAppliedW = 0, lastAppliedH = 0;
      const applyZoom = (scale) => {
        var _a2;
        const base = baseWindowSizeRef.current;
        if (!base || base.width <= 0 || base.height <= 0)
          return;
        const screen = screenSizeRef.current;
        const maxH = (screen == null ? void 0 : screen.workHeight) || 1080;
        const minW = 96, minH = 96;
        const maxW = (screen == null ? void 0 : screen.workWidth) || 1536;
        const newW = Math.max(minW, Math.min(maxW, Math.round(base.width * scale)));
        const newH = Math.max(minH, Math.min(maxH, Math.round(base.height * scale)));
        if (newW === lastAppliedW && newH === lastAppliedH)
          return;
        lastAppliedW = newW;
        lastAppliedH = newH;
        const rzNow = performance.now();
        if (!lastResizeSendRef.current || rzNow - lastResizeSendRef.current >= 16) {
          lastResizeSendRef.current = rzNow;
          try {
            (_a2 = window.desktopPet) == null ? void 0 : _a2.resizeWindow(newW, newH);
          } catch {
          }
        }
      };
      const startScaleAnim = () => {
        if (scaleAnimRef.current !== null)
          return;
        const step = () => {
          if (isDraggingRef.current) {
            scaleAnimRef.current = requestAnimationFrame(step);
            return;
          }
          const target = targetScaleRef.current;
          const current = zoomScaleRef.current;
          const diff = target - current;
          if (Math.abs(diff) < 5e-3) {
            zoomScaleRef.current = target;
            applyZoom(target);
            scaleAnimRef.current = null;
            return;
          }
          zoomScaleRef.current = current + diff * 0.2;
          applyZoom(zoomScaleRef.current);
          scaleAnimRef.current = requestAnimationFrame(step);
        };
        scaleAnimRef.current = requestAnimationFrame(step);
      };
      const zoomBy = (factor) => {
        if (isDraggingRef.current) {
          console.log("[诊断][zoomBy] 拖拽中，跳过缩放");
          return;
        }
        console.log("[诊断][zoomBy] factor=" + factor + " target=" + targetScaleRef.current + "->" + targetScaleRef.current * factor);
        let newTarget = targetScaleRef.current * factor;
        const base = baseWindowSizeRef.current;
        const screen = screenSizeRef.current;
        const maxH = (screen == null ? void 0 : screen.workHeight) || 1080;
        const maxScaleH = base.height > 0 ? maxH / base.height : 3;
        const maxScaleW = base.width > 0 ? ((screen == null ? void 0 : screen.workWidth) || 1536) / base.width : 3;
        const maxScale = Math.min(maxScaleH, maxScaleW);
        const minScaleW = base.width > 0 ? 96 / base.width : 0.2;
        const minScaleH = base.height > 0 ? 96 / base.height : 0.2;
        const minScale = Math.max(minScaleW, minScaleH);
        newTarget = Math.max(minScale, Math.min(newTarget, maxScale));
        if (Math.abs(newTarget - targetScaleRef.current) < 5e-3)
          return;
        targetScaleRef.current = newTarget;
        startScaleAnim();
      };
      const handleWheel = (e) => {
        if (!desktopPetMode)
          return;
        lastInteractTimeRef.current = performance.now();
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
      window.addEventListener("wheel", handleWheel, { capture: true, passive: false });
      const handlePointerDown = (e) => {
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
          rightClickDownPosRef.current = { x: e.screenX, y: e.screenY };
          rightClickMovedRef.current = false;
          dragStartXRef.current = e.screenX;
          dragStartYRef.current = e.screenY;
          dragLastXRef.current = e.screenX;
          dragLastYRef.current = e.screenY;
          rightButtonDownRef.current = true;
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      };
      window.addEventListener("pointerdown", handlePointerDown, { capture: true });
      const handlePointerMove = (e) => {
        var _a2, _b2;
        if (e.buttons === 2 && desktopPetMode && !isDraggingRef.current && rightButtonDownRef.current) {
          const startDx = e.screenX - dragStartXRef.current;
          const startDy = e.screenY - dragStartYRef.current;
          if (Math.abs(startDx) <= 3 && Math.abs(startDy) <= 3)
            return;
          isDraggingRef.current = true;
          rightClickMovedRef.current = true;
          lastInteractTimeRef.current = performance.now();
          try {
            (_a2 = window.desktopPet) == null ? void 0 : _a2.setResizeFrozen(true);
          } catch {
          }
          if (cameraRef.current) {
            const cam = cameraRef.current;
            cam._inertialRadiusOffset = 0;
            cam._inertialAlphaOffset = 0;
            cam._inertialBetaOffset = 0;
          }
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch {
          }
        }
        if (isDraggingRef.current) {
          lastInteractTimeRef.current = performance.now();
          const now = performance.now();
          if (now - lastMoveSendRef.current >= 16) {
            const deltaX = e.screenX - dragLastXRef.current;
            const deltaY = e.screenY - dragLastYRef.current;
            if (deltaX !== 0 || deltaY !== 0) {
              dragLastXRef.current = e.screenX;
              dragLastYRef.current = e.screenY;
              const totalDx = e.screenX - dragStartXRef.current;
              const totalDy = e.screenY - dragStartYRef.current;
              if (Math.abs(totalDx) > 3 || Math.abs(totalDy) > 3) {
                rightClickMovedRef.current = true;
              }
              lastMoveSendRef.current = now;
              if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                try {
                  (_b2 = window.desktopPet) == null ? void 0 : _b2.moveWindow(deltaX, deltaY);
                } catch {
                }
              }
            }
          }
          e.stopImmediatePropagation();
          return;
        }
      };
      window.addEventListener("pointermove", handlePointerMove, { capture: true });
      const handlePointerUp = (e) => {
        var _a2, _b2, _c2;
        if (e.button === 2 && desktopPetMode) {
          rightButtonDownRef.current = false;
          if (isDraggingRef.current) {
            isDraggingRef.current = false;
            try {
              canvas.releasePointerCapture(e.pointerId);
            } catch {
            }
            try {
              (_a2 = window.desktopPet) == null ? void 0 : _a2.setResizeFrozen(false);
            } catch {
            }
            try {
              engine.resize();
            } catch {
            }
            targetScaleRef.current = zoomScaleRef.current;
            if (pendingResizeRef.current) {
              const pending = pendingResizeRef.current;
              pendingResizeRef.current = null;
              if (pending.radius !== void 0 && cameraRef.current) {
                try {
                  cameraRef.current.radius = pending.radius;
                } catch {
                }
              }
              try {
                (_b2 = window.desktopPet) == null ? void 0 : _b2.resizeWindow(pending.width, pending.height);
              } catch {
              }
            }
            lastIgnoreMouseRef.current = null;
          } else if (!rightClickMovedRef.current) {
            pendingResizeRef.current = null;
            pendingRadiusRef.current = null;
            try {
              (_c2 = window.desktopPet) == null ? void 0 : _c2.setIgnoreMouse(false);
            } catch {
            }
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
      window.addEventListener("pointerup", handlePointerUp, { capture: true });
      const handlePointerCancel = (e) => {
        var _a2, _b2;
        if (desktopPetMode && isDraggingRef.current) {
          isDraggingRef.current = false;
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch {
          }
          try {
            (_a2 = window.desktopPet) == null ? void 0 : _a2.setResizeFrozen(false);
          } catch {
          }
          if (pendingResizeRef.current) {
            const pending = pendingResizeRef.current;
            pendingResizeRef.current = null;
            if (pending.radius !== void 0 && cameraRef.current) {
              try {
                cameraRef.current.radius = pending.radius;
              } catch {
              }
            }
            try {
              (_b2 = window.desktopPet) == null ? void 0 : _b2.resizeWindow(pending.width, pending.height);
            } catch {
            }
          }
          targetScaleRef.current = zoomScaleRef.current;
          lastIgnoreMouseRef.current = null;
          e.stopImmediatePropagation();
        }
      };
      window.addEventListener("pointercancel", handlePointerCancel, { capture: true });
      const handleContextMenu = (e) => {
        if (desktopPetMode)
          e.preventDefault();
      };
      canvas.addEventListener("contextmenu", handleContextMenu);
      if (desktopPetMode) {
        const TARGET_FPS = { interacting: 60, animating: 50, idle: 20 };
        const renderLoop = (now) => {
          if (!engineRef.current || !sceneRef.current)
            return;
          if (renderTierRef.current === "frozen") {
            rafIdRef.current = null;
            return;
          }
          const sc = sceneRef.current;
          const sinceInteract = now - lastInteractTimeRef.current;
          const hasSwing = swingBonesRef.current.length > 0;
          const isActionPlaying = animStateRef.current.action !== "idle";
          if (sinceInteract < 400) {
            renderStateRef.current = "interacting";
          } else if (isActionPlaying || hasSwing && sinceInteract < 5e3) {
            renderStateRef.current = "animating";
          } else {
            renderStateRef.current = "idle";
          }
          const baseInterval = 1e3 / TARGET_FPS[renderStateRef.current];
          const interval = Math.max(baseInterval, renderTierRef.current === "reduced" ? 100 : 0);
          if (now - lastFrameTimeRef.current >= interval) {
            lastFrameTimeRef.current = now;
            sc.render();
          }
          rafIdRef.current = requestAnimationFrame(renderLoop);
        };
        beginRenderLoopRef.current = () => {
          if (rafIdRef.current === null && engineRef.current && sceneRef.current) {
            lastFrameTimeRef.current = 0;
            rafIdRef.current = requestAnimationFrame(renderLoop);
          }
        };
        rafIdRef.current = requestAnimationFrame(renderLoop);
      } else {
        const PREVIEW_TARGET_FPS = { interacting: 60, animating: 45, idle: 20 };
        const previewRenderLoop = (now) => {
          if (!engineRef.current || !sceneRef.current)
            return;
          if (renderTierRef.current === "frozen") {
            rafIdRef.current = null;
            return;
          }
          const sc = sceneRef.current;
          const sinceInteract = now - lastInteractTimeRef.current;
          const hasSwing = swingBonesRef.current.length > 0;
          const isActionPlaying = animStateRef.current.action !== "idle";
          if (sinceInteract < 400) {
            renderStateRef.current = "interacting";
          } else if (isActionPlaying || hasSwing && sinceInteract < 5e3) {
            renderStateRef.current = "animating";
          } else {
            renderStateRef.current = "idle";
          }
          const baseInterval = 1e3 / PREVIEW_TARGET_FPS[renderStateRef.current];
          const interval = Math.max(baseInterval, renderTierRef.current === "reduced" ? 100 : 0);
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
      {
        const dpet = window.desktopPet;
        if (dpet == null ? void 0 : dpet.onRenderMode) {
          offRenderModeRef.current = dpet.onRenderMode((mode) => {
            var _a2;
            const prev = renderTierRef.current;
            renderTierRef.current = mode === "frozen" ? "frozen" : mode === "reduced" ? "reduced" : "active";
            if (prev !== renderTierRef.current) {
              console.log(`[RenderScheduler] 渲染档位: ${prev} → ${renderTierRef.current}`);
            }
            if (prev === "frozen" && renderTierRef.current !== "frozen") {
              (_a2 = beginRenderLoopRef.current) == null ? void 0 : _a2.call(beginRenderLoopRef);
            }
          });
        }
      }
      const container = canvas.parentElement;
      const applyWallpaperReframe = () => {
        const cam = cameraRef.current;
        const fr = wallpaperFrameRef.current;
        if (!cam || !fr || fr.modelHeight <= 0)
          return;
        if (typeof window === "undefined" || !/wallpaper/i.test(window.location.pathname || ""))
          return;
        try {
          cam.beta = Math.PI / 2;
          cam.alpha = Math.PI / 2;
          const targetY = fr.minY + fr.modelHeight * 0.85;
          cam.setTarget(new Vector3(fr.centerX, targetY, fr.centerZ));
          const visibleHeight = fr.modelHeight * 0.35;
          const distance = visibleHeight / 2 / Math.tan(cam.fov / 2) * 1.1;
          cam.radius = Math.max(1, Math.min(50, distance / 2.345));
          baseRadiusRef.current = cam.radius;
          console.log("[BabylonModelViewer][壁纸转屏重套] canvas=" + engine.getRenderWidth() + "x" + engine.getRenderHeight() + " targetY=" + targetY.toFixed(2) + " radius=" + cam.radius.toFixed(2));
        } catch (e) {
        }
      };
      const scheduleWallpaperReframe = () => {
        if (!wallpaperFrameRef.current)
          return;
        if (typeof window === "undefined" || !/wallpaper/i.test(window.location.pathname || ""))
          return;
        if (wallpaperReframeTimerRef.current !== null) {
          window.clearTimeout(wallpaperReframeTimerRef.current);
        }
        wallpaperReframeTimerRef.current = window.setTimeout(() => {
          wallpaperReframeTimerRef.current = null;
          if (isDraggingRef.current)
            return;
          applyWallpaperReframe();
        }, 120);
      };
      if (container) {
        const resizeObserver = new ResizeObserver(() => {
          if (isDraggingRef.current)
            return;
          engine.resize();
          scheduleWallpaperReframe();
        });
        resizeObserver.observe(container);
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
        if (isDraggingRef.current)
          return;
        engine.resize();
        scheduleWallpaperReframe();
      };
      window.addEventListener("resize", handleResize);
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          onClose == null ? void 0 : onClose();
          return;
        }
        if (desktopPetMode) {
          if (e.key === "+" || e.key === "=") {
            lastInteractTimeRef.current = performance.now();
            zoomBy(1.1);
          } else if (e.key === "-" || e.key === "_") {
            lastInteractTimeRef.current = performance.now();
            zoomBy(0.9);
          }
          return;
        }
        const cam = cameraRef.current;
        if (!cam)
          return;
        if (e.key === "+" || e.key === "=") {
          cam.radius = Math.max(cam.radius * 0.9, cam.lowerRadiusLimit ?? 0);
          lastInteractTimeRef.current = performance.now();
        } else if (e.key === "-" || e.key === "_") {
          cam.radius = Math.min(cam.radius * 1.1, cam.upperRadiusLimit ?? Infinity);
          lastInteractTimeRef.current = performance.now();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        var _a2, _b2;
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("wheel", handleWheel, { capture: true });
        window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
        window.removeEventListener("pointermove", handlePointerMove, { capture: true });
        window.removeEventListener("pointerup", handlePointerUp, { capture: true });
        window.removeEventListener("pointercancel", handlePointerCancel, { capture: true });
        canvas.removeEventListener("contextmenu", handleContextMenu);
        if (modelInitTimerRef.current !== null) {
          clearTimeout(modelInitTimerRef.current);
          modelInitTimerRef.current = null;
        }
        showContextMenuRef.current = false;
        if (scaleAnimRef.current !== null) {
          cancelAnimationFrame(scaleAnimRef.current);
          scaleAnimRef.current = null;
        }
        if (radiusRestoreRef.current) {
          radiusRestoreRef.current();
          radiusRestoreRef.current = null;
        }
        if (desktopPetMode) {
          if (rafIdRef.current !== null)
            cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
          try {
            (_a2 = window.desktopPet) == null ? void 0 : _a2.setIgnoreMouse(false);
          } catch {
          }
        } else {
          engine.stopRenderLoop();
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
        }
        beginRenderLoopRef.current = null;
        if (offRenderModeRef.current) {
          try {
            offRenderModeRef.current();
          } catch {
          }
          offRenderModeRef.current = null;
        }
        if (offJointCmdRef.current) {
          try {
            offJointCmdRef.current();
          } catch {
          }
          offJointCmdRef.current = null;
        }
        if (mmdRuntimeRef.current) {
          try {
            if (mmdModelRef.current) {
              try {
                mmdRuntimeRef.current.destroyMmdModel(mmdModelRef.current);
              } catch (e) {
              }
              mmdModelRef.current = null;
            }
            mmdRuntimeRef.current.dispose(scene);
          } catch (e) {
          }
          mmdRuntimeRef.current = null;
        }
        physicsReadyRef.current = false;
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
        for (const m of collisionDebugMeshesRef.current) {
          try {
            (_b2 = m.material) == null ? void 0 : _b2.dispose();
            m.dispose();
          } catch (e) {
          }
        }
        collisionDebugMeshesRef.current = [];
        collisionBodiesRef.current = [];
        swingBonesRef.current = [];
        stopJointControlPolling();
        scene.dispose();
        engine.dispose();
      };
    } catch (err) {
      console.error("[BabylonModelViewer] 初始化失败:", err);
      setInitError(err instanceof Error ? err.message : String(err));
    }
    return () => {
      var _a2;
      try {
        if (swingObserverRef.current && sceneRef.current) {
          sceneRef.current.onBeforeRenderObservable.remove(swingObserverRef.current);
          swingObserverRef.current = null;
        }
        swingBonesRef.current = [];
        if (breathObserverRef.current && sceneRef.current) {
          sceneRef.current.onBeforeRenderObservable.remove(breathObserverRef.current);
          breathObserverRef.current = null;
        }
        if (doubleTapObserverRef.current && sceneRef.current) {
          sceneRef.current.onPointerObservable.remove(doubleTapObserverRef.current);
          doubleTapObserverRef.current = null;
        }
        humanBodyRef.current = null;
        analysisRef.current = null;
        animStateRef.current = { action: "idle", startTime: 0, duration: 0, breathBaseRot: null, actionBones: [] };
        for (const m of collisionDebugMeshesRef.current) {
          try {
            (_a2 = m.material) == null ? void 0 : _a2.dispose();
            m.dispose();
          } catch (e) {
          }
        }
        collisionDebugMeshesRef.current = [];
        collisionBodiesRef.current = [];
        if (mmdRuntimeRef.current && sceneRef.current) {
          try {
            if (mmdModelRef.current) {
              try {
                mmdRuntimeRef.current.destroyMmdModel(mmdModelRef.current);
              } catch (e) {
              }
              mmdModelRef.current = null;
            }
            mmdRuntimeRef.current.dispose(sceneRef.current);
          } catch (e) {
          }
          mmdRuntimeRef.current = null;
        }
        physicsReadyRef.current = false;
        stopJointControlPolling();
      } catch (e) {
        console.warn("[BabylonModelViewer] 摆动资源清理失败:", e);
      }
    };
  }, []);
  reactExports.useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);
  const loadModel = reactExports.useCallback(async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U;
    (_a = loadAbortRef.current) == null ? void 0 : _a.abort();
    loadAbortRef.current = new AbortController();
    const { signal } = loadAbortRef.current;
    if (modelInitTimerRef.current !== null) {
      clearTimeout(modelInitTimerRef.current);
      modelInitTimerRef.current = null;
    }
    if (!modelData || !sceneRef.current)
      return;
    if (!modelData.url && !modelData.data && !modelData.modelFile)
      return;
    if (signal.aborted)
      return;
    loadingRef.current = true;
    try {
      const eng = (_c = (_b = sceneRef.current) == null ? void 0 : _b.getEngine) == null ? void 0 : _c.call(_b);
      if (eng && prevScalingRef.current === null) {
        prevScalingRef.current = eng.getHardwareScalingLevel();
        eng.setHardwareScalingLevel(2);
      }
    } catch (e) {
    }
    {
      const sc = sceneRef.current;
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
      try {
        currentModelRef.current.dispose(false, true);
      } catch (e) {
      }
      currentModelRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    try {
      const scene = sceneRef.current;
      const fileName = modelData.name.toLowerCase();
      const referenceFiles = [];
      if (modelData.textureFiles && modelData.textureFiles.length > 0) {
        const modelWebkitPath = modelData.modelWebkitRelativePath || ((_d = modelData.modelFile) == null ? void 0 : _d.webkitRelativePath) || ((_e = modelData.modelFile) == null ? void 0 : _e.name) || "";
        for (const tex of modelData.textureFiles) {
          const texWebkitPath = tex.webkitRelativePath || ((_f = tex.file) == null ? void 0 : _f.webkitRelativePath) || ((_g = tex.file) == null ? void 0 : _g.name) || "";
          const texPath = tex.path || tex.name;
          let relativePath;
          if (modelWebkitPath && texWebkitPath) {
            relativePath = extractRelativePath(texWebkitPath, modelWebkitPath);
          } else {
            relativePath = texPath;
          }
          const ext = ((_h = relativePath.split(".").pop()) == null ? void 0 : _h.toLowerCase()) || "";
          let mimeType;
          if (ext === "png")
            mimeType = "image/png";
          else if (ext === "jpg" || ext === "jpeg")
            mimeType = "image/jpeg";
          else if (ext === "bmp")
            mimeType = "image/bmp";
          else if (ext === "tga")
            mimeType = "image/x-tga";
          else if (ext === "webp")
            mimeType = "image/webp";
          else if (ext === "spa" || ext === "sph")
            mimeType = "application/octet-stream";
          else
            mimeType = void 0;
          referenceFiles.push({
            relativePath,
            mimeType,
            data: tex.data
          });
        }
        console.log(`[BabylonModelViewer] 准备 ${referenceFiles.length} 个IArrayBufferFile作为referenceFiles`);
        if (referenceFiles.length > 0) {
          console.log("[BabylonModelViewer] 示例路径:", referenceFiles[0].relativePath);
        }
      }
      let loadedMeshes;
      const isPmx = fileName.endsWith(".pmx") || fileName.endsWith(".pmd");
      const isGlb = fileName.endsWith(".glb") || fileName.endsWith(".gltf");
      const isObj = fileName.endsWith(".obj");
      if (isPmx) {
        let sourceUrl;
        if (modelData.modelFile) {
          sourceUrl = URL.createObjectURL(modelData.modelFile);
          objectUrlRef.current = sourceUrl;
        } else if (modelData.url) {
          sourceUrl = modelData.url;
        } else if (modelData.data) {
          const modelBlob = new Blob([modelData.data]);
          sourceUrl = URL.createObjectURL(modelBlob);
          objectUrlRef.current = sourceUrl;
        } else {
          throw new Error("模型数据为空（无 modelFile/url/data）");
        }
        const options = { pluginExtension: fileName.endsWith(".pmd") ? ".pmd" : ".pmx" };
        if (referenceFiles.length > 0) {
          options.pluginOptions = { mmdmodel: { referenceFiles } };
        }
        const result = await ImportMeshAsync(sourceUrl, scene, options);
        if (signal.aborted)
          return;
        loadedMeshes = result.meshes;
      } else if (isGlb || isObj) {
        const ext = isGlb ? fileName.endsWith(".glb") ? ".glb" : ".gltf" : ".obj";
        const options = { pluginExtension: ext };
        let sourceUrl;
        if (modelData.modelFile) {
          sourceUrl = URL.createObjectURL(modelData.modelFile);
          objectUrlRef.current = sourceUrl;
        } else if (modelData.url) {
          sourceUrl = modelData.url;
        } else if (modelData.data) {
          const modelBlob = new Blob([modelData.data]);
          sourceUrl = URL.createObjectURL(modelBlob);
          objectUrlRef.current = sourceUrl;
        } else {
          throw new Error("模型数据为空（无 modelFile/url/data）");
        }
        const result = await ImportMeshAsync(sourceUrl, scene, options);
        if (signal.aborted)
          return;
        loadedMeshes = result.meshes;
      } else {
        throw new Error(`不支持的模型格式: ${modelData.name}`);
      }
      if (!loadedMeshes || loadedMeshes.length === 0) {
        throw new Error("模型加载失败：未返回任何 mesh");
      }
      if (signal.aborted)
        return;
      const rootMesh = loadedMeshes.find((m) => m.name === "__root__") || loadedMeshes[0];
      currentModelRef.current = rootMesh;
      if (fileName.endsWith(".pmx") || fileName.endsWith(".pmd")) {
        try {
          const analysis = analyzeSkeleton(rootMesh);
          if (!analysis) {
            setPhysicsStatus("骨骼解析失败");
          } else {
            const skinningOk = verifySkinning(analysis.skeleton);
            const humanBody = buildHumanBody(analysis.skeleton);
            try {
              const hbR = humanBody;
              const slotList = [
                ["頭", (_i = hbR == null ? void 0 : hbR.spine) == null ? void 0 : _i.head],
                ["首", (_j = hbR == null ? void 0 : hbR.spine) == null ? void 0 : _j.neck],
                ["胸", (_k = hbR == null ? void 0 : hbR.spine) == null ? void 0 : _k.chest],
                ["上脊椎", (_l = hbR == null ? void 0 : hbR.spine) == null ? void 0 : _l.upperSpine],
                ["下脊椎", (_m = hbR == null ? void 0 : hbR.spine) == null ? void 0 : _m.lowerSpine],
                ["左肩", (_n = hbR == null ? void 0 : hbR.leftArm) == null ? void 0 : _n.shoulder],
                ["左上臂", (_o = hbR == null ? void 0 : hbR.leftArm) == null ? void 0 : _o.upperArm],
                ["左前臂", (_p = hbR == null ? void 0 : hbR.leftArm) == null ? void 0 : _p.lowerArm],
                ["左手", (_q = hbR == null ? void 0 : hbR.leftArm) == null ? void 0 : _q.hand],
                ["右肩", (_r = hbR == null ? void 0 : hbR.rightArm) == null ? void 0 : _r.shoulder],
                ["右上臂", (_s = hbR == null ? void 0 : hbR.rightArm) == null ? void 0 : _s.upperArm],
                ["右前臂", (_t = hbR == null ? void 0 : hbR.rightArm) == null ? void 0 : _t.lowerArm],
                ["右手", (_u = hbR == null ? void 0 : hbR.rightArm) == null ? void 0 : _u.hand],
                ["左大腿", (_v = hbR == null ? void 0 : hbR.leftLeg) == null ? void 0 : _v.upperLeg],
                ["左膝", (_w = hbR == null ? void 0 : hbR.leftLeg) == null ? void 0 : _w.lowerLeg],
                ["左踝", (_x = hbR == null ? void 0 : hbR.leftLeg) == null ? void 0 : _x.foot],
                ["右大腿", (_y = hbR == null ? void 0 : hbR.rightLeg) == null ? void 0 : _y.upperLeg],
                ["右膝", (_z = hbR == null ? void 0 : hbR.rightLeg) == null ? void 0 : _z.lowerLeg],
                ["右踝", (_A = hbR == null ? void 0 : hbR.rightLeg) == null ? void 0 : _A.foot]
              ];
              const missSlots = slotList.filter(([, b]) => !b).map(([n]) => n);
              console.log(`[RigMap] 贴骨 ${slotList.length - missSlots.length}/${slotList.length}${missSlots.length ? " ✗缺: " + missSlots.join(",") : " 全齐 ✓"}`);
            } catch (e) {
            }
            diagnosePmxResource(rootMesh);
            const jointReport = listJointsAndNonJoints(analysis.skeleton);
            console.log(`[JointReport] 关节:${jointReport.joints.length} 非关节:${jointReport.nonJoints.length} 位置锁死:${jointReport.locked.length}`);
            if (BONE_DEBUG) {
              console.log(`[JointReport] 关节列表(前20): ${jointReport.joints.slice(0, 20).join(", ")}${jointReport.joints.length > 20 ? "..." : ""}`);
              console.log(`[JointReport] 位置锁死列表: ${jointReport.locked.join(", ") || "(无)"}`);
            }
            const poseCount = applyNaturalArmPose(analysis.skeleton, humanBody);
            try {
              analysis.skeleton.computeAbsoluteMatrices(true);
              analysis.skeleton._isDirty = true;
            } catch (e) {
              console.warn("[ArmPose] 同步骨骼矩阵失败:", e);
            }
            try {
              const skel = analysis.skeleton;
              window.__jointControl = {
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
                rotate: (boneName, x, y, z) => {
                  const bone = skel.bones.find((b) => b.name === boneName);
                  if (!bone) {
                    console.warn(`[JointControl] 找不到骨骼: "${boneName}"`);
                    return false;
                  }
                  const ctx = {
                    skeleton: skel,
                    bodies: collisionBodiesRef.current
                  };
                  return safeRotateJoint(bone, { x, y, z }, "user", ctx);
                },
                /** 重置指定关节旋转（恢复 bind pose） */
                reset: (boneName) => {
                  const bone = skel.bones.find((b) => b.name === boneName);
                  if (!bone) {
                    console.warn(`[JointControl] 找不到骨骼: "${boneName}"`);
                    return false;
                  }
                  return safeRotateJoint(bone, { x: 0, y: 0, z: 0 }, "reset");
                },
                /** 重置所有关节旋转（[2026-09-07] 平滑过渡版）
                 *  旧版硬切 {0,0,0}：全部关节瞬间回 T-pose，手臂从垂手闪成水平张臂（用户实锤痛点）。
                 *  新版：300ms slerp 到 bind pose；上臂目标直接取垂手角（与 applyNaturalArmPose 同源几何法，
                 *  用 bind 世界位置 atan2 计算，不写死角度），复位完成即自然垂手，全程无跳变。 */
                resetAll: () => {
                  const armRestQuat = (arm) => {
                    var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2;
                    try {
                      const upperArm = arm == null ? void 0 : arm.upperArm;
                      if (!upperArm)
                        return null;
                      const children = upperArm.getChildren ? upperArm.getChildren() : upperArm.children || [];
                      const childBone = arm.lowerArm || children[0];
                      if (!childBone)
                        return null;
                      const bonePos = ((_b2 = (_a2 = upperArm._absoluteBindMatrix) == null ? void 0 : _a2.getTranslation) == null ? void 0 : _b2.call(_a2)) || ((_d2 = (_c2 = upperArm.getAbsoluteMatrix) == null ? void 0 : _c2.call(upperArm)) == null ? void 0 : _d2.getTranslation());
                      const childPos = ((_f2 = (_e2 = childBone._absoluteBindMatrix) == null ? void 0 : _e2.getTranslation) == null ? void 0 : _f2.call(_e2)) || ((_h2 = (_g2 = childBone.getAbsoluteMatrix) == null ? void 0 : _g2.call(childBone)) == null ? void 0 : _h2.getTranslation());
                      if (!bonePos || !childPos)
                        return null;
                      const dx = childPos.x - bonePos.x;
                      const dy = childPos.y - bonePos.y;
                      const dz = childPos.z - bonePos.z;
                      if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= 0.01)
                        return null;
                      const isOnPositiveX = bonePos.x > 0;
                      const ARMPIT = 15 * Math.PI / 180;
                      const targetAngle = isOnPositiveX ? -Math.PI / 2 + ARMPIT : -Math.PI / 2 - ARMPIT;
                      return Quaternion.FromEulerAngles(0, 0, targetAngle);
                    } catch {
                      return null;
                    }
                  };
                  const restOverride = /* @__PURE__ */ new Map();
                  try {
                    const hb = humanBody;
                    if (hb == null ? void 0 : hb.leftArm) {
                      const lq = armRestQuat(hb.leftArm);
                      if (lq && hb.leftArm.upperArm)
                        restOverride.set(hb.leftArm.upperArm, lq);
                    }
                    if (hb == null ? void 0 : hb.rightArm) {
                      const rq = armRestQuat(hb.rightArm);
                      if (rq && hb.rightArm.upperArm)
                        restOverride.set(hb.rightArm.upperArm, rq);
                    }
                  } catch {
                  }
                  const targets = [];
                  for (const bone of skel.bones) {
                    if (isJointBone(bone.name) && !isPositionLockedBone(bone.name)) {
                      try {
                        const from = bone.getRotationQuaternion(Space.LOCAL).clone();
                        const to = restOverride.get(bone) || Quaternion.Identity();
                        targets.push({ bone, from, to });
                      } catch {
                      }
                    }
                  }
                  if (targets.length === 0)
                    return 0;
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
                      } catch {
                      }
                    }
                    if (t < 1)
                      requestAnimationFrame(tick);
                    else {
                      try {
                        skel.computeAbsoluteMatrices(true);
                      } catch {
                      }
                      console.log("[JointControl] resetAll 平滑复位完成（手臂经垂手目标角，无张臂闪跳）");
                    }
                  };
                  requestAnimationFrame(tick);
                  return targets.length;
                },
                /** 获取关节的生理极限 */
                limit: (boneName) => {
                  if (!isJointBone(boneName))
                    return null;
                  return getJointLimit(boneName);
                },
                /**
                 * 查询当前系统状态（用于 AI 接入前的诊断）
                 * @returns 物理引擎/碰撞体/摆动骨骼/关节数量等状态信息
                 */
                status: () => ({
                  physicsEngine: physicsReadyRef.current ? "enabled" : "disabled",
                  physicsModel: mmdModelRef.current ? "loaded" : "none",
                  collisionBodies: collisionBodiesRef.current.length,
                  swingBones: swingBonesRef.current.length,
                  totalBones: analysis.boneCount,
                  joints: jointReport.joints.length,
                  lockedBones: jointReport.locked.length,
                  action: animStateRef.current.action
                }),
                /**
                 * 查找骨骼名（模糊匹配，用于 AI 不知道确切骨骼名时）
                 * @returns 匹配的骨骼名列表
                 */
                find: (keyword) => {
                  const lower = (keyword || "").toLowerCase();
                  return skel.bones.map((b) => b.name).filter((name) => (name || "").toLowerCase().includes(lower));
                }
              };
              console.log("[JointControl] 已暴露 window.__jointControl，可调用 .list()/.joints()/.rotate(name,x,y,z)/.reset(name)/.resetAll()/.limit(name)/.status()/.find(keyword)");
              {
                const dpet = window.desktopPet;
                if (dpet == null ? void 0 : dpet.onJointCommand) {
                  offJointCmdRef.current = dpet.onJointCommand((cmds) => {
                    if (Array.isArray(cmds) && cmds.length > 0) {
                      void executeIncomingCommands(cmds);
                    }
                  });
                } else if (desktopPetMode) {
                  try {
                    startJointControlPolling();
                  } catch (e) {
                    console.warn("[JointControl] 启动轮询失败:", e);
                  }
                }
              }
            } catch (e) {
              console.warn("[JointControl] 暴露接口失败:", e);
            }
            const swingBones = [];
            if (physicsEnabled) {
              const allBones = analysis.skeleton.bones || [];
              const seedSwingBones = /* @__PURE__ */ new Set();
              for (const bone of allBones) {
                const name = (bone.name || "").toLowerCase();
                if (name.includes("ik"))
                  continue;
                const isSwingBone = analysis.swingCandidates.some(
                  (candidate) => candidate.toLowerCase() === (bone.name || "").toLowerCase()
                );
                if (isSwingBone) {
                  seedSwingBones.add(bone.name);
                }
              }
              const faceKeywords = ["eye", "目", "眼", "口", "唇", "眉", "鼻", "耳", "face", "面", "expression", "express", "tap", "blink", "eyeblow", "eyebrow", "tongue", "歯", "齿", "teeth", "hat", "帽", "glass", "眼鏡", "access", "装飾", "neck", "首", "phone"];
              const headBone = allBones.find((b) => {
                const n = (b.name || "").toLowerCase();
                return n === "head" || n === "頭" || (n.includes("head") || n.includes("頭")) && !n.includes("phone") && !n.includes("set");
              });
              if (headBone) {
                const headChildren = headBone.getChildren ? headBone.getChildren() : headBone.children || [];
                let added = 0;
                for (const child of headChildren) {
                  if (!child || !child.name)
                    continue;
                  const childName = (child.name || "").toLowerCase();
                  if (childName.includes("ik"))
                    continue;
                  if (faceKeywords.some((kw) => childName.includes(kw)))
                    continue;
                  if (!seedSwingBones.has(child.name)) {
                    seedSwingBones.add(child.name);
                    added++;
                  }
                }
                if (BONE_DEBUG)
                  console.log(`[Swing] 头部骨骼="${headBone.name}" 子骨骼${headChildren.length}个，启发式新增种子${added}个`);
              } else {
                if (BONE_DEBUG)
                  console.warn("[Swing] 未找到头部骨骼(head/頭)，跳过头部启发式识别");
              }
              const allSwingBoneNames = new Set(seedSwingBones);
              const queue = [];
              for (const bone of allBones) {
                if (seedSwingBones.has(bone.name))
                  queue.push(bone);
              }
              while (queue.length > 0) {
                const bone = queue.shift();
                const children = bone.getChildren ? bone.getChildren() : bone.children || [];
                for (const child of children) {
                  if (!child || !child.name)
                    continue;
                  const childName = (child.name || "").toLowerCase();
                  if (childName.includes("ik"))
                    continue;
                  if (!allSwingBoneNames.has(child.name)) {
                    allSwingBoneNames.add(child.name);
                    queue.push(child);
                  }
                }
              }
              if (BONE_DEBUG)
                console.log(`[Swing] 种子骨骼 ${seedSwingBones.size} 个，传播后总计 ${allSwingBoneNames.size} 个摆动骨骼`);
              for (const bone of allBones) {
                if (!allSwingBoneNames.has(bone.name))
                  continue;
                const name = (bone.name || "").toLowerCase();
                let baseRotation;
                try {
                  baseRotation = bone.getRotationQuaternion(Space.LOCAL) || Quaternion.Identity();
                } catch (e) {
                  baseRotation = Quaternion.Identity();
                }
                const phase = Math.random() * Math.PI * 2;
                const isTailBone = name.includes("tail") || name.includes("尾") || name.includes("尻尾") || name.includes("しっぽ") || name.includes("weiba");
                const isTailExcluded = name.includes("尾骨") || name.includes("coccyx") || name.includes("tailbone") || name.includes("ik");
                const isTailByName = isTailBone && !isTailExcluded;
                const isTailByChain = !isTailByName && isTailByParentChain(bone) && !hasHairKeyword(name);
                const isTail = isTailByName || isTailByChain;
                const isSkirt = name.includes("skirt") || name.includes("スカート") || name.includes("裾") || name.includes("裙") || name.includes("hem");
                const axis = isTail ? "x" : isSkirt ? "z" : "y";
                const collisionGroup = isTail ? "tail" : isSkirt ? "skirt" : "hair";
                swingBones.push({ bone, baseRotation, phase, axis, isTail, chainIndex: 0, collisionGroup });
              }
              if (window.__springChainEnabled !== false) {
                try {
                  const solver = new SpringChainSolver();
                  const inSet = /* @__PURE__ */ new Set();
                  for (const sb of swingBones) {
                    if (!sb.isTail)
                      inSet.add(sb.bone.name);
                  }
                  const parentOf = /* @__PURE__ */ new Map();
                  const metaOf = /* @__PURE__ */ new Map();
                  for (const sb of swingBones) {
                    if (sb.isTail)
                      continue;
                    const boneAny2 = sb.bone;
                    const parentBone2 = sb.bone.getParent ? sb.bone.getParent() : boneAny2.parent;
                    const wm = boneAny2._absoluteBindMatrix || ((_B = boneAny2.getAbsoluteMatrix) == null ? void 0 : _B.call(boneAny2));
                    if (!wm)
                      continue;
                    parentOf.set(sb.bone.name, parentBone2 && inSet.has(parentBone2.name) ? parentBone2.name : null);
                    metaOf.set(sb.bone.name, { sb, pos: wm.getTranslation().clone(), baseLocal: sb.baseRotation.clone() });
                  }
                  const childrenOf = /* @__PURE__ */ new Map();
                  for (const [name, p] of parentOf) {
                    if (p) {
                      const arr = childrenOf.get(p) || [];
                      arr.push(name);
                      childrenOf.set(p, arr);
                    }
                  }
                  let chainIdx = 0;
                  for (const [name, p] of parentOf) {
                    if (p)
                      continue;
                    const infos = [];
                    const queue2 = [{ n: name, parent: null }];
                    while (queue2.length > 0) {
                      const { n, parent } = queue2.shift();
                      const meta = metaOf.get(n);
                      if (meta)
                        infos.push({ name: n, parentName: parent, pos: meta.pos, baseLocal: meta.baseLocal });
                      for (const c of childrenOf.get(n) || [])
                        queue2.push({ n: c, parent: n });
                    }
                    if (infos.length >= 2)
                      solver.addChain("c" + chainIdx++, metaOf.get(name).sb.collisionGroup, infos);
                  }
                  window.__springChainSolver = solver;
                  window.__springChainRoots = /* @__PURE__ */ new Map();
                  console.log("[SpringChain] 链构建完成: " + solver.chainCount + " 条独立链（hair/skirt/accessory，每条发辫一根）");
                } catch (e) {
                  console.warn("[SpringChain] 构建失败（回退 sin）:", e);
                }
              }
              const tailBones = swingBones.filter((s) => s.isTail);
              if (tailBones.length > 0) {
                for (const tb of tailBones) {
                  let depth = 0;
                  let parent = tb.bone.getParent ? tb.bone.getParent() : tb.bone.parent;
                  while (parent) {
                    const pName = (parent.name || "").toLowerCase();
                    const pIsTail = (pName.includes("tail") || pName.includes("尾") || pName.includes("尻尾") || pName.includes("しっぽ") || pName.includes("weiba")) && !pName.includes("尾骨") && !pName.includes("coccyx") && !pName.includes("tailbone") && !pName.includes("ik");
                    if (pIsTail) {
                      depth++;
                    }
                    parent = parent.getParent ? parent.getParent() : parent.parent;
                  }
                  tb.chainIndex = depth;
                }
              }
              for (const sb of swingBones) {
                if (!sb.isTail)
                  continue;
                try {
                  const boneAny = sb.bone;
                  const parentBone = sb.bone.getParent ? sb.bone.getParent() : sb.bone.parent;
                  if (!parentBone) {
                    boneAny.__tailDroopTarget = sb.baseRotation.clone();
                    continue;
                  }
                  const boneWM = boneAny._absoluteBindMatrix || ((_C = boneAny.getAbsoluteMatrix) == null ? void 0 : _C.call(boneAny));
                  const parentWM = parentBone._absoluteBindMatrix || ((_D = parentBone.getAbsoluteMatrix) == null ? void 0 : _D.call(parentBone));
                  if (!boneWM || !parentWM) {
                    boneAny.__tailDroopTarget = sb.baseRotation.clone();
                    continue;
                  }
                  const bonePos = boneWM.getTranslation();
                  const parentPos = parentWM.getTranslation();
                  const extDir = new Vector3(bonePos.x - parentPos.x, bonePos.y - parentPos.y, bonePos.z - parentPos.z);
                  const extLen = extDir.length();
                  if (extLen < 1e-3) {
                    boneAny.__tailDroopTarget = sb.baseRotation.clone();
                    continue;
                  }
                  extDir.scaleInPlace(1 / extLen);
                  const downDir = new Vector3(0, -1, 0);
                  const dot = Vector3.Dot(extDir, downDir);
                  let worldDroopQuat = Quaternion.Identity();
                  if (dot > 0.9999) {
                    worldDroopQuat = Quaternion.Identity();
                  } else if (dot < -0.9999) {
                    worldDroopQuat = Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI);
                  } else {
                    const rotAxis = Vector3.Cross(extDir, downDir);
                    rotAxis.normalize();
                    const rotAngle = Math.acos(Math.max(-1, Math.min(1, dot)));
                    const droopFraction = Math.min(0.85, 0.1 + sb.chainIndex * 0.025);
                    worldDroopQuat = Quaternion.RotationAxis(rotAxis, rotAngle * droopFraction);
                  }
                  const _dummyScale = new Vector3();
                  const parentWorldRot = new Quaternion();
                  parentWM.decompose(_dummyScale, parentWorldRot, void 0);
                  const parentConj = parentWorldRot.clone();
                  parentConj.conjugateInPlace();
                  const localDroop = parentConj.multiply(worldDroopQuat).multiply(parentWorldRot);
                  boneAny.__tailDroopTarget = localDroop.multiply(sb.baseRotation);
                  if (BONE_DEBUG) {
                    console.log(`[TailDroop] ${sb.bone.name} chain=${sb.chainIndex} extDir=(${extDir.x.toFixed(2)},${extDir.y.toFixed(2)},${extDir.z.toFixed(2)}) dot=${dot.toFixed(3)} droopFrac=${(0.35 + sb.chainIndex * 0.15).toFixed(2)} target=已计算`);
                  }
                } catch (e) {
                  sb.bone.__tailDroopTarget = sb.baseRotation.clone();
                  if (BONE_DEBUG)
                    console.warn(`[TailDroop] ${sb.bone.name} 目标计算失败:`, e);
                }
              }
              if (BONE_DEBUG) {
                console.log(`[Swing] 最终摆动骨骼列表(${swingBones.length}):`, swingBones.map((s) => `${s.bone.name}(isTail=${s.isTail},chain=${s.chainIndex},group=${s.collisionGroup},axis=${s.axis})`));
                const tailBonesInSwing = swingBones.filter((s) => s.isTail);
                console.log(`[TailFix] 尾巴骨骼进入swingBones: ${tailBonesInSwing.length}个`, tailBonesInSwing.map((s) => `${s.bone.name}(chain=${s.chainIndex})`));
                if (tailBonesInSwing.length === 0) {
                  console.warn(`[TailFix] 未识别到尾巴骨骼！可能原因：1)模型无尾巴 2)骨骼名不含tail/尾关键词 3)父骨骼链无尾巴骨骼`);
                }
                if (tailBonesInSwing.length > 0 && BONE_DEBUG) {
                  for (const tb of tailBonesInSwing) {
                    const childNames = [];
                    const collectChildren = (bone, depth) => {
                      if (depth > 5)
                        return;
                      const children = bone.getChildren ? bone.getChildren() : bone.children || [];
                      for (const child of children) {
                        if (child && child.name) {
                          childNames.push(`${child.name}(d=${depth})`);
                          collectChildren(child, depth + 1);
                        }
                      }
                    };
                    collectChildren(tb.bone, 1);
                    const hasHairChild = childNames.some((n) => hasHairKeyword(n));
                    console.log(`[TailHierarchy] "${tb.bone.name}" 子骨骼(${childNames.length}):`, childNames.slice(0, 15), hasHairChild ? "← 含头发骨骼!" : "");
                  }
                }
                if (tailBonesInSwing.length > 0 && BONE_DEBUG) {
                  try {
                    const tailBonePos = (_F = (_E = tailBonesInSwing[0].bone._absoluteBindMatrix) == null ? void 0 : _E.getTranslation) == null ? void 0 : _F.call(_E);
                    if (tailBonePos) {
                      const allMeshesForTail = [];
                      const collectMeshesForTail = (node) => {
                        if (!node)
                          return;
                        if (node.skeleton && node.getVerticesData)
                          allMeshesForTail.push(node);
                        if (node.getChildMeshes)
                          node.getChildMeshes().forEach((c) => collectMeshesForTail(c));
                      };
                      collectMeshesForTail(rootMesh);
                      console.log(`[TailMesh] 尾巴骨骼位置=(${tailBonePos.x.toFixed(2)},${tailBonePos.y.toFixed(2)},${tailBonePos.z.toFixed(2)}) 蒙皮mesh数=${allMeshesForTail.length}`);
                      const meshInfo = allMeshesForTail.map((mesh, idx) => {
                        var _a2;
                        const pos = (_a2 = mesh.getVerticesData) == null ? void 0 : _a2.call(mesh, "position");
                        if (!pos || pos.length === 0)
                          return { idx, name: mesh.name, dist: Infinity, yMin: 0, yMax: 0, zMin: 0, zMax: 0, vertCount: 0 };
                        let yMin = Infinity, yMax = -Infinity, zMin = Infinity, zMax = -Infinity;
                        let cx = 0, cy = 0, cz = 0;
                        const vc = pos.length / 3;
                        for (let v = 0; v < vc; v++) {
                          const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
                          if (y < yMin)
                            yMin = y;
                          if (y > yMax)
                            yMax = y;
                          if (z < zMin)
                            zMin = z;
                          if (z > zMax)
                            zMax = z;
                          cx += x;
                          cy += y;
                          cz += z;
                        }
                        cx /= vc;
                        cy /= vc;
                        cz /= vc;
                        const dx = cx - tailBonePos.x, dy = cy - tailBonePos.y, dz = cz - tailBonePos.z;
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        return { idx, name: mesh.name, dist, yMin, yMax, zMin, zMax, vertCount: vc, cx, cy, cz };
                      }).sort((a, b) => a.dist - b.dist);
                      console.log(`[TailMesh] 距尾巴骨骼最近的mesh(前5):`, meshInfo.slice(0, 5).map((m) => `${m.name}(dist=${m.dist.toFixed(2)},Y=${m.yMin.toFixed(1)}~${m.yMax.toFixed(1)},Z=${m.zMin.toFixed(1)}~${m.zMax.toFixed(1)},verts=${m.vertCount})`));
                    }
                  } catch (e) {
                    console.warn("[TailMesh] 诊断失败:", e);
                  }
                }
                if (headBone) {
                  const headChildren = headBone.getChildren ? headBone.getChildren() : headBone.children || [];
                  const missed = headChildren.filter((c) => {
                    if (!c || !c.name)
                      return false;
                    const cn = (c.name || "").toLowerCase();
                    if (cn.includes("ik"))
                      return false;
                    if (faceKeywords.some((kw) => cn.includes(kw)))
                      return false;
                    return !allSwingBoneNames.has(c.name);
                  });
                  if (missed.length > 0)
                    console.warn("[Swing] 头部子骨骼仍未识别(非面部但未入摆动):", missed.map((b) => b.name));
                }
              }
              const tailBonesForDiag = swingBones.filter((s) => s.isTail);
              if (tailBonesForDiag.length > 0 && BONE_DEBUG) {
                try {
                  const allMeshesDiag = [];
                  const collectMeshesDiag = (node) => {
                    if (!node)
                      return;
                    if (node.skeleton && node.getVerticesData)
                      allMeshesDiag.push(node);
                    if (node.getChildMeshes)
                      node.getChildMeshes().forEach((c) => collectMeshesDiag(c));
                  };
                  collectMeshesDiag(rootMesh);
                  const boneIndexMap = /* @__PURE__ */ new Map();
                  analysis.skeleton.bones.forEach((b, i) => boneIndexMap.set(b.name, i));
                  for (const tb of tailBonesForDiag) {
                    const boneIdx = boneIndexMap.get(tb.bone.name);
                    if (boneIdx === void 0) {
                      console.warn(`[TailDiag] 尾巴骨骼 "${tb.bone.name}" 不在 skeleton.bones 索引中`);
                      continue;
                    }
                    let totalWeight = 0;
                    let affectedVerts = 0;
                    for (const mesh of allMeshesDiag) {
                      const matricesIndices = (_G = mesh.getVerticesData) == null ? void 0 : _G.call(mesh, "matricesIndices");
                      const matricesWeights = (_H = mesh.getVerticesData) == null ? void 0 : _H.call(mesh, "matricesWeights");
                      if (!matricesIndices || !matricesWeights)
                        continue;
                      const vertCount = matricesIndices.length / 4;
                      for (let v = 0; v < vertCount; v++) {
                        let w = 0;
                        for (let k = 0; k < 4; k++) {
                          if (matricesIndices[v * 4 + k] === boneIdx)
                            w += matricesWeights[v * 4 + k];
                        }
                        if (w > 0) {
                          totalWeight += w;
                          affectedVerts++;
                        }
                      }
                    }
                    console.log(`[TailRebind] 尾巴骨骼 "${tb.bone.name}" boneIdx=${boneIdx} chainIndex=${tb.chainIndex} 影响顶点=${affectedVerts} 权重总和=${totalWeight.toFixed(4)} (扫描${allMeshesDiag.length}个mesh) ${affectedVerts === 0 ? "← 权重0:需顶点位移方案" : "← 权重正常"}`);
                  }
                  for (const tb of tailBonesForDiag) {
                    const boneIdx = boneIndexMap.get(tb.bone.name);
                    if (boneIdx === void 0)
                      continue;
                    let extraWeight = 0;
                    let extraVerts = 0;
                    for (const mesh of allMeshesDiag) {
                      const miExtra = (_I = mesh.getVerticesData) == null ? void 0 : _I.call(mesh, "matricesIndicesExtra");
                      const mwExtra = (_J = mesh.getVerticesData) == null ? void 0 : _J.call(mesh, "matricesWeightsExtra");
                      if (!miExtra || !mwExtra)
                        continue;
                      const vc = miExtra.length / 4;
                      for (let v = 0; v < vc; v++) {
                        let w = 0;
                        for (let k = 0; k < 4; k++) {
                          if (miExtra[v * 4 + k] === boneIdx)
                            w += mwExtra[v * 4 + k];
                        }
                        if (w > 0) {
                          extraWeight += w;
                          extraVerts++;
                        }
                      }
                    }
                    console.log(`[TailDiag] Extra矩阵: "${tb.bone.name}" idx=${boneIdx} Extra顶点=${extraVerts} Extra权重=${extraWeight.toFixed(4)} ${extraVerts > 0 ? "← 权重在Extra!" : "← Extra也无"}`);
                  }
                  {
                    const tailBonePos = (_L = (_K = tailBonesForDiag[0].bone._absoluteBindMatrix) == null ? void 0 : _K.getTranslation) == null ? void 0 : _L.call(_K);
                    if (tailBonePos) {
                      console.log(`[TailDiag] ===== 尾巴骨骼附近顶点实际骨骼绑定 =====`);
                      console.log(`[TailDiag] 尾巴骨骼位置=(${tailBonePos.x.toFixed(2)},${tailBonePos.y.toFixed(2)},${tailBonePos.z.toFixed(2)})`);
                      const idxToName = /* @__PURE__ */ new Map();
                      analysis.skeleton.bones.forEach((b, i) => idxToName.set(i, b.name));
                      for (const mesh of allMeshesDiag) {
                        const positions = (_M = mesh.getVerticesData) == null ? void 0 : _M.call(mesh, "position");
                        const mi = (_N = mesh.getVerticesData) == null ? void 0 : _N.call(mesh, "matricesIndices");
                        const mw = (_O = mesh.getVerticesData) == null ? void 0 : _O.call(mesh, "matricesWeights");
                        const miExtra = (_P = mesh.getVerticesData) == null ? void 0 : _P.call(mesh, "matricesIndicesExtra");
                        const mwExtra = (_Q = mesh.getVerticesData) == null ? void 0 : _Q.call(mesh, "matricesWeightsExtra");
                        if (!positions || !mi || !mw)
                          continue;
                        const vc = positions.length / 3;
                        const nearbyVerts = [];
                        for (let v = 0; v < vc; v++) {
                          const vx = positions[v * 3], vy = positions[v * 3 + 1], vz = positions[v * 3 + 2];
                          const dx = vx - tailBonePos.x, dy = vy - tailBonePos.y, dz = vz - tailBonePos.z;
                          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                          if (dist < 2) {
                            const bones = [];
                            for (let k = 0; k < 4; k++) {
                              const bIdx = mi[v * 4 + k];
                              const bW = mw[v * 4 + k];
                              if (bW > 0)
                                bones.push({ idx: bIdx, name: idxToName.get(bIdx) || `?${bIdx}`, weight: bW });
                            }
                            if (miExtra && mwExtra) {
                              for (let k = 0; k < 4; k++) {
                                const bIdx = miExtra[v * 4 + k];
                                const bW = mwExtra[v * 4 + k];
                                if (bW > 0)
                                  bones.push({ idx: bIdx, name: idxToName.get(bIdx) || `?${bIdx}`, weight: bW });
                              }
                            }
                            nearbyVerts.push({ v, dist, bones });
                          }
                        }
                        if (nearbyVerts.length > 0) {
                          nearbyVerts.sort((a, b) => a.dist - b.dist);
                          const closest = nearbyVerts.slice(0, 5);
                          const boneCount = /* @__PURE__ */ new Map();
                          for (const nv of nearbyVerts) {
                            for (const b of nv.bones) {
                              boneCount.set(b.name, (boneCount.get(b.name) || 0) + 1);
                            }
                          }
                          const sortedBones = Array.from(boneCount.entries()).sort((a, b) => b[1] - a[1]);
                          console.log(`[TailDiag] mesh(${mesh.name}) 距骨骼<2.0顶点=${nearbyVerts.length} 绑定骨骼分布:`, sortedBones.slice(0, 10).map(([n, c]) => `${n}(${c})`));
                          console.log(`[TailDiag]   最近5顶点:`, closest.map((nv) => `#${nv.v}(d=${nv.dist.toFixed(2)},[${nv.bones.map((b) => `${b.name}:${b.weight.toFixed(2)}`).join(",")}])`));
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.warn("[TailDiag] 权重诊断失败:", e);
                }
              } else if (tailBonesForDiag.length === 0 && BONE_DEBUG) {
                const tailLikeNames = analysis.boneNames.filter((n) => {
                  const lower = (n || "").toLowerCase();
                  return lower.includes("tail") || lower.includes("尾") || lower.includes("しっぽ");
                });
                console.warn(`[TailDiag] 未识别到尾巴骨骼。含tail/尾关键词的骨骼:`, tailLikeNames);
              }
              const tailBonesForRebind = swingBones.filter((s) => s.isTail);
              if (false)
                ;
            }
            const collisionBodies = autoCreateCollisionBodies(analysis.skeleton);
            collisionBodiesRef.current = collisionBodies;
            try {
              const skelForDebug = analysis.skeleton;
              const sceneForDebug = scene;
              const disposeDebugMeshes = () => {
                var _a2;
                for (const m of collisionDebugMeshesRef.current) {
                  try {
                    (_a2 = m.material) == null ? void 0 : _a2.dispose();
                    m.dispose();
                  } catch (e) {
                  }
                }
                collisionDebugMeshesRef.current = [];
              };
              const createDebugMeshes = () => {
                var _a2, _b2;
                disposeDebugMeshes();
                try {
                  (_a2 = skelForDebug.computeAbsoluteMatrices) == null ? void 0 : _a2.call(skelForDebug, true);
                } catch (e) {
                  try {
                    (_b2 = skelForDebug.computeAbsoluteMatrices) == null ? void 0 : _b2.call(skelForDebug);
                  } catch (_) {
                  }
                }
                const lookup = buildSkeletonPosLookup(skelForDebug);
                const meshes = createCollisionDebugMeshes(sceneForDebug, collisionBodies, lookup);
                collisionDebugMeshesRef.current = meshes;
                return meshes.length;
              };
              window.__collisionDebug = {
                /** 列出所有碰撞体 */
                list: () => collisionBodies.map(
                  (b) => b.type === "sphere" ? { type: "sphere", group: b.group, side: b.side, bone: b.boneName, radius: b.radius } : { type: "capsule", group: b.group, side: b.side, boneA: b.boneAName, boneB: b.boneBName, radius: b.radius }
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
                showMeshes: () => {
                  const n = createDebugMeshes();
                  console.log(`[CollisionDebug] 已显示 ${n} 个碰撞体线框`);
                  return n;
                },
                /** 隐藏并销毁所有碰撞体线框 */
                hideMeshes: () => {
                  disposeDebugMeshes();
                  console.log("[CollisionDebug] 已隐藏所有碰撞体线框");
                },
                /** 在显示/隐藏之间切换 */
                toggle: () => {
                  if (collisionDebugMeshesRef.current.length > 0) {
                    disposeDebugMeshes();
                    console.log("[CollisionDebug] toggle → 已隐藏");
                    return false;
                  }
                  const n = createDebugMeshes();
                  console.log(`[CollisionDebug] toggle → 已显示 ${n} 个`);
                  return true;
                },
                /** 获取当前调试网格数量 */
                meshCount: () => collisionDebugMeshesRef.current.length
              };
              console.log(`[Collision] 已暴露 window.__collisionDebug，可调用 .list()/.count()/.showMeshes()/.hideMeshes()/.toggle()`);
            } catch (e) {
              console.warn("[Collision] 暴露调试接口失败:", e);
            }
            try {
              window.__skeleton = analysis.skeleton;
              window.__rootMesh = rootMesh;
              console.log("[Debug] 已暴露 window.__skeleton 和 window.__rootMesh");
            } catch (e) {
            }
            let activeProfile = null;
            try {
              const stdResolution = resolveHumanoidBones((analysis.skeleton.bones || []).map((b) => b.name));
              const modelName = rootMesh && rootMesh.name || "current";
              stdResolution.profile.model = modelName;
              window.__humanoid = stdResolution;
              console.log(`[HumanoidRig] 标准关节解析: ${stdResolution.matched}/${stdResolution.total} 命中` + (stdResolution.missing.length ? `，缺失: ${stdResolution.missing.join(",")}` : "，无缺失"));
              activeProfile = resolveActiveProfile(modelName, stdResolution.profile.joints, stdResolution.missing);
              window.__activeProfile = activeProfile;
              console.log(`[HumanoidRig] 运动档案: source=${activeProfile.source} (${activeProfile.reason})`);
              window.__calibrateProfile = () => {
                try {
                  const result = sampleJointSignatures(analysis.skeleton, activeProfile.profile.joints);
                  const review = signaturesToReviewJson(result);
                  console.log("[Profiler] 轴签名采样完成，校对用 JSON 如下（复制→修正→__saveProfile 固化）:", review);
                  return { ok: true, review, raw: result, currentProfile: activeProfile.profile, storedModels: listStoredProfiles() };
                } catch (e) {
                  console.error("[Profiler] 采样失败:", (e == null ? void 0 : e.message) || e);
                  return { ok: false, error: (e == null ? void 0 : e.message) || String(e) };
                }
              };
              window.__saveProfile = (profile) => {
                try {
                  if (!profile || !profile.joints || !profile.axes) {
                    console.error("[Profiler] 档案格式不合法：需要 { joints, axes }");
                    return { ok: false, error: "invalid profile" };
                  }
                  const ok = saveStoredProfile(modelName, profile);
                  if (ok) {
                    activeProfile = { profile, source: "stored", reason: `人工档案已固化并激活 (${modelName})` };
                    window.__activeProfile = activeProfile;
                    console.log("[Profiler] 档案已固化并激活:", modelName);
                  }
                  return { ok, model: modelName };
                } catch (e) {
                  return { ok: false, error: (e == null ? void 0 : e.message) || String(e) };
                }
              };
              window.__playStdMotion = (input) => {
                try {
                  const motion = typeof input === "string" ? getStdRecipe(input) : input;
                  if (!motion)
                    return { success: false, error: "未知配方: " + input };
                  const plan = buildRetargetPlan(motion, activeProfile.profile);
                  if (plan.tracks.length === 0)
                    return { success: false, error: "无可执行轨道", skipped: plan.skipped };
                  const skeletonBones = analysis.skeleton.bones || [];
                  const drive = (boneName, eulerDeg) => {
                    const bone = skeletonBones.find((b) => b.name === boneName);
                    if (!bone)
                      return false;
                    return safeRotateJoint(bone, {
                      x: eulerDeg.x * Math.PI / 180,
                      y: eulerDeg.y * Math.PI / 180,
                      z: eulerDeg.z * Math.PI / 180
                    }, "std-motion");
                  };
                  const player = playStdMotion(plan, drive, (skipped) => {
                    console.log("[HumanoidRig] 标准动作完成:", motion.id, skipped.length ? "跳过 " + JSON.stringify(skipped) : "");
                  });
                  window.__stdMotionPlayer = player;
                  console.log(`[HumanoidRig] 播放标准动作: ${motion.id} 轨道 ${plan.tracks.length} 条`);
                  return { success: true, id: motion.id, tracks: plan.tracks.length, skipped: plan.skipped };
                } catch (e) {
                  console.error("[HumanoidRig] 播放失败:", (e == null ? void 0 : e.message) || String(e));
                  return { success: false, error: (e == null ? void 0 : e.message) || String(e) };
                }
              };
              console.log("[HumanoidRig] 已暴露 window.__humanoid / __playStdMotion / __calibrateProfile / __saveProfile");
            } catch (e) {
              console.warn("[HumanoidRig] 接线失败:", e);
            }
            console.log(`[BabylonModelViewer] 摆动骨骼: ${swingBones.length} 个（总骨骼 ${analysis.boneCount} 个，站姿骨骼 ${poseCount} 个，蒙皮 ${skinningOk ? "正常" : "异常"}）`);
            swingBonesRef.current = swingBones;
            if (swingBones.length > 0) {
              const startTime = performance.now();
              const SWING_AMP_BASE = 0.04;
              const SWING_AMP_WIND = 0.09;
              const SWING_FREQ = 1.2;
              let tailModelHeight = 20;
              try {
                let minY = Infinity, maxY = -Infinity;
                for (const b of analysis.skeleton.bones) {
                  const m = b._absoluteBindMatrix;
                  if (m) {
                    const y = m.getTranslation().y;
                    if (y < minY)
                      minY = y;
                    if (y > maxY)
                      maxY = y;
                  }
                }
                tailModelHeight = maxY - minY || 20;
              } catch (e) {
              }
              try {
                const tailBonesCount = swingBones.filter((s) => s.isTail).length;
                window.__tailPhysics = {
                  modelHeight: tailModelHeight,
                  tailBonesCount,
                  groundThreshold: tailModelHeight * 0.1,
                  tailBlend: 0.08,
                  easeCurveFormula: "1 - (1-t)^2",
                  easeCurve: (t) => 1 - (1 - t) * (1 - t),
                  startDirFormula: "rootBindDir horizontal projection (drop Y)",
                  physicsModel: "catenary: fixed-end tangent horizontal, free-end vertical, ease-out",
                  diagnose: () => {
                    const tp = window.__tailPhysics;
                    console.log("[TailPhysics] params:", {
                      modelHeight: tp.modelHeight,
                      tailBonesCount: tp.tailBonesCount,
                      groundThreshold: tp.groundThreshold,
                      tailBlend: tp.tailBlend,
                      easeCurve: tp.easeCurveFormula,
                      physics: tp.physicsModel
                    });
                    console.log("[TailPhysics] ease curve sampling:");
                    for (let i = 0; i <= 10; i++) {
                      const tt = i / 10;
                      console.log("  progress=" + tt.toFixed(1) + " -> ease=" + tp.easeCurve(tt).toFixed(3));
                    }
                  }
                };
                console.log("[TailPhysics] window.__tailPhysics exposed, call .diagnose() for params");
              } catch (e) {
              }
              let collisionCache = null;
              let swingFrame = 0;
              const swingObserver = scene.onBeforeRenderObservable.add(() => {
                var _a2, _b2;
                if (loadingRef.current || !physicsOnRef.current || isDraggingRef.current)
                  return;
                const t = (performance.now() - startTime) / 1e3;
                const amp = windEnabled ? SWING_AMP_WIND : SWING_AMP_BASE;
                const collisionEnabled = ((_a2 = window.__collisionDebug) == null ? void 0 : _a2.enabled) !== false;
                if (collisionEnabled && collisionBodiesRef.current.length > 0) {
                  if (swingFrame++ % 3 === 0 || !collisionCache) {
                    const posLookup2 = buildSkeletonPosLookup(analysis.skeleton);
                    const runtimes = buildCollisionRuntimes(collisionBodiesRef.current, posLookup2);
                    collisionCache = { posLookup: posLookup2, runtimes };
                  }
                } else {
                  collisionCache = null;
                }
                const posLookup = (collisionCache == null ? void 0 : collisionCache.posLookup) ?? null;
                const collisionRuntimes = (collisionCache == null ? void 0 : collisionCache.runtimes) ?? null;
                const __springChainEnabled = window.__springChainEnabled === true;
                let __springTargets = null;
                if (__springChainEnabled && window.__springChainSolver) {
                  try {
                    const solver = window.__springChainSolver;
                    const rootPos = /* @__PURE__ */ new Map();
                    const posLookupAll = buildSkeletonPosLookup(analysis.skeleton);
                    for (let ci = 0; ci < solver.chainCount; ci++) {
                      const cid = "c" + ci;
                      const anchor = solver.getRootAnchorBoneName(cid);
                      if (!anchor)
                        continue;
                      const wp = posLookupAll.get(anchor) || posLookupAll.get(anchor);
                      if (wp)
                        rootPos.set(cid, wp);
                    }
                    const dt = Math.max(8e-3, Math.min(0.033, t - (lastObsNowRef.current || t)));
                    __springTargets = solver.step(dt, rootPos, new Vector3(0, -1, 0));
                    lastObsNowRef.current = t;
                  } catch (e) {
                    __springTargets = null;
                  }
                }
                const tailSbs = swingBonesRef.current.filter((s) => s.isTail).sort((a, b) => a.chainIndex - b.chainIndex);
                if (tailSbs.length > 0) {
                  const tailWorldRotCache = /* @__PURE__ */ new Map();
                  let rootTailBindDir = null;
                  try {
                    const rootBone = tailSbs[0].bone;
                    const rootParent = rootBone.getParent ? rootBone.getParent() : rootBone.parent;
                    if (rootParent) {
                      const rootBindM = rootBone._absoluteBindMatrix;
                      const parentBindM = rootParent._absoluteBindMatrix;
                      if (rootBindM && parentBindM) {
                        const rp = parentBindM.getTranslation();
                        const bp = rootBindM.getTranslation();
                        const dir = new Vector3(bp.x - rp.x, bp.y - rp.y, bp.z - rp.z);
                        if (dir.length() > 1e-3) {
                          dir.normalize();
                          rootTailBindDir = dir;
                        }
                      }
                    }
                  } catch (e) {
                  }
                  for (const sb of tailSbs) {
                    const bone = sb.bone;
                    const boneAny = bone;
                    try {
                      const bindM = boneAny._absoluteBindMatrix;
                      const parentBone = bone.getParent ? bone.getParent() : boneAny.parent;
                      const parentBindM = parentBone ? parentBone._absoluteBindMatrix : null;
                      if (!bindM || !parentBindM) {
                        bone.setRotationQuaternion(sb.baseRotation, Space.LOCAL);
                        continue;
                      }
                      const bonePos = bindM.getTranslation();
                      const parentPos = parentBindM.getTranslation();
                      const extDir = new Vector3(bonePos.x - parentPos.x, bonePos.y - parentPos.y, bonePos.z - parentPos.z);
                      const extLen = extDir.length();
                      if (extLen < 1e-3) {
                        bone.setRotationQuaternion(sb.baseRotation, Space.LOCAL);
                        continue;
                      }
                      extDir.scaleInPlace(1 / extLen);
                      const _dsBind = new Vector3();
                      const bindRotI = new Quaternion();
                      bindM.decompose(_dsBind, bindRotI, void 0);
                      const bindRotIConj = bindRotI.clone();
                      bindRotIConj.conjugateInPlace();
                      const localRestDir = new Vector3();
                      extDir.rotateByQuaternionToRef(bindRotIConj, localRestDir);
                      let parentCurrentRot;
                      if (parentBone && tailWorldRotCache.has(parentBone.name)) {
                        parentCurrentRot = tailWorldRotCache.get(parentBone.name).clone();
                      } else if (parentBone && parentBone._absoluteBindMatrix) {
                        const _dsP = new Vector3();
                        parentCurrentRot = new Quaternion();
                        parentBone._absoluteBindMatrix.decompose(_dsP, parentCurrentRot, void 0);
                      } else {
                        parentCurrentRot = Quaternion.Identity();
                      }
                      if (!boneAny.__tailSpringState) {
                        boneAny.__tailSpringState = { currentQuat: sb.baseRotation.clone() };
                      }
                      const ts = boneAny.__tailSpringState;
                      const currentWorldRot = parentCurrentRot.multiply(ts.currentQuat);
                      const currentWorldDir = new Vector3();
                      localRestDir.rotateByQuaternionToRef(currentWorldRot, currentWorldDir);
                      const cwLen = currentWorldDir.length();
                      if (cwLen > 1e-3)
                        currentWorldDir.scaleInPlace(1 / cwLen);
                      const chainProgress = tailSbs.length > 1 ? sb.chainIndex / (tailSbs.length - 1) : 1;
                      const easeCurve = 1 - (1 - chainProgress) * (1 - chainProgress);
                      const startDirRaw = rootTailBindDir || extDir;
                      const horizMag = Math.sqrt(startDirRaw.x * startDirRaw.x + startDirRaw.z * startDirRaw.z);
                      const startDir = new Vector3();
                      if (horizMag > 0.1) {
                        startDir.x = startDirRaw.x / horizMag;
                        startDir.z = startDirRaw.z / horizMag;
                        startDir.y = 0;
                      } else if (startDirRaw.y < 0) {
                        startDir.copyFrom(startDirRaw);
                      } else {
                        startDir.set(0, 0, 1);
                      }
                      const endDir = new Vector3(0, -1, 0);
                      const targetDir = Vector3.Lerp(startDir, endDir, easeCurve);
                      const tLen = targetDir.length();
                      if (tLen < 1e-3)
                        targetDir.copyFrom(endDir);
                      else
                        targetDir.scaleInPlace(1 / tLen);
                      const groundThreshold = tailModelHeight * 0.1;
                      const estY = bonePos.y - chainProgress * extLen * tailSbs.length * 0.3;
                      if (estY < groundThreshold && chainProgress > 0.5) {
                        const liftFactor = Math.max(0, Math.min(1, (groundThreshold - estY) / groundThreshold));
                        const lifted = Vector3.Lerp(targetDir, new Vector3(0, 1, 0), liftFactor * 0.35);
                        const lLen = lifted.length();
                        if (lLen > 1e-3)
                          lifted.scaleInPlace(1 / lLen);
                        targetDir.copyFrom(lifted);
                      }
                      const dot = Math.max(-1, Math.min(1, Vector3.Dot(currentWorldDir, targetDir)));
                      let worldDelta;
                      if (dot > 0.9999) {
                        worldDelta = Quaternion.Identity();
                      } else if (dot < -0.9999) {
                        worldDelta = Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI);
                      } else {
                        const rotAxis = Vector3.Cross(currentWorldDir, targetDir);
                        rotAxis.normalize();
                        worldDelta = Quaternion.RotationAxis(rotAxis, Math.acos(dot));
                      }
                      const parentConj = parentCurrentRot.clone();
                      parentConj.conjugateInPlace();
                      const localDelta = parentConj.multiply(worldDelta).multiply(parentCurrentRot);
                      const finalLocal = localDelta.multiply(sb.baseRotation);
                      const ySwing = Math.sin(t * 0.7 + sb.phase) * Math.min(0.02, 3e-3 * (1 + sb.chainIndex * 0.02));
                      const swingQuat = Quaternion.FromEulerAngles(0, ySwing, 0);
                      const targetWithSwing = finalLocal.multiply(swingQuat);
                      const tailBlend = 0.08;
                      const dampedQuat = Quaternion.Slerp(ts.currentQuat, targetWithSwing, tailBlend);
                      ts.currentQuat = dampedQuat.clone();
                      bone.setRotationQuaternion(dampedQuat, Space.LOCAL);
                      const boneWorldRot = parentCurrentRot.multiply(dampedQuat);
                      tailWorldRotCache.set(bone.name, boneWorldRot);
                      if (BONE_DEBUG) {
                        if (!boneAny.__tailLogFrame)
                          boneAny.__tailLogFrame = 0;
                        boneAny.__tailLogFrame++;
                        if (boneAny.__tailLogFrame % 120 === 0) {
                          console.log(`[TailDroop] ${bone.name} chain=${sb.chainIndex}/${tailSbs.length} prog=${chainProgress.toFixed(2)} ease=${easeCurve.toFixed(2)} cur=(${currentWorldDir.x.toFixed(2)},${currentWorldDir.y.toFixed(2)},${currentWorldDir.z.toFixed(2)}) tgt=(${targetDir.x.toFixed(2)},${targetDir.y.toFixed(2)},${targetDir.z.toFixed(2)}) estY=${estY.toFixed(2)}`);
                        }
                      }
                    } catch (e) {
                      try {
                        bone.setRotationQuaternion(sb.baseRotation, Space.LOCAL);
                      } catch (_) {
                      }
                    }
                  }
                }
                for (const { bone, baseRotation, phase, axis, isTail, collisionGroup } of swingBonesRef.current) {
                  if (isTail)
                    continue;
                  if (__springTargets && __springTargets.has(bone.name) && !isTail) {
                    const worldDelta = __springTargets.get(bone.name);
                    const parentBone3 = bone.getParent ? bone.getParent() : bone.parent;
                    let targetLocal = worldDelta;
                    if (parentBone3) {
                      try {
                        const pw = ((_b2 = parentBone3.getAbsoluteRotationQuaternion) == null ? void 0 : _b2.call(parentBone3)) || parentBone3.rotationQuaternion || Quaternion.Identity();
                        const pc = pw.clone();
                        pc.conjugateInPlace();
                        targetLocal = pc.multiply(worldDelta).multiply(pw);
                      } catch (_) {
                      }
                    }
                    const blended = Quaternion.Slerp(baseRotation, baseRotation.multiply(targetLocal), 0.2);
                    try {
                      bone.setRotationQuaternion(blended, Space.LOCAL);
                    } catch (_) {
                    }
                    continue;
                  }
                  let offset = Math.sin(t * SWING_FREQ + phase) * amp;
                  if (posLookup && collisionRuntimes) {
                    try {
                      const bonePos = posLookup.get(bone.name);
                      if (bonePos) {
                        let filteredSpheres = collisionRuntimes.spheres;
                        let filteredCapsules = collisionRuntimes.capsules;
                        if (collisionGroup === "hair") {
                          filteredSpheres = collisionRuntimes.spheres.filter((s) => s.group !== "head");
                        } else if (collisionGroup === "skirt") {
                          filteredCapsules = collisionRuntimes.capsules.filter((c) => c.group !== "spine");
                        }
                        const original = bonePos.clone();
                        const resolved = resolveCollisionForPoint(
                          bonePos,
                          filteredSpheres,
                          filteredCapsules
                        );
                        const pushDist = Vector3.Distance(original, resolved);
                        if (pushDist > 1e-3) {
                          const shrinkFactor = Math.max(0.2, 1 / (1 + Math.exp(pushDist * 40 - 2)));
                          offset *= shrinkFactor;
                        }
                      }
                    } catch (e) {
                    }
                  }
                  const hairOffsetQuat = Quaternion.FromEulerAngles(
                    axis === "x" ? offset : 0,
                    axis === "y" ? offset : 0,
                    axis === "z" ? offset : 0
                  );
                  const hairFinalQuat = baseRotation.multiply(hairOffsetQuat);
                  try {
                    bone.setRotationQuaternion(hairFinalQuat, Space.LOCAL);
                  } catch (e) {
                  }
                }
              });
              swingObserverRef.current = swingObserver;
              setPhysicsStatus(`已启用（骨骼 ${analysis.boneCount} / 摆动 ${swingBones.length} / 站姿 ${poseCount}）`);
              (() => {
                if (!desktopPetMode) {
                  console.log("[BabylonModelViewer] [v60] 预览模式：保持原生朝向，跳过关节转身");
                  return;
                }
                try {
                  const skelOrient = analysis.skeleton;
                  const rootBone = skelOrient.bones.find((b) => b.name === "全ての親");
                  if (rootBone) {
                    const baseQ = rootBone.getRotationQuaternion(Space.LOCAL) || Quaternion.Identity();
                    const yawQ = Quaternion.RotationAxis(new Vector3(0, 1, 0), Math.PI);
                    rootBone.setRotationQuaternion(baseQ.multiply(yawQ), Space.LOCAL);
                    console.log("[BabylonModelViewer] [v60] 全ての親 关节转身 180° 完成（面向 +Z）");
                  } else {
                    console.warn("[BabylonModelViewer] [v60] 未找到 全ての親 骨骼，朝向保持原生");
                  }
                } catch (e) {
                  console.warn("[BabylonModelViewer] [v60] 关节转身失败:", e);
                }
              })();
              window.addEventListener("preview-heavy-release", () => {
                var _a2, _b2;
                try {
                  (_a2 = sceneRef.current) == null ? void 0 : _a2.dispose();
                } catch (e) {
                }
                try {
                  (_b2 = engineRef.current) == null ? void 0 : _b2.dispose();
                } catch (e) {
                }
                console.warn("[BabylonModelViewer] preview-heavy-release：场景与引擎已释放");
              });
              console.log("[BabylonModelViewer] 骨骼驱动流程完成（解析+蒙皮+站姿+摆动）");
            } else if (physicsEnabled) {
              setPhysicsStatus(`已解析 ${analysis.boneCount} 骨骼，站姿 ${poseCount}，未找到摆动候选`);
              console.warn("[BabylonModelViewer] 未找到头发/衣摆骨骼，仅设置站姿，摆动未启用");
            } else {
              setPhysicsStatus(`仅站姿（骨骼 ${analysis.boneCount} / 站姿 ${poseCount}，摆动已关闭）`);
              console.log("[BabylonModelViewer] 物理模组关闭，仅应用自然站姿，摆动未启用");
            }
            humanBodyRef.current = humanBody;
            analysisRef.current = analysis;
            if (humanBody) {
              try {
                const breathBones = [];
                const collectBreathBone = (bone) => {
                  if (!bone)
                    return;
                  try {
                    const basePos = bone.getPosition(Space.LOCAL).clone();
                    breathBones.push({ bone, basePos });
                  } catch (e) {
                  }
                };
                collectBreathBone(humanBody.spine.chest);
                collectBreathBone(humanBody.spine.upperSpine);
                const shoulderBones = [];
                const collectShoulder = (arm) => {
                  if (!(arm == null ? void 0 : arm.shoulder))
                    return;
                  try {
                    const baseQuat = arm.shoulder.getRotationQuaternion(Space.LOCAL).clone();
                    shoulderBones.push({ bone: arm.shoulder, baseQuat, side: arm.side });
                  } catch (e) {
                  }
                };
                collectShoulder(humanBody.leftArm);
                collectShoulder(humanBody.rightArm);
                try {
                  const restMap = restPoseRef.current;
                  restMap.clear();
                  const pushRest = (bone) => {
                    if (!bone)
                      return;
                    try {
                      restMap.set(bone, bone.getRotationQuaternion(Space.LOCAL).clone());
                    } catch (e) {
                    }
                  };
                  for (const arm of [humanBody.leftArm, humanBody.rightArm]) {
                    if (arm) {
                      pushRest(arm.shoulder);
                      pushRest(arm.upperArm);
                      pushRest(arm.lowerArm);
                      pushRest(arm.hand);
                    }
                  }
                  for (const leg of [humanBody.leftLeg, humanBody.rightLeg]) {
                    if (leg) {
                      pushRest(leg.upperLeg);
                      pushRest(leg.lowerLeg);
                      pushRest(leg.foot);
                    }
                  }
                  const sp = humanBody.spine;
                  if (sp) {
                    pushRest(sp.head);
                    pushRest(sp.neck);
                    pushRest(sp.chest);
                    pushRest(sp.upperSpine);
                    pushRest(sp.lowerSpine);
                  }
                  console.log(`[AnimSystem] rest pose 基准快照: ${restMap.size} 关节`);
                } catch (e) {
                }
                const buildAction = (action, params) => {
                  var _a2, _b2, _c2, _d2, _e2;
                  const actionBones = [];
                  const rigRoleMap = (() => {
                    const m = /* @__PURE__ */ new Map();
                    const put = (b, role) => {
                      if (b)
                        m.set(b, role);
                    };
                    if (humanBody.spine) {
                      put(humanBody.spine.head, "head");
                      put(humanBody.spine.neck, "neck");
                      put(humanBody.spine.chest, "chest");
                      put(humanBody.spine.upperSpine, "spineUpper");
                      put(humanBody.spine.lowerSpine, "spineLower");
                    }
                    for (const S of ["L", "R"]) {
                      const A = S === "L" ? humanBody.leftArm : humanBody.rightArm;
                      if (A) {
                        put(A.shoulder, "shoulder" + S);
                        put(A.upperArm, "upperArm" + S);
                        put(A.lowerArm, "lowerArm" + S);
                        put(A.hand, "hand" + S);
                      }
                      const Lg = S === "L" ? humanBody.leftLeg : humanBody.rightLeg;
                      if (Lg) {
                        put(Lg.upperLeg, "upperLeg" + S);
                        put(Lg.lowerLeg, "lowerLeg" + S);
                        put(Lg.foot, "foot" + S);
                      }
                    }
                    return m;
                  })();
                  const addActionBone = (bone, delay = 0) => {
                    if (!bone)
                      return;
                    try {
                      const rest = restPoseRef.current.get(bone);
                      const bq = rest ? rest.clone() : bone.getRotationQuaternion(Space.LOCAL).clone();
                      actionBones.push({ bone, baseQuat: bq, delay, role: rigRoleMap.get(bone) });
                    } catch (e) {
                    }
                  };
                  const addActionBoneWithD = (bone, delay = 0) => {
                    addActionBone(bone, delay);
                    if (bone && bone.name) {
                      try {
                        const sk = bone.getSkeleton();
                        const d = sk ? sk.bones.find((b) => b.name === bone.name + "D") : null;
                        if (d) {
                          const roleD = rigRoleMap.get(bone);
                          const restD = restPoseRef.current.get(d);
                          const bqD = restD ? restD.clone() : d.getRotationQuaternion(Space.LOCAL).clone();
                          actionBones.push({ bone: d, baseQuat: bqD, delay, role: roleD });
                        }
                      } catch (e) {
                      }
                    }
                  };
                  const P = params || {};
                  const num = (v, d, min, max) => {
                    const n = Number(v);
                    return Number.isNaN(n) ? d : Math.min(max, Math.max(min, n));
                  };
                  const np = { timing: TIMING_PRESETS[P.timing] ? P.timing : "normal" };
                  if (action === "nod" || action === "shake") {
                    np.angle = num(P.angle, action === "nod" ? 18 : 25, 5, 45);
                    np.count = Math.round(num(P.count, 1, 1, 4));
                  } else if (action === "turnHead") {
                    np.angle = num(P.angle, 30, -60, 60);
                  } else if (action === "turnBody") {
                    np.angle = num(P.angle, 45, -90, 90);
                  } else if (action === "squat") {
                    np.depth = num(P.depth, 0.6, 0.2, 1);
                  } else if (action === "jump") {
                    np.height = num(P.height, 0.3, 0.1, 0.8);
                    np.duration = num(P.duration, 3.2, 1.5, 5);
                  } else if (action === "wave") {
                    np.amplitude = num(P.amplitude, 0.7, 0.1, 1);
                    np.freq = num(P.freq, 2, 0.5, 4);
                    np.duration = num(P.duration, 6, 2, 600);
                  } else if (action === "tiltHead") {
                    np.side = P.side === "left" || P.side === "right" ? P.side : "left";
                    np.angle = num(P.angle, 15, 0, 25);
                  } else if (action === "bow") {
                    np.depth = num(P.depth, 0.6, 0.2, 1);
                    np.duration = num(P.duration, 2.5, 1, 6);
                  } else if (action === "clap") {
                    np.count = Math.round(num(P.count, 3, 1, 6));
                    np.speed = P.speed === "slow" || P.speed === "quick" ? P.speed : "normal";
                  } else if (action === "spreadHands") {
                    np.amplitude = num(P.amplitude, 0.7, 0.3, 1);
                    np.duration = num(P.duration, 2, 1, 6);
                  } else if (action === "thumbsUp") {
                    np.side = ["left", "right", "both"].includes(P.side) ? P.side : "right";
                    np.hold = num(P.hold, 1.5, 0.5, 5);
                  } else if (action === "comeHere") {
                    np.side = ["left", "right", "both"].includes(P.side) ? P.side : "right";
                    np.count = Math.round(num(P.count, 2, 1, 4));
                  } else if (action === "refuse") {
                    np.side = ["left", "right", "both"].includes(P.side) ? P.side : "right";
                    np.count = Math.round(num(P.count, 2, 1, 4));
                  } else if (action === "standUp") {
                    np.speed = ["quick", "normal", "slow"].includes(P.speed) ? P.speed : "normal";
                  } else if (action === "bendForward") {
                    np.angle = num(P.angle, 45, 5, 90);
                    np.hold = num(P.hold, 1.5, 0, 5);
                  } else if (action === "lookUp" || action === "lookDown") {
                    np.angle = num(P.angle, 20, 5, 45);
                  } else if (action === "legKick") {
                    np.side = P.side === "left" || P.side === "right" ? P.side : "right";
                    np.power = num(P.power, 0.6, 0.2, 1);
                  } else if (action === "point") {
                    np.dir = ["up", "down", "left", "right"].includes(P.dir) ? P.dir : "right";
                    np.hold = num(P.hold, 2, 0.5, 5);
                  } else if (action === "offerHand") {
                    np.side = P.side === "left" || P.side === "right" ? P.side : "right";
                    np.hold = num(P.hold, 1.5, 0.5, 5);
                  } else if (action === "bounce") {
                    np.freq = num(P.freq, 1.5, 0.5, 3);
                    np.amplitude = num(P.amplitude, 0.5, 0.2, 1);
                    np.duration = num(P.duration, 2.5, 1, 8);
                  } else if (action === "stomp") {
                    np.side = ["left", "right", "both"].includes(P.side) ? P.side : "left";
                    np.count = Math.round(num(P.count, 2, 1, 4));
                    np.power = num(P.power, 0.6, 0.2, 1);
                  } else if (action === "cheer") {
                    np.amplitude = num(P.amplitude, 0.8, 0.3, 1);
                    np.duration = num(P.duration, 2.5, 1, 5);
                  } else if (action === "approach") {
                    np.steps = Math.round(num(P.steps, 2, 1, 4));
                    np.speed = P.speed === "slow" || P.speed === "quick" ? P.speed : "normal";
                  }
                  let duration = 2e3;
                  switch (action) {
                    case "wave":
                      if (humanBody.rightArm) {
                        addActionBone(humanBody.rightArm.shoulder, 0);
                        addActionBone(humanBody.rightArm.upperArm, 120);
                        addActionBone(humanBody.rightArm.lowerArm, 240);
                        try {
                          const twist = humanBody.rightArm.upperArm.getSkeleton().bones.find((b) => b.name === "右腕捩");
                          if (twist)
                            addActionBone(twist, 300);
                        } catch {
                        }
                        addActionBone(humanBody.rightArm.hand, 360);
                      }
                      if ((params == null ? void 0 : params.side) === "both" && humanBody.leftArm) {
                        addActionBone(humanBody.leftArm.shoulder, 0);
                        addActionBone(humanBody.leftArm.upperArm, 120);
                        addActionBone(humanBody.leftArm.lowerArm, 240);
                        try {
                          const twistL = humanBody.leftArm.upperArm.getSkeleton().bones.find((b) => b.name === "左腕捩");
                          if (twistL)
                            addActionBone(twistL, 300);
                        } catch {
                        }
                        addActionBone(humanBody.leftArm.hand, 360);
                      }
                      duration = Math.round(np.duration * 1e3);
                      break;
                    case "nod":
                      addActionBone(humanBody.spine.head);
                      addActionBone(humanBody.spine.neck);
                      duration = 1500;
                      break;
                    case "shake":
                      addActionBone(humanBody.spine.head);
                      addActionBone(humanBody.spine.neck);
                      duration = 1800;
                      break;
                    case "block":
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
                    case "turnHead":
                      addActionBone(humanBody.spine.head);
                      addActionBone(humanBody.spine.neck);
                      duration = 2500;
                      break;
                    case "turnBody":
                      addActionBone(humanBody.spine.upperSpine);
                      addActionBone(humanBody.spine.lowerSpine);
                      addActionBone(humanBody.spine.chest);
                      duration = 3e3;
                      break;
                    case "squat":
                      {
                        const sqSk = humanBody.leftLeg && humanBody.leftLeg.upperLeg ? humanBody.leftLeg.upperLeg.getSkeleton() : null;
                        const cbSq = sqSk ? sqSk.bones.find((b) => b.name === "センター") : null;
                        if (cbSq) {
                          try {
                            const restSq = restPoseRef.current.get(cbSq);
                            actionBones.push({ bone: cbSq, baseQuat: restSq ? restSq.clone() : cbSq.getRotationQuaternion(Space.LOCAL).clone(), delay: 0, basePos: cbSq.position ? cbSq.position.clone() : new Vector3(0, 0, 0) });
                          } catch (e) {
                          }
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
                      if (humanBody.leftArm)
                        addActionBone(humanBody.leftArm.shoulder, 150);
                      if (humanBody.rightArm)
                        addActionBone(humanBody.rightArm.shoulder, 150);
                      duration = 3600;
                      break;
                    case "stretch":
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
                      addActionBone(humanBody.spine.head, 250);
                      addActionBone(humanBody.spine.neck, 250);
                      duration = 4200;
                      break;
                    case "turnLeft":
                      addActionBone(humanBody.spine.upperSpine, 0);
                      addActionBone(humanBody.spine.lowerSpine, 80);
                      addActionBone(humanBody.spine.chest, 0);
                      addActionBone(humanBody.spine.head, 150);
                      addActionBone(humanBody.spine.neck, 150);
                      duration = 2600;
                      break;
                    case "jump": {
                      const jumpSk = humanBody.leftLeg && humanBody.leftLeg.upperLeg ? humanBody.leftLeg.upperLeg.getSkeleton() : null;
                      if (jumpSk) {
                        const cb = jumpSk.bones.find((b) => b.name === "センター");
                        if (cb) {
                          try {
                            const restJ = restPoseRef.current.get(cb);
                            actionBones.push({ bone: cb, baseQuat: restJ ? restJ.clone() : cb.getRotationQuaternion(Space.LOCAL).clone(), delay: 0, basePos: cb.position ? cb.position.clone() : new Vector3(0, 0, 0) });
                          } catch (e) {
                          }
                        }
                      }
                      addActionBoneWithD(humanBody.leftLeg ? humanBody.leftLeg.upperLeg : void 0, 0);
                      addActionBoneWithD(humanBody.rightLeg ? humanBody.rightLeg.upperLeg : void 0, 0);
                      addActionBoneWithD(humanBody.leftLeg ? humanBody.leftLeg.lowerLeg : void 0, 0);
                      addActionBoneWithD(humanBody.rightLeg ? humanBody.rightLeg.lowerLeg : void 0, 0);
                      addActionBoneWithD(humanBody.leftLeg ? humanBody.leftLeg.foot : void 0, 0);
                      addActionBoneWithD(humanBody.rightLeg ? humanBody.rightLeg.foot : void 0, 0);
                      addActionBone(humanBody.spine.upperSpine, 0);
                      addActionBone(humanBody.spine.lowerSpine, 0);
                      if (humanBody.leftArm)
                        addActionBone(humanBody.leftArm.shoulder, 0);
                      if (humanBody.rightArm)
                        addActionBone(humanBody.rightArm.shoulder, 0);
                      duration = Math.round(np.duration * 1e3);
                      break;
                    }
                    case "turnRight":
                      addActionBone(humanBody.spine.upperSpine, 0);
                      addActionBone(humanBody.spine.lowerSpine, 80);
                      addActionBone(humanBody.spine.chest, 0);
                      addActionBone(humanBody.spine.head, 150);
                      addActionBone(humanBody.spine.neck, 150);
                      duration = 2600;
                      break;
                    case "reset":
                      try {
                        const n = (_b2 = (_a2 = window.__jointControl) == null ? void 0 : _a2.resetAll) == null ? void 0 : _b2.call(_a2);
                        console.log(`[AnimSystem] reset 平滑复位: ${n} 个关节`);
                      } catch (e) {
                        console.warn("[AnimSystem] reset 复位失败:", e);
                      }
                      duration = 600;
                      break;
                    case "spin": {
                      const sp = params || {};
                      const turns = Math.min(3, Math.max(0.5, Number(sp.turns) || 1));
                      const dirSign = sp.dir === "right" ? -1 : 1;
                      try {
                        const sk = humanBody.leftLeg && humanBody.leftLeg.upperLeg ? humanBody.leftLeg.upperLeg.getSkeleton() : humanBody.spine.head ? humanBody.spine.head.getSkeleton() : null;
                        const cb = sk ? sk.bones.find((b) => b.name === "センター") : null;
                        if (cb) {
                          try {
                            const rest = restPoseRef.current.get(cb);
                            actionBones.push({ bone: cb, baseQuat: rest ? rest.clone() : cb.getRotationQuaternion(Space.LOCAL).clone(), delay: 0, spinTurns: turns, spinDir: dirSign });
                          } catch (e) {
                          }
                        }
                      } catch (e) {
                      }
                      duration = Math.round(turns * 2200 + 1e3);
                      break;
                    }
                    case "limbRaise": {
                      const lp = params || {};
                      const limb = lp.limb === "arm" || lp.limb === "leg" ? lp.limb : "leg";
                      const side = lp.side === "left" || lp.side === "right" || lp.side === "both" ? lp.side : "left";
                      const h = Math.min(0.9, Math.max(0.3, Number(lp.height) || 0.55));
                      const sides = side === "both" ? ["left", "right"] : [side];
                      const taggedFrom = actionBones.length;
                      for (const S of sides) {
                        const H = S === "left" ? humanBody.leftArm : humanBody.rightArm;
                        const L = S === "left" ? humanBody.leftLeg : humanBody.rightLeg;
                        if (limb === "arm" && H) {
                          if (H.shoulder)
                            addActionBone(H.shoulder, 0);
                          if (H.upperArm)
                            addActionBone(H.upperArm, 150);
                          if (H.lowerArm)
                            addActionBone(H.lowerArm, 300);
                        } else if (limb === "leg" && L) {
                          if (L.upperLeg)
                            addActionBoneWithD(L.upperLeg, 0);
                          if (L.lowerLeg)
                            addActionBoneWithD(L.lowerLeg, 140);
                          if (L.foot)
                            addActionBoneWithD(L.foot, 260);
                        }
                      }
                      for (let k = taggedFrom; k < actionBones.length; k++) {
                        const ab = actionBones[k];
                        ab.lrLimb = limb;
                        ab.lrSide = detectSide(((_c2 = ab.bone) == null ? void 0 : _c2.name) || "") || sides[0];
                        ab.lrHeight = h;
                      }
                      if (actionBones.length === taggedFrom) {
                        try {
                          (_e2 = (_d2 = window.__jointControl) == null ? void 0 : _d2.resetAll) == null ? void 0 : _e2.call(_d2);
                        } catch (e) {
                        }
                      }
                      duration = 2100;
                      break;
                    }
                    case "tiltHead": {
                      addActionBone(humanBody.spine.head);
                      addActionBone(humanBody.spine.neck);
                      duration = 1400;
                      break;
                    }
                    case "bow": {
                      addActionBone(humanBody.spine.upperSpine, 0);
                      addActionBone(humanBody.spine.chest, 100);
                      addActionBone(humanBody.spine.head, 200);
                      addActionBone(humanBody.spine.neck, 200);
                      duration = Math.round(np.duration * 1e3);
                      break;
                    }
                    case "clap": {
                      for (const A of [humanBody.leftArm, humanBody.rightArm]) {
                        if (!A)
                          continue;
                        addActionBone(A.shoulder, 0);
                        addActionBone(A.upperArm, 100);
                        addActionBone(A.lowerArm, 200);
                        addActionBone(A.hand, 280);
                      }
                      const spdF = np.speed === "quick" ? 1.4 : np.speed === "slow" ? 0.7 : 1;
                      duration = Math.round(np.count * (620 / spdF) + 400);
                      break;
                    }
                    case "spreadHands": {
                      for (const A of [humanBody.leftArm, humanBody.rightArm]) {
                        if (!A)
                          continue;
                        addActionBone(A.shoulder, 0);
                        addActionBone(A.upperArm, 100);
                        addActionBone(A.lowerArm, 220);
                        addActionBone(A.hand, 300);
                      }
                      duration = Math.round(np.duration * 1e3);
                      break;
                    }
                    case "thumbsUp": {
                      const tSides = np.side === "both" ? ["left", "right"] : [np.side];
                      for (const S of tSides) {
                        const A = S === "left" ? humanBody.leftArm : humanBody.rightArm;
                        if (!A)
                          continue;
                        addActionBone(A.shoulder, 0);
                        addActionBone(A.upperArm, 120);
                        addActionBone(A.lowerArm, 240);
                        addActionBone(A.hand, 320);
                      }
                      duration = Math.round((np.hold + 2.2) * 1e3);
                      break;
                    }
                    case "comeHere": {
                      const cSides = np.side === "both" ? ["left", "right"] : [np.side];
                      for (const S of cSides) {
                        const A = S === "left" ? humanBody.leftArm : humanBody.rightArm;
                        if (!A)
                          continue;
                        addActionBone(A.shoulder, 0);
                        addActionBone(A.upperArm, 120);
                        addActionBone(A.lowerArm, 240);
                        addActionBone(A.hand, 320);
                      }
                      duration = Math.round(np.count * 1100 + 500);
                      break;
                    }
                    case "refuse": {
                      const rSides = np.side === "both" ? ["left", "right"] : [np.side];
                      for (const S of rSides) {
                        const A = S === "left" ? humanBody.leftArm : humanBody.rightArm;
                        if (!A)
                          continue;
                        addActionBone(A.shoulder, 0);
                        addActionBone(A.upperArm, 120);
                        addActionBone(A.lowerArm, 240);
                        addActionBone(A.hand, 320);
                      }
                      duration = Math.round(np.count * 950 + 500);
                      break;
                    }
                    case "standUp": {
                      for (const Lg of [humanBody.leftLeg, humanBody.rightLeg]) {
                        if (!Lg)
                          continue;
                        addActionBoneWithD(Lg.upperLeg, 0);
                        addActionBoneWithD(Lg.lowerLeg, 100);
                        addActionBoneWithD(Lg.foot, 200);
                      }
                      if (humanBody.leftArm)
                        addActionBone(humanBody.leftArm.shoulder, 150);
                      if (humanBody.rightArm)
                        addActionBone(humanBody.rightArm.shoulder, 150);
                      duration = np.speed === "quick" ? 1400 : np.speed === "slow" ? 3200 : 2200;
                      break;
                    }
                    case "bendForward": {
                      addActionBone(humanBody.spine.upperSpine, 0);
                      addActionBone(humanBody.spine.chest, 100);
                      addActionBone(humanBody.spine.head, 220);
                      addActionBone(humanBody.spine.neck, 220);
                      duration = Math.round(np.hold * 1e3 + 3e3);
                      break;
                    }
                    case "lookUp":
                    case "lookDown": {
                      addActionBone(humanBody.spine.head);
                      addActionBone(humanBody.spine.neck);
                      duration = 1500;
                      break;
                    }
                    case "legKick": {
                      const K = np.side === "left" ? humanBody.leftLeg : humanBody.rightLeg;
                      if (K) {
                        addActionBoneWithD(K.upperLeg, 0);
                        addActionBoneWithD(K.lowerLeg, 120);
                        addActionBoneWithD(K.foot, 220);
                      }
                      duration = 1800;
                      break;
                    }
                    case "point": {
                      const A = np.dir === "left" ? humanBody.leftArm : humanBody.rightArm;
                      if (A) {
                        addActionBone(A.shoulder, 0);
                        addActionBone(A.upperArm, 120);
                        addActionBone(A.lowerArm, 240);
                        addActionBone(A.hand, 320);
                      }
                      duration = Math.round((np.hold + 2.2) * 1e3);
                      break;
                    }
                    case "offerHand": {
                      const O = np.side === "left" ? humanBody.leftArm : humanBody.rightArm;
                      if (O) {
                        addActionBone(O.shoulder, 0);
                        addActionBone(O.upperArm, 120);
                        addActionBone(O.lowerArm, 240);
                        addActionBone(O.hand, 320);
                      }
                      duration = Math.round((np.hold + 2) * 1e3);
                      break;
                    }
                    case "bounce": {
                      for (const Lg of [humanBody.leftLeg, humanBody.rightLeg]) {
                        if (!Lg)
                          continue;
                        addActionBone(Lg.upperLeg, 0);
                        addActionBone(Lg.lowerLeg, 80);
                      }
                      addActionBone(humanBody.spine.upperSpine, 0);
                      duration = Math.round(np.duration * 1e3);
                      break;
                    }
                    case "stomp": {
                      const sSides = np.side === "both" ? ["left", "right"] : [np.side];
                      for (const S of sSides) {
                        const Lg = S === "left" ? humanBody.leftLeg : humanBody.rightLeg;
                        if (!Lg)
                          continue;
                        addActionBone(Lg.upperLeg, 0);
                        addActionBone(Lg.lowerLeg, 120);
                        addActionBone(Lg.foot, 220);
                      }
                      duration = Math.round(np.count * 900 + 600);
                      break;
                    }
                    case "cheer": {
                      for (const A of [humanBody.leftArm, humanBody.rightArm]) {
                        if (!A)
                          continue;
                        addActionBone(A.shoulder, 0);
                        addActionBone(A.upperArm, 120);
                        addActionBone(A.lowerArm, 260);
                        addActionBone(A.hand, 320);
                      }
                      addActionBone(humanBody.spine.head, 200);
                      duration = Math.round(np.duration * 1e3);
                      break;
                    }
                    case "approach": {
                      try {
                        const skA = humanBody.leftLeg && humanBody.leftLeg.upperLeg ? humanBody.leftLeg.upperLeg.getSkeleton() : humanBody.spine.head ? humanBody.spine.head.getSkeleton() : null;
                        const cbA = skA ? skA.bones.find((b) => b.name === "センター") : null;
                        if (cbA) {
                          const restA = restPoseRef.current.get(cbA);
                          actionBones.push({ bone: cbA, baseQuat: restA ? restA.clone() : cbA.getRotationQuaternion(Space.LOCAL).clone(), delay: 0, basePos: cbA.position ? cbA.position.clone() : new Vector3(0, 0, 0) });
                        }
                      } catch (e) {
                      }
                      for (const Lg of [humanBody.leftLeg, humanBody.rightLeg]) {
                        if (!Lg)
                          continue;
                        addActionBone(Lg.upperLeg, 0);
                        addActionBone(Lg.lowerLeg, 80);
                      }
                      if (humanBody.leftArm)
                        addActionBone(humanBody.leftArm.upperArm, 0);
                      if (humanBody.rightArm)
                        addActionBone(humanBody.rightArm.upperArm, 0);
                      const apdF = np.speed === "quick" ? 1.4 : np.speed === "slow" ? 0.7 : 1;
                      duration = Math.round(np.steps * 900 / apdF + 600);
                      break;
                    }
                  }
                  return { actionBones, duration, params: np };
                };
                const tryStartQueued = () => {
                  const q = animQueueRef.current;
                  if (q.length === 0)
                    return;
                  const s = animStateRef.current;
                  if (s.action !== "idle")
                    return;
                  const head = q[0];
                  const hSpec = PetActionExecutor.spec(head.action);
                  if (!hSpec) {
                    q.shift();
                    return;
                  }
                  const busyCh = [];
                  for (const ly of animLayersRef.current) {
                    const lsp = PetActionExecutor.spec(ly.action);
                    if (lsp)
                      busyCh.push(...lsp.channels || []);
                  }
                  if ((hSpec.channels || []).some((c) => busyCh.includes(c))) {
                    console.log(`[AnimSystem] 队列头 ${head.action} 与活跃并发层通道冲突，继续等待`);
                    return;
                  }
                  q.shift();
                  console.log(`[AnimSystem] 队列接续: ${head.action}（剩余 ${q.length}）`);
                  triggerAction(head.action, head.params);
                };
                const triggerAction = (action, params) => {
                  const state = animStateRef.current;
                  if (state.action !== "idle") {
                    const spec = PetActionExecutor.spec(action);
                    const pSpec = PetActionExecutor.spec(state.action);
                    if (spec && pSpec && action !== "reset" && state.action !== "reset" && spec.lock === "free" && pSpec.lock === "free" && animLayersRef.current.length < 1 && !(spec.channels || []).some((c) => (pSpec.channels || []).includes(c))) {
                      const built2 = buildAction(action, params);
                      animLayersRef.current.push({ action, startTime: performance.now(), duration: built2.duration, actionBones: built2.actionBones, params: built2.params });
                      console.log(`[AnimSystem] 并发通道: ${action} 与 ${state.action} 同步执行（通道不相交）`);
                      return;
                    }
                    const q = animQueueRef.current;
                    if (q.length < 2) {
                      const elapsedMs = performance.now() - state.startTime;
                      if (state.duration > 3e4 && elapsedMs > 1500) {
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
                    params: built.params
                  };
                  console.log(`[AnimSystem] 触发动作: ${action} (${built.duration}ms, ${built.actionBones.length}骨骼)` + (built.actionBones.length === 0 ? " [警告] 无动作骨骼，请检查模型骨骼命名是否为标准MMD格式" : ""));
                };
                window.__petAction = (id, params) => PetActionExecutor.execute(id, (aid) => triggerAction(aid, params));
                window.__petActionExecutor = PetActionExecutor;
                const breathObserver = scene.onBeforeRenderObservable.add(() => {
                  if (loadingRef.current || isDraggingRef.current)
                    return;
                  try {
                    const lastMoc = window.__lastMocapAt || 0;
                    if (lastMoc && Date.now() - lastMoc < 2e3)
                      return;
                  } catch {
                  }
                  try {
                    const now = performance.now();
                    const state = animStateRef.current;
                    const dtS = lastObsNowRef.current > 0 ? Math.min(0.1, Math.max(1 / 240, (now - lastObsNowRef.current) / 1e3)) : 0;
                    lastObsNowRef.current = now;
                    const t = now / 1e3;
                    const breathPhase = Math.sin(t * 1.2);
                    const chestPosAmp = 0.012;
                    const shoulderRotAmp = 0.018;
                    for (const { bone, basePos } of breathBones) {
                      try {
                        bone.setPosition(
                          new Vector3(basePos.x, basePos.y + breathPhase * chestPosAmp, basePos.z),
                          Space.LOCAL
                        );
                      } catch (e) {
                      }
                    }
                    const armBusy = (() => {
                      for (const ly of animLayersRef.current) {
                        const lsp = PetActionExecutor.spec(ly.action);
                        if (lsp && (lsp.channels || []).some((c) => c === "armL" || c === "armR" || c === "limb"))
                          return true;
                      }
                      return false;
                    })();
                    if (state.action === "idle" && !armBusy) {
                      for (const { bone, baseQuat, side } of shoulderBones) {
                        try {
                          const rotSign = side === "left" ? 1 : -1;
                          const shoulderQ = Quaternion.RotationAxis(
                            new Vector3(0, 0, 1),
                            breathPhase * shoulderRotAmp * rotSign
                          );
                          const finalQ = baseQuat.multiply(shoulderQ);
                          bone.setRotationQuaternion(finalQ, Space.LOCAL);
                        } catch (e) {
                        }
                      }
                    }
                    if (state.action !== "idle" || animLayersRef.current.length > 0) {
                      const primaryLayer = state.action !== "idle" ? {
                        action: state.action,
                        startTime: state.startTime,
                        duration: state.duration,
                        actionBones: state.actionBones
                      } : null;
                      const frameLayers = [
                        ...primaryLayer ? [primaryLayer] : [],
                        ...animLayersRef.current
                      ];
                      for (const L of frameLayers) {
                        const elapsed = now - L.startTime;
                        const progress = Math.min(1, elapsed / L.duration);
                        const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress);
                        const phaseEnv = phaseEnvOf((L.params || {}).timing || "normal");
                        const action = L.action;
                        for (const ab of L.actionBones) {
                          try {
                            const bp = ab.basePos;
                            if (bp) {
                              const lp = action === "jump" ? (ab.delay || 0) > 0 ? Math.min(1, Math.max(0, (elapsed - ab.delay) / L.duration)) : progress : progress;
                              let dy = 0;
                              if (action === "jump") {
                                const hK = ((L.params || {}).height || 0.3) / 0.3;
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
                              if (action === "squat") {
                                const npSq3 = L.params || {};
                                const dKq = (Number(npSq3.depth) || 0.6) / 0.6;
                                dy = -0.35 * dKq * phaseEnv(progress);
                              }
                              let dz = 0;
                              if (action === "approach") {
                                const npAp2 = L.params || {};
                                const stAp2 = Math.max(1, Math.round(npAp2.steps || 2));
                                const segAp = Math.min(stAp2 - 1, Math.floor(progress * stAp2));
                                const segTAp = Math.min(1, progress * stAp2 - segAp);
                                const moveE = segTAp < 0.7 ? 0.5 - 0.5 * Math.cos(Math.PI * segTAp / 0.7) : 1;
                                dz = 0.12 * (segAp + moveE);
                                dy = 0.015 * Math.sin(Math.PI * segTAp);
                              }
                              const lmB = ab.bone.getLocalMatrix();
                              lmB.setTranslationFromFloats(bp.x, bp.y + dy, bp.z + dz);
                              ab.bone.markAsDirty();
                              continue;
                            }
                            const delayMs = ab.delay || 0;
                            const localT = delayMs > 0 ? Math.min(1, Math.max(0, (elapsed - delayMs) / L.duration)) : progress;
                            let offsetX = 0, offsetY = 0, offsetZ = 0;
                            let bName = ab.bone.name || "";
                            const abRole = ab.role;
                            if (abRole)
                              bName = bName + " " + abRole;
                            if (action === "wave") {
                              const T = elapsed / 1e3;
                              const raiseT = Math.min(1, T / 0.5);
                              const lowerT = Math.min(1, Math.max(0, (L.duration / 1e3 - T) / 0.5));
                              const wSide = detectSide(bName);
                              const mS = wSide === "left" ? -1 : 1;
                              const raiseE = raiseT * raiseT * (3 - 2 * raiseT);
                              const wavePhase = Math.max(0, T - 0.5);
                              const npW = L.params || {};
                              const ampK = Math.min(1.5, Math.max(0.4, (npW.amplitude || 0.7) / 0.7));
                              const freqK = Math.min(2, Math.max(0.5, (npW.freq || 2) / 2));
                              const cyc = wavePhase * Math.PI * 2 * 1.1 * freqK;
                              const wDelay = ab.delay || 0;
                              if (wDelay === 0) {
                                offsetZ = -0.1 * mS * raiseE * lowerT;
                              } else if (wDelay === 120) {
                                offsetZ = -1.9 * mS * raiseE * lowerT;
                                offsetX = 0.04 * ampK * Math.sin(cyc + 0.2) * raiseE * lowerT;
                              } else if (wDelay === 240) {
                                offsetZ = (-1.15 - 0.3 * ampK * Math.sin(cyc)) * mS * raiseE * lowerT;
                              } else if (wDelay === 300) {
                                offsetY = 0.3 * ampK * Math.sin(cyc + 0.5) * raiseE * lowerT;
                              } else if (wDelay >= 360) {
                                offsetZ = 0.3 * ampK * Math.sin(cyc + 0.8) * mS * raiseE * lowerT;
                                offsetX = 0.12 * ampK * Math.sin(cyc + 0.5) * raiseE * lowerT;
                              }
                            } else if (action === "nod") {
                              const npN = L.params || {};
                              const aR = (npN.angle || 18) * 0.01745 * 1.6;
                              const cnt = Math.max(1, Math.round(npN.count || 1));
                              const seg = Math.min(cnt - 1, Math.floor(progress * cnt));
                              const segT = progress * cnt - seg;
                              if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetX = aR * phaseEnv(segT);
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetX = 0.4 * aR * phaseEnv(segT);
                              }
                            } else if (action === "shake") {
                              const npS = L.params || {};
                              const amp = (npS.angle || 25) / 25 * 0.6;
                              const cntS = Math.max(1, Math.round(npS.count || 1));
                              if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetY = amp * Math.sin(progress * Math.PI * (cntS + 2)) * eased;
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetY = 0.5 * amp * Math.sin(progress * Math.PI * (cntS + 2)) * eased;
                              }
                            } else if (action === "block") {
                              const side = detectSide(bName);
                              if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetZ = side === "left" ? 0.9 * phaseEnv(progress) : side === "right" ? -0.9 * phaseEnv(progress) : 0;
                              } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                offsetX = 1.4 * phaseEnv(progress);
                              }
                            } else if (action === "turnHead") {
                              const npH = L.params || {};
                              const ampH = (npH.angle === void 0 ? 30 : npH.angle) / 30 * 0.6;
                              if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetY = ampH * phaseEnv(progress);
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetY = 0.5 * ampH * phaseEnv(progress);
                              }
                            } else if (action === "turnBody") {
                              const npB = L.params || {};
                              const k = (npB.angle === void 0 ? 45 : npB.angle) / 45;
                              if (boneNameMatches(bName, ["上半身", "upper body", "upper spine", "chest", "胸", "spineUpper"]) && !boneNameMatches(bName, ["下半身", "lower"])) {
                                offsetY = 0.9 * k * phaseEnv(progress);
                              } else if (boneNameMatches(bName, ["下半身", "lower body", "lower spine", "waist", "腰", "spineLower"])) {
                                offsetY = 0.4 * k * phaseEnv(progress);
                              }
                            } else if (action === "squat") {
                              const dK = ((L.params || {}).depth || 0.6) / 0.6;
                              if (boneNameMatches(bName, ["lower leg", "小腿", "すね", "calf", "shin", "low leg", "ひざ", "lowerLegL", "lowerLegR"])) {
                                offsetX = -1.5 * dK * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["足首", "ankle", "foot"])) {
                                offsetX = 0.5 * dK * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["upper leg", "大腿", "もも", "thigh", "up leg", "足", "upperLegL", "upperLegR"])) {
                                offsetX = 0.9 * dK * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["上半身", "upper body", "upper spine", "chest", "胸", "spineUpper"]) && !boneNameMatches(bName, ["下半身", "lower"])) {
                                offsetX = 0.5 * dK * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["下半身", "lower body", "lower spine", "waist", "腰", "spineLower"])) {
                                offsetX = 0.15 * dK * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["頭", "head"]) || boneNameMatches(bName, ["首", "neck"])) {
                                offsetX = -0.25 * dK * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetX = 0.35 * dK * phaseEnv(localT);
                              }
                            } else if (action === "stretch") {
                              const side = detectSide(bName);
                              if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetZ = side === "left" ? 1.5 * phaseEnv(localT) : side === "right" ? -1.5 * phaseEnv(localT) : 0;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetZ = side === "left" ? 0.6 * phaseEnv(localT) : side === "right" ? -0.6 * phaseEnv(localT) : 0;
                              } else if (boneNameMatches(bName, ["上半身", "upper body", "upper spine", "chest", "胸", "spineUpper"]) && !boneNameMatches(bName, ["下半身", "lower"])) {
                                offsetX = -0.4 * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["下半身", "lower body", "lower spine", "waist", "腰", "spineLower"])) {
                                offsetX = -0.25 * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetX = -0.25 * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetX = -0.15 * phaseEnv(localT);
                              }
                            } else if (action === "turnLeft") {
                              if (boneNameMatches(bName, ["上半身", "upper body", "upper spine", "chest", "胸", "spineUpper"]) && !boneNameMatches(bName, ["下半身", "lower"])) {
                                offsetY = -1.1 * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["下半身", "lower body", "lower spine", "waist", "腰", "spineLower"])) {
                                offsetY = -0.5 * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetY = -0.5 * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetY = -0.3 * phaseEnv(localT);
                              }
                            } else if (action === "turnRight") {
                              if (boneNameMatches(bName, ["上半身", "upper body", "upper spine", "chest", "胸", "spineUpper"]) && !boneNameMatches(bName, ["下半身", "lower"])) {
                                offsetY = 1.1 * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["下半身", "lower body", "lower spine", "waist", "腰", "spineLower"])) {
                                offsetY = 0.5 * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetY = 0.5 * phaseEnv(localT);
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetY = 0.3 * phaseEnv(localT);
                              }
                            } else if (action === "spin") {
                              const spMeta = ab;
                              if (spMeta.spinTurns) {
                                offsetY = (spMeta.spinDir || 1) * Math.PI * 2 * spMeta.spinTurns * eased;
                              }
                            } else if (action === "limbRaise") {
                              const meta = ab;
                              const hh = meta.lrHeight || 0.55;
                              const lrLimb = meta.lrLimb || "leg";
                              const lrSide = meta.lrSide || "left";
                              const lrEnv = localT < 0.25 ? 0.5 - 0.5 * Math.cos(Math.PI * localT / 0.25) : localT < 0.72 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (localT - 0.72) / 0.28);
                              if (lrLimb === "leg") {
                                if (boneNameMatches(bName, ["lower leg", "小腿", "すね", "calf", "shin", "low leg", "ひざ", "膝", "lowerLegL", "lowerLegR"])) {
                                  offsetX = -(0.25 + 0.35 * hh) * lrEnv;
                                } else if (boneNameMatches(bName, ["足首", "ankle", "foot"])) {
                                  offsetX = -0.12 * hh * lrEnv;
                                } else if (boneNameMatches(bName, ["upper leg", "大腿", "もも", "thigh", "up leg", "足", "upperLegL", "upperLegR"])) {
                                  offsetX = (0.5 + 0.4 * hh) * lrEnv;
                                }
                              } else {
                                const armSign = lrSide === "left" ? 1 : -1;
                                if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                  offsetZ = armSign * 0.22 * hh * lrEnv;
                                } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                  offsetZ = armSign * (0.45 + 0.7 * hh) * lrEnv;
                                } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                  offsetX = -0.28 * lrEnv;
                                }
                              }
                            } else if (action === "tiltHead") {
                              const npT = L.params || {};
                              const mS = npT.side === "right" ? -1 : 1;
                              const aT = (npT.angle || 15) * 0.01745;
                              if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetZ = mS * aT * phaseEnv(progress);
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetZ = mS * 0.4 * aT * phaseEnv(progress);
                              }
                            } else if (action === "bow") {
                              const npBw = L.params || {};
                              const dKw = (npBw.depth || 0.6) / 0.6;
                              if (boneNameMatches(bName, ["上半身", "upper body", "upper spine", "spineUpper"])) {
                                offsetX = 0.85 * dKw * phaseEnv(progress);
                              } else if (boneNameMatches(bName, ["胸", "chest"])) {
                                offsetX = 0.3 * dKw * phaseEnv(progress);
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetX = 0.15 * dKw * phaseEnv(progress);
                              } else if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetX = 0.2 * dKw * phaseEnv(progress);
                              }
                            } else if (action === "clap") {
                              const npCp = L.params || {};
                              const cntCp = Math.max(1, Math.round(npCp.count || 3));
                              const segCp = Math.min(cntCp - 1, Math.floor(progress * cntCp));
                              const segTCp = progress * cntCp - segCp;
                              const clapPulse = Math.sin(Math.PI * Math.min(1, segTCp));
                              const e0cp = phaseEnv(Math.min(1, progress * 2));
                              const aScp = detectSide(bName) === "left" ? 1 : -1;
                              if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetX = 0.35 * e0cp;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetZ = aScp * (0.45 - 0.3 * clapPulse) * e0cp;
                              } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                offsetX = (1.2 + 0.18 * clapPulse) * e0cp;
                              } else if (boneNameMatches(bName, ["手首", "hand", "wrist"])) {
                                offsetZ = aScp * 0.15 * e0cp;
                              }
                            } else if (action === "spreadHands") {
                              const npSp = L.params || {};
                              const aKsp = (npSp.amplitude || 0.7) / 0.7;
                              const holdEsp = progress < 0.22 ? 0.5 - 0.5 * Math.cos(Math.PI * progress / 0.22) : progress < 0.78 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.78) / 0.22);
                              const aSsp = detectSide(bName) === "left" ? 1 : -1;
                              if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetZ = aSsp * 0.18 * aKsp * holdEsp;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetZ = aSsp * (0.5 + 0.35 * aKsp) * holdEsp;
                              } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                offsetX = -0.25 * holdEsp;
                              } else if (boneNameMatches(bName, ["手首", "hand", "wrist"])) {
                                offsetZ = aSsp * 0.55 * aKsp * holdEsp;
                              }
                            } else if (action === "thumbsUp") {
                              const holdEtu = progress < 0.25 ? 0.5 - 0.5 * Math.cos(Math.PI * progress / 0.25) : progress < 0.8 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.8) / 0.2);
                              const aStu = detectSide(bName) === "left" ? 1 : -1;
                              if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetZ = aStu * 0.2 * holdEtu;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetZ = aStu * 1.15 * holdEtu;
                              } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                offsetX = 1.3 * holdEtu;
                              } else if (boneNameMatches(bName, ["手首", "hand", "wrist"])) {
                                offsetZ = aStu * 0.5 * holdEtu;
                              }
                            } else if (action === "comeHere") {
                              const npCo = L.params || {};
                              const cntCo = Math.max(1, Math.round(npCo.count || 2));
                              const segCo = Math.min(cntCo - 1, Math.floor(progress * cntCo));
                              const segTCo = progress * cntCo - segCo;
                              const beckon = Math.sin(Math.PI * Math.min(1, segTCo));
                              const e0co = phaseEnv(Math.min(1, progress * 2));
                              const aSco = detectSide(bName) === "left" ? 1 : -1;
                              if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetX = 0.4 * e0co;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetZ = aSco * 0.5 * e0co;
                              } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                offsetX = 1.45 * e0co;
                              } else if (boneNameMatches(bName, ["手首", "hand", "wrist"])) {
                                offsetX = (0.15 + 0.4 * beckon) * e0co;
                              }
                            } else if (action === "refuse") {
                              const npRf = L.params || {};
                              const cntRf = Math.max(1, Math.round(npRf.count || 2));
                              const wag = Math.sin(progress * Math.PI * 2 * cntRf);
                              const e0rf = phaseEnv(Math.min(1, progress * 2));
                              const aSrf = detectSide(bName) === "left" ? 1 : -1;
                              if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetZ = aSrf * 0.25 * e0rf;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetZ = aSrf * 0.5 * e0rf;
                              } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                offsetX = 1.25 * e0rf;
                                offsetY = 0.4 * wag * e0rf;
                              } else if (boneNameMatches(bName, ["手首", "hand", "wrist"])) {
                                offsetY = 0.55 * wag * e0rf;
                              }
                            } else if (action === "standUp") {
                              const dUS = Math.sin(Math.PI * progress);
                              if (boneNameMatches(bName, ["lower leg", "小腿", "すね", "calf", "shin", "low leg", "ひざ", "lowerLegL", "lowerLegR"])) {
                                offsetX = -0.55 * dUS;
                              } else if (boneNameMatches(bName, ["足首", "ankle", "foot"])) {
                                offsetX = 0.18 * dUS;
                              } else if (boneNameMatches(bName, ["upper leg", "大腿", "もも", "thigh", "up leg", "足", "upperLegL", "upperLegR"])) {
                                offsetX = 0.32 * dUS;
                              } else if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetX = -0.12 * dUS;
                              } else if (boneNameMatches(bName, ["上半身", "upper body", "upper spine", "spineUpper"])) {
                                offsetX = -0.1 * dUS;
                              }
                            } else if (action === "bendForward") {
                              const npBf = L.params || {};
                              const aBf = (npBf.angle || 45) * 0.01745;
                              const holdEbf = progress < 0.3 ? 0.5 - 0.5 * Math.cos(Math.PI * progress / 0.3) : progress < 0.75 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.75) / 0.25);
                              if (boneNameMatches(bName, ["上半身", "upper body", "upper spine", "spineUpper"])) {
                                offsetX = 0.8 * aBf * holdEbf;
                              } else if (boneNameMatches(bName, ["胸", "chest"])) {
                                offsetX = 0.3 * aBf * holdEbf;
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetX = 0.15 * aBf * holdEbf;
                              } else if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetX = 0.18 * aBf * holdEbf;
                              }
                            } else if (action === "lookUp" || action === "lookDown") {
                              const npLk = L.params || {};
                              const aLk = (npLk.angle || 20) * 0.01745 * 1.3;
                              const sgnLk = action === "lookDown" ? 1 : -1;
                              if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetX = sgnLk * aLk * phaseEnv(progress);
                              } else if (boneNameMatches(bName, ["首", "neck"])) {
                                offsetX = sgnLk * 0.4 * aLk * phaseEnv(progress);
                              }
                            } else if (action === "legKick") {
                              const npKc = L.params || {};
                              const pKc = Math.min(1, Math.max(0, Number(npKc.power) || 0.6));
                              const pk = progress;
                              let kickE = 0, kneeBend = 0;
                              if (pk < 0.12) {
                                const q = pk / 0.12;
                                kickE = -0.18 * Math.sin(q * Math.PI / 2);
                                kneeBend = 0.6 * pKc * q;
                              } else if (pk < 0.38) {
                                const q = (pk - 0.12) / 0.26;
                                const s = q * q * (3 - 2 * q);
                                const peak = 0.4 + 0.6 * pKc;
                                kickE = -0.18 + (peak + 0.18) * s;
                                kneeBend = 0.6 * pKc * (1 - s);
                              } else if (pk < 0.55) {
                                kickE = 0.4 + 0.6 * pKc;
                                kneeBend = 0;
                              } else {
                                const q = (pk - 0.55) / 0.45;
                                const s = q * q * (3 - 2 * q);
                                kickE = (0.4 + 0.6 * pKc) * (1 - s);
                              }
                              if (boneNameMatches(bName, ["lower leg", "小腿", "すね", "calf", "shin", "low leg", "ひざ", "lowerLegL", "lowerLegR"])) {
                                offsetX = -kneeBend;
                              } else if (boneNameMatches(bName, ["足首", "ankle", "foot"])) {
                                offsetX = 0.15 * kickE;
                              } else if (boneNameMatches(bName, ["upper leg", "大腿", "もも", "thigh", "up leg", "足", "upperLegL", "upperLegR"])) {
                                offsetX = kickE;
                              }
                            } else if (action === "point") {
                              const npPt = L.params || {};
                              const dirPt = npPt.dir || "right";
                              const holdEpt = progress < 0.25 ? 0.5 - 0.5 * Math.cos(Math.PI * progress / 0.25) : progress < 0.8 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.8) / 0.2);
                              const aSpt = detectSide(bName) === "left" ? 1 : -1;
                              if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetZ = aSpt * (dirPt === "up" ? 0.3 : 0.15) * holdEpt;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                if (dirPt === "up")
                                  offsetZ = aSpt * 2.45 * holdEpt;
                                else if (dirPt === "down")
                                  offsetX = 0.85 * holdEpt;
                                else
                                  offsetZ = aSpt * 1.5 * holdEpt;
                              } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                offsetX = -0.06 * holdEpt;
                              }
                            } else if (action === "offerHand") {
                              const holdEof = progress < 0.25 ? 0.5 - 0.5 * Math.cos(Math.PI * progress / 0.25) : progress < 0.8 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (progress - 0.8) / 0.2);
                              const aSof = detectSide(bName) === "left" ? 1 : -1;
                              if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetX = 0.45 * holdEof;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetZ = aSof * 0.35 * holdEof;
                              } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                offsetX = 1.05 * holdEof;
                              } else if (boneNameMatches(bName, ["手首", "hand", "wrist"])) {
                                offsetX = 0.35 * holdEof;
                                offsetZ = aSof * 0.3 * holdEof;
                              }
                            } else if (action === "bounce") {
                              const npBn = L.params || {};
                              const Tbn = elapsed / 1e3;
                              const boE = 0.5 - 0.5 * Math.cos(2 * Math.PI * (Number(npBn.freq) || 1.5) * Tbn);
                              const aBn = (Number(npBn.amplitude) || 0.5) / 0.5;
                              const fadeBn = Math.min(1, progress * 6, (1 - progress) * 6);
                              if (boneNameMatches(bName, ["lower leg", "小腿", "すね", "calf", "shin", "low leg", "ひざ", "lowerLegL", "lowerLegR"])) {
                                offsetX = -0.3 * aBn * boE * fadeBn;
                              } else if (boneNameMatches(bName, ["足首", "ankle", "foot"])) {
                                offsetX = 0.1 * aBn * boE * fadeBn;
                              } else if (boneNameMatches(bName, ["upper leg", "大腿", "もも", "thigh", "up leg", "足", "upperLegL", "upperLegR"])) {
                                offsetX = 0.16 * aBn * boE * fadeBn;
                              } else if (boneNameMatches(bName, ["上半身", "upper body", "upper spine", "spineUpper"])) {
                                offsetX = 0.08 * aBn * boE * fadeBn;
                              }
                            } else if (action === "stomp") {
                              const npSt = L.params || {};
                              const cntSt = Math.max(1, Math.round(npSt.count || 2));
                              const segSt = Math.min(cntSt - 1, Math.floor(progress * cntSt));
                              const segTSt = progress * cntSt - segSt;
                              const stompE = Math.sin(Math.PI * Math.min(1, segTSt));
                              const aSt2 = (Number(npSt.power) || 0.6) / 0.6;
                              if (boneNameMatches(bName, ["lower leg", "小腿", "すね", "calf", "shin", "low leg", "ひざ", "lowerLegL", "lowerLegR"])) {
                                offsetX = -0.5 * aSt2 * stompE;
                              } else if (boneNameMatches(bName, ["足首", "ankle", "foot"])) {
                                offsetX = -0.12 * aSt2 * stompE;
                              } else if (boneNameMatches(bName, ["upper leg", "大腿", "もも", "thigh", "up leg", "足", "upperLegL", "upperLegR"])) {
                                offsetX = 0.42 * aSt2 * stompE;
                              }
                            } else if (action === "cheer") {
                              const npCh = L.params || {};
                              const aCh = (Number(npCh.amplitude) || 0.8) / 0.8;
                              const Tch = elapsed / 1e3;
                              const chE = phaseEnv(progress);
                              const aSch = detectSide(bName) === "left" ? 1 : -1;
                              if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetZ = aSch * 0.3 * aCh * chE;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetZ = aSch * (1.5 + 0.5 * aCh + 0.08 * Math.sin(2 * Math.PI * 2.2 * Tch)) * chE;
                              } else if (boneNameMatches(bName, ["下腕", "ひじ", "肘", "lowerArmL", "lowerArmR"])) {
                                offsetX = -0.25 * chE;
                              } else if (boneNameMatches(bName, ["手首", "hand", "wrist"])) {
                                offsetZ = aSch * 0.25 * chE;
                              } else if (boneNameMatches(bName, ["頭", "head"])) {
                                offsetX = -0.12 * chE;
                              }
                            } else if (action === "approach") {
                              const npAp = L.params || {};
                              const stAp = Math.max(1, Math.round(npAp.steps || 2));
                              const swAp = Math.sin(progress * Math.PI * 2 * stAp);
                              const apFade = Math.min(1, progress * 4, (1 - progress) * 4);
                              const isLap = detectSide(bName) === "left";
                              if (boneNameMatches(bName, ["lower leg", "小腿", "すね", "calf", "shin", "low leg", "ひざ", "lowerLegL", "lowerLegR"])) {
                                offsetX = -0.22 * Math.max(0, (isLap ? 1 : -1) * swAp) * apFade;
                              } else if (boneNameMatches(bName, ["upper leg", "大腿", "もも", "thigh", "up leg", "足", "upperLegL", "upperLegR"])) {
                                offsetX = (isLap ? 1 : -1) * 0.28 * swAp * apFade;
                              } else if (boneNameMatches(bName, ["腕", "arm"]) && !boneNameMatches(bName, ["下腕", "lower", "ひじ", "肘", "手首", "hand", "wrist"])) {
                                offsetX = (isLap ? -1 : 1) * 0.2 * swAp * apFade;
                              }
                            }
                            if (action === "jump") {
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
                              if (boneNameMatches(bName, ["ひざ", "膝", "knee"])) {
                                offsetX = -1.5 * sq;
                              } else if (boneNameMatches(bName, ["足首"])) {
                                offsetX = 0.35 * sq;
                              } else if (boneNameMatches(bName, ["足", "upperLegL", "upperLegR"])) {
                                offsetX = 0.75 * sq;
                              } else if (boneNameMatches(bName, ["上半身", "upper spine", "spineUpper"])) {
                                offsetX = 0.2 * sq - 0.12 * leanBack;
                              } else if (boneNameMatches(bName, ["肩", "shoulder"])) {
                                offsetZ = (bName.indexOf("左") >= 0 ? 1 : -1) * 0.9 * armLift;
                              }
                            }
                            {
                              if (dtS > 0) {
                                let pMap = L.prevOffsets;
                                if (!pMap) {
                                  pMap = /* @__PURE__ */ new Map();
                                  L.prevOffsets = pMap;
                                }
                                const prev = pMap.get(ab.bone);
                                const grp = jointSpeedGroupOf(bName);
                                if (prev && grp) {
                                  const maxStep = grp.comfortDegPerSec * dtS;
                                  const dx = offsetX * 57.2958 - prev.x;
                                  const dy = offsetY * 57.2958 - prev.y;
                                  const dz = offsetZ * 57.2958 - prev.z;
                                  const maxAbs = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
                                  if (maxAbs > maxStep) {
                                    const f = maxStep / maxAbs;
                                    offsetX = prev.x / 57.2958 + dx / 57.2958 * f;
                                    offsetY = prev.y / 57.2958 + dy / 57.2958 * f;
                                    offsetZ = prev.z / 57.2958 + dz / 57.2958 * f;
                                    if (L.speedWarned !== true) {
                                      L.speedWarned = true;
                                      console.warn(`[AnimSystem][硬门] ${L.action} 峰值角速度超舒适档（${grp.comfortDegPerSec}°/s），已限速拉伸`);
                                    }
                                  }
                                }
                                pMap.set(ab.bone, { x: offsetX * 57.2958, y: offsetY * 57.2958, z: offsetZ * 57.2958 });
                              }
                            }
                            const offsetQ = Quaternion.FromEulerAngles(offsetX, offsetY, offsetZ);
                            const finalQ = ab.baseQuat.multiply(offsetQ);
                            ab.bone.setRotationQuaternion(finalQ, Space.LOCAL);
                          } catch (e) {
                          }
                        }
                        if (progress >= 1) {
                          if (L === primaryLayer) {
                            for (const ab of L.actionBones) {
                              try {
                                ab.bone.setRotationQuaternion(ab.baseQuat, Space.LOCAL);
                              } catch (e) {
                              }
                            }
                            animStateRef.current = {
                              action: "idle",
                              startTime: 0,
                              duration: 0,
                              breathBaseRot: null,
                              actionBones: []
                            };
                            console.log("[AnimSystem] 动作完成，恢复 idle");
                          } else {
                            for (const ab of L.actionBones) {
                              try {
                                ab.bone.setRotationQuaternion(ab.baseQuat, Space.LOCAL);
                              } catch (e) {
                              }
                            }
                            const li = animLayersRef.current.indexOf(L);
                            if (li >= 0)
                              animLayersRef.current.splice(li, 1);
                            console.log(`[AnimSystem] 并发层 ${L.action} 完成，剩余 ${animLayersRef.current.length} 层`);
                          }
                          tryStartQueued();
                        }
                      }
                    }
                  } catch (e) {
                  }
                });
                breathObserverRef.current = breathObserver;
                const doubleTapObserver = scene.onPointerObservable.add((pi) => {
                  try {
                    if (pi.type !== PointerEventTypes.POINTERDOUBLETAP)
                      return;
                    const pickInfo = pi.pickInfo;
                    if (!pickInfo || !pickInfo.hit)
                      return;
                    const pickedPoint = pickInfo.pickedPoint;
                    if (!pickedPoint)
                      return;
                    const analysis2 = analysisRef.current;
                    if (!analysis2)
                      return;
                    let targetBone = null;
                    const pickedMesh = pickInfo.pickedMesh;
                    if (pickedMesh && pickedMesh.skeleton) {
                      const bones = pickedMesh.skeleton.bones;
                      let minDist = Infinity;
                      for (const bone of bones) {
                        try {
                          let bonePos = null;
                          if (typeof bone.getAbsolutePosition === "function") {
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
                        } catch (e) {
                        }
                      }
                    }
                    const bName = (targetBone == null ? void 0 : targetBone.name) || "";
                    const hb = humanBodyRef.current;
                    let action = null;
                    if (boneNameMatches(bName, ["頭", "head"]) || (hb == null ? void 0 : hb.spine.head) && targetBone === hb.spine.head) {
                      action = Math.random() < 0.5 ? "nod" : "shake";
                    } else if (boneNameMatches(bName, ["胸", "chest", "上半身", "upper"]) || (hb == null ? void 0 : hb.spine.chest) && targetBone === hb.spine.chest || (hb == null ? void 0 : hb.spine.upperSpine) && targetBone === hb.spine.upperSpine) {
                      action = "block";
                    } else if (boneNameMatches(bName, ["腕", "arm", "手", "hand", "肩", "shoulder"]) || (hb == null ? void 0 : hb.leftArm) && targetBone === hb.leftArm.upperArm || (hb == null ? void 0 : hb.rightArm) && targetBone === hb.rightArm.upperArm) {
                      action = "wave";
                    }
                    if (action) {
                      console.log(`[AnimSystem] 双击命中: ${bName} → 触发 ${action}`);
                      triggerAction(action);
                    }
                  } catch (e) {
                    console.warn("[AnimSystem] 双击处理失败:", e);
                  }
                });
                doubleTapObserverRef.current = doubleTapObserver;
                console.log(`[AnimSystem] 呼吸+交互+双击系统已启动（呼吸骨骼:${breathBones.length}）`);
              } catch (err) {
                console.warn("[AnimSystem] 启动失败（降级运行，不影响模型显示）:", err);
              }
            }
          }
        } catch (err) {
          console.error("[BabylonModelViewer] 骨骼驱动流程失败（降级运行）:", err);
          setPhysicsStatus(`启用失败: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      let minVec = null;
      let maxVec = null;
      for (const mesh of loadedMeshes) {
        if (mesh === rootMesh)
          continue;
        if (!mesh.getBoundingInfo)
          continue;
        try {
          (_R = mesh.refreshBoundingInfo) == null ? void 0 : _R.call(mesh);
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
            maxVec.x = Math.max(maxVec.x, mx.x);
            maxVec.y = Math.max(maxVec.y, mx.y);
            maxVec.z = Math.max(maxVec.z, mx.z);
          }
        } catch (e) {
        }
      }
      if (minVec && maxVec && cameraRef.current) {
        let minV = minVec;
        let maxV = maxVec;
        let size = maxV.subtract(minV);
        let modelHeight = size.y;
        let centerX = (minV.x + maxV.x) / 2;
        let centerZ = (minV.z + maxV.z) / 2;
        const boneFr = measureBoneFrame(rootMesh);
        if (boneFr) {
          const bboxH = modelHeight;
          modelHeight = boneFr.height;
          minV = new Vector3(minV.x, boneFr.minY, minV.z);
          maxV = new Vector3(maxV.x, boneFr.maxY, maxV.z);
          size = maxV.subtract(minV);
          centerX = boneFr.centerX;
          centerZ = boneFr.centerZ;
          console.log("[BabylonModelViewer][取景身高] bbox=" + bboxH.toFixed(2) + " bones=" + boneFr.height.toFixed(2) + " 用=bones targetBaseY=" + boneFr.minY.toFixed(2));
        } else {
          console.log("[BabylonModelViewer][取景身高] bbox=" + modelHeight.toFixed(2) + " 用=bbox(骨骼量高失败)");
        }
        const isWallpaperRoute = typeof window !== "undefined" && /wallpaper/i.test(window.location.pathname || "");
        if (desktopPetMode && !isWallpaperRoute) {
          const targetY = minV.y + modelHeight * 0.5;
          cameraRef.current.setTarget(new Vector3(centerX, targetY, centerZ));
          cameraRef.current.beta = Math.PI / 2;
          cameraRef.current.alpha = Math.PI / 2;
          const fov = cameraRef.current.fov;
          const visibleHeight = modelHeight * 1.1;
          const distance = visibleHeight / 2 / Math.tan(fov / 2);
          if (isDraggingRef.current) {
            pendingRadiusRef.current = Math.max(1, Math.min(100, distance));
          } else {
            pendingRadiusRef.current = null;
          }
          cameraRef.current.radius = Math.max(1, Math.min(100, distance));
          baseRadiusRef.current = cameraRef.current.radius;
          const modelAspect = size.x / modelHeight;
          const screen = screenSizeRef.current;
          const baseH = screen ? Math.round(screen.workHeight * 0.6) : 400;
          const maxBaseW = screen ? Math.round(screen.workWidth * 0.9) : 800;
          const baseW = Math.min(Math.round(baseH * modelAspect) + 24, maxBaseW);
          baseWindowSizeRef.current = { width: baseW, height: baseH };
          modelSizeRef.current = { width: size.x, height: size.y };
        } else {
          const targetYRatio = isWallpaperRoute ? 0.85 : 0.85;
          const targetY = minV.y + modelHeight * targetYRatio;
          cameraRef.current.setTarget(new Vector3(centerX, targetY, centerZ));
          cameraRef.current.beta = Math.PI / 2;
          cameraRef.current.alpha = isWallpaperRoute ? Math.PI / 2 : -Math.PI / 2;
          const fov = cameraRef.current.fov;
          const visibleHeight = modelHeight * 0.35;
          const distance = visibleHeight / 2 / Math.tan(fov / 2) * 1.1;
          cameraRef.current.radius = isWallpaperRoute ? Math.max(1, Math.min(50, distance / 2.345)) : Math.max(1, Math.min(50, distance));
          if (isWallpaperRoute) {
            wallpaperFrameRef.current = {
              minY: minV.y,
              modelHeight,
              centerX,
              centerZ
            };
            baseRadiusRef.current = cameraRef.current.radius;
            const screen = screenSizeRef.current;
            baseWindowSizeRef.current = {
              width: (screen == null ? void 0 : screen.workWidth) || 1920,
              height: (screen == null ? void 0 : screen.workHeight) || 1080
            };
            modelSizeRef.current = { width: size.x, height: size.y };
            console.log("[BabylonModelViewer][壁纸取景缓存] h=" + modelHeight.toFixed(2) + " targetY=" + (minV.y + modelHeight * targetYRatio).toFixed(2) + " radius=" + cameraRef.current.radius.toFixed(2));
          }
        }
      }
      console.log("[BabylonModelViewer] 模型加载成功:", modelData.name, "meshes:", loadedMeshes.length, "referenceFiles:", referenceFiles.length);
      if (desktopPetMode) {
        try {
          const sc = sceneRef.current;
          const cam = cameraRef.current;
          const mesh = currentModelRef.current;
          if (sc && cam && mesh) {
            const meshCount = sc.meshes.length;
            const visibleMeshes = sc.meshes.filter((m) => m.isVisible).length;
            let bbInfo = "N/A";
            try {
              mesh.computeWorldMatrix(true);
              const bb = mesh.getBoundingInfo().boundingBox;
              bbInfo = JSON.stringify({
                min: [bb.minimumWorld.x.toFixed(2), bb.minimumWorld.y.toFixed(2), bb.minimumWorld.z.toFixed(2)],
                max: [bb.maximumWorld.x.toFixed(2), bb.maximumWorld.y.toFixed(2), bb.maximumWorld.z.toFixed(2)]
              });
            } catch (e) {
            }
            console.log("[BabylonModelViewer][渲染诊断] meshes=" + meshCount + " visible=" + visibleMeshes + " camera: target=" + JSON.stringify(cam.target.asArray().map((v) => v.toFixed(2))) + " radius=" + cam.radius.toFixed(2) + " alpha=" + cam.alpha.toFixed(2) + " beta=" + cam.beta.toFixed(2) + " modelBB=" + bbInfo);
            try {
              const inFrustum = mesh.isInFrustum((_S = sc.activeCamera) == null ? void 0 : _S._frustumPlanes);
              console.log("[BabylonModelViewer][渲染诊断] 模型在视锥体内: " + inFrustum);
            } catch (e) {
            }
          }
        } catch (diagErr) {
        }
      }
      if (desktopPetMode) {
        if (typeof window !== "undefined" && /wallpaper/i.test(window.location.pathname || "")) {
          if (!isDraggingRef.current && pendingRadiusRef.current !== null && cameraRef.current) {
            try {
              cameraRef.current.radius = pendingRadiusRef.current;
            } catch {
            }
            pendingRadiusRef.current = null;
          }
        } else {
          modelInitTimerRef.current = window.setTimeout(() => {
            var _a2;
            zoomScaleRef.current = 1;
            targetScaleRef.current = 1;
            const base = baseWindowSizeRef.current;
            if (!isDraggingRef.current && pendingRadiusRef.current !== null && cameraRef.current) {
              try {
                cameraRef.current.radius = pendingRadiusRef.current;
              } catch {
              }
              pendingRadiusRef.current = null;
            }
            if (isDraggingRef.current) {
              pendingResizeRef.current = {
                width: base.width,
                height: base.height,
                radius: pendingRadiusRef.current ?? void 0
              };
              return;
            }
            if (!base)
              return;
            try {
              (_a2 = window.desktopPet) == null ? void 0 : _a2.resizeWindow(base.width, base.height);
            } catch {
            }
          }, 100);
        }
      }
      onModelLoaded == null ? void 0 : onModelLoaded();
    } catch (err) {
      console.error("[BabylonModelViewer] 模型加载失败:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setLoadModelError(errMsg);
      onModelError == null ? void 0 : onModelError(errMsg);
    } finally {
      loadingRef.current = false;
      try {
        const eng = (_U = (_T = sceneRef.current) == null ? void 0 : _T.getEngine) == null ? void 0 : _U.call(_T);
        if (eng && prevScalingRef.current !== null) {
          eng.setHardwareScalingLevel(prevScalingRef.current);
          prevScalingRef.current = null;
        }
      } catch (e) {
      }
      setLoading(false);
    }
  }, [modelData]);
  reactExports.useEffect(() => {
    if (modelData && sceneRef.current) {
      loadModel();
    }
    return () => {
      var _a;
      (_a = loadAbortRef.current) == null ? void 0 : _a.abort();
    };
  }, [modelData, loadModel]);
  if (initError) {
    return /* @__PURE__ */ jsxs("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#ff6666", flexDirection: "column", padding: 20 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: 16, marginBottom: 12 }, children: "3D 引擎初始化失败" }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "#aaa" }, children: initError })
    ] });
  }
  const containerBg = desktopPetMode ? "transparent" : "#1a1a1a";
  return /* @__PURE__ */ jsxs("div", { style: { width: "100%", height: "100%", position: "relative", background: containerBg }, children: [
    /* @__PURE__ */ jsx(
      "canvas",
      {
        ref: canvasRef,
        style: { width: "100%", height: "100%", display: "block", touchAction: "none", background: "transparent", willChange: "transform" }
      }
    ),
    !desktopPetMode && loading && /* @__PURE__ */ jsx("div", { style: {
      position: "absolute",
      top: 12,
      left: 12,
      background: "rgba(0,0,0,0.6)",
      color: "#fff",
      padding: "8px 14px",
      borderRadius: 4,
      fontSize: 13
    }, children: "模型加载中..." }),
    loadModelError && /* @__PURE__ */ jsxs("div", { style: {
      position: "absolute",
      top: 12,
      left: 12,
      right: 12,
      background: "rgba(180,40,40,0.85)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: 4,
      fontSize: 13
    }, children: [
      "加载失败: ",
      loadModelError
    ] }),
    !desktopPetMode && /* @__PURE__ */ jsx("div", { style: {
      position: "absolute",
      bottom: 12,
      left: 12,
      background: "rgba(0,0,0,0.5)",
      color: "#ccc",
      padding: "6px 10px",
      borderRadius: 4,
      fontSize: 12,
      pointerEvents: "none"
    }, children: "左键旋转 · 滚轮缩放 · ESC 关闭" }),
    !desktopPetMode && /* @__PURE__ */ jsxs(
      "div",
      {
        onClick: () => {
          physicsOnRef.current = !physicsOnRef.current;
          setPhysicsOn(physicsOnRef.current);
          console.log("[v49] 物理模组已" + (physicsOnRef.current ? "开启" : "关闭"));
        },
        title: "点击开关物理模组（摆动+碰撞）",
        style: {
          position: "absolute",
          bottom: 12,
          right: 12,
          background: physicsOn ? "rgba(46,125,50,0.85)" : "rgba(60,60,60,0.85)",
          color: "#fff",
          padding: "4px 10px",
          borderRadius: 4,
          fontSize: 11,
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: physicsOn ? "1px solid rgba(126,255,126,0.4)" : "1px solid rgba(255,255,255,0.2)"
        },
        children: [
          /* @__PURE__ */ jsx("span", { style: {
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: physicsStatus === "已启用" ? "#7fff7f" : "#ffaa3a",
            display: "inline-block"
          } }),
          "物理: ",
          physicsStatus
        ]
      }
    ),
    onClose && !desktopPetMode && /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => {
          var _a;
          return (_a = onCloseRef.current) == null ? void 0 : _a.call(onCloseRef);
        },
        style: {
          position: "absolute",
          top: 12,
          right: 56,
          background: "rgba(180,40,40,0.8)",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: 13
        },
        children: "关闭"
      }
    ),
    desktopPetMode && showContextMenu && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          onClick: () => {
            showContextMenuRef.current = false;
            setShowContextMenu(false);
          },
          onMouseEnter: () => {
            var _a;
            try {
              (_a = window.desktopPet) == null ? void 0 : _a.setIgnoreMouse(false);
            } catch {
            }
          },
          style: {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 1999,
            background: "transparent"
          }
        }
      ),
      /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            position: "fixed",
            left: menuPos.x,
            top: menuPos.y,
            background: "rgba(30,30,30,0.95)",
            borderRadius: 6,
            padding: "4px 0",
            minWidth: 140,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            zIndex: 2e3
          },
          onMouseEnter: () => {
            var _a;
            try {
              (_a = window.desktopPet) == null ? void 0 : _a.setIgnoreMouse(false);
            } catch {
            }
          },
          children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                onClick: () => {
                  showContextMenuRef.current = false;
                  setShowContextMenu(false);
                  setShowActionPanel(true);
                },
                style: {
                  padding: "8px 16px",
                  color: "#7eff7e",
                  cursor: "pointer",
                  fontSize: 14,
                  borderBottom: "1px solid rgba(255,255,255,0.1)"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "transparent";
                },
                children: "动作终端"
              }
            ),
            /* @__PURE__ */ jsx(
              "div",
              {
                onClick: () => {
                  physicsOnRef.current = !physicsOnRef.current;
                  setPhysicsOn(physicsOnRef.current);
                  showContextMenuRef.current = false;
                  setShowContextMenu(false);
                },
                style: {
                  padding: "8px 16px",
                  color: physicsOn ? "#7eff7e" : "#aaa",
                  cursor: "pointer",
                  fontSize: 14,
                  borderBottom: "1px solid rgba(255,255,255,0.1)"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "transparent";
                },
                children: physicsOn ? "物理：开" : "物理：关"
              }
            ),
            /* @__PURE__ */ jsx(
              "div",
              {
                onClick: () => {
                  var _a;
                  showContextMenuRef.current = false;
                  setShowContextMenu(false);
                  (_a = onCloseRef.current) == null ? void 0 : _a.call(onCloseRef);
                },
                style: {
                  padding: "8px 16px",
                  color: "#ff6b6b",
                  cursor: "pointer",
                  fontSize: 14
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "transparent";
                },
                children: "退出"
              }
            )
          ]
        }
      )
    ] }),
    desktopPetMode && showActionPanel && /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          position: "fixed",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(20,20,20,0.92)",
          borderRadius: 8,
          padding: "10px 12px",
          minWidth: 170,
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          zIndex: 2001,
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.15)"
        },
        onMouseEnter: () => {
          var _a;
          try {
            (_a = window.desktopPet) == null ? void 0 : _a.setIgnoreMouse(false);
          } catch {
          }
        },
        children: [
          /* @__PURE__ */ jsxs("div", { style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: "1px solid rgba(255,255,255,0.15)"
          }, children: [
            /* @__PURE__ */ jsx("span", { style: { color: "#7eff7e", fontSize: 13, fontWeight: 600 }, children: "动作终端" }),
            /* @__PURE__ */ jsx(
              "span",
              {
                onClick: () => setShowActionPanel(false),
                style: { color: "#aaa", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px" },
                onMouseEnter: (e) => {
                  e.currentTarget.style.color = "#fff";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.color = "#aaa";
                },
                children: "×"
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }, children: [
            { id: "wave", label: "挥手", desc: "打招呼" },
            { id: "nod", label: "点头", desc: "赞同" },
            { id: "shake", label: "摇头", desc: "否定" },
            { id: "block", label: "遮挡", desc: "害羞" },
            { id: "turnHead", label: "转头", desc: "环顾" },
            { id: "turnBody", label: "转身", desc: "转身" }
          ].map((act) => /* @__PURE__ */ jsxs(
            "div",
            {
              onClick: () => {
                var _a;
                try {
                  (_a = window.__petAction) == null ? void 0 : _a.call(window, act.id);
                } catch {
                }
              },
              style: {
                padding: "8px 6px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 4,
                cursor: "pointer",
                textAlign: "center",
                transition: "background 0.15s"
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.background = "rgba(126,255,126,0.25)";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              },
              children: [
                /* @__PURE__ */ jsx("div", { style: { color: "#e0e0e0", fontSize: 13, fontWeight: 500 }, children: act.label }),
                /* @__PURE__ */ jsx("div", { style: { color: "#888", fontSize: 10, marginTop: 2 }, children: act.desc })
              ]
            },
            act.id
          )) }),
          /* @__PURE__ */ jsx("div", { style: { marginTop: 8, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.1)", color: "#666", fontSize: 10, textAlign: "center" }, children: "点击动作按钮触发" })
        ]
      }
    ),
    !desktopPetMode && /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => {
          var _a;
          const el = (_a = canvasRef.current) == null ? void 0 : _a.parentElement;
          if (el && el.requestFullscreen) {
            el.requestFullscreen();
          }
        },
        style: {
          position: "absolute",
          top: 12,
          right: 12,
          background: "rgba(60,60,60,0.8)",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: 13
        },
        title: "全屏",
        children: "⛶"
      }
    )
  ] });
};
export {
  BabylonModelViewer as default
};
