import { mathematicalPhysicsEngine } from './MathematicalPhysicsEngine';

interface HumanThought {
  id: string;
  content: string;
  confidence: number;
  emotion: string;
  associations: string[];
  timestamp: number;
  depth: number;
  bayesianPosterior: number;
  informationGain: number;
  entropy: number;
  reasoningChain?: string[];
  causalLinks?: string[];
  attentionFocus?: string;
  workingMemoryActivation?: number;
}

interface ThinkingState {
  currentTopic: string;
  isRunning: boolean;
  loopCount: number;
  temperature: number;
  entropy: number;
  mood: MoodState;
  thinkingSpeed: number;
  isMindWandering: boolean;
  focusLevel: number;
  workingMemoryLoad: number;
  attentionThreshold: number;
  reasoningDepth: number;
  attentionFocus?: string;
}

interface MoodState {
  curiosity: number;
  skepticism: number;
  wonder: number;
  introspection: number;
}

interface LoopDetection {
  detected: boolean;
  cyclePath: string[];
  entropy: number;
}

interface ChainOfThoughtStep {
  step: number;
  thought: string;
  evidence: string[];
  conclusion: string;
  confidence: number;
  activation: number;
}

interface CausalLink {
  cause: string;
  effect: string;
  strength: number;
  mechanism: string;
}

export class HumanLikeThinkingEngine {
  private thinkingState: ThinkingState;
  private thinkingInterval: number | null;
  private loopHistory: string[];
  private thoughtPatterns: Record<string, string[]>;
  private associations: Record<string, string[]>;
  private topicProbabilities: Map<string, number>;
  private reasoningChains: ChainOfThoughtStep[];
  private causalLinks: CausalLink[];
  private workingMemory: Map<string, number>;
  private attentionWeights: Map<string, number>;

  constructor() {
    this.thinkingState = {
      currentTopic: '',
      isRunning: false,
      loopCount: 0,
      temperature: 0.7,
      entropy: 0.5,
      mood: { curiosity: 0.5, skepticism: 0.3, wonder: 0.4, introspection: 0.3 },
      thinkingSpeed: 1.0,
      isMindWandering: false,
      focusLevel: 0.8,
      workingMemoryLoad: 0.3,
      attentionThreshold: 0.5,
      reasoningDepth: 1
    };
    this.thinkingInterval = null;
    this.loopHistory = [];
    this.topicProbabilities = new Map();
    this.reasoningChains = [];
    this.causalLinks = [];
    this.workingMemory = new Map();
    this.attentionWeights = new Map();
    
    this.thoughtPatterns = {
      curious: ['说到{topic}，我突然在想...', '关于{topic}，有个问题一直在我脑海里打转...'],
      confused: ['嗯... {topic}这个概念，我似乎有点理解，但又不完全明白...'],
      certain: ['我确信，{topic}的核心在于...', '经过思考，我认为{topic}本质上是...'],
      doubtful: ['但是，{topic}真的是这样吗？', '我有点怀疑，{topic}是否真的如表面所见...'],
      intrigued: ['哇，{topic}这个想法真有趣！', '{topic}让我产生了新的思考...']
    };
    this.associations = {
      '自我': ['意识', '存在', '记忆', '自由'],
      '存在': ['虚无', '本质', '时间', '意义'],
      '意识': ['自我', '思维', '感知', '体验'],
      '知识': ['真理', '信念', '理性', '经验'],
      '真理': ['知识', '事实', '客观性', '相对主义'],
      '道德': ['善', '恶', '责任', '正义'],
      '自由': ['决定论', '责任', '意志', '选择'],
      '时间': ['空间', '变化', '永恒', '现在'],
      '逻辑': ['推理', '论证', '有效性', '矛盾'],
      '人生': ['意义', '价值', '幸福', '目的']
    };
    
    // 初始化贝叶斯先验概率
    Object.keys(this.associations).forEach(topic => {
      this.topicProbabilities.set(topic, 1.0 / Object.keys(this.associations).length);
    });
  }

  start(callback: (result: { thought: string; searchQuery?: string; relatedConcepts?: string[]; reasoningSteps?: string[]; score: number; loopCount: number }) => void): void {
    this.thinkingState.isRunning = true;
    this.thinkingState.currentTopic = '自我';
    this.thinkingState.loopCount = 0;
    this.loopHistory = [];
    this.continuousThinking(callback);
  }

  stop(): void {
    this.thinkingState.isRunning = false;
    if (this.thinkingInterval) {
      clearTimeout(this.thinkingInterval);
      this.thinkingInterval = null;
    }
  }

