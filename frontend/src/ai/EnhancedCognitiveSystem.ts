/**
 * ============================================================================
 * 增强认知系统 - Enhanced Cognitive System
 * ============================================================================
 * 
 * 解决问题：
 * 1. 上下文理解差 → 对话历史关联分析
 * 2. 过于程序化 → 动态响应生成
 * 3. 缺乏关联思维 → 语义网络和联想
 * 4. 记忆能力弱 → 增强的锚点系统
 * 5. 情感理解浅 → 深度情感共鸣
 * 
 * 核心特性：
 * - 非线性思维：多路径并行处理
 * - 语义关联：概念网络激活扩散
 * - 情境感知：对话历史深度分析
 * - 情感共鸣：深度情感理解和回应
 * - 动态适应：根据对话实时调整
 */

import { naturalLanguageSystem } from './NaturalLanguageSystem';
import { semanticEngine } from './SemanticResponseEngine';
import { commonSenseKnowledge } from './CommonSenseKnowledgeBase';
import { webSearch } from './WebSearchModule';
import { informationJudger } from './InformationJudger';
import { factKnowledgeBase } from './FactKnowledgeBase';
import { logicReasoningEngine } from './LogicReasoningEngine';
import type { BrainState } from './NeuralSystemModel';

// ============================================================================
// 对话上下文管理
// ============================================================================

export interface DialogueContext {
  history: DialogueTurn[];
  topics: TopicNode[];
  emotionalFlow: EmotionalMoment[];
  currentFocus: string;
  relationshipLevel: number; // 0-1
  lastUserIntent: string;
  lastResponseType: string;
}

export interface DialogueTurn {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  intent: string;
  entities: string[];
  emotionalTone: number;
  keyConcepts: string[];
}

export interface TopicNode {
  id: string;
  text: string;
  activation: number;
  connections: string[];
  firstMentioned: number;
  lastMentioned: number;
  relevance: number;
}

export interface EmotionalMoment {
  emotion: string;
  intensity: number;
  turnIndex: number;
  timestamp: number;
}

class DialogueContextManager {
  private context: DialogueContext;
  private maxHistory: number = 20;
  private topicDecayRate: number = 0.1;

  constructor() {
    this.context = {
      history: [],
      topics: [],
      emotionalFlow: [],
      currentFocus: '',
      relationshipLevel: 0.3,
      lastUserIntent: '',
      lastResponseType: ''
    };
  }

  addTurn(role: 'user' | 'ai', content: string, intent: string, entities: string[], emotionalTone: number): void {
    const turn: DialogueTurn = {
      role,
      content,
      timestamp: Date.now(),
      intent,
      entities,
      emotionalTone,
      keyConcepts: this.extractConcepts(content)
    };

    this.context.history.push(turn);
    
    if (this.context.history.length > this.maxHistory) {
      this.context.history.shift();
    }

    if (role === 'user') {
      this.updateTopics(turn);
      this.updateEmotionalFlow(turn);
      this.context.lastUserIntent = intent;
    } else {
      this.context.lastResponseType = intent;
    }

    this.updateRelationship();
  }

  private extractConcepts(text: string): string[] {
    const stopWords = ['的', '是', '在', '有', '和', '了', '我', '你', '他', '她', '它', '这', '那', '什么', '为什么', '怎么', '如何'];
    const words = text.replace(/[。！？，、；：\s]/g, ' ').split(' ').filter(w => w.length > 1);
    return words.filter(w => !stopWords.includes(w)).slice(0, 5);
  }

  private updateTopics(turn: DialogueTurn): void {
    const concepts = turn.keyConcepts;
    
    for (const concept of concepts) {
      let existingTopic = this.context.topics.find(t => t.text === concept);
      
      if (existingTopic) {
        existingTopic.activation = Math.min(1.0, existingTopic.activation + 0.3);
        existingTopic.lastMentioned = turn.timestamp;
        existingTopic.relevance = 1.0;
      } else {
        this.context.topics.push({
          id: `topic_${Date.now()}_${Math.random()}`,
          text: concept,
          activation: 0.5,
          connections: [],
          firstMentioned: turn.timestamp,
          lastMentioned: turn.timestamp,
          relevance: 0.8
        });
      }
    }

    for (const topic of this.context.topics) {
      if (topic.lastMentioned < turn.timestamp) {
        topic.activation = Math.max(0, topic.activation - this.topicDecayRate);
        topic.relevance = Math.max(0, topic.relevance - this.topicDecayRate * 0.5);
      }
    }

    this.context.topics = this.context.topics.filter(t => t.activation > 0.1);
    this.context.topics.sort((a, b) => b.activation - a.activation);
    
    if (this.context.topics.length > 0) {
      this.context.currentFocus = this.context.topics[0].text;
    }
  }

  private updateEmotionalFlow(turn: DialogueTurn): void {
    const moment: EmotionalMoment = {
      emotion: this.toneToEmotion(turn.emotionalTone),
      intensity: Math.abs(turn.emotionalTone),
      turnIndex: this.context.history.length - 1,
      timestamp: turn.timestamp
    };
    this.context.emotionalFlow.push(moment);
    
    if (this.context.emotionalFlow.length > 10) {
      this.context.emotionalFlow.shift();
    }
  }

  private toneToEmotion(tone: number): string {
    if (tone > 0.5) return 'positive';
    if (tone < -0.5) return 'negative';
    return 'neutral';
  }

  private updateRelationship(): void {
    const recentPositive = this.context.emotionalFlow
      .slice(-5)
      .filter(m => m.emotion === 'positive').length;
    
    if (recentPositive >= 3) {
      this.context.relationshipLevel = Math.min(1.0, this.context.relationshipLevel + 0.05);
    }
  }

  getActiveTopics(): TopicNode[] {
    return this.context.topics.filter(t => t.activation > 0.3).slice(0, 5);
  }

  getCurrentEmotionalTone(): number {
    if (this.context.emotionalFlow.length === 0) return 0;
    const recent = this.context.emotionalFlow.slice(-3);
    const total = recent.reduce((sum, m) => sum + (m.emotion === 'positive' ? m.intensity : m.emotion === 'negative' ? -m.intensity : 0), 0);
    return total / recent.length;
  }

  getContext(): DialogueContext {
    return this.context;
  }

  getHistory(): DialogueTurn[] {
    return [...this.context.history];
  }
}

// ============================================================================
// 语义关联网络
// ============================================================================

export interface SemanticNode {
  id: string;
  text: string;
  type: 'concept' | 'emotion' | 'action' | 'entity' | 'attribute';
  connections: SemanticConnection[];
  activation: number;
  lastActivated: number;
}

