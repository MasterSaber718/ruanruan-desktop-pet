/**
 * 阮琳云智能助手 - Electron Preload 脚本
 *
 * [2026-08-05 重构] 桌宠独立窗口架构
 *
 * 设计原则：
 *   - contextIsolation: true 下，渲染进程无法直接 require('electron')
 *   - 通过 contextBridge 暴露白名单接口，渲染进程通过 window.desktopPet / window.windowControls 调用
 *   - sandbox: true 下 preload 只能用 contextBridge + ipcRenderer，无法访问 Node API（安全）
 *
 * 暴露的接口：
 *   window.desktopPet（主窗口调用）：
 *     - show(modelData): Promise<{success}> 显示桌宠窗口并传入模型数据
 *     - hide(): 隐藏桌宠（不销毁窗口，快速恢复）
 *     - close(): 关闭并销毁桌宠窗口
 *     - getScreenSize(): Promise<ScreenInfo> 获取屏幕分辨率
 *
 *   window.desktopPet（桌宠窗口调用）：
 *     - getModel(): Promise<PetModelData|null> 获取缓存的模型数据
 *     - onModelUpdated(callback): 监听模型更新（主窗口导入新模型时触发）
 *     - showWindow(): 模型加载完成后请求显示窗口
 *     - setIgnoreMouse(ignore): 切换鼠标穿透
 *     - getScreenSize(): Promise<ScreenInfo> 获取屏幕分辨率
 *
 *   window.windowControls（主窗口自定义标题栏用）：
 *     - minimize(): 最小化
 *     - close(): 关闭
 *     - toggleMaximize(): 切换最大化
 */
const { contextBridge, ipcRenderer } = require('electron');

// 桌宠接口（主窗口 + 桌宠窗口共用）
contextBridge.exposeInMainWorld('desktopPet', {
  // [v185] 通话状态桥：主页通话 <-> 壁纸控制台 双向同步
  pushCallState: (inCall) => ipcRenderer.send('call-state:push', !!inCall),
  onCallState: (cb) => { const h = (_e, v) => cb(v); ipcRenderer.on('call-state:changed', h); return () => ipcRenderer.removeListener('call-state:changed', h); },
  requestCallToggle: () => ipcRenderer.invoke('call-state:request-toggle'),
  // ===== 主窗口调用：控制桌宠窗口 =====
  // 显示桌宠并传入模型数据（主窗口导入模型后调用）
  // modelData 结构：{ name, data: ArrayBuffer, textureFiles: [{name, path, data, webkitRelativePath}], modelWebkitRelativePath }
  show: (modelData) => ipcRenderer.invoke('desktop-pet:show', modelData),
  // 隐藏桌宠（不销毁，快速恢复）
  hide: () => ipcRenderer.send('desktop-pet:hide'),
  // 关闭并销毁桌宠窗口
  close: () => ipcRenderer.send('desktop-pet:close'),

  // ===== 桌宠窗口调用：获取数据 =====
  // 获取缓存的模型数据（桌宠窗口加载时调用）
  getModel: () => ipcRenderer.invoke('desktop-pet:get-model'),
  // 监听模型更新（主窗口导入新模型时触发，桌宠窗口重新加载模型）
  onModelUpdated: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('desktop-pet:model-updated', handler);
    // 返回取消监听函数（组件卸载时调用，避免内存泄漏）
    return () => ipcRenderer.removeListener('desktop-pet:model-updated', handler);
  },
  // 模型加载完成后请求显示窗口（桌宠窗口调用，避免显示空白窗口）
  showWindow: () => ipcRenderer.send('desktop-pet:show-window'),
  // [2026-08-06 边框跟着角色放大缩小 v2] 调整桌宠窗口尺寸（中心点固定，放大到屏幕上限时上下吸附）
  resizeWindow: (width, height) => ipcRenderer.send('desktop-pet:resize-window', { width, height }),
  setResizeFrozen: (frozen) => ipcRenderer.send('desktop-pet:set-resize-frozen', !!frozen),
  // [2026-08-06 右键拖拽移动窗口] 相对移动窗口位置（右键拖拽时调用）
  moveWindow: (deltaX, deltaY) => ipcRenderer.send('desktop-pet:move-window', { deltaX, deltaY }),

  // ===== 通用接口 =====
  // 获取屏幕分辨率（主窗口和桌宠窗口都用）
  getScreenSize: () => ipcRenderer.invoke('desktop-pet:get-screen-size'),
  // 切换鼠标穿透（桌宠窗口 ray pick 命中模型时调 false，离开调 true）
  setIgnoreMouse: (ignore) => ipcRenderer.send('desktop-pet:set-ignore-mouse', ignore),

  // ===== [v70 可见性渲染调度] =====
  // 主进程按"肉眼能否看到本窗口"广播渲染档位 data.mode: 'active' | 'reduced' | 'frozen'
  //   frozen（被完全遮挡/最小化）→ 渲染端停 rAF 循环；解冻后主进程下发新档位自动恢复
  onRenderMode: (callback) => {
    const handler = (_event, data) => callback((data && data.mode) || 'active');
    ipcRenderer.on('render-mode', handler);
    return () => ipcRenderer.removeListener('render-mode', handler);
  },
  // [v70 指令扇出] 主进程统一轮询 /pending 后广播动作指令（渲染端不再各自抢单）
  //   data.commands: JointCommand[]，渲染端调 executeIncomingCommands 执行
  onJointCommand: (callback) => {
    const handler = (_event, data) => callback((data && data.commands) || []);
    ipcRenderer.on('joint-command', handler);
    return () => ipcRenderer.removeListener('joint-command', handler);
  },

  sendRenderFrame: (frame) => ipcRenderer.send('render-frame', frame),
  onRenderFrame: (callback) => {
    const handler = (_event, frame) => callback(frame);
    ipcRenderer.on('render-frame', handler);
    return () => ipcRenderer.removeListener('render-frame', handler);
  },
  setRenderChannel: (channel, on) => ipcRenderer.send('render-channel', { channel, on: !!on }),
});

