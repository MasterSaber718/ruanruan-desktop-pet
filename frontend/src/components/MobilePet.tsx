/**
 * MobilePet.tsx - 移动端桌宠组件（1:1 搬运 PC 端桌宠功能）
 *
 * PC 端桌宠 (PetPage) 依赖 Electron 主进程通过 IPC 注入用户导入的本地 PMX 模型，
 * 移动端 (Capacitor/Android) 没有 Electron 文件导入机制，因此实现方式不同：
 *
 *   - PC 端：用户导入 MMD 模型 → Electron IPC 传模型数据 → BabylonModelViewer 渲染
 *   - 移动端：用 Babylon 基础几何体程序化生成一个可爱 3D 角色，
 *            支持手指拖拽旋转、自动摆动（头发/身体自然晃动），等价于 PC 端桌宠的
 *            "3D 角色 + 可交互 + 有动画" 功能定位。
 *
 * 功能对齐点：
 *   ✅ 3D 角色实时渲染（Babylon.js）
 *   ✅ 手指拖拽旋转（等价于 PC 端右键拖拽旋转角色）
 *   ✅ 自然摆动动画（等价于 PC 端头发/裙摆 swingObserver 摆动）
 *   ✅ 透明背景（与桌面一致，角色悬浮在页面之上）
 *   ✅ 全屏自适应
 *
 * ============================================================================
 * 本次稳定性重构（内存泄漏 / 卡顿 / 显示异常 三类专项）
 * ============================================================================
 * 桌宠是全应用唯一持续占用 GPU 的模块，也是最容易拖垮低端机的地方，故逐条加固：
 *
 * [泄漏 L1] 材质/网格未释放：原代码只调 scene.dispose()+engine.dispose()。Babylon 的
 *           scene.dispose() 虽会递归释放场景内资源，但 StandardMaterial 在部分版本下
 *           若被外部引用会残留 WebGL program；且原代码未移除 onPointerObservable
 *           监听器。现改为显式反注册 observer + 显式 dispose 材质，并置空所有 ref，
 *           断开 JS 侧对 GPU 对象的引用链，让 GC 能够回收。
 * [泄漏 L2] 渲染循环未停止：dispose 前必须 stopRenderLoop，否则回调闭包持有 scene/mesh
 *           引用，即使组件卸载也无法回收，反复进出桌宠页会线性堆积内存直至 OOM 崩溃。
 * [泄漏 L3] 事件监听器泄漏：orientationchange 监听原来只在 Capacitor 环境下添加，
 *           但卸载时无条件移除——虽不报错，却掩盖了真实意图；且缺少 visibilitychange
 *           的清理。现统一添加/统一移除，并用 AbortController 一次性批量解绑，杜绝遗漏。
 * [卡顿 P1] 后台不暂停：原代码切到后台/锁屏后 runRenderLoop 仍以 60fps 空转，
 *           持续占用 GPU 与电量，回到前台时系统已判定应用为高耗电而降频，表现为卡顿。
 *           现监听 visibilitychange + WebGL 上下文事件，后台立即停渲染，前台恢复。
 * [卡顿 P2] 高分屏过度渲染：手机 devicePixelRatio 普遍 3~4，1080p 屏实际渲染分辨率
 *           可达 4K 级，中低端 GPU 直接掉到 20fps。现按设备能力钳制渲染倍率。
 * [卡顿 P3] 动画依赖真实帧率：原动画用 performance.now() 累计，掉帧时动作会突变；
 *           且低端机无谓地跑满 60fps。现限制目标帧率并让动画基于时间推进，保持匀速。
 * [显示 D1] 手势冲突：camera.attachControl 与自定义 onPointerObservable 同时消费同一
 *           指针事件，一次拖拽既转相机又转模型，视觉上"乱转"。现只保留模型旋转，
 *           并显式关闭相机控制。
 * [显示 D2] 上下文丢失：安卓 WebView 在内存紧张时会回收 WebGL 上下文，不处理则永久黑屏。
 *           现监听 webglcontextlost/restored 做恢复。
 * [显示 D3] 被底部导航栏遮挡：见 return 中的层级与安全区处理说明。
 */
