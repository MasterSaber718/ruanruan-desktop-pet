/**
 * ============================================================================
 * 事件总线 - Event Bus
 * ============================================================================
 *
 * 提供系统级别的事件发布订阅机制，实现模块间的解耦通信
 */

import { 
  BaseEvent, 
  EventHandler, 
  EventMeta,
  EventBus as IEventBus
} from './types';
import { aiLogger } from '../AILogger';

export class EventBus implements IEventBus {
  private subscribers: Map<string, Set<EventHandler>>;
  private onceSubscribers: Map<string, Set<EventHandler>>;
  private eventHistory: BaseEvent[];
  private maxHistory: number;

  constructor(maxHistory: number = 1000) {
    this.subscribers = new Map();
    this.onceSubscribers = new Map();
    this.eventHistory = [];
    this.maxHistory = maxHistory;
  }

  /**
   * 生成事件元数据
   */
  private createMeta(partialMeta?: Partial<EventMeta>, source: string = 'unknown'): EventMeta {
    return {
      id: partialMeta?.id ?? this.generateId(),
      timestamp: partialMeta?.timestamp ?? Date.now(),
      source: partialMeta?.source ?? source,
      correlationId: partialMeta?.correlationId
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 发布事件
   */
  emit<T extends BaseEvent>(
    event: Omit<T, 'meta'> & Partial<{ meta: Partial<EventMeta> }>
  ): string {
    const fullEvent: BaseEvent = {
      ...event,
      meta: this.createMeta(event.meta, event.meta?.source)
    } as BaseEvent;

    // 记录事件历史
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    aiLogger.debug('EventBus', 'Emitting event', {
      type: fullEvent.type,
      eventId: fullEvent.meta.id,
      source: fullEvent.meta.source
    });

    // 调用常规订阅者
    const handlers = this.subscribers.get(fullEvent.type);
    if (handlers) {
      handlers.forEach(handler => this.invokeHandler(handler, fullEvent));
    }

    // 调用一次性订阅者
    const onceHandlers = this.onceSubscribers.get(fullEvent.type);
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        this.invokeHandler(handler, fullEvent);
      });
      this.onceSubscribers.delete(fullEvent.type);
    }

    // 调用通配符订阅者
    const wildcardHandlers = this.subscribers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => this.invokeHandler(handler, fullEvent));
    }

    return fullEvent.meta.id;
  }

  /**
   * 安全调用事件处理器
   */
  private async invokeHandler(handler: EventHandler, event: BaseEvent): Promise<void> {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      aiLogger.error('EventBus', 'Handler execution failed', {
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 订阅事件
   */
  on<T extends BaseEvent>(type: T['type'], handler: EventHandler<T>): void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(handler as EventHandler);
    aiLogger.debug('EventBus', 'Subscribed to event', { type });
  }

  /**
   * 取消订阅
   */
  off<T extends BaseEvent>(type: T['type'], handler: EventHandler<T>): void {
    const handlers = this.subscribers.get(type);
    if (handlers) {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.subscribers.delete(type);
      }
    }
    aiLogger.debug('EventBus', 'Unsubscribed from event', { type });
  }

  /**
   * 一次性订阅
   */
  once<T extends BaseEvent>(type: T['type'], handler: EventHandler<T>): void {
    if (!this.onceSubscribers.has(type)) {
      this.onceSubscribers.set(type, new Set());
    }
    this.onceSubscribers.get(type)!.add(handler as EventHandler);
    aiLogger.debug('EventBus', 'Once subscribed to event', { type });
  }

  /**
   * 获取事件历史
   */
  getHistory(since?: number, types?: string[]): BaseEvent[] {
    let history = this.eventHistory;
    
    if (since) {
      history = history.filter(e => e.meta.timestamp >= since);
    }
    
    if (types && types.length > 0) {
      history = history.filter(e => types.includes(e.type));
    }
    
    return [...history];
  }

  /**
   * 清空事件历史
   */
  clearHistory(): void {
    this.eventHistory = [];
    aiLogger.debug('EventBus', 'Event history cleared');
  }

  /**
   * 移除所有订阅者
   */
  removeAllListeners(): void {
    this.subscribers.clear();
    this.onceSubscribers.clear();
    aiLogger.debug('EventBus', 'All listeners removed');
  }

  /**
   * 获取订阅者数量
   */
  getSubscriberCount(type?: string): number {
    if (type) {
      const regular = this.subscribers.get(type)?.size ?? 0;
      const once = this.onceSubscribers.get(type)?.size ?? 0;
      return regular + once;
    }
    
    let count = 0;
    this.subscribers.forEach(handlers => count += handlers.size);
    this.onceSubscribers.forEach(handlers => count += handlers.size);
    return count;
  }

  /**
   * 获取所有事件类型
   */
  getEventTypes(): string[] {
    const types = new Set<string>();
    this.subscribers.forEach((_, type) => types.add(type));
    this.onceSubscribers.forEach((_, type) => types.add(type));
    return Array.from(types);
  }
}

