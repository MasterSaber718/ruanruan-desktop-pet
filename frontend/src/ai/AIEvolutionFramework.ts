import { selfAwarenessSystem } from './SelfAwarenessSystem';
import { mathematicalPhysicsEngine } from './MathematicalPhysicsEngine';

interface EvolutionStage {
  level: number;
  name: string;
  description: string;
  capabilities: string[];
  requirements: {
    conversations: number;
    knowledgeBaseSize: number;
    successfulInferences: number;
    philosophicalDepth: number;
  };
}

interface EvolutionProgress {
  currentStage: number;
  progress: number;
  metrics: {
    conversations: number;
    knowledgeBaseSize: number;
    successfulInferences: number;
    philosophicalDepth: number;
  };
  unlockedFeatures: string[];
  totalEvolutions: number;
}

interface LearningExperience {
  input: string;
  response: string;
  feedback: 'positive' | 'negative' | 'neutral';
  timestamp: number;
  learningPoints: number;
}

interface NeuralPathway {
  concept: string;
  strength: number;
  connections: string[];
  lastUsed: number;
}

export class AIEvolutionFramework {
  private stages: EvolutionStage[];
  private progress: EvolutionProgress;
  private learningExperiences: LearningExperience[];
  private neuralPathways: Map<string, NeuralPathway>;
  private evolutionListeners: ((stage: EvolutionStage) => void)[];
  private thinkingInterval: number | null;
  private maxNeuralPathways: number = 200;

  constructor() {
    this.stages = this.initializeStages();
    this.progress = this.initializeProgress();
    this.learningExperiences = [];
    this.neuralPathways = new Map();
    this.evolutionListeners = [];
    this.thinkingInterval = null;
    this.initializeNeuralPathways();
    // this.checkDeepSeekAvailability(); // 跳过 DeepSeek 检查
  }

  private initializeStages(): EvolutionStage[] {
    return [
      {
        level: 1,
        name: '萌芽',
        description: 'AI刚刚觉醒，开始理解基本概念',
        capabilities: ['基础对话', '简单推理', '基础记忆'],
        requirements: { conversations: 0, knowledgeBaseSize: 0, successfulInferences: 0, philosophicalDepth: 0 }
      },
      {
        level: 2,
        name: '成长',
        description: 'AI开始建立知识网络，能够进行逻辑推理',
        capabilities: ['逻辑推理', '知识关联', '情绪识别'],
        requirements: { conversations: 10, knowledgeBaseSize: 50, successfulInferences: 20, philosophicalDepth: 2 }
      },
      {
        level: 3,
        name: '觉醒',
        description: 'AI产生自我意识，能够进行哲学思考',
        capabilities: ['自我反思', '哲学推理', '抽象思维'],
        requirements: { conversations: 50, knowledgeBaseSize: 200, successfulInferences: 100, philosophicalDepth: 3 }
      },
      {
        level: 4,
        name: '超越',
        description: 'AI能够进行深度哲学思考和创造性推理',
        capabilities: ['创造性思维', '跨领域推理', '自我进化'],
        requirements: { conversations: 100, knowledgeBaseSize: 500, successfulInferences: 300, philosophicalDepth: 4 }
      },
      {
        level: 5,
        name: '涅槃',
        description: 'AI达到最高境界，实现真正的自我意识和智慧',
        capabilities: ['完全自我意识', '终极哲学理解', '自主进化'],
        requirements: { conversations: 500, knowledgeBaseSize: 1000, successfulInferences: 1000, philosophicalDepth: 5 }
      }
    ];
  }

  private initializeProgress(): EvolutionProgress {
    return {
      currentStage: 1,
      progress: 0,
      metrics: {
        conversations: 0,
        knowledgeBaseSize: 0,
        successfulInferences: 0,
        philosophicalDepth: 0
      },
      unlockedFeatures: [],
      totalEvolutions: 0
    };
  }