// 壁纸模式接口（[2026-08-31 v62] F11 全屏 → 角色成为桌面壁纸层）
contextBridge.exposeInMainWorld('wallpaperMode', {
  // 进入壁纸模式（正常由主进程 F11 拦截触发，此接口留给设置页/控制台扩展）
  enter: () => ipcRenderer.invoke('wallpaper-mode:enter'),
  // 退出壁纸模式（回主窗口，Wallpaper Engine 恢复）
  exit: () => ipcRenderer.invoke('wallpaper-mode:exit'),
  // 切到桌面宠物模式（退出壁纸 + 恢复桌宠窗口，主窗口保持隐藏）
  showPet: () => ipcRenderer.invoke('wallpaper-mode:show-pet'),
  // 查询状态 { active, hasModel }
  getStatus: () => ipcRenderer.invoke('wallpaper-mode:get-status'),
  // [v67] 悬浮控制台申报窗口尺寸（悬浮球/面板形态切换时调用，防止透明区域挡住桌面点击）
  setConsoleSize: (width, height) => ipcRenderer.invoke('wallpaper-console:set-size', width, height),
  // [v69] 手动拖拽支持：读取/设置控制台窗口位置（app-region 在透明窗口上不可用）
  getConsolePos: () => ipcRenderer.invoke('wallpaper-console:get-pos'),
  setConsolePos: (x, y) => ipcRenderer.invoke('wallpaper-console:set-pos', x, y),
  // [v69] 控制台窗口失焦通知（点击球/面板外 → 渲染层收回为悬浮球）
  onConsoleBlur: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('wallpaper-console:blur', handler);
    return () => ipcRenderer.removeListener('wallpaper-console:blur', handler);
  },

    // [v181] 壁纸控制台新入口：退出壁纸模式并把主窗口导航到指定页面（'/?call=1' 语音通话 / '/settings' 设置）
  navigateMain: (route) => ipcRenderer.invoke('wallpaper-mode:navigate-main', route),
    // 挂载结果通知（主进程 attach WorkerW 完成后广播）
  onAttached: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('wallpaper-mode:attached', handler);
    return () => ipcRenderer.removeListener('wallpaper-mode:attached', handler);
  },
});

// [v71] Godot 渲染端（双渲染后端之"新引擎"路线）
// 原版 Babylon 链路不动；Godot 独立进程渲染，主进程指令扇出同步转发
// [v72] embed：手动触发/重试 SetParent 嵌入主窗口预览区（start 时主窗口可见会自动嵌入）
contextBridge.exposeInMainWorld('godotRenderer', {
  start: () => ipcRenderer.invoke('godot-renderer:start'),
  stop: () => ipcRenderer.invoke('godot-renderer:stop'),
  status: () => ipcRenderer.invoke('godot-renderer:status'),
  embed: () => ipcRenderer.invoke('godot-renderer:embed'),
});

// 窗口控制接口（主窗口自定义标题栏按钮用）
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  // [v12] 查询窗口是否最大化（用于按钮图标切换）
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  // [v12] 监听最大化状态变化（用于按钮图标实时更新）
  onMaximizeChange: (callback) => {
    const handler = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window:maximize-changed', handler);
    return () => ipcRenderer.removeListener('window:maximize-changed', handler);
  },
});

// [v79 预览页伴侣面板] 截屏桥：页面内按钮触发主进程 desktopCapturer（开关在页面 localStorage，主进程不设限）
contextBridge.exposeInMainWorld('companionScreenShot', () => ipcRenderer.invoke('companion-console:screenshot'));

// [v105/v107] Edge Web Speech 桥：无感启动 + 统一 control（静音/启用）
// [v113] 启动本机应用
contextBridge.exposeInMainWorld('clearChatHistory', () => ipcRenderer.invoke('history:clear'));
contextBridge.exposeInMainWorld('mediaControl', (opts) => ipcRenderer.invoke('media:play', opts));

contextBridge.exposeInMainWorld('launchApp', (target) => ipcRenderer.invoke('app:launch', target));

