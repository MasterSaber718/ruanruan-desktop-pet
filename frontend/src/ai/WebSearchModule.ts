// ============================================================================
// 联网搜索模块 - Web Search Module
// ============================================================================

export interface SearchResult {
  title: string;
  description: string;
  url: string;
  source: string;
  timestamp?: string;
  relevance: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

export class WebSearchModule {
  private mockData: Record<string, SearchResult[]> = {
    '天气': [
      {
        title: '今日天气预报',
        description: '今天天气晴朗，气温25-32度，适合户外活动',
        url: 'https://weather.example.com',
        source: '气象局官方',
        timestamp: '2024-01-15',
        relevance: 0.95
      },
      {
        title: '未来一周天气趋势',
        description: '未来几天持续晴朗，周末可能有小雨',
        url: 'https://weather.example.com/weekly',
        source: '天气网',
        timestamp: '2024-01-15',
        relevance: 0.88
      }
    ],
    '电影推荐': [
      {
        title: '2024年必看电影推荐',
        description: '《奥本海默》、《沙丘2》、《蜘蛛侠：纵横宇宙》等多部精彩电影值得一看',
        url: 'https://movie.example.com',
        source: '豆瓣电影',
        timestamp: '2024-01-10',
        relevance: 0.92
      },
      {
        title: '近期热门电影排行',
        description: '《奥本海默》登顶票房冠军，诺兰神作再次刷新纪录',
        url: 'https://movie.example.com/ranking',
        source: '猫眼电影',
        timestamp: '2024-01-14',
        relevance: 0.85
      }
    ],
    '新闻': [
      {
        title: '今日热点新闻汇总',
        description: '科技巨头发布新品，股市小幅波动，体育赛事精彩纷呈',
        url: 'https://news.example.com',
        source: '央视新闻',
        timestamp: '2024-01-15',
        relevance: 0.90
      },
      {
        title: '科技前沿资讯',
        description: '人工智能最新突破，自动驾驶技术取得新进展',
        url: 'https://tech.example.com',
        source: '科技日报',
        timestamp: '2024-01-15',
        relevance: 0.82
      }
    ],
    '美食': [
      {
        title: '美食推荐：川菜精选',
        description: '麻婆豆腐、水煮鱼、回锅肉等经典川菜做法详解',
        url: 'https://food.example.com/sichuan',
        source: '美食天下',
        timestamp: '2024-01-12',
        relevance: 0.88
      },
      {
        title: '家常菜做法大全',
        description: '简单易做的家常菜，适合上班族和家庭烹饪',
        url: 'https://food.example.com/home',
        source: '下厨房',
        timestamp: '2024-01-10',
        relevance: 0.85
      }
    ],
    '旅游': [
      {
        title: '国内旅游热门目的地',
        description: '三亚、丽江、张家界等热门景点推荐及攻略',
        url: 'https://travel.example.com',
        source: '携程旅行',
        timestamp: '2024-01-14',
        relevance: 0.91
      },
      {
        title: '小众旅行地推荐',
        description: '人少景美的隐藏宝藏目的地，避开人潮享受宁静',
        url: 'https://travel.example.com/hidden',
        source: '马蜂窝',
        timestamp: '2024-01-11',
        relevance: 0.86
      }
    ],
    '健康': [
      {
        title: '春季养生指南',
        description: '春季如何养生，饮食调理和运动建议',
        url: 'https://health.example.com/spring',
        source: '健康中国',
        timestamp: '2024-01-13',
        relevance: 0.89
      },
      {
        title: '常见疾病预防',
        description: '流感、过敏等春季常见疾病的预防方法',
        url: 'https://health.example.com/prevention',
        source: '医学科普',
        timestamp: '2024-01-12',
        relevance: 0.84
      }
    ],
    '科技': [
      {
        title: '人工智能最新进展',
        description: 'GPT-5发布传闻，AI技术新突破，行业应用加速',
        url: 'https://tech.example.com/ai',
        source: '科技头条',
        timestamp: '2024-01-15',
        relevance: 0.93
      },
      {
        title: '新能源汽车技术',
        description: '电池技术突破，续航里程大幅提升',
        url: 'https://tech.example.com/ev',
        source: '汽车之家',
        timestamp: '2024-01-14',
        relevance: 0.87
      }
    ],
    '历史': [
      {
        title: '中国历史人物故事',
        description: '孔子、秦始皇、唐太宗等历史名人的传奇一生',
        url: 'https://history.example.com/china',
        source: '历史网',
        timestamp: '2024-01-10',
        relevance: 0.88
      },
      {
        title: '世界历史大事年表',
        description: '从古代文明到现代社会的重大历史事件',
        url: 'https://history.example.com/world',
        source: '历史百科',
        timestamp: '2024-01-08',
        relevance: 0.85
      }
    ],
    '科学': [
      {
        title: '宇宙探索新发现',
        description: 'NASA最新发现，宇宙深处的神秘天体',
        url: 'https://science.example.com/space',
        source: '科学美国人',
        timestamp: '2024-01-15',
        relevance: 0.90
      },
      {
        title: '生物科学前沿',
        description: '基因编辑技术新突破，医学领域革命性进展',
        url: 'https://science.example.com/biology',
        source: '自然杂志',
        timestamp: '2024-01-13',
        relevance: 0.86
      }
    ]
  };

  constructor() { /* noop */ }

  async search(query: string): Promise<SearchResponse> {
    await this.delay(1000 + Math.random() * 1000);

    const keywords = this.extractKeywords(query);
    let results: SearchResult[] = [];

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      for (const [mockKey, mockResults] of Object.entries(this.mockData)) {
        if (mockKey.includes(lowerKeyword) || lowerKeyword.includes(mockKey)) {
          results.push(...mockResults);
        }
      }
    }

    if (results.length === 0) {
      results = this.generateFallbackResults(query);
    }

    results.sort((a, b) => b.relevance - a.relevance);

    return {
      query,
      results: results.slice(0, 5),
      timestamp: Date.now()
    };
  }

  private extractKeywords(query: string): string[] {
    const stopWords = ['的', '是', '在', '有', '和', '了', '我', '你', '他', '她', '它', '这', '那', '什么', '怎么', '为什么'];
    const words = query.split(/[\s，,。！？、]+/).filter(w => w.length > 1 && !stopWords.includes(w));
    
    if (words.length === 0) {
      return [query];
    }
    return words.slice(0, 3);
  }

  private generateFallbackResults(query: string): SearchResult[] {
    return [
      {
        title: `${query}相关信息`,
        description: `关于"${query}"的详细信息，包含定义、背景、应用等方面的内容`,
        url: `https://search.example.com?q=${encodeURIComponent(query)}`,
        source: '综合搜索',
        relevance: 0.7
      },
      {
        title: `${query}最新资讯`,
        description: `近期关于"${query}"的新闻和动态`,
        url: `https://news.example.com?q=${encodeURIComponent(query)}`,
        source: '新闻聚合',
        relevance: 0.65
      }
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const webSearch = new WebSearchModule();
