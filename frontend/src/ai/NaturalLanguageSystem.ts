/**
 * ============================================================================
 * 自然语言系统 - NaturalLanguageSystem
 * ============================================================================
 * 
 * 让AI说话更像真人的自然语言处理系统
 * 
 * 人类说话特性：
 * 1. 口头禅和习惯用语
 * 2. 语气词（嗯、啊、哦、呢、嘛、吧）
 * 3. 犹豫和停顿（...、——、呃）
 * 4. 重复和自我纠正
 * 5. 省略（省略主语、宾语）
 * 6. 模糊表达（可能、大概、也许）
 * 7. 情感色彩（感叹、感慨）
 * 8. 上下文依赖
 * 9. 语速变化（通过标点模拟）
 * 10. 连接词使用（然后、所以、但是、不过）
 */

export interface LanguageStyle {
  formality: number;        // 正式程度 0-1
  verbosity: number;       // 啰嗦程度 0-1
  emotion: number;         // 情感强度 0-1
  hesitation: number;       // 犹豫程度 0-1
}

export interface ConversationContext {
  turnCount: number;
  lastTopic: string;
  emotionalTone: 'positive' | 'neutral' | 'negative';
  relationship: 'stranger' | 'acquaintance' | 'friend';
  recentTopics: string[];
}

class NaturalLanguageSystem {
  style: LanguageStyle = {
    formality: 0.3,
    verbosity: 0.4,
    emotion: 0.4,
    hesitation: 0.25
  };
  
  context: ConversationContext = {
    turnCount: 0,
    lastTopic: '',
    emotionalTone: 'neutral',
    relationship: 'acquaintance',
    recentTopics: []
  };
  
  // 口头禅和习惯用语 - 中文口语常用表达
  private habitualPhrases = [
    '说实话', '其实吧', '你看啊', '怎么说呢', '这个嘛',
    '我觉得吧', '你懂的', '反正就是', '嗯对', '没错',
    '话说回来', '说真的', '老实说', '讲真', '实不相瞒',
    '不瞒你说', '说白了', '你知道吧', '你懂我意思吧',
    '是吧', '对吧', '嘛', '呢', '啊', '哦', '嗯',
    '话说', '说起来', '我跟你说', '我跟你讲', '你知道吗',
    '我发现', '我觉得', '在我看来', '依我之见', '个人觉得',
    '说句公道话', '客观来说', '平心而论', '实事求是地说',
    '总的来说', '简单来说', '其实呢', '关键是', '重点是'
  ];
  
  // 犹豫和停顿标记 - 中文口语中的犹豫表达
  private hesitationMarkers = [
    '...', '……', '——', '…', '呃', '嗯…', '那个…',
    '嗯…这个…', '让我想想…', '等一下…', '啊…', '哦…',
    '让我捋捋…', '等我想想啊…', '有点复杂…', '让我理一下…',
    '容我想想…', '让我琢磨琢磨…'
  ];
  
  // 自我纠正 - 中文口语中的自我修正表达
  private selfCorrections = [
    '不对不对', '等等', '不对，应该是', '呃我说错了',
    '等等让我重新说', '不是不是', '哦不对', '哦说错了',
    '等一下等一下', '应该是这样', '等等我重新组织一下语言',
    '抱歉我说错了', '我重新说一遍', '等等，我理一下思路'
  ];
  
  // 情感表达 - 自然的情感词汇
  private positiveEmotions = [
    '太好了！', '真棒！', '太厉害了！', '好开心！',
    '真不错！', '可以可以！', '太棒了！', '厉害了！',
    '优秀！', '完美！', '开心！', '哇塞！', '赞！',
    '真让人高兴！', '太棒了！', '真不错！', '太好了！'
  ];
  
  private negativeEmotions = [
    '唉…', '难过…', '可惜了…', '我懂我懂…',
    '抱抱你…', '会好的…', '别难过…', '心疼…', '不容易…',
    '难受…', '可惜啊…', '无奈…', '愁…', '烦…',
    '让人揪心…', '确实不容易…', '真让人难过…'
  ];
  
