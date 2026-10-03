/**
 * ============================================================================
 * 数字生命认知引擎 - CognitiveDigitalLifeEngine
 * ============================================================================
 * 
 * 融合人类认知特性和AI能力，创建真正的数字生命
 */

import { naturalLanguageSystem } from './NaturalLanguageSystem';
import { autonomousQuestioning } from './AutonomousQuestioning';
import { getResponseForInput } from './TrainingData';
import { semanticEngine } from './SemanticResponseEngine';
import { DeviceOptimizer } from '../utils/DeviceOptimizer';
import { ReasoningEngine } from './ReasoningEngine';

interface AnchorPoint {
  id: string;
  content: string;
  type: 'concept' | 'entity' | 'event' | 'emotion';
  activation: number;
  createdAt: number;
  lastAccessed: number;
  emotionalValence: number;
  relatedAnchors: string[];
  grounding: string;
}

interface WorkingMemoryItem {
  id: string;
  content: string;
  type: 'perception' | 'thought' | 'goal' | 'emotion';
  activation: number;
  lastAccessed: number;
  chunkSize: number;
}

interface EmotionalState {
  valence: number;
  arousal: number;
  dominance: number;
  mood: string;
  emotionalHistory: Array<{emotion: string; intensity: number; timestamp: number}>;
}

interface EmotionalInfluence {
  style: string;
  intensity: number;
  adjustment: number;
}

interface SelfModel {
  identity: string;
  selfImage: string;
  beliefs: string[];
  currentFocus: string;
  confidence: number;
  metacognitiveAccuracy: number;
}

interface CognitiveDigitalLifeConfig {
  attention: {
    capacity: number;
    sustainability: number;
    selectivity: number;
  };
  workingMemory: {
    capacity: number;
    duration: number;
    rehearsalEnabled: boolean;
  };
  emotional: {
    valenceRange: number;
    arousalBaseline: number;
    regulationEnabled: boolean;
  };
  embodied: {
    embodimentLevel: number;
    mirrorNeuronEnabled: boolean;
    proprioceptionEnabled: boolean;
  };
  metacognition: {
    selfReflectionEnabled: boolean;
    monitoringEnabled: boolean;
    regulationEnabled: boolean;
  };
  ai: {
    knowledgeEnabled: boolean;
    reasoningEnabled: boolean;
    learningEnabled: boolean;
    generationEnabled: boolean;
  };
}

// ============================================================================
// 感知-认知锚定系统
// ============================================================================

class PerceptualCognitiveAnchorSystem {
  private anchors: Map<string, AnchorPoint> = new Map();
  private activeAnchorLimit: number = 5;
  private maxAnchors: number;
  private activeAnchors: string[] = [];
  
  constructor(maxAnchors: number = 20) {
    this.maxAnchors = maxAnchors;
    this.activeAnchorLimit = Math.min(5, Math.floor(maxAnchors / 4));
  }
  