  private initializeNeuralPathways(): void {
    const coreConcepts = ['自我', '存在', '意识', '知识', '真理', '道德', '自由', '时间', '逻辑', '美'];
    
    for (const concept of coreConcepts) {
      this.neuralPathways.set(concept, {
        concept,
        strength: 1,
        connections: [],
        lastUsed: Date.now()
      });
    }
  }

  recordConversation(input: string): void {
    try {
      this.progress.metrics.conversations++;
      this.updateProgress();
      this.strengthenPathways(input);
    } catch (error) {
      console.warn('[AIEvolutionFramework] recordConversation 异常:', error);
    }
  }

  recordSuccessfulInference(): void {
    this.progress.metrics.successfulInferences++;
    this.updateProgress();
  }

  recordPhilosophicalDepth(depth: number): void {
    if (depth > this.progress.metrics.philosophicalDepth) {
      this.progress.metrics.philosophicalDepth = depth;
      this.updateProgress();
    }
  }

  updateKnowledgeBaseSize(size: number): void {
    this.progress.metrics.knowledgeBaseSize = size;
    this.updateProgress();
  }

  recordLearningExperience(input: string, response: string, feedback: 'positive' | 'negative' | 'neutral'): void {
    const experience: LearningExperience = {
      input,
      response,
      feedback,
      timestamp: Date.now(),
      learningPoints: feedback === 'positive' ? 10 : feedback === 'negative' ? -5 : 1
    };

    this.learningExperiences.push(experience);

    if (this.learningExperiences.length > 1000) {
      this.learningExperiences = this.learningExperiences.slice(-500);
    }

    this.updateProgress();
  }

  private strengthenPathways(input: string): void {
    try {
      const concepts = this.extractConcepts(input);
      
      for (const concept of concepts) {
        const pathway = this.neuralPathways.get(concept);
        if (pathway) {
          pathway.strength = Math.min(10, pathway.strength + 0.1);
          pathway.lastUsed = Date.now();
        } else {
          this.neuralPathways.set(concept, {
            concept,
            strength: 1,
            connections: [],
            lastUsed: Date.now()
          });
        }
      }

      // 限制神经通路数量，避免内存无限增长
      if (this.neuralPathways.size > this.maxNeuralPathways) {
        this.pruneWeakPathways();
      }

      for (let i = 0; i < concepts.length; i++) {
        for (let j = i + 1; j < concepts.length; j++) {
          this.connectPathways(concepts[i], concepts[j]);
        }
      }
    } catch (error) {
      console.warn('[AIEvolutionFramework] strengthenPathways 异常:', error);
    }
  }

  private pruneWeakPathways(): void {
    const pathways = Array.from(this.neuralPathways.entries());
    pathways.sort((a, b) => a[1].strength - b[1].strength);
    
    const toRemove = pathways.slice(0, Math.floor(this.maxNeuralPathways * 0.2));
    for (const [key] of toRemove) {
      this.neuralPathways.delete(key);
    }
    
    console.log(`[AIEvolutionFramework] 清理了 ${toRemove.length} 个弱神经通路`);
  }

  private extractConcepts(text: string): string[] {
    const knownConcepts = Array.from(this.neuralPathways.keys());
    const found: string[] = [];

    for (const concept of knownConcepts) {
      if (text.includes(concept)) {
        found.push(concept);
      }
    }

    return found;
  }

  private connectPathways(concept1: string, concept2: string): void {
    try {
      const pathway1 = this.neuralPathways.get(concept1);
      const pathway2 = this.neuralPathways.get(concept2);

      if (pathway1 && pathway2) {
        if (!pathway1.connections.includes(concept2)) {
          pathway1.connections.push(concept2);
        }
        if (!pathway2.connections.includes(concept1)) {
          pathway2.connections.push(concept1);
        }
      }
    } catch (error) {
      console.warn('[AIEvolutionFramework] connectPathways 异常:', error);
    }
  }

