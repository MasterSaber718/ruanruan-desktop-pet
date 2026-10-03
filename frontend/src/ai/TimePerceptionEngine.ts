/**
 * ============================================================================
 * 时间感知引擎 - Time Perception Engine
 * ============================================================================
 *
 * 适度模拟人类对时间的感知，防止过度模拟导致崩溃：
 * - 活动时时间过得快
 * - 无聊时时间过得慢
 * - 昼夜节律
 * - 记忆强度随时间衰减
 */

export interface TimePerceptionState {
  // 真实时间
  realTime: number;
  realDelta: number;

  // 感知时间（主观时间）
  perceivedTime: number;
  perceivedDelta: number;

  // 时间膨胀系数（1=正常，<1=时间过得快，>1=时间过得慢）
  dilationFactor: number;

  // 昼夜状态
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayNightCycle: number; // 0-1

  // 活动状态
  activityLevel: number; // 0-1
  boredomLevel: number; // 0-1

  // 记忆时间戳
  lastUserInteraction: number;
  lastThought: number;

  // 统计
  totalAwakeTime: number;
  daysPassed: number;
}

export interface MemoryDecay {
  id: string;
  initialStrength: number;
  createdAt: number;
  halfLife: number; // 半衰期（毫秒）
  currentStrength: number;
}

class TimePerceptionEngine {
  private state: TimePerceptionState;
  private memoryDecays: Map<string, MemoryDecay>;
  private _timeScale: number; // 整体时间流速
  private safetyLimit: number; // 最大感知天数限制

  constructor() {
    this._timeScale = 1; // 默认与现实同步
    this.safetyLimit = 30; // 最大感知30天，防止崩溃

    this.state = {
      realTime: Date.now(),
      realDelta: 0,
      perceivedTime: Date.now(),
      perceivedDelta: 0,
      dilationFactor: 1,
      timeOfDay: 'morning',
      dayNightCycle: 0.25,
      activityLevel: 0.5,
      boredomLevel: 0,
      lastUserInteraction: Date.now(),
      lastThought: Date.now(),
      totalAwakeTime: 0,
      daysPassed: 0
    };

    this.memoryDecays = new Map();
  }

  /**
   * 每一帧更新时间感知
   */
  update(_deltaTimeMs: number) {
    const now = Date.now();
    const realDelta = now - this.state.realTime;

    this.state.realTime = now;
    this.state.realDelta = realDelta;

    // 计算时间膨胀
    this.calculateTimeDilation(realDelta);

    // 应用时间膨胀到感知时间（加上整体时间流速）
    const perceivedDelta = realDelta * this.state.dilationFactor * this._timeScale;
    this.state.perceivedDelta = perceivedDelta;
    this.state.perceivedTime += perceivedDelta;

    // 更新昼夜周期（模拟24小时）
    this.state.dayNightCycle = (this.state.dayNightCycle + (realDelta / 86400000) * 0.1) % 1;
    this.updateTimeOfDay();

    // 更新活动和无聊水平
    this.updateActivityAndBoredom(realDelta);

    // 更新总清醒时间
    this.state.totalAwakeTime += realDelta;

    // 检查天数
    const newDays = Math.floor(this.state.perceivedTime / 86400000);
    if (newDays > this.state.daysPassed) {
      this.state.daysPassed = Math.min(newDays, this.safetyLimit);
    }

    // 更新记忆衰减
    this.updateMemoryDecays(realDelta);
  }

  private calculateTimeDilation(_deltaTime: number) {
    const idleTime = Date.now() - this.state.lastUserInteraction;
    const idleMinutes = idleTime / 60000;

    // 空闲太久时，时间变慢（主观感觉）
    let boredomFactor = 1;
    if (idleMinutes > 1) {
      boredomFactor = Math.max(1, 1 + idleMinutes * 0.1);
    }

    // 活动水平高时，时间变快
    const activityFactor = Math.max(0.5, 1 - this.state.activityLevel * 0.3);

    // 综合时间膨胀
    this.state.dilationFactor = activityFactor * boredomFactor;

    // 限制范围，防止极端值
    this.state.dilationFactor = Math.max(0.2, Math.min(5, this.state.dilationFactor));
  }

