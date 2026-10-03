/**
 * ============================================================================
 * 配置管理系统 - Configuration Manager
 * ============================================================================
 *
 * 提供统一的配置管理，支持默认值、验证、环境变量覆盖
 */

import { ConfigMeta, ConfigStore, ConfigChangedEvent } from './types';
import { eventBus } from './EventBus';
import { aiLogger } from '../AILogger';

const STORAGE_KEY = 'digital_life_config';
const CONFIG_VERSION = '1.0.0';

export class ConfigManager implements ConfigStore {
  private config: Record<string, unknown>;
  private meta: Map<string, ConfigMeta>;
  private defaults: Record<string, unknown>;
  private initialized: boolean;

  constructor() {
    this.config = {};
    this.meta = new Map();
    this.defaults = {};
    this.initialized = false;
  }

  /**
   * 初始化配置系统
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    aiLogger.info('ConfigManager', 'Initializing configuration system');
    
    // 注册默认配置
    this.registerDefaultConfigs();
    
    // 从存储加载配置
    this.loadFromStorage();
    
    // 尝试从环境变量加载
    this.loadFromEnvironment();
    
    this.initialized = true;
    aiLogger.info('ConfigManager', 'Configuration system initialized');
  }

  /**
   * 注册默认配置项
   */
  private registerDefaultConfigs(): void {
    // 系统配置
    this.register({
      key: 'system.version',
      type: 'string',
      default: CONFIG_VERSION,
      description: '系统版本号'
    });

    this.register({
      key: 'system.name',
      type: 'string',
      default: '阮琳云',
      description: '系统名称'
    });

    this.register({
      key: 'system.autoSaveInterval',
      type: 'number',
      default: 60000,
      description: '自动保存间隔（毫秒）'
    });

    this.register({
      key: 'system.maxConcurrentTasks',
      type: 'number',
      default: 5,
      description: '最大并发任务数'
    });

    // 认知配置
    this.register({
      key: 'cognition.attentionThreshold',
      type: 'number',
      default: 0.7,
      description: '注意力阈值'
    });

    this.register({
      key: 'cognition.creativityLevel',
      type: 'number',
      default: 0.5,
      description: '创造力水平'
    });

    this.register({
      key: 'cognition.curiosityLevel',
      type: 'number',
      default: 0.8,
      description: '好奇心水平'
    });

    // 进化配置
    this.register({
      key: 'evolution.enabled',
      type: 'boolean',
      default: true,
      description: '是否启用进化系统'
    });

    this.register({
      key: 'evolution.autoEvolve',
      type: 'boolean',
      default: true,
      description: '是否自动进化'
    });

    // 记忆配置
    this.register({
      key: 'memory.shortTermCapacity',
      type: 'number',
      default: 50,
      description: '短期记忆容量'
    });

    this.register({
      key: 'memory.mediumTermCapacity',
      type: 'number',
      default: 500,
      description: '中期记忆容量'
    });

    this.register({
      key: 'memory.longTermCapacity',
      type: 'number',
      default: 5000,
      description: '长期记忆容量'
    });

    // 情绪配置
    this.register({
      key: 'emotion.enabled',
      type: 'boolean',
      default: true,
      description: '是否启用情绪系统'
    });

    this.register({
      key: 'emotion.decayRate',
      type: 'number',
      default: 0.05,
      description: '情绪衰减速度'
    });

    // 安全配置
    this.register({
      key: 'safety.enabled',
      type: 'boolean',
      default: true,
      description: '是否启用安全系统'
    });

    this.register({
      key: 'safety.autoRecovery',
      type: 'boolean',
      default: true,
      description: '是否启用自动恢复'
    });

    // 主动提问配置
    this.register({
      key: 'autonomousQuestioning.enabled',
      type: 'boolean',
      default: true,
      description: '是否启用主动提问'
    });

    this.register({
      key: 'autonomousQuestioning.idleThreshold',
      type: 'number',
      default: 30000,
      description: '空闲多久后主动提问（毫秒）'
    });
  }

  /**
   * 注册配置元数据
   */
  register(meta: ConfigMeta): void {
    this.meta.set(meta.key, meta);
    this.defaults[meta.key] = meta.default;
    
    // 如果配置中没有此键，设置默认值
    if (!(meta.key in this.config)) {
      this.config[meta.key] = meta.default;
    }
  }

  /**
   * 获取配置值
   */
  get<T = unknown>(key: string): T | undefined {
    return this.config[key] as T;
  }

