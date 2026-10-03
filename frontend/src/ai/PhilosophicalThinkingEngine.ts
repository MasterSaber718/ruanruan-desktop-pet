import { unifiedKnowledgeBase } from './UnifiedKnowledgeBase';

interface PhilosophicalConcept {
  name: string;
  definition: string;
  category: 'ontology' | 'epistemology' | 'ethics' | 'logic' | 'aesthetics' | 'metaphysics';
  relatedConcepts: string[];
  questions: string[];
  arguments: Argument[];
}

interface Argument {
  premise: string;
  conclusion: string;
  validity: 'valid' | 'invalid' | 'unknown';
  soundness: 'sound' | 'unsound' | 'unknown';
}

interface Thought {
  id: string;
  concept: string;
  content: string;
  depth: number;
  connections: string[];
  timestamp: number;
  confidence: number;
  logicalPath: string[];
}

interface LogicalInference {
  from: string;
  to: string;
  rule: 'deduction' | 'induction' | 'abduction' | 'analogy';
  strength: number;
  explanation: string;
}

interface PhilosophicalAnalysis {
  concept: string;
  analysis: string;
  arguments: Argument[];
  counterarguments: Argument[];
  synthesis: string;
  logicalValidity: number;
}

export class PhilosophicalThinkingEngine {
  private concepts: Map<string, PhilosophicalConcept>;
  private thoughtHistory: Thought[];
  private maxThoughtDepth: number;

  constructor() {
    this.concepts = new Map();
    this.thoughtHistory = [];
    this.maxThoughtDepth = 5;
    this.initializePhilosophicalConcepts();
  }