  private updateTimeOfDay() {
    const cycle = this.state.dayNightCycle;

    if (cycle >= 0.25 && cycle < 0.5) {
      this.state.timeOfDay = 'morning';
    } else if (cycle >= 0.5 && cycle < 0.75) {
      this.state.timeOfDay = 'afternoon';
    } else if (cycle >= 0.75 || cycle < 0.1) {
      this.state.timeOfDay = 'evening';
    } else {
      this.state.timeOfDay = 'night';
    }
  }

  private updateActivityAndBoredom(realDelta: number) {
    const idleTime = Date.now() - this.state.lastUserInteraction;

    // 活动水平随交互变化
    if (idleTime < 10000) { // 10秒内有交互
      this.state.activityLevel = Math.min(1, this.state.activityLevel + realDelta * 0.00005);
    } else {
      this.state.activityLevel = Math.max(0, this.state.activityLevel - realDelta * 0.00002);
    }

    // 无聊水平随空闲时间增长
    const idleMinutes = idleTime / 60000;
    this.state.boredomLevel = Math.min(1, idleMinutes / 30); // 30分钟达到最大值
  }

  private updateMemoryDecays(deltaTime: number) {
    this.memoryDecays.forEach(decay => {
      const elapsed = deltaTime;
      const decayFactor = Math.exp(-elapsed / decay.halfLife);
      decay.currentStrength *= decayFactor;
    });

    // 清理完全衰减的记忆
    this.memoryDecays.forEach((decay, id) => {
      if (decay.currentStrength < 0.01) {
        this.memoryDecays.delete(id);
      }
    });
  }

  /**
   * 记录用户交互
   */
  recordUserInteraction() {
    this.state.lastUserInteraction = Date.now();
  }

  /**
   * 记录一次思考
   */
  recordThought() {
    this.state.lastThought = Date.now();
  }

  /**
   * 添加一个需要衰减的记忆
   */
  addMemoryDecay(id: string, strength: number = 1, halfLifeDays: number = 7) {
    const halfLife = halfLifeDays * 86400000;

    this.memoryDecays.set(id, {
      id,
      initialStrength: strength,
      createdAt: this.state.perceivedTime,
      halfLife,
      currentStrength: strength
    });
  }

  /**
   * 获取记忆强度
   */
  getMemoryStrength(id: string): number {
    const decay = this.memoryDecays.get(id);
    return decay ? decay.currentStrength : 0;
  }

  /**
   * 获取当前状态
   */
  getState(): TimePerceptionState {
    return { ...this.state };
  }

  /**
   * 获取时间感觉描述
   */
  getTimeDescription(): string {
    const { timeOfDay, boredomLevel } = this.state;

    let desc = '';

    switch (timeOfDay) {
      case 'morning':
        desc = '早上好';
        break;
      case 'afternoon':
        desc = '下午好';
        break;
      case 'evening':
        desc = '晚上好';
        break;
      case 'night':
        desc = '夜深了';
        break;
    }

    if (boredomLevel > 0.7) {
      desc += '，时间过得有点慢';
    } else if (boredomLevel > 0.3) {
      desc += '，还算平静';
    } else {
      desc += '，现在感觉时间过得挺快';
    }

    return desc;
  }

  /**
   * 设置时间流速（用于测试）
   */
  setTimeScale(scale: number) {
    this._timeScale = Math.max(0.01, Math.min(100, scale));
  }

  /**
   * 检查是否需要休息（安全机制）
   */
  shouldRest(): boolean {
    const awakeHours = this.state.totalAwakeTime / 3600000;
    return awakeHours > 16; // 16小时后建议"休息"
  }

  /**
   * 重置清醒时间（模拟休息）
   */
  resetAwakeTime() {
    this.state.totalAwakeTime = 0;
  }

  /**
   * 获取系统运行统计
   */
  getStats(): {
    perceivedDays: number;
    perceivedHours: number;
    realMinutesRunning: number;
    boredomLevel: number;
  } {
    return {
      perceivedDays: this.state.daysPassed,
      perceivedHours: (this.state.perceivedTime % 86400000) / 3600000,
      realMinutesRunning: (Date.now() - this.state.realTime + this.state.totalAwakeTime) / 60000,
      boredomLevel: this.state.boredomLevel
    };
  }
}

export const timePerceptionEngine = new TimePerceptionEngine();
export { TimePerceptionEngine };
