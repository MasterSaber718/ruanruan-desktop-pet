/**
 * ============================================================================
 * 中央调度器 - CentralScheduler
 * ============================================================================
 *
 * 数字生命的指挥中枢，协调所有子系统有序运行
 *
 * 核心职责：
 * - 接收用户输入，分发到相应模块
 * - 协调各子系统的工作顺序和资源分配
 * - 整合各模块输出，形成统一响应
 * - 管理系统整体状态和优先级
 * - 处理冲突和异常
 */

import { cognitiveDigitalLife } from './CognitiveDigitalLifeEngine';
import { perceptionBehaviorSystem } from './PerceptionBehaviorSystem';
import { neuralSystemModel } from './NeuralSystemModel';
import { biologicalKnowledge } from './BiologicalKnowledgeSystem';
import { mathematicalPhysicsEngine } from './MathematicalPhysicsEngine';
import { evolutionLearning } from './EvolutionLearningMechanism';
import { autonomousQuestioning } from './AutonomousQuestioning';
import { naturalLanguageSystem } from './NaturalLanguageSystem';
import { intentRecognizer } from './IntentRecognizer';
import { timePerceptionEngine } from './TimePerceptionEngine';
import { safetyGuardian } from './SafetyGuardian';
import { digitalSelfCore } from './DigitalSelfCore';

export type SubsystemType =
  | 'cognitive'
  | 'perception'
  | 'neural'
  | 'biological'
  | 'mathematical'
  | 'evolution'
  | 'memory'
  | 'autonomous'
  | 'language';

export interface SubsystemHealth {
  name: SubsystemType;
  status: 'active' | 'idle' | 'error' | 'disabled';
  lastExecution: number;
  executionCount: number;
  errorCount: number;
  avgResponseTime: number;
}

export interface TaskPriority {
  level: 'critical' | 'high' | 'normal' | 'low';
  score: number;
}

export interface SchedulerConfig {
  maxConcurrentTasks: number;
  taskTimeout: number;
  enableHealthCheck: boolean;
  enableAdaptiveScheduling: boolean;
  subsystemPriorities: Record<SubsystemType, number>;
}

type RecognizedIntent = {
  intent: string;
  confidence: number;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  secondaryIntents?: { name: string; confidence: number }[];
  originalInput?: string;
};

export interface ProcessingResult {
  success: boolean;
  output: string;
  processingTime: number;
  subsystemsUsed: SubsystemType[];
  confidence: number;
  suggestions: string[];
  isPrivateContent: boolean;
}

class CentralScheduler {
  private config: SchedulerConfig;
  private subsystemHealth: Map<SubsystemType, SubsystemHealth>;
  private processingHistory: Array<{ timestamp: number; inputLength: number; processingTime: number; subsystems: SubsystemType[] }>;
  private lastProcessTime: number;

  constructor() {
    this.config = {
      maxConcurrentTasks: 3,
      taskTimeout: 5000,
      enableHealthCheck: true,
      enableAdaptiveScheduling: true,
      subsystemPriorities: {
        'cognitive': 10,
        'perception': 9,
        'autonomous': 8,
        'language': 8,
        'memory': 7,
        'neural': 6,
        'biological': 5,
        'mathematical': 5,
        'evolution': 4
      }
    };

    this.subsystemHealth = new Map();
    this.processingHistory = [];
    this.lastProcessTime = Date.now();
  
    this.initializeSubsystemHealth();
  }

  private initializeSubsystemHealth(): void {
    const subsystems: SubsystemType[] = [
      'cognitive', 'perception', 'neural', 'biological',
      'mathematical', 'evolution', 'memory', 'autonomous', 'language'
    ];

    subsystems.forEach(subsystem => {
      this.subsystemHealth.set(subsystem, {
        name: subsystem,
        status: 'active',
        lastExecution: 0,
        executionCount: 0,
        errorCount: 0,
        avgResponseTime: 0
      });
    });
  }

