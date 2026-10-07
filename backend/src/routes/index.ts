import express from 'express';
import screenRouter from './screen';
import deviceRouter from './device';
import aiRouter from './ai';
import aiProxyRouter from './aiProxy';
import networkRouter from './network';
import systemRouter from './system';
// [2026-10-02] /update 路由已移除：MongoDB 更新体系从未启用（桌面端走 KKS 替换式更新）
import modelRouter from './model';
import optimizationRouter from './optimization';
import securityRouter from './security';
import agentRouter from './agent';
import jointControlRouter from './jointControl';
// [2026-08-27 V3协议层] 动作协议路由
import motionRouter from './motion';
import aiHubRouter from './aiHub';
// [2026-09-20 陪伴调度] 闲置小动作/小时计时/生成动作存储/跳舞轮换
import companionRouter from './companion';

const router = express.Router();

// 感知区路由
router.use('/screen', screenRouter);

// 设备控制路由
router.use('/device', deviceRouter);

// AI路由（本地对话）
router.use('/ai', aiRouter);

// AI代理路由（前端→后端→DeepSeek）
router.use('/ai', aiProxyRouter);

// [方案B] AI 总站：单次 LLM + 动作派发 + 历史
router.use('/ai/hub', aiHubRouter);

// [2026-09-20 陪伴调度] 陪伴路由：idle-tick / dance-hint / dance-did / generated / state
router.use('/companion', companionRouter);

// 网络信息路由（IP、主机名等）
router.use('/network', networkRouter);

// 系统信息路由：时间/时区/地区、CPU/内存/磁盘使用率、开机时间、屏幕信息、IP归属地
router.use('/system', systemRouter);

// [2026-10-02] /update 路由已移除（MongoDB 更新体系从未启用）

// 模型路由
router.use('/model', modelRouter);

// 词汇库路由

// 系统优化路由
router.use('/optimization', optimizationRouter);

// 网络安全路由
router.use('/security', securityRouter);

// [2026-08-27 V3协议层] 动作协议：原语+参数模板+两级校验+状态机+SSE
router.use('/motion', motionRouter);

// Agent能力路由（双手和眼睛系统）
router.use('/agent', agentRouter);

// 关节控制路由（AI 接入预留接口，用于控制 3D 模型骨骼关节旋转）
router.use('/joint-control', jointControlRouter);

// 微信机器人路由（ClawBot / iLink 协议，默认未启动，需用户手动启动）

// 根路由
router.get('/', (req, res) => {
  res.json({ message: '阮琳云智能助手API' });
});

export default router;