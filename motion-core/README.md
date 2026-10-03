# motion-core · 动作协议层（V3 协议的可运行实现）

> 对应 LW《设计稿V3-整理修订版.txt》第三部分「数据与协议设计」。
> 状态：**协议契约已完整实现并通过 7/7 端到端测试**；求解器本体是 Phase 2 任务（挂点已留）。

## 文件
- `motion-hub.js` — 零依赖独立枢纽（Node 内置模块即可跑），当前可直接运行验证/演示/联调
- `test_motion.py` — 7 用例端到端测试（原语库/受理/最新指令优先/回归idle/未注册拒绝/越界拒绝+明细/脚本预检拦截）

## 启动与测试
```bash
node C:\RUANLINYUN\motion-core\motion-hub.js 9877     # 启动（端口可换）
python C:\RUANLINYUN\motion-core\test_motion.py       # 跑 7 个用例
```

## 协议端点（motion_protocol_v1）
| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /api/motion/primitives | 原语库+参数模板（min/max/default）——AI 提示词固定上下文来源 |
| POST | /api/motion/request | 提交模式A(param)/模式B(script)；返回 ACCEPTED 或结构化拒绝 |
| GET | /api/motion/state | 状态机状态 idle↔solving |
| POST | /api/motion/interrupt | 打断（自然收敛回 idle，200ms 级过渡语义） |
| GET | /api/motion/events | SSE 事件流：motion_verify / motion_state / motion_complete / motion_error |

## 与设计稿的对应（按实际情况做的取舍）
- ✅ 模式A 调参数：白名单 10 原语 + 参数模板解析默认值 + 越界拒绝附违规明细
- ✅ 两级校验之「前置参数级校验」（就地拒绝，返回原因）；「结果级复核」挂点留给求解器接入时
- ✅ 状态机简化为 idle↔solving；interrupt=收敛回 idle；并发请求→最新指令优先（replaced 标记）
- ✅ 原语 v1 十个与现有预设一一对应（idle/wave/nod/shake/turnHead/turnBody/squat/stretch/block/jump）
- ⏳ 模式B 脚本：当前只做整脚本前置校验并返回 SCRIPT_ACCEPTED_DEFERRED（顺序执行器属 Phase 4）
- ⏳ solvePrimitive() 为占位（按时长模拟 solving）；Phase 2 接正弦/弹簧求解器 → 下发 jointControl 低层队列
- ❌ 未照搬设计稿的部分：SQLite（不引入，后续用现有 MongoDB）、全 WebSocket 心跳重连（本地单机 SSE 足够）、自定义12项配置（先硬编码）

## 已内置源码版（下次后端构建自动生效）
`_待删除\原项目-ruanlinyun-assistant\backend\src\routes\motion.ts`（同一契约的 TS 版），
已在 `routes/index.ts` 注册 `/api/motion`（备份 index.ts.bak_20260827-motion）。
kks 打包版需重新 tsc 构建后端才生效——在那之前可用本 hub 先行联调前端/AI。

## 运行现状（2026-08-27）
hub 正在 127.0.0.1:9877 运行中；停止：结束对应 node 进程即可。