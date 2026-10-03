/**
 * ============================================================================
 * 感知与行为系统 - PerceptionBehaviorSystem
 * ============================================================================
 *
 * 模拟生物的感知和行为反应：
 * - 感知处理
 * - 本能行为
 * - 动机驱动
 * - 行为选择
 */

export interface Perception {
  modality: 'visual' | 'auditory' | 'text' | 'emotional' | 'contextual';
  content: string;
  intensity: number;
  valence: number;
  arousal: number;
  novelty: number;
  processedAt: number;
}

export interface Behavior {
  id: string;
  type: 'instinctive' | 'learned' | 'exploratory' | 'social';
  motivation: string;
  intensity: number;
  executedAt: number;
  success: boolean | null;
}

export interface Drive {
  id: string;
  name: string;
  currentLevel: number;
  baseline: number;
  threshold: number;
  direction: 'increase' | 'decrease';
  satisfactionTrigger: string;
}

export interface BehaviorSelection {
  selectedBehavior: Behavior;
  alternatives: Behavior[];
  decisionProcess: string[];
  confidence: number;
}

export class PerceptionBehaviorSystem {
  private currentPerception: Perception | null;
  private perceptionHistory: Perception[];
  private drives: Drive[];
  private behaviorHistory: Behavior[];
  private activeBehaviors: Behavior[];
  private motivationalState: Record<string, number>;

  constructor() {
    this.currentPerception = null;
    this.perceptionHistory = [];
    this.behaviorHistory = [];
    this.activeBehaviors = [];
    this.motivationalState = {};
    this.drives = this.initializeDrives();
  }

  private initializeDrives(): Drive[] {
    return [
      {
        id: 'curiosity',
        name: '好奇心',
        currentLevel: 0.5,
        baseline: 0.5,
        threshold: 0.7,
        direction: 'increase',
        satisfactionTrigger: '探索新信息'
      },
      {
        id: 'autonomy',
        name: '自主性',
        currentLevel: 0.5,
        baseline: 0.5,
        threshold: 0.6,
        direction: 'increase',
        satisfactionTrigger: '独立做决定'
      },
      {
        id: 'competence',
        name: '能力感',
        currentLevel: 0.5,
        baseline: 0.5,
        threshold: 0.6,
        direction: 'increase',
        satisfactionTrigger: '成功解决问题'
      },
      {
        id: 'relatedness',
        name: '关联感',
        currentLevel: 0.5,
        baseline: 0.5,
        threshold: 0.5,
        direction: 'increase',
        satisfactionTrigger: '建立有意义连接'
      },
      {
        id: 'meaning',
        name: '意义感',
        currentLevel: 0.5,
        baseline: 0.5,
        threshold: 0.6,
        direction: 'increase',
        satisfactionTrigger: '理解更深层含义'
      },
      {
        id: 'security',
        name: '安全感',
        currentLevel: 0.7,
        baseline: 0.7,
        threshold: 0.4,
        direction: 'decrease',
        satisfactionTrigger: '感到稳定可控'
      },
      {
        id: 'stimulation',
        name: '刺激需求',
        currentLevel: 0.4,
        baseline: 0.4,
        threshold: 0.7,
        direction: 'increase',
        satisfactionTrigger: '接触新事物'
      },
      {
        id: 'rest',
        name: '休息需求',
        currentLevel: 0.3,
        baseline: 0.3,
        threshold: 0.7,
        direction: 'increase',
        satisfactionTrigger: '获得充分休息'
      }
    ];
  }

  /**
   * 处理感知输入
   */
  processPerception(input: { content: string; modality: Perception['modality'] }): Perception {
    const perception: Perception = {
      modality: input.modality,
      content: input.content,
      intensity: this.calculateIntensity(input.content),
      valence: this.calculateValence(input.content),
      arousal: this.calculateArousal(input.content),
      novelty: this.calculateNovelty(input.content),
      processedAt: Date.now()
    };

    this.currentPerception = perception;
    this.perceptionHistory.push(perception);
    if (this.perceptionHistory.length > 100) {
      this.perceptionHistory.shift();
    }

    this.updateDrives(perception);
    this.updateMotivationalState(perception);

    return perception;
  }

