/**
 * 微信机器人前端服务（wechatbot-webhook 模式）
 *
 * 调用后端 /api/v1/wechat-bot/* 接口：
 *   - 后端通过 Docker 部署的 wechatbot-webhook 容器收发消息
 *   - 容器收到微信消息后通过 webhook 推送到后端，后端调用 AI 后回复
 *   - 状态包含 name/last_message/last_reply 等，无 qrcodeImg（webhook 模式用 URL 登录）
 *
 * 后端端口固定 27865，动态使用 window.location.hostname 以支持局域网访问。
 */

import axios, { AxiosError } from 'axios';

const API_HOST = (typeof window !== 'undefined' && window.location && window.location.hostname) || '127.0.0.1';
const API_BASE_URL = `http://${API_HOST}:27865/api/v1/wechat-bot`;

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

// ==================== 类型定义 ====================

/**
 * 机器人状态值
 *   - idle：空闲（容器在线但未登录 / 未调用 start）
 *   - running：运行中（容器在线且已登录）
 *   - stopped：已停止（用户关闭开关）
 *   - error：错误（容器不可达 / 初始化异常）
 */
export type BotStatus = 'idle' | 'running' | 'stopped' | 'error';

export interface BotState {
  status: BotStatus;
  plugin?: string;
  wxid?: string;
  name?: string;
  pid?: number | null;
  started_at?: number;
  last_message?: string;
  last_reply?: string;
  last_error?: string;
  incoming_count?: number;
  outgoing_count?: number;
  listen?: string[];
  message?: string;
}

export interface HistoryRecord {
  dir: 'incoming' | 'outgoing';
  msgId: string;
  fromId?: string;
  fromName?: string;
  toName?: string;
  text: string;
  timestamp: number;
  elapsed?: number;
  error?: string;
}

export interface LoginUrlResult {
  url: string;       // 登录页面 URL（含 token）
  token: string;     // webhook token
}

// ==================== 服务类 ====================

export class WechatBotService {
  /** 启动机器人（检查容器健康状态，已登录则进入 running） */
  async start(): Promise<{ ok: boolean; state?: BotState; error?: string; login_url?: string; logged_in?: boolean }> {
    try {
      const resp = await axios.post(`${API_BASE_URL}/start`);
      return {
        ok: true,
        state: resp.data.state,
        logged_in: resp.data.logged_in,
        login_url: resp.data.login_url,
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }

  /** 停止机器人（仅更新状态，容器常驻） */
  async stop(): Promise<{ ok: boolean; state?: BotState; error?: string }> {
    try {
      const resp = await axios.post(`${API_BASE_URL}/stop`);
      return { ok: true, state: resp.data.state };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }

  /**
   * 重置（清空聊天历史记录，不清理账号信息/监听列表/登录态）
   *
   * 安全边界（与后端 /reset 接口一致）：
   *   - 清理：wechat_bot_history.json（聊天记录）
   *   - 保留：账号状态、监听列表、登录态、AI 配置
   *
   * 返回值含 message/cleared/preserved 字段，用于前端显示清理范围确认
   */
  async reset(): Promise<{
    ok: boolean;
    state?: BotState;
    error?: string;
    message?: string;        // 清理结果描述
    cleared?: string[];      // 已清理的数据类别
    preserved?: string[];    // 已保留的数据类别
  }> {
    try {
      const resp = await axios.post(`${API_BASE_URL}/reset`);
      return {
        ok: true,
        state: resp.data.state,
        message: resp.data.message,
        cleared: resp.data.cleared,
        preserved: resp.data.preserved,
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }

  /** 获取当前状态 */
  async getState(): Promise<{ ok: boolean; state?: BotState; error?: string }> {
    try {
      const resp = await axios.get(`${API_BASE_URL}/state`);
      return { ok: true, state: resp.data.state };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }

  /** 获取消息历史 */
  async getHistory(limit = 50, offset = 0): Promise<{
    ok: boolean;
    history?: HistoryRecord[];
    total?: number;
    error?: string;
  }> {
    try {
      const resp = await axios.get(`${API_BASE_URL}/history`, {
        params: { limit, offset },
      });
      return { ok: true, history: resp.data.history, total: resp.data.total };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }

  /** 主动发消息（to 为接收者昵称，text 为文本内容） */
  async send(params: { to: string; text: string }): Promise<{ ok: boolean; error?: string; message?: string }> {
    try {
      const resp = await axios.post(`${API_BASE_URL}/send`, params);
      return { ok: resp.data.ok, message: resp.data.message };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }

  /**
   * 获取登录页面 URL（webhook 模式无二维码图片，用户在新窗口打开 URL 扫码）
   * 返回 { url: "http://127.0.0.1:3001/login?token=xxx", token: "xxx" }
   */
  async getLoginUrl(): Promise<{ ok: boolean; data?: LoginUrlResult; error?: string }> {
    try {
      const resp = await axios.get(`${API_BASE_URL}/login-url`);
      return { ok: true, data: { url: resp.data.url, token: resp.data.token } };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }

  /** 健康检查（含 wechatbot-webhook 容器状态） */
  async health(): Promise<boolean> {
    try {
      const resp = await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
      return resp.data?.ok === true;
    } catch {
      return false;
    }
  }

  /**
   * 切换开关（设置页调用）
   * 开启时后端会检查容器状态：容器在线且已登录 → running；否则返回 login_url
   * 关闭时状态变为 stopped，容器不受影响（常驻）
   */
  async toggle(enabled: boolean): Promise<{ ok: boolean; state?: BotState; error?: string; login_url?: string }> {
    try {
      const resp = await axios.post(`${API_BASE_URL}/toggle`, { enabled });
      return { ok: true, state: resp.data.state };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }

  /**
   * 管理监听列表
   * 返回值含 added/removed/message 字段，用于前端显示确认提示
   */
  async listen(action: 'add' | 'remove' | 'list', name?: string): Promise<{
    ok: boolean;
    listen?: string[];
    error?: string;
    added?: boolean;      // add 时：true=新增成功，false=已存在
    removed?: boolean;    // remove 时：true=移除成功，false=不存在
    message?: string;     // 操作结果描述
  }> {
    try {
      const resp = await axios.post(`${API_BASE_URL}/listen`, { action, name });
      return {
        ok: true,
        listen: resp.data.listen,
        added: resp.data.added,
        removed: resp.data.removed,
        message: resp.data.message,
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
}

export const wechatBotService = new WechatBotService();
export default wechatBotService;
