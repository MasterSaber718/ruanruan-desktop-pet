
interface DeviceCapabilities {
  memory: {
    total: number;
    available: number;
  };
  gpu: {
    isWebGL2Supported: boolean;
    isWebGLSupported: boolean;
    hasDedicatedGPU: boolean;
    renderer: string;
  };
  cpu: {
    cores: number;
    basePerformance: number;
  };
}

export class DeviceOptimizer {
  private static instance: DeviceOptimizer;
  private deviceCapabilities: DeviceCapabilities;
  private optimizationLevel: 'low' | 'medium' | 'high' = 'high';
  private textureCache: Map<string, any> = new Map();
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * [修复 卡顿] 是否运行在移动设备上。
   * 原实现无视设备差异，一律返回桌面级"ULTRA"参数（4K 阴影贴图 / 8 光源 / 抗锯齿全开），
   * 这些参数放到手机 GPU 上必然掉帧甚至直接渲染失败，是移动端卡顿的系统性根因。
   */
  private isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    if (w.Capacitor?.isNativePlatform?.()) return true;
    const p = w.Capacitor?.getPlatform?.();
    if (p === 'android' || p === 'ios') return true;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  private constructor() {
    this.deviceCapabilities = this.detectCapabilities();
    // [修复 卡顿] 依据真实设备能力分档，而不是无条件锁死最高画质
    const mobile = this.isMobileDevice();
    const { cores } = this.deviceCapabilities.cpu;
    const mem = this.deviceCapabilities.memory.total;
    if (mobile) {
      // 手机：按核心数与内存再细分，低端机降到 low，避免直接卡死
      this.optimizationLevel = cores <= 4 || mem <= 4 ? 'low' : 'medium';
    } else {
      this.optimizationLevel = this.deviceCapabilities.gpu.hasDedicatedGPU ? 'high' : 'medium';
    }
    console.log(`[设备优化器] 画质等级: ${this.optimizationLevel.toUpperCase()} (移动端=${mobile}, 核心=${cores}, 内存=${mem}GB)`);
  }

  static getInstance(): DeviceOptimizer {
    if (!DeviceOptimizer.instance) {
      DeviceOptimizer.instance = new DeviceOptimizer();
    }
    return DeviceOptimizer.instance;
  }

  private detectCapabilities(): DeviceCapabilities {
    const capabilities: DeviceCapabilities = {
      memory: {
        total: (navigator as any).deviceMemory || 8,
        available: 2
      },
      gpu: {
        isWebGL2Supported: false,
        isWebGLSupported: false,
        hasDedicatedGPU: false,
        renderer: 'Unknown'
      },
      cpu: {
        cores: navigator.hardwareConcurrency || 4,
        basePerformance: 1
      }
    };

    try {
      const canvas = document.createElement('canvas');
      const gl2 = canvas.getContext('webgl2');
      const gl = gl2 || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      capabilities.gpu.isWebGL2Supported = !!gl2;
      capabilities.gpu.isWebGLSupported = !!gl;
      
      if (gl) {
        const webgl = gl as unknown as { 
          getExtension: (name: string) => any; 
          getParameter: (name: any) => any;
        };
        const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
          capabilities.gpu.renderer = renderer;
          const lowerRenderer = renderer.toLowerCase();
          const isIntelIntegrated = lowerRenderer.includes('intel') && !lowerRenderer.includes('iris');
          const isAmdIntegrated = lowerRenderer.includes('amd') && (
            lowerRenderer.includes('integrated') || 
            lowerRenderer.includes('vega') || 
            lowerRenderer.includes('hd graphics') ||
            lowerRenderer.includes('apu')
          );
          const isNvidia = lowerRenderer.includes('nvidia') || lowerRenderer.includes('geforce') || lowerRenderer.includes('quadro');
          const isAmdDedicated = lowerRenderer.includes('amd') && lowerRenderer.includes('rx');
          const isIntelDedicated = lowerRenderer.includes('iris');
          capabilities.gpu.hasDedicatedGPU = 
            isNvidia || isAmdDedicated || isIntelDedicated ||
            (!isIntelIntegrated && !isAmdIntegrated);
        }
      }
      // [修复 内存泄漏] 释放这个仅用于探测的 WebGL 上下文。
      //   浏览器对同时存在的 WebGL 上下文有硬性上限（移动端常见仅 8~16 个），
      //   探测用的上下文若不归还，会挤占额度，导致后续桌宠/模型预览
      //   创建上下文失败而黑屏；且它还持有一份 GPU 侧驱动资源无法回收。
      if (gl) {
        const loseCtx = (gl as any).getExtension?.('WEBGL_lose_context');
        loseCtx?.loseContext?.();
      }
      canvas.width = 0;
      canvas.height = 0;
    } catch (e) {
      console.warn('[DeviceOptimizer] GPU检测失败:', e);
    }

    try {
      const testStartTime = Date.now();
      for (let i = 0; i < 100000; i++) {
        Math.sqrt(i);
      }
      const testDuration = Date.now() - testStartTime;
      capabilities.cpu.basePerformance = Math.max(0.5, Math.min(2, 50 / testDuration));
    } catch (e) {
      console.warn('[设备优化器] CPU性能检测失败:', e);
    }