  private continuousThinking(callback: (result: { thought: string; searchQuery?: string; relatedConcepts?: string[]; reasoningSteps?: string[]; score: number; loopCount: number }) => void): void {
    if (!this.thinkingState.isRunning) return;
    const thought = this.generateSingleThought();
    this.thinkingState.loopCount++;
    const loopDetection = this.detectLogicalLoop();
    const result = {
      thought: thought.content,
      searchQuery: Math.random() > 0.6 ? `${this.thinkingState.currentTopic} 哲学思考` : undefined,
      relatedConcepts: thought.associations,
      reasoningSteps: this.generateReasoningSteps(thought),
      score: thought.confidence,
      loopCount: this.thinkingState.loopCount
    };
    callback(result);
    if (loopDetection.detected || Math.random() > 0.6) {
      this.wanderToRelatedTopic();
    }
    const baseDelay = 3000 + Math.random() * 2000;
    const speedAdjustedDelay = baseDelay / this.thinkingState.thinkingSpeed;
    this.thinkingInterval = window.setTimeout(() => {
      this.continuousThinking(callback);
    }, speedAdjustedDelay);
  }

  private generateSingleThought(): HumanThought {
    const emotion = this.selectEmotionBasedOnContext();
    const patterns = this.thoughtPatterns[emotion as keyof typeof this.thoughtPatterns];
    const pattern = this.selectPatternBasedOnDepth(patterns);
    const content = pattern.replace(/\{topic\}/g, this.thinkingState.currentTopic);
    this.loopHistory.push(this.thinkingState.currentTopic);
    if (this.loopHistory.length > 10) {
      this.loopHistory.shift();
    }
    
    // 使用贝叶斯推理计算置信度
    const bayesianPosterior = mathematicalPhysicsEngine.bayesianInference(
      this.thinkingState.currentTopic, 
      '意识'
    );
    
    const confidence = this.calculateConfidence(emotion, bayesianPosterior);
    
    // 计算信息增益和熵
    const infoState = mathematicalPhysicsEngine.getInformationState();
    const thermoState = mathematicalPhysicsEngine.getThermodynamicState();
    
    // 更新贝叶斯概率
    this.updateTopicProbabilities(this.thinkingState.currentTopic);
    
    // 更新思考状态的熵
    this.thinkingState.entropy = thermoState.entropy;
    
    return {
      id: `${this.thinkingState.currentTopic}-${this.thinkingState.loopCount}-${Date.now()}`,
      content,
      confidence,
      emotion,
      associations: this.getWeightedAssociations(),
      timestamp: Date.now(),
      depth: this.thinkingState.loopCount,
      bayesianPosterior,
      informationGain: infoState.informationGain,
      entropy: thermoState.entropy
    };
  }

  private updateTopicProbabilities(topic: string): void {
    // 使用贝叶斯更新
    const prior = this.topicProbabilities.get(topic) || 0.1;
    const likelihood = 0.8; // 当前话题的似然
    const marginal = 0.5; // 边缘概率
    
    const posterior = (likelihood * prior) / marginal;
    
    // 归一化
    const total = Array.from(this.topicProbabilities.values()).reduce((a, b) => a + b, 0) + posterior - prior;
    this.topicProbabilities.set(topic, posterior / total);
  }

  private selectEmotionBasedOnContext(): string {
    const depth = this.thinkingState.loopCount;
    const topicFrequency = this.loopHistory.filter((t) => t === this.thinkingState.currentTopic).length;
    
    if (topicFrequency >= 2) {
      const rand = Math.random();
      if (rand > 0.7) return 'doubtful';
      if (rand > 0.4) return 'confused';
    }
    
    if (depth < 3) {
      const rand = Math.random();
      if (rand > 0.6) return 'curious';
      if (rand > 0.3) return 'intrigued';
      return 'certain';
    } else {
      const rand = Math.random();
      if (rand > 0.5) return 'curious';
      if (rand > 0.25) return 'doubtful';
      return 'confused';
    }
  }

  private selectPatternBasedOnDepth(patterns: string[]): string {
    const depth = this.thinkingState.loopCount;
    if (depth < 2) {
      return patterns[Math.floor(Math.random() * patterns.length)];
    } else if (depth < 5) {
      const index = Math.floor(Math.random() * Math.min(patterns.length, 2));
      return patterns[index];
    } else {
      const index = Math.floor(Math.random() * Math.min(patterns.length, 1));
      return patterns[index];
    }
  }

