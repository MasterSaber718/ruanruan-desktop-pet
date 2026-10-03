/**
 * ============================================================================
 * 性能与稳定性模块 - PerformanceAndStability
 * ============================================================================
 *
 * 确保AI系统的高性能和高稳定性：
 *
 * 1. 性能监控
 *    - 响应时间跟踪
 *    - 吞吐量监控
 *    - 资源使用追踪
 *
 * 2. 错误恢复
 *    - 自动降级机制
 *    - 重试策略
 *    - 回退方案
 *
 * 3. 熔断器模式
 *    - 故障检测
 *    - 快速失败
 *    - 自动恢复
 *
 * 4. 健康检查
 *    - 系统健康状态
 *    - 模块健康检查
 *    - 心跳机制
 *
 * 5. 内存管理
 *    - 内存泄漏检测
 *    - 缓存管理
 *    - 资源清理
 */

import { aiLogger } from './AILogger';

export interface PerformanceMetrics {
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  throughput: number;
  timestamp: number;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  modules: {
    [moduleName: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastCheck: number;
      issues: string[];
    };
  };
  uptime: number;
  memoryUsage: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'halfOpen';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class PerformanceAndStability {
  private performanceHistory: PerformanceMetrics[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private healthChecks: Map<string, () => boolean> = new Map();
  private retryPolicies: Map<string, RetryPolicy> = new Map();
  private moduleHealth: Map<string, { status: string; lastCheck: number; issues: string[] }> = new Map();
  private startTime: number = Date.now();
  private memoryCleanupInterval: number | null = null;
  private maxHistorySize: number = 100;

  private responseTimeBuffer: number[] = [];
  private readonly RESPONSE_TIME_BUFFER_SIZE = 100;

  constructor() {
    this.initializeDefaults();
    this.startMemoryCleanup();
  }

  private initializeDefaults(): void {
    const defaultCircuitBreaker: CircuitBreakerState = {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    };

    const modules = [
      'AIResponseService',
      'IntentRecognizer',
      'ReasoningEngine',
      'HumanLikeThinkingEngine',
      'NaturalLanguageSystem',
      'KnowledgeGraph',
      'MathematicalPhysicsEngine'
    ];

    modules.forEach(module => {
      this.circuitBreakers.set(module, { ...defaultCircuitBreaker });
      this.moduleHealth.set(module, {
        status: 'healthy',
        lastCheck: Date.now(),
        issues: []
      });
    });

    this.retryPolicies.set('default', {
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 5000,
      backoffMultiplier: 2
    });
  }

  // ==========================================
  // 性能监控
  // ==========================================

  /**
   * 记录响应时间
   */
  recordResponseTime(responseTime: number, success: boolean = true): void {
    this.responseTimeBuffer.push(responseTime);
    if (this.responseTimeBuffer.length > this.RESPONSE_TIME_BUFFER_SIZE) {
      this.responseTimeBuffer.shift();
    }

    const currentMetrics = this.getCurrentMetrics();
    if (success) {
      currentMetrics.successfulRequests++;
    } else {
      currentMetrics.failedRequests++;
    }
    currentMetrics.totalRequests++;

    if (this.performanceHistory.length >= this.maxHistorySize) {
      this.performanceHistory.shift();
    }
    this.performanceHistory.push(this.getMetricsSnapshot());

    aiLogger.debug('PerformanceAndStability', 'Response time recorded', {
      responseTime,
      success,
      avgResponseTime: currentMetrics.averageResponseTime
    });
  }

  private getCurrentMetrics(): PerformanceMetrics {
    if (this.performanceHistory.length === 0) {
      return this.getMetricsSnapshot();
    }
    return this.performanceHistory[this.performanceHistory.length - 1];
  }

  private getMetricsSnapshot(): PerformanceMetrics {
    const responseTimes = this.responseTimeBuffer.length > 0
      ? this.responseTimeBuffer
      : [0];

    const sum = responseTimes.reduce((a, b) => a + b, 0);
    const avg = sum / responseTimes.length;

    return {
      averageResponseTime: avg,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      totalRequests: this.performanceHistory.reduce((sum, m) => sum + m.totalRequests, 0),
      successfulRequests: this.performanceHistory.reduce((sum, m) => sum + m.successfulRequests, 0),
      failedRequests: this.performanceHistory.reduce((sum, m) => sum + m.failedRequests, 0),
      throughput: this.calculateThroughput(),
      timestamp: Date.now()
    };
  }

  private calculateThroughput(): number {
    const uptime = (Date.now() - this.startTime) / 1000;
    const totalRequests = this.performanceHistory.reduce((sum, m) => sum + m.totalRequests, 0);
    return uptime > 0 ? totalRequests / uptime : 0;
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.getMetricsSnapshot();
  }

  /**
   * 获取性能历史
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * 获取平均响应时间
   */
  getAverageResponseTime(): number {
    return this.getCurrentMetrics().averageResponseTime;
  }

  /**
   * 获取成功率
   */
  getSuccessRate(): number {
    const metrics = this.getCurrentMetrics();
    const total = metrics.successfulRequests + metrics.failedRequests;
    return total > 0 ? metrics.successfulRequests / total : 1;
  }

  // ==========================================
  // 熔断器模式
  // ==========================================

  /**
   * 检查熔断器状态
   */
  isCircuitBreakerOpen(module: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(module);
    if (!circuitBreaker) return false;

    if (circuitBreaker.state === 'closed') return false;

    if (circuitBreaker.state === 'open') {
      if (Date.now() >= circuitBreaker.nextAttemptTime) {
        this.circuitBreakers.set(module, {
          ...circuitBreaker,
          state: 'halfOpen'
        });
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * 记录熔断器失败
   */
  recordCircuitBreakerFailure(module: string): void {
    const circuitBreaker = this.circuitBreakers.get(module);
    if (!circuitBreaker) return;

    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = Date.now();

    if (circuitBreaker.state === 'halfOpen') {
      this.circuitBreakers.set(module, {
        ...circuitBreaker,
        state: 'open',
        nextAttemptTime: Date.now() + this.getRecoveryTimeout(module)
      });
      aiLogger.warn('PerformanceAndStability', 'Circuit breaker opened', { module });
    } else if (circuitBreaker.failureCount >= this.getFailureThreshold(module)) {
      this.circuitBreakers.set(module, {
        ...circuitBreaker,
        state: 'open',
        nextAttemptTime: Date.now() + this.getRecoveryTimeout(module)
      });
      aiLogger.warn('PerformanceAndStability', 'Circuit breaker opened due to failures', {
        module,
        failureCount: circuitBreaker.failureCount
      });
    }
  }

  /**
   * 记录熔断器成功
   */
  recordCircuitBreakerSuccess(module: string): void {
    const circuitBreaker = this.circuitBreakers.get(module);
    if (!circuitBreaker) return;

    if (circuitBreaker.state === 'halfOpen') {
      circuitBreaker.successCount++;
      if (circuitBreaker.successCount >= this.getSuccessThreshold(module)) {
        this.circuitBreakers.set(module, {
          state: 'closed',
          failureCount: 0,
          successCount: 0,
          lastFailureTime: 0,
          nextAttemptTime: 0
        });
        aiLogger.info('PerformanceAndStability', 'Circuit breaker closed', { module });
      }
    } else {
      circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
    }
  }

  private getFailureThreshold(module: string): number {
    const thresholds: Record<string, number> = {
      'AIResponseService': 10,
      'IntentRecognizer': 5,
      'ReasoningEngine': 5,
      'HumanLikeThinkingEngine': 3,
      'NaturalLanguageSystem': 3,
      'default': 5
    };
    return thresholds[module] || thresholds['default'];
  }

  private getSuccessThreshold(_module: string): number {
    return 3;
  }

  private getRecoveryTimeout(module: string): number {
    const timeouts: Record<string, number> = {
      'AIResponseService': 30000,
      'IntentRecognizer': 10000,
      'ReasoningEngine': 15000,
      'default': 20000
    };
    return timeouts[module] || timeouts['default'];
  }

  /**
   * 获取熔断器状态
   */
  getCircuitBreakerState(module: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(module) || null;
  }

  // ==========================================
  // 健康检查
  // ==========================================

  /**
   * 注册健康检查
   */
  registerHealthCheck(module: string, checkFn: () => boolean): void {
    this.healthChecks.set(module, checkFn);
  }

  /**
   * 执行健康检查
   */
  performHealthCheck(module: string): { healthy: boolean; issues: string[] } {
    const checkFn = this.healthChecks.get(module);
    if (!checkFn) {
      return { healthy: true, issues: [] };
    }

    try {
      const healthy = checkFn();
      const health = this.moduleHealth.get(module);
      if (health) {
        health.status = healthy ? 'healthy' : 'degraded';
        health.lastCheck = Date.now();
        if (!healthy) {
          health.issues.push(`Health check failed at ${new Date().toISOString()}`);
        }
      }
      return { healthy, issues: health?.issues || [] };
    } catch (error) {
      const health = this.moduleHealth.get(module);
      if (health) {
        health.status = 'unhealthy';
        health.lastCheck = Date.now();
        health.issues.push(`Health check error: ${error}`);
      }
      return {
        healthy: false,
        issues: [`Health check error: ${error}`]
      };
    }
  }

  /**
   * 执行所有健康检查
   */
  performAllHealthChecks(): HealthStatus {
    const modules: { [key: string]: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: number; issues: string[] } } = {};
    let overallHealthy = true;

    this.moduleHealth.forEach((_health, moduleName) => {
      const check = this.performHealthCheck(moduleName);
      modules[moduleName] = {
        status: check.healthy ? 'healthy' : 'degraded',
        lastCheck: Date.now(),
        issues: check.issues
      };
      if (!check.healthy) {
        overallHealthy = false;
      }
    });

    const memoryUsage = this.getMemoryUsage();

    return {
      overall: overallHealthy ? 'healthy' : memoryUsage > 0.9 ? 'unhealthy' : 'degraded',
      modules,
      uptime: Date.now() - this.startTime,
      memoryUsage
    };
  }

  /**
   * 获取系统健康状态
   */
  getHealthStatus(): HealthStatus {
    return this.performAllHealthChecks();
  }

  // ==========================================
  // 重试策略
  // ==========================================

  /**
   * 设置重试策略
   */
  setRetryPolicy(operation: string, policy: RetryPolicy): void {
    this.retryPolicies.set(operation, policy);
  }

  /**
   * 获取重试策略
   */
  getRetryPolicy(operation: string): RetryPolicy {
    return this.retryPolicies.get(operation) || this.retryPolicies.get('default')!;
  }

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    const policy = this.getRetryPolicy(operation);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < policy.maxRetries) {
          const delay = Math.min(
            policy.baseDelay * Math.pow(policy.backoffMultiplier, attempt),
            policy.maxDelay
          );

          if (onRetry) {
            onRetry(attempt + 1, lastError);
          }

          aiLogger.warn('PerformanceAndStability', 'Retry scheduled', {
            operation,
            attempt: attempt + 1,
            delay
          });

          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================
  // 内存管理
  // ==========================================

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return 0;
  }

  /**
   * 清理内存
   */
  cleanup(): void {
    if (this.performanceHistory.length > this.maxHistorySize / 2) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize / 2);
    }

    this.responseTimeBuffer = [];
    this.performanceHistory.push(this.getMetricsSnapshot());

    aiLogger.info('PerformanceAndStability', 'Memory cleanup performed', {
      memoryUsage: this.getMemoryUsage(),
      historySize: this.performanceHistory.length
    });
  }

  private startMemoryCleanup(): void {
    if (typeof window !== 'undefined') {
      this.memoryCleanupInterval = window.setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  stopMemoryCleanup(): void {
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }
  }

  // ==========================================
  // 系统统计
  // ==========================================

  /**
   * 获取系统运行时间
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 获取完整统计
   */
  getStatistics(): {
    uptime: number;
    performance: PerformanceMetrics;
    health: HealthStatus;
    circuitBreakers: { [key: string]: CircuitBreakerState };
    memoryUsage: number;
  } {
    return {
      uptime: this.getUptime(),
      performance: this.getPerformanceMetrics(),
      health: this.getHealthStatus(),
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      memoryUsage: this.getMemoryUsage()
    };
  }
}

export const performanceAndStability = new PerformanceAndStability();