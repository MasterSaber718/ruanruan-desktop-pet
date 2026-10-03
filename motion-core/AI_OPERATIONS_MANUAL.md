# AI 动作控制操作手册 v2（2026-09-10 全量重写）

> **定位**：小脑体系说明 + 调试手册，给开发/调试 AI 看。
> **聊天 AI 的实际提示词不在本文件**——运行时注入的 `MOTION_PROTOCOL` 在 `HomePage.tsx`（要改提示词行为去那里）。
> **骨骼知识唯一来源 = `motion-core/KINEMATICS.md`**（轴向/ROM/帧分支符号基准），本手册不再重复。

---

## §1 通道拓扑（谁走哪条路）

```
聊天 AI（qwen/云端）
  → HomePage parseAndDispatchMotion（MOTION 标签+裸 JSON 兜底）
  → 或 listenerMood.ts（聊天情绪自动反馈，前端确定性规则，不走 AI）
  → POST 27865 /api/v1/joint-control/pet-action {actionId, params}
  → 队列（先来后到≤2）→ 主进程 1s 轮询扇出 → 各窗 BabylonModelViewer 执行

外部工具/编排
  → motion-hub 9877（param / script / recipe 三种模式）→ 映射回 27865 队列
  → MCP 桥 渲染链路\pet-mcp\server.js（pet_action / pet_motion / pet_recipe / pet_list_actions / pet_status）
```

**27865 是唯一执行入口**，hub/MCP 都映射到它；渲染端执行的权威日志=各窗 `[AnimSystem]`（落盘 `kks\resources\app\.electron-userdata\app-debug.log`，UTC 时间戳，grep 要 `-a`）。

## §2 动作资产现状（2026-09-10）

- **原语 31**：wave nod shake block turnHead turnBody squat stretch turnLeft turnRight jump reset spin limbRaise ｜ tiltHead bow clap spreadHands thumbsUp comeHere refuse standUp bendForward lookUp lookDown legKick point ｜ offerHand bounce stomp cheer approach
- **配方 10**（`motion-core\recipes.json`）：greet shyGreet celebrate comfort deny think sleepy excited invite tantrum（tantrum 依赖 morph 暂不可执行）
- **参数 schema 权威 = `GET http://127.0.0.1:9877/api/motion/primitives`**（动态查询，不要信任何静态文档列表）
- wave 默认 6 秒自动停（持续挥手 AI 需显式传 duration）

## §3 槽位体系（v77 Blender 式约束层，2026-09-09 起）

- 20 规范槽位：head/neck/chest/spineUpper/spineLower ｜ shoulderL/R upperArmL/R lowerArmL/R handL/R ｜ upperLegL/R lowerLegL/R footL/R
- 模型骨经 `humanBody` 解析（buildHumanBodyV2）贴骨到槽位；动作帧识别**以槽位为准**（role 词拼入匹配串），模型骨骼命名不再影响动作
- **贴骨正确性检查**：模型加载后日志 `[RigMap] 贴骨 X/19`（✗ 缺槽位=相关动作自动退化）
- **腿骨铁律**：驱动任何腿骨必须 `addActionBoneWithD`（本模型腿/鞋网格绑 D 系骨骼，只转标准链=外观不动+物理骨被扯）；帧分支顺序=膝→踝→大腿（大腿含'足'放最后防吞'足首'）

## §4 安全体系

- 数值权威：`motion-core/joint_limits.json`（角度极限+舒适/爆发两档角速度）
- 渲染端硬门：帧循环限速（超速→时间轴拉伸不拒绝）；hub 软分 softGate（只 warning 随 ACCEPTED 回传）
- 心智铁律：**日志全绿 ≠ 视觉正确**——动作验收只认肉眼（子骨骼世界坐标 delta）

## §5 调试入口

| 看什么 | 去哪 |
|---|---|
| 动作实时状态/事件流 | `http://127.0.0.1:9877/console`（观测台） |
| hub 软分历史 | `GET 9877/api/motion/history` |
| 窗口执行回传结果 | `GET 27865/api/v1/joint-control/results?limit=20` |
| 渲染端触发日志 | app-debug.log grep `[AnimSystem]`（骨骼数=注册是否齐全的快指标） |
| 全量动作验收 | `bash Scripts/verify_actions.sh`（依次触发 31 动作+配方） |
| 一键部署 | `bash Scripts/deploy_frontend.sh`（备份→build→同步→hub 三处） |

## §6 历史版本

v1（2026-09-06）已作废：rotate/seq 唯一入口、T-pose 基准、"右足D 大腿"等描述均与现状不符。历史原文见备份库。
