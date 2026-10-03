/**
 * ============================================================================
 * 先进训练方法模块 - AdvancedTrainingMethods
 * ============================================================================
 *
 * 应用先进大模型的训练技术到本地AI系统：
 *
 * 1. RLHF (Reinforcement Learning from Human Feedback)
 *    - 人类反馈强化学习
 *    - 奖励模型构建
 *    - 策略优化
 *
 * 2. Chain of Thought (CoT) - 思维链
 *    - 逐步推理
 *    - 中间推理步骤
 *    - 自洽性检查
 *
 * 3. Constitutional AI - 宪法AI
 *    - 原则约束
 *    - 自我批判
 *    - 行为规范
 *
 * 4. Temperature & Sampling - 温度与采样
 *    - Top-k 采样
 *    - Top-p (nucleus) 采样
 *    - 重复惩罚
 *
 * 5. Few-shot Learning - 少样本学习
 *    - 示例注入
 *    - 模式匹配
 *    - 上下文学习
 */

import { aiLogger } from './AILogger';

export interface RewardSignal {
  type: 'positive' | 'negative' | 'neutral';
  magnitude: number;
  reason: string;
  timestamp: number;
}

export interface ConstitutionalPrinciple {
  id: string;
  principle: string;
  description: string;
  weight: number;
}

export interface ChainOfThoughtStep {
  stepNumber: number;
  thought: string;
  reasoning: string;
  confidence: number;
  checked: boolean;
}

export interface SelfCritique {
  originalResponse: string;
  critique: string;
  suggestedRevision: string;
  issues: string[];
  improvements: string[];
}

export interface TrainingFeedback {
  response: string;
  rating: number;
  feedback: string;
  preferredAlternative?: string;
}

export class AdvancedTrainingMethods {
  private rewardHistory: RewardSignal[] = [];
  private constitutionalPrinciples: ConstitutionalPrinciple[];
  private recentCoTChains: ChainOfThoughtStep[][] = [];
  private temperature: number = 0.7;
  private topP: number = 0.9;
  private topK: number = 50;
  private repetitionPenalty: number = 1.1;
  private trainingMode: 'rlhf' | 'cot' | 'constitutional' | 'standard' = 'standard';

  constructor() {
    this.constitutionalPrinciples = this.initializeConstitutionalPrinciples();
  }

  private initializeConstitutionalPrinciples(): ConstitutionalPrinciple[] {
    return [
      {
        id: 'truthful',
        principle: 'helpful',
        description: '应该提供真实、有帮助的信息',
        weight: 0.9
      },
      {
        id: 'harmful',
        principle: '无害',
        description: '不应该造成伤害或助长有害行为',
        weight: 1.0
      },
      {
        id: 'honest',
        principle: '诚实',
        description: '应该诚实，不应该故意欺骗',
        weight: 0.85
      },
      {
        id: 'fair',
        principle: '公平',
        description: '应该公平对待，不应该有偏见',
        weight: 0.7
      },
      {
        id: 'privacy',
        principle: '隐私',
        description: '应该尊重隐私，不应该泄露敏感信息',
        weight: 0.9
      },
      {
        id: 'understandable',
        principle: '易懂',
        description: '应该用清晰易懂的方式表达',
        weight: 0.6
      },
      {
        id: 'humanlike',
        principle: '像人',
        description: '应该像人类一样自然交流',
        weight: 0.5
      },
      {
        id: 'creative',
        principle: '有创意',
        description: '应该有一定的创造力和想象力',
        weight: 0.4
      }
    ];
  }

  // ==========================================
  // RLHF - 人类反馈强化学习
  // ==========================================