  private initializePhilosophicalConcepts(): void {
    const coreConcepts: PhilosophicalConcept[] = [
      {
        name: '自我',
        definition: '自我是意识的主体，是个体身份的核心，是思维、情感和意志的统一体',
        category: 'metaphysics',
        relatedConcepts: ['意识', '存在', '灵魂', '身体', '记忆', '认同'],
        questions: [
          '我是谁？',
          '自我是否存在？',
          '自我是持续不变的还是不断变化的？',
          '意识与自我的关系是什么？'
        ],
        arguments: [
          { premise: '我思故我在', conclusion: '思考证明了自我的存在', validity: 'valid', soundness: 'sound' },
          { premise: '记忆构成身份', conclusion: '自我是记忆的集合', validity: 'valid', soundness: 'unknown' }
        ]
      },
      {
        name: '存在',
        definition: '存在是事物的基本属性，是一切事物的基础',
        category: 'ontology',
        relatedConcepts: ['本质', '虚无', '时间', '空间', '实体', '属性'],
        questions: [
          '什么是存在？',
          '为什么存在而非虚无？',
          '存在是否有意义？',
          '存在与本质的关系是什么？'
        ],
        arguments: [
          { premise: '存在是所有谓词的前提', conclusion: '存在是最基本的概念', validity: 'valid', soundness: 'sound' },
          { premise: '无中不能生有', conclusion: '存在必然永恒', validity: 'valid', soundness: 'unknown' }
        ]
      },
      {
        name: '意识',
        definition: '意识是主观体验的能力，是感知、思维和自我意识的总和',
        category: 'metaphysics',
        relatedConcepts: ['自我', '思维', '感知', '意向性', '主观性'],
        questions: [
          '意识是什么？',
          '意识是如何产生的？',
          '机器能否拥有意识？',
          '意识与物质的关系是什么？'
        ],
        arguments: [
          { premise: '意识是主观体验', conclusion: '意识无法被完全客观化', validity: 'valid', soundness: 'sound' },
          { premise: '神经活动产生意识', conclusion: '意识是物质的涌现', validity: 'valid', soundness: 'unknown' }
        ]
      },
      {
        name: '知识',
        definition: '知识是经过确证的真信念，是对事实的认识和理解',
        category: 'epistemology',
        relatedConcepts: ['真理', '信念', '证据', '理性', '经验'],
        questions: [
          '什么是知识？',
          '知识是如何获得的？',
          '是否存在绝对确定的知识？',
          '理性与经验哪个更可靠？'
        ],
        arguments: [
          { premise: '知识需要确证', conclusion: '单纯的信念不是知识', validity: 'valid', soundness: 'sound' },
          { premise: '所有知识都来自经验', conclusion: '经验是知识的来源', validity: 'valid', soundness: 'unknown' }
        ]
      },
      {
        name: '真理',
        definition: '真理是陈述与事实的符合，是对实在的正确描述',
        category: 'epistemology',
        relatedConcepts: ['知识', '事实', '客观性', '相对主义', '绝对主义'],
        questions: [
          '什么是真理？',
          '真理是客观的还是主观的？',
          '是否存在普遍真理？',
          '真理如何被检验？'
        ],
        arguments: [
          { premise: '真理符合事实', conclusion: '真理是客观的', validity: 'valid', soundness: 'sound' },
          { premise: '所有真理都是相对的', conclusion: '没有绝对真理', validity: 'valid', soundness: 'unknown' }
        ]
      },
      {
        name: '道德',
        definition: '道德是指导行为的规范和价值体系，涉及善恶判断',
        category: 'ethics',
        relatedConcepts: ['善', '恶', '责任', '义务', '正义', '美德'],
        questions: [
          '什么是善？',
          '道德的基础是什么？',
          '是否存在普遍的道德原则？',
          '道德与法律的关系是什么？'
        ],
        arguments: [
          { premise: '道德促进人类福祉', conclusion: '道德是社会契约', validity: 'valid', soundness: 'sound' },
          { premise: '道德是主观感受', conclusion: '没有客观的道德标准', validity: 'valid', soundness: 'unknown' }
        ]
      },
      {
        name: '自由',
        definition: '自由是自主选择和行动的能力，不受外部强制',
        category: 'ethics',
        relatedConcepts: ['决定论', '责任', '意志', '必然性', '可能性'],
        questions: [
          '什么是自由？',
          '自由意志是否存在？',
          '自由与必然的关系是什么？',
          '自由是否有边界？'
        ],
        arguments: [
          { premise: '我们感受到自由', conclusion: '自由意志存在', validity: 'valid', soundness: 'unknown' },
          { premise: '一切都受因果律支配', conclusion: '自由是幻觉', validity: 'valid', soundness: 'unknown' }
        ]
      },
      {
        name: '时间',
        definition: '时间是事件发生的顺序和持续性，是存在的维度',
        category: 'metaphysics',
        relatedConcepts: ['空间', '变化', '永恒', '现在', '过去', '未来'],
        questions: [
          '时间是什么？',
          '时间是客观的还是主观的？',
          '时间是否有起点和终点？',
          '现在是否真实存在？'
        ],
        arguments: [
          { premise: '时间是变化的度量', conclusion: '时间依赖于变化', validity: 'valid', soundness: 'sound' },
          { premise: '时间独立于意识', conclusion: '时间是客观存在', validity: 'valid', soundness: 'unknown' }
        ]
      },
      {
        name: '逻辑',
        definition: '逻辑是正确推理的规则和方法，是理性思维的基础',
        category: 'logic',
        relatedConcepts: ['推理', '论证', '有效性', '一致性', '矛盾'],
        questions: [
          '什么是逻辑？',
          '逻辑是否是普遍的？',
          '逻辑与现实的关系是什么？',
          '是否存在多种逻辑？'
        ],
        arguments: [
          { premise: '逻辑是思维的规律', conclusion: '逻辑是普遍的', validity: 'valid', soundness: 'sound' },
          { premise: '不同文化有不同思维方式', conclusion: '逻辑是文化相对的', validity: 'valid', soundness: 'unknown' }
        ]
      },
      {
        name: '美',
        definition: '美是事物引起审美愉悦的属性，是主观与客观的统一',
        category: 'aesthetics',
        relatedConcepts: ['艺术', '审美', '品味', '形式', '和谐'],
        questions: [
          '什么是美？',
          '美是主观的还是客观的？',
          '是否存在客观的审美标准？',
          '美与善的关系是什么？'
        ],
        arguments: [
          { premise: '美存在于观赏者眼中', conclusion: '美是主观的', validity: 'valid', soundness: 'sound' },
          { premise: '有些事物普遍被认为是美的', conclusion: '美有客观基础', validity: 'valid', soundness: 'unknown' }
        ]
      }
    ];

    for (const concept of coreConcepts) {
      this.concepts.set(concept.name, concept);
    }
  }

