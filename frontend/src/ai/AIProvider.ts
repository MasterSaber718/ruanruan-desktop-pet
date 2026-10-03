/**
 * 统一 AI 提供商协议层
 *
 * 兼容 OpenAI Messages API 和 Anthropic Messages API 两种全球通用格式
 * 所有 LLM 提供商实现 IAIProvider 接口，支持无缝切换
 */

// ==================== 通用消息格式 ====================

export enum MessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
}

export interface AIMessage {
  role: MessageRole;
  content: string | Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'auto' | 'high' } }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string }
  >;
  name?: string;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
}

// ==================== 通用响应格式 ====================

export interface AIChoice {
  index: number;
  message: AIMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | string;
  logprobs?: null;
}

export interface AIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: AIChoice[];
  usage: AIUsage;
  system_fingerprint?: string;
}

// ==================== 训练反馈格式 ====================

export interface TrainingFeedback {
  messageId: string;
  rating: number; // 1-5
  comment?: string;
  correction?: string;
}

// ==================== 能力描述 ====================

export interface AICapabilities {
  supportsStreaming: boolean;
  supportsImages: boolean;
  supportsTools: boolean;
  maxTokens: number;
  contextWindow: number;
}

// ==================== 统一协议接口 ====================

export interface IAIProvider {
  /** 生成响应 */
  generateResponse(messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse>;

  /** 流式生成 */
  generateStream(messages: AIMessage[], onChunk: (chunk: string) => void, options?: AIRequestOptions): Promise<void>;

  /** 获取能力描述 */
  getCapabilities(): AICapabilities;

  /** 训练反馈（强化学习） */
  train(feedback: TrainingFeedback): Promise<void>;

  /** 健康检查 */
  healthCheck(): Promise<boolean>;
}

// ==================== 请求选项 ====================

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  seed?: number;
}

// ==================== OpenAI 格式适配器 ====================

export interface OpenAIRequest {
  model: string;
  messages: Array<{ role: string; content: string; name?: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string; tool_calls?: any[] };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ==================== Anthropic 格式适配器 ====================

export interface AnthropicRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string[] }>;
  system?: string;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | string;
  model: string;
}

// ==================== 协议转换器 ====================

export class ProtocolConverter {
  /** OpenAI 消息 → 统一消息 */
  static toOpenAI(messages: OpenAIRequest['messages']): AIMessage[] {
    return messages.map(m => ({
      role: m.role as MessageRole,
      content: m.content,
      name: m.name,
    }));
  }

  /** 统一消息 → OpenAI 消息 */
  static fromUnified(messages: AIMessage[]): OpenAIRequest['messages'] {
    return messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.content.map(c => c.type === 'text' ? c.text : '').join('\n'),
      name: m.name,
    }));
  }

  /** Anthropic 响应 → 统一响应 */
  static toUnified(response: AnthropicResponse, model: string): AIResponse {
    const textContent = response.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');

    return {
      id: response.id,
      object: 'chat.completion',
      created: Date.now() / 1000,
      model,
      choices: [{
        index: 0,
        message: { role: MessageRole.Assistant, content: textContent },
        finish_reason: response.stop_reason === 'end_turn' ? 'stop' : response.stop_reason,
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
}