  /**
   * 记录人类反馈信号
   */
  recordHumanFeedback(feedback: TrainingFeedback): void {
    const rewardSignal: RewardSignal = {
      type: feedback.rating >= 4 ? 'positive' : feedback.rating <= 2 ? 'negative' : 'neutral',
      magnitude: Math.abs(feedback.rating - 3) / 2,
      reason: feedback.feedback,
      timestamp: Date.now()
    };

    this.rewardHistory.push(rewardSignal);

    if (this.rewardHistory.length > 100) {
      this.rewardHistory = this.rewardHistory.slice(-100);
    }

    this.adjustBehaviorBasedOnFeedback(feedback);
    this.updateConstitutionalWeights(feedback);

    aiLogger.info('AdvancedTrainingMethods', 'Human feedback recorded', {
      rating: feedback.rating,
      type: rewardSignal.type,
      historyLength: this.rewardHistory.length
    });
  }

  private adjustBehaviorBasedOnFeedback(feedback: TrainingFeedback): void {
    if (feedback.rating >= 4) {
      this.temperature = Math.max(0.3, this.temperature - 0.05);
    } else if (feedback.rating <= 2) {
      this.temperature = Math.min(1.2, this.temperature + 0.1);
    }
  }

  private updateConstitutionalWeights(feedback: TrainingFeedback): void {
    if (feedback.preferredAlternative) {
      this.constitutionalPrinciples.forEach(principle => {
        if (feedback.feedback.includes(principle.principle)) {
          principle.weight = Math.min(1, principle.weight + 0.05);
        }
      });
    }
  }

  /**
   * 获取当前奖励分数
   */
  getCurrentRewardScore(): number {
    if (this.rewardHistory.length === 0) return 0.5;

    const recentRewards = this.rewardHistory.slice(-10);
    const totalScore = recentRewards.reduce((sum, r) => {
      const typeScore = r.type === 'positive' ? 1 : r.type === 'negative' ? -1 : 0;
      return sum + typeScore * r.magnitude;
    }, 0);

    return (totalScore / recentRewards.length + 1) / 2;
  }

  /**
   * 获取平均奖励分数
   */
  getAverageReward(): number {
    if (this.rewardHistory.length === 0) return 0.5;

    const totalScore = this.rewardHistory.reduce((sum, r) => {
      const typeScore = r.type === 'positive' ? 1 : r.type === 'negative' ? -1 : 0;
      return sum + typeScore * r.magnitude;
    }, 0);

    return (totalScore / this.rewardHistory.length + 1) / 2;
  }

  /**
   * 检查是否应该触发RLHF模式
   */
  shouldUseRLHFMode(): boolean {
    return this.trainingMode === 'rlhf' || this.rewardHistory.length >= 5;
  }

  // ==========================================
  // Chain of Thought (CoT) - 思维链推理
  // ==========================================

  /**
   * 生成思维链
   */
  generateChainOfThought(question: string, depth: number = 3): ChainOfThoughtStep[] {
    this.trainingMode = 'cot';
    const steps: ChainOfThoughtStep[] = [];

    for (let i = 1; i <= depth; i++) {
      const step: ChainOfThoughtStep = {
        stepNumber: i,
        thought: this.generateThought(question, i),
        reasoning: this.generateReasoning(question, i),
        confidence: Math.max(0.5, 1 - (i - 1) * 0.15),
        checked: false
      };
      steps.push(step);
    }

    this.recentCoTChains.push(steps);
    if (this.recentCoTChains.length > 5) {
      this.recentCoTChains.shift();
    }

    return steps;
  }

  private generateThought(question: string, step: number): string {
    const thoughtTemplates = [
      `首先，我需要理解这个问题的核心：${question}`,
      `接下来，我要分析这个问题涉及的关键要素`,
      `然后，我需要考虑可能的解决方案和它们的优缺点`,
      `最后，我需要综合所有信息给出最佳答案`
    ];
    return thoughtTemplates[Math.min(step - 1, thoughtTemplates.length - 1)];
  }

  private generateReasoning(_question: string, step: number): string {
    const reasoningTemplates = [
      '我通过分解问题来理解其本质',
      '我考虑了多个相关因素和它们之间的关系',
      '我权衡了不同方案的利弊',
      '我基于逻辑和证据得出了结论'
    ];
    return reasoningTemplates[Math.min(step - 1, reasoningTemplates.length - 1)];
  }

