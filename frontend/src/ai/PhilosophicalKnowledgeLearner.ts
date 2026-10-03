import { webSearchService } from './WebSearchService';
import { knowledgeGraph } from './KnowledgeGraph';
import { unifiedKnowledgeBase } from './UnifiedKnowledgeBase';

export interface LearningProgress {
  totalLearned: number;
  lastUpdated: Date;
  categories: string[];
}

export class PhilosophicalKnowledgeLearner {
  private learningProgress: LearningProgress;
  private isLearning: boolean;
  private learningQueue: string[];

  constructor() {
    this.learningProgress = {
      totalLearned: 0,
      lastUpdated: new Date(),
      categories: []
    };
    this.isLearning = false;
    this.learningQueue = [
      '形而上学', '认识论', '伦理学', '逻辑学',
      '存在主义', '实用主义', '分析哲学',
      '自由意志', '决定论', '道德相对主义',
      '真理符合论', '知识的定义',
      '心物问题', '自我意识', '时间哲学',
      '正义理论', '功利主义', '义务论',
      '怀疑论', '实证主义', '现象学'
    ];
    this.initializeBaseKnowledge();
  }

  private initializeBaseKnowledge() {
    const baseConcepts = [
      { name: '自我', category: '形而上学', description: '个体对自身存在、身份和意识的认知' },
      { name: '意识', category: '心灵哲学', description: '主观体验、觉知和思想的主体' },
      { name: '存在', category: '形而上学', description: '事物的真实存在状态' },
      { name: '真理', category: '认识论', description: '符合事实或客观现实的陈述' },
      { name: '知识', category: '认识论', description: '被确证的真实信念' },
      { name: '自由', category: '伦理学', description: '自主选择和行动的能力' },
      { name: '道德', category: '伦理学', description: '区分善恶对错的原则' },
      { name: '时间', category: '形而上学', description: '事件先后顺序的度量' },
      { name: '逻辑', category: '逻辑学', description: '有效推理和论证的规范' },
      { name: '意义', category: '语言哲学', description: '词语和思想的含义' }
    ];

    let prevNode: any = null;
    baseConcepts.forEach(concept => {
      const node = knowledgeGraph.addNode(concept.name, concept.category, concept.description);
      unifiedKnowledgeBase.addKnowledgeItem({
        title: concept.name,
        content: concept.description,
        category: concept.category,
        keywords: [concept.name, '哲学'],
        confidence: 0.9
      });
      if (prevNode) {
        knowledgeGraph.addRelationship(prevNode.id, node.id, '相关', 0.6, '哲学概念关联');
      }
      prevNode = node;
    });

    this.learningProgress.totalLearned += baseConcepts.length;
    this.learningProgress.categories = ['形而上学', '认识论', '伦理学', '逻辑学', '心灵哲学', '语言哲学'];

  }

  async startLearning(onProgress?: (progress: LearningProgress) => void): Promise<void> {
    if (this.isLearning) {
      return;
    }

    this.isLearning = true;

    for (let i = 0; i < this.learningQueue.length && this.isLearning; i++) {
      const topic = this.learningQueue[i];
      
      try {
        await this.learnTopic(topic);
        this.learningProgress.totalLearned++;
        this.learningProgress.lastUpdated = new Date();
        
        if (onProgress) {
          onProgress(this.learningProgress);
        }
        
        await this.delay(1500);
      } catch (error) {
        console.error(`[PhilosophicalKnowledgeLearner] 学习 ${topic} 时出错:`, error);
      }
    }

    this.isLearning = false;
    console.log('[PhilosophicalKnowledgeLearner] 学习完成');
  }

  stopLearning(): void {
    this.isLearning = false;
  }

  private async learnTopic(topic: string): Promise<void> {
    const searchResults = await webSearchService.searchWithSummary(topic);
    
    if (searchResults.results.length === 0) {
      return;
    }

    const summary = searchResults.summary;
    const cleanSummary = summary.replace(/关于「.*」的搜索结果摘要：\n\n/, '').replace(/根据搜索结果，/, '').replace(/如需更详细的信息.*$/, '');
    
    const node = knowledgeGraph.addNode(
      topic,
      this.determineCategory(topic),
      cleanSummary
    );

    unifiedKnowledgeBase.addKnowledgeItem({
      title: topic,
      content: summary,
      category: this.determineCategory(topic),
      keywords: [topic, '哲学'],
      confidence: 0.85
    });

    const existingNodes = knowledgeGraph.searchNodes('自我');
    if (existingNodes.length > 0) {
      knowledgeGraph.addRelationship(existingNodes[0].id, node.id, '相关', 0.5, '哲学相关概念');
    }
  }

  private determineCategory(topic: string): string {
    const categoryKeywords: Record<string, string[]> = {
      '形而上学': ['存在', '时间', '空间', '因果', '本质', '实体', '虚无'],
      '认识论': ['知识', '真理', '信念', '确证', '怀疑', '感知', '经验'],
      '伦理学': ['道德', '善', '恶', '正义', '责任', '自由', '价值'],
      '逻辑学': ['逻辑', '推理', '论证', '矛盾', '有效', '真'],
      '心灵哲学': ['意识', '心灵', '自我', '感知', '思想']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => topic.includes(keyword))) {
        return category;
      }
    }

    return '哲学';
  }

  getLearningProgress(): LearningProgress {
    return { ...this.learningProgress };
  }

  isCurrentlyLearning(): boolean {
    return this.isLearning;
  }

  addTopicToQueue(topic: string): void {
    if (!this.learningQueue.includes(topic)) {
      this.learningQueue.push(topic);
      console.log(`[PhilosophicalKnowledgeLearner] 已添加学习主题: ${topic}`);
    }
  }

  getLearningQueue(): string[] {
    return [...this.learningQueue];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const philosophicalKnowledgeLearner = new PhilosophicalKnowledgeLearner();
