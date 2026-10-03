/**
 * 关节控制服务 - 前端轮询客户端（AI 接入预留接口）
 *
 * 【用途】
 * 本服务是未来留给 AI 接入用于控制 3D 模型骨骼关节旋转的前端执行端。
 *
 * 【工作流程】
 * 1. AI/外部程序调用后端 POST /api/joint-control/rotate 等接口，指令入队
 * 2. 本服务每秒轮询 GET /api/joint-control/pending 拉取指令
 * 3. 调用 window.__jointControl 执行指令
 * 4. 通过 POST /api/joint-control/result 回传执行结果
 *
 * 【安全】
 * - 实际执行由 BabylonModelViewer.tsx 中的 safeRotateJoint 把关
 * - 关节白名单、位置锁死、生理极限三层保护
 * - 本服务只是中转，不做任何越权操作
 *
 * 【兼容性】
 * - 不影响现有功能：仅在模型加载后启动轮询，模型卸载时停止
 * - 失败静默：网络异常、接口未就绪等不会抛出错误
 */

// 后端服务端口是27865
// 动态使用 window.location.hostname：从局域网IP访问前端时也指向同一台后端机器
// （否则手机等设备访问 http://192.168.x.x:5175 时，JS 调用 127.0.0.1:27865 会指向手机自己）
// Electron 环境下降级到 127.0.0.1
const API_HOST = (typeof window !== 'undefined' && window.location && window.location.hostname) || '127.0.0.1';
const API_BASE_URL = `http://${API_HOST}:27865/api/v1`;

/** 后端指令定义（与后端 JointCommand 对应） */
interface JointCommand {
  id: string;
  action: 'rotate' | 'reset' | 'resetAll' | 'list' | 'limit' | 'status' | 'find' | 'petAction';
  boneName?: string;
  rotation?: { x: number; y: number; z: number };
  keyword?: string;  // find 命令的关键词
actionId?: string;  // petAction 的动作 ID
  params?: any;       // petAction 的参数（[2026-09-08] spin/limbRaise 语义原语：turns/dir/side/limb/height 等）
  source: string;
  timestamp: number;
  ttl: number;
}

/** 后端响应：pending 拉取 */
interface PendingResponse {
  success: boolean;
  commands: JointCommand[];
  count: number;
}

/** window.__jointControl 接口定义（与 BabylonModelViewer.tsx 暴露的接口对应） */
interface JointControlApi {
  list: () => { joints: string[]; nonJoints: string[]; locked: string[] };
  joints: () => string[];
  rotate: (boneName: string, x: number, y: number, z: number) => boolean;
  reset: (boneName: string) => boolean;
  resetAll: () => number;
  limit: (boneName: string) => {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    zMin: number; zMax: number;
  } | null;
  /** 查询系统状态（物理引擎/碰撞体/摆动骨骼/关节数量） */
  status: () => {
    physicsEngine: string;
    physicsModel: string;
    collisionBodies: number;
    swingBones: number;
    totalBones: number;
    joints: number;
    lockedBones: number;
    action: string;
  };
  /** 模糊查找骨骼名 */
  find: (keyword: string) => string[];
}

/** 获取 window.__jointControl（可能未加载） */
function getJointControl(): JointControlApi | null {
  return (window as any).__jointControl || null;
}

/** 轮询状态 */
let polling = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const POLL_INTERVAL_MS = 1000;  // 1 秒轮询一次

/**
 * 执行单条指令
 * @returns 执行结果（success + 可选 data/error）
 */