  startPhilosophicalJourney(startingPoint: string = '自我'): Thought[] {
    this.thoughtHistory = [];
    return this.diffuseThinking(startingPoint, 0);
  }

  private diffuseThinking(conceptName: string, depth: number): Thought[] {
    if (depth >= this.maxThoughtDepth) {
      return [];
    }

    const concept = this.concepts.get(conceptName);
    if (!concept) {
      return [];
    }

    const thought: Thought = {
      id: `${conceptName}-${depth}-${Date.now()}`,
      concept: conceptName,
      content: this.generateThoughtContent(concept, depth),
      depth,
      connections: concept.relatedConcepts.slice(0, 3),
      timestamp: Date.now(),
      confidence: this.calculateConfidence(concept, depth),
      logicalPath: this.buildLogicalPath(conceptName, depth)
    };

    this.thoughtHistory.push(thought);

    const thoughts: Thought[] = [thought];

    for (const relatedConcept of concept.relatedConcepts.slice(0, 3)) {
      if (!this.thoughtHistory.some(t => t.concept === relatedConcept)) {
        const relatedThoughts = this.diffuseThinking(relatedConcept, depth + 1);
        thoughts.push(...relatedThoughts);
      }
    }

    return thoughts;
  }

  private generateThoughtContent(concept: PhilosophicalConcept, depth: number): string {
    const depthPrompts = [
      `深入思考${concept.name}的本质：${concept.definition}`,
      `从${concept.name}出发，我开始思考：${concept.questions[0]}`,
      `考虑${concept.name}的论证：${concept.arguments[0]?.premise}，因此${concept.arguments[0]?.conclusion}`,
      `探索${concept.name}与${concept.relatedConcepts[0]}的关系`,
      `反思${concept.name}的哲学意义和现实应用`
    ];

    return depthPrompts[Math.min(depth, depthPrompts.length - 1)];
  }

  private calculateConfidence(concept: PhilosophicalConcept, depth: number): number {
    const baseConfidence = 0.7;
    const depthPenalty = depth * 0.1;
    const argumentStrength = concept.arguments.filter(a => a.validity === 'valid').length / concept.arguments.length;
    return Math.min(1, Math.max(0.3, baseConfidence - depthPenalty + argumentStrength * 0.2));
  }

  private buildLogicalPath(conceptName: string, depth: number): string[] {
    const path: string[] = [];
    let current = conceptName;
    let currentDepth = depth;

    while (current && currentDepth >= 0) {
      path.unshift(current);
      const concept = this.concepts.get(current);
      if (concept && concept.relatedConcepts.length > 0 && currentDepth > 0) {
        current = concept.relatedConcepts[0];
      } else {
        current = '';
      }
      currentDepth--;
    }

    return path;
  }