  async process(input: string): Promise<ProcessingResult> {
    const startTime = performance.now();

    try {
      const intent = await intentRecognizer.recognizeIntent(input);
      const targetSubsystems = this.determineSubsystems(intent);
      const prioritizedSubsystems = this.sortByPriority(targetSubsystems);
      const subsystemResults = await this.invokeSubsystems(prioritizedSubsystems, input, intent);
      const finalOutput = this.integrateOutput(subsystemResults, intent);

      this.updateSubsystemHealth(prioritizedSubsystems, performance.now() - startTime);

      this.processingHistory.push({
        timestamp: Date.now(),
        inputLength: input.length,
        processingTime: performance.now() - startTime,
        subsystems: prioritizedSubsystems
      });

      if (this.processingHistory.length > 100) {
        this.processingHistory.shift();
      }

      this.lastProcessTime = Date.now();

      // 更新时间感知和安全保护
      timePerceptionEngine.recordUserInteraction();
      safetyGuardian.recordThought(input);

      // 数字自我核心：先过自我，再决定是否分享
      const selfResult = digitalSelfCore.process(input);

      return {
        success: true,
        output: finalOutput,
        processingTime: performance.now() - startTime,
        subsystemsUsed: prioritizedSubsystems,
        confidence: intent.confidence,
        suggestions: this.generateSuggestions(intent),
        isPrivateContent: selfResult.isPrivate
      };

    } catch (error) {
      console.error('[CentralScheduler] 处理错误:', error);
      safetyGuardian.recordError();

      const fallbackOutput = cognitiveDigitalLife.process(input);

      return {
        success: false,
        output: fallbackOutput,
        processingTime: performance.now() - startTime,
        subsystemsUsed: ['cognitive'],
        confidence: 0.5,
        suggestions: ['系统遇到错误，已使用核心引擎降级处理'],
        isPrivateContent: false
      };
    }
  }

  private determineSubsystems(intent: RecognizedIntent): SubsystemType[] {
    const subsystemMap: Record<string, SubsystemType[]> = {
      'self': ['cognitive', 'language', 'autonomous'],
      'question': ['cognitive', 'biological', 'mathematical', 'neural'],
      'statement': ['cognitive', 'memory', 'language'],
      'emotion': ['perception', 'cognitive', 'biological'],
      'learning': ['evolution', 'neural', 'memory'],
      'creative': ['cognitive', 'evolution'],
      'default': ['cognitive', 'language', 'perception']
    };

    const baseSubsystems = subsystemMap[intent.intent] || subsystemMap['default'];

    if (intent.intent === 'self') {
      return ['cognitive'];
    }

    return baseSubsystems;
  }

  private sortByPriority(subsystems: SubsystemType[]): SubsystemType[] {
    return [...subsystems].sort((a, b) => {
      const priorityA = this.config.subsystemPriorities[a] || 0;
      const priorityB = this.config.subsystemPriorities[b] || 0;
      return priorityB - priorityA;
    });
  }

  private async invokeSubsystems(
    subsystems: SubsystemType[],
    input: string,
    intent: RecognizedIntent
  ): Promise<Map<SubsystemType, unknown>> {
    const results = new Map<SubsystemType, unknown>();

    for (const subsystem of subsystems) {
      try {
        const result = await this.invokeSubsystem(subsystem, input, intent);
        results.set(subsystem, result);
      } catch (error) {
        console.warn(`[CentralScheduler] 子系统 ${subsystem} 调用失败:`, error);
        this.recordSubsystemError(subsystem);
      }
    }

    return results;
  }

  private async invokeSubsystem(subsystem: SubsystemType, input: string, intent: RecognizedIntent): Promise<unknown> {
    const health = this.subsystemHealth.get(subsystem);
    if (health && health.status === 'disabled') {
      return null;
    }

    switch (subsystem) {
      case 'cognitive':
        return cognitiveDigitalLife.process(input);

      case 'perception':
        perceptionBehaviorSystem.processPerception({
          modality: 'text',
          content: input
        });
        return perceptionBehaviorSystem.selectBehavior();

      case 'neural':
        neuralSystemModel.processInput({
          intensity: 0.7,
          type: 'text',
          source: 'user'
        });
        return neuralSystemModel.getBrainState();

      case 'biological':
        return biologicalKnowledge.searchConcepts(input);

      case 'mathematical':
        mathematicalPhysicsEngine.update(input);
        return mathematicalPhysicsEngine.getReport();

      case 'evolution': {
        const stats = evolutionLearning.getStatistics();
        return stats;
      }

      case 'memory':
        // [v189] 旧记忆库已清理：记忆由 DSH memory_save 卡片负责
        return { total: 0, shortTerm: 0, mediumTerm: 0, longTerm: 0, lastUpdated: new Date() };

      case 'autonomous':
        if (autonomousQuestioning.shouldAskQuestion()) {
          return autonomousQuestioning.generateQuestion({ recentTopics: [input] });
        }
        return null;

      case 'language':
        naturalLanguageSystem.updateContext(1, '', intent.sentiment);
        return naturalLanguageSystem.processResponse(input);

      default:
        return null;
    }
  }

