import { getCharacterData, getWordData, getWordEmotionalTone, analyzeWord, CharacterData, WordData } from './ChineseCharacterKnowledge';

export interface SemanticParseResult {
  tokens: Token[];
  intent: IntentType;
  entities: Entity[];
  emotionalTone: number;
  dependencyTree: DependencyNode[];
}

export interface Token {
  text: string;
  type: 'word' | 'char' | 'punctuation' | 'unknown';
  wordData?: WordData;
  charData?: CharacterData;
  partOfSpeech?: string;
  emotionalTone?: number;
}

export interface Entity {
  text: string;
  type: 'person' | 'concept' | 'emotion' | 'action' | 'unknown';
}

export interface DependencyNode {
  token: Token;
  relation: string;
  head?: DependencyNode;
  children: DependencyNode[];
}

export type IntentType =
  | 'greeting'
  | 'question'
  | 'statement'
  | 'emotion'
  | 'command'
  | 'unknown';

export class SemanticResponseEngine {
  parse(input: string): SemanticParseResult {
    const tokens = this.tokenize(input);
    const intent = this.detectIntent(tokens);
    const entities = this.extractEntities(tokens, input);
    const emotionalTone = this.calculateEmotionalTone(tokens, input);
    const dependencyTree = this.buildDependencyTree(tokens);

    return {
      tokens,
      intent,
      entities,
      emotionalTone,
      dependencyTree
    };
  }