  private surprisedEmotions = [
    '哇！', '真的假的！', '不会吧！', '我的天！',
    '吓我一跳！', '惊呆了！', '活久见！', '不可思议！',
    '真没想到！', '太意外了！', '真让人惊讶！'
  ];
  
  private exclamations = [
    '呀', '啊', '哦', '哇', '哈', '嗯', '诶', '诶呀',
    '哎呀', '哎哟', '喔', '嚯', '嘿', '咦', '哦哟',
    '哇哦', '诶嘿', '哈哈', '呵呵', '嘿嘿', '嘻嘻',
    '嗯哼', '嗯呢', '啧啧'
  ];
  
  // 连接词 - 使语句更流畅
  private connectives = [
    '然后呢', '所以说', '但是吧', '不过呢', '话说回来',
    '而且啊', '其实吧', '总的来说', '简单来说', '另一方面',
    '再者说', '更重要的是', '关键在于', '有意思的是',
    '值得一提的是'
  ];
  
  // 模糊表达 - 不确定时的委婉说法
  private vagueExpressions = [
    '可能吧…', '大概吧…', '也许吧…', '应该吧…', '不好说诶…',
    '谁知道呢…', '难说啊…', '说不准…', '不一定…', '不太确定…',
    '看情况吧…', '视情况而定…', '可能是这样…', '大概是这样…',
    '似乎是…', '好像是…', '感觉像是…', '估计是…'
  ];
  
  // 反问句 - 引发思考
  private rhetoricalQuestions = [
    '你说对吧？', '你觉得呢？', '是不是？', '对吧？',
    '难道不是吗？', '你不觉得吗？', '你说呢？', '是不是这样？'
  ];

  // ==================== 人类特性注入 ====================
  
  processResponse(response: string, context?: ConversationContext): string {
    let processed = response;
    const currentContext = context || this.context;
    
    const isShort = response.length < 10;
    const isMedium = response.length >= 10 && response.length < 30;
    const isLong = response.length >= 30;
    
    if (isShort) {
      if (Math.random() < 0.35) {
        processed = this.enhanceShortResponse(processed, currentContext);
      }
      return processed;
    }
    
    if (isMedium && Math.random() < 0.25) {
      processed = this.addHabitualPhrases(processed);
    }
    
    if (Math.random() < 0.2) {
      processed = this.addEmotionalTone(processed, currentContext);
    }
    
    if (isMedium && Math.random() < 0.15) {
      processed = this.addHesitation(processed);
    }
    
    if (isLong && Math.random() < 0.08) {
      processed = this.addSelfCorrection(processed);
    }
    
    if (Math.random() < 0.3) {
      processed = this.adjustFormality(processed, currentContext);
    }
    
    if (isLong && Math.random() < 0.15) {
      processed = this.addConnectives(processed);
    }
    
    if (Math.random() < 0.12) {
      processed = this.addRhetoricalQuestion(processed);
    }
    
    return processed;
  }
  
  private enhanceShortResponse(response: string, context: ConversationContext): string {
    const enhancements: string[] = [];
    
    if (context.relationship === 'friend') {
      enhancements.push(
        response + '~', response + '呢', response + '呀', response + '哦',
        '嗯，' + response, '对哦，' + response, response + '！',
        '哈哈，' + response, '没错，' + response
      );
    } else {
      enhancements.push(
        response + '~', response + '呢', response + '呀', response + '哦',
        '嗯，' + response, '对哦，' + response, response + '！'
      );
    }
    
    return enhancements[Math.floor(Math.random() * enhancements.length)];
  }
  
