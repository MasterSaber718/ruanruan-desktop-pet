/**
 * ============================================================================
 * 模块管理器 - Module Manager
 * ============================================================================
 * 
 * 统一管理所有AI模块的生命周期、依赖关系和状态
 */

import { BaseModule, ModuleStatus, SystemHealth, Metrics } from './core/types';
import { eventBus, SystemStartEvent, SystemStopEvent } from './core/EventBus';
import { aiLogger } from './AILogger';

export interface ModuleConfig {
  autoStart?: boolean;
  dependencies?: string[];
  priority?: number;
}

export interface ModuleRegistryEntry {
  module: BaseModule;
  config: ModuleConfig;
  instance?: BaseModule;
}

export class ModuleManager {
  private modules: Map<string, ModuleRegistryEntry> = new Map();
  private startedModules: Set<string> = new Set();
  private startupOrder: string[] = [];

  register<T extends BaseModule>(name: string, moduleClass: new () => T, config: ModuleConfig = {}): void {
    this.modules.set(name, {
      module: moduleClass as unknown as BaseModule,
      config: {
        autoStart: true,
        dependencies: [],
        priority: 0,
        ...config
      }
    });

    aiLogger.info('ModuleManager', `Registered module: ${name}`);
  }

  async startModule(name: string): Promise<boolean> {
    const entry = this.modules.get(name);
    if (!entry) {
      aiLogger.error('ModuleManager', `Module not found: ${name}`);
      return false;
    }

    if (this.startedModules.has(name)) {
      aiLogger.warn('ModuleManager', `Module already started: ${name}`);
      return true;
    }

    await this.startDependencies(name);

    try {
      if (!entry.instance) {
        entry.instance = new (entry.module.constructor as new () => BaseModule)();
      }

      await entry.instance.initialize();
      await entry.instance.start();

      this.startedModules.add(name);
      this.startupOrder.push(name);

      aiLogger.info('ModuleManager', `Started module: ${name}`);
      eventBus.emit({ type: 'module:started', payload: { name } });

      return true;
    } catch (error) {
      aiLogger.error('ModuleManager', `Failed to start module: ${name}`, {
        error: error instanceof Error ? error.message : String(error)
      });

      eventBus.emit({
        type: 'module:error',
        payload: {
          name,
          error: error instanceof Error ? error.message : String(error),
          code: 'START_FAILED'
        }
      });

      return false;
    }
  }

  private async startDependencies(name: string): Promise<void> {
    const entry = this.modules.get(name);
    if (!entry || !entry.config.dependencies) return;

    for (const depName of entry.config.dependencies) {
      if (!this.startedModules.has(depName)) {
        aiLogger.debug('ModuleManager', `Starting dependency: ${depName} for ${name}`);
        await this.startModule(depName);
      }
    }
  }

  async stopModule(name: string): Promise<boolean> {
    const entry = this.modules.get(name);
    if (!entry || !entry.instance) {
      aiLogger.warn('ModuleManager', `Module not running: ${name}`);
      return false;
    }

    try {
      await entry.instance.stop();
      await entry.instance.destroy();

      this.startedModules.delete(name);
      const index = this.startupOrder.indexOf(name);
      if (index > -1) {
        this.startupOrder.splice(index, 1);
      }

      aiLogger.info('ModuleManager', `Stopped module: ${name}`);
      eventBus.emit({ type: 'module:stopped', payload: { name } });

      return true;
    } catch (error) {
      aiLogger.error('ModuleManager', `Failed to stop module: ${name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async startAll(): Promise<void> {
    aiLogger.info('ModuleManager', 'Starting all modules...');
    eventBus.emit(new SystemStartEvent());

    const sortedModules = Array.from(this.modules.entries())
      .sort((a, b) => (b[1].config.priority || 0) - (a[1].config.priority || 0));

    for (const [name, entry] of sortedModules) {
      if (entry.config.autoStart !== false) {
        await this.startModule(name);
      }
    }

    aiLogger.info('ModuleManager', 'All modules started');
  }

  async stopAll(): Promise<void> {
    aiLogger.info('ModuleManager', 'Stopping all modules...');

    for (const name of [...this.startupOrder].reverse()) {
      await this.stopModule(name);
    }

    eventBus.emit(new SystemStopEvent());
    aiLogger.info('ModuleManager', 'All modules stopped');
  }

  getModule(name: string): BaseModule | undefined {
    return this.modules.get(name)?.instance;
  }

  getStatus(name: string): ModuleStatus | undefined {
    const entry = this.modules.get(name);
    if (!entry?.instance) return undefined;
    return entry.instance.getStatus();
  }

  getAllStatuses(): Record<string, ModuleStatus> {
    const statuses: Record<string, ModuleStatus> = {};
    this.modules.forEach((entry, name) => {
      if (entry.instance) {
        statuses[name] = entry.instance.getStatus();
      }
    });
    return statuses;
  }

  async healthCheck(): Promise<SystemHealth> {
    let criticalCount = 0;
    let degradedCount = 0;

    for (const [, entry] of this.modules) {
      if (entry.instance) {
        const healthy = await entry.instance.healthCheck();
        if (!healthy) {
          const status = entry.instance.getStatus();
          if (status.health === 'critical') criticalCount++;
          else if (status.health === 'degraded') degradedCount++;
        }
      }
    }

    if (criticalCount > 0) return 'critical';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  async getMetrics(): Promise<Record<string, Partial<Metrics>>> {
    const metrics: Record<string, Partial<Metrics>> = {};
    for (const [name, entry] of this.modules) {
      if (entry.instance) {
        metrics[name] = await entry.instance.getMetrics();
      }
    }
    return metrics;
  }

  getRegisteredModules(): string[] {
    return Array.from(this.modules.keys());
  }

  getStartedModules(): string[] {
    return Array.from(this.startedModules);
  }

  isStarted(name: string): boolean {
    return this.startedModules.has(name);
  }
}

export const moduleManager = new ModuleManager();