// 单例实例
export const eventBus = new EventBus();

// ==================== 预定义事件类型 ====================

export class SystemEvent<T = unknown> implements BaseEvent {
  meta: EventMeta;
  type: string;
  payload: T;

  constructor(type: string, payload: T, meta?: Partial<EventMeta>) {
    this.type = type;
    this.payload = payload;
    this.meta = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      source: 'system',
      ...meta
    };
  }
}

// 系统生命周期事件
export class SystemStartEvent extends SystemEvent<void> {
  constructor() {
    super('system:start', undefined, { source: 'system' });
  }
}

export class SystemStopEvent extends SystemEvent<void> {
  constructor() {
    super('system:stop', undefined, { source: 'system' });
  }
}

export class SystemErrorEvent extends SystemEvent<{
  error: string;
  code: string;
  module?: string;
}> {
  constructor(payload: { error: string; code: string; module?: string }) {
    super('system:error', payload, { source: payload.module ?? 'system' });
  }
}

// 消息事件
export class MessageReceivedEvent extends SystemEvent<{
  message: string;
  role: 'user' | 'system';
  metadata?: Record<string, unknown>;
}> {
  constructor(payload: { message: string; role: 'user' | 'system'; metadata?: Record<string, unknown> }) {
    super('message:received', payload, { source: 'input' });
  }
}

export class MessageSentEvent extends SystemEvent<{
  message: string;
  metadata?: Record<string, unknown>;
}> {
  constructor(payload: { message: string; metadata?: Record<string, unknown> }) {
    super('message:sent', payload, { source: 'output' });
  }
}

// 认知事件
export class ThoughtGeneratedEvent extends SystemEvent<{
  content: string;
  type: string;
  confidence: number;
}> {
  constructor(payload: { content: string; type: string; confidence: number }) {
    super('thought:generated', payload, { source: 'cognitive' });
  }
}

// 情绪事件
export class EmotionChangedEvent extends SystemEvent<{
  mood: string;
  valence: number;
  arousal: number;
  intensity: number;
}> {
  constructor(payload: { mood: string; valence: number; arousal: number; intensity: number }) {
    super('emotion:changed', payload, { source: 'emotional' });
  }
}

// 进化事件
export class EvolutionProgressEvent extends SystemEvent<{
  stage: number;
  progress: number;
  metrics: Record<string, number>;
}> {
  constructor(payload: { stage: number; progress: number; metrics: Record<string, number> }) {
    super('evolution:progress', payload, { source: 'evolution' });
  }
}

export class EvolutionCompletedEvent extends SystemEvent<{
  fromStage: number;
  toStage: number;
  newCapabilities: string[];
}> {
  constructor(payload: { fromStage: number; toStage: number; newCapabilities: string[] }) {
    super('evolution:completed', payload, { source: 'evolution' });
  }
}

// 任务事件
export class TaskCreatedEvent extends SystemEvent<{
  taskId: string;
  name: string;
  priority: string;
}> {
  constructor(payload: { taskId: string; name: string; priority: string }) {
    super('task:created', payload, { source: 'task' });
  }
}

export class TaskCompletedEvent extends SystemEvent<{
  taskId: string;
  success: boolean;
  duration: number;
}> {
  constructor(payload: { taskId: string; success: boolean; duration: number }) {
    super('task:completed', payload, { source: 'task' });
  }
}