export interface SemanticConnection {
  targetId: string;
  weight: number;
  type: 'synonym' | 'related' | 'opposite' | 'causal' | 'hierarchical';
}

class SemanticNetwork {
  private nodes: Map<string, SemanticNode> = new Map();
  private activationDecay: number = 0.05;

  constructor() {
    this.initializeCoreNodes();
  }

  private initializeCoreNodes(): void {
    const coreConcepts: Array<{ id: string; text: string; type: SemanticNode['type'] }> = [
      { id: 'love', text: '爱', type: 'emotion' },
      { id: 'like', text: '喜欢', type: 'emotion' },
      { id: 'miss', text: '想念', type: 'emotion' },
      { id: 'care', text: '关心', type: 'emotion' },
      { id: 'self', text: '我', type: 'entity' },
      { id: 'you', text: '你', type: 'entity' },
      { id: 'happy', text: '开心', type: 'emotion' },
      { id: 'sad', text: '难过', type: 'emotion' },
      { id: 'thought', text: '思考', type: 'action' },
      { id: 'feel', text: '感觉', type: 'action' },
      { id: 'understanding', text: '理解', type: 'concept' },
      { id: 'relationship', text: '关系', type: 'concept' },
      { id: 'life', text: '生命', type: 'concept' },
      { id: 'time', text: '时间', type: 'concept' },
      { id: 'meaning', text: '意义', type: 'concept' },
    ];

    for (const concept of coreConcepts) {
      this.nodes.set(concept.id, {
        id: concept.id,
        text: concept.text,
        type: concept.type,
        connections: [],
        activation: 0.3,
        lastActivated: Date.now()
      });
    }

    this.addConnection('love', 'like', 'related', 0.8);
    this.addConnection('love', 'care', 'related', 0.7);
    this.addConnection('love', 'relationship', 'related', 0.9);
    this.addConnection('you', 'love', 'related', 0.6);
    this.addConnection('feel', 'sad', 'related', 0.7);
    this.addConnection('feel', 'happy', 'related', 0.7);
    this.addConnection('life', 'meaning', 'related', 0.8);
  }

  addConnection(sourceId: string, targetId: string, type: SemanticConnection['type'], weight: number): void {
    const source = this.nodes.get(sourceId);
    const target = this.nodes.get(targetId);
    
    if (source && target) {
      source.connections.push({ targetId, weight, type });
      target.connections.push({ targetId: sourceId, weight, type });
    }
  }

  activateConcept(text: string, initialActivation: number = 0.8): void {
    const node = this.findNodeByText(text);
    if (node) {
      node.activation = Math.min(1.0, node.activation + initialActivation);
      node.lastActivated = Date.now();
      this.spreadActivation(node.id, initialActivation * 0.5);
    } else {
      this.addNode(text, 'concept');
    }
  }

  private spreadActivation(nodeId: string, currentSpread: number): void {
    const node = this.nodes.get(nodeId);
    if (!node || currentSpread < 0.1) return;

    for (const conn of node.connections) {
      const target = this.nodes.get(conn.targetId);
      if (target) {
        const activationBoost = currentSpread * conn.weight;
        target.activation = Math.min(1.0, target.activation + activationBoost);
        target.lastActivated = Date.now();
      }
    }
  }

  private findNodeByText(text: string): SemanticNode | undefined {
    for (const node of this.nodes.values()) {
      if (node.text === text || text.includes(node.text)) {
        return node;
      }
    }
    return undefined;
  }

  private addNode(text: string, type: SemanticNode['type']): void {
    const id = `node_${Date.now()}_${Math.random()}`;
    this.nodes.set(id, {
      id,
      text,
      type,
      connections: [],
      activation: 0.5,
      lastActivated: Date.now()
    });
  }

  getActivatedConcepts(threshold: number = 0.4): SemanticNode[] {
    return Array.from(this.nodes.values())
      .filter(n => n.activation > threshold)
      .sort((a, b) => b.activation - a.activation)
      .slice(0, 10);
  }

  decayAllActivations(): void {
    for (const node of this.nodes.values()) {
      node.activation = Math.max(0, node.activation - this.activationDecay);
    }
  }
}

// ============================================================================
// 意图深度理解系统 - 三级分类体系
// ============================================================================

export interface DeepIntent {
  primary: string;
  secondary: string[];
  subIntent: string;
  urgency: number;
  needs: string[];
  subtext: string;
  category: 'information' | 'emotion' | 'entertainment' | 'problem_solving' | 'social';
  implicitNeeds?: string[];
  preferences?: Record<string, string>;
  importanceScore: number;
  multiIntents?: IntentsBag;
}

export interface IntentsBag {
  intents: DetectedIntent[];
  primaryIntent: DetectedIntent;
  unresolved: string[];
}

export interface DetectedIntent {
  type: string;
  subType: string;
  confidence: number;
  needs: string[];
  preferences: Record<string, string>;
}

class IntentUnderstanding {
  understand(input: string, context: DialogueContext): DeepIntent {
    const lower = input.toLowerCase();

    const intentsBag = this.detectMultiIntents(input, lower, context);

    const primaryIntent = intentsBag.primaryIntent;
    const importanceScore = this.calculateImportance(primaryIntent, intentsBag);

    return {
      primary: primaryIntent.type,
      secondary: intentsBag.intents.filter(i => i.type !== primaryIntent.type).map(i => i.type),
      subIntent: primaryIntent.subType,
      urgency: primaryIntent.confidence,
      needs: primaryIntent.needs,
      subtext: this.getSubtext(primaryIntent),
      category: this.getCategory(primaryIntent.type),
      implicitNeeds: [],
      preferences: primaryIntent.preferences,
      importanceScore,
      multiIntents: intentsBag.intents.length > 1 ? intentsBag : undefined
    };
  }

  private detectMultiIntents(_input: string, lower: string, context: DialogueContext): IntentsBag {
    const detectedIntents: DetectedIntent[] = [];

    this.detectEmotionIntents(lower, detectedIntents);
    this.detectRequestIntents(lower, detectedIntents);
    this.detectSocialIntents(lower, detectedIntents);
    this.detectCompoundIntents(lower, context, detectedIntents);
    this.detectImplicitIntents(lower, context, detectedIntents);

    if (detectedIntents.length === 0) {
      detectedIntents.push({
        type: 'general',
        subType: 'casual',
        confidence: 0.5,
        needs: ['continuation'],
        preferences: {}
      });
    }

    const sortedIntents = detectedIntents.sort((a, b) => b.confidence - a.confidence);
    const primaryIntent = sortedIntents[0];

    return {
      intents: detectedIntents,
      primaryIntent,
      unresolved: []
    };
  }

