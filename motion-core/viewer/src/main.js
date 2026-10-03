// main.js — vite 构建入口：正确注册链 + ALIVE 控制器 + 协议驱动
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader.js';

// 官方推荐注册方式（副作用导入）
import 'babylon-mmd/esm/Loader/pmxLoader.js';

const D2R = Math.PI / 180;
const clamp = (v, l) => Math.max(-l, Math.min(l, v));

async function boot() {
  const engine = new Engine(document.getElementById('cv'), true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.05, 0.07, 0.1, 1);
  const cam = new FreeCamera('cam', new Vector3(0, 1.15, -2.3));
  new HemisphericLight('h', new Vector3(0, 1, 0), scene).intensity = 0.95;
  const dl = new DirectionalLight('d', new Vector3(-0.35, -1, 0.55), scene);
  dl.intensity = 1.15;

  let skel = null, hasModel = false;
  window.__babylonScene = scene; // 供 CDP 外部诊断
  const boneMap = {};
  let target = { action: 'idle', params: {}, reqId: null };
  let smooth = {};
  const samples = [];

  function setRot(name, x, y, z) {
    const b = boneMap[name]; if (!b) return;
    x = clamp(x, 60); y = clamp(y, 90); z = clamp(z, 140);
    b.rotationQuaternion = Quaternion.FromEulerAngles(x * D2R, y * D2R, z * D2R);
  }

  SceneLoader.ImportMeshAsync('', '/models/mint/薄荷宿舍/', '薄荷宿舍.pmx', scene).then(r => {
    const m = r.meshes.find(mm => mm.skeleton) || r.meshes[0];
    skel = m.skeleton; hasModel = true;
    for (const k of ['センター', '上半身', '首', '頭', '腕R', '腕L', 'ひじR', 'ひじL'])
      boneMap[k] = skel.bones.find(b => b.name === k) || null;
    for (const cand of ['手首R', '右手首', 'Wrist_R', 'handR', '手腕R']) {
      const b = skel.bones.find(x => x.name === cand);
      if (b) { boneMap['WRIST_R'] = b; break; }
    }
    report(`模型已导入并受控 | 骨骼 ${skel.bones.length} | 活动作驱动中`);
    try {
      const bb = m.getHierarchyBoundingVectors(); const h = bb.max.y - bb.min.y;
      cam.position.set(0, bb.min.y + h * 0.72, -(h * 1.65));
      cam.setTarget(new Vector3(0, bb.min.y + h * 0.62, 0));
    } catch {}
  }).catch(e => report('模型加载失败: ' + e.message));

  // ---- ALIVE 控制器（每帧实时计算）----
  const t0 = performance.now();
  scene.onBeforeRenderObservable.add(() => {
    const t = (performance.now() - t0) / 1000;
    for (const k of Object.keys(target.params)) {
      const v = target.params[k];
      if (typeof v === 'number') smooth[k] = (smooth[k] ?? v) + (v - (smooth[k] ?? v)) * 0.06;
      else smooth[k] = v;
    }
    const p = smooth, a = target.action;

    let chestX = 2.0 * Math.sin(t * 1.85) + 0.6 * Math.sin(t * 0.47);
    let headY = 4.2 * Math.sin(t * 0.55) + 1.8 * Math.sin(t * 0.23 + 1.7);
    let headX = 1.6 * Math.sin(t * 1.25 + 0.5);
    let armR = -16 - 4 * Math.sin(t * 0.8), armL = -16 - 4 * Math.sin(t * 0.8 + 0.5);
    let elbR = -14 - 5 * Math.sin(t * 1.05 + 0.6), elbL = -14 - 5 * Math.sin(t * 1.05);
    let rootY = 0, armRX = 0, armRY = 0, elbRZ = 0, wristRot = 0, chestZ = 0;

    if (a === 'wave') {
      /* [2026-08-30 重写] 人类挥手：肩三轴复合 + 肘主摆 + 腕甩动 + 躯干/头联动，
         相位差产生真实空间弧线（XYZ 都有分量），duration 内反复挥 */
      const amp = p.amplitude ?? 0.7;
      const cyc = t * Math.PI * (p.freq ?? 2.2);
      armR = -(124 + 14 * amp + 6 * Math.sin(cyc + 0.9));   // 肩Z：高举+起伏
      armRX = 8.5 * Math.sin(cyc + 1.15);                   // 肩X：前后扇面
      armRY = 6.5 * Math.sin(cyc * 0.5 + 0.3);              // 肩Y：内外旋
      elbR = -(56 + 27 * amp * Math.sin(cyc + 0.35));       // 肘X：前臂弧线主摆
      elbRZ = 5 * Math.sin(cyc - 0.5);                      // 肘Z：微旋
      wristRot = 17 * amp * Math.sin(cyc - 0.9);            // 腕：鞭梢甩动（滞后相位）
      chestX += 2.5 * Math.sin(cyc + 1.5);
      chestZ = -4.5 * amp;                                  // 躯干反向倾
      headY += 7 * Math.sin(cyc + 1.3);
      headX += 3;
    } else if (a === 'nod') { headX += (p.angle ?? 18) * Math.sin(t * Math.PI * 2 * (p.count ?? 1) * 1.5); }
    else if (a === 'shake') { headY += (p.angle ?? 25) * Math.sin(t * Math.PI * 2 * (p.count ?? 2) * 1.15); }
    else if (a === 'turnHead') { headY += (p.angle ?? 30) * 0.92; }
    else if (a === 'turnBody') { chestX *= 0.6; headY += (p.angle ?? 45) * 0.5; }
    else if (a === 'jump') {
      const ph = (t / (p.duration ?? 1.2)) % 1;
      rootY = Math.sin(Math.PI * ph) * (p.height ?? 0.3) * (p.power === 'strong' ? 1.2 : p.power === 'soft' ? 0.75 : 1);
      elbR -= 20 * Math.sin(ph * Math.PI); armR += 10 * Math.sin(ph * Math.PI);
    } else if (a === 'stretch') {
      armR = armL = -(96 + 14 * Math.sin(t * 2)); headX -= 4 * Math.sin(t * 2.1);
    } else if (a === 'squat') {
      rootY = -Math.abs(Math.sin(t * 1.6)) * (p.depth ?? 0.6) * 0.28; chestX += 10 * Math.abs(Math.sin(t * 1.6));
    }

    if (skel) {
      setRot('上半身', chestX, 0, chestZ);
      setRot('首', 0, headY * 0.42, 0);
      setRot('頭', headX, headY, 0);
      setRot('腕R', armRX, armRY, armR);
      setRot('腕L', 0, 0, armL);
      setRot('ひじR', elbR, 0, elbRZ);
      setRot('ひじL', elbL, 0, 0);
      if (boneMap['WRIST_R']) setRot('WRIST_R', wristRot, 0, wristRot * 0.4);
      if (boneMap['WRIST_L']) setRot('WRIST_L', -wristRot * 0.3, 0, 0);
    }
    if (meshRef && Math.abs((meshRef.position.y || 0) - rootY) > 1e-6)
      meshRef.position.y += (rootY - (meshRef.position.y || 0)) * 0.35;

    if (samples.length === 0 || performance.now() - samples[samples.length - 1].ts > 350) {
      samples.push({ ts: performance.now(), t: +t.toFixed(3), action: a, headY: +headY.toFixed(4), armR: +armR.toFixed(3) });
      if (samples.length > 240) samples.shift();
      fetch('/debug/push', { method: 'POST', body: JSON.stringify(samples[samples.length - 1]) }).catch(() => {});
    }
  });

  let meshRef = null;
  window.__motionDebug = {
    get info() { return { hasModel, bones: skel ? skel.bones.length : 0 }; },
    get sampleCount() { return samples.length; },
    get lastSample() { return samples[samples.length - 1] || null; },
    get distinctActions() { return [...new Set(samples.map(s => s.action))]; },
    hubApply(action, reqId, params) { target = { action, params: params || {}, reqId }; return true; },
    now() { return { state: target.action, params: target.params, reqId: target.reqId }; },
    set mesh(m) { meshRef = m; },
  };

  // ImportMesh 的异步结果在这里再取一次挂 meshRef
  const waitMesh = setInterval(() => {
    if (hasModel) { clearInterval(waitMesh); try { window.__motionDebug.mesh = scene.meshes.find(m => m.skeleton); } catch {} }
  }, 200);

  engine.runRenderLoop(() => scene.render());
  engine.resize();
}

function report(msg) { try { document.getElementById('note').textContent = msg; } catch {} }

async function pollHub() {
  try {
    const d = await (await fetch('/hub/state', { cache: 'no-store' })).json();
    document.getElementById('hub').textContent = 'online';
    document.getElementById('st').textContent = d.state;
    document.getElementById('act').textContent = d.currentAction || 'idle';
    if (window.__motionDebug) {
      if (d.state === 'solving' && d.currentAction) {
        if (window.__motionDebug.now().reqId !== d.currentReqId) {
          window.__motionDebug.hubApply(d.currentAction, d.currentReqId, d.currentParams || {});
          report('执行协议指令: ' + d.currentAction);
        }
      } else if (d.state === 'idle') {
        if (window.__motionDebug.now().state !== 'idle') {
          window.__motionDebug.hubApply('idle', 'idle_' + Date.now(), {});
          report('回 idle（自然收敛）');
        }
      }
    }
  } catch (e) { document.getElementById('hub').textContent = 'offline'; }
  setTimeout(pollHub, 280);
}

boot().catch(e => { window.__bootError = 'BOOT: ' + String((e && e.message) || e); report(window.__bootError); });
pollHub();
window.addEventListener('resize', () => {});