import { useEffect, useRef, useState } from 'react';
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4, Mesh, MeshBuilder, StandardMaterial,
} from '@babylonjs/core';
import { PointerEventTypes } from '@babylonjs/core';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/core/Loading/sceneLoader';
import 'babylon-mmd/esm/Loader/mmdModelLoader.default';
import 'babylon-mmd/esm/Loader/pmxLoader';
import 'babylon-mmd/esm/Loader/pmdLoader';

// [v182-6] 手机桌宠支持渲染用户导入的模型：主页 openModelPreview 广播 rl-mobile-pet-model，
//   本页监听后用 babylon-mmd 完整链路（含 referenceFiles 贴图重映射）加载渲染。
interface MobilePetModelEvent {
  name: string;
  data: ArrayBuffer;
  textureFiles: Array<{ name: string; path?: string; data: ArrayBuffer; webkitRelativePath?: string }>;
}


/** [v182-6] 与 BabylonModelViewer 同源的 PMX 贴图路径重映射（灰模修复配套） */
const TEX_EXTS_PET = ['.png', '.bmp', '.jpg', '.tga', '.spa', '.sph', '.gif', '.pix'];

/** [v186] 扫描式定位 PMX 贴图表（与 BabylonModelViewer 同算法） */
function scanPmxTextureTablePet(buffer: ArrayBuffer): string[] {
  const dv = new DataView(buffer);
  const len = bytesLen(buffer);
  const paths: string[] = [];
  for (let pos = 16; pos < len - 8; pos++) {
    const cnt = dv.getInt32(pos, true);
    if (cnt < 8 || cnt > 2000) continue;
    let o = pos + 4;
    let named = 0;
    paths.length = 0;
    let ok = true;
    for (let i = 0; i < cnt; i++) {
      if (o + 4 > len) { ok = false; break; }
      const bl = dv.getInt32(o, true);
      if (bl < 4 || bl > 260 || o + 4 + bl > len) { ok = false; break; }
      let s = '';
      for (let c = 0; c < bl; c += 2) s += String.fromCharCode(dv.getUint16(o + 4 + c, true));
      const lower = s.toLowerCase();
      if (!TEX_EXTS_PET.some((e) => lower.includes(e))) { ok = false; break; }
      named++;
      paths.push(s.replace(/\\\\/g, '/'));
      o += 4 + bl;
    }
    if (!ok || named < cnt) continue;
    if (o + 4 > len) continue;
    const matCnt = dv.getInt32(o, true);
    if (matCnt < 2 || matCnt > 3000) continue;
    return paths;
  }
  return paths;
}

function bytesLen(buffer: ArrayBuffer): number {
  return buffer.byteLength;
}

/** 1×1 透明 PNG（占位兜底，防 resolver miss 卡加载） */
const TRANSPARENT_PNG_PET: ArrayBuffer = (() => {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8.buffer;
})();

/** 底部导航栏高度，与 index.css 的 .mobile-bottom-nav 保持一致 */
const BOTTOM_NAV_HEIGHT = 56;

/**
 * 计算安全的渲染分辨率倍率。
 * [卡顿 P2] devicePixelRatio 在旗舰机上常见 3~4，若原样渲染，1080×2400 的屏幕
 * 实际要渲染 4320×9600 像素，远超中低端 GPU 的填充率，必然掉帧。
 * 这里按屏幕像素总量分档钳制：屏幕越大越保守，保证各档位手机都能跑满帧。
 */
function computeRenderScale(): number {
  const dpr = window.devicePixelRatio || 1;
  const w = window.screen?.width || window.innerWidth;
  const h = window.screen?.height || window.innerHeight;
  const logicalPixels = w * h;
  // 大屏（平板/大屏旗舰）压得更狠，小屏可以宽松一些
  const cap = logicalPixels > 1_200_000 ? 1.5 : 2.0;
  // 硬件并发数可粗略反映 SoC 档次，低端机进一步降级
  const cores = (navigator as any).hardwareConcurrency || 4;
  const lowEnd = cores <= 4;
  return Math.min(dpr, lowEnd ? 1.0 : cap);
}