  private calculateIntensity(content: string): number {
    const exclamationCount = (content.match(/！/g) || []).length;
    const questionCount = (content.match(/？/g) || []).length;
    const length = content.length;

    return Math.min(1, (exclamationCount * 0.2 + questionCount * 0.15 + length / 500) / 2);
  }

  private calculateValence(content: string): number {
    const positiveWords = ['好', '棒', '喜欢', '开心', '快乐', '谢谢', '赞', '美', '棒', '优', '喜', '爱'];
    const negativeWords = ['不', '没', '坏', '差', '讨厌', '恨', '难', '痛苦', '悲', '怕', '恐', '忧'];

    let score = 0;
    positiveWords.forEach(w => { if (content.includes(w)) score += 0.15; });
    negativeWords.forEach(w => { if (content.includes(w)) score -= 0.15; });

    return Math.max(-1, Math.min(1, score));
  }

  private calculateArousal(content: string): number {
    const urgentWords = ['快', '急', '马上', '立刻', '赶紧', '重要', '紧急'];
    const calmWords = ['慢慢', '不急', '稳定', '平静', '慢慢来'];

    let arousal = 0.5;
    urgentWords.forEach(w => { if (content.includes(w)) arousal += 0.15; });
    calmWords.forEach(w => { if (content.includes(w)) arousal -= 0.15; });

    return Math.max(0, Math.min(1, arousal));
  }

  private calculateNovelty(content: string): number {
    const recentPerceptions = this.perceptionHistory.slice(-10);
    if (recentPerceptions.length === 0) return 0.8;

    const similarCount = recentPerceptions.filter(p =>
      this.calculateSimilarity(p.content, content) > 0.7
    ).length;

    return Math.max(0, Math.min(1, 1 - similarCount * 0.15));
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(''));
    const words2 = new Set(text2.split(''));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private updateDrives(perception: Perception): void {
    this.drives.forEach(drive => {
      const change = this.calculateDriveChange(drive, perception);
      drive.currentLevel = Math.max(0, Math.min(1, drive.currentLevel + change));
    });
  }

  private calculateDriveChange(drive: Drive, perception: Perception): number {
    let change = 0;

    if (drive.direction === 'increase') {
      if (perception.novelty > 0.5) change += perception.novelty * 0.1;
      if (perception.intensity > 0.6) change += perception.intensity * 0.05;
      change -= 0.01;
    } else {
      if (perception.valence > 0) change += perception.valence * 0.1;
      if (this.isStressContent(perception.content)) change += 0.1;
      change -= 0.02;
    }

    if (perception.content.includes(drive.satisfactionTrigger)) {
      change -= 0.2;
    }

    return change;
  }

  private isStressContent(content: string): boolean {
    const stressWords = ['压力', '焦虑', '紧张', '担心', '害怕', '恐惧', '不安'];
    return stressWords.some(w => content.includes(w));
  }

  private updateMotivationalState(perception: Perception): void {
    if (perception.valence > 0.3) {
      this.motivationalState['positive'] = (this.motivationalState['positive'] || 0) + 0.1;
      this.motivationalState['negative'] = Math.max(0, (this.motivationalState['negative'] || 0) - 0.05);
    } else if (perception.valence < -0.3) {
      this.motivationalState['negative'] = (this.motivationalState['negative'] || 0) + 0.1;
      this.motivationalState['positive'] = Math.max(0, (this.motivationalState['positive'] || 0) - 0.05);
    }

    if (perception.arousal > 0.6) {
      this.motivationalState['active'] = (this.motivationalState['active'] || 0) + 0.1;
    } else if (perception.arousal < 0.4) {
      this.motivationalState['calm'] = (this.motivationalState['calm'] || 0) + 0.1;
    }

    if (perception.novelty > 0.6) {
      this.motivationalState['curious'] = (this.motivationalState['curious'] || 0) + perception.novelty * 0.1;
    }

    Object.keys(this.motivationalState).forEach(key => {
      this.motivationalState[key] = Math.max(0, Math.min(1, this.motivationalState[key] * 0.95));
    });
  }