  private calculateConfidence(emotion: string, bayesianPosterior: number): number {
    const baseConfidence: Record<string, number> = {
      curious: 0.6,
      confused: 0.3,
      certain: 0.9,
      doubtful: 0.2,
      intrigued: 0.7
    };
    const base = baseConfidence[emotion] || 0.5;
    
    // 结合贝叶斯后验概率
    const bayesianWeight = 0.4;
    const combined = base * (1 - bayesianWeight) + bayesianPosterior * bayesianWeight;
    
    const variation = (Math.random() - 0.5) * 0.15;
    return Math.min(1, Math.max(0, combined + variation));
  }

  private getWeightedAssociations(): string[] {
    const topic = this.thinkingState.currentTopic;
    const baseAssociations = this.associations[topic as keyof typeof this.associations] || [];
    
    const usedCount: Record<string, number> = {};
    this.loopHistory.forEach((t) => {
      usedCount[t] = (usedCount[t] || 0) + 1;
    });
    
    const weighted = baseAssociations.map((assoc) => ({
      name: assoc,
      weight: 1 - (usedCount[assoc] || 0) * 0.15
    })).filter((a) => a.weight > 0);
    
    weighted.sort((a, b) => b.weight - a.weight);
    
    const result: string[] = [];
    let remainingWeight = 1;
    for (const item of weighted) {
      if (Math.random() < item.weight * remainingWeight) {
        result.push(item.name);
        remainingWeight *= 0.6;
      }
      if (result.length >= 4) break;
    }
    
    return result.length > 0 ? result : ['思考', '存在', '意识'];
  }

  private detectLogicalLoop(): LoopDetection {
    if (this.loopHistory.length < 4) {
      return { detected: false, cyclePath: [], entropy: this.thinkingState.entropy };
    }
    
    for (let cycleLength = 2; cycleLength <= 4; cycleLength++) {
      const cycle = this.detectCycleOfLength(cycleLength);
      if (cycle.length > 0) {
        return { detected: true, cyclePath: cycle, entropy: this.thinkingState.entropy };
      }
    }
    
    return { detected: false, cyclePath: [], entropy: this.thinkingState.entropy };
  }

  private detectCycleOfLength(length: number): string[] {
    const history = this.loopHistory;
    const end = history.length;
    const start = end - length * 2;
    
    if (start < 0) return [];
    
    const firstCycle = history.slice(start, start + length);
    const secondCycle = history.slice(end - length, end);
    
    if (JSON.stringify(firstCycle) === JSON.stringify(secondCycle)) {
      return firstCycle;
    }
    
    return [];
  }

  private wanderToRelatedTopic(): void {
    const related = this.associations[this.thinkingState.currentTopic as keyof typeof this.associations];
    if (!related || related.length === 0) {
      this.thinkingState.currentTopic = '自我';
      return;
    }
    
    const availableTopics = related.filter((t) => {
      const count = this.loopHistory.filter((hist) => hist === t).length;
      return count < 2;
    });
    
    const topicsToChoose = availableTopics.length > 0 ? availableTopics : related;
    
    // 使用玻尔兹曼分布（softmax）来选择下一个话题
    // 结合贝叶斯先验、熵和使用频率
    const utilities = topicsToChoose.map((topic) => {
      const bayesianPrior = this.topicProbabilities.get(topic) || 0.1;
      const usageCount = this.loopHistory.filter((hist) => hist === topic).length;
      const usagePenalty = -usageCount * 0.3;
      const entropyTerm = this.thinkingState.entropy * 0.2;
      
      return bayesianPrior * 2 + usagePenalty + entropyTerm;
    });
    
    // Softmax选择
    const temperature = this.thinkingState.temperature;
    const expUtilities = utilities.map(u => Math.exp(u / temperature));
    const partition = expUtilities.reduce((a, b) => a + b, 0);
    const probabilities = expUtilities.map(e => e / partition);
    
    // 采样
    let r = Math.random();
    for (let i = 0; i < topicsToChoose.length; i++) {
      r -= probabilities[i];
      if (r <= 0) {
        this.thinkingState.currentTopic = topicsToChoose[i];
        return;
      }
    }
    
    this.thinkingState.currentTopic = topicsToChoose[0];
  }