    return capabilities;
  }

  getDeviceCapabilities(): DeviceCapabilities {
    return this.deviceCapabilities;
  }

  getOptimizationLevel(): 'low' | 'medium' | 'high' {
    return this.optimizationLevel;
  }

  // 最高画质设置 - 无限制
  get3DRenderSettings(): {
    useWebGL2: boolean;
    antialiasing: boolean;
    shadows: boolean;
    textureResolution: 'low' | 'medium' | 'high';
    maxLights: number;
    shadowMapSize: number;
    pixelRatio: number;
  } {
    // [修复 卡顿] 按画质档位返回参数。
    //   原来无条件返回 4096 阴影贴图 + 8 光源 + 抗锯齿全开：
    //   一张 4096×4096 阴影贴图就要约 64MB 显存，中低端手机 GPU 直接掉到个位数帧率，
    //   部分机型甚至因显存不足而丢失 WebGL 上下文（表现为黑屏）。
    const level = this.optimizationLevel;
    const dpr = window.devicePixelRatio || 1;
    if (level === 'low') {
      return {
        useWebGL2: this.deviceCapabilities.gpu.isWebGL2Supported,
        antialiasing: false,       // 低端机抗锯齿开销高、收益低
        shadows: false,            // 阴影是最贵的一项，低端机直接关闭
        textureResolution: 'low',
        maxLights: 2,
        shadowMapSize: 512,
        pixelRatio: 1,             // 不做超采样，按物理像素 1:1
      };
    }
    if (level === 'medium') {
      return {
        useWebGL2: this.deviceCapabilities.gpu.isWebGL2Supported,
        antialiasing: false,
        shadows: true,
        textureResolution: 'medium',
        maxLights: 4,
        shadowMapSize: 1024,
        pixelRatio: Math.min(dpr, 1.5),
      };
    }
    return {
      useWebGL2: this.deviceCapabilities.gpu.isWebGL2Supported,
      antialiasing: true,
      shadows: true,
      textureResolution: 'high',
      maxLights: 8,
      shadowMapSize: 2048,         // 桌面端 2048 已足够，4096 收益极低而显存翻 4 倍
      pixelRatio: Math.min(dpr, 2),
    };
  }

  // 最大内存容量 - 无限制
  getMemorySettings(): {
    maxHistoryLength: number;
    maxWorkingMemoryItems: number;
    cleanupIntervalMinutes: number;
    maxCacheSize: number;
  } {
    // [修复 内存] 按档位收缩上限。低端手机堆内存常见仅 256~512MB，
    //   500 条历史 + 100 个工作内存项足以在长会话中把内存吃满并触发系统杀进程。
    const level = this.optimizationLevel;
    if (level === 'low') {
      return { maxHistoryLength: 100, maxWorkingMemoryItems: 20, cleanupIntervalMinutes: 10, maxCacheSize: 20 };
    }
    if (level === 'medium') {
      return { maxHistoryLength: 200, maxWorkingMemoryItems: 50, cleanupIntervalMinutes: 30, maxCacheSize: 50 };
    }
    return {
      maxHistoryLength: 500, // 更大的历史记录
      maxWorkingMemoryItems: 100, // 更多工作内存
      cleanupIntervalMinutes: 60, // 更长的清理间隔
      maxCacheSize: this.MAX_CACHE_SIZE
    };
  }

  // 最高性能设置 - 无限制
  getPerformanceSettings(): {
    enableAnimations: boolean;
    enableRealTimeUpdates: boolean;
    maxConcurrentRequests: number;
    debounceDelayMs: number;
    targetFPS: number;
  } {
    // [修复 卡顿] 并发数与帧率按档位调整。
    //   16 路并发在移动网络下会互相抢带宽并显著增加内存峰值；
    //   低端机锁 30FPS 反而比"目标 60 实际 25 且忽高忽低"观感更稳。
    const level = this.optimizationLevel;
    if (level === 'low') {
      return { enableAnimations: false, enableRealTimeUpdates: false, maxConcurrentRequests: 2, debounceDelayMs: 33, targetFPS: 30 };
    }
    if (level === 'medium') {
      return { enableAnimations: true, enableRealTimeUpdates: true, maxConcurrentRequests: 4, debounceDelayMs: 16, targetFPS: 60 };
    }
    return {
      enableAnimations: true, // 始终开启动画
      enableRealTimeUpdates: true, // 始终开启实时更新
      maxConcurrentRequests: 16, // 更高的并发
      debounceDelayMs: 16, // 60FPS对应的延迟
      targetFPS: 60 // 目标60帧
    };
  }

  // 智能纹理缓存 - 真正的优化
  cacheTexture(key: string, texture: any): void {
    if (this.textureCache.size >= this.MAX_CACHE_SIZE) {
      // LRU策略：删除最早的缓存
      const firstKey = this.textureCache.keys().next().value;
      if (firstKey) {
        this.textureCache.delete(firstKey);
      }
    }
    this.textureCache.set(key, texture);
  }

  getCachedTexture(key: string): any | undefined {
    return this.textureCache.get(key);
  }

  clearTextureCache(): void {
    this.textureCache.clear();
  }

  applyOptimizations(): void {
    const memorySettings = this.getMemorySettings();
    const performanceSettings = this.getPerformanceSettings();

    // 仅开发环境暴露调试接口
    const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && isDev) {
      (window as any).__deviceOptimizer = {
        capabilities: this.deviceCapabilities,
        optimizationLevel: this.optimizationLevel,
        settings: {
          memory: memorySettings,
          performance: performanceSettings,
          "3d": this.get3DRenderSettings()
        },
        message: 'ULTRA画质模式 - 所有特效已开启'
      };
    }
  }
}

export default DeviceOptimizer;
