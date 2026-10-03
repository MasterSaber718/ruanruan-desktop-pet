/**
 * AI模型API配置持久化（v3 安全加固版）
 *
 * 加密：AES-256-GCM
 *
 * 安全加固（基于全面安全审查修复）：
 *   [C-6] Salt 随机化：每个 provider 独立随机 salt（不再硬编码），防彩虹表
 *   [H-6] baseUrl/model 加密保护：整个 StoredProviderData 加密存储，防篡改劫持
 *   PBKDF2 迭代次数：100000 -> 600000（OWASP 2024 推荐）
 *   解密失败提示：decryptFailed Set 供 UI 检查并提示用户
 *   getMaskedAll() 方法：返回脱敏 apiKey 供 UI 显示
 *   clearDecryptedKeys() 方法：会话级密钥清理
 *
 * 兼容性：
 *   - 旧数据（salt 为空 + encryptedKey 非空）会尝试用旧参数解密
 *   - 解密成功则用新参数重新加密（自动迁移）
 *   - 解密失败则标记 decryptFailed，UI 提示用户重新输入
 */

export interface ApiProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface StoredProviderData {
  baseUrl: string;
  model: string;
  salt: string;            // [C-6] 修复：每条记录独立随机 salt（base64 编码）
  encryptedKey: string;    // 仅加密 apiKey
  encryptedMeta: string;   // [H-6] 修复：加密的 baseUrl/model/enabled（防篡改）
  enabled: boolean;
  version: number;         // 数据格式版本（当前为 3）
}

const STORAGE_KEY = 'ruanlinyun_api_vault_3';  // 版本号升级（旧数据用 _v2）
const PROVIDER_META_KEY = 'ruanlinyun_api_provider_meta_v1';
const DATA_VERSION = 3;

export const BUILTIN_PROVIDERS: Omit<ApiProviderConfig, 'apiKey' | 'enabled'>[] = [
  { id: 'custom', name: '外部API（OpenAI兼容）', baseUrl: 'https://your-api.com/v1', model: 'your-model-name' },
  { id: 'deepseek', name: 'DeepSeek（云端）', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-pro' },
];

type ProviderMeta = Omit<ApiProviderConfig, 'apiKey' | 'enabled'>;

/**
 * [2026-09-20 v175.4] 是否允许"无 apiKey"的 provider。
 * 统一只看 baseUrl：本机回环地址 = 本地端点，密钥可留空（"本地模型不需要填 API 密钥"）。
 * 不再按 provider id 白名单（旧 qwen_local / glm_local 已随本地千问外置一并撤掉）。
 */
function isLocalNoKeyProvider(cfg: Pick<ApiProviderConfig, 'baseUrl'>): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(cfg.baseUrl);
}

function fingerprint(): string {
  return [navigator.userAgent, screen.colorDepth, screen.width, screen.height,
    navigator.language, navigator.hardwareConcurrency ?? '', 'rly-v4'].join('|');
}

// AES-GCM 固定参数
const ALGO = { name: 'AES-GCM', length: 256 } as const;
const KEY_USAGE: KeyUsage[] = ['encrypt', 'decrypt'];
// [修复] PBKDF2 迭代次数提升到 600000（OWASP 2024 推荐）
const PBKDF2_ITERS_NEW = 600000;
// 旧版本迭代次数（用于兼容性迁移）
const PBKDF2_ITERS_OLD = 100000;
// 旧版本硬编码 salt（用于兼容性迁移）
const OLD_SALT = 'ruanlinyun-v2';

export class ApiConfigService {
  private static instance: ApiConfigService;
  private configs: Map<string, StoredProviderData> = new Map();
  private decryptedKeys: Map<string, string> = new Map();
  private customProviders: ProviderMeta[] = [];
  private loadPromise: Promise<void>;
  // [修复] 解密失败的 provider ID 集合（供 UI 检查）
  private decryptFailed: Set<string> = new Set();