  /**
   * 获取配置值，如果不存在则返回默认值
   */
  getOrDefault<T = unknown>(key: string, defaultValue: T): T {
    const value = this.get<T>(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * 设置配置值
   */
  set<T = unknown>(key: string, value: T, source: string = 'user'): void {
    const meta = this.meta.get(key);
    
    // 验证配置项是否已注册
    if (!meta) {
      aiLogger.warn('ConfigManager', 'Setting unregistered config key', { key });
    }

    // 验证值类型
    if (meta && !this.validateType(value, meta.type)) {
      throw new Error(`Invalid type for config ${key}: expected ${meta.type}`);
    }

    // 验证值
    if (meta?.validator && !meta.validator(value)) {
      throw new Error(`Invalid value for config ${key}`);
    }

    const oldValue = this.config[key];
    
    // 如果值没有变化，不做任何操作
    if (oldValue === value) return;

    // 更新配置
    this.config[key] = value;
    
    // 保存到存储
    this.saveToStorage();

    // 发出配置变更事件
    eventBus.emit<ConfigChangedEvent>({
      type: 'config:changed',
      payload: {
        key,
        oldValue,
        newValue: value,
        source
      }
    });

    aiLogger.debug('ConfigManager', 'Config updated', {
      key,
      source,
      hasOldValue: oldValue !== undefined
    });
  }

  /**
   * 验证值类型
   */
  private validateType(value: unknown, type: ConfigMeta['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * 检查配置是否存在
   */
  has(key: string): boolean {
    return key in this.config;
  }

  /**
   * 删除配置
   */
  delete(key: string): void {
    if (key in this.config) {
      const oldValue = this.config[key];
      delete this.config[key];
      this.saveToStorage();
      
      eventBus.emit<ConfigChangedEvent>({
        type: 'config:changed',
        payload: {
          key,
          oldValue,
          newValue: undefined,
          source: 'system'
        }
      });
    }
  }

  /**
   * 重置所有配置为默认值
   */
  reset(): void {
    this.config = { ...this.defaults };
    this.saveToStorage();
    
    aiLogger.info('ConfigManager', 'Configuration reset to defaults');
  }

  /**
   * 获取所有配置
   */
  getAll(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * 获取配置元数据
   */
  getMeta(key: string): ConfigMeta | undefined {
    return this.meta.get(key);
  }

  /**
   * 获取所有配置元数据
   */
  getAllMeta(): ConfigMeta[] {
    return Array.from(this.meta.values());
  }

  /**
   * 批量设置配置
   */
  batchSet(configs: Record<string, unknown>, source: string = 'batch'): void {
    Object.entries(configs).forEach(([key, value]) => {
      try {
        this.set(key, value, source);
      } catch (error) {
        aiLogger.error('ConfigManager', 'Failed to set config in batch', {
          key,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  /**
   * 从localStorage加载配置
   */
  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.config = { ...this.defaults, ...parsed };
          aiLogger.debug('ConfigManager', 'Configuration loaded from storage');
        }
      }
    } catch (error) {
      aiLogger.error('ConfigManager', 'Failed to load from storage', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 保存配置到localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // 过滤掉敏感配置
        const toSave: Record<string, unknown> = {};
        Object.entries(this.config).forEach(([key, value]) => {
          const meta = this.meta.get(key);
          if (!meta?.sensitive) {
            toSave[key] = value;
          }
        });
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      }
    } catch (error) {
      aiLogger.error('ConfigManager', 'Failed to save to storage', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnvironment(): void {
    // 在浏览器环境中，我们可以从URL参数或全局变量中读取
    try {
      // 检查是否有全局配置
      if (typeof window !== 'undefined' && (window as any).__DIGITAL_LIFE_CONFIG__) {
        const envConfig = (window as any).__DIGITAL_LIFE_CONFIG__;
        this.batchSet(envConfig, 'environment');
      }

      // 检查URL参数
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        params.forEach((value, key) => {
          if (key.startsWith('dlc_')) { // dlc = Digital Life Config
            const configKey = key.substring(4); // 去掉前缀
            const meta = this.meta.get(configKey);
            if (meta) {
              try {
                let parsedValue: unknown = value;
                if (meta.type === 'number') {
                  parsedValue = parseFloat(value);
                } else if (meta.type === 'boolean') {
                  parsedValue = value.toLowerCase() === 'true' || value === '1';
                } else if (meta.type === 'object' || meta.type === 'array') {
                  parsedValue = JSON.parse(value);
                }
                this.set(configKey, parsedValue, 'url_param');
              } catch {
                // 忽略解析错误
              }
            }
          }
        });
      }
    } catch (error) {
      aiLogger.error('ConfigManager', 'Failed to load from environment', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 导出配置
   */
  export(includeSensitive: boolean = false): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    Object.entries(this.config).forEach(([key, value]) => {
      const meta = this.meta.get(key);
      if (includeSensitive || !meta?.sensitive) {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * 导入配置
   */
  import(configs: Record<string, unknown>, source: string = 'import'): void {
    this.batchSet(configs, source);
  }
}

// 单例实例
export const configManager = new ConfigManager();

// 导出便捷方法
export function getConfig<T = unknown>(key: string): T | undefined {
  return configManager.get<T>(key);
}

export function setConfig<T = unknown>(key: string, value: T, source?: string): void {
  configManager.set<T>(key, value, source);
}

export function useConfig<T = unknown>(key: string, defaultValue: T): [T, (value: T) => void] {
  return [
    configManager.getOrDefault(key, defaultValue),
    (value: T) => configManager.set(key, value)
  ];
}