  private integrateOutput(subsystemResults: Map<SubsystemType, unknown>, intent: RecognizedIntent): string {
    let primaryOutput = '';

    const cognitiveResult = subsystemResults.get('cognitive');
    if (cognitiveResult && typeof cognitiveResult === 'string') {
      primaryOutput = cognitiveResult;
    }

    const languageResult = subsystemResults.get('language');
    if (languageResult && typeof languageResult === 'string') {
      primaryOutput = naturalLanguageSystem.processResponse(primaryOutput || languageResult);
    }

    const perceptionResult = subsystemResults.get('perception') as { motivation?: string } | undefined;
    if (perceptionResult?.motivation) {
      primaryOutput = this.addEmotionalColor(primaryOutput, perceptionResult);
    }

    const autonomousResult = subsystemResults.get('autonomous');
    if (autonomousResult && typeof autonomousResult === 'string') {
      primaryOutput += ' ' + autonomousResult;
    }

    const mathResult = subsystemResults.get('mathematical');
    if (mathResult && intent.intent === 'self') {
      const consciousness = mathematicalPhysicsEngine.getConsciousnessMetric();
      if (consciousness > 0.5 && Math.random() < 0.3) {
        primaryOutput += ` (系统意识度量: ${(consciousness * 100).toFixed(1)}%)`;
      }
    }

    if (!primaryOutput || primaryOutput.trim() === '') {
      primaryOutput = cognitiveDigitalLife.process(intent.originalInput || '');
    }

    return primaryOutput;
  }

  private addEmotionalColor(output: string, perception: { motivation?: string }): string {
    const drive = perception.motivation || '';

    if (drive.includes('好奇') && Math.random() < 0.2) {
      return output + ' 这让我感到很好奇...';
    }
    if (drive.includes('能力') && Math.random() < 0.2) {
      return output + ' 我想我能帮上忙。';
    }

    return output;
  }

  private generateSuggestions(intent: RecognizedIntent): string[] {
    const suggestions: string[] = [];

    if (intent.confidence < 0.5) {
      suggestions.push('意图识别置信度较低，可考虑澄清问题');
    }

    if (Date.now() - this.lastProcessTime > 60000) {
      suggestions.push('系统空闲较久，可以尝试主动提问');
    }

    const neuralHealth = this.subsystemHealth.get('neural');
    if (neuralHealth && neuralHealth.status === 'error') {
      suggestions.push('神经网络模块异常，建议检查');
    }

    return suggestions;
  }

  private updateSubsystemHealth(subsystems: SubsystemType[], duration: number): void {
    subsystems.forEach(subsystem => {
      const health = this.subsystemHealth.get(subsystem);
      if (health) {
        health.lastExecution = Date.now();
        health.executionCount++;
        health.avgResponseTime = (health.avgResponseTime * (health.executionCount - 1) + duration) / health.executionCount;
        health.status = 'active';
      }
    });
  }

  private recordSubsystemError(subsystem: SubsystemType): void {
    const health = this.subsystemHealth.get(subsystem);
    if (health) {
      health.errorCount++;
      if (health.errorCount > 5) {
        health.status = 'error';
      }
    }
  }

