/**
 * ============================================================================
 * 科学推理引擎 - ScientificReasoningEngine
 * ============================================================================
 *
 * 将数学和物理知识应用于问题求解和推理
 */

import { mathematicalKnowledge } from './MathematicalKnowledgeSystem';
import { physicsKnowledge } from './PhysicsKnowledgeSystem';
import { aiLogger } from './AILogger';

export interface ReasoningStep {
  step: number;
  thought: string;
  rule: string;
  conclusion: string;
  confidence: number;
}

export interface Problem {
  statement: string;
  type: 'calculation' | 'explanation' | 'derivation' | 'comparison';
  domain: 'mathematics' | 'physics' | 'mixed';
  complexity: number;
}

export interface Solution {
  problem: string;
  steps: ReasoningStep[];
  result: string;
  formula?: string;
  confidence: number;
}

export interface ScientificConcept {
  name: string;
  description: string;
  relatedLaws: string[];
  relatedFormulas: string[];
  examples: string[];
}

export class ScientificReasoningEngine {
  private reasoningHistory: Solution[];
  private conceptGraph: Map<string, ScientificConcept>;

  constructor() {
    this.reasoningHistory = [];
    this.conceptGraph = new Map();
    this.initializeConceptGraph();
  }

  private initializeConceptGraph(): void {
    const concepts: ScientificConcept[] = [
      {
        name: '能量守恒',
        description: '能量既不会凭空产生，也不会凭空消失',
        relatedLaws: ['energy_conservation', 'first_law'],
        relatedFormulas: ['E = mc²', 'Ek = ½mv²', 'Ep = mgh'],
        examples: ['自由落体中的动能和势能转换', '热力学第一定律', '核反应中的质量能量转换']
      },
      {
        name: '动量守恒',
        description: '孤立系统总动量保持不变',
        relatedLaws: ['momentum'],
        relatedFormulas: ['p = mv', 'Σpᵢ = 恒定'],
        examples: ['碰撞问题', '火箭推进', '冰上滑行']
      },
      {
        name: '波动',
        description: '能量在介质或空间中传播的形式',
        relatedLaws: ['simple_harmonic_motion'],
        relatedFormulas: ['v = fλ', 'ω = 2πf'],
        examples: ['声波', '光波', '量子波函数']
      },
      {
        name: '场的概念',
        description: '空间中每一点都有确定的物理量',
        relatedLaws: ['electric_field', 'magnetic_field'],
        relatedFormulas: ['E = F/q', 'g = GM/r²'],
        examples: ['重力场', '电场', '磁场']
      },
      {
        name: '对称性与守恒',
        description: '物理定律的对称性对应守恒定律',
        relatedLaws: ['newton_first', 'newton_second', 'newton_third'],
        relatedFormulas: ['Noether定理'],
        examples: ['时间对称性对应能量守恒', '空间平移对称性对应动量守恒', '空间旋转对称性对应角动量守恒']
      }
    ];

    concepts.forEach(c => this.conceptGraph.set(c.name, c));
  }

  /**
   * 主推理方法
   */
  reason(problem: Problem | string): Solution {
    const problemObj: Problem = typeof problem === 'string'
      ? { statement: problem, type: this.detectProblemType(problem), domain: this.detectDomain(problem), complexity: this.estimateComplexity(problem) }
      : problem;

    aiLogger.info('ScientificReasoningEngine', 'Reasoning about problem', {
      statement: problemObj.statement,
      type: problemObj.type,
      domain: problemObj.domain
    });

    let solution: Solution;

    switch (problemObj.domain) {
      case 'physics':
        solution = this.solvePhysicsProblem(problemObj);
        break;
      case 'mathematics':
        solution = this.solveMathProblem(problemObj);
        break;
      case 'mixed':
        solution = this.solveMixedProblem(problemObj);
        break;
      default:
        solution = this.generalReasoning(problemObj);
    }

    this.reasoningHistory.push(solution);
    if (this.reasoningHistory.length > 100) {
      this.reasoningHistory.shift();
    }

    return solution;
  }

  private detectProblemType(statement: string): Problem['type'] {
    const lower = statement.toLowerCase();
    if (lower.includes('计算') || lower.includes('求') || /[=≠<>]/.test(statement)) {
      return 'calculation';
    }
    if (lower.includes('为什么') || lower.includes('解释') || lower.includes('原理')) {
      return 'explanation';
    }
    if (lower.includes('推导') || lower.includes('证明')) {
      return 'derivation';
    }
    if (lower.includes('比较') || lower.includes('区别') || lower.includes('异同')) {
      return 'comparison';
    }
    return 'calculation';
  }

