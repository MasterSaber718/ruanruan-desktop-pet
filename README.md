# 阮阮桌面宠物（RuanRuan Desktop Pet）

> Windows 桌面 AI 伴侣 · Electron + Babylon.js 渲染 + **DeepSeek Harness** 工作台 + motion-core 小脑动作系统
> 本仓库为**源码真源**；运行版以桌面 KKS 安装目录为准（`resources/app` 热更新式部署）。
> 曾用名：阮云小宠 / 阮琳云 AI 桌宠（RuanYun Desktop Pet）。

## 这是什么

一只住在桌面上的 AI 伴侣：

- **3D 角色**：Babylon.js 渲染 PMX 模型，自带生命感层（呼吸/眨眼/视线跟随/随机小动作）与动作系统（标准配方 + VMD 片段 + 动作库，骨骼生理极限守卫 + 碰撞回滚）。
- **3D 场景编辑**（2026-10 新增）：多模型导入（PMX/GLB/glTF/OBJ）、拖拽摆放（左键平面/右键纵深）、XYZ 缩放旋转、骨骼关节调整、背景更换；布局可选生效范围（预览/壁纸/两者）并持久化。
- **大脑**：集成 **DeepSeek Harness（DSH）** 作为工作台与自动化运行时（`/chat` 页内嵌 DSH Web，:5190）；对话经后端 `runBrain`（DSH CLI → 云端 API → 兜底）统一路由，模型配置以 DSH 的 `providers.json` 为唯一权威。
- **小脑**：`motion-core/motion-hub`（:9877）动作协议层——原语库、参数校验、生理极限 softGate、配方编排；动作经 :27865 指令队列下发、主进程 1s 轮询广播到各窗口。
- **陪伴**：闲置互动调度（30s 心跳、动作不重复轮回、AI 现编动作、每小时伸懒腰+台词，通话中顺延/夜间静音）。
- **桌面形态**：桌宠小窗、壁纸模式（WorkerW 挂桌面图标层）、壁纸悬浮球控制台；语音通话（STT/TTS 经 Edge speech-bridge）。

## 架构

完整拓扑图与链路说明：**中文 [docs/ARCHITECTURE_zh.md](docs/ARCHITECTURE_zh.md)（含 [拓扑图](docs/architecture_zh.svg)）** · English [docs/ARCHITECTURE_en.md](docs/ARCHITECTURE_en.md)（[topology diagram](docs/architecture_en.svg)）。

一图流：用户 → Electron 窗口层（主窗口/桌宠/壁纸/控制台）→ 渲染引擎（Babylon 现役，Godot 4.7.2 可选第二后端）→ 主进程 `electron-main.js`（静态服务 :5175 / 指令轮询 / 心跳 / DSH 桥）→ 后端 Express :27865（`/ai/hub`、`/companion`、`/joint-control`…）→ 小脑 motion-hub :9877 → 大脑 DeepSeek Harness :5190（云端 LLM / 本地千问可选）。

## 目录

```
├─ frontend/            # Electron + React 前端（BabylonModelViewer、页面、服务）
│  ├─ electron-main.js  # 主进程（窗口/进程编排/轮询/心跳/DSH 桥/scene3d IPC）
│  ├─ preload.js        # contextBridge 桥
│  ├─ src/              # 渲染层源码（pages/components/services/ai/motion…）
│  └─ public/           # vmd 动作库、console.html、scene3d 资产
├─ backend/             # Express API（aiHub/companion/jointControl/motion/…）
├─ motion-core/         # 小脑：motion-hub(:9877)/vmd-pipeline/调参 viewer/动作资产生成器
└─ docs/                # 架构文档（中/英）+ 拓扑图（中/英 SVG）+ AI 协作说明
```

> DSH 运行时为本地随行组件（第三方，不入库）；其桥接源码在 `frontend/dsh-bridge/`。

## 运行与开发

- 前端构建：`cd frontend && npm install && npm run build`（tsc + vite，产物 `frontend/dist`）
- 后端构建：`cd backend && npm install && npm run build`（tsc，产物 `backend/dist`）
- 运行版部署约定：构建产物 + `electron-main.js`/`preload.js` 同步到 KKS 安装目录 `resources/app/`（热更新式，重启即新版本）。
- 运行时端口：`5175` UI 静态 · `27865` 后端 · `9877` motion-hub · `5190` DSH · `9880` Godot（可选）· `5181` gui-agent · `5180` browser-search。

## 标注与致谢（DeepSeek Harness 等）

- 本项目**集成**了 **DeepSeek Harness（DSH）** 作为工作台/自动化运行时：经 `frontend/dsh-bridge/dshHarness.js` 桥接启动与保活，工作区位于应用目录 `dsh-workspace`（`providers.json` 为 API 配置唯一权威）。**DSH 版权与商标归 DeepSeek 所有**；本项目仅做集成与本地适配补丁（详见 [docs/THIRD_PARTY.md](docs/THIRD_PARTY.md)），不包含也未重新分发 DSH 源码。
- 第三方组件与素材清单（含 PMX 模型素材的版权提示）：[docs/THIRD_PARTY.md](docs/THIRD_PARTY.md)。

## 给 AI 协作者

如果你是 AI 代理：请先读 **[docs/AGENTS.md](docs/AGENTS.md)**（English）/ [docs/AGENTS_zh.md](docs/AGENTS_zh.md)（中文）——工作流红线（改前备份、证据链、只走合法通道、集中管理等）都在里面。

---

*历史版本说明：本 README 曾为早期模板（描述了 MongoDB/Redis/Claude 等未实际采用的技术栈），旧副本见 `README.md.bak_20261001`。*
