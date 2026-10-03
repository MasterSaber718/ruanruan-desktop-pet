/**
 * ============================================================================
 * 系统核心模块 - Core Module
 * ============================================================================
 *
 * 数字生命操作系统的核心基础设施
 */

// 类型定义
export * from './types';

// 事件总线
export { 
  EventBus, 
  eventBus, 
  SystemEvent,
  SystemStartEvent,
  SystemStopEvent,
  SystemErrorEvent,
  MessageReceivedEvent,
  MessageSentEvent,
  ThoughtGeneratedEvent,
  EmotionChangedEvent,
  EvolutionProgressEvent,
  EvolutionCompletedEvent,
  TaskCreatedEvent,
  TaskCompletedEvent
} from './EventBus';

// 配置管理
export { 
  ConfigManager, 
  configManager,
  getConfig,
  setConfig,
  useConfig
} from './Config';

// 错误处理
export {
  ErrorCode,
  ErrorSeverity,
  DigitalLifeError,
  createError,
  createFatalError,
  ErrorManager,
  errorManager,
  handleError,
  wrapAsync
} from './Errors';