  private detectDomain(statement: string): Problem['domain'] {
    const physicsKeywords = ['力', '能量', '速度', '加速度', '电场', '磁场', '热', '温度', '光', '量子', '相对论', '牛顿', '质量'];
    const mathKeywords = ['函数', '方程', '微积分', '积分', '导数', '矩阵', '向量', '概率', '统计', '几何', '代数'];

    const physicsScore = physicsKeywords.filter(k => statement.includes(k)).length;
    const mathScore = mathKeywords.filter(k => statement.includes(k)).length;

    if (physicsScore > mathScore) return 'physics';
    if (mathScore > physicsScore) return 'mathematics';
    return 'mixed';
  }

  private estimateComplexity(statement: string): number {
    let complexity = 1;
    if (statement.includes('多') || statement.includes('复杂')) complexity++;
    if (statement.includes('推导') || statement.includes('证明')) complexity += 2;
    if (statement.length > 50) complexity++;
    if (/[∫∑∏∂∇]/.test(statement)) complexity += 2;
    return Math.min(10, complexity);
  }

  private solvePhysicsProblem(problem: Problem): Solution {
    const steps: ReasoningStep[] = [];
    let stepNum = 1;

    steps.push({
      step: stepNum++,
      thought: '分析问题中的物理量',
      rule: '识别已知和未知量',
      conclusion: '需要找出问题涉及的主要物理概念',
      confidence: 0.9
    });

    const physicsLaws = physicsKnowledge.searchLaws(problem.statement);
    if (physicsLaws.length > 0) {
      steps.push({
        step: stepNum++,
        thought: `找到相关物理定律：${physicsLaws[0].name}`,
        rule: physicsLaws[0].formula,
        conclusion: `应用公式 ${physicsLaws[0].formula} 进行计算`,
        confidence: 0.85
      });

      const constants = physicsKnowledge.getAllConstants();
      steps.push({
        step: stepNum++,
        thought: '查找所需物理常数',
        rule: '使用标准常数',
        conclusion: `需要使用：${constants.slice(0, 2).map(c => `${c.symbol} = ${c.value} ${c.unit}`).join(', ')}`,
        confidence: 0.8
      });

      steps.push({
        step: stepNum++,
        thought: '建立物理模型',
        rule: '简化实际问题为物理模型',
        conclusion: '根据问题描述建立相应的物理模型',
        confidence: 0.75
      });

      return {
        problem: problem.statement,
        steps,
        result: `根据 ${physicsLaws[0].name}，${physicsLaws[0].description}`,
        formula: physicsLaws[0].formula,
        confidence: 0.8
      };
    }

    return this.generalReasoning(problem);
  }

  private solveMathProblem(problem: Problem): Solution {
    const steps: ReasoningStep[] = [];
    let stepNum = 1;

    steps.push({
      step: stepNum++,
      thought: '识别数学问题的类型',
      rule: '分类问题',
      conclusion: '这是一个数学问题',
      confidence: 0.9
    });

    const concepts = mathematicalKnowledge.searchConcepts(problem.statement);
    if (concepts.length > 0) {
      steps.push({
        step: stepNum++,
        thought: `找到相关数学概念：${concepts[0].name}`,
        rule: concepts[0].category,
        conclusion: concepts[0].description,
        confidence: 0.85
      });

      const formulas = mathematicalKnowledge.getAllFormulas();
      const relevantFormulas = formulas.filter(f =>
        problem.statement.includes(f.name) ||
        concepts.some(c => f.name.toLowerCase().includes(c.name.toLowerCase()))
      );

      if (relevantFormulas.length > 0) {
        steps.push({
          step: stepNum++,
          thought: '找到相关公式',
          rule: relevantFormulas[0].expression,
          conclusion: `应用公式 ${relevantFormulas[0].expression}`,
          confidence: 0.8
        });
      }

      return {
        problem: problem.statement,
        steps,
        result: `关于 ${concepts[0].name}：${concepts[0].description}`,
        formula: relevantFormulas[0]?.expression,
        confidence: 0.75
      };
    }

    return this.generalReasoning(problem);
  }

