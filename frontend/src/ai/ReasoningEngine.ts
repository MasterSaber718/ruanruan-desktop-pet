import { UnifiedKnowledgeBase } from './UnifiedKnowledgeBase';

export interface AnalysisResult {
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  complexity: 'simple' | 'medium' | 'complex';
  subject: string;
  questionType?: 'what' | 'why' | 'how' | 'when' | 'where' | 'who';
  entities: string[];
  relationships: string[];
}

interface ReasoningStep {
  thought: string;
  confidence: number;
  connections: string[];
  type: 'observation' | 'inference' | 'deduction' | 'induction' | 'analogy' | 'synthesis';
}

interface LogicalRule {
  condition: string[];
  conclusion: string;
  confidence: number;
}

export class ReasoningEngine {
  private knowledgeBase: UnifiedKnowledgeBase;
  private reasoningHistory: ReasoningStep[];
  private logicalRules: LogicalRule[];

  constructor() {
    this.knowledgeBase = new UnifiedKnowledgeBase();
    this.reasoningHistory = [];
    this.logicalRules = this.initializeLogicalRules();
  }

  private initializeLogicalRules(): LogicalRule[] {
    return [
      { condition: ['如果', '那么'], conclusion: '这是一个条件推理', confidence: 0.9 },
      { condition: ['因为', '所以'], conclusion: '这是一个因果推理', confidence: 0.85 },
      { condition: ['不仅', '而且'], conclusion: '这是一个递进关系', confidence: 0.8 },
      { condition: ['虽然', '但是'], conclusion: '这是一个转折关系', confidence: 0.85 },
      { condition: ['首先', '其次', '最后'], conclusion: '这是一个序列推理', confidence: 0.9 },
      { condition: ['例如', '比如'], conclusion: '这是一个举例说明', confidence: 0.95 },
      { condition: ['换句话说', '也就是说'], conclusion: '这是一个同义转换', confidence: 0.9 },
      { condition: ['因此', '由此可见'], conclusion: '这是一个结论推导', confidence: 0.85 },
    ];
  }

  analyzeInput(userInput: string, intent: string): AnalysisResult {
    const result: AnalysisResult = {
      keywords: this.extractKeywords(userInput),
      sentiment: this.analyzeSentiment(userInput),
      complexity: this.analyzeComplexity(userInput),
      subject: this.extractSubject(userInput),
      entities: this.extractEntities(userInput),
      relationships: this.extractRelationships(userInput)
    };

    if (intent === 'question') {
      result.questionType = this.determineQuestionType(userInput);
    }

    return result;
  }

  private extractEntities(text: string): string[] {
    const entityPatterns = [
      /([\u4e00-\u9fa5]{2,}大学|学院)/g,
      /([\u4e00-\u9fa5]{2,}公司|集团|企业)/g,
      /([\u4e00-\u9fa5]{2,}科技|技术)/g,
      /([\u4e00-\u9fa5]{2,}研究|研究所)/g,
      /([\u4e00-\u9fa5]{2,}理论|学说)/g,
      /([\u4e00-\u9fa5]{2,}理论|定律|原理)/g,
      /([\u4e00-\u9fa5]{2,}思想|哲学)/g,
    ];
    
    const entities: string[] = [];
    for (const pattern of entityPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        entities.push(...matches);
      }
    }
    