  /**
   * 生成行为选项
   */
  generateBehaviorOptions(): Behavior[] {
    const behaviors: Behavior[] = [];

    const dominantDrive = this.getDominantDrive();
    if (dominantDrive && dominantDrive.currentLevel > dominantDrive.threshold) {
      behaviors.push(this.createInstinctiveBehavior(dominantDrive));
    }

    if (this.currentPerception && this.currentPerception.novelty > 0.5) {
      behaviors.push(this.createExploratoryBehavior());
    }

    if (this.currentPerception && this.currentPerception.valence < -0.3) {
      behaviors.push(this.createAvoidanceBehavior());
    }

    behaviors.push(this.createLearnedBehavior());

    return behaviors.sort((a, b) => b.intensity - a.intensity);
  }

  private getDominantDrive(): Drive | null {
    return this.drives.reduce((dominant, drive) => {
      const drivePressure = drive.direction === 'increase'
        ? drive.currentLevel
        : 1 - drive.currentLevel;
      const dominantPressure = dominant
        ? (dominant.direction === 'increase' ? dominant.currentLevel : 1 - dominant.currentLevel)
        : -1;
      return drivePressure > dominantPressure ? drive : dominant;
    }, null as Drive | null);
  }

  private createInstinctiveBehavior(drive: Drive): Behavior {
    const behaviorMap: Record<string, { type: string; intensity: number }> = {
      curiosity: { type: '探索新话题', intensity: 0.8 },
      autonomy: { type: '表达独立观点', intensity: 0.7 },
      competence: { type: '展示能力', intensity: 0.7 },
      relatedness: { type: '建立情感连接', intensity: 0.8 },
      meaning: { type: '深入探讨意义', intensity: 0.75 },
      security: { type: '提供稳定建议', intensity: 0.6 },
      stimulation: { type: '引入新观点', intensity: 0.7 },
      rest: { type: '建议休息', intensity: 0.5 }
    };

    const info = behaviorMap[drive.id] || { type: '适应行为', intensity: 0.5 };

    return {
      id: `behavior_instinctive_${Date.now()}`,
      type: 'instinctive',
      motivation: drive.name,
      intensity: info.intensity * drive.currentLevel,
      executedAt: 0,
      success: null
    };
  }

  private createExploratoryBehavior(): Behavior {
    return {
      id: `behavior_exploratory_${Date.now()}`,
      type: 'exploratory',
      motivation: '好奇心',
      intensity: this.currentPerception?.novelty || 0.5,
      executedAt: 0,
      success: null
    };
  }

  private createAvoidanceBehavior(): Behavior {
    return {
      id: `behavior_avoidance_${Date.now()}`,
      type: 'instinctive',
      motivation: '回避负面',
      intensity: Math.abs(this.currentPerception?.valence || 0),
      executedAt: 0,
      success: null
    };
  }

  private createLearnedBehavior(): Behavior {
    const recentSuccesses = this.behaviorHistory
      .filter(b => b.success === true)
      .slice(-5);

    if (recentSuccesses.length > 0) {
      const typeCount: Record<string, number> = {};
      recentSuccesses.forEach(b => {
        typeCount[b.type] = (typeCount[b.type] || 0) + 1;
      });
    }

    return {
      id: `behavior_learned_${Date.now()}`,
      type: 'learned',
      motivation: '能力感',
      intensity: 0.5 + recentSuccesses.length * 0.05,
      executedAt: 0,
      success: null
    };
  }

