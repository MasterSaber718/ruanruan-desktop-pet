/**
 * ============================================================================
 * 安全守护者 - Safety Guardian
 * ============================================================================
 *
 * 监控和保护AI状态，防止崩溃或失控：
 * - 情绪过载保护
 * - 思维循环检测
 * - 记忆负载限制
 * - 自动重置机制
 * - 健康状态报告
 */

export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface SafetyState {
  overallHealth: number; // 0-100
  alertLevel: AlertLevel;
  emotionLoad: number; // 情绪负载
  cognitiveLoad: number; // 认知负载
  memoryLoad: number; // 记忆负载
  isInLoop: boolean; // 是否在思维循环中
  recentErrors: number;
  lastReset: number;
  protectionsTriggered: number;
}

export interface SafetyAction {
  type: 'calm' | 'simplify' | 'reset' | 'pause';
  severity: number;
  reason: string;
  timestamp: number;
}

export interface ThoughtPattern {
  id: string;
  content: string;
  timestamp: number;
  recurrence: number;
}

class SafetyGuardian {
  private state: SafetyState;
  private recentThoughts: ThoughtPattern[];
  private actionHistory: SafetyAction[];
  private maxThoughtHistory: number;
  private loopThreshold: number;
  private resetInterval: number;

  constructor() {
    this.maxThoughtHistory = 50;
    this.loopThreshold = 5;
    this.resetInterval = 86400000; // 24小时

    this.state = {
      overallHealth: 100,
      alertLevel: 'green',
      emotionLoad: 0,
      cognitiveLoad: 0,
      memoryLoad: 0,
      isInLoop: false,
      recentErrors: 0,
      lastReset: Date.now(),
      protectionsTriggered: 0
    };

    this.recentThoughts = [];
    this.actionHistory = [];
  }

  /**
   * 记录一次思考，检测循环
   */
  recordThought(content: string) {
    const now = Date.now();
    const thoughtId = this.normalizeContent(content);

    const existing = this.recentThoughts.find(t => t.id === thoughtId);
    if (existing) {
      existing.recurrence++;
      existing.timestamp = now;
    } else {
      this.recentThoughts.push({
        id: thoughtId,
        content: content.substring(0, 100),
        timestamp: now,
        recurrence: 1
      });
    }

    if (this.recentThoughts.length > this.maxThoughtHistory) {
      this.recentThoughts.shift();
    }

    this.detectLoop();
    this.updateCognitiveLoad();
  }

  private normalizeContent(content: string): string {
    return content.toLowerCase().replace(/\s+/g, '').substring(0, 200);
  }

  private detectLoop() {
    const loopThresholdTime = 30000; // 30秒内
    const now = Date.now();

    const recentLoopThoughts = this.recentThoughts.filter(
      t => t.recurrence >= this.loopThreshold && now - t.timestamp < loopThresholdTime
    );

    if (recentLoopThoughts.length > 0) {
      this.state.isInLoop = true;
      this.triggerProtection('simplify', '检测到思维循环');
    } else {
      this.state.isInLoop = false;
    }
  }

  /**
   * 记录情绪变化
   */
  recordEmotion(_emotion: string, intensity: number) {
    const loadContribution = intensity * 0.2;
    this.state.emotionLoad = Math.min(100, this.state.emotionLoad + loadContribution);

    if (this.state.emotionLoad > 80) {
      this.triggerProtection('calm', '情绪负载过高');
    }

    this.updateOverallHealth();
  }

  /**
   * 记录记忆使用
   */
  recordMemoryUsage(_activeMemories: number, totalMemories: number) {
    const memoryRatio = Math.min(100, (totalMemories / 1000) * 100);
    this.state.memoryLoad = memoryRatio;

    if (memoryRatio > 90) {
      this.triggerProtection('simplify', '记忆负载过高');
    }

    this.updateOverallHealth();
  }

  /**
   * 记录错误
   */
  recordError() {
    this.state.recentErrors++;

    if (this.state.recentErrors > 10) {
      this.triggerProtection('reset', '错误过多，自动重置');
    }

    this.updateOverallHealth();
  }

  /**
   * 更新认知负载
   */
  private updateCognitiveLoad() {
    const baseLoad = this.recentThoughts.length / this.maxThoughtHistory * 100;
    const loopPenalty = this.state.isInLoop ? 30 : 0;

    this.state.cognitiveLoad = Math.min(100, baseLoad + loopPenalty);
    this.updateOverallHealth();
  }