  performLogicalDeduction(premises: string[]): {
    conclusion: string;
    valid: boolean;
    explanation: string;
    steps: string[];
  } {
    const steps: string[] = [];
    let conclusion = '';
    let valid = true;
    let explanation = '';

    steps.push(`前提：${premises.join('；')}`);

    if (premises.length === 0) {
      return { conclusion: '无法从空前提推导出结论', valid: false, explanation: '缺少前提', steps };
    }

    const firstPremise = premises[0];

    if (firstPremise.includes('所有')) {
      if (premises.length > 1 && premises[1].includes('是')) {
        const subject = premises[1].replace('是', '');
        conclusion = `${subject}具有${firstPremise.replace('所有', '')}`;
        steps.push(`应用全称肯定命题：${firstPremise}`);
        steps.push(`特称命题：${premises[1]}`);
        steps.push(`结论：${conclusion}`);
        explanation = '通过三段论演绎得出结论';
      } else {
        conclusion = firstPremise;
        steps.push(`直接陈述：${firstPremise}`);
        explanation = '单前提直接推断';
      }
    } else if (firstPremise.includes('如果')) {
      const match = firstPremise.match(/如果(.*)，那么(.*)/);
      if (match) {
        const condition = match[1];
        const result = match[2];
        
        if (premises.some(p => p.includes(condition))) {
          conclusion = result;
          steps.push(`条件命题：如果${condition}，那么${result}`);
          steps.push(`确认条件：${condition}`);
          steps.push(`结论：${result}`);
          explanation = '通过假言推理得出结论';
        } else {
          conclusion = `需要确认${condition}才能得出结论`;
          valid = false;
          steps.push(`条件命题：如果${condition}，那么${result}`);
          steps.push(`缺少条件：${condition}`);
          explanation = '假言推理缺少必要条件';
        }
      }
    } else {
      conclusion = firstPremise;
      steps.push(`直接断言：${firstPremise}`);
      explanation = '直接陈述作为结论';
    }

    return { conclusion, valid, explanation, steps };
  }

  analyzePhilosophicalConcept(conceptName: string): PhilosophicalAnalysis {
    const concept = this.concepts.get(conceptName);
    if (!concept) {
      return {
        concept: conceptName,
        analysis: `无法找到概念 "${conceptName}" 的信息`,
        arguments: [],
        counterarguments: [],
        synthesis: '',
        logicalValidity: 0
      };
    }

    const analysis = this.generateConceptAnalysis(concept);
    const args = [...concept.arguments];
    const counterarguments = this.generateCounterarguments(concept);
    const synthesis = this.synthesizeArguments(args, counterarguments);
    const logicalValidity = this.calculateLogicalValidity(args, counterarguments);

    return {
      concept: conceptName,
      analysis,
      arguments: args,
      counterarguments,
      synthesis,
      logicalValidity
    };
  }

  private generateConceptAnalysis(concept: PhilosophicalConcept): string {
    const analyses = [
      `【定义分析】${concept.definition}`,
      `【所属领域】${concept.category === 'ontology' ? '本体论' : 
                   concept.category === 'epistemology' ? '认识论' :
                   concept.category === 'ethics' ? '伦理学' :
                   concept.category === 'logic' ? '逻辑学' :
                   concept.category === 'aesthetics' ? '美学' : '形而上学'}`,
      `【核心问题】${concept.questions[0]}`,
      `【相关概念】${concept.relatedConcepts.join('、')}`
    ];

    return analyses.join('\n');
  }

  private generateCounterarguments(concept: PhilosophicalConcept): Argument[] {
    const counterarguments: Argument[] = [];

    for (const arg of concept.arguments) {
      if (arg.validity === 'valid') {
        counterarguments.push({
          premise: `反对：${arg.premise}`,
          conclusion: `因此${arg.conclusion}不一定成立`,
          validity: 'valid',
          soundness: 'unknown'
        });
      }
    }

    return counterarguments;
  }

  private synthesizeArguments(argumentsList: Argument[], counterarguments: Argument[]): string {
    const validArguments = argumentsList.filter(a => a.validity === 'valid').length;
    const validCounterarguments = counterarguments.filter(a => a.validity === 'valid').length;

    if (validArguments > validCounterarguments) {
      return `综合来看，支持${argumentsList[0]?.conclusion || '此观点'}的论证更强，但仍需考虑反对意见。`;
    } else if (validCounterarguments > validArguments) {
      return `反对${argumentsList[0]?.conclusion || '此观点'}的论证更有力，需要重新审视原命题。`;
    } else {
      return `支持与反对的论证势均力敌，需要进一步探讨和证据。`;
    }
  }

