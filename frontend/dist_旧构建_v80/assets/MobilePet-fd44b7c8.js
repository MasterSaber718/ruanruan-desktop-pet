import { r as reactExports, b as jsxs, j as jsx } from "./mui-42cba0d1.js";
import { E as Engine, a as Scene, C as Color4, A as ArcRotateCamera, V as Vector3, H as HemisphericLight, b as Color3, D as DirectionalLight, e as Mesh, c as StandardMaterial, M as MeshBuilder, P as PointerEventTypes } from "./babylon-fa4505fb.js";
const BOTTOM_NAV_HEIGHT = 56;
function computeRenderScale() {
  var _a, _b;
  const dpr = window.devicePixelRatio || 1;
  const w = ((_a = window.screen) == null ? void 0 : _a.width) || window.innerWidth;
  const h = ((_b = window.screen) == null ? void 0 : _b.height) || window.innerHeight;
  const logicalPixels = w * h;
  const cap = logicalPixels > 12e5 ? 1.5 : 2;
  const cores = navigator.hardwareConcurrency || 4;
  const lowEnd = cores <= 4;
  return Math.min(dpr, lowEnd ? 1 : cap);
}
function MobilePet() {
  const canvasRef = reactExports.useRef(null);
  const engineRef = reactExports.useRef(null);
  const sceneRef = reactExports.useRef(null);
  const rotatingRef = reactExports.useRef(false);
  const [contextLost, setContextLost] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas)
      return;
    const ac = new AbortController();
    const { signal } = ac;
    let engine = null;
    let scene = null;
    const materials = [];
    let pointerObserver = null;
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
          powerPreference: "low-power"
        },
        true
      );
    } catch (err) {
      console.error("[MobilePet] WebGL 引擎创建失败（设备可能不支持 WebGL）:", err);
      setContextLost(true);
      return;
    }
    engineRef.current = engine;
    engine.setHardwareScalingLevel(1 / computeRenderScale());
    scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);
    sceneRef.current = scene;
    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.4, 7, new Vector3(0, 1, 0), scene);
    camera.minZ = 0.1;
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.85;
    hemi.groundColor = new Color3(0.4, 0.4, 0.45);
    const dir = new DirectionalLight("dir", new Vector3(-0.5, -1, 0.5), scene);
    dir.intensity = 0.9;
    const root = new Mesh("petRoot", scene);
    const skinMat = new StandardMaterial("skin", scene);
    skinMat.diffuseColor = new Color3(1, 0.85, 0.75);
    const hairMat = new StandardMaterial("hair", scene);
    hairMat.diffuseColor = new Color3(0.45, 0.3, 0.7);
    const clothMat = new StandardMaterial("cloth", scene);
    clothMat.diffuseColor = new Color3(0.3, 0.6, 0.9);
    const eyeMat = new StandardMaterial("eye", scene);
    eyeMat.diffuseColor = new Color3(0.1, 0.1, 0.2);
    eyeMat.emissiveColor = new Color3(0.1, 0.1, 0.2);
    materials.push(skinMat, hairMat, clothMat, eyeMat);
    materials.forEach((m) => m.freeze());
    const head = MeshBuilder.CreateSphere("head", { diameter: 1.6, segments: 24 }, scene);
    head.material = skinMat;
    head.position.y = 2.4;
    head.parent = root;
    const hair = MeshBuilder.CreateSphere("hair", { diameter: 1.72, segments: 24 }, scene);
    hair.material = hairMat;
    hair.scaling.y = 0.7;
    hair.parent = root;
    hair.position.y = 2.62;
    const eyeL = MeshBuilder.CreateSphere("eyeL", { diameter: 0.22, segments: 12 }, scene);
    eyeL.material = eyeMat;
    eyeL.position = new Vector3(-0.35, 2.45, 0.78);
    eyeL.parent = root;
    const eyeR = MeshBuilder.CreateSphere("eyeR", { diameter: 0.22, segments: 12 }, scene);
    eyeR.material = eyeMat;
    eyeR.position = new Vector3(0.35, 2.45, 0.78);
    eyeR.parent = root;
    const body = MeshBuilder.CreateCylinder("body", { height: 1.8, diameterTop: 0.9, diameterBottom: 1.4, tessellation: 24 }, scene);
    body.material = clothMat;
    body.position.y = 1.1;
    body.parent = root;
    const armL = MeshBuilder.CreateCapsule("armL", { height: 1.4, radius: 0.22 }, scene);
    armL.material = skinMat;
    armL.position = new Vector3(-0.85, 1.2, 0);
    armL.rotation.z = 0.3;
    armL.parent = root;
    const armR = MeshBuilder.CreateCapsule("armR", { height: 1.4, radius: 0.22 }, scene);
    armR.material = skinMat;
    armR.position = new Vector3(0.85, 1.2, 0);
    armR.rotation.z = -0.3;
    armR.parent = root;
    const legL = MeshBuilder.CreateCapsule("legL", { height: 1.2, radius: 0.28 }, scene);
    legL.material = clothMat;
    legL.position = new Vector3(-0.35, -0.1, 0);
    legL.parent = root;
    const legR = MeshBuilder.CreateCapsule("legR", { height: 1.2, radius: 0.28 }, scene);
    legR.material = clothMat;
    legR.position = new Vector3(0.35, -0.1, 0);
    legR.parent = root;
    const base = MeshBuilder.CreateCylinder("base", { height: 0.1, diameter: 1.3, tessellation: 24 }, scene);
    base.material = clothMat;
    base.position.y = -0.75;
    base.parent = root;
    scene.skipPointerMovePicking = true;
    scene.autoClear = true;
    scene.blockMaterialDirtyMechanism = true;
    let lastX = 0, lastY = 0;
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
    const stopRotate = () => {
      rotatingRef.current = false;
    };
    window.addEventListener("pointerup", stopRotate, { signal });
    window.addEventListener("pointercancel", stopRotate, { signal });
    window.addEventListener("blur", stopRotate, { signal });
    const start = performance.now();
    const renderFn = () => {
      const t = (performance.now() - start) / 1e3;
      root.position.y = Math.sin(t * 1.5) * 0.04;
      root.rotation.z = Math.sin(t * 1.2) * 0.03;
      hair.rotation.z = Math.sin(t * 1.8 + 0.5) * 0.05;
      armL.rotation.x = Math.sin(t * 1.6) * 0.12;
      armR.rotation.x = -Math.sin(t * 1.6) * 0.12;
      scene.render();
    };
    const startLoop = () => {
      if (renderLoopRunning || !engine)
        return;
      engine.runRenderLoop(renderFn);
      renderLoopRunning = true;
    };
    const stopLoop = () => {
      if (!renderLoopRunning || !engine)
        return;
      engine.stopRenderLoop();
      renderLoopRunning = false;
    };
    startLoop();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden)
        stopLoop();
      else
        startLoop();
    }, { signal });
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      stopLoop();
      setContextLost(true);
      console.warn("[MobilePet] WebGL 上下文丢失，已暂停渲染并等待恢复");
    }, { signal });
    canvas.addEventListener("webglcontextrestored", () => {
      setContextLost(false);
      startLoop();
      console.log("[MobilePet] WebGL 上下文已恢复，渲染继续");
    }, { signal });
    let resizeRaf = 0;
    const resize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (!engine)
          return;
        engine.setHardwareScalingLevel(1 / computeRenderScale());
        engine.resize();
      });
    };
    window.addEventListener("resize", resize, { signal });
    window.addEventListener("orientationchange", resize, { signal });
    return () => {
      cancelAnimationFrame(resizeRaf);
      ac.abort();
      stopLoop();
      if (pointerObserver && scene) {
        scene.onPointerObservable.remove(pointerObserver);
        pointerObserver = null;
      }
      materials.forEach((m) => {
        try {
          m.unfreeze();
          m.dispose(true, true);
        } catch {
        }
      });
      materials.length = 0;
      try {
        scene == null ? void 0 : scene.dispose();
      } catch (err) {
        console.warn("[MobilePet] scene.dispose 异常:", err);
      }
      try {
        engine == null ? void 0 : engine.dispose();
      } catch (err) {
        console.warn("[MobilePet] engine.dispose 异常:", err);
      }
      scene = null;
      engine = null;
      sceneRef.current = null;
      engineRef.current = null;
    };
  }, []);
  return (
    // [显示 D3 桌宠被遮挡] 原实现是 position:fixed; inset:0 且无 z-index，
    //   而 .mobile-bottom-nav 的 z-index 是 1000，导航栏直接盖在画布上，
    //   角色下半身被遮住，底部提示文字也看不见。
    //   这里不采用"把桌宠 z-index 提到 1000 以上"的做法——那会反过来盖住导航栏，
    //   使用户无法切换页面（比被遮挡更严重）。
    //   正确解法：桌宠保持在导航栏之下，同时把可视区域的底边收缩到导航栏之上，
    //   并叠加安全区高度，确保全面屏手势条区域也不会吃掉画面。
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: `calc(${BOTTOM_NAV_HEIGHT}px + var(--sab))`,
          background: "transparent",
          zIndex: 1,
          // 避免画布内的拖拽手势被 WebView 解释为页面滚动/下拉刷新
          overscrollBehavior: "none",
          touchAction: "none"
        },
        children: [
          /* @__PURE__ */ jsx(
            "canvas",
            {
              ref: canvasRef,
              style: {
                width: "100%",
                height: "100%",
                touchAction: "none",
                outline: "none",
                display: "block"
              }
            }
          ),
          contextLost && /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.85)",
                fontSize: 14,
                textAlign: "center",
                padding: 24
              },
              children: "3D 渲染已暂停（显存被系统回收），返回本页或重启应用即可恢复"
            }
          ),
          /* @__PURE__ */ jsx("div", { style: {
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            pointerEvents: "none"
          }, children: "用手指拖拽旋转 · 桌宠" })
        ]
      }
    )
  );
}
export {
  MobilePet as default
};