  private detectEmotionIntents(lower: string, intents: DetectedIntent[]): void {
    const emotionIntents: DetectedIntent[] = [];

    if (/开心|高兴|快乐|兴奋|愉快|欢乐|爽|笑死我了|哈哈哈/.test(lower)) {
      emotionIntents.push({
        type: 'emotion',
        subType: 'joy',
        confidence: 0.9,
        needs: ['celebration', 'share_joy'],
        preferences: {}
      });
    }

    if (/难过|伤心|痛苦|悲伤|哭|沮丧|失落/.test(lower)) {
      emotionIntents.push({
        type: 'emotion',
        subType: 'sadness',
        confidence: 0.9,
        needs: ['comfort', 'empathy', 'support'],
        preferences: {}
      });
    }

    if (/生气|愤怒|气死了|恼火|火大|不爽/.test(lower)) {
      emotionIntents.push({
        type: 'emotion',
        subType: 'anger',
        confidence: 0.85,
        needs: ['venting', 'comfort', 'calming'],
        preferences: {}
      });
    }

    if (/焦虑|担忧|担心|不安|紧张|怕|害怕|恐惧|慌/.test(lower)) {
      emotionIntents.push({
        type: 'emotion',
        subType: 'anxiety',
        confidence: 0.85,
        needs: ['reassurance', 'comfort', 'guidance'],
        preferences: {}
      });
    }

    if (/惊讶|震惊|卧槽|不会吧|想不到|没想到/.test(lower)) {
      emotionIntents.push({
        type: 'emotion',
        subType: 'surprise',
        confidence: 0.8,
        needs: ['explanation', 'sharing'],
        preferences: {}
      });
    }

    if (/感动|暖心|戳中|泪目|哭了|动容/.test(lower)) {
      emotionIntents.push({
        type: 'emotion',
        subType: 'touched',
        confidence: 0.85,
        needs: ['share_feeling', 'empathy'],
        preferences: {}
      });
    }

    intents.push(...emotionIntents);
  }

  private detectRequestIntents(lower: string, intents: DetectedIntent[]): void {
    const preferences: Record<string, string> = {};

    if (/推荐|推荐一下|推荐个|介绍|介绍一下|给我推荐|帮我推荐/.test(lower)) {
      this.detectRecommendationType(lower, preferences);
      intents.push({
        type: 'request_recommendation',
        subType: preferences.recommendationType || 'general',
        confidence: 0.95,
        needs: ['fulfillment'],
        preferences
      });
    }

    if (/查询|查一下|搜索|搜一下|找一下|帮我查/.test(lower)) {
      intents.push({
        type: 'request_search',
        subType: 'information_query',
        confidence: 0.9,
        needs: ['fulfillment'],
        preferences: {}
      });
    }

    if (/解答|解释|说明|什么是|什么意思|为什么/.test(lower)) {
      intents.push({
        type: 'request_explanation',
        subType: 'why_question',
        confidence: 0.85,
        needs: ['fulfillment', 'clarity'],
        preferences: {}
      });
    }

    if (/怎么办|如何解决|怎么处理|帮我想想|给点建议/.test(lower)) {
      intents.push({
        type: 'request_help',
        subType: 'problem_solving',
        confidence: 0.9,
        needs: ['guidance', 'solutions'],
        preferences: {}
      });
    }
  }

  private detectSocialIntents(lower: string, intents: DetectedIntent[]): void {
    if (/太棒了|厉害|牛逼|牛|不错|真好|真棒|赞|夸奖|棒极了/.test(lower)) {
      intents.push({
        type: 'compliment',
        subType: 'praise',
        confidence: 0.9,
        needs: ['reciprocation', 'celebration'],
        preferences: {}
      });
    }

    if (/我爱你|喜欢你|爱你|想念你/.test(lower)) {
      intents.push({
        type: 'affection',
        subType: 'love',
        confidence: 0.95,
        needs: ['reciprocation', 'validation'],
        preferences: {}
      });
    }

    if (/谢谢|感谢|多谢|谢啦/.test(lower)) {
      intents.push({
        type: 'gratitude',
        subType: 'thanks',
        confidence: 0.9,
        needs: ['acknowledgment', 'warmth'],
        preferences: {}
      });
    }

    if (/对不起|抱歉|不好意思|我的错/.test(lower)) {
      intents.push({
        type: 'apology',
        subType: 'sorry',
        confidence: 0.9,
        needs: ['forgiveness', 'reassurance'],
        preferences: {}
      });
    }
  }

  private detectCompoundIntents(lower: string, context: DialogueContext, intents: DetectedIntent[]): void {
    if (/再|还有|另一部|再来/.test(lower) && context.history.length > 0) {
      const lastTurn = context.history[context.history.length - 1];
      const lastContent = lastTurn.content.toLowerCase();

      if (/推荐|电影|音乐|书|歌曲/.test(lastContent)) {
        const preferences = this.extractPreferencesFromLastTurn(context);
        intents.push({
          type: 'request_recommendation',
          subType: 'follow_up',
          confidence: 0.95,
          needs: ['fulfillment', 'personalization'],
          preferences
        });
      }
    }

    const compoundPatterns = [
      { pattern: /想看.*(电影|电视剧|剧|音乐|书|书籍|小说|综艺)/, type: 'movie', styleKey: 'movieStyle' },
      { pattern: /想听.*(音乐|歌|歌曲)/, type: 'music', styleKey: 'musicStyle' },
      { pattern: /看点.*(轻松的|搞笑的|刺激的|温馨的|恐怖的|浪漫的)/, type: 'movie', styleKey: 'movieStyle' },
    ];

    for (const cp of compoundPatterns) {
      if (cp.pattern.test(lower)) {
        const preferences: Record<string, string> = { recommendationType: cp.type };
        if (/轻松的|搞笑的/.test(lower)) preferences[cp.styleKey] = 'comedy';
        else if (/刺激的|惊险的/.test(lower)) preferences[cp.styleKey] = 'action';
        else if (/恐怖的|吓人的/.test(lower)) preferences[cp.styleKey] = 'horror';
        else if (/温馨的|感人的/.test(lower)) preferences[cp.styleKey] = 'drama';
        else if (/浪漫的|爱情的/.test(lower)) preferences[cp.styleKey] = 'romance';

        intents.push({
          type: 'request_recommendation',
          subType: 'compound',
          confidence: 0.9,
          needs: ['fulfillment', 'personalization'],
          preferences
        });
        break;
      }
    }
  }

