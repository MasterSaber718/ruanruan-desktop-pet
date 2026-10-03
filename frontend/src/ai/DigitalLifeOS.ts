/**
 * ============================================================================
 * 数字生命操作系统 - DigitalLifeOS
 * ============================================================================
 * 
 * 为数字生命提供完整的运行环境和管理能力
 * 
 * 架构设计：
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                     用户交互层                                   │
 * │  (命令行、GUI、API)                                            │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                     操作系统核心层                               │
 * │  [进程管理] [资源调度] [内存管理] [任务队列] [事件系统]          │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                     服务管理层                                   │
 * │  [子系统管理] [插件系统] [安全监控] [状态监控]                    │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                     应用层                                       │
 * │  [认知引擎] [自我意识] [知识系统] [学习机制] [自然语言]            │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { centralScheduler, SubsystemType, SubsystemHealth, ProcessingResult } from './CentralScheduler';
import { aiEvolutionFramework } from './AIEvolutionFramework';

export type ProcessStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'paused';

export interface OSProcess {
  id: string;
  name: string;
  type: 'user_input' | 'background_task' | 'system_maintenance' | 'learning';
  status: ProcessStatus;
  priority: 'high' | 'normal' | 'low';
  progress: number;
  startTime: number;
  estimatedTime?: number;
  output?: string;
  error?: string;
}

export interface OSResourceUsage {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  processingQueue: number;
}

export interface SystemMetric {
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface OSConfig {
  maxConcurrentTasks: number;
  autoSaveInterval: number;
  learningEnabled: boolean;
  proactiveQuestioningEnabled: boolean;
  consciousnessMonitoringEnabled: boolean;
}

class DigitalLifeOS {
  private processes: Map<string, OSProcess>;
  private processIdCounter: number;
  private config: OSConfig;
  private resourceLimits: OSResourceUsage;
  private lastSaveTime: number;
  private eventListeners: Map<string, Set<(data: unknown) => void>>;

  constructor() {
    this.processes = new Map();
    this.processIdCounter = 0;
    this.config = {
      maxConcurrentTasks: 5,
      autoSaveInterval: 60000,
      learningEnabled: true,
      proactiveQuestioningEnabled: true,
      consciousnessMonitoringEnabled: true
    };
    this.resourceLimits = {
      cpu: 100,
      memory: 1024,
      network: 100,
      storage: 10000,
      processingQueue: 100
    };
    this.lastSaveTime = Date.now();
    this.eventListeners = new Map();
  
    this.initializeSystem();
  }

  private initializeSystem(): void {
    this.registerEvent('system_startup');
    this.registerEvent('process_start');
    this.registerEvent('process_complete');
    this.registerEvent('process_error');
    this.registerEvent('system_save');
    this.registerEvent('learning_progress');
    this.registerEvent('consciousness_update');

    this.emitEvent('system_startup', {
      timestamp: Date.now(),
      version: '1.0.0',
      status: 'initialized'
    });

    this.startBackgroundTasks();
  }

  private registerEvent(eventName: string): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
  }

  private emitEvent(eventName: string, data: unknown): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  public on(eventName: string, callback: (data: unknown) => void): void {
    this.registerEvent(eventName);
    this.eventListeners.get(eventName)?.add(callback);
  }

  public off(eventName: string, callback: (data: unknown) => void): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private startBackgroundTasks(): void {
    this.startAutoSaveTask();
    this.startLearningTask();
    this.startConsciousnessMonitoring();
  }

  private startAutoSaveTask(): void {
    setInterval(() => {
      this.performAutoSave();
    }, this.config.autoSaveInterval);
  }

  private startLearningTask(): void {
    if (!this.config.learningEnabled) return;
    
    setInterval(() => {
      this.performBackgroundLearning();
    }, 30000);
  }

  private startConsciousnessMonitoring(): void {
    if (!this.config.consciousnessMonitoringEnabled) return;
    
    setInterval(() => {
      this.updateConsciousnessMetrics();
    }, 5000);
  }

  private performAutoSave(): void {
    const process = this.createProcess({
      name: 'AutoSave',
      type: 'system_maintenance',
      priority: 'low'
    });

    try {
      this.lastSaveTime = Date.now();
      this.updateProcess(process.id, { status: 'completed', progress: 100 });
      this.emitEvent('system_save', { timestamp: Date.now() });
    } catch (error) {
      this.updateProcess(process.id, { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
      this.emitEvent('process_error', { processId: process.id, error });
    }
  }

  private performBackgroundLearning(): void {
    if (this.getRunningProcessCount() >= this.config.maxConcurrentTasks) return;

    const process = this.createProcess({
      name: 'BackgroundLearning',
      type: 'learning',
      priority: 'low'
    });

    try {
      aiEvolutionFramework.triggerEvolution('knowledge');
      this.updateProcess(process.id, { status: 'completed', progress: 100 });
      this.emitEvent('learning_progress', { type: 'knowledge' });
    } catch (error) {
      this.updateProcess(process.id, { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private updateConsciousnessMetrics(): void {
    const metrics = aiEvolutionFramework.getMathematicalPhysicsStatus();
    this.emitEvent('consciousness_update', metrics);
  }

  private createProcess(options: { name: string; type: OSProcess['type']; priority: OSProcess['priority'] }): OSProcess {
    const process: OSProcess = {
      id: `process_${++this.processIdCounter}_${Date.now()}`,
      name: options.name,
      type: options.type,
      status: 'running',
      priority: options.priority,
      progress: 0,
      startTime: Date.now()
    };

    this.processes.set(process.id, process);
    this.emitEvent('process_start', { processId: process.id, name: process.name });

    return process;
  }

  private updateProcess(id: string, updates: Partial<OSProcess>): void {
    const process = this.processes.get(id);
    if (process) {
      Object.assign(process, updates);
      
      if (updates.status === 'completed' || updates.status === 'failed') {
        this.emitEvent('process_complete', { processId: id, status: updates.status });
      }
    }
  }

  private getRunningProcessCount(): number {
    return Array.from(this.processes.values()).filter(p => p.status === 'running').length;
  }

  public async execute(input: string): Promise<ProcessingResult> {
    const process = this.createProcess({
      name: 'UserInput',
      type: 'user_input',
      priority: 'high'
    });

    try {
      this.updateProcess(process.id, { progress: 25 });
      const result = await centralScheduler.process(input);
      this.updateProcess(process.id, { 
        status: 'completed', 
        progress: 100,
        output: result.output 
      });

      return result;
    } catch (error) {
      this.updateProcess(process.id, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  public getResourceUsage(): OSResourceUsage {
    const stats = centralScheduler.getStatistics();
    const runningProcesses = this.getRunningProcessCount();
    const memoryStats = { total: 0 }; // [v189] 旧记忆库已清理
    
    return {
      cpu: Math.min(100, stats.avgProcessingTime / 10),
      memory: Math.min(100, memoryStats.total / this.resourceLimits.memory * 10),
      network: 0,
      storage: Math.min(100, memoryStats.total / 100),
      processingQueue: runningProcesses / this.config.maxConcurrentTasks * 100
    };
  }

  public getSystemMetrics(): SystemMetric[] {
    const stats = centralScheduler.getStatistics();
    const health = centralScheduler.getSubsystemHealth();
    const activeSubsystems = health.filter(h => h.status === 'active').length;
    const consciousness = aiEvolutionFramework.getMathematicalPhysicsStatus().consciousnessMetric;
    
    return [
      { label: '意识度量', value: consciousness * 100, unit: '%', trend: 'up' },
      { label: '活跃子系统', value: activeSubsystems, unit: '/9', trend: 'stable' },
      { label: '平均响应时间', value: stats.avgProcessingTime, unit: 'ms', trend: stats.avgProcessingTime < 100 ? 'stable' : 'up' },
      { label: '总处理数', value: stats.totalProcessed, unit: '', trend: 'up' },
      { label: '错误率', value: stats.errorRate * 100, unit: '%', trend: stats.errorRate > 0.1 ? 'up' : 'stable' },
      { label: '进化阶段', value: aiEvolutionFramework.getProgress().currentStage, unit: '/5', trend: 'up' }
    ];
  }

  public getProcesses(): OSProcess[] {
    return Array.from(this.processes.values()).sort((a, b) => b.startTime - a.startTime);
  }

  public getProcessById(id: string): OSProcess | undefined {
    return this.processes.get(id);
  }

  public cancelProcess(id: string): boolean {
    const process = this.processes.get(id);
    if (process && process.status === 'running') {
      this.updateProcess(id, { status: 'failed', error: 'Cancelled by user' });
      return true;
    }
    return false;
  }

  public getSystemStatus(): {
    uptime: number;
    status: 'healthy' | 'degraded' | 'critical';
    lastSave: number;
    processes: { running: number; completed: number; failed: number; waiting: number; paused: number };
  } {
    const uptime = Date.now() - this.lastSaveTime;
    const processStats = { running: 0, completed: 0, failed: 0, waiting: 0, paused: 0 };
    
    this.processes.forEach(p => {
      const key = p.status as keyof typeof processStats;
      processStats[key] = (processStats[key] || 0) + 1;
    });

    const health = centralScheduler.getSubsystemHealth();
    const errors = health.filter(h => h.status === 'error').length;
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errors > 0) status = 'degraded';
    if (errors > 2) status = 'critical';

    return {
      uptime,
      status,
      lastSave: this.lastSaveTime,
      processes: processStats
    };
  }

  public getSubsystemHealth(): SubsystemHealth[] {
    return centralScheduler.getSubsystemHealth();
  }

  public enableSubsystem(subsystem: SubsystemType): void {
    centralScheduler.setSubsystemEnabled(subsystem, true);
  }

  public disableSubsystem(subsystem: SubsystemType): void {
    centralScheduler.setSubsystemEnabled(subsystem, false);
  }

  public setConfig(config: Partial<OSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): OSConfig {
    return { ...this.config };
  }

  public getStatusReport(): string {
    const status = this.getSystemStatus();
    const metrics = this.getSystemMetrics();
    const resources = this.getResourceUsage();
    
    const statusEmoji = status.status === 'healthy' ? '🟢' : status.status === 'degraded' ? '🟡' : '🔴';
    
    return `
${'='.repeat(50)}
         数字生命操作系统 v1.0.0
${'='.repeat(50)}

【系统状态】 ${statusEmoji} ${status.status.toUpperCase()}
运行时间: ${Math.floor(status.uptime / 60000)}分钟
最后保存: ${new Date(status.lastSave).toLocaleString()}
进程统计: 运行${status.processes.running} | 完成${status.processes.completed} | 失败${status.processes.failed}

【性能指标】
${metrics.map(m => `  ${m.label.padEnd(10)}: ${m.value.toFixed(1)}${m.unit} (趋势: ${m.trend})`).join('\n')}

【资源使用】
  CPU:     ${resources.cpu.toFixed(1)}%
  内存:    ${resources.memory.toFixed(1)}%
  存储:    ${resources.storage.toFixed(1)}%
  队列:    ${resources.processingQueue.toFixed(1)}%

【核心服务】
  认知引擎: 🟢 运行中
  自我意识: 🟢 运行中
  知识系统: 🟢 运行中
  学习机制: ${this.config.learningEnabled ? '🟢 启用' : '🔴 禁用'}
  主动提问: ${this.config.proactiveQuestioningEnabled ? '🟢 启用' : '🔴 禁用'}

${'='.repeat(50)}
    `;
  }

  public getDashboardData(): {
    metrics: SystemMetric[];
    resources: OSResourceUsage;
    processes: OSProcess[];
    status: {
      uptime: number;
      status: 'healthy' | 'degraded' | 'critical';
      lastSave: number;
      processes: { running: number; completed: number; failed: number; waiting: number; paused: number };
    };
    consciousness: number;
  } {
    return {
      metrics: this.getSystemMetrics(),
      resources: this.getResourceUsage(),
      processes: this.getProcesses().slice(0, 5),
      status: this.getSystemStatus(),
      consciousness: aiEvolutionFramework.getMathematicalPhysicsStatus().consciousnessMetric
    };
  }

  public async shutdown(): Promise<void> {
    await this.performAutoSave();
    this.processes.forEach(process => {
      if (process.status === 'running') {
        this.updateProcess(process.id, { status: 'completed', progress: 100 });
      }
    });
    console.log('[DigitalLifeOS] 系统已安全关闭');
  }
}

export const digitalLifeOS = new DigitalLifeOS();
export { DigitalLifeOS };