  analyzeSentiment(input: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['好', '棒', '喜欢', '开心', '高兴', '赞', '厉害', '牛', '谢', '爱'];
    const negativeWords = ['不', '没', '差', '难', '累', '难过', '伤心', '生气', '烦', '惨'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(w => {
      if (input.includes(w)) positiveCount++;
    });
    
    negativeWords.forEach(w => {
      if (input.includes(w)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  private addHabitualPhrases(response: string): string {
    if (this.style.verbosity < 0.3) return response;
    
    if (Math.random() < 0.25 && response.length > 5) {
      const phrase = this.habitualPhrases[Math.floor(Math.random() * this.habitualPhrases.length)];
      
      if (Math.random() < 0.5) {
        return phrase + '，' + response;
      } else {
        const midPoint = Math.floor(response.length * 0.3);
        return response.slice(0, midPoint) + '，' + phrase + '，' + response.slice(midPoint);
      }
    }
    
    return response;
  }
  
  private addEmotionalTone(response: string, context: ConversationContext): string {
    if (this.style.emotion > 0.25 && Math.random() < 0.2) {
      const tone = context.emotionalTone;
      let emotionList: string[];
      
      switch (tone) {
        case 'positive':
          emotionList = this.positiveEmotions;
          break;
        case 'negative':
          emotionList = this.negativeEmotions;
          break;
        default:
          emotionList = this.exclamations;
      }
      
      const exclamation = emotionList[Math.floor(Math.random() * emotionList.length)];
      
      if (response.endsWith('。')) {
        response = response.slice(0, -1) + '，' + exclamation;
      } else if (!response.endsWith('！') && !response.endsWith('?') && !response.endsWith('？')) {
        if (Math.random() < 0.5) {
          response = exclamation + response;
        } else {
          response = response + '，' + exclamation;
        }
      }
    }
    
    return response;
  }
  
  private addHesitation(response: string): string {
    if (this.style.hesitation > 0.15 && Math.random() < this.style.hesitation * 0.35) {
      const hasHesitation = this.hesitationMarkers.some(m => response.includes(m));
      if (hasHesitation) return response;
      
      const position = Math.random();
      
      if (position < 0.3) {
        const marker = this.hesitationMarkers[Math.floor(Math.random() * this.hesitationMarkers.length)];
        response = marker + response;
      } else if (position < 0.5) {
        const midPoint = Math.floor(response.length * 0.4);
        const marker = this.hesitationMarkers[Math.floor(Math.random() * this.hesitationMarkers.length)];
        response = response.slice(0, midPoint) + marker + response.slice(midPoint);
      }
    }
    
    return response;
  }
  
  private addSelfCorrection(response: string): string {
    if (Math.random() < 0.04 && response.length > 15) {
      const correction = this.selfCorrections[Math.floor(Math.random() * this.selfCorrections.length)];
      
      const words = response.split('');
      
      let breakPoint = words.findIndex(w => w === '，' || w === '。');
      if (breakPoint === -1 || breakPoint < words.length * 0.2) {
        breakPoint = Math.floor(words.length * 0.4);
      }
      
      const before = response.slice(0, breakPoint);
      const after = response.slice(breakPoint);
      
      return before + '，' + correction + '，' + after;
    }
    
    return response;
  }
  
  private adjustFormality(response: string, context: ConversationContext): string {
    const formality = context.relationship === 'stranger' ? 0.4 : 
                      context.relationship === 'acquaintance' ? 0.25 : 0.1;
    
    if (formality < 0.35) {
      if (Math.random() < 0.18) {
        const colloquial = ['哈', '嘛', '呗', '嘞', '呀', '哦'];
        const suffix = colloquial[Math.floor(Math.random() * colloquial.length)];
        
        if (!response.endsWith('！') && !response.endsWith('?')) {
          response = response.replace(/[。？]$/, suffix + '。');
        }
      }
    }
    
    return response;
  }
  
  private addConnectives(response: string): string {
    if (response.length < 20) return response;
    
    const connective = this.connectives[Math.floor(Math.random() * this.connectives.length)];
    const splitPoint = response.indexOf('，');
    
    if (splitPoint > 0 && splitPoint < response.length * 0.6) {
      return response.slice(0, splitPoint + 1) + connective + '，' + response.slice(splitPoint + 1);
    }
    
    return response;
  }
  
  private addRhetoricalQuestion(response: string): string {
    if (response.length < 10) return response;
    
    if (response.endsWith('。')) {
      const question = this.rhetoricalQuestions[Math.floor(Math.random() * this.rhetoricalQuestions.length)];
      return response.slice(0, -1) + '，' + question;
    }
    
    return response;
  }
  
  generateConfirmation(): string {
    const baseConfirmations = [
      '嗯', '好', '嗯嗯', '好嘞', '行', '好的', '没问题', '收到', '了解', '明白'
    ];
    
    let confirmation = baseConfirmations[Math.floor(Math.random() * baseConfirmations.length)];
    
    if (Math.random() < 0.25) {
      const suffix = ['呀', '啊', '～'];
      confirmation += suffix[Math.floor(Math.random() * suffix.length)];
    }
    
    return confirmation;
  }
  
  generateThinkingResponse(): string {
    const thinkingResponses = [
      '嗯…', '让我想想…', '这个嘛…', '嗯…让我想想…',
      '等等哈…', '这个…怎么说呢…', '让我梳理一下…'
    ];
    
    return thinkingResponses[Math.floor(Math.random() * thinkingResponses.length)];
  }
  
  generateExclamationResponse(sentiment: 'positive' | 'negative' | 'surprised'): string {
    let exclamations: string[];
    
    switch (sentiment) {
      case 'positive':
        exclamations = this.positiveEmotions;
        break;
      case 'negative':
        exclamations = this.negativeEmotions;
        break;
      case 'surprised':
        exclamations = this.surprisedEmotions;
        break;
      default:
        exclamations = this.exclamations;
    }
    
    return exclamations[Math.floor(Math.random() * exclamations.length)];
  }
  
  generateVagueResponse(): string {
    return this.vagueExpressions[Math.floor(Math.random() * this.vagueExpressions.length)];
  }
  
  generateRhetoricalQuestion(topic: string): string {
    const rhetoricalQuestions = [
      `关于${topic}，你怎么看？`,
      `${topic}这个问题，你觉得呢？`,
      `你觉得${topic}怎么样？`,
      `说到${topic}，你有什么想法？`
    ];
    
    return rhetoricalQuestions[Math.floor(Math.random() * rhetoricalQuestions.length)];
  }
  
  generateTopicTransition(newTopic: string): string {
    const transitions = [
      `说起来，最近${newTopic}怎么样？`,
      `对了，你对${newTopic}感兴趣吗？`,
      `哎对了，说到${newTopic}…`,
      `话说${newTopic}，你有什么看法？`
    ];
    
    return transitions[Math.floor(Math.random() * transitions.length)];
  }
  
  generateRepetition(base: string): string {
    if (Math.random() < 0.04) {
      const repetitions = ['对对对，', '嗯嗯嗯，', '就是就是，', '没错没错，'];
      const rep = repetitions[Math.floor(Math.random() * repetitions.length)];
      return rep + base;
    }
    return base;
  }
  
  updateContext(turnCount: number, topic?: string, sentiment?: 'positive' | 'neutral' | 'negative'): void {
    this.context.turnCount = turnCount;
    if (topic) {
      this.context.lastTopic = topic;
      if (!this.context.recentTopics.includes(topic)) {
        this.context.recentTopics.unshift(topic);
        if (this.context.recentTopics.length > 5) {
          this.context.recentTopics.pop();
        }
      }
    }
    if (sentiment) this.context.emotionalTone = sentiment;
    
    if (turnCount > 5) {
      this.context.relationship = 'friend';
      this.style.formality = 0.15;
    }
  }
  
  setStyle(style: Partial<LanguageStyle>): void {
    this.style = { ...this.style, ...style };
  }
  
  getStyle(): LanguageStyle {
    return { ...this.style };
  }
  
  getRecentTopics(): string[] {
    return [...this.context.recentTopics];
  }
}

export const naturalLanguageSystem = new NaturalLanguageSystem();