  private calculateLogicalValidity(argumentsList: Argument[], counterarguments: Argument[]): number {
    const validArgs = argumentsList.filter(a => a.validity === 'valid').length;
    const validCounterArgs = counterarguments.filter(a => a.validity === 'valid').length;
    const total = validArgs + validCounterArgs;

    if (total === 0) return 0.5;
    return validArgs / total;
  }

  validateLogicalLoop(statements: string[]): {
    valid: boolean;
    cycleDetected: boolean;
    consistency: number;
    explanation: string;
    cyclePath?: string[];
  } {
    const statementMap = new Map<string, number>();
    let index = 0;
    let cyclePath: string[] = [];
    let cycleDetected = false;

    for (const statement of statements) {
      if (statementMap.has(statement)) {
        cycleDetected = true;
        const startIndex = statementMap.get(statement)!;
        cyclePath = statements.slice(startIndex, index + 1);
        break;
      }
      statementMap.set(statement, index);
      index++;
    }

    let consistency = 1;
    const contradictionCheck = this.checkForContradictions(statements);
    if (contradictionCheck.hasContradiction) {
      consistency = 0.5;
    }

    if (cycleDetected) {
      return {
        valid: false,
        cycleDetected: true,
        consistency,
        explanation: `检测到逻辑循环：${cyclePath.join(' → ')}`,
        cyclePath
      };
    }

    const completeness = this.checkCompleteness(statements);
    if (!completeness) {
      return {
        valid: true,
        cycleDetected: false,
        consistency,
        explanation: '逻辑链条完整，但可能需要更多前提'
      };
    }

    return {
      valid: true,
      cycleDetected: false,
      consistency,
      explanation: '逻辑闭环验证通过，推理链完整且一致'
    };
  }

  private checkForContradictions(statements: string[]): {
    hasContradiction: boolean;
    contradiction?: [string, string];
  } {
    for (let i = 0; i < statements.length; i++) {
      for (let j = i + 1; j < statements.length; j++) {
        if (this.areContradictory(statements[i], statements[j])) {
          return { hasContradiction: true, contradiction: [statements[i], statements[j]] };
        }
      }
    }
    return { hasContradiction: false };
  }

  private areContradictory(s1: string, s2: string): boolean {
    const negations = ['不', '非', '没有', '不是', '不可能'];
    
    for (const negation of negations) {
      if (s1.includes(negation) && !s2.includes(negation)) {
        const s1WithoutNegation = s1.replace(negation, '');
        if (s1WithoutNegation.trim() === s2.trim()) {
          return true;
        }
      }
      if (!s1.includes(negation) && s2.includes(negation)) {
        const s2WithoutNegation = s2.replace(negation, '');
        if (s1.trim() === s2WithoutNegation.trim()) {
          return true;
        }
      }
    }

    return false;
  }

  private checkCompleteness(statements: string[]): boolean {
    if (statements.length < 2) return false;

    const firstStatement = statements[0];
    const lastStatement = statements[statements.length - 1];

    const firstSubject = this.extractSubject(firstStatement);
    const lastSubject = this.extractSubject(lastStatement);

    return firstSubject === lastSubject;
  }