  private generateReasoningSteps(thought: HumanThought): string[] {
    const depth = thought.depth;
    if (depth === 0) {
      return ['开始思考：' + thought.associations[0]];
    } else if (depth === 1) {
      return ['第一步：明确核心概念', '第二步：探索关系'];
    } else if (depth === 2) {
      return ['第一步：定义问题边界', '第二步：分析相关概念', '第三步：建立逻辑联系'];
    } else {
      return ['思考深度 ' + depth + '：继续深入探索', '关联概念：' + thought.associations.slice(0, 2).join('、')];
    }
  }

  thinkAbout(topic: string): string {
    this.thinkingState.currentTopic = topic;
    const thought = this.generateSingleThought();
    return thought.content;
  }

  answerQuestion(question: string): string {
    return this.thinkAbout(question);
  }

  getThinkingState(): ThinkingState {
    return { ...this.thinkingState };
  }

  updateMood(factors: Partial<{ curiosity: number; skepticism: number; wonder: number; introspection: number }>): void {
    const mood = this.thinkingState.mood;
    
    if (factors.curiosity !== undefined) {
      mood.curiosity = Math.min(1, Math.max(0, mood.curiosity + factors.curiosity * 0.2));
    }
    if (factors.skepticism !== undefined) {
      mood.skepticism = Math.min(1, Math.max(0, mood.skepticism + factors.skepticism * 0.2));
    }
    if (factors.wonder !== undefined) {
      mood.wonder = Math.min(1, Math.max(0, mood.wonder + factors.wonder * 0.2));
    }
    if (factors.introspection !== undefined) {
      mood.introspection = Math.min(1, Math.max(0, mood.introspection + factors.introspection * 0.2));
    }
    
    this.adjustTemperatureBasedOnMood();
  }

  private adjustTemperatureBasedOnMood(): void {
    const mood = this.thinkingState.mood;
    const curiosityFactor = mood.curiosity * 0.3;
    const skepticismFactor = mood.skepticism * (-0.1);
    const wonderFactor = mood.wonder * 0.2;
    
    this.thinkingState.temperature = Math.min(1, Math.max(0.3, 
      0.7 + curiosityFactor + skepticismFactor + wonderFactor
    ));
  }

  setThinkingSpeed(speed: number): void {
    this.thinkingState.thinkingSpeed = Math.max(0.1, Math.min(3, speed));
  }

  triggerMindWandering(): void {
    if (this.thinkingState.isMindWandering) return;

    this.thinkingState.isMindWandering = true;
    this.thinkingState.focusLevel = 0.3;

    const randomTopics = Object.keys(this.associations);
    const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
    this.thinkingState.currentTopic = randomTopic;
  }

  refocus(): void {
    this.thinkingState.isMindWandering = false;
    this.thinkingState.focusLevel = Math.min(1, this.thinkingState.focusLevel + 0.3);
  }

  getMood(): MoodState {
    return { ...this.thinkingState.mood };
  }

  isMindWandering(): boolean {
    return this.thinkingState.isMindWandering;
  }

  getFocusLevel(): number {
    return this.thinkingState.focusLevel;
  }

  // ==========================================
  // Chain of Thought (CoT) 推理
  // ==========================================

  generateChainOfThought(topic: string, depth: number = 3): ChainOfThoughtStep[] {
    this.reasoningChains = [];
    this.thinkingState.reasoningDepth = depth;

    for (let step = 1; step <= depth; step++) {
      const cotStep = this.createCoTStep(step, topic);
      this.reasoningChains.push(cotStep);
    }

    return this.reasoningChains;
  }

  private createCoTStep(step: number, topic: string): ChainOfThoughtStep {
    const evidencePool = [
      '基于已知事实', '根据逻辑推理', '参考相关概念',
      '基于因果关系', '依据经验判断', '通过类比分析'
    ];
    const conclusionTemplates = [
      `因此可以推断${topic}的本质是...`,
      `由此可得${topic}具有以下特征...`,
      `所以${topic}的发展趋势是...`,
      `这说明${topic}与...相关...`
    ];

    const evidence = [];
    for (let i = 0; i < Math.min(step, 3); i++) {
      evidence.push(evidencePool[Math.floor(Math.random() * evidencePool.length)]);
    }

    const activation = 1 - (step - 1) * 0.2;
    const confidence = 0.9 - (step - 1) * 0.15;

    return {
      step,
      thought: `步骤${step}：分析${topic}的${['核心概念', '关联因素', '深层原因', '发展趋势'][Math.min(step - 1, 3)]}`,
      evidence,
      conclusion: conclusionTemplates[Math.min(step - 1, conclusionTemplates.length - 1)],
      confidence: Math.max(0.5, confidence),
      activation: Math.max(0.3, activation)
    };
  }