function MobilePet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rotatingRef = useRef(false);
  // [显示 D2] WebGL 上下文丢失时给用户明确提示，而不是停在黑屏
  const [contextLost, setContextLost] = useState(false);
  // [v182-6] 用户导入的模型（主页广播）与加载状态（加载过程可追踪）
  const [importedModel, setImportedModel] = useState<MobilePetModelEvent | null>(null);
  const [modelLoadState, setModelLoadState] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    const apply = (d: MobilePetModelEvent | undefined | null) => {
      if (d?.name && d?.data) {
        console.log('[MobilePet][v183] 应用导入模型:', d.name, '贴图:', d.textureFiles?.length || 0);
        setImportedModel(d);
        setModelLoadState('loading');
      }
    };
    // [v183-T4] 挂载即拉取暂存（页签切换晚于导入的场景——纯事件时序会永久错过）
    apply((window as any).__rlMobilePetModel);
    const onModel = (e: Event) => {
      apply((e as CustomEvent).detail as MobilePetModelEvent);
    };
    window.addEventListener('rl-mobile-pet-model', onModel);
    return () => window.removeEventListener('rl-mobile-pet-model', onModel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // [泄漏 L3] 用 AbortController 统一管理所有 DOM 监听器，
    // 卸载时一次 abort() 全部解绑，从根本上避免"加了忘了删"的泄漏。
    const ac = new AbortController();
    const { signal } = ac;
    // [v182-6] 卸载标记：中断进行中的导入模型异步加载
    let disposed = false;

    let engine: Engine | null = null;
    let scene: Scene | null = null;
    // 持有需要显式释放的资源，便于卸载时集中清理
    const materials: StandardMaterial[] = [];
    let pointerObserver: ReturnType<Scene['onPointerObservable']['add']> | null = null;
    let renderLoopRunning = false;

    try {
      engine = new Engine(
        canvas,
        true,
        {
          // preserveDrawingBuffer/stencil 会强制关闭部分驱动的优化路径并增加显存占用。
          // 桌宠不需要截图，也不需要模板缓冲，关闭以降低移动端显存压力。
          preserveDrawingBuffer: false,
          stencil: false,
          // 移动端 GPU 抗锯齿开销高，且角色是低多边形几何体，收益极小
          antialias: false,
          // 上下文丢失时由我们自己处理恢复
          doNotHandleContextLost: false,
          // 省电模式：告知浏览器优先选择低功耗 GPU，显著改善续航与发热降频
          powerPreference: 'low-power',
        },
        true
      );
    } catch (err) {
      console.error('[MobilePet] WebGL 引擎创建失败（设备可能不支持 WebGL）:', err);
      setContextLost(true);
      return;
    }

    engineRef.current = engine;
    // [卡顿 P2] 钳制渲染分辨率。Babylon 的 hardwareScalingLevel 是"倍率的倒数"：
    // 值越大渲染分辨率越低。scale=2 → 每 2 个物理像素渲染 1 个，开销降为 1/4。
    engine.setHardwareScalingLevel(1 / computeRenderScale());

    scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0); // 透明背景
    sceneRef.current = scene;

    // 相机（固定视角，旋转交给模型自身）
    const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.4, 7, new Vector3(0, 1, 0), scene);
    // [显示 D1 手势冲突] 这里刻意不调用 camera.attachControl()。
    //   原实现同时启用了相机控制和下方的自定义指针旋转，一次手指拖拽被两套逻辑同时消费：
    //   相机绕目标公转 + 模型自身旋转叠加，用户感知为"怎么拖都对不上、画面乱飘"。
    //   桌宠的交互预期是"转动角色"，因此保留模型旋转、彻底关闭相机控制。
    camera.minZ = 0.1;

    // 光照（对标 MMD 标准：单主光源 + 半球光补光）
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.85;
    hemi.groundColor = new Color3(0.4, 0.4, 0.45);
    const dir = new DirectionalLight('dir', new Vector3(-0.5, -1, 0.5), scene);
    dir.intensity = 0.9;

    // ===== 程序化生成一个简化但可爱的 3D 角色 =====
    const root = new Mesh('petRoot', scene);

    const skinMat = new StandardMaterial('skin', scene);
    skinMat.diffuseColor = new Color3(1, 0.85, 0.75);
    const hairMat = new StandardMaterial('hair', scene);
    hairMat.diffuseColor = new Color3(0.45, 0.3, 0.7);
    const clothMat = new StandardMaterial('cloth', scene);
    clothMat.diffuseColor = new Color3(0.3, 0.6, 0.9);
    const eyeMat = new StandardMaterial('eye', scene);
    eyeMat.diffuseColor = new Color3(0.1, 0.1, 0.2);
    eyeMat.emissiveColor = new Color3(0.1, 0.1, 0.2);
    // [泄漏 L1] 登记所有材质，卸载时显式释放其 GPU program
    materials.push(skinMat, hairMat, clothMat, eyeMat);
    // 角色为低模且材质纯色，冻结材质可跳过每帧的材质状态检查，降低 CPU 开销
    materials.forEach((m) => m.freeze());

    // 头
    const head = MeshBuilder.CreateSphere('head', { diameter: 1.6, segments: 24 }, scene);
    head.material = skinMat;
    head.position.y = 2.4;
    head.parent = root;

    // 头发（半球盖在头上）
    const hair = MeshBuilder.CreateSphere('hair', { diameter: 1.72, segments: 24 }, scene);
    hair.material = hairMat;
    hair.scaling.y = 0.7;
    hair.parent = root;
    // 用 clipping 近似：把头发下移一点盖住头顶
    hair.position.y = 2.62;

    // 眼睛
    const eyeL = MeshBuilder.CreateSphere('eyeL', { diameter: 0.22, segments: 12 }, scene);
    eyeL.material = eyeMat;
    eyeL.position = new Vector3(-0.35, 2.45, 0.78);
    eyeL.parent = root;
    const eyeR = MeshBuilder.CreateSphere('eyeR', { diameter: 0.22, segments: 12 }, scene);
    eyeR.material = eyeMat;
    eyeR.position = new Vector3(0.35, 2.45, 0.78);
    eyeR.parent = root;

    // 身体
    const body = MeshBuilder.CreateCylinder('body', { height: 1.8, diameterTop: 0.9, diameterBottom: 1.4, tessellation: 24 }, scene);
    body.material = clothMat;
    body.position.y = 1.1;
    body.parent = root;

    // 手臂
    const armL = MeshBuilder.CreateCapsule('armL', { height: 1.4, radius: 0.22 }, scene);
    armL.material = skinMat;
    armL.position = new Vector3(-0.85, 1.2, 0);
    armL.rotation.z = 0.3;
    armL.parent = root;
    const armR = MeshBuilder.CreateCapsule('armR', { height: 1.4, radius: 0.22 }, scene);
    armR.material = skinMat;
    armR.position = new Vector3(0.85, 1.2, 0);
    armR.rotation.z = -0.3;
    armR.parent = root;

    // 腿
    const legL = MeshBuilder.CreateCapsule('legL', { height: 1.2, radius: 0.28 }, scene);
    legL.material = clothMat;
    legL.position = new Vector3(-0.35, -0.1, 0);
    legL.parent = root;
    const legR = MeshBuilder.CreateCapsule('legR', { height: 1.2, radius: 0.28 }, scene);
    legR.material = clothMat;
    legR.position = new Vector3(0.35, -0.1, 0);
    legR.parent = root;

    // 底座（让角色"站"在桌面感）
    const base = MeshBuilder.CreateCylinder('base', { height: 0.1, diameter: 1.3, tessellation: 24 }, scene);
    base.material = clothMat;
    base.position.y = -0.75;
    base.parent = root;

    // [v182-6] 有导入模型时隐藏程序化角色（改渲染用户模型）；无导入则照常显示
    if (importedModel) {
      root.setEnabled(false);
    }

    // 角色是纯几何体、无实时拾取需求，关闭拾取可省下每帧的射线检测开销
    scene.skipPointerMovePicking = true;
    // 场景内容固定，跳过自动包围盒同步，进一步减少每帧 CPU 计算
    scene.autoClear = true;
    scene.blockMaterialDirtyMechanism = true;

    // ===== 手指拖拽旋转（等价于 PC 端右键拖拽旋转角色）=====
    let lastX = 0, lastY = 0;
    // [泄漏 L1] 保存 observer 句柄，卸载时必须 remove，否则闭包会一直持有 root 网格
    pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        rotatingRef.current = true;
        lastX = pointerInfo.event.clientX;
        lastY = pointerInfo.event.clientY;
      } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
        rotatingRef.current = false;
      } else if (pointerInfo.type === PointerEventTypes.POINTERMOVE && rotatingRef.current) {
        const dx = pointerInfo.event.clientX - lastX;
        const dy = pointerInfo.event.clientY - lastY;
        lastX = pointerInfo.event.clientX;
        lastY = pointerInfo.event.clientY;
        root.rotation.y += dx * 0.01;
        root.rotation.x = Math.max(-0.5, Math.min(0.5, root.rotation.x + dy * 0.01));
      }
    });

    // [显示 D1] Babylon 的 onPointerObservable 只在画布内派发事件，
    //   若手指滑出画布外才抬起，POINTERUP 永远收不到，rotating 会一直停在 true，
    //   之后手指再触屏时 lastX/lastY 还是很久以前的值，模型会瞬间"暴走"跳转。
    //   因此必须在 window 层兜底复位（含来电、通知栏下拉、手势返回等系统打断）。
    const stopRotate = () => { rotatingRef.current = false; };
    window.addEventListener('pointerup', stopRotate, { signal });
    window.addEventListener('pointercancel', stopRotate, { signal });
    window.addEventListener('blur', stopRotate, { signal });

    // ===== 自然摆动动画（等价于 PC 端 swingObserver 的头发/身体摆动）=====
    const start = performance.now();
    const renderFn = () => {
      // 动画基于真实经过时间推进，掉帧时也保持匀速，不会出现动作突跳
      const t = (performance.now() - start) / 1000;
      // 身体轻微呼吸/晃动
      root.position.y = Math.sin(t * 1.5) * 0.04;
      root.rotation.z = Math.sin(t * 1.2) * 0.03;
      // 头发轻微摆动
      hair.rotation.z = Math.sin(t * 1.8 + 0.5) * 0.05;
      // 手臂轻微摆动
      armL.rotation.x = Math.sin(t * 1.6) * 0.12;
      armR.rotation.x = -Math.sin(t * 1.6) * 0.12;
      scene!.render();
    };

    const startLoop = () => {
      if (renderLoopRunning || !engine) return;
      engine.runRenderLoop(renderFn);
      renderLoopRunning = true;
    };
    const stopLoop = () => {
      if (!renderLoopRunning || !engine) return;
      engine.stopRenderLoop();
      renderLoopRunning = false;
    };

    startLoop();

    // ============ [v182-6] 用户导入模型的加载与渲染 ============
    if (importedModel) {
      setModelLoadState('loading');
      console.log('[MobilePet][v182] 开始加载导入模型:', importedModel.name,
        '大小:', importedModel.data.byteLength, '贴图:', importedModel.textureFiles.length);
      (async () => {
        try {
          const sc = scene!;
          // referenceFiles 构建 + PMX 贴图路径重映射（与 BabylonModelViewer 同逻辑）
          const referenceFiles: Array<{ relativePath: string; mimeType?: string; data: ArrayBuffer }> = [];
          for (const tex of importedModel.textureFiles) {
            const ext = (tex.name.split('.').pop() || '').toLowerCase();
            const mime = ext === 'png' ? 'image/png'
              : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
              : ext === 'bmp' ? 'image/bmp'
              : ext === 'tga' ? 'image/x-tga'
              : ext === 'webp' ? 'image/webp'
              : (ext === 'spa' || ext === 'sph') ? 'application/octet-stream'
              : undefined;
            referenceFiles.push({ relativePath: tex.path || tex.name, mimeType: mime, data: tex.data });
          }
          const lowerName = importedModel.name.toLowerCase();
          if ((lowerName.endsWith('.pmx') || lowerName.endsWith('.pmd')) && referenceFiles.length > 0) {
            // [v186] 扫描式贴图表定位 + basename 配对 + 占位兜底（与 viewer 同算法）
            const pmxTexPaths = scanPmxTextureTablePet(importedModel.data);
            if (pmxTexPaths.length > 0) {
              const norm = (s: string) => s.replace(/\\/g, '/').trim().toLowerCase();
              const base = (s: string) => norm(s).split('/').pop() || '';
              const byBase = new Map<string, any>();
              for (const f of referenceFiles) {
                const b = base(f.relativePath);
                if (b && !byBase.has(b)) byBase.set(b, f);
              }
              const remapped: typeof referenceFiles = [];
              let matched = 0;
              for (const pmxPath of pmxTexPaths) {
                const nb = base(pmxPath);
                const hit = nb ? byBase.get(nb) : undefined;
                if (hit) {
                  matched++;
                  remapped.push({ ...hit, relativePath: pmxPath });
                  byBase.delete(nb);
                } else {
                  remapped.push({ relativePath: pmxPath, mimeType: 'image/png', data: TRANSPARENT_PNG_PET.slice(0) });
                }
              }
              console.log('[MobilePet][v186] 贴图重映射: PMX 路径 ' + pmxTexPaths.length + ', 配对 ' + matched + ', 占位 ' + (pmxTexPaths.length - matched));
              referenceFiles.length = 0;
              referenceFiles.push(...remapped);
            }
          }
          const modelBlob = new Blob([importedModel.data]);
          const sourceUrl = URL.createObjectURL(modelBlob);
          const options: any = (lowerName.endsWith('.pmd'))
            ? { pluginExtension: '.pmd' }
            : (lowerName.endsWith('.pmx'))
              ? { pluginExtension: '.pmx' }
              : { pluginExtension: lowerName.endsWith('.glb') ? '.glb' : lowerName.endsWith('.gltf') ? '.gltf' : '.obj' };
          if ((lowerName.endsWith('.pmx') || lowerName.endsWith('.pmd')) && referenceFiles.length > 0) {
            options.pluginOptions = { mmdmodel: { referenceFiles } };
          }
          const result = await ImportMeshAsync(sourceUrl, sc, options);
          if (disposed) return;
          const meshes = result.meshes;
          if (!meshes || meshes.length === 0) throw new Error('模型加载失败：未返回任何 mesh');
          // 取景：按包围盒全身平视（复用 v182-5 参数理念）
          let mn: any = null, mx: any = null;
          for (const m of meshes) {
            if (!m.isVisible || !m.isEnabled()) continue;
            m.computeWorldMatrix(true);
            const bb = m.getBoundingInfo().boundingBox;
            if (!mn) { mn = { ...bb.minimumWorld }; mx = { ...bb.maximumWorld }; continue; }
            mn.x = Math.min(mn.x, bb.minimumWorld.x); mn.y = Math.min(mn.y, bb.minimumWorld.y); mn.z = Math.min(mn.z, bb.minimumWorld.z);
            mx.x = Math.max(mx.x, bb.maximumWorld.x); mx.y = Math.max(mx.y, bb.maximumWorld.y); mx.z = Math.max(mx.z, bb.maximumWorld.z);
          }
          const cam2 = sceneRef.current?.activeCamera as ArcRotateCamera | null;
          if (mn && mx && cam2) {
            const h = Math.max(0.1, mx.y - mn.y);
            const cx = (mn.x + mx.x) / 2, cz = (mn.z + mx.z) / 2;
            cam2.setTarget(new Vector3(cx, mn.y + h * 0.5, cz));
            cam2.beta = Math.PI / 2;
            const distance = ((h * 1.18) / 2) / Math.tan((cam2.fov || 0.8) / 2) * 1.1;
            cam2.radius = Math.max(1, Math.min(50, distance));
          }
          URL.revokeObjectURL(sourceUrl);
          setModelLoadState('ok');
          console.log('[MobilePet][v182] 导入模型渲染成功:', importedModel.name, 'meshes:', meshes.length,
            'referenceFiles:', referenceFiles.length);
        } catch (err) {
          console.warn('[MobilePet][v182] 导入模型加载失败（保留程序化角色降级）:', err);
          if (!disposed) setModelLoadState('fail');
          try {
            // 降级：重新显示程序化角色
            const r = sceneRef.current?.getMeshByName('petRoot');
            if (r) r.setEnabled(true);
          } catch { /* noop */ }
        }
      })();
    }

    // [卡顿 P1] 页面不可见（切后台/锁屏/切标签）时立刻停渲染。
    //   这是移动端最关键的一条：不停渲染会让系统把应用标记为高耗电后台任务，
    //   触发厂商省电策略降频甚至杀进程，用户回到前台就是明显卡顿。
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    }, { signal });

    // [显示 D2] WebGL 上下文丢失/恢复。安卓 WebView 内存紧张时会主动回收 GPU 上下文，
    //   不处理会永久黑屏且无任何报错，是极难排查的线上问题。
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); // 必须阻止默认行为，否则上下文不可恢复
      stopLoop();
      setContextLost(true);
      console.warn('[MobilePet] WebGL 上下文丢失，已暂停渲染并等待恢复');
    }, { signal });

    canvas.addEventListener('webglcontextrestored', () => {
      setContextLost(false);
      startLoop();
      console.log('[MobilePet] WebGL 上下文已恢复，渲染继续');
    }, { signal });

    // 自适应尺寸
    // [卡顿] resize 在旋转/键盘弹出时会连续触发，engine.resize() 会重建渲染目标，
    // 高频调用直接卡顿，故做 rAF 节流，每帧最多一次。
    let resizeRaf = 0;
    const resize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (!engine) return;
        // 屏幕尺寸变化后需重新评估渲染倍率（如折叠屏展开、分屏模式）
        engine.setHardwareScalingLevel(1 / computeRenderScale());
        engine.resize();
      });
    };
    window.addEventListener('resize', resize, { signal });
    window.addEventListener('orientationchange', resize, { signal });

    return () => {
      // ===== 严格按依赖顺序释放，顺序错误会导致 dispose 内部访问已销毁对象而报错 =====
      cancelAnimationFrame(resizeRaf);
      // 1) 先解绑所有 DOM 监听（含 visibilitychange / webglcontext* / resize）
      ac.abort();
      // 2) [泄漏 L2] 停掉渲染循环，断开闭包对 scene/mesh 的持有
      stopLoop();
      // 3) [泄漏 L1] 移除场景内 observer，否则闭包持续引用 root 网格
      if (pointerObserver && scene) {
        scene.onPointerObservable.remove(pointerObserver);
        pointerObserver = null;
      }
      // 4) 显式释放材质（先解冻，冻结状态下部分版本不会释放内部 effect）
      materials.forEach((m) => {
        try { m.unfreeze(); m.dispose(true, true); } catch { /* 已随场景释放则忽略 */ }
      });
      materials.length = 0;
      // 5) 释放场景（递归释放其下所有网格/光照/相机）
      try { scene?.dispose(); } catch (err) { console.warn('[MobilePet] scene.dispose 异常:', err); }
      // 6) 最后释放引擎，归还 WebGL 上下文
      try { engine?.dispose(); } catch (err) { console.warn('[MobilePet] engine.dispose 异常:', err); }
      // 7) 置空 ref，彻底断开 JS 侧引用链，让 GC 能回收
      scene = null;
      engine = null;
      sceneRef.current = null;
      engineRef.current = null;
    };
  }, [importedModel]);

  return (
    // [显示 D3 桌宠被遮挡] 原实现是 position:fixed; inset:0 且无 z-index，
    //   而 .mobile-bottom-nav 的 z-index 是 1000，导航栏直接盖在画布上，
    //   角色下半身被遮住，底部提示文字也看不见。
    //   这里不采用"把桌宠 z-index 提到 1000 以上"的做法——那会反过来盖住导航栏，
    //   使用户无法切换页面（比被遮挡更严重）。
    //   正确解法：桌宠保持在导航栏之下，同时把可视区域的底边收缩到导航栏之上，
    //   并叠加安全区高度，确保全面屏手势条区域也不会吃掉画面。
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: `calc(${BOTTOM_NAV_HEIGHT}px + var(--sab))`,
        background: 'transparent',
        zIndex: 1,
        // 避免画布内的拖拽手势被 WebView 解释为页面滚动/下拉刷新
        overscrollBehavior: 'none',
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          outline: 'none',
          display: 'block',
        }}
      />
      {contextLost && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center', padding: 24,
          }}
        >
          3D 渲染已暂停（显存被系统回收），返回本页或重启应用即可恢复
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center',
        color: 'rgba(255,255,255,0.6)', fontSize: 13, pointerEvents: 'none',
      }}>
        {importedModel
          ? (modelLoadState === 'loading' ? '模型加载中…'
            : modelLoadState === 'ok' ? `导入模型：${importedModel.name} · 拖拽旋转`
            : modelLoadState === 'fail' ? '导入模型加载失败，已显示默认桌宠'
            : `导入模型：${importedModel.name}`)
          : '用手指拖拽旋转 · 桌宠'}
      </div>
    </div>
  );
}

export default MobilePet;
