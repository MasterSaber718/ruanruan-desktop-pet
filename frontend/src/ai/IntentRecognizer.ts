interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface IntentMatch {
  name: string;
  confidence: number;
  matchedKeywords: string[];
}

interface IntentDefinition {
  name: string;
  keywords: string[];
  basePriority: number;
  requiresContext?: string[];
}

export class IntentRecognizer {
  private intents: IntentDefinition[];

  constructor() {
    this.intents = [
      { name: 'love', keywords: ['爱', '喜欢', '爱上', '喜欢上', '好感', '动心', '想念', '思念'], basePriority: 10 },
      { name: 'greeting', keywords: ['你好', '嗨', '哈喽', '早上好', '下午好', '晚上好', '晚安', '再见', '拜拜', '嗨喽'], basePriority: 9 },
      { name: 'self', keywords: ['你叫什么', '你是谁', '你的名字', '你来自', '你是做什么的', '你是什么', '你叫什么名字', '你多大', '你几岁', '你能干什么', '你能做什么', '你会做什么', '你可以做什么', '你有什么功能', '你有什么能力', '你能帮我做什么', '你能帮我', '你会不会', '你能不能', '你会不会做', '你能不能做', '你擅长什么', '你有什么特长', '你有什么优点', '你有什么缺点', '你是机器人吗', '你是AI吗', '你是人吗', '你是程序吗', '你有感情吗', '你有意识吗', '你会学习吗', '你会思考吗'], basePriority: 10 },
      { name: 'question', keywords: ['什么', '为什么', '如何', '怎样', '在哪里', '什么时候', '谁', '哪个', '多少', '怎么', '为何', '是不是', '对吗', '是吗', '?', '？'], basePriority: 7 },
      { name: 'request', keywords: ['请', '帮我', '我需要', '能不能', '可不可以', '能否', '麻烦', '可以帮我', '想让你'], basePriority: 6 },
      { name: 'emotion', keywords: ['开心', '难过', '生气', '伤心', '高兴', '愤怒', '焦虑', '担心', '沮丧', '兴奋', '紧张', '郁闷', '烦躁', '失落'], basePriority: 5 },
      { name: 'expression', keywords: ['嘻嘻', '哈哈', '呵呵', '嘿嘿', '唉', '哦', '嗯', '哇', '啊'], basePriority: 4 },
      { name: 'praise', keywords: ['好', '棒', '优秀', '厉害', '精彩', '完美', '不错', '太棒了', '真厉害'], basePriority: 3 },
      { name: 'complaint', keywords: ['抱怨', '不满', '生气', '失望', '糟糕', '差', '不行', '讨厌'], basePriority: 2 },
      { name: 'learning', keywords: ['学习', '了解', '知道', '明白', '理解', '掌握', '学会', '研究'], basePriority: 5 },
      { name: 'creativity', keywords: ['创意', '创新', '创造', '设计', '想法', '灵感', '构思'], basePriority: 5 },
      { name: 'health', keywords: ['健康', '身体', '锻炼', '运动', '休息', '睡眠', '饮食'], basePriority: 5 },
      { name: 'time', keywords: ['时间', '时候', '现在', '今天', '明天', '昨天', '最近'], basePriority: 4 },
      { name: 'plan', keywords: ['计划', '打算', '准备', '安排', '目标', '任务'], basePriority: 5 },
      { name: 'chat', keywords: ['聊聊', '聊天', '说说话', '谈谈', '交流', '沟通'], basePriority: 4 }
    ];
  }

  recognizeIntent(text: string, messageHistory: Message[] = []): {
    intent: string;
    confidence: number;
    keywords: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    secondaryIntents?: { name: string; confidence: number }[];
  } {
    if (text.match(/。{5,}/)) {
      return { intent: 'emotion', confidence: 0.9, keywords: ['省略号'], sentiment: 'neutral' };
    }

    const processedText = text.replace(/\s+/g, ' ').replace(/。+/g, '。').trim();
    const lowerText = processedText.toLowerCase();

    if (this.isSelfRelatedInput(lowerText)) {
      const selfKeywords = this.getSelfMatchedKeywords(lowerText);
      return {
        intent: 'self',
        confidence: 1.0,
        keywords: selfKeywords,
        sentiment: this.analyzeSentiment(text)
      };
    }

    const intentMatches = this.matchIntents(lowerText, processedText);

    if (messageHistory.length > 0) {
      this.adjustByContext(intentMatches, messageHistory.slice(-5));
    }

    const bestMatch = this.selectBestMatch(intentMatches);
    const secondaryIntents = this.selectSecondaryIntents(intentMatches, bestMatch);
    const sentiment = this.analyzeSentiment(text);

    return {
      intent: bestMatch.name,
      confidence: bestMatch.confidence,
      keywords: bestMatch.matchedKeywords,
      sentiment,
      secondaryIntents
    };
  }