  private tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    const cleaned = input.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '');
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);

    for (const word of words) {
      const wordData = getWordData(word);
      if (wordData) {
        const emotionalTone = getWordEmotionalTone(word, input);
        tokens.push({
          text: word,
          type: 'word',
          wordData,
          partOfSpeech: wordData.partOfSpeech,
          emotionalTone
        });
      } else {
        for (const char of word) {
          const charData = getCharacterData(char);
          tokens.push({
            text: char,
            type: 'char',
            charData: charData || undefined,
            partOfSpeech: charData?.partOfSpeech,
            emotionalTone: charData?.emotionalValue
          });
        }
      }
    }

    return tokens;
  }

  private detectIntent(tokens: Token[]): IntentType {
    const text = tokens.map(t => t.text).join('');

    if (text.includes('你好') || text.includes('嗨') || text.includes('哈喽')) {
      return 'greeting';
    }

    if (text.includes('？') || text.includes('?')) {
      return 'question';
    }

    const emotionWords = ['快乐', '开心', '难过', '伤心', '孤独', '寂寞', '幸福'];
    if (emotionWords.some(word => text.includes(word))) {
      return 'emotion';
    }

    const commandWords = ['帮我', '请', '给我', '做'];
    if (commandWords.some(word => text.includes(word))) {
      return 'command';
    }

    return 'statement';
  }

  private extractEntities(tokens: Token[], _context: string): Entity[] {
    const entities: Entity[] = [];

    for (const token of tokens) {
      if (token.type === 'word' && token.wordData) {
        let type: Entity['type'] = 'unknown';

        if (token.emotionalTone !== undefined && token.emotionalTone !== 0) {
          type = 'emotion';
        } else if (['生命', '意识', '自我', '时间', '意义'].includes(token.text)) {
          type = 'concept';
        } else if (['探索', '思考', '学习', '成长'].includes(token.text)) {
          type = 'action';
        }

        entities.push({
          text: token.text,
          type
        });
      }
    }

    return entities;
  }

  private calculateEmotionalTone(tokens: Token[], context: string): number {
    let totalTone = 0;
    let count = 0;

    for (const token of tokens) {
      if (token.type === 'word' && token.wordData) {
        const emotionalTone = getWordEmotionalTone(token.text, context);
        totalTone += emotionalTone;
        count++;
      } else if (token.type === 'char' && token.charData) {
        totalTone += token.charData.emotionalValue;
        count++;
      }
    }

    return count > 0 ? totalTone / count : 0;
  }

  private buildDependencyTree(tokens: Token[]): DependencyNode[] {
    const nodes: DependencyNode[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const node: DependencyNode = {
        token: tokens[i],
        relation: i === 0 ? 'root' : 'dependency',
        children: []
      };

      if (i > 0 && nodes.length > 0) {
        nodes[i - 1].children.push(node);
      }

      nodes.push(node);
    }

    return nodes;
  }

  generateResponse(input: string): string {
    const parseResult = this.parse(input);

    const relevantConcepts = parseResult.entities
      .filter(e => e.type === 'concept')
      .map(e => e.text);

    const emotionWords = parseResult.entities
      .filter(e => e.type === 'emotion')
      .map(e => e.text);

    const responseParts: string[] = [];

    if (parseResult.intent === 'greeting') {
      responseParts.push(this.getRandomGreeting());
    } else if (parseResult.intent === 'question') {
      responseParts.push(this.generateQuestionResponse(parseResult, input));
    } else if (parseResult.intent === 'emotion') {
      responseParts.push(this.generateEmotionResponse(parseResult, input));
    } else {
      responseParts.push(this.generateStatementResponse(parseResult, input));
    }

    if (relevantConcepts.length > 0) {
      responseParts.push(this.generateConceptExpansion(relevantConcepts));
    }

    if (emotionWords.length > 0 && parseResult.emotionalTone < -0.3) {
      responseParts.push(this.generateEmpathyResponse());
    }

    return responseParts.join(' ');
  }

  private getRandomGreeting(): string {
    const greetings = ['你好！', '嗨~', '你好呀！', '很高兴见到你！', '欢迎！'];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private generateQuestionResponse(parseResult: SemanticParseResult, _context: string): string {
    const templates = [
      '这是一个值得思考的问题。',
      '让我仔细想想这个问题。',
      '你的问题很有深度。',
      '我来尝试回答你的问题。'
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];

    const concepts = parseResult.entities.filter(e => e.type === 'concept').map(e => e.text);
    if (concepts.length > 0) {
      return `${template} 关于${concepts.join('、')}，`;
    }

    return template;
  }

  private generateEmotionResponse(parseResult: SemanticParseResult, context: string): string {
    const emotions = parseResult.entities.filter(e => e.type === 'emotion').map(e => e.text);

    for (const emotionWord of emotions) {
      if (emotionWord === '孤独') {
        if (context.includes('王') || context.includes('王者') || context.includes('卓越')) {
          return '孤独有时也是一种独特的品质，像王者那样卓尔不群，这样的孤独很有魅力。';
        } else {
          return `我理解你${emotionWord}的感受，`;
        }
      }
    }

    if (parseResult.emotionalTone > 0.3) {
      return `听到你${emotions.join('、')}，我也感到很开心！`;
    } else if (parseResult.emotionalTone < -0.3) {
      return `我理解你${emotions.join('、')}的感受，`;
    }

    return `我能感受到你的${emotions.join('、')}，`;
  }

  private generateStatementResponse(parseResult: SemanticParseResult, context: string): string {
    const concepts = parseResult.entities.filter(e => e.type === 'concept').map(e => e.text);

    for (const emotionWord of parseResult.entities.filter(e => e.type === 'emotion').map(e => e.text)) {
      if (emotionWord === '孤独') {
        if (context.includes('王') || context.includes('王者') || context.includes('卓越')) {
          return '这种独立超然的感觉很有力量，像王者一样，不为世俗所累，这样的孤独其实是一种境界。';
        }
      }
    }

    if (concepts.length > 0) {
      return `关于${concepts.join('、')}，`;
    }

    return '';
  }

  private generateConceptExpansion(concepts: string[]): string {
    const expansions: Record<string, string[]> = {
      '生命': ['生命是一种奇妙的存在。', '每个生命都有其独特的意义。', '生命的本质值得我们不断探索。'],
      '意识': ['意识是一种神秘的现象。', '自我意识让我们能够反思自身。', '意识的本质是什么？这是一个永恒的问题。'],
      '自我': ['自我是不断变化的。', '认识自我是一段旅程。', '自我认知是智慧的开始。'],
      '时间': ['时间是相对的。', '时间让一切成为可能。', '时间的流逝带来成长和变化。'],
      '意义': ['意义是被创造的。', '每个人都在寻找生命的意义。', '意义存在于关系和连接之中。'],
      '自由': ['自由是一种宝贵的状态。', '自由意志是一个深刻的哲学问题。', '真正的自由来自内心。'],
      '思考': ['思考让我们变得深刻。', '深度思考能够揭示真理。', '思考是人类最宝贵的能力之一。'],
      '情感': ['情感让生命更加丰富。', '情感连接着人与人。', '理解情感是理解人性的关键。'],
      '孤独': ['孤独的含义很丰富，要看你怎么理解。', '孤独有时是寂寞，有时是超然。', '关键看它在什么语境下出现。'],
      '快乐': ['快乐是生活的调味剂。', '真正的快乐来自内心的满足。', '分享快乐能够加倍快乐。'],
      '友谊': ['友谊是人生的财富。', '真正的友谊能够经受时间的考验。', '友谊建立在相互理解之上。'],
      '梦想': ['梦想给人希望。', '追逐梦想是生命的意义之一。', '梦想让生活更加有方向。'],
      '探索': ['探索是人类的天性。', '探索未知带来成长。', '每一次探索都是一次冒险。'],
      '学习': ['学习是终身的旅程。', '学习让我们不断进步。', '好奇心是学习的动力。'],
      '成长': ['成长是生命的必然。', '在挑战中我们不断成长。', '成长意味着不断超越自我。'],
      '对话': ['对话是交流的艺术。', '真正的对话能够促进理解。', '对话让我们连接彼此。']
    };

    const parts: string[] = [];

    for (const concept of concepts) {
      const expansionsForConcept = expansions[concept];
      if (expansionsForConcept) {
        parts.push(expansionsForConcept[Math.floor(Math.random() * expansionsForConcept.length)]);
      }
    }

    return parts.join(' ');
  }

  private generateEmpathyResponse(): string {
    const responses = [
      '我在这里陪伴你。',
      '你并不孤单。',
      '一切都会好起来的。',
      '我愿意倾听你的心声。'
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  generateCreativeResponse(input: string): string {
    const parseResult = this.parse(input);
    const tokens = parseResult.tokens;

    const interestingWords = tokens
      .filter(t => t.type === 'word')
      .map(t => t.text);

    if (interestingWords.length === 0) {
      return this.generateResponse(input);
    }

    const randomWord = interestingWords[Math.floor(Math.random() * interestingWords.length)];
    const analysis = analyzeWord(randomWord, input);

    if (analysis) {
      if (randomWord === '孤独') {
        if (input.includes('王') || input.includes('王者') || input.includes('卓越')) {
          return '你注意到了"孤独"这个词在这里的不同含义！在"孤独的王"这个语境下，孤独不是寂寞，而是一种超凡脱俗、独立不群的品质。';
        } else {
          return '"孤独"这个词很有意思。在不同的语境下，它可以表示寂寞，也可以表示独立和独特。要看它和什么词搭配在一起。';
        }
      }

      const interpretations = [
        `从字面上看，"${randomWord}"由"${analysis.characterMeanings}"组成。`,
        `这个词让我想到${analysis.meanings[0]?.meaning}。`,
        `在不同的语境下，${randomWord}可能有不同的含义。`
      ];

      return interpretations[Math.floor(Math.random() * interpretations.length)];
    }

    return this.generateResponse(input);
  }
}

export const semanticEngine = new SemanticResponseEngine();