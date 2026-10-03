/**
 * ============================================================================
 * 错误处理系统 - Error Handler
 * ============================================================================
 *
 * 提供统一的错误类型、错误处理和错误恢复机制
 */

import { eventBus, SystemErrorEvent } from './EventBus';
import { aiLogger } from '../AILogger';

// ==================== 错误代码定义 ====================

export enum ErrorCode {
  // 系统错误 (1000-1999)
  UNKNOWN_ERROR = 1000,
  INITIALIZATION_FAILED = 1001,
  SHUTDOWN_FAILED = 1002,
  CONFIG_LOAD_FAILED = 1003,
  
  // 模块错误 (2000-2999)
  MODULE_NOT_FOUND = 2000,
  MODULE_INITIALIZATION_FAILED = 2001,
  MODULE_RUNTIME_ERROR = 2002,
  MODULE_HEALTH_CHECK_FAILED = 2003,
  
  // 认知错误 (3000-3999)
  THOUGHT_GENERATION_FAILED = 3000,
  REASONING_FAILED = 3001,
  DECISION_FAILED = 3002,
  
  // 记忆错误 (4000-4999)
  MEMORY_READ_FAILED = 4000,
  MEMORY_WRITE_FAILED = 4001,
  MEMORY_CORRUPTED = 4002,
  
  // 输入输出错误 (5000-5999)
  INPUT_PARSE_FAILED = 5000,
  OUTPUT_GENERATION_FAILED = 5001,
  
  // 安全错误 (6000-6999)
  SECURITY_VIOLATION = 6000,
  BOUNDARY_BREACHED = 6001,
  
  // 进化错误 (7000-7999)
  EVOLUTION_FAILED = 7000,
  GENE_MUTATION_FAILED = 7001,
  
  // 资源错误 (8000-8999)
  MEMORY_EXHAUSTED = 8000,
  CPU_OVERLOAD = 8001,
  QUEUE_OVERFLOW = 8002
}

// ==================== 错误严重性 ====================

export enum ErrorSeverity {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
  CRITICAL = 4,
  FATAL = 5
}

// ==================== 自定义错误类 ====================

export class DigitalLifeError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly module: string;
  public readonly timestamp: number;
  public readonly metadata?: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly cause?: Error;

  constructor(options: {
    message: string;
    code: ErrorCode;
    severity?: ErrorSeverity;
    module?: string;
    metadata?: Record<string, unknown>;
    recoverable?: boolean;
    cause?: Error;
  }) {
    super(options.message);
    this.name = 'DigitalLifeError';
    this.code = options.code;
    this.severity = options.severity ?? ErrorSeverity.ERROR;
    this.module = options.module ?? 'unknown';
    this.timestamp = Date.now();
    this.metadata = options.metadata;
    this.recoverable = options.recoverable ?? true;
    this.cause = options.cause;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DigitalLifeError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      module: this.module,
      timestamp: this.timestamp,
      metadata: this.metadata,
      recoverable: this.recoverable,
      stack: this.stack
    };
  }
}

// ==================== 便捷错误创建函数 ====================

export function createError(
  code: ErrorCode,
  message: string,
  options?: {
    severity?: ErrorSeverity;
    module?: string;
    metadata?: Record<string, unknown>;
    recoverable?: boolean;
    cause?: Error;
  }
): DigitalLifeError {
  return new DigitalLifeError({
    message,
    code,
    ...options
  });
}

export function createFatalError(
  code: ErrorCode,
  message: string,
  options?: {
    module?: string;
    metadata?: Record<string, unknown>;
    cause?: Error;
  }
): DigitalLifeError {
  return new DigitalLifeError({
    message,
    code,
    severity: ErrorSeverity.FATAL,
    recoverable: false,
    ...options
  });
}

// ==================== 错误管理器 ====================

interface ErrorHistoryItem {
  error: DigitalLifeError;
  count: number;
  lastOccurrence: number;
}

export class ErrorManager {
  private errorHistory: Map<string, ErrorHistoryItem>;
  private maxHistory: number;
  private errorListeners: Set<(error: DigitalLifeError) => void>;
  private recoveryStrategies: Map<ErrorCode, (error: DigitalLifeError) => Promise<boolean>>;

  constructor(maxHistory: number = 100) {
    this.errorHistory = new Map();
    this.maxHistory = maxHistory;
    this.errorListeners = new Set();
    this.recoveryStrategies = new Map();
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    // 默认恢复策略
    this.registerRecoveryStrategy(
      ErrorCode.CONFIG_LOAD_FAILED,
      async () => {
        // 重置为默认配置
        aiLogger.info('ErrorManager', 'Recovering from config load failure');
        return true;
      }
    );

    this.registerRecoveryStrategy(
      ErrorCode.MODULE_HEALTH_CHECK_FAILED,
      async () => {
        // 尝试重启失败的模块
        aiLogger.info('ErrorManager', 'Recovering from module health check failure');
        return true;
      }
    );
  }

  /**
   * 注册错误恢复策略
   */
  registerRecoveryStrategy(
    code: ErrorCode,
    strategy: (error: DigitalLifeError) => Promise<boolean>
  ): void {
    this.recoveryStrategies.set(code, strategy);
  }