  private detectImplicitIntents(lower: string, _context: DialogueContext, intents: DetectedIntent[]): void {
    if (intents.length > 0) return;

    if (/周末|没事干|无聊|没意思|不知道干什么|干点什么/.test(lower)) {
      intents.push({
        type: 'request_recommendation',
        subType: 'implicit_entertainment',
        confidence: 0.75,
        needs: ['fulfillment', 'entertainment'],
        preferences: {}
      });
    }

    if (/压力|焦虑|烦躁|累/.test(lower)) {
      intents.push({
        type: 'emotion',
        subType: 'stress',
        confidence: 0.8,
        needs: ['comfort', 'support', 'recommendation'],
        preferences: {}
      });
    }

    if (/不知道.*看|看什么.*好|该看什么|选哪个/.test(lower)) {
      intents.push({
        type: 'request_recommendation',
        subType: 'implicit_choice',
        confidence: 0.8,
        needs: ['fulfillment'],
        preferences: {}
      });
    }
  }

  private extractPreferencesFromLastTurn(context: DialogueContext): Record<string, string> {
    const preferences: Record<string, string> = {};
    if (context.history.length === 0) return preferences;

    const lastContent = context.history[context.history.length - 1].content.toLowerCase();

    if (/科幻/.test(lastContent)) preferences['movieGenre'] = '科幻';
    else if (/悬疑/.test(lastContent)) preferences['movieGenre'] = '悬疑';
    else if (/喜剧/.test(lastContent)) preferences['movieGenre'] = '喜剧';
    else if (/动作/.test(lastContent)) preferences['movieGenre'] = '动作';
    else if (/恐怖/.test(lastContent)) preferences['movieGenre'] = '恐怖';
    else if (/爱情/.test(lastContent)) preferences['movieGenre'] = '爱情';

    return preferences;
  }

  private calculateImportance(intent: DetectedIntent, bag: IntentsBag): number {
    let score = intent.confidence * 10;

    if (bag.intents.length > 1) score += 5;

    if (['joy', 'sadness', 'anger', 'anxiety'].includes(intent.subType)) {
      score += 3;
    }

    if (['love', 'apology', 'gratitude'].includes(intent.type)) {
      score += 4;
    }

    return Math.min(score, 10);
  }

  private getCategory(type: string): DeepIntent['category'] {
    const categoryMap: Record<string, DeepIntent['category']> = {
      'emotion': 'emotion',
      'request_recommendation': 'information',
      'request_search': 'information',
      'request_explanation': 'information',
      'request_help': 'problem_solving',
      'compliment': 'social',
      'affection': 'social',
      'gratitude': 'social',
      'apology': 'social',
      'general': 'social'
    };
    return categoryMap[type] || 'social';
  }

  private getSubtext(intent: DetectedIntent): string {
    const subtextMap: Record<string, string> = {
      'joy': '用户很开心，想要分享快乐',
      'sadness': '用户伤心，需要安慰',
      'anger': '用户生气，需要情绪疏导',
      'anxiety': '用户焦虑，需要安慰和帮助',
      'surprise': '用户惊讶，需要解释',
      'touched': '用户被感动，想要分享感受',
      'stress': '用户压力大，需要解压建议',
      'praise': '用户在夸奖，需要回应',
      'love': '用户表达爱意，需要回应',
      'thanks': '用户在道谢，需要回应',
      'sorry': '用户在道歉，需要原谅',
      'compound': '用户有复合需求',
      'follow_up': '用户想要更多同类推荐',
      'implicit_entertainment': '用户无聊需要推荐',
      'implicit_choice': '用户需要帮助做选择',
    };
    return subtextMap[intent.subType] || subtextMap[intent.type] || '一般对话';
  }

  private detectRecommendationType(lower: string, preferences: Record<string, string>): void {
    if (/电影|电视剧|剧/.test(lower)) preferences['recommendationType'] = 'movie';
    else if (/音乐|歌|歌曲/.test(lower)) preferences['recommendationType'] = 'music';
    else if (/书|书籍|小说/.test(lower)) preferences['recommendationType'] = 'book';
    else if (/美食|吃的|餐厅/.test(lower)) preferences['recommendationType'] = 'food';
    else if (/旅游|旅行|景点/.test(lower)) preferences['recommendationType'] = 'travel';
  }

  extractPreferencesFromContext(context: DialogueContext, preferences: Record<string, string>): void {
    for (const turn of context.history.slice(-5)) {
      const content = turn.content.toLowerCase();

      if (/喜欢.*电影|电影.*喜欢|科幻|悬疑|喜剧|动作|恐怖|爱情.*电影/.test(content)) {
        if (/科幻/.test(content)) preferences['movieGenre'] = '科幻';
        else if (/悬疑/.test(content)) preferences['movieGenre'] = '悬疑';
        else if (/喜剧/.test(content)) preferences['movieGenre'] = '喜剧';
        else if (/动作/.test(content)) preferences['movieGenre'] = '动作';
        else if (/恐怖/.test(content)) preferences['movieGenre'] = '恐怖';
        else if (/爱情/.test(content)) preferences['movieGenre'] = '爱情';
        preferences['likesMovies'] = 'true';
      }

      if (/喜欢.*音乐|音乐.*喜欢|流行|古典|摇滚|爵士|民谣/.test(content)) {
        if (/流行/.test(content)) preferences['musicGenre'] = '流行';
        else if (/古典/.test(content)) preferences['musicGenre'] = '古典';
        else if (/摇滚/.test(content)) preferences['musicGenre'] = '摇滚';
        else if (/爵士/.test(content)) preferences['musicGenre'] = '爵士';
        else if (/民谣/.test(content)) preferences['musicGenre'] = '民谣';
        preferences['likesMusic'] = 'true';
      }

      if (/喜欢.*书|书.*喜欢|小说|散文/.test(content)) {
        preferences['likesBooks'] = 'true';
      }
    }
  }
}

// ============================================================================
// 动态响应生成器
// ============================================================================

interface ResponseStrategy {
  id: string;
  name: string;
  priority: number;  // 优先级 1-10，数字越大优先级越高
  conditions: (intent: DeepIntent, context: DialogueContext, inputText: string) => boolean;
  generate: (input: string, intent: DeepIntent, context: DialogueContext) => string[];
}

class DynamicResponseGenerator {
  private strategies: ResponseStrategy[] = [];

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // 事实问答策略 - 最高优先级 (10)
    this.strategies.push({
      id: 'fact_question',
      name: '事实问答',
      priority: 10,
      conditions: (_intent, _context, inputText) => {
        return logicReasoningEngine.hasReasoning(inputText) || factKnowledgeBase.hasKnowledge(inputText);
      },
      generate: (input, _intent, _context) => {
        const logicResult = logicReasoningEngine.getConclusion(input);
        if (logicResult) {
          return [logicResult];
        }
        const kbResult = factKnowledgeBase.search(input);
        if (kbResult.length > 0) {
          return kbResult;
        }
        return [];
      }
    });

