interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance: number;
}

interface SearchConfig {
  maxResults: number;
  timeout: number;
  safeSearch: boolean;
}

export class WebSearchService {
  private config: SearchConfig;
  private searchHistory: { query: string; timestamp: number; results: SearchResult[] }[];
  private rateLimitMap: Map<string, { count: number; resetTime: number }>;
  private MAX_SEARCHES_PER_HOUR = 100;

  constructor() {
    this.config = {
      maxResults: 10,
      timeout: 30000,
      safeSearch: true
    };
    this.searchHistory = [];
    this.rateLimitMap = new Map();
  }

  async search(query: string, options?: Partial<SearchConfig>): Promise<SearchResult[]> {
    const effectiveConfig = { ...this.config, ...options };

    const rateLimitKey = 'global';
    const rateLimit = this.checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      throw new Error(`搜索频率超限，请等待 ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} 秒`);
    }



    const results = await this.performSearch(query, effectiveConfig);

    this.searchHistory.push({
      query,
      timestamp: Date.now(),
      results
    });

    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(-50);
    }

    return results;
  }

  private checkRateLimit(key: string): { allowed: boolean; resetTime: number } {
    const now = Date.now();
    const entry = this.rateLimitMap.get(key);

    if (!entry) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + 3600000 });
      return { allowed: true, resetTime: now + 3600000 };
    }

    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + 3600000;
      return { allowed: true, resetTime: entry.resetTime };
    }

    if (entry.count >= this.MAX_SEARCHES_PER_HOUR) {
      return { allowed: false, resetTime: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, resetTime: entry.resetTime };
  }

  private async performSearch(query: string, config: SearchConfig): Promise<SearchResult[]> {
    const mockResults: SearchResult[] = [
      {
        title: `${query} - 维基百科`,
        url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        snippet: `关于${query}的详细百科介绍，包括定义、历史、相关概念等内容。`,
        source: '维基百科',
        relevance: 0.95
      },
      {
        title: `${query} - 哲学百科`,
        url: `https://philosophy.org/${encodeURIComponent(query)}`,
        snippet: `深入探讨${query}的哲学意义，包括不同学派的观点和论证。`,
        source: '哲学百科',
        relevance: 0.88
      },
      {
        title: `${query}的历史演变`,
        url: `https://history.com/${encodeURIComponent(query)}`,
        snippet: `从古希腊到现代，${query}概念的发展历程和重要思想家的贡献。`,
        source: '历史研究',
        relevance: 0.82
      },
      {
        title: `${query}与现代科学`,
        url: `https://science.org/${encodeURIComponent(query)}`,
        snippet: `探讨${query}在现代科学背景下的意义和应用。`,
        source: '科学期刊',
        relevance: 0.75
      },
      {
        title: `${query}的哲学论证`,
        url: `https://philpapers.org/${encodeURIComponent(query)}`,
        snippet: `关于${query}的主要哲学论证和反驳观点。`,
        source: '哲学论文库',
        relevance: 0.72
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    return mockResults.slice(0, config.maxResults);
  }

  async searchWithSummary(query: string): Promise<{
    results: SearchResult[];
    summary: string;
    confidence: number;
  }> {
    const results = await this.search(query);

    if (results.length === 0) {
      return {
        results: [],
        summary: `未找到关于 "${query}" 的搜索结果。`,
        confidence: 0
      };
    }

    const summary = this.generateSummary(query, results);
    const confidence = this.calculateConfidence(results);

    return {
      results,
      summary,
      confidence
    };
  }

  private generateSummary(query: string, results: SearchResult[]): string {
    const snippets = results.slice(0, 3).map(r => r.snippet);
    
    let summary = `关于「${query}」的搜索结果摘要：\n\n`;
    summary += `根据搜索结果，${query}是一个重要的哲学概念。\n\n`;
    
    for (let i = 0; i < snippets.length; i++) {
      summary += `${i + 1}. ${snippets[i]}\n`;
    }
    
    summary += `\n如需更详细的信息，建议访问相关链接。`;
    
    return summary;
  }

  private calculateConfidence(results: SearchResult[]): number {
    if (results.length === 0) return 0;
    
    const avgRelevance = results.reduce((sum, r) => sum + r.relevance, 0) / results.length;
    const hasWikipedia = results.some(r => r.source === '维基百科');
    
    return Math.min(1, avgRelevance + (hasWikipedia ? 0.1 : 0));
  }

  getSearchHistory(): { query: string; timestamp: number; results: SearchResult[] }[] {
    return [...this.searchHistory];
  }

  getRecentQueries(): string[] {
    return this.searchHistory
      .filter(h => Date.now() - h.timestamp < 3600000)
      .map(h => h.query);
  }

  clearHistory(): void {
    this.searchHistory = [];
  }

  updateConfig(newConfig: Partial<SearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): SearchConfig {
    return { ...this.config };
  }
}

export const webSearchService = new WebSearchService();