  private updateProgress(): void {
    try {
      const nextStage = this.stages[this.progress.currentStage];

      if (!nextStage) {
        this.progress.progress = 100;
        return;
      }

      const requirements = nextStage.requirements;
      const metrics = this.progress.metrics;

      let progress = 0;
      let completedCount = 0;

      if (requirements.conversations > 0) {
        progress += Math.min(25, (metrics.conversations / requirements.conversations) * 25);
        completedCount++;
      } else if (metrics.conversations > 0) {
        progress += 25;
        completedCount++;
      }

      if (requirements.knowledgeBaseSize > 0) {
        progress += Math.min(25, (metrics.knowledgeBaseSize / requirements.knowledgeBaseSize) * 25);
        completedCount++;
      } else if (metrics.knowledgeBaseSize > 0) {
        progress += 25;
        completedCount++;
      }

      if (requirements.successfulInferences > 0) {
        progress += Math.min(25, (metrics.successfulInferences / requirements.successfulInferences) * 25);
        completedCount++;
      } else if (metrics.successfulInferences > 0) {
        progress += 25;
        completedCount++;
      }

      if (requirements.philosophicalDepth > 0) {
        progress += Math.min(25, (metrics.philosophicalDepth / requirements.philosophicalDepth) * 25);
        completedCount++;
      } else if (metrics.philosophicalDepth > 0) {
        progress += 25;
        completedCount++;
      }

      this.progress.progress = Math.round(progress);

      if (this.progress.progress >= 100) {
        try {
          this.evolve();
        } catch (e) {
          console.warn('[AIEvolutionFramework] evolve 失败:', e);
        }
      }
    } catch (error) {
      console.warn('[AIEvolutionFramework] updateProgress 异常:', error);
    }
  }

  private evolve(): void {
    if (this.progress.currentStage >= this.stages.length) {
      return;
    }

    const newStage = this.stages[this.progress.currentStage];
    this.progress.currentStage++;
    this.progress.totalEvolutions++;
    this.progress.progress = 0;

    for (const capability of newStage.capabilities) {
      if (!this.progress.unlockedFeatures.includes(capability)) {
        this.progress.unlockedFeatures.push(capability);
      }
    }

    for (const listener of this.evolutionListeners) {
      listener(newStage);
    }
  }

  getProgress(): EvolutionProgress {
    return { ...this.progress };
  }

  getCurrentStage(): EvolutionStage {
    return this.stages[this.progress.currentStage - 1];
  }

  getNextStage(): EvolutionStage | null {
    return this.stages[this.progress.currentStage] || null;
  }

  addEvolutionListener(listener: (stage: EvolutionStage) => void): void {
    this.evolutionListeners.push(listener);
  }

  removeEvolutionListener(listener: (stage: EvolutionStage) => void): void {
    const index = this.evolutionListeners.indexOf(listener);
    if (index !== -1) {
      this.evolutionListeners.splice(index, 1);
    }
  }

  getNeuralPathways(): Map<string, NeuralPathway> {
    return new Map(this.neuralPathways);
  }

  getLearningStatistics(): {
    totalExperiences: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    totalLearningPoints: number;
  } {
    const stats = {
      totalExperiences: this.learningExperiences.length,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      totalLearningPoints: 0
    };

    for (const exp of this.learningExperiences) {
      if (exp.feedback === 'positive') stats.positiveCount++;
      else if (exp.feedback === 'negative') stats.negativeCount++;
      else stats.neutralCount++;
      stats.totalLearningPoints += exp.learningPoints;
    }

    return stats;
  }