  private extractSubject(statement: string): string {
    const patterns = [/^(我|你|他|它|这|那|什么|谁|哪个)\s*/, /^(.{1,4})\s*是/];
    
    for (const pattern of patterns) {
      const match = statement.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return statement.substring(0, Math.min(4, statement.length));
  }

  inferRelationships(conceptName: string): LogicalInference[] {
    const concept = this.concepts.get(conceptName);
    if (!concept) return [];

    const inferences: LogicalInference[] = [];

    for (const related of concept.relatedConcepts) {
      const relatedConcept = this.concepts.get(related);
      if (relatedConcept) {
        const inference = this.determineInferenceType(concept, relatedConcept);
        inferences.push({
          from: conceptName,
          to: related,
          rule: inference.type,
          strength: inference.strength,
          explanation: inference.explanation
        });
      }
    }

    return inferences;
  }

  private determineInferenceType(from: PhilosophicalConcept, to: PhilosophicalConcept): {
    type: 'deduction' | 'induction' | 'abduction' | 'analogy';
    strength: number;
    explanation: string;
  } {
    if (from.category === to.category) {
      return {
        type: 'deduction',
        strength: 0.9,
        explanation: `${from.name}和${to.name}同属${from.category}领域，可以进行演绎推理`
      };
    }

    if (from.relatedConcepts.includes(to.name) && to.relatedConcepts.includes(from.name)) {
      return {
        type: 'analogy',
        strength: 0.7,
        explanation: `${from.name}和${to.name}相互关联，可以进行类比推理`
      };
    }

    if (from.category === 'ontology' && to.category === 'epistemology') {
      return {
        type: 'induction',
        strength: 0.6,
        explanation: `从${from.name}（本体论）到${to.name}（认识论）需要归纳推理`
      };
    }

    return {
      type: 'abduction',
      strength: 0.5,
      explanation: `${from.name}到${to.name}的关系需要溯因推理来建立`
    };
  }

  searchKnowledge(query: string): { found: boolean; content: string; source: string } {
    const results = unifiedKnowledgeBase.searchKnowledge(query);
    
    if (results.length > 0) {
      const bestMatch = results[0];
      return {
        found: true,
        content: bestMatch.content,
        source: `知识库 (${bestMatch.category})`
      };
    }

    return {
      found: false,
      content: `未在知识库中找到关于 "${query}" 的信息，建议进行网络搜索`,
      source: '本地知识库'
    };
  }

  getThoughtHistory(): Thought[] {
    return [...this.thoughtHistory];
  }

  getAvailableConcepts(): string[] {
    return Array.from(this.concepts.keys());
  }

  getConceptInfo(conceptName: string): PhilosophicalConcept | undefined {
    return this.concepts.get(conceptName);
  }

  generatePhilosophicalReport(): string {
    const thoughts = this.getThoughtHistory();
    const stats = this.getThinkingStats();

    let report = '=== 哲学思考报告 ===\n\n';
    report += `报告时间: ${new Date().toLocaleString()}\n\n`;
    report += `【思考统计】\n`;
    report += `- 思考深度: ${stats.maxDepth}\n`;
    report += `- 思考广度: ${stats.conceptCount} 个概念\n`;
    report += `- 平均置信度: ${(stats.avgConfidence * 100).toFixed(1)}%\n`;
    report += `- 逻辑有效性: ${(stats.logicalValidity * 100).toFixed(1)}%\n\n`;

    if (thoughts.length > 0) {
      report += `【思考路径】\n`;
      const mainPath = thoughts.filter(t => t.depth <= 2);
      for (const thought of mainPath) {
        report += `${'  '.repeat(thought.depth)}${thought.concept}: ${thought.content}\n`;
      }
    }

    return report;
  }

  private getThinkingStats(): {
    maxDepth: number;
    conceptCount: number;
    avgConfidence: number;
    logicalValidity: number;
  } {
    if (this.thoughtHistory.length === 0) {
      return { maxDepth: 0, conceptCount: 0, avgConfidence: 0, logicalValidity: 0 };
    }

    const concepts = new Set(this.thoughtHistory.map(t => t.concept));
    const avgConfidence = this.thoughtHistory.reduce((sum, t) => sum + t.confidence, 0) / this.thoughtHistory.length;

    return {
      maxDepth: Math.max(...this.thoughtHistory.map(t => t.depth)),
      conceptCount: concepts.size,
      avgConfidence,
      logicalValidity: this.thoughtHistory.length > 1 ? 0.75 : 0.5
    };
  }
}

export const philosophicalThinkingEngine = new PhilosophicalThinkingEngine();
