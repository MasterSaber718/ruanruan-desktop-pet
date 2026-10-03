// ============================================================================

// Joint Control Router - 关节控制路由（AI 接入预留接口）

// ============================================================================

//

// 【接口用途】

// 本接口是未来留给 AI 接入用于控制 3D 模型骨骼关节旋转的预留接口。

//

// 【设计原则】

// 1. 只允许关节旋转，绝对禁止 X/Y/Z 轴位置移动（与前端 safeRotateJoint 一致）

// 2. 所有旋转操作必须通过前端暴露的 window.__jointControl 接口执行

// 3. 本路由仅作为 AI → 后端 → 前端的中转通道，不直接操作骨骼

// 4. 后端无法直接访问浏览器中的 Babylon.js 实例，必须通过 WebSocket 或

//    轮询机制将指令推送到前端执行

//

// 【当前实现状态】

// - 后端路由：已建立（本文件）

// - 前端 WebSocket 客户端：待实现

// - 前端 window.__jointControl 执行端：已实现（BabylonModelViewer.tsx）

//

// 【AI 接入方式】

// 其他编程 AI 可通过两种方式控制关节：

//   方式1（推荐）：调用本路由的 REST API，由后端推送到前端执行

//     POST /api/joint-control/rotate

//     POST /api/joint-control/reset

//     GET  /api/joint-control/joints

//

//   方式2（直接）：AI 生成 JavaScript 代码，前端直接调用 window.__jointControl

//     window.__jointControl.rotate('頭', 0, 0.5, 0)

//     window.__jointControl.reset('頭')

//

// 【安全机制】

// - 关节白名单：只有头/颈/脊椎/肩/肘/腕/指/髋/膝/踝/趾等关节可旋转

// - 位置锁死：根骨骼/IK/辅助骨骼绝对静止

// - 生理极限：超出角度会被拒绝（防止头转到背后等非自然姿态）

// - 所有操作有日志记录，便于审计

//

// ============================================================================



import express from 'express';



const router = express.Router();



// ============================================================================

// 指令队列（后端 → 前端 的指令中转）

// ============================================================================

// 前端通过 GET /api/joint-control/pending 拉取待执行指令

// 执行完毕后通过 POST /api/joint-control/result 回传结果

// ============================================================================



interface JointCommand {

  id: string;              // 指令唯一 ID

  action: 'rotate' | 'reset' | 'resetAll' | 'list' | 'limit' | 'status' | 'find' | 'petAction';  // 操作类型

  boneName?: string;       // 骨骼名（rotate/reset/limit 时必填）

  rotation?: { x: number; y: number; z: number };  // 旋转弧度（rotate 时必填）

  keyword?: string;        // 查找关键词（find 时必填）
actionId?: string;       // 动作 ID（petAction 时必填，wave/nod/shake/block/turnHead/turnBody）
  params?: any;            // [2026-09-08] petAction 参数（spin/limbRaise 语义原语透传）

  source: string;          // 指令来源（用于审计）

  timestamp: number;       // 创建时间戳

  ttl: number;             // 过期时间（毫秒），过期自动清除

}



interface CommandResult {

  id: string;              // 对应指令 ID

  success: boolean;        // 执行是否成功

  error?: string;          // 失败原因

  data?: any;              // 返回数据（list/limit 时）

  executedAt: number;      // 执行时间

}



// 指令队列与结果存储（内存中，进程重启后清空）

const commandQueue: JointCommand[] = [];

const resultStore: Map<string, CommandResult> = new Map();



// 生成唯一 ID