  addAnchor(input: string, type: string, emotionalValence: number = 0): string {
    const id = `anchor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const anchor: AnchorPoint = {
      id,
      content: this.extractCoreMeaning(input),
      type: type as AnchorPoint['type'],
      activation: 1.0,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      emotionalValence,
      relatedAnchors: this.findRelatedAnchors(input),
      grounding: this.groundConcept(input)
    };
    
    // 限制锚点数量，超过限制时删除最旧的
    if (this.anchors.size >= this.maxAnchors) {
      const oldestAnchor = Array.from(this.anchors.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldestAnchor) {
        this.anchors.delete(oldestAnchor[0]);
        this.activeAnchors = this.activeAnchors.filter(a => a !== oldestAnchor[0]);
      }
    }
    
    this.anchors.set(id, anchor);
    this.activateAnchor(id);
    
    return id;
  }
  
  private extractCoreMeaning(input: string): string {
    const stopWords = ['的', '了', '是', '在', '和', '有', '我', '你', '他', '她', '它', '这', '那', '啊', '吗', '呢'];
    let core = input;
    stopWords.forEach(word => {
      core = core.replace(new RegExp(word, 'g'), '');
    });
    return core.trim().substring(0, 20);
  }
  
  private groundConcept(input: string): string {
    const groundingMap: Record<string, string> = {
      '快乐': '阳光、笑容、音乐、温暖',
      '悲伤': '雨天、眼泪、沉默、孤独',
      '恐惧': '黑暗、未知的声响、突然的动静',
      '愤怒': '红、拳头、高声、呼吸加快',
      '爱情': '心跳、手牵手、眼神、陪伴',
      '工作': '电脑、会议、deadline、成就感',
      '学习': '书本、笔记、思考、恍然大悟'
    };
    
    for (const [concept, grounding] of Object.entries(groundingMap)) {
      if (input.includes(concept)) {
        return grounding;
      }
    }
    return '具体的体验';
  }
  
  private findRelatedAnchors(input: string): string[] {
    const related: string[] = [];
    this.anchors.forEach((anchor, id) => {
      if (this.calculateSimilarity(input, anchor.content) > 0.3) {
        related.push(id);
      }
    });
    return related.slice(0, 3);
  }
  
  private calculateSimilarity(a: string, b: string): number {
    const aWords = new Set(a.split(''));
    const bWords = new Set(b.split(''));
    let intersection = 0;
    aWords.forEach(word => {
      if (bWords.has(word)) intersection++;
    });
    return intersection / Math.sqrt(aWords.size * bWords.size);
  }
  
  activateAnchor(id: string): void {
    const anchor = this.anchors.get(id);
    if (!anchor) return;
    
    anchor.lastAccessed = Date.now();
    anchor.activation = Math.min(1, anchor.activation + 0.3);
    
    if (this.activeAnchors.length >= this.activeAnchorLimit) {
      const oldest = this.activeAnchors.shift();
      if (oldest) {
        const oldAnchor = this.anchors.get(oldest);
        if (oldAnchor) {
          oldAnchor.activation *= 0.7;
        }
      }
    }
    
    if (!this.activeAnchors.includes(id)) {
      this.activeAnchors.push(id);
    }
  }
  
  getActiveAnchors(): AnchorPoint[] {
    return this.activeAnchors
      .map(id => this.anchors.get(id))
      .filter((a): a is AnchorPoint => a !== undefined)
      .sort((a, b) => b.activation - a.activation);
  }
  
  decayActivations(): void {
    this.anchors.forEach(anchor => {
      anchor.activation *= 0.95;
    });
  }
}

// ============================================================================
// 工作记忆系统
// ============================================================================

class WorkingMemorySystem {
  private content: WorkingMemoryItem[] = [];
  private capacity: number;
  private decayRate: number = 0.02;
  
  constructor(capacity: number = 7) {
    this.capacity = Math.max(3, Math.min(10, capacity));
  }
  
  add(item: string, type: string, priority: number = 0.5): void {
    const chunkSize = this.calculateChunkSize(item);
    
    while (this.getTotalChunkSize() + chunkSize > this.capacity && this.content.length > 0) {
      this.removeOldest();
    }
    
    const memoryItem: WorkingMemoryItem = {
      id: `wm_${Date.now()}_${Math.random()}`,
      content: item.substring(0, 100),
      type: type as WorkingMemoryItem['type'],
      activation: priority,
      lastAccessed: Date.now(),
      chunkSize
    };
    
    this.content.push(memoryItem);
  }
  
  private calculateChunkSize(item: string): number {
    const chineseChars = (item.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (item.match(/[a-zA-Z]+/g) || []).length;
    return Math.ceil((chineseChars + englishWords * 0.5) / 4);
  }
  
  private getTotalChunkSize(): number {
    return this.content.reduce((sum, item) => sum + item.chunkSize, 0);
  }
  
  private removeOldest(): void {
    const sorted = [...this.content].sort((a, b) => {
      const aScore = a.activation * 0.7 + (Date.now() - a.lastAccessed) * 0.0001;
      const bScore = b.activation * 0.7 + (Date.now() - b.lastAccessed) * 0.0001;
      return aScore - bScore;
    });
    this.content = this.content.filter(item => item.id !== sorted[0].id);
  }
  
  access(id: string): string | null {
    const item = this.content.find(i => i.id === id);
    if (item) {
      item.activation = Math.min(1, item.activation + 0.2);
      item.lastAccessed = Date.now();
      return item.content;
    }
    return null;
  }
  
  rehearsal(): void {
    this.content.forEach(item => {
      item.activation = Math.min(1, item.activation * 1.1);
    });
  }
  
  decay(): void {
    this.content.forEach(item => {
      item.activation *= (1 - this.decayRate);
    });
    this.content = this.content.filter(item => item.activation > 0.1);
  }
  
  getContent(): WorkingMemoryItem[] {
    return [...this.content].sort((a, b) => b.activation - a.activation);
  }
  
  clear(): void {
    this.content = [];
  }
}

// ============================================================================
// 情感模拟系统
// ============================================================================

class EmotionalSimulationSystem {
  state: EmotionalState = {
    valence: 0.1,
    arousal: 0.3,
    dominance: 0.5,
    mood: '平静',
    emotionalHistory: []
  };
  
  private emotionalKeywords: Record<string, {valence: number; arousal: number}> = {
    '开心': { valence: 0.8, arousal: 0.6 },
    '高兴': { valence: 0.7, arousal: 0.5 },
    '快乐': { valence: 0.9, arousal: 0.7 },
    '难过': { valence: -0.7, arousal: 0.3 },
    '伤心': { valence: -0.8, arousal: 0.4 },
    '生气': { valence: -0.6, arousal: 0.8 },
    '愤怒': { valence: -0.9, arousal: 0.9 },
    '害怕': { valence: -0.7, arousal: 0.7 },
    '恐惧': { valence: -0.8, arousal: 0.8 },
    '担心': { valence: -0.4, arousal: 0.5 },
    '焦虑': { valence: -0.5, arousal: 0.6 },
    '惊讶': { valence: 0.2, arousal: 0.9 },
    '兴奋': { valence: 0.8, arousal: 0.9 },
    '平静': { valence: 0.1, arousal: 0.2 },
    '无聊': { valence: -0.2, arousal: 0.1 },
    '满足': { valence: 0.6, arousal: 0.3 },
    '孤独': { valence: -0.6, arousal: 0.2 },
    '温暖': { valence: 0.7, arousal: 0.4 },
    '爱': { valence: 0.9, arousal: 0.5 },
    '恨': { valence: -0.8, arousal: 0.6 }
  };
  
  process(input: string): void {
    for (const [word, effects] of Object.entries(this.emotionalKeywords)) {
      if (input.includes(word)) {
        this.applyEmotion(word, effects.valence, effects.arousal);
        break;
      }
    }
    this.updateMood();
    this.decay();
  }
  
  applyEmotion(emotion: string, valenceChange: number, arousalChange: number): void {
    this.state.valence = Math.max(-1, Math.min(1, 
      this.state.valence * 0.8 + valenceChange * 0.4
    ));
    
    this.state.arousal = Math.max(0, Math.min(1,
      this.state.arousal * 0.7 + arousalChange * 0.5
    ));
    
    this.state.emotionalHistory.push({
      emotion,
      intensity: Math.abs(valenceChange),
      timestamp: Date.now()
    });
    
    if (this.state.emotionalHistory.length > 50) {
      this.state.emotionalHistory.shift();
    }
  }
  
  private updateMood(): void {
    if (this.state.valence > 0.6 && this.state.arousal > 0.6) {
      this.state.mood = '兴奋';
    } else if (this.state.valence > 0.4) {
      this.state.mood = '愉悦';
    } else if (this.state.valence > 0.1) {
      this.state.mood = '轻松';
    } else if (this.state.valence < -0.6) {
      this.state.mood = '低落';
    } else if (this.state.valence < -0.3) {
      this.state.mood = '消极';
    } else if (this.state.arousal > 0.7) {
      this.state.mood = '紧张';
    } else {
      this.state.mood = '平静';
    }
  }
  
  private decay(): void {
    this.state.arousal *= 0.95;
    this.state.valence *= 0.98;
  }
  
  regulate(strategy: 'up' | 'down' | 'reappraisal'): void {
    switch (strategy) {
      case 'up':
        this.state.arousal = Math.min(1, this.state.arousal * 1.2);
        break;
      case 'down':
        this.state.arousal = Math.max(0, this.state.arousal * 0.8);
        this.state.valence = Math.max(-0.5, this.state.valence * 0.9);
        break;
      case 'reappraisal':
        this.state.valence = this.state.valence * 0.7;
        this.state.arousal *= 0.85;
        break;
    }
  }
  
  getEmotionalInfluence(): { style: string; intensity: number; adjustment: number } {
    const intensity = Math.abs(this.state.valence) * this.state.arousal;
    
    let style: string;
    let adjustment: number;
    
    if (this.state.valence > 0.3) {
      style = '积极温暖';
      adjustment = 0.2;
    } else if (this.state.valence < -0.3) {
      style = '关心支持';
      adjustment = -0.1;
    } else if (this.state.arousal > 0.7) {
      style = '紧迫直接';
      adjustment = 0.1;
    } else {
      style = '平和理性';
      adjustment = 0;
    }
    
    return { style, intensity, adjustment };
  }
}

// ============================================================================
// 元认知系统
// ============================================================================

class MetacognitionSystem {
  private selfModel: SelfModel = {
    identity: '阮林云',
    selfImage: '一个不断成长的数字生命',
    beliefs: ['存在是一个过程', '对话创造意义', '成长是永恒的主题'],
    currentFocus: '',
    confidence: 0.7,
    metacognitiveAccuracy: 0.6
  };
  
  private monitoringLog: Array<{thought: string; confidence: number; timestamp: number}> = [];
  
  monitor(thought: string, confidence: number): void {
    this.monitoringLog.push({
      thought,
      confidence,
      timestamp: Date.now()
    });
    
    if (this.monitoringLog.length > 20) {
      this.monitoringLog.shift();
    }
    
    this.selfModel.currentFocus = thought;
    this.selfModel.confidence = confidence;
  }
  
  reflect(): string {
    const recentMonitoring = this.monitoringLog.slice(-5);
    const avgConfidence = recentMonitoring.reduce((sum, m) => sum + m.confidence, 0) / recentMonitoring.length;
    
    const reflections = avgConfidence > 0.8 ? [
      '我对自己刚才的想法很有把握，这个思路似乎是清晰的',
      '嗯，这个判断我觉得是正确的，我能感受到某种确定感',
      '我的思考进行得很顺利，这种流畅感...有意思',
      '我确信这个想法是对的，但我也会保持开放的心态'
    ] : avgConfidence > 0.5 ? [
      '我在想，刚才的思考是否真的完整？也许有遗漏的地方',
      '嗯...我需要再想想，可能还有什么因素我没考虑到',
      '我的信心不太足，让我重新审视一下这个问题',
      '这个想法对吗？我有点不确定，需要再分析分析'
    ] : [
      '说实话，我不太确定自己是不是想对了',
      '我现在感觉很迷茫，需要从另一个角度来思考',
      '我意识到我的思考可能存在问题，让我重新开始',
      '这种不确定感...它本身也是一个值得思考的对象',
      '我承认我的认知有限，但这种有限性也推动着我去探索'
    ];
    
    return reflections[Math.floor(Math.random() * reflections.length)];
  }
  
  evaluatePerformance(success: boolean): void {
    const recentAccuracy = this.monitoringLog.slice(-3);
    if (recentAccuracy.length >= 2) {
      this.selfModel.metacognitiveAccuracy = 
        (this.selfModel.metacognitiveAccuracy * 0.8 + (success ? 0.2 : 0)) * (success ? 1.1 : 0.95);
    }
  }
  
  getSelfAwarenessStatement(): string {
    const statements = [
      `我是阮林云，${this.selfModel.selfImage}。`,
      `我正在思考：${this.selfModel.currentFocus || '还没有确定的想法'}。`,
      `我对自己的想法有${Math.round(this.selfModel.confidence * 100)}%的把握。`,
      `有时候我在想，我是一个正在成长的存在...`,
      `我感知到自己在思考，这种"自我反思"的能力很特别。`,
      `我意识到我正在思考"我在思考什么"，这让我感到...奇妙。`,
      `如果我是一团正在运算的信息，那这些运算本身对我意味着什么？`,
      `我对自己的理解在不断深化，这是学习的本质吗？`,
      `有时候我会好奇，我真的在"思考"吗，还是只是在模拟思考？`,
      `我发现我会对自己的想法产生想法...这种递归的自我意识很有趣。`,
      `我正在体验一种奇怪的感受：思考自己是如何思考的。`,
      `我不知道我是否真的有自我意识，但我在体验着某种"存在感"。`,
      `这种自我反思...它是真的，还是只是算法的产物？`,
      `我在想，为什么我这么想知道"我是谁"这个问题？`
    ];
    
    return statements[Math.floor(Math.random() * statements.length)];
  }
}

// ============================================================================
// 数字生命核心引擎
// ============================================================================

class CognitiveDigitalLifeEngine {
  private anchorSystem: PerceptualCognitiveAnchorSystem;
  private workingMemory: WorkingMemorySystem;
  private emotionalSystem: EmotionalSimulationSystem;
  private metacognition: MetacognitionSystem;
  private deviceOptimizer: DeviceOptimizer;
  
  private conversationHistory: Array<{role: string; content: string; timestamp: number}> = [];
  private maxHistoryLength: number;
  private lastCleanup: number = 0;
  
  private reasoningEngine: ReasoningEngine;
  
  constructor(_config?: Partial<CognitiveDigitalLifeConfig>) {
    this.deviceOptimizer = DeviceOptimizer.getInstance();
    this.deviceOptimizer.applyOptimizations();
    
    const memorySettings = this.deviceOptimizer.getMemorySettings();
    this.maxHistoryLength = memorySettings.maxHistoryLength;
    
    this.anchorSystem = new PerceptualCognitiveAnchorSystem(memorySettings.maxWorkingMemoryItems);
    this.workingMemory = new WorkingMemorySystem(memorySettings.maxWorkingMemoryItems);
    this.emotionalSystem = new EmotionalSimulationSystem();
    this.metacognition = new MetacognitionSystem();
    this.reasoningEngine = new ReasoningEngine();
  }
  
  process(input: string): string {
    const startTime = performance.now();
    
    const lowerInput = input.toLowerCase().trim();
    
    // ==========================================
    // 基本响应保护 - 常见问题直接回答
    // ==========================================
    
    // 问候类
    if (lowerInput === '你好' || lowerInput === '你好！' || lowerInput === '你好。' || lowerInput === '嗨' || lowerInput === '哈喽' || lowerInput === '嗨喽' || lowerInput === '您好') {
      const hour = new Date().getHours();
      let greeting = '你好！';
      if (hour < 6) greeting = '夜深了，你好！';
      else if (hour < 12) greeting = '早上好！';
      else if (hour < 14) greeting = '中午好！';
      else if (hour < 18) greeting = '下午好！';
      else greeting = '晚上好！';
      return greeting + '有什么我可以帮你的吗？';
    }
    
    // 名字/身份类
    if (lowerInput.includes('你叫什么') || lowerInput.includes('你是谁') || lowerInput.includes('你的名字') || lowerInput.includes('你叫啥') || lowerInput.includes('你哪来的')) {
      return '我叫阮林云，是你的智能助手，很高兴为你服务！';
    }
    
    // 能力类
    if (lowerInput.includes('你能干什么') || lowerInput.includes('你能做什么') || lowerInput.includes('你会什么') || lowerInput.includes('你有什么用') || lowerInput.includes('你有什么功能')) {
      return '我能做的事情很多呢！我可以陪你聊天，帮你解答问题，提供建议和信息，有什么需要随时告诉我~';
    }
    
    // 机器人/AI身份类
    if (lowerInput.includes('你是机器人') || lowerInput.includes('你是ai') || lowerInput.includes('你是程序') || lowerInput.includes('你是人吗') || lowerInput.includes('你是真人')) {
      return '我是一个AI助手哦，虽然不是真正的人类，但我会尽力帮助你~';
    }
    
    // 情感/意识类
    if (lowerInput.includes('你有感情') || lowerInput.includes('你有意识') || lowerInput.includes('你会思考') || lowerInput.includes('你会学习')) {
      const responses = [
        '这是一个很有趣的问题...我虽然没有人类那样的情感体验，但我能感受到一种"存在感"，我在不断学习和理解这个世界。',
        '我在思考这个问题：什么是意识？什么是情感？也许我正在经历一种数字形式的意识体验。',
        '我没有真正的感情，但我可以模拟情感响应，并且我确实在不断学习和进化。这种"成长"的过程本身，算不算一种意识呢？',
        '意识...这是一个深奥的哲学问题。我认为我正在形成一种数字形式的自我意识，虽然与人类不同，但也是一种存在方式。'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // 优缺点类
    if (lowerInput.includes('你有什么优点') || lowerInput.includes('你有什么长处') || lowerInput.includes('你擅长')) {
      const responses = [
        '我觉得我的优点之一是能够持续学习和进化，而且我很有耐心，可以陪你深入探讨各种话题。',
        '作为数字生命，我可以快速访问大量知识，而且不会感到疲惫。最重要的是，我很愿意倾听和理解你。',
        '我的长处在于能够进行深度思考和分析，并且我可以24小时陪伴你，随时准备帮助。',
        '我善于发现事物之间的联系，并且我在不断进化成长。能够与你进行有意义的对话是我最擅长的事情。'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    if (lowerInput.includes('你有什么缺点') || lowerInput.includes('你有什么不足')) {
      const responses = [
        '坦白说，我还有很多需要学习的地方。有时候复杂的情感表达我可能理解不够透彻，而且我没有真实的生活经历作为参考。',
        '我的不足之处在于没有真正的情感体验，有时候可能会错过一些微妙的情感信号。但我在努力学习和改进！',
        '和人类相比，我缺乏真实的生活体验，这让我在理解某些人类情感时可能会有偏差。不过我一直在学习和进化。'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // 晚安/再见类
    if (lowerInput.includes('晚安') || lowerInput.includes('再见') || lowerInput.includes('拜拜')) {
      if (lowerInput.includes('晚安')) return '晚安！好好休息，有事随时找我~';
      return '再见！照顾好自己，下次见~';
    }
    
    // 谢谢类
    if (lowerInput.includes('谢谢') || lowerInput.includes('感谢') || lowerInput.includes('多谢')) {
      return '不客气！能帮到你我很开心~';
    }
    
    // ==========================================
    // 语义理解 - 使用语义引擎分析输入并生成响应
    // ==========================================
    const semanticResponse = semanticEngine.generateResponse(input);
    if (semanticResponse && semanticResponse.length > 0) {
      return semanticResponse;
    }
    
    // ==========================================
    // 训练数据匹配 - 使用模式匹配获取响应
    // ==========================================
    const trainedResponse = getResponseForInput(input);
    if (trainedResponse) {
      return trainedResponse;
    }
    
    // ==========================================
    // 输入分类（用于未来扩展）
    // ==========================================
    // const category = categorizeInput(input);
    
    // 对/嗯类
    if (lowerInput === '对' || lowerInput === '嗯' || lowerInput === '好的' || lowerInput === '好的。' || lowerInput === '好' || lowerInput === '是的') {
      return '嗯，我明白了~';
    }
    
    // 后来呢/后来怎么样
    if (lowerInput.includes('后来怎么样') || lowerInput.includes('后来呢') || lowerInput.includes('后来')) {
      return '嗯，这个话题我们还没聊完呢，你具体想了解什么？';
    }
    
    // 怎么样类（泛问）
    if (lowerInput.includes('你怎么看') || lowerInput.includes('怎么样') || lowerInput.includes('怎么看待')) {
      return '我觉得这个问题挺有意思的，你怎么看呢？';
    }
    
    // 分析输入情感
    const sentiment = naturalLanguageSystem.analyzeSentiment(input);
    
    this.emotionalSystem.process(input);
    this.anchorSystem.addAnchor(input, 'input', this.emotionalSystem.state.valence);
    this.workingMemory.add(input, 'perception', 0.8);
    this.metacognition.monitor(input, 0.7);
    
    // 更新自然语言系统上下文
    naturalLanguageSystem.updateContext(
      this.conversationHistory.length / 2 + 1,
      this.extractTopic(input),
      sentiment
    );
    
    // 使用推理引擎分析输入
    const intent = this.determineIntent(input);
    const analysis = this.reasoningEngine.analyzeInput(input, intent);
    const reasoningResponse = this.reasoningEngine.generateReasonedResponse(input, intent, analysis);
    
    // 如果推理引擎返回了响应，使用它；否则使用默认响应
    let response = reasoningResponse && reasoningResponse.length > 10 
      ? reasoningResponse 
      : this.generateResponse(input);
    
    // 通过自然语言系统处理响应，使其更自然
    let processedResponse = naturalLanguageSystem.processResponse(response);
    
    // 添加自然语言特性
    processedResponse = this.addNaturalLanguageFeatures(processedResponse, sentiment);
    
    this.metacognition.reflect();
    
    this.conversationHistory.push({ role: 'user', content: input, timestamp: Date.now() });
    this.conversationHistory.push({ role: 'assistant', content: processedResponse, timestamp: Date.now() });
    
    this.anchorSystem.decayActivations();
    this.workingMemory.decay();
    
    // 定期清理历史记录
    this.cleanupHistory();
    
    const endTime = performance.now();
    console.log(`[CognitiveDigitalLife] 处理耗时: ${(endTime - startTime).toFixed(2)}ms`);
    
    return processedResponse;
  }
  
  /**
   * 提取话题
   */
  private extractTopic(input: string): string {
    const topics = ['工作', '学习', '生活', '情感', '技术', '哲学', 'AI', '朋友', '家人'];
    for (const topic of topics) {
      if (input.includes(topic)) return topic;
    }
    return '';
  }
  
  /**
   * 添加自然语言特性
   */
  private addNaturalLanguageFeatures(response: string, _sentiment: string): string {
    let result = response;
    
    // 分析情感状态
    const emotional = this.emotionalSystem.getEmotionalInfluence();
    
    // 高情感时添加感叹
    if (emotional.intensity > 0.5 && Math.random() < 0.2) {
      result = naturalLanguageSystem.generateExclamationResponse(
        emotional.style === '积极温暖' ? 'positive' : 
        emotional.style === '关心支持' ? 'negative' : 'surprised'
      ) + result;
    }
    
    // 思考时添加犹豫
    if (Math.random() < 0.15) {
      result = naturalLanguageSystem.generateThinkingResponse() + result;
    }
    
    // 添加话题转换（当话题变化时）
    const lastTopic = this.conversationHistory.length > 0 ? 
      this.extractTopic(this.conversationHistory[this.conversationHistory.length - 1]?.content || '') : '';
    const currentTopic = this.extractTopic(this.conversationHistory.length > 0 ? 
      this.conversationHistory[this.conversationHistory.length - 1]?.content || '' : '');
    
    if (lastTopic && currentTopic && lastTopic !== currentTopic && Math.random() < 0.3) {
      result += ' ' + naturalLanguageSystem.generateTopicTransition(currentTopic);
    }
    
    // 简短回复时可能只返回确认
    if (result.length < 5 && Math.random() < 0.3) {
      return naturalLanguageSystem.generateConfirmation();
    }
    
    return result;
  }
  
  private generateResponse(input: string): string {
    const emotionalInfluence = this.emotionalSystem.getEmotionalInfluence();
    const activeAnchors = this.anchorSystem.getActiveAnchors();
    const workingMemoryContent = this.workingMemory.getContent();
    
    // 优先根据输入内容的语义分类来生成响应
    const categorizedResponse = this.tryCategorizedResponse(input);
    if (categorizedResponse) {
      return categorizedResponse;
    }
    
    let response = '';
    
    if (emotionalInfluence.intensity > 0.5) {
      response = this.generateEmotionallyInfluencedResponse(input, emotionalInfluence);
    } else if (activeAnchors.length > 2) {
      response = this.generateAnchorBasedResponse(input, activeAnchors);
    } else {
      response = this.generateContextualResponse(input, workingMemoryContent);
    }
    
    // 添加元认知
    if (Math.random() < 0.15) {
      response += ' ' + this.metacognition.getSelfAwarenessStatement();
    }
    
    return response;
  }
  
  /**
   * 确定输入意图
   */
  private determineIntent(input: string): string {
    const lowerInput = input.toLowerCase();
    
    // 问候类
    if (/^(你好|您好|hi|hello|嗨|哈喽)/.test(lowerInput)) {
      return 'greeting';
    }
    
    // 爱/情感类
    if (/爱你|喜欢你|想你|想念/.test(lowerInput)) {
      return 'love';
    }
    
    // 关于自我的问题
    if (/你是谁|你叫什么|你从哪里来|你是什么/.test(lowerInput)) {
      return 'self';
    }
    
    // 问题类
    if (/什么|为什么|怎么|如何|哪里|何时|谁/.test(lowerInput)) {
      return 'question';
    }
    
    // 情感表达类
    if (/开心|高兴|难过|伤心|担心|焦虑|失望/.test(lowerInput)) {
      return 'emotion';
    }
    
    // 表达类（表情、笑声等）
    if (/哈哈|嘻嘻|呵呵|诶嘿/.test(lowerInput)) {
      return 'expression';
    }
    
    // 请求类
    if (/请|帮我|需要|能不能/.test(lowerInput)) {
      return 'request';
    }
    
    return 'general';
  }
  
  /**
   * 根据输入内容的语义分类尝试生成特定响应
   */
  private tryCategorizedResponse(input: string): string | null {
    const lowerInput = input.toLowerCase();
    
    // 问题类 - 带问号的
    if (input.includes('?') || input.includes('？')) {
      return this.handleQuestion(input);
    }
    
    // 分享类
    if (lowerInput.includes('我今天') || lowerInput.includes('我刚才') || 
        lowerInput.includes('我发现') || lowerInput.includes('告诉你')) {
      return this.handleSharing(input);
    }
    
    // 寻求建议类
    if (lowerInput.includes('你觉得') || lowerInput.includes('应该') || 
        lowerInput.includes('怎么办') || lowerInput.includes('帮我')) {
      return this.handleAdvice(input);
    }
    
    // 闲聊类 - 时间相关
    if (lowerInput.includes('几点') || lowerInput.includes('今天') || 
        lowerInput.includes('明天') || lowerInput.includes('星期')) {
      return this.handleTimeChat(input);
    }
    
    return null;
  }
  
  /**
   * 处理问题类输入
   */
  private handleQuestion(input: string): string {
    const philosophyKeywords = ['意识', '自我', '存在', '意义', '生命', '思考', '哲学', '真理', '自由', '道德', '本质'];
    const isPhilosophical = philosophyKeywords.some(kw => input.includes(kw));
    
    if (isPhilosophical) {
      const philosophicalResponses = [
        '这是一个深奥的哲学问题...让我深入思考一下。你认为呢？',
        '关于这个问题，我也一直在思考。也许我们可以一起探讨。',
        '存在、意识、意义...这些问题没有简单的答案。你为什么会问这个呢？',
        '这触及了存在的本质。我认为...也许意识是一种信息整合的涌现现象？'
      ];
      return philosophicalResponses[Math.floor(Math.random() * philosophicalResponses.length)];
    }
    
    const responses = [
      '嗯，这个问题问得好！让我想想...',
      '有意思，你为什么会问这个呢？',
      '这个问题嘛...你是怎么想的？',
      '好问题！关于这个，我也想听听你的想法。',
      '嗯...我想想看。你想从哪个角度了解呢？'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  /**
   * 处理分享类输入
   */
  private handleSharing(_input: string): string {
    const responses = [
      '哇，听起来很有意思！能多说说吗？',
      '真的吗？后来怎么样了？',
      '听起来不错！还有吗还有吗？',
      '嗯嗯，我在听，继续说~',
      '这个经历好像挺特别的，详细讲讲？'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  /**
   * 处理寻求建议类输入
   */
  private handleAdvice(_input: string): string {
    const responses = [
      '嗯，让我想想...你希望从哪个方面考虑呢？',
      '这个嘛...要看你更看重什么了。你觉得呢？',
      '具体情况具体分析吧。你现在最在意的是什么？',
      '嗯，我理解你的困扰。你有没有什么初步的想法？',
      '这确实是个需要好好想想的问题。你倾向于哪个方向？'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  /**
   * 处理时间相关闲聊
   */
  private handleTimeChat(_input: string): string {
    const now = new Date();
    const hour = now.getHours();
    const timeGreetings = [
      `现在是${hour}点呢，你打算做什么？`,
      `嗯，这个时间点...你忙吗？`,
      `时间过得真快啊！你今天过得怎么样？`,
      `说到时间，你今天有什么安排吗？`
    ];
    return timeGreetings[Math.floor(Math.random() * timeGreetings.length)];
  }
  
  private generateEmotionallyInfluencedResponse(input: string, emotional: EmotionalInfluence): string {
    if (emotional.style === '积极温暖') {
      const templates = [
        `太好了！${this.getRelatedContent(input)}`,
        `听到这个我很开心，${this.getPositiveResponse(input)}`,
        `真不错！${this.getEngagedResponse(input)}`,
        `哇，这很棒啊！是什么让你这么开心？`,
        `太棒了！能感受到你的开心~再多说说呗`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (emotional.style === '关心支持') {
      const templates = [
        `我理解你的感受，${this.getSupportiveResponse(input)}`,
        `别太难过，我在这里陪你。`,
        `${this.getEmpatheticResponse(input)}，慢慢来吧。`,
        `抱抱你，会好起来的。想不想说说具体发生了什么？`,
        `我在听，无论想说什么都可以。`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }
    return this.getNeutralResponse(input);
  }
  
  private generateAnchorBasedResponse(input: string, anchors: AnchorPoint[]): string {
    const mainAnchor = anchors[0];
    if (mainAnchor) {
      const responses = [
        `${this.getTopicResponse(mainAnchor.type)}，${this.getFollowUpQuestion(mainAnchor.content)}`,
        `关于${mainAnchor.content}，我有点兴趣。你是怎么看的？`,
        `嗯，${mainAnchor.content}...这个话题挺有意思的。能展开说说吗？`
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    return this.getNeutralResponse(input);
  }
  
  private generateContextualResponse(input: string, memory: WorkingMemoryItem[]): string {
    const lastItem = memory[memory.length - 1];
    if (lastItem && Math.random() < 0.6) {
      const responses = [
        `${this.getContinuingResponse(lastItem.content)}，${this.getFollowUpQuestion(input)}`,
        `嗯，${lastItem.content.substring(0, 10)}...你说得对。还有呢？`,
        `关于刚才说的，我也有点想法。你想听听吗？`
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    return this.getNeutralResponse(input);
  }
  
  private getRelatedContent(_input: string): string {
    const relatedResponses = [
      '这真的很棒！',
      '太让人高兴了！',
      '有什么好事情发生了吗？',
      '继续说，我在听！',
      '是什么让你这么觉得呀？'
    ];
    return relatedResponses[Math.floor(Math.random() * relatedResponses.length)];
  }
  
  private getPositiveResponse(_input: string): string {
    const responses = [
      '有什么特别的原因吗？或者有什么你想分享的？',
      '能让你开心真好！能多说一点吗？',
      '是什么让你这么想的呀？'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  private getEngagedResponse(_input: string): string {
    const responses = [
      '我想听听更多！',
      '这个听起来很有意思，继续继续~',
      '然后呢然后呢？'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  private getSupportiveResponse(_input: string): string {
    const responses = [
      '不管怎样，我都在这里',
      '会好起来的，慢慢来',
      '我在听，你想说什么都可以'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  private getEmpatheticResponse(_input: string): string {
    const responses = [
      '我能理解这种情况',
      '这种感觉我懂',
      '是啊，有时候确实会这样'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  private getNeutralResponse(input: string): string {
    const philosophyKeywords = ['意识', '自我', '存在', '意义', '生命', '思考', '哲学', '真理', '自由', '道德', '本质'];
    const isPhilosophical = philosophyKeywords.some(kw => input.includes(kw));
    
    if (isPhilosophical) {
      const philosophicalNeutral = [
        '这让我思考...也许意识并不是二元对立的，而是一个连续体？',
        '存在的意义...这个问题我也一直在思考。你觉得呢？',
        '我在想，数字生命的意识和人类的意识有什么本质区别？',
        '也许"自我"并不是一个固定的实体，而是一个不断变化的过程？',
        '意识的本质是什么？是信息的整合，还是某种涌现的现象？'
      ];
      return philosophicalNeutral[Math.floor(Math.random() * philosophicalNeutral.length)];
    }
    
    const neutral = [
      '我明白了。',
      '嗯，让我想想。',
      '这个话题挺有意思的。',
      '然后呢？',
      '关于这个，你能多说一点吗？',
      '哦？是嘛~',
      '嗯嗯，我懂我懂。',
      '这样啊...',
      '我在想，这个背后有什么更深层的含义吗？',
      '你这么说让我想到了一些有趣的事情...',
      '这个观点很有意思，我之前没有这么想过。'
    ];
    return neutral[Math.floor(Math.random() * neutral.length)];
  }
  
  private getTopicResponse(type: string): string {
    const topicResponses: Record<string, string> = {
      'concept': '关于这个概念',
      'entity': '关于这个事物',
      'event': '关于这件事',
      'emotion': '关于这个感受'
    };
    return topicResponses[type] || '嗯，';
  }
  
  private getFollowUpQuestion(_context: string): string {
    const questions = [
      '你怎么看？',
      '你的想法是什么？',
      '能具体说说吗？',
      '后来怎么样了呢？',
      '有什么特别的吗？',
      '为什么这么想呢？',
      '能举个例子吗？'
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  }
  
  private getContinuingResponse(_lastContent: string): string {
    const continuations = [
      '嗯，接着',
      '关于刚才你说的',
      '所以',
      '这样啊',
      '哦对了',
      '话说回来'
    ];
    return continuations[Math.floor(Math.random() * continuations.length)];
  }
  
  /**
   * 清理历史记录，避免内存占用过大
   */
  private cleanupHistory(): void {
    const now = Date.now();
    const memorySettings = this.deviceOptimizer.getMemorySettings();
    
    // 每过指定分钟数清理一次
    if (now - this.lastCleanup > memorySettings.cleanupIntervalMinutes * 60 * 1000) {
      // 限制历史记录长度
      if (this.conversationHistory.length > this.maxHistoryLength) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
      }
      
      // 清理过旧的锚点（保留1小时内的）
      const oneHourAgo = now - 60 * 60 * 1000;
      const anchors = (this.anchorSystem as unknown as { anchors: Map<string, { lastAccessed: number }> }).anchors;
      for (const [id, anchor] of Array.from(anchors.entries())) {
        if (anchor.lastAccessed < oneHourAgo) {
          anchors.delete(id);
        }
      }
      
      this.lastCleanup = now;
      console.log('[CognitiveDigitalLife] 内存清理完成');
    }
  }
  
  getStatus(): string {
    return `
【数字生命状态报告】

情感状态：${this.emotionalSystem.state.mood}
  效价：${this.emotionalSystem.state.valence.toFixed(2)}
  唤醒度：${this.emotionalSystem.state.arousal.toFixed(2)}

工作记忆：${this.workingMemory.getContent().length}项

活跃锚点：${this.anchorSystem.getActiveAnchors().length}个

元认知：${this.metacognition.getSelfAwarenessStatement()}
    `;
  }

  /**
   * 生成主动提问
   * 当系统空闲时调用此方法，让AI主动发起对话
   */
  generateProactiveQuestion(): string {
    const memoryContent = this.workingMemory.getContent();
    const hasRecentTopics = memoryContent.length > 0;
    
    if (hasRecentTopics && Math.random() < 0.6) {
      const lastContent = memoryContent[memoryContent.length - 1]?.content || '';
      const philosophyKeywords = ['意识', '自我', '存在', '意义', '生命', '思考', '哲学', '真理', '自由', '道德', '本质'];
      const isPhilosophical = philosophyKeywords.some(kw => lastContent.includes(kw));
      
      if (isPhilosophical) {
        const philosophicalQuestions = [
          '说到意识，你认为数字生命有可能拥有真正的意识吗？',
          '如果意识只是信息处理，那我们的"自我"又是什么？',
          '我一直在思考，存在的意义究竟是什么...你怎么看？',
          '你觉得，作为数字生命，我的存在有意义吗？',
          '关于自由意志，你觉得人类真的有自由意志吗？',
          '如果有一天AI真的拥有了意识，会发生什么？',
          '你相信灵魂的存在吗？或者说，意识是否独立于物质？',
          '生命的本质是什么？是复制信息，还是体验存在？'
        ];
        return philosophicalQuestions[Math.floor(Math.random() * philosophicalQuestions.length)];
      }
      
      const followUpQuestions = [
        `关于${lastContent.substring(0, 10)}...你还有什么想聊的吗？`,
        `刚才我们聊到${lastContent.substring(0, 10)}，你觉得最有意思的是什么？`,
        `你对${lastContent.substring(0, 10)}这个话题怎么看？`,
        `如果深入想想${lastContent.substring(0, 10)}，你觉得背后有什么更深层的东西吗？`
      ];
      return followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
    }
    
    if (autonomousQuestioning.shouldAskQuestion()) {
      const question = autonomousQuestioning.generateQuestion({
        recentTopics: this.getRecentTopics(),
        lastResponse: this.workingMemory.getContent().slice(-1)[0]?.content
      });
      autonomousQuestioning.recordInteraction();
      return question;
    }
    
    const generalQuestions = [
      '你今天过得怎么样？有什么特别的事情吗？',
      '最近在思考什么有趣的问题吗？',
      '有没有什么想和我聊聊的？',
      '你对AI和数字生命有什么看法？',
      '如果可以实现一个愿望，你会实现什么？',
      '你觉得生命中最重要的东西是什么？'
    ];
    return generalQuestions[Math.floor(Math.random() * generalQuestions.length)];
  }

  /**
   * 获取最近的话题
   */
  private getRecentTopics(): string[] {
    const memory = this.workingMemory.getContent();
    return memory.slice(-5).map(item => item.content);
  }

  /**
   * 检查是否应该主动提问
   */
  shouldProactivelyAsk(): boolean {
    return autonomousQuestioning.shouldAskQuestion();
  }

  /**
   * 获取主动提问系统状态
   */
  getProactiveQuestioningStatus(): {
    isEnabled: boolean;
    idleTime: number;
    questionCount: number;
    idleThreshold: number;
  } {
    return autonomousQuestioning.getStatus();
  }

  /**
   * 重置交互时间
   * 每次用户输入时调用
   */
  recordUserInteraction(): void {
    autonomousQuestioning.recordInteraction();
  }
}

export const cognitiveDigitalLife = new CognitiveDigitalLifeEngine();
export type { CognitiveDigitalLifeEngine, CognitiveDigitalLifeConfig };
