/**
 * IM Bot 适配器注册表 [v59]
 * 管理所有已注册的 IM 平台适配器
 */
import { IMBotAdapter } from './IMBotAdapter';

class BotAdapterRegistry {
  private adapters = new Map<string, IMBotAdapter>();
  private activeType: string | null = null;

  /** 注册适配器 */
  register(adapter: IMBotAdapter): void {
    if (this.adapters.has(adapter.type)) {
      console.warn(`[BotRegistry] 适配器 "${adapter.type}" 已存在，将被覆盖`);
    }
    this.adapters.set(adapter.type, adapter);
    console.log(`[BotRegistry] 已注册: ${adapter.name} (${adapter.type})`);
  }

  /** 获取适配器 */
  get(type: string): IMBotAdapter | undefined {
    return this.adapters.get(type);
  }

  /** 获取当前活跃适配器 */
  getActive(): IMBotAdapter | undefined {
    if (!this.activeType) return undefined;
    return this.adapters.get(this.activeType);
  }

  /** 设置活跃适配器 */
  setActive(type: string): boolean {
    if (!this.adapters.has(type)) return false;
    this.activeType = type;
    return true;
  }

  /** 获取活跃适配器类型 */
  getActiveType(): string | null {
    return this.activeType;
  }

  /** 列出所有已注册适配器 */
  list(): Array<{ type: string; name: string; active: boolean }> {
    return Array.from(this.adapters.values()).map((a) => ({
      type: a.type,
      name: a.name,
      active: a.type === this.activeType,
    }));
  }

  /** 销毁所有适配器 */
  destroyAll(): void {
    for (const adapter of this.adapters.values()) {
      adapter.destroy();
    }
    this.adapters.clear();
    this.activeType = null;
  }
}

export const botRegistry = new BotAdapterRegistry();
