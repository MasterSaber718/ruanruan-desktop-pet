# AGENTS_zh.md — AI 协作者工作规则（中文版）

> English: [AGENTS.md](AGENTS.md) · 架构：[ARCHITECTURE_zh.md](ARCHITECTURE_zh.md)
> 以下为项目所有者的长期定案，违反 = 返工。

## 红线（永远有效）

1. **禁止"能跑就行"的代码。** 动手前想清楚数据流、边界条件、失败路径。
2. **改前备份。** 任何被修改的文件先留同名 `.bak_<yyyymmdd>`。
3. **证据链。** 修复前先复现/观察、收集带时间戳的日志、确认因果；修后再验证，只写一份报告（新替旧）。
4. **只走合法通道。** 与动作系统交互只走：`27865 /joint-control|/pet-action` → `motion-hub 9877` → 渲染端 `__petAction` / `__playStdMotion` / `__playVmdClip`。禁止在资产文件之外手写骨骼四元数；禁止绕过 `providers.json` 配置 API。
5. **锁定区——不准删。** `flags`/`companionFlagsV2` 状态、渲染端生命感层（呼吸/眨眼/视线/微动作）、旧退出确认弹窗代码，均为所有者锁定区。只复用，不删除。
6. **集中管理。** 闲置陪伴节奏只存在于 `backend/src/routes/companion.ts`；主进程只是哑心跳+播报终端。不准另立竞争计时器。
7. **动作资产必须自带极限校验。** vmdClip 驱动是直写四元数（不过 safeRotateJoint 守卫），你写的任何生成器必须在落盘前按 KINEMATICS 极限校验（肘 |Z| ≤ 0.40、膝只 X− 等）——参考 `motion-core/tools/make_dance_xyz.py`。
8. **部署 = 源码 → 构建 → 同步 KKS 安装目录**（`resources/app`）。禁止手改构建产物；禁止自造版本号（版本归打包管）。
9. **不动 DSH 内部。** DSH © DeepSeek——只经 `dsh-bridge/dshHarness.js` 集成；本地适配补丁必须记录在 `docs/THIRD_PARTY.md`。
10. **报告与交付物一律单文件 HTML 网页**，滚动只保留两份（新的+上一份）。

## 快速锚点

- 端口与链路：[ARCHITECTURE_zh.md](ARCHITECTURE_zh.md) §2–3。
- API 配置权威：`dsh-workspace/providers.json`（active 生效）。
- 动作资产格式：`ruanlinyun-vmd-asset-v1`（见 `frontend/public/vmd/*.motion.json`）；cat→骨骼映射在 `frontend/src/motion/vmdClipPlayer.ts`。
- 3D 场景编辑层：`window.__scene3d`（`frontend/src/components/BabylonModelViewer.tsx`）；资产在 `frontend/public/scene3d/`。
- 闲置调度：`backend/src/routes/companion.ts`（v1.1）+ 主进程心跳（`frontend/electron-main.js` 的 `startCompanionTicker`）。
- 指令队列：`backend/src/routes/jointControl.ts`（`/pet-action` 是合法外部触发入口）。