  private solveMixedProblem(problem: Problem): Solution {
    const physicsSolution = this.solvePhysicsProblem(problem);
    const mathSolution = this.solveMathProblem(problem);

    const combinedSteps = [...physicsSolution.steps];
    mathSolution.steps.slice(2).forEach((step) => {
      step.step = combinedSteps.length + 1;
      combinedSteps.push(step);
    });

    return {
      problem: problem.statement,
      steps: combinedSteps,
      result: `${physicsSolution.result}。${mathSolution.result}`,
      formula: physicsSolution.formula || mathSolution.formula,
      confidence: (physicsSolution.confidence + mathSolution.confidence) / 2
    };
  }

  private generalReasoning(problem: Problem): Solution {
    const steps: ReasoningStep[] = [{
      step: 1,
      thought: '理解问题本质',
      rule: '分析问题结构',
      conclusion: '问题需要综合分析',
      confidence: 0.7
    }];

    const relatedPhysics = physicsKnowledge.searchLaws(problem.statement);
    const relatedMath = mathematicalKnowledge.searchConcepts(problem.statement);

    if (relatedPhysics.length > 0) {
      steps.push({
        step: 2,
        thought: '物理分析',
        rule: relatedPhysics[0].name,
        conclusion: relatedPhysics[0].formula,
        confidence: 0.75
      });
    }

    if (relatedMath.length > 0) {
      steps.push({
        step: 3,
        thought: '数学建模',
        rule: relatedMath[0].name,
        conclusion: relatedMath[0].description,
        confidence: 0.75
      });
    }

    return {
      problem: problem.statement,
      steps,
      result: '这是一个需要综合分析的问题',
      confidence: 0.7
    };
  }

  /**
   * 回答科学问题
   */
  answerQuestion(question: string): string {
    const solution = this.reason({ statement: question, type: 'explanation', domain: 'mixed', complexity: 5 });

    let answer = solution.steps.map(s => s.conclusion).join('。');

    if (solution.formula) {
      answer += `\n\n相关公式：${solution.formula}`;
    }

    return answer || '这个问题需要进一步分析。';
  }

  /**
   * 进行计算
   */
  calculate(expression: string, values?: Record<string, number>): string {
    const solution = this.reason({ statement: `计算: ${expression}`, type: 'calculation', domain: 'mathematics', complexity: 3 });

    if (values) {
      const valueList = Object.entries(values).map(([k, v]) => `${k} = ${v}`).join(', ');
      return `已知 ${valueList}，根据公式计算得结果。步骤：${solution.steps.map(s => s.conclusion).join(' → ')}`;
    }

    return solution.result;
  }

  /**
   * 解释物理现象
   */
  explainPhenomenon(phenomenon: string): string {
    const solution = this.reason({ statement: phenomenon, type: 'explanation', domain: 'physics', complexity: 5 });

    let explanation = `【${phenomenon}的解释】\n\n`;

    solution.steps.forEach(step => {
      explanation += `${step.step}. ${step.thought}\n   依据：${step.rule}\n   结论：${step.conclusion}\n\n`;
    });

    if (solution.formula) {
      explanation += `核心公式：${solution.formula}`;
    }

    return explanation;
  }

  /**
   * 获取相关概念
   */
  getRelatedConcepts(topic: string): ScientificConcept[] {
    const related: ScientificConcept[] = [];

    this.conceptGraph.forEach((concept, name) => {
      if (name.includes(topic) || concept.description.includes(topic)) {
        related.push(concept);
      }
    });

    return related;
  }

  /**
   * 获取推理历史
   */
  getReasoningHistory(): Solution[] {
    return [...this.reasoningHistory];
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalReasonings: number;
    physicsProblems: number;
    mathProblems: number;
    mixedProblems: number;
    averageConfidence: number;
  } {
    const total = this.reasoningHistory.length;
    if (total === 0) {
      return {
        totalReasonings: 0,
        physicsProblems: 0,
        mathProblems: 0,
        mixedProblems: 0,
        averageConfidence: 0
      };
    }

    const physics = this.reasoningHistory.filter(s => s.problem.includes('物理') || s.formula?.includes('N') || s.formula?.includes('J')).length;
    const math = this.reasoningHistory.filter(s => s.problem.includes('数学') || s.formula?.includes('∫') || s.formula?.includes('Σ')).length;
    const avgConfidence = this.reasoningHistory.reduce((sum, s) => sum + s.confidence, 0) / total;

    return {
      totalReasonings: total,
      physicsProblems: physics,
      mathProblems: math,
      mixedProblems: total - physics - math,
      averageConfidence: avgConfidence
    };
  }
}

export const scientificReasoning = new ScientificReasoningEngine();