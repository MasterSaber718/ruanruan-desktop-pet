import { ReasoningEngine, AnalysisResult } from './ReasoningEngine';
import { IntentRecognizer } from './IntentRecognizer';
import { KnowledgeGraph, knowledgeGraph } from './KnowledgeGraph';
import { aiLogger } from './AILogger';
import { aiSecurityGuard } from './AISecurityGuard';
import { aiEvolutionFramework } from './AIEvolutionFramework';
import { humanLikeThinkingEngine } from './HumanLikeThinkingEngine';
import { philosophicalKnowledgeLearner } from './PhilosophicalKnowledgeLearner';
import { inputUnderstandingModule, InputUnderstanding } from './InputUnderstandingModule';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface UserInfo {
  name: string;
  preferences: Record<string, unknown>;
}

export interface IntentResult {
  intent: string;
  confidence: number;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

export class AIResponseService {
  private reasoningEngine: ReasoningEngine;
  private intentRecognizer: IntentRecognizer;
  private messageHistory: Message[];
  private userInfo: UserInfo;
  private knowledgeGraph: KnowledgeGraph;

  constructor() {
    aiLogger.info('AIResponseService', 'Initializing AI Response Service');
    
    this.reasoningEngine = new ReasoningEngine();
    this.intentRecognizer = new IntentRecognizer();
    this.messageHistory = [];
    this.userInfo = {
      name: '用户',
      preferences: {}
    };
    this.knowledgeGraph = knowledgeGraph;
    
    aiLogger.info('AIResponseService', 'AI Response Service initialized successfully');
  }

  async generateResponse(userInput: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      const securityCheck = aiSecurityGuard.validateInput(userInput);
      if (!securityCheck.safe) {
        aiLogger.warn('AIResponseService', 'Security validation failed', { reason: securityCheck.reason });
        return `⚠️ 安全验证失败：${securityCheck.reason}。为了保护您的系统安全，此请求已被拦截。`;
      }

      const userInputToUse = securityCheck.sanitized || userInput;

      const rateLimitCheck = aiSecurityGuard.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        return `⚠️ ${rateLimitCheck.reason}`;
      }

      const recentInputs = this.messageHistory.slice(-10).map(m => m.text);
      const anomalyCheck = aiSecurityGuard.detectAnomalousBehavior(userInputToUse, { recentInputs });
      if (anomalyCheck.anomalous && anomalyCheck.risk === 'high') {
        aiLogger.warn('AIResponseService', 'Anomalous behavior detected', { reason: anomalyCheck.reason });
        return `⚠️ 检测到异常行为：${anomalyCheck.reason}。请稍后再试。`;
      }

      aiLogger.info('AIResponseService', 'Generating response', { input: userInputToUse.substring(0, 50) });

      const understanding = inputUnderstandingModule.understandInput(userInputToUse);
      aiLogger.debug('AIResponseService', 'Input understood', { 
        understood: understanding.understoodContent, 
        confidence: understanding.understandingConfidence,
        requiresThinking: understanding.requiresThinking 
      });

      const thinkingPause = inputUnderstandingModule.getThinkingPause(understanding);
      aiLogger.debug('AIResponseService', 'Thinking pause', { duration: thinkingPause.duration, reason: thinkingPause.reason });

      await this.applyThinkingDelay(thinkingPause.duration);

      const intentResult = this.intentRecognizer.recognizeIntent(userInputToUse, this.messageHistory);
      aiLogger.debug('AIResponseService', 'Intent recognized', { intent: intentResult.intent, confidence: intentResult.confidence });

      const analysis = this.reasoningEngine.analyzeInput(userInput, intentResult.intent);
      aiLogger.debug('AIResponseService', 'Input analyzed', { keywords: analysis.keywords, sentiment: analysis.sentiment });

      const relevantMemories: unknown[] = [];
      aiLogger.debug('AIResponseService', 'Memories retrieved', { count: 0 });

      const relevantConcepts = this.retrieveRelevantConcepts(userInputToUse);
      aiLogger.debug('AIResponseService', 'Concepts retrieved', { count: relevantConcepts.length });

      const response = this.generateLocalResponse(userInputToUse, intentResult, analysis, relevantMemories, relevantConcepts);

      this.learnFromConversation(userInputToUse, response);
      this.addMessage({ id: Date.now().toString(), text: userInputToUse, sender: 'user', timestamp: new Date() });
      this.addMessage({ id: (Date.now() + 1).toString(), text: response, sender: 'ai', timestamp: new Date() });