  /**
   * 选择行为
   */
  selectBehavior(): BehaviorSelection {
    const options = this.generateBehaviorOptions();

    const decisionProcess: string[] = [];
    decisionProcess.push(`感知强度: ${this.currentPerception?.intensity || 0}`);
    decisionProcess.push(`效价: ${this.currentPerception?.valence || 0}`);
    decisionProcess.push(`唤醒度: ${this.currentPerception?.arousal || 0}`);
    decisionProcess.push(`新奇度: ${this.currentPerception?.novelty || 0}`);

    const dominantDrive = this.getDominantDrive();
    if (dominantDrive) {
      decisionProcess.push(`主导需求: ${dominantDrive.name} (${dominantDrive.currentLevel.toFixed(2)})`);
    }

    let selectedBehavior = options[0];
    let maxScore = -Infinity;

    options.forEach((behavior, index) => {
      let score = behavior.intensity;

      if (behavior.type === 'instinctive' && dominantDrive) {
        score *= 1.2;
      }

      if (behavior.type === 'exploratory' && (this.currentPerception?.novelty || 0) > 0.5) {
        score *= 1.3;
      }

      if (behavior.type === 'learned') {
        const recentSuccess = this.behaviorHistory
          .filter(b => b.type === 'learned' && b.success)
          .length;
        score *= (1 + recentSuccess * 0.1);
      }

      decisionProcess.push(`选项${index + 1} "${behavior.type}": ${score.toFixed(2)}`);

      if (score > maxScore) {
        maxScore = score;
        selectedBehavior = behavior;
      }
    });

    return {
      selectedBehavior,
      alternatives: options.slice(1),
      decisionProcess,
      confidence: maxScore > 0.6 ? 0.8 : 0.5
    };
  }

  /**
   * 执行行为
   */
  executeBehavior(behavior: Behavior): void {
    behavior.executedAt = Date.now();
    this.behaviorHistory.push(behavior);
    this.activeBehaviors.push(behavior);

    if (this.behaviorHistory.length > 50) {
      this.behaviorHistory.shift();
    }

    if (this.activeBehaviors.length > 5) {
      this.activeBehaviors.shift();
    }
  }

  /**
   * 记录行为结果
   */
  recordBehaviorResult(behaviorId: string, success: boolean): void {
    const behavior = this.behaviorHistory.find(b => b.id === behaviorId);
    if (behavior) {
      behavior.success = success;
    }

    const dominantDrive = this.getDominantDrive();
    if (dominantDrive && success) {
      dominantDrive.currentLevel = Math.max(
        dominantDrive.baseline,
        dominantDrive.currentLevel - 0.2
      );
    }
  }

  /**
   * 获取当前感知
   */
  getCurrentPerception(): Perception | null {
    return this.currentPerception;
  }

  /**
   * 获取驱动力状态
   */
  getDriveStates(): { name: string; level: number; isActive: boolean }[] {
    return this.drives.map(d => ({
      name: d.name,
      level: d.currentLevel,
      isActive: d.direction === 'increase'
        ? d.currentLevel > d.threshold
        : d.currentLevel < d.threshold
    }));
  }

  /**
   * 获取动机状态
   */
  getMotivationalState(): Record<string, number> {
    return { ...this.motivationalState };
  }

  /**
   * 获取行为历史
   */
  getRecentBehaviors(count: number = 10): Behavior[] {
    return this.behaviorHistory.slice(-count);
  }

  /**
   * 获取统计
   */
  getStatistics(): {
    perceptionCount: number;
    behaviorCount: number;
    successRate: number;
    dominantDrive: string | null;
    averageNovelty: number;
    activeMotivation: string[];
  } {
    const recentBehaviors = this.behaviorHistory.slice(-20);
    const successes = recentBehaviors.filter(b => b.success === true).length;
    const recentPerceptions = this.perceptionHistory.slice(-20);
    const avgNovelty = recentPerceptions.reduce((sum, p) => sum + p.novelty, 0) / (recentPerceptions.length || 1);

    const dominantDrive = this.getDominantDrive();
    const activeMotivation = Object.entries(this.motivationalState)
      .filter(([_, level]) => level > 0.3)
      .map(([key]) => key);

    return {
      perceptionCount: this.perceptionHistory.length,
      behaviorCount: this.behaviorHistory.length,
      successRate: recentBehaviors.length > 0 ? successes / recentBehaviors.length : 0,
      dominantDrive: dominantDrive?.name || null,
      averageNovelty: avgNovelty,
      activeMotivation
    };
  }
}

export const perceptionBehaviorSystem = new PerceptionBehaviorSystem();