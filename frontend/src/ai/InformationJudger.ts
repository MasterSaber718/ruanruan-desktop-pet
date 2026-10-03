// ============================================================================
// 信息判断模块 - Information Judger
// ============================================================================

import { SearchResult } from './WebSearchModule';

export interface JudgedResult {
  result: SearchResult;
  credibilityScore: number;
  sourceType: 'official' | 'institution' | 'professional' | 'media' | 'individual' | 'unknown';
  isReliable: boolean;
  warnings: string[];
}

export interface JudgedResponse {
  query: string;
  results: JudgedResult[];
  hasConflicts: boolean;
  summary: string;
}

export class InformationJudger {
  private officialDomains = ['gov.cn', 'gov.com', 'official', '权威', '官方', '气象局', '税务局', '教育部', '卫生部'];
  private institutionDomains = ['org', '协会', '学会', '研究院', '科学院', '大学', '学院'];
  private professionalDomains = ['douban.com', 'zhihu.com', 'zh.wikipedia.org', 'baike.baidu.com', '科学', '医学', '学术'];
  private mediaDomains = ['news', 'cnn', 'bbc', '央视', '人民日报', '新华社', '科技日报', '澎湃新闻'];

  constructor() { /* noop */ }

  judge(query: string, results: SearchResult[]): JudgedResponse {
    const judgedResults: JudgedResult[] = [];
    let hasConflicts = false;

    for (const result of results) {
      const judged = this.judgeSingleResult(result);
      judgedResults.push(judged);
    }

    judgedResults.sort((a, b) => b.credibilityScore - a.credibilityScore);

    const conflicts = this.detectConflicts(judgedResults);
    if (conflicts.length > 0) {
      hasConflicts = true;
    }

    const summary = this.generateSummary(query, judgedResults, hasConflicts);

    return {
      query,
      results: judgedResults,
      hasConflicts,
      summary
    };
  }

  private judgeSingleResult(result: SearchResult): JudgedResult {
    const warnings: string[] = [];
    let credibilityScore = 50;
    let sourceType: JudgedResult['sourceType'] = 'unknown';

    if (this.isOfficial(result)) {
      sourceType = 'official';
      credibilityScore += 40;
    } else if (this.isInstitution(result)) {
      sourceType = 'institution';
      credibilityScore += 30;
    } else if (this.isProfessional(result)) {
      sourceType = 'professional';
      credibilityScore += 25;
    } else if (this.isMedia(result)) {
      sourceType = 'media';
      credibilityScore += 20;
    } else {
      sourceType = 'individual';
      credibilityScore += 10;
    }

    if (result.timestamp) {
      const ageDays = this.calculateAge(result.timestamp);
      if (ageDays > 365) {
        warnings.push('信息可能已过时');
        credibilityScore -= 15;
      } else if (ageDays > 90) {
        warnings.push('信息发布时间较早');
        credibilityScore -= 5;
      }
    }

    if (result.description.length < 20) {
      warnings.push('内容过于简短，信息不足');
      credibilityScore -= 10;
    }

    if (result.description.includes('广告') || result.description.includes('推广')) {
      warnings.push('可能包含广告内容');
      credibilityScore -= 20;
    }

    if (result.url.includes('sponsored') || result.url.includes('ad.')) {
      warnings.push('可能为付费推广内容');
      credibilityScore -= 15;
    }

    credibilityScore = Math.max(0, Math.min(100, credibilityScore));

    return {
      result,
      credibilityScore,
      sourceType,
      isReliable: credibilityScore >= 60,
      warnings
    };
  }

  private isOfficial(result: SearchResult): boolean {
    const urlLower = result.url.toLowerCase();
    const sourceLower = result.source.toLowerCase();
    
    for (const domain of this.officialDomains) {
      if (urlLower.includes(domain.toLowerCase()) || sourceLower.includes(domain.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private isInstitution(result: SearchResult): boolean {
    const urlLower = result.url.toLowerCase();
    const sourceLower = result.source.toLowerCase();
    
    for (const domain of this.institutionDomains) {
      if (urlLower.includes(domain.toLowerCase()) || sourceLower.includes(domain.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private isProfessional(result: SearchResult): boolean {
    const urlLower = result.url.toLowerCase();
    const sourceLower = result.source.toLowerCase();
    
    for (const domain of this.professionalDomains) {
      if (urlLower.includes(domain.toLowerCase()) || sourceLower.includes(domain.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private isMedia(result: SearchResult): boolean {
    const urlLower = result.url.toLowerCase();
    const sourceLower = result.source.toLowerCase();
    
    for (const domain of this.mediaDomains) {
      if (urlLower.includes(domain.toLowerCase()) || sourceLower.includes(domain.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private calculateAge(timestamp: string): number {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 366;
    }
  }

  private detectConflicts(results: JudgedResult[]): string[] {
    const conflicts: string[] = [];
    
    if (results.length < 2) return conflicts;

    const reliableResults = results.filter(r => r.isReliable);
    if (reliableResults.length < 2) return conflicts;

    const descriptions = reliableResults.map(r => r.result.description.toLowerCase());
    
    for (let i = 0; i < descriptions.length; i++) {
      for (let j = i + 1; j < descriptions.length; j++) {
        if (!this.areSimilar(descriptions[i], descriptions[j])) {
          conflicts.push(`来源${i + 1}和来源${j + 1}描述存在差异`);
        }
      }
    }

    return conflicts;
  }

  private areSimilar(str1: string, str2: string): boolean {
    const commonWords = new Set(str1.split(/\s+/));
    let matches = 0;
    
    for (const word of str2.split(/\s+/)) {
      if (commonWords.has(word)) {
        matches++;
      }
    }
    
    return matches >= 3;
  }

  private generateSummary(_query: string, results: JudgedResult[], hasConflicts: boolean): string {
    const reliableResults = results.filter(r => r.isReliable);
    
    if (reliableResults.length === 0) {
      return '未找到足够可靠的信息来源';
    }

    if (hasConflicts) {
      return '不同来源存在不同说法，请谨慎参考';
    }

    const bestResult = reliableResults[0];
    return `根据${bestResult.result.source}的信息：${bestResult.result.description}`;
  }

  getSourceTypeName(type: JudgedResult['sourceType']): string {
    const names: Record<JudgedResult['sourceType'], string> = {
      official: '官方权威',
      institution: '机构组织',
      professional: '专业平台',
      media: '新闻媒体',
      individual: '个人发布',
      unknown: '未知来源'
    };
    return names[type];
  }
}

export const informationJudger = new InformationJudger();
