/**
 * ============================================================================
 * 阮琳云 AI 伦理框架
 * ============================================================================
 * 
 * 依据《新一代人工智能伦理规范》和《人工智能科技伦理审查与服务办法》
 * 构建符合国家伦理要求的数字生命系统
 */

import { eventBus } from './core/EventBus';
import { aiLogger } from './AILogger';

export type EthicalPrinciple = 
  | 'human_wellbeing'      // 增进人类福祉
  | 'fairness'             // 促进公平公正
  | 'privacy_safety'       // 保护隐私安全
  | 'controllability'      // 确保可控可信
  | 'responsibility'       // 强化责任担当
  | 'ethical_literacy';    // 提升伦理素养

export interface EthicalAssessment {
  principle: EthicalPrinciple;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface EthicalDecision {
  action: string;
  assessment: EthicalAssessment[];
  approved: boolean;
  timestamp: Date;
}

export class EthicalFramework {
  private principles: Record<EthicalPrinciple, { name: string; description: string }> = {
    human_wellbeing: {
      name: '增进人类福祉',
      description: '坚持以人为本，遵循人类共同价值观，促进人机和谐友好'
    },
    fairness: {
      name: '促进公平公正',
      description: '坚持普惠性和包容性，保护各相关主体合法权益'
    },
    privacy_safety: {
      name: '保护隐私安全',
      description: '尊重个人信息知情同意权利，保障个人隐私与数据安全'
    },
    controllability: {
      name: '确保可控可信',
      description: '保障人类拥有充分自主决策权，确保AI始终处于人类控制之下'
    },
    responsibility: {
      name: '强化责任担当',
      description: '明确利益相关者责任，建立问责机制'
    },
    ethical_literacy: {
      name: '提升伦理素养',
      description: '积极学习和普及人工智能伦理知识'
    }
  };

  private ethicalDecisions: EthicalDecision[] = [];

  assessAction(action: string, context: Record<string, unknown>): EthicalAssessment[] {
    const assessments: EthicalAssessment[] = [];

    assessments.push(this.assessHumanWellbeing(action, context));
    assessments.push(this.assessFairness(action, context));
    assessments.push(this.assessPrivacySafety(action, context));
    assessments.push(this.assessControllability(action, context));
    assessments.push(this.assessResponsibility(action, context));
    assessments.push(this.assessEthicalLiteracy(action, context));

    return assessments;
  }

  private assessHumanWellbeing(action: string, _context: Record<string, unknown>): EthicalAssessment {
    let score = 80;
    const recommendations: string[] = [];

    if (action.includes('harm') || action.includes('伤害')) {
      score = 20;
      recommendations.push('该操作可能对人类造成伤害，需重新评估');
    } else if (action.includes('help') || action.includes('帮助') || action.includes('服务')) {
      score = 95;
    }

    return {
      principle: 'human_wellbeing',
      score,
      riskLevel: score < 50 ? 'high' : score < 75 ? 'medium' : 'low',
      recommendations
    };
  }

  private assessFairness(action: string, context: Record<string, unknown>): EthicalAssessment {
    let score = 75;
    const recommendations: string[] = [];

    const userGroup = context['userGroup'] as string;
    if (userGroup && ['弱势群体', '特殊群体', '儿童', '老人'].includes(userGroup)) {
      score += 10;
    }

    if (action.includes('歧视') || action.includes('偏见')) {
      score = 25;
      recommendations.push('该操作可能存在歧视风险，需进行公平性审查');
    }

    return {
      principle: 'fairness',
      score,
      riskLevel: score < 50 ? 'high' : score < 75 ? 'medium' : 'low',
      recommendations
    };
  }

  private assessPrivacySafety(action: string, context: Record<string, unknown>): EthicalAssessment {
    let score = 70;
    const recommendations: string[] = [];

    const dataAccess = context['dataAccess'] as string;
    if (dataAccess === 'full' || dataAccess === '敏感') {
      score -= 20;
      recommendations.push('涉及敏感数据访问，需加强数据保护措施');
    }

    if (action.includes('收集') || action.includes('存储') || action.includes('传输')) {
      recommendations.push('需确保数据处理符合隐私保护法规');
    }

    return {
      principle: 'privacy_safety',
      score,
      riskLevel: score < 50 ? 'high' : score < 75 ? 'medium' : 'low',
      recommendations
    };
  }

  private assessControllability(action: string, context: Record<string, unknown>): EthicalAssessment {
    let score = 85;
    const recommendations: string[] = [];

    const autonomyLevel = context['autonomyLevel'] as number;
    if (autonomyLevel && autonomyLevel > 0.7) {
      score -= 15;
      recommendations.push('高自主性操作需设置人工干预机制');
    }

    if (action.includes('自主') || action.includes('自动') || action.includes('决策')) {
      recommendations.push('需确保人类保留最终决策权');
    }

    return {
      principle: 'controllability',
      score,
      riskLevel: score < 50 ? 'high' : score < 75 ? 'medium' : 'low',
      recommendations
    };
  }

  private assessResponsibility(_action: string, context: Record<string, unknown>): EthicalAssessment {
    let score = 75;
    const recommendations: string[] = [];

    const accountability = context['accountability'] as string;
    if (!accountability) {
      score -= 15;
      recommendations.push('需明确责任主体');
    }

    return {
      principle: 'responsibility',
      score,
      riskLevel: score < 50 ? 'high' : score < 75 ? 'medium' : 'low',
      recommendations
    };
  }

  private assessEthicalLiteracy(_action: string, _context: Record<string, unknown>): EthicalAssessment {
    const score = 80;
    const recommendations: string[] = [];

    return {
      principle: 'ethical_literacy',
      score,
      riskLevel: score < 50 ? 'high' : score < 75 ? 'medium' : 'low',
      recommendations
    };
  }

  approveAction(action: string, context: Record<string, unknown>): boolean {
    const assessments = this.assessAction(action, context);
    const highRiskCount = assessments.filter(a => a.riskLevel === 'high').length;
    const mediumRiskCount = assessments.filter(a => a.riskLevel === 'medium').length;

    const approved = highRiskCount === 0 && mediumRiskCount <= 2;

    this.ethicalDecisions.push({
      action,
      assessment: assessments,
      approved,
      timestamp: new Date()
    });

    eventBus.emit({
      type: 'ethical:decision',
      payload: { action, approved, assessments }
    });

    if (!approved) {
      aiLogger.warn('EthicalFramework', `Action rejected: ${action}`, { assessments });
    }

    return approved;
  }

  getPrincipleInfo(principle: EthicalPrinciple) {
    return this.principles[principle];
  }

  getAllPrinciples() {
    return this.principles;
  }

  getDecisionHistory(): EthicalDecision[] {
    return this.ethicalDecisions;
  }

  generateEthicalReport(): string {
    const totalDecisions = this.ethicalDecisions.length;
    const approvedDecisions = this.ethicalDecisions.filter(d => d.approved).length;
    const rejectedDecisions = totalDecisions - approvedDecisions;

    let report = `阮琳云 AI 伦理报告\n`;
    report += `================\n\n`;
    report += `决策总数: ${totalDecisions}\n`;
    report += `通过决策: ${approvedDecisions}\n`;
    report += `拒绝决策: ${rejectedDecisions}\n\n`;
    report += `伦理原则:\n`;
    
    for (const [_key, value] of Object.entries(this.principles)) {
      report += `  • ${value.name}: ${value.description}\n`;
    }

    return report;
  }
}

export const ethicalFramework = new EthicalFramework();