const generateId = (): string => {

  return `jc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

};



// 清理过期指令

const cleanExpired = (): void => {

  const now = Date.now();

  for (let i = commandQueue.length - 1; i >= 0; i--) {

    if (now - commandQueue[i].timestamp > commandQueue[i].ttl) {

      console.warn(`[JointControl] 指令过期清除: ${commandQueue[i].id} (${commandQueue[i].action})`);

      commandQueue.splice(i, 1);

    }

  }

};



// ============================================================================

// REST API 路由

// ============================================================================



/**

 * GET /api/joint-control/health

 * 健康检查

 */

/**
 * [v57] 执行记录查询（指令协调层可追踪）：返回最近 N 条执行结果
 * GET /api/joint-control/results?limit=20
 */
router.get('/results', (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const entries = Array.from(resultStore.entries()).slice(-limit).map(([, r]) => ({ ...r }));
    res.json({ success: true, count: entries.length, results: entries });
  } catch (err) {
    console.error('[JointControl] results 接口异常:', err);
    res.status(500).json({ success: false, error: '内部错误' });
  }
});

router.get('/health', (req, res) => {

  res.json({

    success: true,

    message: '关节控制接口正常运行',

    version: '1.0.0',

    pendingCommands: commandQueue.length,

    completedResults: resultStore.size,

  });

});



/**

 * GET /api/joint-control/joints

 * 获取关节列表（占位接口，实际数据需从前端拉取）

 * 真实关节列表由前端 window.__jointControl.list() 返回

 */

router.get('/joints', (req, res) => {

  res.json({

    success: true,

    message: '关节列表需通过前端 window.__jointControl.list() 获取',

    jointKeywords: [

      '頭', '首', 'neck', 'head',

      '上半身', '下半身', '胸', '腰', 'spine', 'chest', 'waist',

      '肩', 'shoulder', 'collar', 'clavicle',

      '腕', '上腕', '下腕', '肘', 'ひじ', 'arm', 'elbow', 'wrist', '手首',

      '指', 'finger', 'thumb', 'hand',

      '足', '脚', 'leg', 'hip', 'pelvis',

      '膝', 'knee', '足首', 'ankle', '足指', 'toe',

    ],

    lockedKeywords: [

      '全ての親', '操作中心', 'センター', 'グルーブ',

      'root', 'center', 'groove', 'IK', 'dummy', 'view',

    ],

    note: '调用 POST /api/joint-control/list 获取前端实际关节列表',

  });

});



/**

 * POST /api/joint-control/rotate

 * 旋转指定关节

 *

 * 请求体：

 *   boneName: string        - 骨骼名（如 "頭"、"左腕"）

 *   x: number               - X 轴旋转弧度（点头方向）

 *   y: number               - Y 轴旋转弧度（摇头方向）

 *   z: number               - Z 轴旋转弧度（侧倾方向）

 *   source?: string         - 指令来源（默认 'api'）

 *

 * 返回：

 *   commandId: string       - 指令 ID（用于查询执行结果）

 *   message: string         - 提示信息

 *

 * 注意：本接口只是把指令加入队列，实际执行由前端拉取后调用 window.__jointControl.rotate()

 *      调用方需轮询 GET /api/joint-control/result/:commandId 获取执行结果

 */

router.post('/rotate', (req, res) => {

  try {

    const { boneName, x = 0, y = 0, z = 0, source = 'api' } = req.body;



    if (!boneName || typeof boneName !== 'string') {

      return res.status(400).json({

        success: false,

        error: '缺少 boneName 参数或类型错误',

      });

    }



    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {

      return res.status(400).json({

        success: false,

        error: 'x/y/z 必须是数字（弧度）',

      });

    }



    // 生理极限粗校验（防止 AI 传入离谱值）

    const MAX_ANGLE = Math.PI * 2;

    if (Math.abs(x) > MAX_ANGLE || Math.abs(y) > MAX_ANGLE || Math.abs(z) > MAX_ANGLE) {

      return res.status(400).json({

        success: false,

        error: `旋转角度超出绝对上限 (±${MAX_ANGLE} 弧度 = ±360°)`,

      });

    }



    cleanExpired();



    const command: JointCommand = {

      id: generateId(),

      action: 'rotate',

      boneName,

      rotation: { x, y, z },

      source,

      timestamp: Date.now(),

      ttl: 30000,  // 30 秒过期

    };



    commandQueue.push(command);



    console.log(`[JointControl] 入队旋转指令: ${command.id} 骨骼="${boneName}" 旋转=(x:${x},y:${y},z:${z}) 来源=${source}`);



    res.json({

      success: true,

      commandId: command.id,

      message: '指令已入队，等待前端执行。请通过 GET /api/joint-control/result/:commandId 查询结果',

    });

  } catch (err) {

    console.error('[JointControl] rotate 接口异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误: ' + (err instanceof Error ? err.message : String(err)),

    });

  }

});



/**

 * [动捕 v3 2026-09-12] POST /api/joint-control/rotate-batch

 * 原子批量旋转：一次入队全部骨骼（动捕帧流专用），运行版 backend-dist 已同步

 * 请求体：{ rotations: [{ boneName, x, y, z }], source? }，上限 32 条/帧，ttl 5s

 */

router.post('/rotate-batch', (req, res) => {

  try {

    const rotations = Array.isArray(req.body && req.body.rotations) ? req.body.rotations : [];

    if (!rotations.length) {

      return res.status(400).json({ success: false, error: 'rotations 为空' });

    }

    if (rotations.length > 32) {

      return res.status(400).json({ success: false, error: '单帧最多 32 条旋转' });

    }

    const MAX_ANGLE = Math.PI * 2;

    const valid: Array<{ boneName: string; x: number; y: number; z: number }> = [];

    for (const r of rotations) {

      const { boneName, x = 0, y = 0, z = 0 } = r || {};

      if (!boneName || typeof boneName !== 'string') {

        return res.status(400).json({ success: false, error: '存在缺少 boneName 的条目' });

      }

      if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {

        return res.status(400).json({ success: false, error: `骨骼 "${boneName}" 的 x/y/z 必须是数字` });

      }

      if (Math.abs(x) > MAX_ANGLE || Math.abs(y) > MAX_ANGLE || Math.abs(z) > MAX_ANGLE) {

        return res.status(400).json({ success: false, error: `骨骼 "${boneName}" 角度超限` });

      }

      valid.push({ boneName, x, y, z });

    }

    cleanExpired();

    // [动捕 v3 修复] 优先取条目自带 source（dongbu），否则顶层，否则 api

    const itemSource = rotations.find((r: { source?: string } | undefined) => r && r.source) as { source?: string } | undefined;

    const source = (itemSource && itemSource.source) || (req.body && req.body.source) || 'api';

    const ids: string[] = [];

    for (const v of valid) {

      const command = {

        id: generateId(),

        action: 'rotate' as const,

        boneName: v.boneName,

        rotation: { x: v.x, y: v.y, z: v.z },

        source,

        timestamp: Date.now(),

        ttl: 5000,

      };

      commandQueue.push(command);

      ids.push(command.id);

    }

    res.json({ success: true, count: ids.length, ids });

  } catch (err) {

    console.error('[JointControl] rotate-batch 接口异常:', err);

    res.status(500).json({ success: false, error: '内部错误' });

  }

});



/**

 * POST /api/joint-control/reset

 * 重置指定关节旋转（恢复 bind pose）

 *

 * 请求体：

 *   boneName: string        - 骨骼名

 *   source?: string         - 指令来源

 */

router.post('/reset', (req, res) => {

  try {

    const { boneName, source = 'api' } = req.body;



    if (!boneName || typeof boneName !== 'string') {

      return res.status(400).json({

        success: false,

        error: '缺少 boneName 参数',

      });

    }



    cleanExpired();



    const command: JointCommand = {

      id: generateId(),

      action: 'reset',

      boneName,

      source,

      timestamp: Date.now(),

      ttl: 30000,

    };



    commandQueue.push(command);



    console.log(`[JointControl] 入队重置指令: ${command.id} 骨骼="${boneName}" 来源=${source}`);



    res.json({

      success: true,

      commandId: command.id,

      message: '重置指令已入队',

    });

  } catch (err) {

    console.error('[JointControl] reset 接口异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误: ' + (err instanceof Error ? err.message : String(err)),

    });

  }

});



/**

 * POST /api/joint-control/reset-all

 * 重置所有关节旋转

 */

router.post('/reset-all', (req, res) => {

  try {

    const { source = 'api' } = req.body;



    cleanExpired();



    const command: JointCommand = {

      id: generateId(),

      action: 'resetAll',

      source,

      timestamp: Date.now(),

      ttl: 30000,

    };



    commandQueue.push(command);



    console.log(`[JointControl] 入队全量重置指令: ${command.id} 来源=${source}`);



    res.json({

      success: true,

      commandId: command.id,

      message: '全量重置指令已入队',

    });

  } catch (err) {

    console.error('[JointControl] reset-all 接口异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误: ' + (err instanceof Error ? err.message : String(err)),

    });

  }

});



/**

 * POST /api/joint-control/list

 * 请求前端返回关节列表（异步：入队请求，前端执行后回传结果）

 */

router.post('/list', (req, res) => {

  try {

    const { source = 'api' } = req.body;



    cleanExpired();



    const command: JointCommand = {

      id: generateId(),

      action: 'list',

      source,

      timestamp: Date.now(),

      ttl: 30000,

    };



    commandQueue.push(command);



    res.json({

      success: true,

      commandId: command.id,

      message: '关节列表查询指令已入队',

    });

  } catch (err) {

    console.error('[JointControl] list 接口异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误',

    });

  }

});



/**

 * POST /api/joint-control/limit

 * 请求前端返回指定关节的生理极限

 * 请求体：boneName

 */

router.post('/limit', (req, res) => {

  try {

    const { boneName, source = 'api' } = req.body;



    if (!boneName) {

      return res.status(400).json({

        success: false,

        error: '缺少 boneName 参数',

      });

    }



    cleanExpired();



    const command: JointCommand = {

      id: generateId(),

      action: 'limit',

      boneName,

      source,

      timestamp: Date.now(),

      ttl: 30000,

    };



    commandQueue.push(command);



    res.json({

      success: true,

      commandId: command.id,

      message: '极限查询指令已入队',

    });

  } catch (err) {

    console.error('[JointControl] limit 接口异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误',

    });

  }

});



/**

 * POST /api/joint-control/status

 * 请求前端返回当前系统状态（物理引擎/碰撞体/摆动骨骼/关节数量等）

 * 用于 AI 接入前的诊断

 */

router.post('/status', (req, res) => {

  try {

    const { source = 'api' } = req.body;



    cleanExpired();



    const command: JointCommand = {

      id: generateId(),

      action: 'status',

      source,

      timestamp: Date.now(),

      ttl: 30000,

    };



    commandQueue.push(command);



    res.json({

      success: true,

      commandId: command.id,

      message: '状态查询指令已入队',

    });

  } catch (err) {

    console.error('[JointControl] status 接口异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误',

    });

  }

});



/**

 * POST /api/joint-control/find

 * 请求前端模糊查找骨骼名（AI 不知道确切骨骼名时使用）

 * 请求体：keyword

 */

router.post('/find', (req, res) => {

  try {

    const { keyword, source = 'api' } = req.body;



    if (!keyword || typeof keyword !== 'string') {

      return res.status(400).json({

        success: false,

        error: '缺少 keyword 参数',

      });

    }



    cleanExpired();



    const command: JointCommand = {

      id: generateId(),

      action: 'find',

      keyword,

      source,

      timestamp: Date.now(),

      ttl: 30000,

    };



    commandQueue.push(command);



    res.json({

      success: true,

      commandId: command.id,

      message: '骨骼查找指令已入队',

    });

  } catch (err) {

    console.error('[JointControl] find 接口异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误',

    });

  }

});



// ============================================================================

// ============================================================================
// 动作指令（AI → 桌宠动作，v53 新增）
// ============================================================================

/** 合法动作白名单（与前端 petActionRegistry 对齐） */
// [2026-09-08 T6.1] + P0 批 14 + 配方解锁批 5（offerHand/bounce/stomp/cheer/approach）
const PET_ACTION_WHITELIST = ['wave', 'nod', 'shake', 'block', 'turnHead', 'turnBody', 'squat', 'stretch', 'turnLeft', 'turnRight', 'jump', 'reset', 'spin', 'limbRaise',
  'tiltHead', 'bow', 'clap', 'spreadHands', 'thumbsUp', 'comeHere', 'refuse', 'standUp', 'bendForward', 'lookUp', 'lookDown', 'legKick', 'point',
  'offerHand', 'bounce', 'stomp', 'cheer', 'approach',
  'vmdClip'];

/**
 * 入队动作指令（供 ai.ts 等内部直接调用，不依赖 HTTP 自调）
 * @returns { ok: boolean; error?: string; commandId?: string }
 */
export function enqueuePetAction(actionId: string, source: string, params?: any): { ok: boolean; error?: string; commandId?: string } {
  cleanExpired(); // [2026-10-02 终审] 入队前清过期：补上主进程不轮询窗口期"过期指令只进不出"的缺口
  if (!PET_ACTION_WHITELIST.includes(actionId)) {
    return { ok: false, error: '未知动作: ' + actionId };
  }
  const command: JointCommand = {
    id: generateId(),
    action: 'petAction',
    actionId,
    params: (params && typeof params === 'object') ? params : undefined,
    source: source || 'internal',
    timestamp: Date.now(),
    ttl: 30000, // 30 秒内必须被前端拉取执行
  };
  commandQueue.push(command);
  console.log('[JointControl] 动作指令入队: ' + actionId + ' (source=' + command.source + ', id=' + command.id + ')');
  return { ok: true, commandId: command.id };
}

/**
 * POST /api/joint-control/pet-action
 * AI/外部调用：触发桌宠动作（wave/nod/shake/block/turnHead/turnBody）
 * [2026-09-17] 返回 commandId，调用方可轮询 GET /result/:id 查真实执行结果
 */
router.post('/pet-action', (req, res) => {
  try {
    const { actionId, source, params } = req.body || {};
    if (!actionId || typeof actionId !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 actionId 参数' });
    }
    const result = enqueuePetAction(actionId, source || 'api', params);
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({
      success: true,
      actionId,
      commandId: result.commandId,
      message: '已入队，请轮询 GET /api/v1/joint-control/result/' + result.commandId,
    });
  } catch (err) {
    console.error('[JointControl] pet-action 异常:', err);
    res.status(500).json({ success: false, error: '内部错误' });
  }
});

/**
 * GET /api/joint-control/pending
 * 前端轮询拉取待执行指令
 * 返回当前队列中所有待执行指令，并从队列中移除
 */

// ============================================================================



/**

 * GET /api/joint-control/pending

 * 前端轮询拉取待执行指令

 * 返回当前队列中所有待执行指令，并从队列中移除

 */

router.get('/pending', (req, res) => {

  try {

    cleanExpired();



    const commands = commandQueue.splice(0);  // 取出并清空队列

    res.json({

      success: true,

      commands,

      count: commands.length,

    });

  } catch (err) {

    console.error('[JointControl] pending 接口异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误',

    });

  }

});



/**

 * POST /api/joint-control/result

 * 前端执行完毕后回传结果

 * 请求体：CommandResult

 */

router.post('/result', (req, res) => {

  try {

    const { id, success, error, data, executedAt } = req.body;



    if (!id) {

      return res.status(400).json({

        success: false,

        error: '缺少指令 ID',

      });

    }



    const result: CommandResult = {

      id,

      success: !!success,

      error,

      data,

      executedAt: executedAt || Date.now(),

    };



    resultStore.set(id, result);



    // 保留最近 1000 条结果

    if (resultStore.size > 1000) {

      const oldestKey = resultStore.keys().next().value;

      if (oldestKey) resultStore.delete(oldestKey);

    }



    console.log(`[JointControl] 指令执行结果回传: ${id} ${success ? '成功' : '失败'}`);



    res.json({ success: true });

  } catch (err) {

    console.error('[JointControl] result 接口异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误',

    });

  }

});



/**

 * GET /api/joint-control/result/:commandId

 * 查询指令执行结果

 */

router.get('/result/:commandId', (req, res) => {

  try {

    const { commandId } = req.params;

    const result = resultStore.get(commandId);



    if (!result) {

      return res.json({

        success: false,

        pending: true,

        message: '指令尚未执行或已过期',

      });

    }



    res.json({

      success: true,

      result,

    });

  } catch (err) {

    console.error('[JointControl] result 查询异常:', err);

    res.status(500).json({

      success: false,

      error: '内部错误',

    });

  }

});



export default router;

