/**
 * 通用聊天机器人适配器协议 [v60]
 * 
 * 设计原则：
 * 1. 平台无关：任何 IM 软件（微信/QQ/飞书/Discord/Telegram/网页等）都实现此接口
 * 2. 开发者自助：后续开发者只需实现接口方法，注册到 registry 即可接入
 * 3. 协议统一：消息格式 / 状态报告 / 登录方式 全部标准化
 * 
 * 消息协议格式（Webhook 推送）：
 *   POST /api/v1/bot/webhook
 *   Body: {
 *     type: "message" | "event" | "status",
 *     platform: string,        // 平台标识，如 "qq" / "telegram" / "custom"
 *     from: { id: string, name: string },
 *     message: { text: string, type: "text" | "image" | "voice" },
 *     timestamp: number
 *   }
 * 
 * 回复格式（回调 / Webhook 回传）：
 *   POST {callback_url}
 *   Body: { reply: string, to: string }
 */

export interface IMBotAdapter {
  /** 适配器唯一标识 (如 'wechat-webhook', 'qq-bot', 'feishu-bot', 'telegram-bot') */
  readonly type: string;
  /** 人类可读名称 (如 'QQ 机器人', 'Telegram Bot') */
  readonly name: string;
  /** 平台描述，供管理员查看 */
  readonly description?: string;
  /** 协议版本 */
  readonly protocolVersion: string;

  /** 启动 bot 服务 */
  start(): Promise<BotAdapterState>;
  /** 停止 bot 服务 */
  stop(): Promise<BotAdapterState>;
  /** 发送消息到指定目标 */
  send(target: string, content: string, msgType?: string): Promise<SendResult>;
  /** 获取当前状态 */
  getState(): Promise<BotAdapterState>;
  /** 获取登录二维码/URL（如适用） */
  getLoginUrl?(): Promise<string | null>;
  /** 登出 */
  logout?(): Promise<void>;
  /** 重置（清缓存等） */
  reset?(): Promise<BotAdapterState>;
  /** 获取消息历史 */
  getHistory?(limit?: number): Promise<MessageRecord[]>;
  /** 监听列表管理 */
  getListenList?(): Promise<string[]>;
  addToList?(name: string): Promise<ListOpResult>;
  removeFromList?(name: string): Promise<ListOpResult>;
  /** 销毁适配器 */
  destroy(): void;
}

/** 适配器状态 */
export interface BotAdapterState {
  status: 'running' | 'stopped' | 'idle' | 'error';
  plugin?: string;
  name?: string;
  incoming_count?: number;
  outgoing_count?: number;
  last_message?: string;
  last_reply?: string;
  last_error?: string;
  message?: string;
  login_url?: string;
}

/** 发送结果 */
export interface SendResult {
  ok: boolean;
  error?: string;
}

/** 消息记录 */
export interface MessageRecord {
  id: string;
  from: string;
  to: string;
  content: string;
  type: string;
  timestamp: number;
}

/** 监听列表操作结果 */
export interface ListOpResult {
  ok: boolean;
  listen?: string[];
  added?: boolean;
  removed?: boolean;
  message?: string;
  error?: string;
}

/** 
 * Webhook 消息格式（通用协议）
 * 所有平台通过此格式向机器人发送消息
 */
export interface WebhookMessage {
  /** 消息类型 */
  type: 'message' | 'event' | 'status';
  /** 平台标识 */
  platform: string;
  /** 发送者 */
  from: { id: string; name: string };
  /** 会话 ID（群聊时为群ID，私聊时为发送者ID） */
  conversationId?: string;
  /** 消息内容 */
  message: {
    text: string;
    type: 'text' | 'image' | 'voice' | 'file';
    mediaUrl?: string;
  };
  /** 时间戳 */
  timestamp: number;
}

/** Webhook 回复格式 */
export interface WebhookReply {
  reply: string;
  to: string;
  conversationId?: string;
  platform?: string;
}