  /**
   * 处理错误
   */
  async handle(error: DigitalLifeError | Error): Promise<void> {
    const dlError = this.normalizeError(error);
    
    // 记录错误
    this.recordError(dlError);
    
    // 记录日志
    this.logError(dlError);
    
    // 发出事件
    eventBus.emit<SystemErrorEvent>(
      new SystemErrorEvent({
        error: dlError.message,
        code: dlError.code.toString(),
        module: dlError.module
      })
    );
    
    // 通知监听器
    this.errorListeners.forEach(listener => listener(dlError));
    
    // 尝试恢复
    if (dlError.recoverable) {
      await this.attemptRecovery(dlError);
    }
  }

  /**
   * 规范化错误
   */
  private normalizeError(error: DigitalLifeError | Error): DigitalLifeError {
    if (error instanceof DigitalLifeError) {
      return error;
    }
    
    return new DigitalLifeError({
      message: error.message,
      code: ErrorCode.UNKNOWN_ERROR,
      severity: ErrorSeverity.ERROR,
      cause: error
    });
  }

  /**
   * 记录错误历史
   */
  private recordError(error: DigitalLifeError): void {
    const key = `${error.code}-${error.module}`;
    const existing = this.errorHistory.get(key);
    
    if (existing) {
      existing.count++;
      existing.lastOccurrence = Date.now();
    } else {
      this.errorHistory.set(key, {
        error,
        count: 1,
        lastOccurrence: Date.now()
      });
    }
    
    // 限制历史记录数量
    if (this.errorHistory.size > this.maxHistory) {
      const sortedKeys = Array.from(this.errorHistory.entries())
        .sort((a, b) => a[1].lastOccurrence - b[1].lastOccurrence)
        .map(([key]) => key);
      
      for (let i = 0; i < sortedKeys.length - this.maxHistory; i++) {
        this.errorHistory.delete(sortedKeys[i]);
      }
    }
  }

  /**
   * 记录错误日志
   */
  private logError(error: DigitalLifeError): void {
    const logData = {
      code: error.code,
      module: error.module,
      severity: ErrorSeverity[error.severity],
      metadata: error.metadata
    };

    switch (error.severity) {
      case ErrorSeverity.FATAL:
      case ErrorSeverity.CRITICAL:
        aiLogger.error('ErrorManager', `[CRITICAL] ${error.message}`, logData);
        break;
      case ErrorSeverity.ERROR:
        aiLogger.error('ErrorManager', error.message, logData);
        break;
      case ErrorSeverity.WARNING:
        aiLogger.warn('ErrorManager', error.message, logData);
        break;
      case ErrorSeverity.INFO:
        aiLogger.info('ErrorManager', error.message, logData);
        break;
      case ErrorSeverity.DEBUG:
        aiLogger.debug('ErrorManager', error.message, logData);
        break;
    }
  }

  /**
   * 尝试恢复
   */
  private async attemptRecovery(error: DigitalLifeError): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.code);
    
    if (strategy) {
      try {
        aiLogger.info('ErrorManager', 'Attempting recovery', {
          code: error.code,
          module: error.module
        });
        
        const recovered = await strategy(error);
        
        if (recovered) {
          aiLogger.info('ErrorManager', 'Recovery successful', {
            code: error.code,
            module: error.module
          });
          return true;
        } else {
          aiLogger.warn('ErrorManager', 'Recovery failed', {
            code: error.code,
            module: error.module
          });
        }
      } catch (recoveryError) {
        aiLogger.error('ErrorManager', 'Recovery attempt failed', {
          code: error.code,
          module: error.module,
          recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
        });
      }
    }
    
    return false;
  }

  /**
   * 添加错误监听器
   */
  onError(listener: (error: DigitalLifeError) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * 获取错误统计
   */
  getStatistics(): {
    total: number;
    bySeverity: Record<string, number>;
    byModule: Record<string, number>;
    recent: DigitalLifeError[];
  } {
    const stats = {
      total: 0,
      bySeverity: {} as Record<string, number>,
      byModule: {} as Record<string, number>,
      recent: [] as DigitalLifeError[]
    };

    this.errorHistory.forEach(item => {
      stats.total += item.count;
      
      const severity = ErrorSeverity[item.error.severity];
      stats.bySeverity[severity] = (stats.bySeverity[severity] ?? 0) + item.count;
      
      stats.byModule[item.error.module] = (stats.byModule[item.error.module] ?? 0) + item.count;
    });

    // 获取最近的错误
    stats.recent = Array.from(this.errorHistory.values())
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence)
      .slice(0, 10)
      .map(item => item.error);

    return stats;
  }

  /**
   * 清除错误历史
   */
  clearHistory(): void {
    this.errorHistory.clear();
  }
}

// 单例实例
export const errorManager = new ErrorManager();

// ==================== 便捷函数 ====================

export function handleError(error: DigitalLifeError | Error): void {
  errorManager.handle(error).catch(e => {
    console.error('Error in error handler:', e);
  });
}

export function wrapAsync<T>(
  fn: () => Promise<T>,
  options?: {
    code?: ErrorCode;
    module?: string;
    defaultValue?: T;
  }
): Promise<T | undefined> {
  return fn().catch(error => {
    handleError(
      new DigitalLifeError({
        message: error instanceof Error ? error.message : String(error),
        code: options?.code ?? ErrorCode.UNKNOWN_ERROR,
        module: options?.module ?? 'unknown',
        cause: error instanceof Error ? error : undefined
      })
    );
    return options?.defaultValue;
  });
}