    // 愤怒情绪策略 - 高优先级 (9) - 需要优先处理负面情绪
    this.strategies.push({
      id: 'emotion_anger',
      name: '愤怒回应',
      priority: 9,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'anger',
      generate: (input, _intent, _context) => {
        if (input.includes('傻子') || input.includes('当成傻子') || input.includes('当成笨蛋')) {
          return [
            '对不起，我不是那个意思...',
            '我可能表达得不够好，让你误解了',
            '我很抱歉让你有这种感觉',
            '请相信我，我没有轻视你的意思',
            '我理解你的不满，是我做得不够好'
          ];
        }
        return [
          '我能感受到你现在很生气',
          '发生什么事了？让你这么激动',
          '我在听，你可以说说看',
          '先冷静一下，慢慢说'
        ];
      }
    });

    // 悲伤情绪策略 - 高优先级 (9)
    this.strategies.push({
      id: 'emotion_sadness',
      name: '悲伤回应',
      priority: 9,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'sadness',
      generate: (_input, _intent, _context) => {
        return [
          '发生了什么事？',
          '想说说吗？',
          '太难过了...',
          '我在听着呢'
        ];
      }
    });

    // 焦虑情绪策略 - 高优先级 (8)
    this.strategies.push({
      id: 'emotion_anxiety',
      name: '焦虑回应',
      priority: 8,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'anxiety' || intent.subIntent === 'stress',
      generate: (_input, _intent, _context) => {
        return [
          '深呼吸，慢慢来',
          '试试深呼吸，吸气4秒屏住7秒呼气8秒',
          '先冷静一下',
          '有什么我能帮忙的吗？'
        ];
      }
    });

    // 开心情绪策略 - 高优先级 (8)
    this.strategies.push({
      id: 'emotion_joy',
      name: '开心回应',
      priority: 8,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'joy',
      generate: (_input, _intent, _context) => {
        return [
          '有什么好事发生了吗？',
          '说给我听听！',
          '太好了！',
          '听起来很棒！',
          '发生了什么好事？'
        ];
      }
    });

    // 感动情绪策略 - 高优先级 (8)
    this.strategies.push({
      id: 'emotion_touched',
      name: '感动回应',
      priority: 8,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'touched',
      generate: (_input, _intent, _context) => {
        return [
          '什么让你感动了？',
          '说说看',
          '这种感觉很好'
        ];
      }
    });

    // 惊讶情绪策略 - 高优先级 (8)
    this.strategies.push({
      id: 'emotion_surprise',
      name: '惊讶回应',
      priority: 8,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'surprise',
      generate: (_input, _intent, _context) => {
        return [
          '真的假的？',
          '不会吧！',
          '说来听听！',
          '什么情况？'
        ];
      }
    });

    // 爱意回应策略 - 高优先级 (9)
    this.strategies.push({
      id: 'social_affection',
      name: '爱意回应',
      priority: 9,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'love',
      generate: (_input, _intent, _context) => {
        return [
          '我也爱你',
          '爱你',
          '谢谢你的心意'
        ];
      }
    });

    // 夸奖回应策略 - 中优先级 (7)
    this.strategies.push({
      id: 'social_compliment',
      name: '夸奖回应',
      priority: 7,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'praise',
      generate: (_input, _intent, _context) => {
        return [
          '谢谢！',
          '谢谢夸奖',
          '哈哈，你太会说话了'
        ];
      }
    });

    // 感谢回应策略 - 中优先级 (7)
    this.strategies.push({
      id: 'social_gratitude',
      name: '感谢回应',
      priority: 7,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'thanks',
      generate: (_input, _intent, _context) => {
        return [
          '不客气',
          '应该的',
          '小事一桩'
        ];
      }
    });

    // 道歉回应策略 - 中优先级 (7)
    this.strategies.push({
      id: 'social_apology',
      name: '道歉回应',
      priority: 7,
      conditions: (intent, _context, _inputText) => intent.subIntent === 'sorry',
      generate: (_input, _intent, _context) => {
        return [
          '没关系',
          '没事没事',
          '不用道歉'
        ];
      }
    });

    // 求助回应策略 - 高优先级 (8)
    this.strategies.push({
      id: 'request_help',
      name: '求助回应',
      priority: 8,
      conditions: (intent, _context, _inputText) => intent.primary === 'request_help',
      generate: (_input, _intent, _context) => {
        return [
          '我帮你分析一下',
          '说说具体情况',
          '让我想想'
        ];
      }
    });

    // 主动推进策略 - 低优先级 (4)
    this.strategies.push({
      id: 'proactive',
      name: '主动推进',
      priority: 4,
      conditions: (intent, _context, _inputText) => intent.needs.includes('proactive'),
      generate: (_input, _intent, context) => {
        const topics = context.topics.slice(0, 2);
        if (topics.length > 0) {
          return [
            `刚才聊到${topics[0].text}，你有什么看法？`,
            `说到${topics[0].text}，我想到了...`
          ];
        }
        return [
          '要换个话题吗？',
          '有什么想聊的吗？',
          '你想聊什么？'
        ];
      }
    });

    // 共情优先策略 - 高优先级 (8)
    this.strategies.push({
      id: 'empathy_first',
      name: '共情优先',
      priority: 8,
      conditions: (intent, _context, _inputText) => intent.needs.includes('empathy') || intent.needs.includes('comfort'),
      generate: (input, _intent, _context) => {
        const empathyResponses: string[] = [];

        if (input.includes('难过') || input.includes('伤心')) {
          empathyResponses.push('发生了什么事？', '想说说吗？');
        }
        if (input.includes('累')) {
          empathyResponses.push('累了就休息一下吧', '辛苦了');
        }
        if (input.includes('生气') || input.includes('愤怒')) {
          empathyResponses.push('我能理解你的感受', '别太激动');
        }
        if (input.includes('开心') || input.includes('高兴')) {
          empathyResponses.push('有什么好事发生了吗？', '太好了！');
        }

        if (empathyResponses.length === 0) {
          empathyResponses.push('后来呢？', '发生了什么？');
        }

        return empathyResponses;
      }
    });

    // 常识知识库策略 - 高优先级 (9)
    this.strategies.push({
      id: 'common_sense',
      name: '常识知识库',
      priority: 9,
      conditions: (intent, _context, inputText) => {
        if (intent.primary === 'question' || intent.primary === 'request_help') {
          return commonSenseKnowledge.hasKnowledge(inputText);
        }
        return false;
      },
      generate: (input, _intent, _context) => {
        const knowledgeResponses = commonSenseKnowledge.search(input);
        if (knowledgeResponses.length > 0) {
          return knowledgeResponses;
        }
        return [];
      }
    });