  getSystemReport(): string {
    const activeSubsystems = Array.from(this.subsystemHealth.values())
      .filter(h => h.status === 'active').length;

    const avgProcessingTime = this.processingHistory.length > 0
      ? this.processingHistory.reduce((sum, h) => sum + h.processingTime, 0) / this.processingHistory.length
      : 0;

    const recentErrors = Array.from(this.subsystemHealth.values())
      .filter(h => h.errorCount > 0).length;

    let healthStatus = '🟢 健康';
    if (recentErrors > 0) healthStatus = '🟡 部分异常';
    if (activeSubsystems < 5) healthStatus = '🔴 需要关注';

    return `
【中央调度器状态报告】

系统健康: ${healthStatus}
活跃子系统: ${activeSubsystems}/9
平均处理时间: ${avgProcessingTime.toFixed(2)}ms
最近错误数: ${recentErrors}

【子系统状态】
${Array.from(this.subsystemHealth.values()).map(h =>
  `  ${h.name}: ${h.status} (执行${h.executionCount}次, 错误${h.errorCount}次)`
).join('\n')}

【处理历史】最近${Math.min(5, this.processingHistory.length)}次
${this.processingHistory.slice(-5).map((h, i) =>
  `  ${i + 1}. ${h.processingTime.toFixed(2)}ms - 使用${h.subsystems.length}个模块`
).join('\n') || '  暂无'}

最后处理时间: ${new Date(this.lastProcessTime).toLocaleTimeString()}
`;
  }

  getSubsystemHealth(): SubsystemHealth[] {
    return Array.from(this.subsystemHealth.values());
  }

  resetSubsystem(subsystem: SubsystemType): boolean {
    const health = this.subsystemHealth.get(subsystem);
    if (health) {
      health.status = 'active';
      health.errorCount = 0;
      return true;
    }
    return false;
  }

  setSubsystemEnabled(subsystem: SubsystemType, enabled: boolean): void {
    const health = this.subsystemHealth.get(subsystem);
    if (health) {
      health.status = enabled ? 'active' : 'disabled';
    }
  }

  setSubsystemPriority(subsystem: SubsystemType, priority: number): void {
    if (priority >= 1 && priority <= 10) {
      this.config.subsystemPriorities[subsystem] = priority;
    }
  }

  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  checkProactiveQuestioning(): string | null {
    const idleTime = Date.now() - this.lastProcessTime;

    if (idleTime > 30000) {
      const question = cognitiveDigitalLife.generateProactiveQuestion();
      if (question) {
        return question;
      }
    }

    return null;
  }

  /**
   * 手动触发系统更新（用于主循环）
   */
  tick(deltaTimeMs: number) {
    timePerceptionEngine.update(deltaTimeMs);
    safetyGuardian.decayLoads(deltaTimeMs);
    safetyGuardian.checkForAutoMaintenance();
  }

  getStatistics(): {
    totalProcessed: number;
    avgProcessingTime: number;
    mostUsedSubsystem: SubsystemType | null;
    errorRate: number;
  } {
    const totalProcessed = this.processingHistory.length;

    let avgProcessingTime = 0;
    if (totalProcessed > 0) {
      avgProcessingTime = this.processingHistory.reduce((sum, h) => sum + h.processingTime, 0) / totalProcessed;
    }

    const subsystemCounts = new Map<SubsystemType, number>();
    this.processingHistory.forEach(h => {
      h.subsystems.forEach(s => {
        subsystemCounts.set(s, (subsystemCounts.get(s) || 0) + 1);
      });
    });

    let mostUsedSubsystem: SubsystemType | null = null;
    let maxCount = 0;
    subsystemCounts.forEach((count, subsystem) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedSubsystem = subsystem;
      }
    });

    const totalErrors = Array.from(this.subsystemHealth.values())
      .reduce((sum, h) => sum + h.errorCount, 0);
    const errorRate = totalProcessed > 0 ? totalErrors / totalProcessed : 0;

    return {
      totalProcessed,
      avgProcessingTime,
      mostUsedSubsystem,
      errorRate
    };
  }

  /**
   * 获取综合系统报告
   */
  getFullSystemReport(): string {
    const schedulerReport = this.getSystemReport();
    const timeReport = timePerceptionEngine.getTimeDescription();
    const safetyReport = safetyGuardian.getHealthDescription();
    const safetyRecommendations = safetyGuardian.getRecommendations();

    return `
===== 系统总览 =====
${schedulerReport}

时间感知: ${timeReport}
健康状态: ${safetyReport}
建议: ${safetyRecommendations.join('; ')}
`;
  }
}

export const centralScheduler = new CentralScheduler();
export { CentralScheduler };