  private isSelfRelatedInput(lowerText: string): boolean {
    const selfKeywords = [
      '你叫什么', '名字', '你是谁', '你的名字', '你来自', '你是做什么', '你是什么',
      '你能干什么', '你能做什么', '你会做什么', '你可以做什么', '你有什么功能', '你有什么能力',
      '你会不会', '你能不能', '你会不会做', '你能不能做',
      '你擅长', '你有什么特长', '你有什么优点', '你有什么缺点',
      '你是机器人', '你是ai', '你是人吗', '你是程序',
      '你有感情', '你有意识', '你会学习', '你会思考',
      '我是谁', '我叫什么', '我的名字', '你能帮'
    ];

    for (const keyword of selfKeywords) {
      if (lowerText.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  private getSelfMatchedKeywords(lowerText: string): string[] {
    const selfKeywords = [
      '你叫什么', '名字', '你是谁', '你的名字', '你来自', '你是做什么', '你是什么',
      '你能干什么', '你能做什么', '你会做什么', '你可以做什么', '你有什么功能', '你有什么能力',
      '你会不会', '你能不能', '你会不会做', '你能不能做',
      '你擅长', '你有什么特长', '你有什么优点', '你有什么缺点',
      '你是机器人', '你是ai', '你是人吗', '你是程序',
      '你有感情', '你有意识', '你会学习', '你会思考',
      '我是谁', '我叫什么', '我的名字', '你能帮'
    ];
    const matched: string[] = [];

    for (const keyword of selfKeywords) {
      if (lowerText.includes(keyword)) {
        matched.push(keyword);
      }
    }

    return matched;
  }

  private matchIntents(lowerText: string, _originalText: string): IntentMatch[] {
    const matches: IntentMatch[] = [];

    for (const intent of this.intents) {
      const matchedKeywords: string[] = [];
      let totalConfidence = 0;

      for (const keyword of intent.keywords) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerText.includes(lowerKeyword)) {
          matchedKeywords.push(keyword);
          const position = lowerText.indexOf(lowerKeyword);
          const positionBonus = 1 - (position / lowerText.length) * 0.3;
          const lengthBonus = Math.min(1, lowerKeyword.length / 5);
          totalConfidence += positionBonus * (0.7 + lengthBonus * 0.3);
        }
      }

      if (matchedKeywords.length > 0) {
        const keywordConfidence = matchedKeywords.length / intent.keywords.length;
        const matchConfidence = Math.min(1, (totalConfidence / matchedKeywords.length) * keywordConfidence * intent.basePriority / 10);
        matches.push({
          name: intent.name,
          confidence: matchConfidence,
          matchedKeywords
        });
      }
    }

    return matches;
  }

  private adjustByContext(matches: IntentMatch[], recentMessages: Message[]): void {
    const contextText = recentMessages.map(m => m.text.toLowerCase()).join(' ');

    for (const match of matches) {
      const contextScore = this.calculateContextScore(match.name, contextText);
      match.confidence *= (0.8 + contextScore * 0.4);
    }
  }

  private calculateContextScore(intentName: string, contextText: string): number {
    const contextKeywords: Record<string, string[]> = {
      love: ['爱', '喜欢', '想你', '陪伴'],
      greeting: ['你好', '嗨', '再见', '晚安'],
      self: ['你', '名字', '是谁', '什么'],
      question: ['什么', '为什么', '怎么', '如何'],
      request: ['请', '帮我', '需要', '能不能'],
      emotion: ['开心', '难过', '生气', '伤心'],
      learning: ['学习', '了解', '知道', '明白'],
      health: ['健康', '身体', '运动', '休息'],
      plan: ['计划', '打算', '目标', '安排']
    };

    const keywords = contextKeywords[intentName] || [];
    let score = 0;

    for (const keyword of keywords) {
      if (contextText.includes(keyword)) {
        score += 0.2;
      }
    }

    return Math.min(1, score);
  }

  private selectBestMatch(matches: IntentMatch[]): IntentMatch {
    if (matches.length === 0) {
      return { name: 'general', confidence: 0, matchedKeywords: [] };
    }

    matches.sort((a, b) => b.confidence - a.confidence);

    const topMatch = matches[0];

    if (topMatch.confidence < 0.2) {
      return { name: 'general', confidence: 0.1, matchedKeywords: [] };
    }

    return topMatch;
  }

  private selectSecondaryIntents(matches: IntentMatch[], primaryMatch: IntentMatch): { name: string; confidence: number }[] {
    const secondaryMatches = matches
      .filter(m => m.name !== primaryMatch.name && m.confidence >= 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2);

    return secondaryMatches.map(m => ({ name: m.name, confidence: m.confidence }));
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['好', '喜欢', '高兴', '开心', '满意', '棒', '优秀', '成功', '快乐', '幸福', '精彩', '完美', '太好了', '真棒', '爱', '美好', '顺利', '谢谢', '感谢', '漂亮', '可爱'];
    const negativeWords = ['坏', '不喜欢', '难过', '伤心', '不满意', '差', '糟糕', '失败', '痛苦', '悲伤', '愤怒', '焦虑', '担心', '害怕', '失望', '讨厌', '麻烦', '烦人', '无聊', '累'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (text.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (text.includes(word)) negativeCount++;
    }

    if (positiveCount > negativeCount + 1) return 'positive';
    if (negativeCount > positiveCount + 1) return 'negative';
    return 'neutral';
  }

  getAvailableIntents(): string[] {
    return this.intents.map(i => i.name);
  }

  getIntentInfo(intentName: string): IntentDefinition | undefined {
    return this.intents.find(i => i.name === intentName);
  }
}

export const intentRecognizer = new IntentRecognizer();