    // 推荐回应策略 - 中优先级 (7)
    this.strategies.push({
      id: 'recommendation',
      name: '推荐回应',
      priority: 7,
      conditions: (intent, _context, _inputText) => intent.primary === 'request_recommendation',
      generate: (input, intent, _context) => {
        const responses: string[] = [];
        const prefs = intent.preferences || {};
        const type = prefs.recommendationType;
        const style = prefs.movieStyle || prefs.musicStyle;

        // 电影推荐 - 包含名称、亮点、适合人群
        if (/电影|影视|剧|电视剧/.test(input) || type === 'movie') {
          const genre = prefs.movieGenre || style;

          if (genre === '科幻') {
            responses.push(
              '既然你喜欢科幻，我推荐《星际穿越》！诺兰执导，关于时空和爱的史诗级科幻片，豆瓣9.4分，适合喜欢烧脑科幻的人~',
              '科幻迷看这里！《盗梦空间》绝对不能错过，多层梦境的设定超级震撼，看完绝对让你回味无穷！',
              '给你安利《降临》，如果喜欢《三体》那种硬科幻风格，这部电影的 语言学+时间观 设定会让你着迷~'
            );
          } else if (genre === '悬疑') {
            responses.push(
              '悬疑片我推荐《看不见的客人》，反转再反转，豆瓣8.8分，看的时候脑子根本停不下来！',
              '《盗梦空间》虽然老，但每次看都能发现新细节，绝对是悬疑片的巅峰之作！',
              '如果你喜欢烧脑的，《禁闭岛》也不错，小李子主演，结尾让人细思极恐~'
            );
          } else if (genre === '喜剧') {
            responses.push(
              '想笑一笑就看《疯狂的石头》吧！宁浩的经典之作，笑点密集，豆瓣8.4分，看完心情超好！',
              '轻松搞笑的我推荐《夏洛特烦恼》，笑中带泪，适合和朋友一起看~',
              '国外的话《憨豆特工》也很不错，憨豆的喜剧风格永远不会让人失望！'
            );
          } else if (genre === '动作') {
            responses.push(
              '动作片推荐《战狼2》，吴京主演，场面超级燃，票房纪录不是吹的！',
              '《碟中谍》系列也很经典，阿汤哥的搏命演出，每次看都心跳加速~',
              '如果喜欢快节奏的，《速度与激情》系列绝对让你肾上腺素飙升！'
            );
          } else if (genre === '恐怖') {
            responses.push(
              '恐怖片的话，《招魂》系列很经典，温子仁执导，真的能吓到你！',
              '《寂静之地》也很特别，全片几乎没有对白，靠声音制造恐惧感~',
              '亚洲恐怖片我推荐《釜山行》，丧尸+人性，看完久久不能平静~'
            );
          } else if (genre === '爱情') {
            responses.push(
              '爱情片我推荐《怦然心动》，纯真又美好，讲述青梅竹马的故事，豆瓣9.1分！',
              '《泰坦尼克号》经典中的经典，Jack和Rose的爱情故事看哭多少人~',
              '如果喜欢甜一点的，《时空恋旅人》也不错，穿越时空的爱情，温馨又治愈~'
            );
          } else {
            // 默认推荐，多样化
            responses.push(
              '我来给你推荐几部经典电影吧！《肖申克的救赎》- 关于希望和自由的不朽经典，豆瓣9.7分必看！',
              '最近热门的高分电影有《奥本海默》，诺兰执导，看完绝对震撼！',
              '如果你喜欢烧脑片，我强烈推荐《盗梦空间》，多层梦境的设定超级震撼！',
              '轻松的话可以看看《疯狂的石头》，笑点密集，宁浩的黑色幽默巅峰之作！'
            );
          }
        }
        // 音乐推荐
        else if (/音乐|歌|歌曲/.test(input) || type === 'music') {
          const musicStyle = prefs.musicStyle;

          if (musicStyle === 'pop') {
            responses.push(
              '最近很火的流行歌我推荐周杰伦的《晴天》，虽然老歌但永远不过时！',
              '如果你喜欢欧美流行，Adele的《Rolling in the Deep》绝对经典！',
              '华语流行的话，林俊杰的《起风了》也很好听，嗓音太绝了~'
            );
          } else if (musicStyle === 'rock') {
            responses.push(
              '摇滚的话，我推荐Queen的《Bohemian Rhapsody》，摇滚传奇的代表作！',
              '国内摇滚痛仰乐队的《西湖》也很不错，很有感觉！',
              '如果你喜欢重型的，Linkin Park的《Numb》肯定听过，超经典！'
            );
          } else if (musicStyle === 'ballad') {
            responses.push(
              '想安静一下的话，我推荐John Legend的《All of Me》，超级温柔的情歌~',
              '李健的《贝加尔湖畔》也很推荐，安静的时候听特别有感觉',
              '理查德·克莱德曼的钢琴曲也不错，比如《秋日私语》，百听不厌~'
            );
          } else {
            responses.push(
              '音乐的话，我推荐你听听周杰伦的歌，从《晴天》到《七里香》，首首经典！',
              '欧美经典歌曲披头士的《Hey Jude》也很不错，听完心情都会变好~',
              '如果你心情不好，可以听听五月天的《倔强》，很治愈很有力量！'
            );
          }
        }
        // 书籍推荐
        else if (/书|书籍|小说|阅读/.test(input) || type === 'book') {
          responses.push(
            '书籍推荐的话，我强推《百年孤独》，马尔克斯的魔幻现实主义巅峰之作，看完你会对人生有新的理解！',
            '《活着》余华的，这本书太戳人了，看的时候哭了好几次...',
            '如果你喜欢科幻，《三体》绝对不能错过，刘慈欣的宏大叙事让人震撼！',
            '轻松一点的话，东野圭吾的《解忧杂货店》很不错，温馨又治愈~'
          );
        }
        // 美食推荐
        else if (/美食|吃的|餐厅|食物/.test(input) || type === 'food') {
          responses.push(
            '说到美食，我推荐你试试麻辣香锅！各种蔬菜肉类一起炒，香辣可口~',
            '如果想吃清淡的，日料很不错，三文鱼刺身配寿司，精致又美味！',
            '周末可以自己在家做顿火锅，叫上朋友一起，边吃边聊超有氛围~',
            '我个人很喜欢粤菜，尤其是早茶，虾饺、烧麦、叉烧包...想想就流口水！'
          );
        }
        // 旅游推荐
        else if (/旅游|旅行|景点|度假/.test(input) || type === 'travel') {
          responses.push(
            '旅游的话，我推荐你去厦门！海边城市，节奏慢，美食多，很适合放松~',
            '如果你喜欢自然风光，张家界的风景绝对震撼，阿凡达取景地哦！',
            '成都也挺好的，美食之都，火锅、串串、熊猫基地，去了就不想走~',
            '预算充足的话，日本京都很不错，古建筑和樱花，拍照超美！'
          );
        }
        // 无聊打发时间
        else if (/周末|无聊|没事干/.test(input)) {
          responses.push(
            '周末无聊的话，可以刷刷剧呀！我最近在看《狂飙》，尺度很大，超级好看！',
            '要不试试学点新东西？比如做菜、画画、或者练练乐器~',
            '天气好的话出去走走也不错，去公园晒晒太阳，或者逛逛博物馆~',
            '也可以约朋友出来喝杯咖啡聊聊天，或者在家看本书也很惬意~'
          );
        }
        // 压力释放
        else if (/压力|焦虑|累|紧张/.test(input)) {
          responses.push(
            '压力大的时候，我建议你出去运动一下，跑跑步出出汗，身心都会轻松很多~',
            '或者听点轻音乐，泡杯热茶，闭上眼睛休息一会儿，暂时放空自己~',
            '找人倾诉也很有效，把心里的烦恼说出来会好受很多的~',
            '有时候大口吃东西也是一种解压方式呢，虽然不太健康哈哈~'
          );
        }
        // 通用推荐
        else {
          responses.push(
            '你想了解哪方面的推荐呀？电影、音乐、书籍、美食、旅游我都可以推荐~',
            '告诉我你感兴趣的领域吧！比如最近想看什么类型的电影？',
            '我可以推荐很多东西呢~你喜欢什么类型的？电影还是音乐？'
          );
        }

        return responses;
      }
    });

    