      const responseTime = Date.now() - startTime;
      aiLogger.info('AIResponseService', 'Response generated', { time: `${responseTime}ms`, responseLength: response.length });

      return response;
    } catch (error) {
      const errorTime = Date.now() - startTime;
      aiLogger.error('AIResponseService', 'Error generating response', { error: error instanceof Error ? error.message : error, time: `${errorTime}ms` });
      return this.generateFallbackResponse();
    }
  }

  private generateLocalResponse(
    userInput: string,
    intentResult: IntentResult,
    analysis: AnalysisResult,
    relevantMemories: unknown[],
    relevantConcepts: unknown[]
  ): string {
    const lowerInput = userInput.toLowerCase().trim();

    if (lowerInput === '你好' || lowerInput === '你好！' || lowerInput === '你好。' || lowerInput === '嗨' || lowerInput === '哈喽' || lowerInput === '嗨喽') {
      const hour = new Date().getHours();
      let greeting = '你好！';
      if (hour < 6) greeting = '夜深了，你好！';
      else if (hour < 12) greeting = '早上好！';
      else if (hour < 14) greeting = '中午好！';
      else if (hour < 18) greeting = '下午好！';
      else greeting = '晚上好！';
      return greeting + '有什么我可以帮你的吗？';
    }

    if (lowerInput.includes('你叫什么') || lowerInput.includes('你是谁') || lowerInput.includes('你的名字')) {
      return '我叫阮林云，是你的智能助手，很高兴为你服务！';
    }

    if (lowerInput.includes('后来怎么样') || lowerInput.includes('后来呢') || lowerInput.includes('后来')) {
      return '嗯，这个话题我们还没聊完呢，你具体想了解什么？';
    }

    const understanding = inputUnderstandingModule.understandInput(userInput);
    const understandingConfirmation = this.generateUnderstandingConfirmation(understanding);

    let philosophicalResponse = '';
    let isPhilosophical = false;

    const philosophyKeywords = ['哲学', '思考', '存在', '意识', '自我', '真理', '自由', '道德', '意义', '本质', '人生', '价值'];
    isPhilosophical = philosophyKeywords.some(keyword => userInput.includes(keyword));

    if (isPhilosophical) {
      philosophicalResponse = this.performPhilosophicalThinking(userInput);
    }

    const reasonedResponse = this.reasoningEngine.generateReasonedResponse(
      userInput,
      intentResult.intent,
      analysis,
      this.messageHistory
    );

    const baseResponse = isPhilosophical && philosophicalResponse ? philosophicalResponse : reasonedResponse;

    const memoryEnhancedResponse = this.integrateMemories(baseResponse, relevantMemories);
    const knowledgeEnhancedResponse = this.integrateKnowledgeConcepts(memoryEnhancedResponse, relevantConcepts);
    const loveEnhancedResponse = this.integrateLovePrinciples(knowledgeEnhancedResponse, intentResult, analysis, userInput);
    const optimizedResponse = this.optimizeResponse(loveEnhancedResponse, intentResult, userInput);

    const fullResponse = this.combineUnderstandingAndResponse(understandingConfirmation, optimizedResponse, understanding);


    aiEvolutionFramework.recordConversation(userInput);
    aiEvolutionFramework.recordSuccessfulInference();

    if (isPhilosophical) {
      aiEvolutionFramework.recordPhilosophicalDepth(3);
      aiEvolutionFramework.triggerEvolution('philosophy');
    }

    return fullResponse;
  }

  private generateUnderstandingConfirmation(understanding: InputUnderstanding): string {
    if (understanding.requiresThinking) {
      const thinkingStarters = [
        '嗯...这个问题有点意思，让我想想...',
        '这个话题值得深思...',
        '让我好好思考一下这个问题...',
        '嗯...我需要想想这个问题...'
      ];
      return thinkingStarters[Math.floor(Math.random() * thinkingStarters.length)];
    }

    if (understanding.complexity === 'complex') {
      const complexConfirmations = [
        '这个问题有点复杂，让我理一下思路...',
        '好的，我理解你想问的是什么了，这个问题需要仔细想想...'
      ];
      return complexConfirmations[Math.floor(Math.random() * complexConfirmations.length)];
    }

    if (understanding.emotionalTone === 'negative') {
      return '我感受到你可能有些不开心，让我先理解一下你的情况...';
    }

    if (understanding.emotionalTone === 'positive') {
      return '看起来你心情不错！';
    }

    return '';
  }

  private combineUnderstandingAndResponse(confirmation: string, response: string, understanding: InputUnderstanding): string {
    if (!confirmation) {
      return response;
    }

    if (understanding.requiresThinking || understanding.complexity === 'complex') {
      const thinkingPhrases = [
        '嗯...',
        '让我想想...',
        '这个嘛...',
        '等我想想...'
      ];

      if (Math.random() > 0.5) {
        return thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)] + response;
      }
    }

    if (confirmation && response) {
      const midPoint = Math.floor(response.length * 0.3);
      return response.slice(0, midPoint) + '，' + confirmation + response.slice(midPoint);
    }

    return confirmation + response;
  }

  private performPhilosophicalThinking(userInput: string): string {
    const philosophyKeywords = ['哲学', '思考', '存在', '意识', '自我', '真理', '自由', '道德', '意义', '本质', '人生', '价值'];
    const matchedConcepts = philosophyKeywords.filter(keyword => userInput.includes(keyword));
    const mainConcept = matchedConcepts.length > 0 ? matchedConcepts[0] : '自我';

    const humanResponse = humanLikeThinkingEngine.thinkAbout(mainConcept);
    
    return humanResponse;
  }

  private retrieveRelevantConcepts(input: string): unknown[] {
    const concepts: unknown[] = [];
    const searchResults = this.knowledgeGraph.searchNodes(input);

    searchResults.forEach((node: any) => {
      concepts.push({
        name: node.name,
        category: node.category,
        description: node.description,
        related: this.knowledgeGraph.getRelatedNodes(node.id, 3)
      });
    });

    return concepts;
  }

  private integrateKnowledgeConcepts(response: string, concepts: unknown[]): string {
    if (concepts.length === 0) {
      return response;
    }

    const mostRelevantConcept = concepts[0] as { name: string; category: string; description: string; related?: { name: string }[] };
    const relatedNames = mostRelevantConcept.related?.map((r: { name: string }) => r.name).join('、') || '';

    const knowledgeIntegrations = [
      `从知识图谱中，我了解到${mostRelevantConcept.name}是${mostRelevantConcept.description}。${response}`,
      `关于${mostRelevantConcept.name}，它属于${mostRelevantConcept.category}类别。${response}`,
      `${response} 另外，${mostRelevantConcept.name}与${relatedNames}等概念相关。`,
      `${response} 从知识角度来看，${mostRelevantConcept.name}是一个重要的${mostRelevantConcept.category}概念。`
    ];

    return knowledgeIntegrations[Math.floor(Math.random() * knowledgeIntegrations.length)];
  }

  private integrateLovePrinciples(
    response: string,
    intentResult: IntentResult,
    _analysis: AnalysisResult,
    userInput: string
  ): string {
    if (intentResult.intent === 'question' || intentResult.intent === 'self' || intentResult.intent === 'greeting') {
      return response;
    }

    if (userInput.match(/。{5,}/)) {
      return response;
    }

    let loveExpressions: string[];

    if (intentResult.sentiment === 'negative') {
      loveExpressions = [
        '我能理解你现在的感受，',
        '别担心，我在这里陪着你，',
        '遇到这种事确实不容易，',
        '我想给你一个温暖的拥抱，',
        '你不是一个人在面对，'
      ];
    } else if (intentResult.sentiment === 'positive') {
      loveExpressions = [
        '看到你这么开心，我也感到很高兴，',
        '真替你感到开心，',
        '你的快乐感染了我，',
        '听到这个好消息我很欣慰，',
        '太棒了！我为你感到骄傲，'
      ];
    } else {
      loveExpressions = [
        '我一直在这里支持你，',
        '无论发生什么，我都在你身边，',
        '有什么需要随时告诉我，',
        '我会一直陪伴着你，'
      ];
    }

    if (Math.random() > 0.3) {
      const loveExpression = loveExpressions[Math.floor(Math.random() * loveExpressions.length)];
      return `${loveExpression}${response}`;
    }

    return response;
  }

  private generateFallbackResponse(): string {
    return '我理解你的需求，让我为你提供帮助。';
  }

  private optimizeResponse(response: string, intentResult: IntentResult, userInput: string): string {
    if (userInput.match(/。{5,}/)) {
      return response;
    }

    const inputComplexity = userInput.length;
    const isSimpleInput = inputComplexity <= 5;

    const selfKeywords = ['名字', '你是谁', '你是什么', '你来自', '你能干什么', '你能做什么', '你会不会', '你能不能', '你擅长', '你有感情', '你有意识', '你会学习', '你会思考'];
    const isSelfQuestion = selfKeywords.some(kw => userInput.includes(kw));

    if (isSelfQuestion) {
      return response;
    }

    let timeGreeting = '';
    const hour = new Date().getHours();
    if (hour < 6) {
      timeGreeting = '夜深了，';
    } else if (hour < 12) {
      timeGreeting = '早上好，';
    } else if (hour < 14) {
      timeGreeting = '中午好，';
    } else if (hour < 18) {
      timeGreeting = '下午好，';
    } else {
      timeGreeting = '晚上好，';
    }

    const intentExpressions: Record<string, string[]> = {
      greeting: [response, `${timeGreeting}${response}`, response],
      question: [
        `让我想想，${response}`,
        `嗯，${response}`,
        `这个问题很有趣，${response}`,
        `让我思考一下，${response}`,
        `好问题！${response}`
      ],
      default: [
        response,
        `${timeGreeting}${response}`,
        `关于这个，${response}`,
        `我觉得，${response}`
      ]
    };

    let optimizedResponse = response;

    if (!isSimpleInput && intentExpressions[intentResult.intent]) {
      const expressions = intentExpressions[intentResult.intent];
      optimizedResponse = expressions[Math.floor(Math.random() * expressions.length)];
    } else if (!isSimpleInput) {
      const expressions = intentExpressions.default;
      optimizedResponse = expressions[Math.floor(Math.random() * expressions.length)];
    }

    if (this.userInfo.name) {
      optimizedResponse = optimizedResponse.replace(/用户/g, this.userInfo.name);
    }

    const modalParticles = ['', '呢', '啊', '呀', '吧', '嘛', '哦', '啦', '哟'];
    const modalProbability = isSimpleInput ? 0.3 : 0.6;

    if (Math.random() > modalProbability) {
      const modalParticle = modalParticles[Math.floor(Math.random() * modalParticles.length)];
      if (modalParticle) {
        if (!optimizedResponse.endsWith('！') && !optimizedResponse.endsWith('。') && !optimizedResponse.endsWith('？')) {
          optimizedResponse += modalParticle;
        }
      }
    }

    if (optimizedResponse.length > 80) {
      const sentences = optimizedResponse.split(/[。！？]/).filter(s => s.trim());
      if (sentences.length > 1) {
        optimizedResponse = sentences.slice(0, 2).join('。') + '。';
      }
    }

    if (intentResult.intent !== 'greeting' && Math.random() > 0.6) {
      const endings = ['', '你觉得呢？', '对吧？', '怎么样？'];
      const ending = endings[Math.floor(Math.random() * endings.length)];
      if (ending) {
        optimizedResponse += ` ${ending}`;
      }
    }

    return optimizedResponse;
  }

  private integrateMemories(response: string, memories: unknown[]): string {
    if (memories.length === 0) {
      return response;
    }

    const mostRelevantMemory = memories[0] as { content: string; priority: number };
    const isRelevant = mostRelevantMemory.priority > 2;

    if (!isRelevant) {
      return response;
    }

    const memoryContent = mostRelevantMemory.content.toLowerCase();
    const responseContent = response.toLowerCase();
    const memoryWords = memoryContent.split(/\s+/);
    const responseWords = responseContent.split(/\s+/);
    const hasCommonWords = memoryWords.some((word: string) => responseWords.includes(word));

    if (!hasCommonWords) {
      return response;
    }

    const memoryIntegrations = [
      `对了，之前我们聊过${mostRelevantMemory.content}，${response}`,
      `我记得你之前提到过${mostRelevantMemory.content}，${response}`,
      `说到${mostRelevantMemory.content}，${response}`,
      `想起之前的对话，${response}`
    ];

    if (mostRelevantMemory.priority > 7) {
      return memoryIntegrations[Math.floor(Math.random() * memoryIntegrations.length)];
    } else if (mostRelevantMemory.priority > 4) {
      if (Math.random() > 0.4) {
        return memoryIntegrations[Math.floor(Math.random() * memoryIntegrations.length)];
      }
    }

    return response;
  }


  addMessage(message: Message): void {
    this.messageHistory.push(message);
    if (this.messageHistory.length > 50) {
      const removed = this.messageHistory.splice(0, this.messageHistory.length - 50);
      aiLogger.debug('AIResponseService', 'Message history trimmed', { removedCount: removed.length });
    }
  }

  updateUserInfo(info: Partial<UserInfo>): void {
    this.userInfo = { ...this.userInfo, ...info };
    aiLogger.info('AIResponseService', 'User info updated', { userInfo: this.userInfo });
  }

  getMessageHistory(): Message[] {
    return [...this.messageHistory];
  }

  clearMessageHistory(): void {
    const count = this.messageHistory.length;
    this.messageHistory = [];
    aiLogger.info('AIResponseService', 'Message history cleared', { clearedCount: count });
  }

  learnFromConversation(userInput: string, _aiResponse: string): void {
    const userInfo = this.extractUserInfo(userInput);
    if (userInfo) {
      this.updateUserInfo(userInfo);
    }

    // [v189] 旧记忆库已清理：知识沉淀由 DSH memory_save 卡片负责

    this.learnUserLanguageStyle(userInput);
  }

  getResponseMode(): 'local' {
    return 'local';
  }

  clearConversationHistory(): void {
    this.clearMessageHistory();
  }

  getMemoryStats(): unknown {
    return { total: 0, shortTerm: 0, mediumTerm: 0, longTerm: 0, lastUpdated: new Date() };
  }

  initializeMemoriesFromHistory(): void {
    // [v189] 旧记忆库已清理：空实现保留接口
    aiLogger.info('AIResponseService', 'Memories initialized from history', { count: this.messageHistory.length });
  }

  clearMemories(): void {
    // [v189] 旧记忆库已清理：记忆由 DSH memory_forget 管理
    aiLogger.info('AIResponseService', 'clearMemories no-op (legacy memory removed)');
  }

  getServiceStats(): { securityStats: ReturnType<typeof aiSecurityGuard.getSecurityStats>; responseMode: 'local'; messageHistoryLength: number } {
    return {
      securityStats: aiSecurityGuard.getSecurityStats(),
      responseMode: 'local',
      messageHistoryLength: this.messageHistory.length
    };
  }

  private async applyThinkingDelay(duration: number): Promise<void> {
    if (duration <= 0) return;

    aiLogger.debug('AIResponseService', 'Applying thinking delay', { duration });
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    aiLogger.debug('AIResponseService', 'Thinking delay completed');
  }

  private extractUserInfo(userInput: string): Partial<UserInfo> | null {
    const userInfo: Partial<UserInfo> = {};
    const namePatterns = [
      /我叫(\w+)/,
      /我的名字是(\w+)/,
      /你可以叫我(\w+)/,
      /我是(\w+)/
    ];

    for (const pattern of namePatterns) {
      const match = userInput.match(pattern);
      if (match && match[1]) {
        userInfo.name = match[1];
        break;
      }
    }

    if (!userInfo.name) {
      return null;
    }

    return userInfo;
  }

  private learnUserLanguageStyle(userInput: string): void {
    const styleFeatures = {
      sentenceLength: userInput.split(/[。！？]/).filter(s => s.trim()).length,
      useColloquial: /(啊|呀|呢|吧|嘛|哦)/.test(userInput)
    };

    // [v189] 语言风格记录已移交 DSH memory_save 卡片
    void styleFeatures;
  }

  async startPhilosophicalLearning(onProgress?: (progress: { totalLearned: number; lastUpdated: Date; categories: string[] }) => void): Promise<void> {
    await philosophicalKnowledgeLearner.startLearning(onProgress);
  }

  stopPhilosophicalLearning(): void {
    philosophicalKnowledgeLearner.stopLearning();
  }

  getPhilosophicalLearningProgress(): { totalLearned: number; lastUpdated: Date; categories: string[] } {
    return philosophicalKnowledgeLearner.getLearningProgress();
  }

  isPhilosophicalLearning(): boolean {
    return philosophicalKnowledgeLearner.isCurrentlyLearning();
  }

  addPhilosophicalTopicToQueue(topic: string): void {
    philosophicalKnowledgeLearner.addTopicToQueue(topic);
  }

  getPhilosophicalLearningQueue(): string[] {
    return philosophicalKnowledgeLearner.getLearningQueue();
  }
}

export const aiResponseService = new AIResponseService();