# THIRD_PARTY.md — 第三方组件标注与致谢 / Third-party Notices & Attribution

> 本文件中英合用（每条：中文在前，English follows）。

---

## 1. DeepSeek Harness（DSH）★ 必读标注

**中文**：本项目集成了 **DeepSeek Harness（DSH）**（DeepSeek 出品的 AI 工作台/自动化运行时）作为"大脑"工作台：`/chat` 页内嵌 DSH Web（:5190），经 `frontend/dsh-bridge/dshHarness.js` 桥接启动、保活与配置同步；自动化能力经 pet-mcp / playwright-mcp 接入。**DeepSeek Harness 的著作权、商标及相关权利归 DeepSeek 所有。** 本项目不包含、也不重新分发 DSH 的源码或发行物（运行时随本机安装部署）；仅做了**本地适配补丁**（例如：问题第三方插件摘除、`cordis.patch.yml` 指向应用侧 `dsh-mcp`、providers 同步守卫），这些补丁仅在本机生效。

**English**: This project integrates **DeepSeek Harness (DSH)** (an AI workbench/automation runtime by DeepSeek) as the "brain" workbench: DSH Web is embedded in `/chat` (:5190), started/kept-alive/synced via `frontend/dsh-bridge/dshHarness.js`, with automation exposed through pet-mcp / playwright-mcp. **All rights, titles and trademarks in DeepSeek Harness belong to DeepSeek.** This repository neither includes nor redistributes DSH source or artifacts (the runtime is deployed locally); only **local adaptation patches** are applied (e.g., removal of a broken third-party plugin, `cordis.patch.yml` pointing to app-side `dsh-mcp`, providers sync guards), effective locally only.

---

## 2. 开源依赖 / Open-source dependencies（以各项目官方 License 为准）

| 组件 / Component | 用途 / Role | License |
|---|---|---|
| Electron | 桌面壳 / desktop shell | MIT |
| React + TypeScript + Vite | 前端框架与构建 / frontend & build | MIT |
| Material-UI (@mui/material, @mui/icons-material) | UI 组件 / UI kit | MIT |
| Babylon.js (@babylonjs/core, @babylonjs/gui, @babylonjs/materials, @babylonjs/loaders) | 3D 渲染 / rendering | Apache-2.0 |
| babylon-mmd + mmd-parser | PMX/PMD 加载与 MMD 动画 / MMD model & motion support | MIT |
| three | 备用 3D 库（工具链）/ auxiliary 3D library | MIT |
| Express | 后端 API / backend API | MIT |
| Playwright（mcp-playwright 独立组件） | 自动化/检索 / automation & search | Apache-2.0 |
| Godot Engine 4.7.2（可选第二渲染端，`渲染链路/godot-renderer`） | 备选渲染 / optional renderer | MIT（Godot 引擎本体） |

> 以上为集成说明，不代表各项目官方背书。各依赖以其仓库声明的 License 为准。
> The table is informational; each dependency is governed by the license declared in its own repository.

---

## 3. 素材版权提示 / Asset copyright notes ★ 上传 GitHub 前必读

**中文**：以下素材为第三方版权物，**不得**随仓库公开上传，`.gitignore` 已排除：
- **PMX/PMD 模型文件**（如 琳奈.pmx、知更鸟·晴歌.pmx 等）及其贴图 —— 归模型作者所有；
- **原始 VMD 动作文件**（动作库来源，如 刘TWT、芝麻凛 等配布物）—— 归动作作者所有；
- **MMD 标准 toon 贴图**（`frontend/public/mmd/toon*.bmp`）—— 来源于 MMD 生态，谨慎处理；
- `pet-tmp/`、`.electron-userdata/` 运行时缓存与用户数据。

**English**: The following are third-party copyrighted assets and **must not** be published with the repository (already excluded via `.gitignore`): PMX/PMD model files and their textures (e.g., 琳奈.pmx); original VMD motion files (distribution items by their authors); MMD standard toon textures (`frontend/public/mmd/toon*.bmp`); runtime caches and user data (`pet-tmp/`, `.electron-userdata/`).

**可公开（自制）/ Safe to publish (self-authored)**：`frontend/public/vmd/*.motion.json`（ruanlinyun-vmd-asset-v1 自制动作资产：wave 系列、dance_xyz 等）及生成器脚本；`frontend/public/scene3d/*.glb`（Blender 自制演示件：立方体+苏珊猴）；全部源代码。

---

## 4. 字体 / Fonts

DSH Web 前端自带 KaTeX 字体（随 DSH 发行物本地部署，见第 1 节标注）；KaTeX 字体遵循其上游许可（SIL OFL/项目声明）。本项目源码未附带其他第三方字体文件。