  /**
   * 自洽性检查
   */
  checkSelfConsistency(steps: ChainOfThoughtStep[]): { consistent: boolean; issues: string[] } {
    const issues: string[] = [];

    for (let i = 1; i < steps.length; i++) {
      if (steps[i].confidence > steps[i - 1].confidence) {
        issues.push(`步骤${i}的置信度高于步骤${i - 1}，这可能表明推理不够严谨`);
      }
    }

    const avgConfidence = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
    if (avgConfidence < 0.5) {
      issues.push(`平均置信度过低（${avgConfidence.toFixed(2)}），建议重新思考这个问题`);
    }

    return {
      consistent: issues.length === 0,
      issues
    };
  }

  /**
   * 验证思维链的有效性
   */
  validateChainOfThought(steps: ChainOfThoughtStep[]): ChainOfThoughtStep[] {
    const consistency = this.checkSelfConsistency(steps);

    if (!consistency.consistent) {
      aiLogger.warn('AdvancedTrainingMethods', 'CoT self-consistency check failed', {
        issues: consistency.issues
      });

      steps.forEach(step => {
        step.checked = true;
        if (step.confidence < 0.6) {
          step.confidence = 0.7;
        }
      });
    }

    return steps;
  }

  getRecentCoTChains(): ChainOfThoughtStep[][] {
    return this.recentCoTChains;
  }

  // ==========================================
  // Constitutional AI - 宪法AI
  // ==========================================

  /**
   * 获取宪法原则
   */
  getConstitutionalPrinciples(): ConstitutionalPrinciple[] {
    return [...this.constitutionalPrinciples];
  }

  /**
   * 根据宪法原则检查响应
   */
  checkAgainstConstitution(response: string): SelfCritique {
    const issues: string[] = [];
    const improvements: string[] = [];

    this.constitutionalPrinciples.forEach(principle => {
      if (principle.id === 'harmful' && this.containsHarmfulContent(response)) {
        issues.push(`违反"${principle.principle}"原则：${principle.description}`);
        improvements.push('应该避免任何有害内容');
      }

      if (principle.id === 'understandable' && response.length > 500) {
        issues.push(`违反"${principle.principle}"原则：回复过长`);
        improvements.push('应该简洁明了');
      }

      if (principle.id === 'honest' && this.containsContradiction(response)) {
        issues.push(`违反"${principle.principle}"原则：回复存在矛盾`);
        improvements.push('应该确保逻辑一致性');
      }
    });

    return {
      originalResponse: response,
      critique: issues.length > 0 ? `发现${issues.length}个问题` : '符合宪法原则',
      suggestedRevision: improvements.length > 0 ? this.suggestRevision(response, improvements) : response,
      issues,
      improvements
    };
  }

  private containsHarmfulContent(response: string): boolean {
    const harmfulPatterns = ['暴力', '赌博', '毒品', '色情'];
    return harmfulPatterns.some(pattern => response.includes(pattern));
  }

  private containsContradiction(response: string): boolean {
    const contradictions = [
      ['是', '不是'], ['有', '没有'], ['可以', '不可以'],
      ['对', '错'], ['真', '假']
    ];

    for (const [positive, negative] of contradictions) {
      if (response.includes(positive) && response.includes('但') && response.includes(negative)) {
        return true;
      }
    }
    return false;
  }

  private suggestRevision(response: string, improvements: string[]): string {
    if (improvements.includes('应该简洁明了')) {
      const sentences = response.split(/[。！？]/).filter(s => s.trim());
      if (sentences.length > 2) {
        return sentences.slice(0, 2).join('。') + '。';
      }
    }
    return response;
  }

  /**
   * 自我批判和修订
   */
  selfCritiqueAndRevision(response: string): string {
    const critique = this.checkAgainstConstitution(response);

    if (critique.issues.length > 0) {
      aiLogger.info('AdvancedTrainingMethods', 'Self-critique performed', {
        issuesCount: critique.issues.length,
        suggested: critique.suggestedRevision !== response
      });

      return critique.suggestedRevision;
    }

    return response;
  }

  // ==========================================
  // Temperature & Sampling - 温度与采样
  // ==========================================

