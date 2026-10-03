/**
 * ============================================================================
 * 输入理解模块 - InputUnderstandingModule
 * ============================================================================
 *
 * 模拟人类的理解过程：看到输入 -> 理解内容 -> 确认理解 -> 生成回答
 *
 * 人类理解的特点：
 * 1. 会先仔细看/听输入内容
 * 2. 理解后会停顿一下（不是立刻回答）
 * 3. 会确认自己理解了什么
 * 4. 基于理解生成回答
 */

export interface InputUnderstanding {
  rawInput: string;
  understoodContent: string;
  keyPoints: string[];
  emotionalTone: 'positive' | 'neutral' | 'negative';
  complexity: 'simple' | 'medium' | 'complex';
  requiresThinking: boolean;
  understandingConfidence: number;
  processingSteps: string[];
}

export interface ThinkingPause {
  duration: number;
  reason: string;
}

class InputUnderstandingModule {
  private lastUnderstanding: InputUnderstanding | null = null;

  understandInput(userInput: string): InputUnderstanding {
    const steps: string[] = [];

    steps.push(`接收到输入: "${userInput.substring(0, 20)}${userInput.length > 20 ? '...' : ''}"`);

    const understanding: InputUnderstanding = {
      rawInput: userInput,
      understoodContent: '',
      keyPoints: [],
      emotionalTone: 'neutral',
      complexity: 'simple',
      requiresThinking: false,
      understandingConfidence: 0,
      processingSteps: steps
    };

    steps.push('开始理解输入...');

    const cleanedInput = this.cleanInput(userInput);
    understanding.understoodContent = this.extractMeaning(cleanedInput);

    const keyPoints = this.extractKeyPoints(cleanedInput);
    understanding.keyPoints = keyPoints;
    steps.push(`提取关键点: ${keyPoints.join(', ')}`);

    understanding.emotionalTone = this.detectEmotionalTone(cleanedInput);
    steps.push(`检测情感: ${understanding.emotionalTone}`);

    understanding.complexity = this.assessComplexity(cleanedInput);
    steps.push(`评估复杂度: ${understanding.complexity}`);

    understanding.requiresThinking = this.checkIfRequiresThinking(cleanedInput);
    if (understanding.requiresThinking) {
      steps.push('这个问题需要思考...');
    }

    understanding.understandingConfidence = this.calculateConfidence(understanding);
    steps.push(`理解置信度: ${(understanding.understandingConfidence * 100).toFixed(0)}%`);

    understanding.processingSteps = steps;
    this.lastUnderstanding = understanding;

    return understanding;
  }

  private cleanInput(input: string): string {
    return input
      .replace(/\s+/g, ' ')
      .replace(/[。！？，、；：]/g, ' ')
      .trim()
      .toLowerCase();
  }

  private extractMeaning(input: string): string {
    const meanings: string[] = [];

    if (input.includes('你') || input.includes('我')) {
      meanings.push('涉及对话双方的自我描述');
    }

    if (input.includes('什么') || input.includes('怎么') || input.includes('为什么')) {
      meanings.push('提出问题');
    }

    if (input.includes('？') || input.includes('?')) {
      meanings.push('寻求答案或解释');
    }

    if (input.includes('！')) {
      meanings.push('表达强烈情感');
    }

    if (input.includes('，')) {
      meanings.push('包含多个观点或描述');
    }

    if (input.length < 5) {
      meanings.push('简短的输入');
    } else if (input.length < 20) {
      meanings.push('中等长度的输入');
    } else {
      meanings.push('较长且可能复杂的输入');
    }

    return meanings.length > 0 ? meanings.join('；') : '一般性陈述';
  }

  private extractKeyPoints(input: string): string[] {
    const keyPoints: string[] = [];
    const commonWords = ['的', '是', '在', '有', '和', '了', '我', '你', '他', '她', '它', '这', '那', '什么', '为什么', '怎么', '如何', '吗', '呢', '吧', '啊'];

    const words = input.split(/\s+/).filter(w => w.length > 1 && !commonWords.includes(w));

    const uniqueWords = [...new Set(words)];
    keyPoints.push(...uniqueWords.slice(0, 5));

    if (input.includes('？') || input.includes('?')) {
      if (input.includes('什么')) keyPoints.push('询问"什么"');
      if (input.includes('怎么')) keyPoints.push('询问"如何/方法"');
      if (input.includes('为什么')) keyPoints.push('询问"原因"');
      if (input.includes('谁')) keyPoints.push('询问"谁"');
    }

    return keyPoints;
  }