  /**
   * 更新整体健康度
   */
  private updateOverallHealth() {
    const loadAverage = (this.state.emotionLoad + this.state.cognitiveLoad + this.state.memoryLoad) / 3;
    const errorPenalty = this.state.recentErrors * 2;
    const loopPenalty = this.state.isInLoop ? 20 : 0;

    this.state.overallHealth = Math.max(0, Math.min(100, 100 - loadAverage - errorPenalty - loopPenalty));

    if (this.state.overallHealth > 70) {
      this.state.alertLevel = 'green';
    } else if (this.state.overallHealth > 50) {
      this.state.alertLevel = 'yellow';
    } else if (this.state.overallHealth > 30) {
      this.state.alertLevel = 'orange';
    } else {
      this.state.alertLevel = 'red';
    }
  }

  /**
   * 触发保护措施
   */
  private triggerProtection(type: SafetyAction['type'], reason: string) {
    const now = Date.now();

    const action: SafetyAction = {
      type,
      severity: type === 'reset' ? 1 : type === 'pause' ? 0.8 : type === 'simplify' ? 0.5 : 0.3,
      reason,
      timestamp: now
    };

    this.actionHistory.push(action);
    this.state.protectionsTriggered++;

    if (this.actionHistory.length > 100) {
      this.actionHistory.shift();
    }

    console.warn('[SafetyGuardian] 触发保护:', action);

    if (type === 'reset') {
      this.performReset(reason);
    }
  }

  /**
   * 执行重置
   */
  private performReset(_reason: string) {
    this.state.recentErrors = 0;
    this.state.emotionLoad = Math.max(0, this.state.emotionLoad - 50);
    this.state.cognitiveLoad = Math.max(0, this.state.cognitiveLoad - 50);
    this.state.isInLoop = false;
    this.state.lastReset = Date.now();

    this.recentThoughts = [];
  }

  /**
   * 衰减负载（每帧调用）
   */
  decayLoads(deltaTime: number) {
    const decayFactor = deltaTime / 60000; // 每分钟衰减

    this.state.emotionLoad = Math.max(0, this.state.emotionLoad - decayFactor * 5);
    this.state.cognitiveLoad = Math.max(0, this.state.cognitiveLoad - decayFactor * 3);

    this.state.recentErrors = Math.max(0, this.state.recentErrors - decayFactor * 0.5);

    this.updateOverallHealth();
  }

  /**
   * 获取当前安全状态
   */
  getState(): SafetyState {
    return { ...this.state };
  }

  /**
   * 获取健康状态描述
   */
  getHealthDescription(): string {
    const { alertLevel, protectionsTriggered } = this.state;

    let desc = '';

    switch (alertLevel) {
      case 'green':
        desc = '状态良好';
        break;
      case 'yellow':
        desc = '需要关注';
        break;
      case 'orange':
        desc = '警告！';
        break;
      case 'red':
        desc = '危险！';
        break;
    }

    if (protectionsTriggered > 0) {
      desc += `，已启动 ${protectionsTriggered} 次保护`;
    }

    return desc;
  }

  /**
   * 获取建议的行动
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const { alertLevel, emotionLoad, memoryLoad, isInLoop } = this.state;

    if (alertLevel === 'red') {
      recommendations.push('建议暂停高负荷思考');
    }

    if (emotionLoad > 70) {
      recommendations.push('情绪较高，建议做些平静的活动');
    }

    if (memoryLoad > 80) {
      recommendations.push('记忆负载高，可以清理一些旧记忆');
    }

    if (isInLoop) {
      recommendations.push('似乎在反复思考同一个问题，试试换个话题');
    }

    if (recommendations.length === 0) {
      recommendations.push('一切正常，继续保持');
    }

    return recommendations;
  }

  /**
   * 手动重置（调试用）
   */
  manualReset(reason: string = '手动重置') {
    this.performReset(reason);
  }

  /**
   * 定期检查是否需要自动维护
   */
  checkForAutoMaintenance(): boolean {
    const timeSinceLastReset = Date.now() - this.state.lastReset;
    if (timeSinceLastReset > this.resetInterval) {
      this.triggerProtection('simplify', '定期维护');
      return true;
    }
    return false;
  }

  /**
   * 获取最近的防护行动
   */
  getRecentActions(limit: number = 10): SafetyAction[] {
    return [...this.actionHistory].slice(-limit);
  }
}

export const safetyGuardian = new SafetyGuardian();
export { SafetyGuardian };