async function executeCommand(cmd: JointCommand): Promise<{ success: boolean; data?: any; error?: string }> {
  const jc = getJointControl();
  if (!jc) {
    return { success: false, error: 'window.__jointControl 未就绪（模型可能未加载）' };
  }

  try {
    switch (cmd.action) {
      case 'rotate': {
        if (!cmd.boneName || !cmd.rotation) {
          return { success: false, error: '参数缺失: boneName 或 rotation' };
        }
        const ok = jc.rotate(cmd.boneName, cmd.rotation.x, cmd.rotation.y, cmd.rotation.z);
        return { success: ok, error: ok ? undefined : 'safeRotateJoint 拒绝（非关节/超极限/位置锁死）' };
      }

      case 'reset': {
        if (!cmd.boneName) {
          return { success: false, error: '参数缺失: boneName' };
        }
        const ok = jc.reset(cmd.boneName);
        return { success: ok, error: ok ? undefined : '重置被拒绝' };
      }

      case 'resetAll': {
        const n = jc.resetAll();
        return { success: true, data: { resetCount: n } };
      }

      case 'list': {
        const data = jc.list();
        return { success: true, data };
      }

      case 'limit': {
        if (!cmd.boneName) {
          return { success: false, error: '参数缺失: boneName' };
        }
        const data = jc.limit(cmd.boneName);
        return {
          success: data !== null,
          data: data || undefined,
          error: data === null ? '骨骼不是关节或不存在' : undefined,
        };
      }

      case 'status': {
        const data = jc.status();
        return { success: true, data };
      }

      case 'find': {
        if (!cmd.keyword) {
          return { success: false, error: '参数缺失: keyword' };
        }
        const data = jc.find(cmd.keyword);
        return { success: true, data };
      }

      case 'petAction': {
        if (!cmd.actionId) {
          return { success: false, error: '参数缺失: actionId' };
        }
        const pa = (window as any).__petAction;
        if (!pa) {
          return { success: false, error: 'window.__petAction 未就绪（模型可能未加载）' };
        }
        // [2026-09-17] 把指令 source 注入 params，显式来源与自动情绪分冷却槽
        const p = { ...(cmd.params || {}), __source: cmd.source || 'api' };
        const r = pa(cmd.actionId, p);
        return {
          success: !!r && r.ok === true,
          error: r && !r.ok ? (r.reason || '动作校验拒绝') : undefined,
          data: r && r.ok ? { actionId: cmd.actionId, source: cmd.source } : undefined,
        };
      }

      default:
        return { success: false, error: `未知 action: ${(cmd as any).action}` };
    }
  } catch (err) {
    return {
      success: false,
      error: '执行异常: ' + (err instanceof Error ? err.message : String(err)),
    };
  }
}

/**
 * 回传执行结果到后端
 */
async function reportResult(
  id: string,
  success: boolean,
  data: any,
  error: string | undefined
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/joint-control/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        success,
        error,
        data,
        executedAt: Date.now(),
      }),
    });
  } catch (err) {
    // 静默失败，不影响后续轮询
    console.warn('[JointControlClient] 回传结果失败:', err);
  }
}

/**
 * [v70 指令扇出] 执行一批动作指令（串行 + 回传结果）
 *
 * 调用方：
 *   1. pollOnce()（本文件自带的轮询兜底，仅纯浏览器开发环境）
 *   2. BabylonModelViewer 通过 preload 的 desktopPet.onJointCommand 注册的
 *      IPC 监听——[v70] 指令轮询收编到主进程，单一消费方拉取 /pending 后
 *      广播给所有存活窗口，可见窗口同步动、冻结窗口只记账不渲染，
 *      彻底消灭"宠物/壁纸两窗口抢单，只有一个动"的竞争。
 */
export async function executeIncomingCommands(commands: JointCommand[]): Promise<void> {
  // 串行执行指令（避免骨骼并发冲突）
  for (const cmd of commands) {
    const result = await executeCommand(cmd);
    await reportResult(cmd.id, result.success, result.data, result.error);
    console.log(`[JointControlClient] 指令 ${cmd.id} (${cmd.action}) 执行: ${result.success ? '成功' : '失败'}`);
  }
}

/**
 * 单次轮询：拉取指令 → 执行 → 回传
 */
async function pollOnce(): Promise<void> {
  let commands: JointCommand[] = [];
  try {
    const resp = await fetch(`${API_BASE_URL}/joint-control/pending`, {
      method: 'GET',
    });
    if (!resp.ok) return;
    const data: PendingResponse = await resp.json();
    if (!data.success || !data.commands || data.commands.length === 0) return;
    commands = data.commands;
  } catch (err) {
    // 网络异常静默忽略
    return;
  }

  await executeIncomingCommands(commands);
}

/**
 * 启动轮询（模型加载后调用）
 * 幂等：重复调用不会启动多个轮询
 */
export function startJointControlPolling(): void {
  if (polling) return;
  polling = true;
  console.log('[JointControlClient] 启动关节控制指令轮询（间隔 1s）');
  pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
  // 立即拉取一次
  void pollOnce();
}

/**
 * 停止轮询（模型卸载时调用）
 */
export function stopJointControlPolling(): void {
  if (!polling) return;
  polling = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log('[JointControlClient] 停止关节控制指令轮询');
}

/**
 * 查询轮询状态
 */
export function isJointControlPolling(): boolean {
  return polling;
}

/**
 * 主动触发一次拉取（不等下一个轮询周期）
 * 用于需要立即响应的场景
 */
export function triggerJointControlPoll(): void {
  void pollOnce();
}