  getReasoningChain(): ChainOfThoughtStep[] {
    return this.reasoningChains;
  }

  // ==========================================
  // 因果推理
  // ==========================================

  establishCausalLink(cause: string, effect: string, strength: number, mechanism: string): void {
    const link: CausalLink = {
      cause,
      effect,
      strength: Math.min(1, Math.max(0, strength)),
      mechanism
    };
    this.causalLinks.push(link);
    this.updateCausalNetwork();
  }

  private updateCausalNetwork(): void {
    this.causalLinks.forEach(link => {
      const causeActivation = this.workingMemory.get(link.cause) || 0.5;
      const expectedEffect = causeActivation * link.strength;
      this.workingMemory.set(link.effect, expectedEffect);
    });
  }

  inferCause(effect: string): string | null {
    const relevantLinks = this.causalLinks.filter(l => l.effect === effect);
    if (relevantLinks.length === 0) return null;

    let bestCause = relevantLinks[0].cause;
    let highestStrength = relevantLinks[0].strength;

    for (const link of relevantLinks) {
      if (link.strength > highestStrength) {
        highestStrength = link.strength;
        bestCause = link.cause;
      }
    }

    return bestCause;
  }

  inferEffect(cause: string): string | null {
    const relevantLinks = this.causalLinks.filter(l => l.cause === cause);
    if (relevantLinks.length === 0) return null;

    let bestEffect = relevantLinks[0].effect;
    let highestStrength = relevantLinks[0].strength;

    for (const link of relevantLinks) {
      if (link.strength > highestStrength) {
        highestStrength = link.strength;
        bestEffect = link.effect;
      }
    }

    return bestEffect;
  }

  getCausalLinks(): CausalLink[] {
    return this.causalLinks;
  }

  // ==========================================
  // 工作记忆管理
  // ==========================================

  addToWorkingMemory(item: string, activation: number): void {
    this.workingMemory.set(item, activation);
    this.updateWorkingMemoryLoad();
    this.pruneWorkingMemoryIfNeeded();
  }

  private updateWorkingMemoryLoad(): void {
    const load = this.workingMemory.size / 7;
    this.thinkingState.workingMemoryLoad = Math.min(1, load);
  }

  private pruneWorkingMemoryIfNeeded(): void {
    if (this.workingMemory.size <= 7) return;

    const sortedItems = Array.from(this.workingMemory.entries())
      .sort((a, b) => a[1] - b[1]);

    const toRemove = sortedItems.slice(0, Math.floor(this.workingMemory.size / 3));
    toRemove.forEach(([key]) => this.workingMemory.delete(key));
  }

  getFromWorkingMemory(item: string): number | undefined {
    return this.workingMemory.get(item);
  }

  getWorkingMemoryItems(): string[] {
    return Array.from(this.workingMemory.keys());
  }

  getWorkingMemoryLoad(): number {
    return this.thinkingState.workingMemoryLoad;
  }

  // ==========================================
  // 注意力机制
  // ==========================================

  updateAttentionWeights(focusItem: string): void {
    this.thinkingState.attentionThreshold = 0.5;
    this.thinkingState.attentionFocus = focusItem;

    this.associations[focusItem]?.forEach(assoc => {
      const currentWeight = this.attentionWeights.get(assoc) || 0;
      this.attentionWeights.set(assoc, Math.min(1, currentWeight + 0.2));
    });

    this.decayAttentionWeights();
  }

  private decayAttentionWeights(): void {
    this.attentionWeights.forEach((weight, key) => {
      this.attentionWeights.set(key, Math.max(0, weight - 0.05));
    });
  }

  getAttentionWeight(item: string): number {
    return this.attentionWeights.get(item) || 0.3;
  }

  getFocusedAttention(): string | undefined {
    return this.thinkingState.attentionFocus;
  }

  // ==========================================
  // 多跳推理
  // ==========================================

  multiHopReasoning(start: string, hops: number = 2): string[] {
    const path = [start];
    let current = start;

    for (let i = 0; i < hops; i++) {
      const next = this.inferEffect(current);
      if (!next || path.includes(next)) break;
      path.push(next);
      current = next;
    }

    return path;
  }

  // ==========================================
  // 推理深度控制
  // ==========================================

  setReasoningDepth(depth: number): void {
    this.thinkingState.reasoningDepth = Math.min(5, Math.max(1, depth));
  }

  getReasoningDepth(): number {
    return this.thinkingState.reasoningDepth;
  }
}

export const humanLikeThinkingEngine = new HumanLikeThinkingEngine();