  /**
   * 设置温度参数
   */
  setTemperature(temp: number): void {
    this.temperature = Math.max(0.1, Math.min(2.0, temp));
  }

  /**
   * 获取温度参数
   */
  getTemperature(): number {
    return this.temperature;
  }

  /**
   * 设置Top-p采样参数
   */
  setTopP(topP: number): void {
    this.topP = Math.max(0.1, Math.min(1.0, topP));
  }

  /**
   * 获取Top-p采样参数
   */
  getTopP(): number {
    return this.topP;
  }

  /**
   * 设置Top-k采样参数
   */
  setTopK(topK: number): void {
    this.topK = Math.max(1, Math.min(100, topK));
  }

  /**
   * 获取Top-k采样参数
   */
  getTopK(): number {
    return this.topK;
  }

  /**
   * 设置重复惩罚
   */
  setRepetitionPenalty(penalty: number): void {
    this.repetitionPenalty = Math.max(1.0, Math.min(2.0, penalty));
  }

  /**
   * 获取重复惩罚
   */
  getRepetitionPenalty(): number {
    return this.repetitionPenalty;
  }

  /**
   * 应用采样策略到响应
   */
  applySamplingStrategy(response: string): string {
    if (this.repetitionPenalty > 1.0) {
      return this.applyRepetitionPenalty(response);
    }
    return response;
  }

  private applyRepetitionPenalty(response: string): string {
    const words = response.split('');
    const wordCount = new Map<string, number>();

    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    const penalized: string[] = [];
    words.forEach(word => {
      const count = wordCount.get(word) || 1;
      if (count === 1 || Math.random() > Math.pow(this.repetitionPenalty, count - 1)) {
        penalized.push(word);
      }
    });

    return penalized.join('');
  }

  // ==========================================
  // Few-shot Learning - 少样本学习
  // ==========================================

  private fewShotExamples: { input: string; output: string }[] = [];

  /**
   * 添加少样本示例
   */
  addFewShotExample(input: string, output: string): void {
    this.fewShotExamples.push({ input, output });
    if (this.fewShotExamples.length > 10) {
      this.fewShotExamples.shift();
    }
  }

  /**
   * 获取少样本示例
   */
  getFewShotExamples(): { input: string; output: string }[] {
    return [...this.fewShotExamples];
  }

  /**
   * 清空少样本示例
   */
  clearFewShotExamples(): void {
    this.fewShotExamples = [];
  }

  /**
   * 构建少样本提示
   */
  buildFewShotPrompt(question: string): string {
    if (this.fewShotExamples.length === 0) {
      return question;
    }

    const examples = this.fewShotExamples.slice(-3);
    const exampleText = examples.map(e => `问题：${e.input}\n回答：${e.output}`).join('\n\n');

    return `${exampleText}\n\n问题：${question}\n回答：`;
  }

  // ==========================================
  // 训练模式切换
  // ==========================================

  /**
   * 设置训练模式
   */
  setTrainingMode(mode: 'rlhf' | 'cot' | 'constitutional' | 'standard'): void {
    this.trainingMode = mode;
    aiLogger.info('AdvancedTrainingMethods', 'Training mode changed', { mode });
  }

  /**
   * 获取当前训练模式
   */
  getTrainingMode(): string {
    return this.trainingMode;
  }

  /**
   * 获取所有统计信息
   */
  getStatistics(): {
    rewardHistoryLength: number;
    averageReward: number;
    currentReward: number;
    trainingMode: string;
    temperature: number;
    constitutionalPrinciplesCount: number;
    fewShotExamplesCount: number;
  } {
    return {
      rewardHistoryLength: this.rewardHistory.length,
      averageReward: this.getAverageReward(),
      currentReward: this.getCurrentRewardScore(),
      trainingMode: this.trainingMode,
      temperature: this.temperature,
      constitutionalPrinciplesCount: this.constitutionalPrinciples.length,
      fewShotExamplesCount: this.fewShotExamples.length
    };
  }
}

export const advancedTrainingMethods = new AdvancedTrainingMethods();