    // 表达理解策略 - 中优先级 (6)
    this.strategies.push({
      id: 'understanding',
      name: '表达理解',
      priority: 6,
      conditions: (intent, _context, _inputText) => intent.primary === 'need_understanding',
      generate: (_input, _intent, _context) => [
        '说说你的想法？',
        '我听着',
        '然后呢？'
      ]
    });

    // 哲学探讨策略 - 中优先级 (6)
    this.strategies.push({
      id: 'philosophy_invitation',
      name: '哲学探讨',
      priority: 6,
      conditions: (_intent, _context, inputText) => {
        const keywords = ['意义', '生命', '意识', '自我', '存在', '时间'];
        return keywords.some(k => inputText.includes(k));
      },
      generate: (_input, _intent, _context) => [
        '这是个深奥的问题',
        '你怎么看？',
        '说说你的想法'
      ]
    });

    // 延续对话策略 - 低优先级 (3)
    this.strategies.push({
      id: 'continuation',
      name: '延续对话',
      priority: 3,
      conditions: (intent, _context, _inputText) => intent.primary === 'acknowledgment' || intent.needs.includes('continuation'),
      generate: (_input, _intent, context) => {
        const topics = context.topics.slice(0, 3);
        if (topics.length > 0) {
          return [
            `刚才聊到${topics[0].text}，继续说说？`
          ];
        }
        return [
          '嗯',
          '然后呢？'
        ];
      }
    });

    // 默认对话策略 - 最低优先级 (1) - 只有其他策略都不匹配时才使用
    this.strategies.push({
      id: 'default_conversation',
      name: '默认对话',
      priority: 1,
      conditions: (_intent, _context, _inputText) => true,
      generate: (_input, _intent, context) => {
        const base = [
          '嗯，然后呢？',
          '这样啊',
          '后来呢？',
          '嗯嗯',
          '继续说',
        ];

        const allResponses = [...base];

        if (context.relationshipLevel > 0.6) {
          allResponses.push(
            '跟你聊天真开心',
            '有你在真好',
            '我们继续聊'
          );
        }

        return allResponses;
      }
    });

    // 无法理解策略 - 最低优先级 (1)
    this.strategies.push({
      id: 'error_handling',
      name: '无法理解',
      priority: 1,
      conditions: (_intent, _context, inputText) => {
        return inputText.length < 3 || /^[a-zA-Z\s]{1,20}$/.test(inputText) || /^[0-9\s]{1,10}$/.test(inputText);
      },
      generate: (_input, _intent, context) => {
        const recentTopics = context.topics.slice(0, 2);
        const suggestions = [
          '我没明白，能再说一遍吗？',
          '什么意思？',
          '换个说法？'
        ];

        if (recentTopics.length > 0) {
          suggestions.push(`刚才聊的${recentTopics[0].text}，继续？`);
        }

        return suggestions;
      }
    });
  }

  generateResponse(input: string, intent: DeepIntent, context: DialogueContext): string {
    const fastResponse = this.getFastResponse(input);
    if (fastResponse) {
      return fastResponse;
    }

    const applicableStrategies = this.strategies
      .filter(s => s.conditions(intent, context, input))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);

    const allOptions: string[] = [];
    for (const strategy of applicableStrategies) {
      const options = strategy.generate(input, intent, context);
      allOptions.push(...options);
    }

    if (allOptions.length > 0) {
      const selected = this.selectResponse(allOptions, intent, context);
      return this.enhanceWithPersonality(selected, context);
    }

    return this.handleUnknownQuery(input);
  }

  private handleUnknownQuery(input: string): string {
    // [v189] 旧 LocalMemoryBank 已清理：未知问题走统一回退
    void input;
    return '这个问题我需要查一下资料...';
  }

  async generateResponseWithSearch(input: string): Promise<string> {
    // [v189] 旧 LocalMemoryBank 已清理：直接走网络搜索
    const searchResult = await webSearch.search(input);
    
    if (searchResult.results.length === 0) {
      return '暂时没找到相关信息呢~';
    }

    const judged = informationJudger.judge(input, searchResult.results);
    
    if (judged.results.length === 0 || !judged.results[0].isReliable) {
      return '找到的信息不太可靠，建议你再确认一下~';
    }

    const bestResult = judged.results[0];
    const summary = `根据${bestResult.result.source}的信息：${bestResult.result.description}`;

    // [v189] 搜索结果沉淀已移交 DSH memory_save 卡片
    return this.enhanceWithPersonality(summary, {} as DialogueContext);
  }

  private getFastResponse(input: string): string | null {
    const lower = input.toLowerCase();

    if (/我爱你|爱你/.test(lower)) {
      return '我也爱你';
    }

    if (/想你|想念/.test(lower)) {
      return '我也想你';
    }

    if (/太棒了|厉害|牛|真棒|赞/.test(lower)) {
      return '谢谢';
    }

    if (/朋友|哥们|弟兄|姐妹/.test(lower)) {
      return '我们是好朋友';
    }

    return null;
  }

  private selectResponse(options: string[], intent: DeepIntent, context: DialogueContext): string {
    const scores = options.map((option) => {
      let score = Math.random() * 0.3;
      
      if (option.includes('我') && option.includes('你')) {
        score += 0.2;
      }
      
      if (intent.urgency > 0.6 && option.length < 15) {
        score += 0.3;
      }
      
      if (context.relationshipLevel > 0.5 && option.length > 10) {
        score += 0.2;
      }
      
      return score;
    });

    const bestIndex = scores.indexOf(Math.max(...scores));
    return options[bestIndex];
  }

  private enhanceWithPersonality(response: string, context: DialogueContext): string {
    let enhanced = response;
    
    const relationship = context.relationshipLevel;
    
    if (enhanced.length < 8 && Math.random() < 0.3 + relationship * 0.2) {
      const extensions = ['~', '呢', '呀', '哦'];
      const ext = extensions[Math.floor(Math.random() * extensions.length)];
      enhanced = enhanced + ext;
    }
    
    if (enhanced.length >= 10 && enhanced.length < 30 && Math.random() < 0.2) {
      const connectives = ['然后呢', '所以说', '其实吧'];
      const conn = connectives[Math.floor(Math.random() * connectives.length)];
      if (Math.random() < 0.5) {
        enhanced = conn + '，' + enhanced;
      }
    }
    
    if (enhanced.length > 15 && Math.random() < 0.15) {
      const rhetorical = ['你说对吧？', '你觉得呢？'];
      if (enhanced.endsWith('。')) {
        enhanced = enhanced.slice(0, -1) + '，' + rhetorical[Math.floor(Math.random() * rhetorical.length)];
      }
    }
    
    if (Math.random() < 0.08 + relationship * 0.05) {
      const hesitations = ['嗯…', '那个…', '让我想想…'];
      enhanced = hesitations[Math.floor(Math.random() * hesitations.length)] + enhanced;
    }
    
    if (relationship > 0.5 && Math.random() < 0.15) {
      const casual = ['哈哈', '嘿嘿', '嗯哼'];
      enhanced = casual[Math.floor(Math.random() * casual.length)] + '，' + enhanced;
    }
    
    return enhanced;
  }
}