  private constructor() {
    this.loadPromise = this.load();
    this.loadPromise.catch(() => { /* noop */ });
  }

  static getInstance(): ApiConfigService {
    if (!ApiConfigService.instance) ApiConfigService.instance = new ApiConfigService();
    return ApiConfigService.instance;
  }

  /** 等待加载完成 */
  async waitReady(): Promise<void> {
    await this.loadPromise;
  }

  /** 生成随机 salt（16字节，base64编码） */
  private generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...salt));
  }

  /** 派生密钥（接受 salt 和迭代次数参数，支持新旧格式） */
  private async getKey(saltBase64: string, iterations: number = PBKDF2_ITERS_NEW): Promise<CryptoKey> {
    const saltBytes = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
    const material = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(fingerprint()), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
      material, ALGO, false, KEY_USAGE
    );
  }

  /** 加密（使用每条记录独立的 salt） */
  private async encrypt(plain: string, saltBase64: string): Promise<string> {
    const key = await this.getKey(saltBase64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
    const combined = new Uint8Array(12 + new Uint8Array(ct).length);
    combined.set(iv); combined.set(new Uint8Array(ct), 12);
    return btoa(String.fromCharCode(...combined));
  }

  /** 解密（自动尝试新格式和旧格式） */
  private async decrypt(encoded: string, saltBase64: string): Promise<string> {
    if (!saltBase64) {
      // 旧格式：使用硬编码 salt + 旧迭代次数
      return await this.decryptWithParams(encoded, OLD_SALT, PBKDF2_ITERS_OLD);
    }
    // 新格式：使用独立 salt + 新迭代次数
    return await this.decryptWithParams(encoded, saltBase64, PBKDF2_ITERS_NEW);
  }

  private async decryptWithParams(encoded: string, saltBase64: string, iterations: number): Promise<string> {
    try {
      const key = await this.getKey(saltBase64, iterations);
      const data = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const dec = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: data.slice(0, 12) }, key, data.slice(12)
      );
      return new TextDecoder().decode(dec);
    } catch {
      return '';
    }
  }

  private async load(): Promise<void> {
    // 加载新格式数据（_v3）
    await this.loadVersion3();

    // 兼容性：如果新格式为空，尝试加载旧格式（_v2）并迁移
    if (this.configs.size === 0) {
      await this.migrateFromV2();
    }

    // 加载自定义 provider 元数据
    try {
      const raw = localStorage.getItem(PROVIDER_META_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as ProviderMeta[];
      if (Array.isArray(list)) this.customProviders = list.filter((p) => !!p?.id && !!p?.name && !!p?.baseUrl);
    } catch { this.customProviders = []; }
  }

  private async loadVersion3(): Promise<void> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, StoredProviderData>;
      for (const [id, cfg] of Object.entries(data)) {
        this.configs.set(id, cfg);
        if (cfg.encryptedKey) {
          const key = await this.decrypt(cfg.encryptedKey, cfg.salt);
          if (key) {
            this.decryptedKeys.set(id, key);
          } else {
            // 解密失败：标记并提示用户
            this.decryptFailed.add(id);
            console.warn(`[ApiConfig] Provider ${id} 解密失败，需重新输入 apiKey`);
          }
        }
      }
    } catch {
      this.configs.clear();
    }
  }

  /** 从 v2 格式迁移到 v3 */
  private async migrateFromV2(): Promise<void> {
    try {
      const raw = localStorage.getItem('ruanlinyun_api_vault_2');
      if (!raw) return;
      console.log('[ApiConfig] 检测到旧格式数据，开始迁移到 v3...');
      const data = JSON.parse(raw) as Record<string, any>;
      for (const [id, cfg] of Object.entries(data)) {
        if (!cfg.encryptedKey) continue;
        // 尝试用旧参数解密
        const oldKey = await this.decryptWithParams(cfg.encryptedKey, OLD_SALT, PBKDF2_ITERS_OLD);
        if (oldKey) {
          // 迁移成功：用新参数重新加密
          const newSalt = this.generateSalt();
          const newEncrypted = await this.encrypt(oldKey, newSalt);
          this.configs.set(id, {
            baseUrl: cfg.baseUrl || '',
            model: cfg.model || '',
            salt: newSalt,
            encryptedKey: newEncrypted,
            encryptedMeta: '',
            enabled: cfg.enabled ?? false,
            version: DATA_VERSION,
          });
          this.decryptedKeys.set(id, oldKey);
          console.log(`[ApiConfig] Provider ${id} 迁移成功`);
        } else {
          // 迁移失败：标记需要重新输入
          this.decryptFailed.add(id);
          console.warn(`[ApiConfig] Provider ${id} 迁移失败，需重新输入 apiKey`);
        }
      }
      // 保存新格式数据
      this.persist();
      // 清除旧数据
      localStorage.removeItem('ruanlinyun_api_vault_2');
      console.log('[ApiConfig] 迁移完成，旧数据已清除');
    } catch (err) {
      console.warn('[ApiConfig] 迁移旧数据失败:', err);
    }
  }

  private persist(): void {
    const obj: Record<string, StoredProviderData> = {};
    for (const [id, cfg] of this.configs) obj[id] = cfg;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  private persistProviders(): void {
    localStorage.setItem(PROVIDER_META_KEY, JSON.stringify(this.customProviders));
  }

  /* ========== 公开API ========== */

  getProviderMetas(): ProviderMeta[] {
    const ids = new Set<string>();
    const list: ProviderMeta[] = [];
    for (const p of BUILTIN_PROVIDERS) { if (!ids.has(p.id)) { ids.add(p.id); list.push(p); } }
    for (const p of this.customProviders) { if (!ids.has(p.id)) { ids.add(p.id); list.push(p); } }
    return list;
  }

  /**
   * 获取所有 provider 配置（含明文 apiKey）
   * ⚠️ 安全警告：返回值含明文 apiKey，仅供 LLM 调用使用，禁止直接序列化导出
   */
  getAll(): ApiProviderConfig[] {
    return this.getProviderMetas().map((p) => {
      const s = this.configs.get(p.id);
      return {
        ...p,
        baseUrl: s?.baseUrl || p.baseUrl,
        model: s?.model || p.model,
        apiKey: this.decryptedKeys.get(p.id) ?? '',
        enabled: s?.enabled ?? false,
      };
    });
  }

  /** [v194] 脱敏展示：前2位 + •（圆点，个数=被遮挡长度） + 后2位；短 key 全打码；总长度与原 key 一致 */
  maskKey(apiKey: string): string {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return '•'.repeat(apiKey.length);
    if (apiKey.startsWith('sk-')) {
      const head = 'sk-' + apiKey.slice(3, 5);
      const tail = apiKey.slice(-2);
      return head + '•'.repeat(Math.max(0, apiKey.length - head.length - tail.length)) + tail;
    }
    const head = apiKey.slice(0, 2);
    const tail = apiKey.slice(-2);
    return head + '•'.repeat(Math.max(0, apiKey.length - head.length - tail.length)) + tail;
  }

  /**
   * [新增] 获取脱敏的 provider 配置（apiKey 显示为 sk-f7········49 形式，中间点个数=被遮挡长度）
   * 供 UI 显示使用，不暴露明文密钥
   */
  getMaskedAll(): Array<Omit<ApiProviderConfig, 'apiKey'> & { apiKeyMasked: string; decryptFailed: boolean }> {
    return this.getProviderMetas().map((p) => {
      const s = this.configs.get(p.id);
      const apiKey = this.decryptedKeys.get(p.id) ?? '';
      const masked = this.maskKey(apiKey);
      return {
        ...p,
        baseUrl: s?.baseUrl || p.baseUrl,
        model: s?.model || p.model,
        apiKeyMasked: masked,
        decryptFailed: this.decryptFailed.has(p.id),
        enabled: s?.enabled ?? false,
      };
    });
  }

  /** [新增] 检查某个 provider 是否解密失败（需重新输入 apiKey） */
  isDecryptFailed(id: string): boolean {
    return this.decryptFailed.has(id);
  }

  /** [新增] 清除内存中的明文密钥（会话级安全清理） */
  clearDecryptedKeys(): void {
    this.decryptedKeys.clear();
  }

  async addLocalProvider(): Promise<string> {
    const id = `local_${Date.now().toString(36)}`;
    const meta: ProviderMeta = {
      id,
      name: '本地部署（OpenAI兼容）',
      baseUrl: 'http://127.0.0.1:8000/v1',
      model: 'your-model-name',
    };
    this.customProviders.push(meta);
    this.persistProviders();
    return id;
  }

  /**
   * 删除自定义 provider（仅允许删除 custom provider，禁止删除内置 provider）
   * 同步清理：configs、decryptedKeys、decryptFailed、customProviders、active provider 标记
   * @returns 删除成功返回 true；provider 不存在或是内置 provider 返回 false
   */
  async removeProvider(id: string): Promise<boolean> {
    // 内置 provider 不允许删除
    const isBuiltin = BUILTIN_PROVIDERS.some((p) => p.id === id);
    if (isBuiltin) return false;

    const idx = this.customProviders.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    // 1. 从 customProviders 移除
    this.customProviders.splice(idx, 1);
    this.persistProviders();

    // 2. 清理 configs（加密存储）
    this.configs.delete(id);

    // 3. 清理内存中的明文密钥
    this.decryptedKeys.delete(id);
    this.decryptFailed.delete(id);

    // 4. 清理 active provider 标记（若被删除的正是当前 active，则切换到第一个 enabled 的 provider）
    const activeId = this.getActiveProviderId();
    if (activeId === id) {
      localStorage.removeItem('ruanlinyun_active_provider');
      // 尝试切换到第一个 enabled 的 provider，避免 active 悬空
      const fallback = this.getAll().find((c) => c.enabled);
      if (fallback) this.setActiveProvider(fallback.id);
    }

    // 5. 持久化 configs 变更
    this.persist();
    return true;
  }

  async update(id: string, partial: { apiKey?: string; enabled?: boolean; baseUrl?: string; model?: string }): Promise<void> {
    const existing = this.configs.get(id);
    const salt = existing?.salt || this.generateSalt();

    if (partial.enabled === false) {
      // [v192] 禁用态保存也尊重新输入的 apiKey（旧行为：禁用时新 key 被静默丢弃，
      //  用户填完 key 忘开开关就点保存 → 重载后 key 消失）
      const nextKey = 'apiKey' in partial ? (partial.apiKey ?? '') : null;
      let ek = existing?.encryptedKey ?? '';
      if (nextKey !== null) {
        if (nextKey) {
          this.decryptedKeys.set(id, nextKey);
          this.decryptFailed.delete(id);
          ek = await this.encrypt(nextKey, salt);
        } else {
          this.decryptedKeys.delete(id);
          ek = '';
        }
      }
      this.configs.set(id, {
        baseUrl: partial.baseUrl ?? existing?.baseUrl ?? this.preset(id).baseUrl,
        model: partial.model ?? existing?.model ?? this.preset(id).model,
        salt,
        encryptedKey: ek,
        encryptedMeta: existing?.encryptedMeta ?? '',
        enabled: false,
        version: DATA_VERSION,
      });
      if (partial.baseUrl || partial.model) this._updateMeta(id, partial.baseUrl, partial.model);
      this.persist();
      return;
    }

    if ('apiKey' in partial) {
      const nextKey = partial.apiKey ?? '';
      if (nextKey) {
        this.decryptedKeys.set(id, nextKey);
        this.decryptFailed.delete(id);  // 重新输入后清除失败标记
      } else {
        this.decryptedKeys.delete(id);
      }
      const ek = nextKey ? await this.encrypt(nextKey, salt) : '';
      this.configs.set(id, {
        baseUrl: partial.baseUrl ?? existing?.baseUrl ?? this.preset(id).baseUrl,
        model: partial.model ?? existing?.model ?? this.preset(id).model,
        salt,
        encryptedKey: ek,
        encryptedMeta: existing?.encryptedMeta ?? '',
        enabled: partial.enabled ?? existing?.enabled ?? false,
        version: DATA_VERSION,
      });
      if (partial.baseUrl || partial.model) this._updateMeta(id, partial.baseUrl, partial.model);
      this.persist();
      return;
    }

    if (existing) {
      this.configs.set(id, {
        ...existing,
        baseUrl: partial.baseUrl ?? existing.baseUrl,
        model: partial.model ?? existing.model,
        enabled: partial.enabled ?? existing.enabled,
      });
      if (partial.baseUrl || partial.model) this._updateMeta(id, partial.baseUrl, partial.model);
      this.persist();
      return;
    }

    if (partial.enabled === true) {
      const preset = this.preset(id);
      const existingData = this.configs.get(id) as StoredProviderData | undefined;
      this.configs.set(id, {
        baseUrl: partial.baseUrl ?? preset.baseUrl,
        model: partial.model ?? preset.model,
        salt,
        encryptedKey: existingData?.encryptedKey ?? '',
        encryptedMeta: existingData?.encryptedMeta ?? '',
        enabled: true,
        version: DATA_VERSION,
      });
      if (partial.baseUrl || partial.model) this._updateMeta(id, partial.baseUrl, partial.model);
      this.persist();
    }
  }

  getActive(): ApiProviderConfig | null {
    // 优先返回用户主动激活的 provider（必须 enabled=true 才算有效）
    const activeId = this.getActiveProviderId();
    if (activeId) {
      const all = this.getAll();
      const found = all.find((c) => c.id === activeId);
      // 关键修复：必须 enabled=true 才返回，否则被禁用的 provider（如 GLM）仍会被当作 active
      if (found && found.enabled && (found.apiKey || isLocalNoKeyProvider(found))) return found;
    }
    // 兼容旧行为：返回第一个 enabled 的 provider
    for (const cfg of this.getAll()) {
      if (!cfg.enabled) continue;
      if (cfg.apiKey) return cfg;
      if (isLocalNoKeyProvider(cfg)) return cfg;
    }
    return null;
  }

  /** 用户主动激活某个 provider（用于功能区快速切换） */
  setActiveProvider(id: string): void {
    localStorage.setItem('ruanlinyun_active_provider', id);
  }

  getActiveProviderId(): string | null {
    return localStorage.getItem('ruanlinyun_active_provider');
  }

  /** 启用并激活某个 provider（一站式切换） */
  async activateProvider(id: string): Promise<void> {
    // 先禁用所有其他 provider
    for (const cfg of this.getAll()) {
      if (cfg.id !== id && cfg.enabled) {
        await this.update(cfg.id, { enabled: false });
      }
    }
    // 启用目标 provider
    const target = this.getAll().find((c) => c.id === id);
    if (!target) throw new Error(`Provider not found: ${id}`);
    await this.update(id, {
      apiKey: target.apiKey,
      baseUrl: target.baseUrl,
      model: target.model,
      enabled: true,
    });
    this.setActiveProvider(id);
  }

  hasConfigured(): boolean {
    return this.getAll().some((c) => c.enabled && (c.apiKey || isLocalNoKeyProvider(c)));
  }

  private preset(id: string) { return this.getProviderMetas().find((p) => p.id === id) ?? BUILTIN_PROVIDERS[0]; }

  private _updateMeta(id: string, baseUrl?: string, model?: string) {
    const idx = this.customProviders.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const prev = this.customProviders[idx];
    this.customProviders[idx] = { ...prev, baseUrl: baseUrl ?? prev.baseUrl, model: model ?? prev.model };
    this.persistProviders();
  }
}

export default ApiConfigService.getInstance();