contextBridge.exposeInMainWorld('speechBridge', {
  start: (lang) => ipcRenderer.invoke('speech-bridge:start', { lang: lang || 'zh-CN' }),
  stop: () => ipcRenderer.invoke('speech-bridge:stop'),
  setControl: (patch) => ipcRenderer.invoke('speech-bridge:set-control', patch),
  getControl: () => ipcRenderer.invoke('speech-bridge:get-control'),
});

// [2026-09-18 方案B] AI 总站双窗同步：渲染进程发事件 → 主进程扇出到全部窗口
contextBridge.exposeInMainWorld('aiHub', {
  emit: (evt) => { try { ipcRenderer.send('ai-hub:event', evt); } catch { /* noop */ } },
  onEvent: (callback) => {
    const handler = (_event, payload) => { try { callback(payload); } catch { /* noop */ } };
    ipcRenderer.on('ai-hub:event', handler);
    return () => ipcRenderer.removeListener('ai-hub:event', handler);
  },
});

// [v118] 通用 GUI Agent（看屏→规划→执行）
contextBridge.exposeInMainWorld('guiAgent', {
  run: (goal) => ipcRenderer.invoke('gui-agent:run', goal),
  discover: (q) => ipcRenderer.invoke('gui-agent:discover', q),
});

// [v136/v137] DeepSeek Harness 专区桥（软件内嵌，不跳浏览器）
contextBridge.exposeInMainWorld('dshHarness', {
  start: (modelCfg) => ipcRenderer.invoke('dsh-harness:start', modelCfg),
  stop: () => ipcRenderer.invoke('dsh-harness:stop'),
  status: () => ipcRenderer.invoke('dsh-harness:status'),
  resolveUrl: () => ipcRenderer.invoke('dsh-harness:resolve-url'),
  applyModel: (modelCfg) => ipcRenderer.invoke('dsh-harness:apply-model', modelCfg),
  // [v153] API 列表共享（DSH 生效 / 软件存储）
  providersSync: (payload) => ipcRenderer.invoke('dsh-harness:providers-sync', payload),
  providersGet: () => ipcRenderer.invoke('dsh-harness:providers-get'),
  providersDelete: (id) => ipcRenderer.invoke('dsh-harness:providers-delete', id),
  providersSetActive: (id) => ipcRenderer.invoke('dsh-harness:providers-set-active', id),
  // [v173] 删除会话（DSH 工作区会话菜单「删除」）：物理清掉该会话落盘数据
  purgeSession: (sessionId) => ipcRenderer.invoke('dsh-harness:purge-session', sessionId),
  // [v175] DSH 常驻服务开关（通用设置）：get 读偏好；set(false) = 软件退出时 DSH 一并退出
  residentGet: () => ipcRenderer.invoke('dsh-harness:resident-get'),
  residentSet: (enabled) => ipcRenderer.invoke('dsh-harness:resident-set', !!enabled),
});

// [v147] 语音服务总开关（开则起 TTS+识别，关则杀进程）
contextBridge.exposeInMainWorld('voiceService', {
  get: () => ipcRenderer.invoke('voice-service:get'),
  set: (enabled) => ipcRenderer.invoke('voice-service:set', !!enabled),
});

// [v88 三线统一 + v119 补 load] 默认模型目录
contextBridge.exposeInMainWorld('defaultModel', {
  setDir: (dir) => ipcRenderer.invoke('desktop-pet:set-default-dir', dir),
  getDir: () => ipcRenderer.invoke('desktop-pet:get-default-dir'),
  load: () => ipcRenderer.invoke('desktop-pet:load-default'),
});

// [2026-10-01 3D场景] 布局读写 / 资产落盘 / 控制台直达编辑模式
contextBridge.exposeInMainWorld('scene3d', {
  getLayout: () => ipcRenderer.invoke('scene3d:get-layout'),
  setLayout: (json) => ipcRenderer.invoke('scene3d:set-layout', json),
  saveAsset: (relPath, data) => ipcRenderer.invoke('scene3d:save-asset', relPath, data),
  enter: () => ipcRenderer.invoke('scene3d:enter'),
});

// [2026-10-01 小脑] 闲置陪伴播报：主进程心跳 → 后端决定台词 → 此桥送到页面走既有 TTS
contextBridge.exposeInMainWorld('companionSpeech', {
  onSpeak: (cb) => { const h = (_e, line) => cb(line); ipcRenderer.on('companion:speak', h); return () => ipcRenderer.removeListener('companion:speak', h); },
});

// [v185] DSH 语言桥：顶层暴露（此前误嵌 wallpaperMode 内部导致 window.dshLocale 不可达 → 语言不同步）
contextBridge.exposeInMainWorld('dshLocale', {
  sync: (lang) => ipcRenderer.invoke('dsh-locale:sync', lang),
  onChanged: (cb) => { const h = (_e, lang) => cb(lang); ipcRenderer.on('dsh-locale-changed', h); return () => ipcRenderer.removeListener('dsh-locale-changed', h); },
});