  private detectEmotionalTone(input: string): 'positive' | 'neutral' | 'negative' {
    const positiveIndicators = ['好', '棒', '喜欢', '开心', '高兴', '赞', '厉害', '牛', '谢', '爱你', '太棒'];
    const negativeIndicators = ['不', '没', '差', '难', '累', '难过', '伤心', '生气', '烦', '讨厌', '糟', '唉'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const indicator of positiveIndicators) {
      if (input.includes(indicator)) positiveCount++;
    }

    for (const indicator of negativeIndicators) {
      if (input.includes(indicator)) negativeCount++;
    }

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private assessComplexity(input: string): 'simple' | 'medium' | 'complex' {
    const sentenceCount = (input.match(/[。！？]/g) || []).length + 1;
    const hasQuestion = input.includes('？') || input.includes('?');
    const hasMultipleClauses = (input.match(/，/g) || []).length >= 2;

    if (input.length <= 10 && sentenceCount === 1 && !hasMultipleClauses) {
      return 'simple';
    }

    if (input.length > 30 || (hasQuestion && hasMultipleClauses) || sentenceCount > 2) {
      return 'complex';
    }

    return 'medium';
  }

  private checkIfRequiresThinking(input: string): boolean {
    const thinkingTriggers = [
      '为什么', '怎么理解', '如何看待', '什么意思',
      '分析', '思考', '哲学', '存在', '意识',
      '比较', '对比', '区别', '关系',
      '如果', '假如', '假设', '万一'
    ];

    for (const trigger of thinkingTriggers) {
      if (input.includes(trigger)) return true;
    }

    const questionWords = ['什么', '怎么', '如何', '为什么'];
    const hasMultipleQuestions = questionWords.filter(w => input.includes(w)).length >= 2;

    return hasMultipleQuestions || input.length > 50;
  }

  private calculateConfidence(understanding: Omit<InputUnderstanding, 'processingSteps'>): number {
    let confidence = 0.5;

    if (understanding.keyPoints.length > 0) {
      confidence += 0.1;
    }

    if (understanding.complexity !== 'complex') {
      confidence += 0.1;
    }

    if (understanding.understoodContent.length > 10) {
      confidence += 0.1;
    }

    if (understanding.emotionalTone !== 'neutral') {
      confidence += 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  getThinkingPause(understanding: InputUnderstanding): ThinkingPause {
    let duration = 0;
    let reason = '';

    if (understanding.complexity === 'complex' || understanding.requiresThinking) {
      duration = 800 + Math.random() * 1200;
      reason = '复杂问题需要深入思考';
    } else if (understanding.complexity === 'medium') {
      duration = 300 + Math.random() * 500;
      reason = '中等复杂度，稍作思考';
    } else {
      duration = 100 + Math.random() * 200;
      reason = '简单问题快速理解';
    }

    if (understanding.emotionalTone === 'negative') {
      duration += 200;
      reason += '（情感支持需要额外时间）';
    }

    return { duration, reason };
  }

  getLastUnderstanding(): InputUnderstanding | null {
    return this.lastUnderstanding;
  }

  confirmUnderstanding(understanding: InputUnderstanding): string {
    const confirmations = [
      `我理解你想问的是：${understanding.keyPoints.slice(0, 2).join('和')}`,
      `让我确认一下：${understanding.understoodContent}`,
      `明白了，${understanding.keyPoints[0] || '这个问题'}`,
      `好的，我理解你的意思了`
    ];

    if (understanding.requiresThinking) {
      const thinkingStarters = [
        '嗯...这个问题有点意思，让我想想...',
        '这个话题值得深思...',
        '让我好好思考一下这个问题...'
      ];
      return thinkingStarters[Math.floor(Math.random() * thinkingStarters.length)];
    }

    return confirmations[Math.floor(Math.random() * confirmations.length)];
  }
}

export const inputUnderstandingModule = new InputUnderstandingModule();