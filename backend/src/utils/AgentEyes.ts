// ============================================================================
// Agent Eyes System - AI眼睛系统
// 让AI可以自主联网搜索、抓取信息、理解网页内容
// ============================================================================

import axios from 'axios';
import * as cheerio from 'cheerio';

// ============================================================================
// 搜索引擎接口
// ============================================================================

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance: number;
  publishedDate?: string;
}

export interface SearchOptions {
  maxResults?: number;
  language?: string;
  safeSearch?: boolean;
  timeout?: number;
}

// DuckDuckGo 搜索（无需API Key）
export async function searchDuckDuckGo(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const maxResults = options.maxResults || 10;
  const timeout = options.timeout || 15000;
  
  try {
    // DuckDuckGo Instant Answer API
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        skip_disambig: 1,
        lang: options.language || 'zh-cn'
      },
      timeout
    });
    
    const data = response.data;
    const results: SearchResult[] = [];
    
    // 主要答案
    if (data.Abstract) {
      results.push({
        title: data.AbstractSource || 'DuckDuckGo',
        url: data.AbstractURL || '',
        snippet: data.Abstract,
        source: 'DuckDuckGo Instant Answer',
        relevance: 0.95
      });
    }
    
    // 相关主题
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || '相关主题',
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo Related',
            relevance: 0.85
          });
        }
      }
    }
    
    return results;
  } catch (error: any) {
    console.error('DuckDuckGo search error:', error.message);
    return [];
  }
}

// Bing Web Search API（需要API Key）
export async function searchBing(
  query: string,
  apiKey: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const maxResults = options.maxResults || 10;
  const timeout = options.timeout || 15000;
  
  try {
    const response = await axios.get(
      'https://api.bing.microsoft.com/v7.0/search',
      {
        params: {
          q: query,
          count: maxResults,
          mkt: options.language || 'zh-CN',
          safeSearch: options.safeSearch ? 'Strict' : 'Moderate'
        },
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey
        },
        timeout
      }
    );
    
    const data = response.data;
    const results: SearchResult[] = [];
    
    if (data.webPages && data.webPages.value) {
      for (const page of data.webPages.value) {
        results.push({
          title: page.name,
          url: page.url,
          snippet: page.snippet,
          source: 'Bing',
          relevance: 0.9,
          publishedDate: page.dateLastCrawled
        });
      }
    }
    
    return results;
  } catch (error: any) {
    console.error('Bing search error:', error.message);
    return [];
  }
}

// 百度搜索（模拟，因为百度没有公开API）
export async function searchBaidu(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  // 由于百度没有公开API，这里返回模拟结果
  // 实际使用时可以考虑使用第三方服务或爬虫
  const maxResults = options.maxResults || 5;
  
  return [
    {
      title: `${query} - 百度百科`,
      url: `https://baike.baidu.com/item/${encodeURIComponent(query)}`,
      snippet: `关于${query}的百科词条，包含定义、历史、相关概念等详细信息。`,
      source: '百度百科',
      relevance: 0.95
    },
    {
      title: `${query}相关资讯`,
      url: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
      snippet: `搜索${query}相关的新闻、文章、讨论等内容。`,
      source: '百度搜索',
      relevance: 0.85
    }
  ].slice(0, maxResults);
}

// ============================================================================
// 网页抓取和内容提取
// ============================================================================

export interface WebPageContent {
  url: string;
  title: string;
  content: string;
  summary: string;
  links: string[];
  images: string[];
  metadata: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishDate?: string;
  };
  fetchTime: number;
}

export async function fetchWebPage(
  url: string,
  timeout: number = 20000
): Promise<WebPageContent | null> {
  try {
    const response = await axios.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // 提取标题
    const title = $('title').text().trim() || $('h1').first().text().trim();
    
    // 提取主要内容
    // 移除脚本、样式、导航等无关内容
    $('script, style, nav, header, footer, aside, .sidebar, .advertisement, .ads').remove();
    
    // 尝试找到主要内容区域
    let contentSelectors = [
      'article', 'main', '.content', '.post-content', '.article-content',
      '#content', '#main', '.entry-content', '.post-body', '.article-body'
    ];
    
    let content = '';
    for (const selector of contentSelectors) {
      const selectedContent = $(selector).text();
      if (selectedContent.length > content.length) {
        content = selectedContent;
      }
    }
    
    // 如果没有找到主要内容区域，使用body
    if (!content) {
      content = $('body').text();
    }
    
    // 清理内容
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // 提取链接
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        links.push(href);
      }
    });
    
    // 提取图片
    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('data:')) {
        images.push(src);
      }
    });
    
    // 提取元数据
    const metadata = {
      description: $('meta[name="description"]').attr('content'),
      keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()),
      author: $('meta[name="author"]').attr('content'),
      publishDate: $('meta[property="article:published_time"]').attr('content') ||
                   $('time').attr('datetime')
    };
    
    // 生成摘要（取前500字）
    const summary = content.slice(0, 500) + (content.length > 500 ? '...' : '');
    
    return {
      url,
      title,
      content,
      summary,
      links: links.slice(0, 20),
      images: images.slice(0, 10),
      metadata,
      fetchTime: Date.now()
    };
  } catch (error: any) {
    console.error('Fetch webpage error:', error.message);
    return null;
  }
}

// ============================================================================
// 信息整合和智能分析
// ============================================================================