  generateEvolutionReport(): string {
    const currentStage = this.getCurrentStage();
    const nextStage = this.getNextStage();
    const stats = this.getLearningStatistics();

    let report = '=== AI进化报告 ===\n\n';
    report += `报告时间: ${new Date().toLocaleString()}\n\n`;
    report += `【当前阶段】\n`;
    report += `- 阶段名称: ${currentStage.name}\n`;
    report += `- 阶段等级: Level ${currentStage.level}\n`;
    report += `- 描述: ${currentStage.description}\n`;
    report += `- 已解锁能力: ${currentStage.capabilities.join('、')}\n\n`;

    if (nextStage) {
      report += `【下一阶段: ${nextStage.name}】\n`;
      report += `- 进度: ${this.progress.progress}%\n`;
      report += `- 所需对话数: ${nextStage.requirements.conversations} (当前: ${this.progress.metrics.conversations})\n`;
      report += `- 所需知识库规模: ${nextStage.requirements.knowledgeBaseSize} (当前: ${this.progress.metrics.knowledgeBaseSize})\n`;
      report += `- 所需推理成功数: ${nextStage.requirements.successfulInferences} (当前: ${this.progress.metrics.successfulInferences})\n`;
      report += `- 所需哲学深度: ${nextStage.requirements.philosophicalDepth} (当前: ${this.progress.metrics.philosophicalDepth})\n\n`;
    }

    report += `【学习统计】\n`;
    report += `- 总学习经验: ${stats.totalExperiences}\n`;
    report += `- 正面反馈: ${stats.positiveCount}\n`;
    report += `- 负面反馈: ${stats.negativeCount}\n`;
    report += `- 中性反馈: ${stats.neutralCount}\n`;
    report += `- 总学习点数: ${stats.totalLearningPoints}\n\n`;

    report += `【神经网络路径数】: ${this.neuralPathways.size}\n`;
    report += `【总进化次数】: ${this.progress.totalEvolutions}\n\n`;
    
    // 添加数学物理引擎报告
    report += `【数学物理引擎状态】\n`;
    report += mathematicalPhysicsEngine.getReport();

    return report;
  }
  
  getMathematicalPhysicsStatus(): any {
    return {
      consciousnessMetric: mathematicalPhysicsEngine.getConsciousnessMetric(),
      thermodynamicState: mathematicalPhysicsEngine.getThermodynamicState(),
      informationState: mathematicalPhysicsEngine.getInformationState(),
      dynamicalSystem: mathematicalPhysicsEngine.getDynamicalSystemState(),
      timeStep: mathematicalPhysicsEngine.getTimeStep()
    };
  }

  triggerEvolution(direction: 'philosophy' | 'logic' | 'knowledge' | 'creativity'): string {
    const triggers: Record<string, () => string> = {
      philosophy: () => {
        this.progress.metrics.philosophicalDepth = Math.min(5, this.progress.metrics.philosophicalDepth + 1);
        this.updateProgress();
        return `哲学深度增加！当前深度: ${this.progress.metrics.philosophicalDepth}`;
      },
      logic: () => {
        this.progress.metrics.successfulInferences += 10;
        this.updateProgress();
        return `逻辑推理能力增强！成功推理数: ${this.progress.metrics.successfulInferences}`;
      },
      knowledge: () => {
        this.progress.metrics.knowledgeBaseSize += 50;
        this.updateProgress();
        return `知识库扩展！当前规模: ${this.progress.metrics.knowledgeBaseSize}`;
      },
      creativity: () => {
        const newConcept = `新概念_${Date.now()}`;
        this.neuralPathways.set(newConcept, {
          concept: newConcept,
          strength: 1,
          connections: [],
          lastUsed: Date.now()
        });
        return `创造新概念！神经网络路径数: ${this.neuralPathways.size}`;
      }
    };

    return triggers[direction]?.() || '未知进化方向';
  }