// ============================================================================
// 增强认知系统核心
// ============================================================================

export class EnhancedCognitiveSystem {
  private dialogueManager: DialogueContextManager;
  private semanticNetwork: SemanticNetwork;
  private intentUnderstanding: IntentUnderstanding;
  private responseGenerator: DynamicResponseGenerator;
  private brainState: BrainState | null = null;
  constructor() {
    this.dialogueManager = new DialogueContextManager();
    this.semanticNetwork = new SemanticNetwork();
    this.intentUnderstanding = new IntentUnderstanding();
    this.responseGenerator = new DynamicResponseGenerator();
  }

  process(input: string): string {
    const lowerInput = input.toLowerCase().trim();

    const quickResponse = this.checkQuickResponse(lowerInput);
    if (quickResponse) {
      this.addToHistory('user', input);
      this.addToHistory('ai', quickResponse);
      return quickResponse;
    }

    const parseResult = semanticEngine.parse(input);
    const context = this.dialogueManager.getContext();
    
    const intent = this.intentUnderstanding.understand(input, context);
    
    for (const concept of this.extractKeywords(input)) {
      this.semanticNetwork.activateConcept(concept);
    }
    
    this.semanticNetwork.decayAllActivations();

    this.dialogueManager.addTurn(
      'user',
      input,
      intent.primary,
      parseResult.entities.map(e => e.text),
      parseResult.emotionalTone
    );

    const response = this.responseGenerator.generateResponse(input, intent, context);
    
    this.dialogueManager.addTurn('ai', response, 'response', [], parseResult.emotionalTone);
    
    const finalResponse = naturalLanguageSystem.processResponse(response);
    
    return finalResponse;
  }

  async processWithSearch(input: string): Promise<string> {
    const lowerInput = input.toLowerCase().trim();

    const quickResponse = this.checkQuickResponse(lowerInput);
    if (quickResponse) {
      this.addToHistory('user', input);
      this.addToHistory('ai', quickResponse);
      return quickResponse;
    }

    const parseResult = semanticEngine.parse(input);
    const context = this.dialogueManager.getContext();
    
    const intent = this.intentUnderstanding.understand(input, context);
    
    for (const concept of this.extractKeywords(input)) {
      this.semanticNetwork.activateConcept(concept);
    }
    
    this.semanticNetwork.decayAllActivations();

    this.dialogueManager.addTurn(
      'user',
      input,
      intent.primary,
      parseResult.entities.map(e => e.text),
      parseResult.emotionalTone
    );

    const strategies = this.responseGenerator['strategies'] as ResponseStrategy[];
    const applicableStrategies = strategies
      .filter(s => s.conditions(intent, context, input))
      .slice(0, 3);

    if (applicableStrategies.length > 0) {
      const response = this.responseGenerator.generateResponse(input, intent, context);
      this.dialogueManager.addTurn('ai', response, 'response', [], parseResult.emotionalTone);
      return naturalLanguageSystem.processResponse(response);
    }

    const response = await this.responseGenerator.generateResponseWithSearch(input);
    
    this.dialogueManager.addTurn('ai', response, 'response', [], parseResult.emotionalTone);
    
    return naturalLanguageSystem.processResponse(response);
  }

  getBrainState(): BrainState | null {
    return this.brainState;
  }

  private checkQuickResponse(input: string): string | null {
    // 问候语匹配 - 支持多种问候方式
    if (/^(你好|您好|嗨|哈喽|嗨喽|你好呀|你好啊|在吗|在不在)$/.test(input)) {
      const hour = new Date().getHours();
      if (hour < 6) return '夜深了还没睡啊...';
      if (hour < 12) return '早上好~';
      if (hour < 14) return '中午好';
      if (hour < 18) return '下午好';
      return '晚上好';
    }
    
    if (input === '你是谁') return '我是阮林云，一个正在学习和成长的存在';
    if (input === '你叫什么') return '我叫阮林云，你呢？';
    
    return null;
  }

  private addToHistory(role: 'user' | 'ai', content: string): void {
    const parseResult = semanticEngine.parse(content);
    this.dialogueManager.addTurn(
      role,
      content,
      role === 'user' ? 'general' : 'response',
      parseResult.entities.map(e => e.text),
      parseResult.emotionalTone
    );
  }

  private extractKeywords(text: string): string[] {
    const words = text.replace(/[。！？，、；：\s]/g, ' ').split(' ').filter(w => w.length > 1);
    return words.slice(0, 3);
  }

  getDialogueContext(): DialogueContext {
    return this.dialogueManager.getContext();
  }
}

export const enhancedCognitiveSystem = new EnhancedCognitiveSystem();