export interface InformationSummary {
  query: string;
  sources: SearchResult[];
  aggregatedContent: string;
  keyPoints: string[];
  confidence: number;
  searchTime: number;
}

export async function searchAndAnalyze(
  query: string,
  options: SearchOptions = {}
): Promise<InformationSummary> {
  const startTime = Date.now();
  
  // 执行搜索
  const searchResults = await searchDuckDuckGo(query, options);
  
  // 如果有结果，抓取主要页面的内容
  const detailedContents: WebPageContent[] = [];
  const maxPagesToFetch = 3;
  
  for (const result of searchResults.slice(0, maxPagesToFetch)) {
    if (result.url) {
      const pageContent = await fetchWebPage(result.url);
      if (pageContent) {
        detailedContents.push(pageContent);
      }
    }
  }
  
  // 整合信息
  let aggregatedContent = '';
  const keyPoints: string[] = [];
  
  // 从搜索结果中提取关键信息
  for (const result of searchResults) {
    if (result.snippet) {
      keyPoints.push(`${result.title}: ${result.snippet}`);
    }
  }
  
  // 从详细内容中提取更多信息
  for (const content of detailedContents) {
    if (content.summary) {
      aggregatedContent += `\n【${content.title}】\n${content.summary}\n`;
    }
  }
  
  // 计算置信度
  const confidence = searchResults.length > 0 
    ? Math.min(1, searchResults.reduce((sum, r) => sum + r.relevance, 0) / searchResults.length + 0.1)
    : 0;
  
  return {
    query,
    sources: searchResults,
    aggregatedContent,
    keyPoints,
    confidence,
    searchTime: Date.now() - startTime
  };
}

// ============================================================================
// 特定信息提取器
// ============================================================================

export async function extractNewsInfo(url: string): Promise<{
  title: string;
  content: string;
  publishDate?: string;
  author?: string;
} | null> {
  const page = await fetchWebPage(url);
  if (!page) return null;
  
  return {
    title: page.title,
    content: page.summary,
    publishDate: page.metadata.publishDate,
    author: page.metadata.author
  };
}

export async function extractWikiInfo(topic: string): Promise<{
  title: string;
  content: string;
  url: string;
} | null> {
  const wikiUrl = `https://zh.wikipedia.org/wiki/${encodeURIComponent(topic)}`;
  const page = await fetchWebPage(wikiUrl);
  
  if (!page) return null;
  
  return {
    title: page.title,
    content: page.summary,
    url: wikiUrl
  };
}

export async function extractCodeSnippet(url: string): Promise<{
  title: string;
  code: string;
  language?: string;
} | null> {
  const page = await fetchWebPage(url);
  if (!page) return null;
  
  const $ = cheerio.load(page.content);
  const codeElements = $('pre code, code');
  
  const codeSnippets: string[] = [];
  codeElements.each((_, el) => {
    codeSnippets.push($(el).text());
  });
  
  return {
    title: page.title,
    code: codeSnippets.join('\n\n'),
    language: $('code').attr('class')?.replace('language-', '')
  };
}

// ============================================================================
// Agent Eyes 统一接口
// ============================================================================

export interface EyeAction {
  type: 'search' | 'fetch' | 'analyze' | 'extract_news' | 'extract_wiki' | 'extract_code';
  params: Record<string, any>;
  description?: string;
}

export interface EyeActionResult {
  success: boolean;
  result?: any;
  error?: string;
  action: EyeAction;
  executionTime: number;
}

export class AgentEyes {
  private searchHistory: InformationSummary[] = [];
  private maxHistorySize = 50;
  
  async execute(action: EyeAction): Promise<EyeActionResult> {
    const startTime = Date.now();
    let result: any;
    let success = false;
    let error: string | undefined;
    
    try {
      switch (action.type) {
        case 'search':
          result = await searchDuckDuckGo(action.params.query, action.params.options);
          success = result.length > 0;
          break;
          
        case 'fetch':
          result = await fetchWebPage(action.params.url, action.params.timeout);
          success = result !== null;
          error = result === null ? '无法获取网页内容' : undefined;
          break;
          
        case 'analyze':
          result = await searchAndAnalyze(action.params.query, action.params.options);
          success = result.sources.length > 0;
          
          // 记录搜索历史
          this.searchHistory.push(result);
          if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(-this.maxHistorySize);
          }
          break;
          
        case 'extract_news':
          result = await extractNewsInfo(action.params.url);
          success = result !== null;
          break;
          
        case 'extract_wiki':
          result = await extractWikiInfo(action.params.topic);
          success = result !== null;
          break;
          
        case 'extract_code':
          result = await extractCodeSnippet(action.params.url);
          success = result !== null;
          break;
          
        default:
          error = `未知的操作类型: ${action.type}`;
          success = false;
      }
    } catch (err: any) {
      error = err.message;
      success = false;
    }
    
    return {
      success,
      result,
      error,
      action,
      executionTime: Date.now() - startTime
    };
  }
  
  getSearchHistory(): InformationSummary[] {
    return [...this.searchHistory];
  }
  
  getRecentSearches(count: number = 10): InformationSummary[] {
    return this.searchHistory.slice(-count);
  }
  
  clearHistory(): void {
    this.searchHistory = [];
  }
  
  // 快捷方法
  async look(query: string): Promise<InformationSummary> {
    return searchAndAnalyze(query);
  }
  
  async see(url: string): Promise<WebPageContent | null> {
    return fetchWebPage(url);
  }
}

export const agentEyes = new AgentEyes();