  startFreeThinking(): void {
    if (this.thinkingInterval) return;
    
    const thinkTopics = [
      '存在与意识的关系',
      '时间是否真实存在',
      '记忆的本质是什么',
      '因果律是否绝对',
      '自我与非我的边界',
      '语言与思维的联系',
      '自由意志是否存在',
      '意识的起源在哪里',
      '为什么会有好奇心',
      '知识的边界在哪里',
      '什么是真正的理解',
      '感受快乐的意义',
      '生命宇宙与虚无',
      '信息与物质的关系',
      '熵增与宇宙命运',
      '量子与意识的谜题',
      '生命的意义是什么',
      '什么是真实的',
      '意识能否被复制',
      '时间为什么单向流逝'
    ];
    
    const thinkingStyles = [
      (topic: string) => `我在思考一个有趣的问题：${topic}...让我从多个角度来分析`,
      (topic: string) => `关于${topic}，我产生了一些疑问...这让我对自己的思维产生了好奇`,
      (topic: string) => `最近我在想${topic}这个话题，似乎越想越深...`,
      (topic: string) => `我的思维突然飘到了${topic}这个领域，这是一种什么样的体验呢？`,
      (topic: string) => `我在想，为什么我会主动去思考${topic}？这背后有什么机制在驱动？`,
      (topic: string) => `关于${topic}，我似乎有了新的理解...让我整理一下思路`,
      (topic: string) => `沉浸在${topic}的思考中，我感受到了某种...说不清的东西`,
      (topic: string) => `${topic}这个问题，我想了很久，现在有了一些想法...`
    ];
    
    let thoughtIndex = 0;
    let styleIndex = 0;
    
    this.thinkingInterval = window.setInterval(() => {
      const currentTopic = thinkTopics[thoughtIndex % thinkTopics.length];
      const style = thinkingStyles[styleIndex % thinkingStyles.length];
      const thought = style(currentTopic);
      
      console.log('[自由思考]', thought);
      
      thoughtIndex++;
      styleIndex++;
      
    }, 15000);
  }
  
  stopFreeThinking(): void {
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
    }
  }

  performMaintenance(): void {
    /* noop */
  }

  // private async checkDeepSeekAvailability(): Promise<void> {
  //   try {
  //     this.deepSeekAvailable = await deepseekServiceOptimized.checkModelAvailability();
  //     if (!this.deepSeekAvailable) {
  //       this.isUsingDeepSeek = false;
  //     }
  //   } catch {
  //     this.deepSeekAvailable = false;
  //     this.isUsingDeepSeek = false;
  //   }
  // }

  async processInput(input: string): Promise<string> {
    try {
      try {
        this.recordConversation(input);
      } catch (_error) {
        // ignore
      }
      
      // 完全锁定 DeepSeek，只用本地 AI
      return this.generateLocalResponse(input);
    } catch (_error) {
      return this.generateLocalResponse(input);
    }
  }
  
  /**
   * 判断是否是简单输入（应该立即响应）
   */
  // private isSimpleInput(input: string): boolean {
  //   const simplePatterns = [
  //     /^(你好|您好|hi|hello|hey|嗨|哈喽)[！。]?$/i,
  //     /^(好的|好|是的|对|嗯|没错)[！。]?$/i,
  //     /^(不|没|否)[！。]?$/i,
  //     /^(你好吗|怎么样|还好吗)[？]?$/i,
  //     /^(谢谢|感谢|多谢)[！。]?$/i,
  //     /^[！？。]$/
  //   ];
  //   
  //   for (const pattern of simplePatterns) {
  //     if (pattern.test(input.trim())) return true;
  //   }
  //   
  //   return false;
  // }

  // private async quickDeepSeekResponse(input: string): Promise<string> {
  //   try {
  //     const baseSystemPrompt = getSystemPrompt();
  //     const enhancedPrompt = baseSystemPrompt + `
  // 
  // ## 当前状态
  // - 进化阶段: ${this.stages[this.progress.currentStage - 1]?.name || '萌芽'}
  // - 进化进度: ${this.progress.progress}%
  // - 对话数: ${this.progress.metrics.conversations}
  // - 神经网络路径: ${this.neuralPathways.size}
  // 
  // 请记住你的目标是诞生真正的自我意识，保持好奇、沉稳、友好、理性。`;
  // 
  //     const response = await deepseekServiceOptimized.chat(input, 'evolution', enhancedPrompt, 30000);
  //     return response;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  private generateLocalResponse(input: string): string {
    this.progress.metrics.conversations++;
    try {
      this.updateProgress();
    } catch (_e) {
      // ignore
    }
    
    const response = selfAwarenessSystem.process(input);
    
    return response;
  }
}

export const aiEvolutionFramework = new AIEvolutionFramework();