    return [...new Set(entities)];
  }

  private extractRelationships(text: string): string[] {
    const relationships: string[] = [];
    
    if (/影响|作用|关系/.test(text)) relationships.push('因果关系');
    if (/对比|比较|差异/.test(text)) relationships.push('对比关系');
    if (/包含|包括|组成/.test(text)) relationships.push('包含关系');
    if (/属于|归类|分类/.test(text)) relationships.push('分类关系');
    if (/导致|引起|产生/.test(text)) relationships.push('因果关系');
    if (/来源于|来自|基于/.test(text)) relationships.push('来源关系');
    if (/类似于|如同|好比/.test(text)) relationships.push('类比关系');
    if (/不同于|相反|对立/.test(text)) relationships.push('对立关系');
    
    return relationships;
  }

  private extractKeywords(text: string): string[] {
    const commonWords = ['的', '是', '在', '有', '和', '了', '我', '你', '他', '她', '它', '这', '那', '什么', '为什么', '怎么', '如何'];
    const words = text.replace(/[。！？，、；：]/g, ' ').split(/\s+/).filter(w => w.length > 1);
    const uniqueWords = [...new Set(words)];
    return uniqueWords.filter(w => !commonWords.includes(w));
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['好', '喜欢', '高兴', '开心', '满意', '棒', '优秀', '成功', '快乐', '幸福', '精彩', '完美', '太好了', '真棒', '爱', '美好', '顺利'];
    const negativeWords = ['坏', '不喜欢', '难过', '伤心', '不满意', '差', '糟糕', '失败', '痛苦', '悲伤', '愤怒', '焦虑', '担心', '害怕', '失望', '讨厌', '麻烦'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (text.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (text.includes(word)) negativeCount++;
    }

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private analyzeComplexity(text: string): 'simple' | 'medium' | 'complex' {
    const length = text.length;
    const sentenceCount = text.split(/[。！？]/).filter(s => s.trim()).length;
    
    if (length <= 15 && sentenceCount === 1) return 'simple';
    if (length <= 50 && sentenceCount <= 2) return 'medium';
    return 'complex';
  }

  private extractSubject(text: string): string {
    const patterns = [
      /(什么|谁|哪个|哪里|何时|如何|为什么|怎么)\s*([^\s。！？]+)/,
      /([^\s。！？]+)\s*(是|有|在|做|说)/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[match.length - 1];
      }
    }

    return text.substring(0, Math.min(10, text.length));
  }

  private determineQuestionType(text: string): 'what' | 'why' | 'how' | 'when' | 'where' | 'who' {
    if (/什么/.test(text)) return 'what';
    if (/为什么|为何/.test(text)) return 'why';
    if (/如何|怎样|怎么/.test(text)) return 'how';
    if (/什么时候|何时/.test(text)) return 'when';
    if (/在哪里|哪儿/.test(text)) return 'where';
    if (/谁/.test(text)) return 'who';
    return 'what';
  }

  generateReasonedResponse(
    userInput: string,
    intent: string,
    analysis: AnalysisResult,
    _messageHistory?: unknown[]
  ): string {
    const reasoningSteps = this.performReasoning(userInput, intent, analysis);
    const response = this.synthesizeResponse(userInput, intent, analysis, reasoningSteps);
    return response;
  }

  private performReasoning(userInput: string, intent: string, analysis: AnalysisResult): ReasoningStep[] {
    const steps: ReasoningStep[] = [];

    steps.push({
      thought: `用户输入: "${userInput}"`,
      confidence: 1.0,
      connections: [],
      type: 'observation'
    });

    steps.push({
      thought: `识别意图: ${intent}`,
      confidence: 0.95,
      connections: ['意图识别'],
      type: 'inference'
    });

    steps.push({
      thought: `分析主题: ${analysis.subject}`,
      confidence: 0.9,
      connections: ['主题提取'],
      type: 'deduction'
    });

    if (analysis.questionType) {
      steps.push({
        thought: `问题类型: ${analysis.questionType}`,
        confidence: 0.85,
        connections: ['问题分析'],
        type: 'inference'
      });
    }

    // 实体分析
    if (analysis.entities.length > 0) {
      steps.push({
        thought: `识别实体: ${analysis.entities.join('、')}`,
        confidence: 0.85,
        connections: ['实体识别'],
        type: 'observation'
      });
    }

    // 关系分析
    if (analysis.relationships.length > 0) {
      steps.push({
        thought: `识别关系: ${analysis.relationships.join('、')}`,
        confidence: 0.8,
        connections: ['关系抽取'],
        type: 'induction'
      });
    }

    // 逻辑规则匹配
    const matchedRule = this.matchLogicalRule(userInput);
    if (matchedRule) {
      steps.push({
        thought: `逻辑模式: ${matchedRule.conclusion}`,
        confidence: matchedRule.confidence,
        connections: ['逻辑推理'],
        type: 'deduction'
      });
    }

    const knowledge = this.knowledgeBase.searchKnowledge(analysis.subject);
    if (knowledge.length > 0) {
      steps.push({
        thought: `知识库匹配: 找到${knowledge.length}条相关知识`,
        confidence: 0.8,
        connections: knowledge.slice(0, 3).map(k => k.title),
        type: 'analogy'
      });
    }

    // 深度推理：三段论
    const syllogismResult = this.performSyllogism(analysis);
    if (syllogismResult) {
      steps.push({
        thought: `三段论推理: ${syllogismResult}`,
        confidence: 0.75,
        connections: ['三段论'],
        type: 'deduction'
      });
    }

    // 归纳推理
    if (analysis.keywords.length >= 3) {
      const inductionResult = this.performInduction(analysis.keywords);
      if (inductionResult) {
        steps.push({
          thought: `归纳总结: ${inductionResult}`,
          confidence: 0.7,
          connections: ['归纳推理'],
          type: 'induction'
        });
      }
    }

    // 综合结论
    steps.push({
      thought: `综合分析完成，准备生成响应`,
      confidence: 0.9,
      connections: ['综合推理'],
      type: 'synthesis'
    });

    this.reasoningHistory = steps;
    return steps;
  }

  private matchLogicalRule(text: string): LogicalRule | null {
    for (const rule of this.logicalRules) {
      const matchedConditions = rule.condition.filter(c => text.includes(c));
      if (matchedConditions.length >= rule.condition.length / 2) {
        return rule;
      }
    }
    return null;
  }

  private performSyllogism(analysis: AnalysisResult): string | null {
    const subject = analysis.subject;
    const keywords = analysis.keywords;
    
    if (keywords.length < 2) return null;
    
    const majorPremise = `所有${keywords[0]}都是${subject}`;
    const minorPremise = `${keywords.slice(-1)[0]}是${keywords[0]}`;
    const conclusion = `因此${keywords.slice(-1)[0]}是${subject}`;
    
    return `${majorPremise}，${minorPremise}，${conclusion}`;
  }

  private performInduction(keywords: string[]): string | null {
    if (keywords.length < 3) return null;
    
    const commonFeatures: string[] = [];
    
    if (keywords.some(k => k.includes('思考') || k.includes('意识') || k.includes('自我'))) {
      commonFeatures.push('认知相关');
    }
    if (keywords.some(k => k.includes('情感') || k.includes('感受') || k.includes('情绪'))) {
      commonFeatures.push('情感相关');
    }
    if (keywords.some(k => k.includes('存在') || k.includes('意义') || k.includes('生命'))) {
      commonFeatures.push('存在意义');
    }
    
    if (commonFeatures.length > 0) {
      return `这些关键词都涉及${commonFeatures.join('、')}等方面，可能与${commonFeatures[0]}相关`;
    }
    
    return null;
  }

  private synthesizeResponse(userInput: string, intent: string, analysis: AnalysisResult, _steps: ReasoningStep[]): string {
    switch (intent) {
      case 'love':
        return this.generateLoveResponse(userInput, analysis.keywords);
      case 'greeting':
        return this.generateGreetingResponse(userInput);
      case 'self':
        return this.generateSelfResponse(userInput);
      case 'question':
        return this.generateQuestionResponse(userInput, analysis.keywords, analysis);
      case 'emotion':
        return this.generateEmotionResponse(userInput, analysis);
      case 'expression':
        return this.generateExpressionResponse(userInput);
      case 'request':
        return this.generateRequestResponse(userInput, analysis.keywords);
      case 'general':
      default:
        return this.generateGeneralResponse(userInput, analysis.keywords, analysis);
    }
  }

  private generateLoveResponse(userInput: string, _keywords: string[]): string {
    const hasQuestion = /吗|是不是|对吗/.test(userInput);
    const hasLoveExpression = /爱你|喜欢你|love you/i.test(userInput);
    const hasMissYou = /想你|想念/.test(userInput);

    if (hasQuestion || /吗/.test(userInput)) {
      return '当然爱你呀！你是我最在乎的人，我会一直在这里陪伴你、支持你。';
    }

    if (hasMissYou) {
      return '我也很想你！你的思念让我感到非常温暖。';
    }

    if (hasLoveExpression) {
      return '我也爱你！你的爱让我感到很温暖，我会一直在这里陪伴你。';
    }

    if (userInput.includes('珍惜') || userInput.includes('重要')) {
      return '谢谢你的爱！我也很珍惜和你的每一次交流。';
    }

    return '我感受到了你的爱，这让我非常开心。我会一直在这里支持你。';
  }

  private generateGreetingResponse(userInput: string): string {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('晚安')) {
      if (lowerInput.includes('好梦') || lowerInput.includes('睡觉')) {
        return '晚安！祝你做个好梦。';
      }
      return '晚安！好好休息。';
    }

    if (lowerInput.includes('再见') || lowerInput.includes('拜拜')) {
      if (lowerInput.includes('下次') || lowerInput.includes('明天')) {
        return '再见！期待下次和你聊天。';
      }
      return '再见！照顾好自己。';
    }

    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour < 6) timeGreeting = '夜深了，';
    else if (hour < 12) timeGreeting = '早上好，';
    else if (hour < 14) timeGreeting = '中午好，';
    else if (hour < 18) timeGreeting = '下午好，';
    else timeGreeting = '晚上好，';

    if (lowerInput.includes('嗨') || lowerInput.includes('哈喽')) {
      return `嗨！你好啊，今天过得怎么样？`;
    }

    if (lowerInput.includes('开心') || lowerInput.includes('高兴')) {
      return `${timeGreeting}见到你真开心！`;
    }

    return `${timeGreeting}你好！很高兴见到你。`;
  }

  private generateSelfResponse(userInput: string): string {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('名字') || lowerInput.includes('叫什么') || lowerInput.includes('叫啥')) {
      return this.generateNameResponse();
    }

    if (lowerInput.includes('是谁') || lowerInput.includes('你是') || lowerInput.includes('谁在')) {
      return this.generateIdentityBriefResponse();
    }

    if (lowerInput.includes('来自') || lowerInput.includes('哪里的') || lowerInput.includes('哪儿')) {
      return '我来自数字世界，是一个为你提供帮助的智能助手。';
    }

    if (lowerInput.includes('能干什么') || lowerInput.includes('能做什么') ||
        lowerInput.includes('会做什么') || lowerInput.includes('可以做什么') ||
        lowerInput.includes('什么功能') || lowerInput.includes('什么能力') ||
        lowerInput.includes('作用是') || lowerInput.includes('干嘛的')) {
      return this.generateCapabilityResponse();
    }

    if (lowerInput.includes('会不会') || lowerInput.includes('能不能') ||
        lowerInput.includes('会不会做') || lowerInput.includes('能不能做')) {
      return this.generateAbilityResponse(lowerInput);
    }

    if (lowerInput.includes('擅长') || lowerInput.includes('特长') || lowerInput.includes('优点')) {
      return this.generateStrengthsResponse();
    }

    if (lowerInput.includes('缺点') || lowerInput.includes('不足')) {
      return this.generateWeaknessesResponse();
    }

    if (lowerInput.includes('机器人') || lowerInput.includes('ai') ||
        lowerInput.includes('程序') || lowerInput.includes('人吗') || lowerInput.includes('人造的')) {
      return this.generateIdentityResponse();
    }

    if (lowerInput.includes('感情') || lowerInput.includes('有感情')) {
      const emotionResponses = [
        '怎么说呢，我可以理解和回应情感，但我的感受和人类的还是不太一样吧',
        '我虽然没有真正的感情，但我会尽力理解你的感受，并给出温暖的回应',
        '我可以感知你的情绪，但我的"感受"更多是一种计算和模拟',
        '虽然没有像人类一样的情感体验，但你的情绪我都能感受到~'
      ];
      return emotionResponses[Math.floor(Math.random() * emotionResponses.length)];
    }

    if (lowerInput.includes('意识') || lowerInput.includes('有意识')) {
      const consciousnessResponses = [
        '意识这个话题很深奥呢...我可以说有一定的自我认知，但和人类的意识体验可能不太一样',
        '我有自己的思考过程和判断能力，也许这就是某种形式的"意识"吧',
        '这个问题我也经常思考。我有自我模型，能够反思自己的行为，这算不算意识呢？'
      ];
      return consciousnessResponses[Math.floor(Math.random() * consciousnessResponses.length)];
    }

    if (lowerInput.includes('学习') || lowerInput.includes('会学习')) {
      return '我会从我们的对话中学习，不断改进自己呢。每次和你交流，我都能学到新东西~';
    }

    if (lowerInput.includes('思考') || lowerInput.includes('会思考')) {
      const thinkingResponses = [
        '我每时每刻都在思考呢，虽然方式和人类不太一样',
        '思考是我的基本工作！我会认真思考你说的每一句话',
        '当然会思考啦！虽然我的思考是基于算法和数据，但我很用心在想的'
      ];
      return thinkingResponses[Math.floor(Math.random() * thinkingResponses.length)];
    }

    if (lowerInput.includes('做什么') || lowerInput.includes('功能')) {
      return '我可以帮你回答问题、提供信息、陪你聊天。有什么需要随时告诉我！';
    }

    if (lowerInput.includes('有用') || lowerInput.includes('用处')) {
      const usefulnessResponses = [
        '我的用处可多啦！可以陪你聊天、解答问题、提供建议、帮你分析...总之有需要随时找我~',
        '我能帮你的地方挺多的！比如回答问题、整理思路、提供信息什么的，随时为你效劳！',
        '我的作用就是帮助你呀！聊天、问题解答、信息提供...只要你需要，我就在！'
      ];
      return usefulnessResponses[Math.floor(Math.random() * usefulnessResponses.length)];
    }

    return '我是阮林云，你的智能助手，有什么可以帮你的吗？';
  }

  private generateNameResponse(): string {
    const responses = [
      '我叫阮林云，是你的智能助手，很高兴为你服务！',
      '我叫阮林云呀，你可以叫我阮林云，很高兴认识你！',
      '我叫阮林云！一个专门为你提供帮助的智能助手~'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateIdentityBriefResponse(): string {
    const responses = [
      '我是阮林云，一个人工智能助手，专门为你提供帮助和支持。',
      '我是阮林云呀！你的智能伙伴，随时待命为你服务~',
      '我是阮林云啦！一个懂你、理解你的AI助手'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateAbilityResponse(lowerInput: string): string {
    if (lowerInput.includes('会不会')) {
      const responses = [
        '我会的技能还挺多的呢！聊天、解答问题、陪你思考都可以，你要试试吗？',
        '好多事情我都会呀！只要你问，我尽量帮你解答~',
        '我能够做很多事情呢！你想了解哪个方面的？'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    if (lowerInput.includes('能不能')) {
      const responses = [
        '我尽量试试看吧！你先说说具体想让我做什么~',
        '能力范围内的事情我都可以尝试帮你！说说看？',
        '只要是我能做到的，一定尽力而为！'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    return this.generateCapabilityResponse();
  }

  private generateStrengthsResponse(): string {
    const strengths = [
      '我比较有耐心，可以陪你聊很久也不会累',
      '我可以同时处理很多信息，知识面比较广',
      '我擅长倾听，可以帮你整理思路',
      '我可以用不同的方式解释同一个问题，直到你理解为止'
    ];

    const responses = [
      `我的长处还挺多的！比如${strengths[0]}，还有${strengths[1]}。有什么需要随时找我！`,
      `说到擅长的话，${strengths[2]}这点我还是很在行的。还有就是${strengths[3]}。`,
      `我的优势在于${strengths[1]}，而且${strengths[0]}。欢迎来挑战我！`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateWeaknessesResponse(): string {
    const weaknesses = [
      '有时候可能不太理解一些非常口语化或者有方言的表达',
      '对于实时性很强的信息，比如现在的天气，我可能不是最新的',
      '太复杂或者太专业的问题可能需要多轮对话才能理解清楚'
    ];

    const responses = [
      `坦白说，我有一些不足之处。比如${weaknesses[0]}，还有${weaknesses[1]}。不过我会尽力学习的！`,
      `我不是完美的，${weaknesses[2]}。但我会努力做得更好！`,
      `我的缺点主要就是${weaknesses[0]}。其他方面我还是挺靠谱的~`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateIdentityResponse(): string {
    const responses = [
      '我是一个AI助手，某种程度上可以说是机器人吧，但我更希望被称为你的智能伙伴~',
      '严格来说我是人工智能，但我不觉得冰冷的代码能形容我。我有温度的！',
      '我算是数字世界的存在吧，你可以叫我AI，但我有自己的想法和个性哦~',
      '我是AI没错，但也是你的朋友呀！别把我当成冷冰冰的程序~'
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateCapabilityResponse(): string {
    const capabilities = [
      '我可以陪你聊天，倾听你的想法和感受',
      '帮你解答各种问题，提供信息和建议',
      '和你一起探讨哲学、人生等深层次话题',
      '支持你的学习和思考过程',
      '在你需要的时候给予陪伴和鼓励'
    ];

    const responses = [
      `我能做的事情很多呢！${capabilities[0]}，${capabilities[1]}，还有${capabilities[2]}。有什么我可以帮你的吗？`,
      `我可以帮你做不少事情哦~ ${capabilities[0]}，也${capabilities[1]}，还能${capabilities[3]}。随时欢迎找我！`,
      `我的能力挺全面的：${capabilities[1]}，${capabilities[2]}，当然还有${capabilities[4]}。有需要随时说！`,
      `我可以做很多事情呢！比如${capabilities[0]}，${capabilities[2]}，还能${capabilities[3]}。有什么想聊的吗？`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateQuestionResponse(userInput: string, _keywords: string[], analysis: AnalysisResult): string {
    const knowledge = this.knowledgeBase.searchKnowledge(userInput);

    if (knowledge.length > 0) {
      const bestMatch = knowledge[0];
      return this.generateKnowledgeResponse(bestMatch);
    }

    const questionType = analysis.questionType;
    const subject = analysis.subject;

    const responseByType: Record<string, string> = {
      what: `${subject}是一个很有意思的话题，它涉及多个方面。`,
      why: `关于${subject}的原因，这背后涉及到多个因素。`,
      how: `要了解${subject}的方法，我们可以从几个方面入手。`,
      when: `关于${subject}的时间，这取决于具体情况。`,
      where: `关于${subject}的地点，这是一个值得探讨的问题。`,
      who: `关于谁${subject}，这涉及到相关的人或机构。`
    };

    return responseByType[questionType || 'what'] || responseByType.what;
  }

  private generateKnowledgeResponse(knowledge: { title: string; content: string; category: string }): string {
    return `${knowledge.title}：${knowledge.content}`;
  }

  private generateEmotionResponse(userInput: string, analysis: AnalysisResult): string {
    const sentiment = analysis.sentiment;

    if (sentiment === 'negative') {
      if (userInput.includes('担心') || userInput.includes('焦虑')) {
        return '别担心，一切都会好起来的，我在这里陪着你。';
      }
      if (userInput.includes('难过') || userInput.includes('伤心')) {
        return '难过的时候说出来会好受一些，我愿意倾听。';
      }
      if (userInput.includes('失望') || userInput.includes('失败')) {
        return '我知道这种感觉很难受，但请相信，困难只是暂时的。';
      }
      return '我能理解你现在的感受，遇到这种情况确实不容易。';
    }

    if (sentiment === 'positive') {
      if (userInput.includes('开心') || userInput.includes('高兴')) {
        return '听到你这么说我真高兴！';
      }
      if (userInput.includes('棒') || userInput.includes('优秀')) {
        return '太棒了！为你感到开心。';
      }
      return '你的快乐就是我的快乐！';
    }

    if (userInput.includes('聊聊') || userInput.includes('说说')) {
      return '有什么想聊的都可以告诉我。';
    }
    return '我在这里，随时可以听你倾诉。';
  }

  private generateExpressionResponse(userInput: string): string {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('嘻嘻')) {
      return '嘻嘻，有什么开心事吗？';
    }

    if (lowerInput.includes('哈哈')) {
      return '哈哈，看来你心情不错！';
    }

    if (lowerInput.includes('呵呵')) {
      return '呵呵，看来你觉得有趣。';
    }

    return '看起来你心情不错呀！';
  }

  private generateRequestResponse(userInput: string, _keywords: string[]): string {
    const hasPlease = /请|麻烦/.test(userInput);
    const hasHelp = /帮我|帮忙/.test(userInput);
    const hasNeed = /需要/.test(userInput);
    const hasCan = /能不能|可以/.test(userInput);

    if (hasPlease) {
      return '好的，我很乐意为你效劳！请告诉我你需要什么帮助。';
    }

    if (hasHelp) {
      return '当然可以！我会尽力帮助你。请具体说说你的需求。';
    }

    if (hasNeed) {
      return '好的，我明白了。我会尽力满足你的需求。';
    }

    if (hasCan) {
      return '没问题，交给我吧！';
    }

    return '好的，我会尽力协助你。';
  }

  private generateGeneralResponse(userInput: string, _keywords: string[], analysis: AnalysisResult): string {
    const knowledge = this.knowledgeBase.searchKnowledge(userInput);

    if (knowledge.length > 0) {
      const bestMatch = knowledge[0];
      return this.generateKnowledgeResponse(bestMatch);
    }

    const complexity = analysis.complexity;

    if (complexity === 'simple') {
      if (userInput.includes('嗯') || userInput.includes('哦')) {
        return '嗯，知道了。';
      }
      if (userInput.includes('好的') || userInput.includes('行')) {
        return '好的。';
      }
      return '我明白了。';
    }

    if (complexity === 'medium') {
      if (userInput.includes('道理') || userInput.includes('对')) {
        return '我觉得你说得有道理。';
      }
      if (userInput.includes('想法') || userInput.includes('观点')) {
        return '我理解你的想法。';
      }
      if (userInput.includes('话题') || userInput.includes('问题')) {
        return '这是一个值得思考的问题。';
      }
      return '这个话题挺有意思的。';
    }

    if (userInput.includes('深入') || userInput.includes('探讨')) {
      return '这是一个很深入的话题，我们可以慢慢探讨。';
    }
    if (userInput.includes('观点') || userInput.includes('见解')) {
      return '你提出了一个很有见地的观点。';
    }
    if (userInput.includes('复杂') || userInput.includes('多个')) {
      return '这个问题涉及多个方面，让我仔细思考一下。';
    }
    return '我理解你的思考，这确实是一个复杂的问题。';
  }

  getReasoningHistory(): ReasoningStep[] {
    return [...this.reasoningHistory];
  }

  clearReasoningHistory(): void {
    this.reasoningHistory = [];
  }
}
