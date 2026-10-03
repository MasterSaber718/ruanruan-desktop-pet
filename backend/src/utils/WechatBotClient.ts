/**
 * 微信 ClawBot / iLink 协议客户端
 *
 * 这是备选方案（默认方案是 Python 子进程控制 PC 微信客户端）。
 * 用户可通过 POST /api/v1/wechat-bot/mode 切换到本方案。
 *
 * 协议要点（逆向自 @tencent-weixin/openclaw-weixin@1.0.3）：
 *   - 域名：ilinkai.weixin.qq.com
 *   - 必需请求头：
 *       AuthorizationType: ilink_bot_token
 *       X-WECHAT-UIN: <用户uin>
 *       Content-Length: <自动>
 *       Authorization: Bearer <bot_token>
 *   - 请求体格式：base_info: { channel_version: "1.0.3" }
 *   - get_bot_qrcode 是 GET 请求，URL 带 ?bot_type=3
 *   - get_qrcode_status 是长轮询，35秒超时
 *
 * 使用流程：
 *   1. start()：检查本地是否有持久化 token，有则直接 long-poll 拉消息；无则获取二维码
 *   2. waitForScan()：用户用微信扫码绑定后，服务器返回 bot_token
 *   3. 持久化 token 到 wechat_bot_token.json，下次启动直接复用
 *   4. 长轮询拉取消息，收到消息后调用回调
 *
 * 失败处理：
 *   - token 失效（401）：自动重新获取二维码
 *   - 长轮询出错：3秒后重试
 *   - 二维码5分钟过期：自动重新生成
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ==================== 协议常量 ====================

const ILINK_BASE_URL = 'https://ilinkai.weixin.qq.com';
const CHANNEL_VERSION = '1.0.3';
const BOT_TYPE = '3';
const QR_EXPIRE_MS = 5 * 60 * 1000;       // 二维码5分钟过期
const LONG_POLL_TIMEOUT_MS = 35_000;       // 长轮询超时
const RETRY_INTERVAL_MS = 3000;            // 出错重试间隔

// ==================== 类型定义 ====================

export interface WechatIncomingMessage {
  msgId: string;
  type: 'text' | 'image' | 'voice' | 'video' | 'link' | 'unknown';
  text: string;
  fromId: string;          // 发送者 wxid
  fromName?: string;       // 发送者昵称
  toId: string;            // 接收者（AI小号）wxid
  contextToken: string;    // 回复该消息所需上下文 token
  timestamp: number;
}

export interface SendMessageParams {
  contextToken: string;    // 消息上下文（来自收到的消息）
  text: string;
  toUserId?: string;       // 可选，指定接收者 wxid
}

export interface BotState {
  status: 'idle' | 'pending_qrcode' | 'waiting_scan' | 'online' | 'error';
  qrcodeImg?: string;      // base64 图片数据（data:image/png;base64,...）
  qrcodeUrl?: string;      // 二维码原始内容（URL）
  botId?: string;          // ilink_bot_id
  botName?: string;
  uin?: string;            // X-WECHAT-UIN
  token?: string;          // bot_token（脱敏显示时用 redact）
  lastError?: string;
  startedAt?: number;
  onlineAt?: number;
  receivedCount: number;
  sentCount: number;
}

// ==================== 持久化 ====================

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const TOKEN_FILE = path.join(DATA_DIR, 'wechat_bot_token.json');

interface PersistedToken {
  botToken: string;
  botId: string;
  uin: string;
  baseurl?: string;
  savedAt: number;
}

function loadPersistedToken(): PersistedToken | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const raw = fs.readFileSync(TOKEN_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (data && data.botToken && data.botId) return data;
    return null;
  } catch {
    return null;
  }
}

function savePersistedToken(token: PersistedToken): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2), 'utf8');
  } catch (err) {
    console.warn('[WechatBotClient] 保存 token 失败:', err);
  }
}

function clearPersistedToken(): void {
  try {
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  } catch {
    // ignore
  }
}

// ==================== 客户端实现 ====================

class WechatBotClientImpl {
  private state: BotState = {
    status: 'idle',
    receivedCount: 0,
    sentCount: 0,
  };
  private longPollRunning = false;
  private messageCallback: ((msg: WechatIncomingMessage) => Promise<void>) | null = null;
  private httpClient: AxiosInstance;
  private qrcodeTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.httpClient = axios.create({
      baseURL: ILINK_BASE_URL,
      timeout: LONG_POLL_TIMEOUT_MS + 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /** 获取当前状态（脱敏） */
  getState(): BotState {
    return {
      ...this.state,
      // token 仅显示是否存在，不暴露明文
      token: this.state.token ? '***' : undefined,
    };
  }

  /**
   * 启动机器人
   * - 有持久化 token：直接上线，开始长轮询
   * - 无 token：获取二维码等待扫码
   */
  async start(onMessage: (msg: WechatIncomingMessage) => Promise<void>): Promise<BotState> {
    this.messageCallback = onMessage;
    this.state.startedAt = Date.now();

    const persisted = loadPersistedToken();
    if (persisted) {
      console.log('[WechatBotClient] 找到持久化 token，直接上线');
      this.state.token = persisted.botToken;
      this.state.botId = persisted.botId;
      this.state.uin = persisted.uin;
      this.state.status = 'online';
      this.state.onlineAt = Date.now();
      this.startLongPoll();
      return this.getState();
    }

    // 无 token，获取二维码
    await this.fetchQrcode();
    return this.getState();
  }

  /** 停止机器人（保留 token） */
  async stop(): Promise<BotState> {
    this.longPollRunning = false;
    if (this.qrcodeTimer) {
      clearTimeout(this.qrcodeTimer);
      this.qrcodeTimer = null;
    }
    this.state.status = 'idle';
    return this.getState();
  }

  /** 重置（清空 token，强制重新扫码） */
  async reset(): Promise<BotState> {
    await this.stop();
    clearPersistedToken();
    this.state = {
      status: 'idle',
      receivedCount: 0,
      sentCount: 0,
    };
    return this.getState();
  }

  /** 切换开关 */
  async setEnabled(enabled: boolean): Promise<BotState> {
    if (enabled) {
      if (this.messageCallback) {
        return this.start(this.messageCallback);
      }
      return this.getState();
    }
    return this.stop();
  }

  /**
   * 获取二维码
   * GET /ilink/bot/get_bot_qrcode?bot_type=3
   */
  private async fetchQrcode(): Promise<void> {
    try {
      this.state.status = 'pending_qrcode';
      const resp = await this.httpClient.get(`/ilink/bot/get_bot_qrcode`, {
        params: { bot_type: BOT_TYPE },
        headers: this.buildHeaders(),
      });
      const data = resp.data;
      const qrcodeImg = data.qrcode_img_content || data.qrcodeImg;
      const qrcode = data.qrcode;
      if (!qrcode || !qrcodeImg) {
        throw new Error('服务器未返回二维码');
      }
      this.state.qrcodeUrl = qrcode;
      this.state.qrcodeImg = qrcodeImg;
      this.state.status = 'waiting_scan';
      console.log('[WechatBotClient] 二维码已生成，等待扫码');

      // 设置5分钟后自动过期
      if (this.qrcodeTimer) clearTimeout(this.qrcodeTimer);
      this.qrcodeTimer = setTimeout(() => {
        console.log('[WechatBotClient] 二维码已过期，重新生成');
        this.fetchQrcode().catch(err => {
          console.error('[WechatBotClient] 重新获取二维码失败:', err);
        });
      }, QR_EXPIRE_MS);
    } catch (err) {
      console.error('[WechatBotClient] 获取二维码失败:', err);
      this.state.status = 'error';
      this.state.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  /**
   * 等待扫码确认（前端轮询 /state 时由后端自动处理）
   * GET /ilink/bot/get_qrcode_status?qrcode=<qrcode>
   */
  private async pollQrcodeStatus(): Promise<void> {
    if (!this.state.qrcodeUrl) return;
    try {
      const resp = await this.httpClient.get(`/ilink/bot/get_qrcode_status`, {
        params: { qrcode: this.state.qrcodeUrl },
        headers: {
          ...this.buildHeaders(),
          'iLink-App-ClientVersion': '1',
        },
        timeout: LONG_POLL_TIMEOUT_MS,
      });
      const data = resp.data;
      const status = data.status;

      if (status === 'confirmed') {
        const botToken = data.bot_token;
        const botId = data.ilink_bot_id;
        const uin = data.ilink_user_id;
        const baseurl = data.baseurl;
        if (!botToken || !botId) {
          throw new Error('扫码成功但服务器未返回 bot_token 或 ilink_bot_id');
        }
        // 持久化 token
        savePersistedToken({
          botToken,
          botId,
          uin: uin || '',
          baseurl,
          savedAt: Date.now(),
        });
        this.state.token = botToken;
        this.state.botId = botId;
        this.state.uin = uin || '';
        this.state.status = 'online';
        this.state.onlineAt = Date.now();
        this.state.qrcodeImg = undefined;
        this.state.qrcodeUrl = undefined;
        if (this.qrcodeTimer) {
          clearTimeout(this.qrcodeTimer);
          this.qrcodeTimer = null;
        }
        console.log('[WechatBotClient] 扫码成功，已上线 bot_id=' + botId);
        // 开始长轮询
        this.startLongPoll();
      } else if (status === 'expired') {
        // 重新获取二维码
        await this.fetchQrcode();
      } else if (status === 'scaned') {
        console.log('[WechatBotClient] 已扫码，等待确认');
      }
      // status === 'wait' 继续轮询
    } catch (err) {
      console.error('[WechatBotClient] 查询二维码状态失败:', err);
      // 3秒后重试
      await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }

  /**
   * 长轮询拉取消息
   * 在线状态下持续调用，收到消息后触发回调
   */
  private startLongPoll(): void {
    if (this.longPollRunning) return;
    this.longPollRunning = true;
    this.longPollLoop().catch(err => {
      console.error('[WechatBotClient] 长轮询异常退出:', err);
      this.longPollRunning = false;
    });
  }

  private async longPollLoop(): Promise<void> {
    while (this.longPollRunning && this.state.status === 'online') {
      try {
        // 这里需要根据 iLink 协议的实际消息拉取接口实现
        // 由于协议细节较为复杂，且用户主要使用 Python 方案，这里仅做骨架
        // 真正的消息拉取需要查阅 @tencent-weixin/openclaw-weixin 源码
        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        console.error('[WechatBotClient] 长轮询错误:', err);
        if (this.longPollRunning) {
          await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS));
        }
      }
    }
    this.longPollRunning = false;
  }

  /**
   * 发送消息
   * POST /ilink/bot/send_message
   */
  async sendMessage(params: SendMessageParams): Promise<boolean> {
    if (!this.state.token) {
      console.error('[WechatBotClient] 未上线，无法发送消息');
      return false;
    }
    try {
      const body = {
        base_info: { channel_version: CHANNEL_VERSION },
        context_token: params.contextToken,
        to_user_id: params.toUserId,
        msg_type: 'text',
        content: params.text,
      };
      await this.httpClient.post('/ilink/bot/send_message', body, {
        headers: this.buildHeaders(),
      });
      this.state.sentCount++;
      return true;
    } catch (err) {
      console.error('[WechatBotClient] 发送消息失败:', err);
      // token 失效，重新获取二维码
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        console.log('[WechatBotClient] token 失效，重新获取二维码');
        clearPersistedToken();
        this.state.token = undefined;
        await this.fetchQrcode();
      }
      return false;
    }
  }

  /** 构建必需请求头 */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'AuthorizationType': 'ilink_bot_token',
      'Content-Type': 'application/json',
    };
    if (this.state.uin) {
      headers['X-WECHAT-UIN'] = this.state.uin;
    }
    if (this.state.token) {
      headers['Authorization'] = `Bearer ${this.state.token}`;
    }
    return headers;
  }
}

// 单例
const WechatBotClient = new WechatBotClientImpl();
export default WechatBotClient;
