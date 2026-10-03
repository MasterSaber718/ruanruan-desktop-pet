// ============================================================================
// Agent Service - 前端Agent能力服务
// 调用后端的「双手」和「眼睛」系统API
// ============================================================================

import axios, { AxiosError } from 'axios';

// 后端服务端口是27865
// 动态使用 window.location.hostname：从局域网IP访问前端时也指向同一台后端机器
// （否则手机等设备访问 http://192.168.x.x:5175 时，JS 调用 127.0.0.1:27865 会指向手机自己）
// Electron 环境下降级到 127.0.0.1
const API_HOST = (typeof window !== 'undefined' && window.location && window.location.hostname) || '127.0.0.1';
const API_BASE_URL = `http://${API_HOST}:27865/api/v1`;

function getAxiosErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// ============================================================================
// 类型定义
// ============================================================================

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  executionTime: number;
  error?: string;
  operation?: string;
}

export interface FileResult {
  success: boolean;
  content?: string;
  files?: Array<{
    name: string;
    type: 'file' | 'directory' | 'unknown';
    size: number;
    modified: Date;
  }>;
  size?: number;
  error?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance: number;
}

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

export interface InformationSummary {
  query: string;
  sources: SearchResult[];
  aggregatedContent: string;
  keyPoints: string[];
  confidence: number;
  searchTime: number;
}

export interface SystemInfo {
  platform: string;
  hostname: string;
  username: string;
  cpuCount: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  currentDirectory: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}

// ============================================================================
// Agent Hands Service - 双手系统前端服务
// ============================================================================

export class AgentHandsService {
  private baseUrl = `${API_BASE_URL}/agent/hands`;

  // 执行命令
  async executeCommand(command: string, options?: {
    timeout?: number;
    cwd?: string;
  }): Promise<CommandResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/command`, {
        command,
        ...options
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        executionTime: 0,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 读取文件
  async readFile(path: string, encoding?: string): Promise<FileResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/file/read`, {
        path,
        encoding
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 写入文件
  async writeFile(path: string, content: string): Promise<FileResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/file/write`, {
        path,
        content
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 列出目录
  async listDirectory(path: string): Promise<FileResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/file/list`, {
        path
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 创建目录
  async createDirectory(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/directory/create`, {
        path
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 删除文件
  async deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/file/delete`, {
        path
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 获取进程列表
  async getProcesses(): Promise<{ success: boolean; processes: ProcessInfo[]; error?: string }> {
    try {
      const response = await axios.get(`${this.baseUrl}/processes`);
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        processes: [],
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 终止进程
  async killProcess(pid: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/process/kill`, {
        pid
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 获取系统信息
  async getSystemInfo(): Promise<{ success: boolean; systemInfo?: SystemInfo; error?: string }> {
    try {
      const response = await axios.get(`${this.baseUrl}/system-info`);
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 获取操作历史
  async getHistory(count?: number): Promise<{ success: boolean; history: unknown[] }> {
    try {
      const response = await axios.get(`${this.baseUrl}/history`, {
        params: { count }
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        history: []
      };
    }
  }
}

// ============================================================================
// Agent Eyes Service - 眼睛系统前端服务
// ============================================================================

export class AgentEyesService {
  private baseUrl = `${API_BASE_URL}/agent/eyes`;

  // 搜索
  async search(query: string, options?: {
    maxResults?: number;
    language?: string;
    safeSearch?: boolean;
  }): Promise<{ success: boolean; results: SearchResult[]; error?: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/search`, {
        query,
        ...options
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        results: [],
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 搜索并分析
  async analyze(query: string, options?: {
    maxResults?: number;
    language?: string;
  }): Promise<{ success: boolean; summary?: InformationSummary; error?: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/analyze`, {
        query,
        ...options
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 抓取网页
  async fetchWebPage(url: string, timeout?: number): Promise<{
    success: boolean;
    page?: WebPageContent;
    error?: string;
  }> {
    try {
      const response = await axios.post(`${this.baseUrl}/fetch`, {
        url,
        timeout
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 提取维基百科信息
  async getWikiInfo(topic: string): Promise<{
    success: boolean;
    wikiInfo?: { title: string; content: string; url: string };
    error?: string;
  }> {
    try {
      const response = await axios.post(`${this.baseUrl}/wiki`, {
        topic
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 提取新闻信息
  async getNewsInfo(url: string): Promise<{
    success: boolean;
    newsInfo?: { title: string; content: string; publishDate?: string; author?: string };
    error?: string;
  }> {
    try {
      const response = await axios.post(`${this.baseUrl}/news`, {
        url
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 获取搜索历史
  async getHistory(count?: number): Promise<{ success: boolean; history: InformationSummary[] }> {
    try {
      const response = await axios.get(`${this.baseUrl}/history`, {
        params: { count }
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        history: []
      };
    }
  }
}

// ============================================================================
// Agent 综合服务
// ============================================================================

export class AgentService {
  private baseUrl = `${API_BASE_URL}/agent`;
  hands = new AgentHandsService();
  eyes = new AgentEyesService();

  // 执行多个操作
  async executeActions(actions: Array<{
    system: 'hands' | 'eyes';
    type: string;
    params: Record<string, unknown>;
  }>): Promise<{ success: boolean; results: unknown[] }> {
    try {
      const response = await axios.post(`${this.baseUrl}/execute`, {
        actions
      });
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        results: []
      };
    }
  }

  // 获取Agent状态
  async getStatus(): Promise<{
    success: boolean;
    status?: {
      hands: {
        available: boolean;
        capabilities: string[];
        historyCount: number;
      };
      eyes: {
        available: boolean;
        capabilities: string[];
        historyCount: number;
      };
    };
    error?: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/status`);
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getAxiosErrorMessage(error)
      };
    }
  }

  // 快捷方法：让AI自主获取信息
  async look(query: string): Promise<InformationSummary | null> {
    const result = await this.eyes.analyze(query);
    return result.summary || null;
  }

  // 快捷方法：让AI自主执行命令
  async do(command: string): Promise<CommandResult> {
    return this.hands.executeCommand(command);
  }

  // 快捷方法：让AI自主读取文件
  async read(path: string): Promise<string | null> {
    const result = await this.hands.readFile(path);
    return result.success ? result.content || null : null;
  }

  // 快捷方法：让AI自主写入文件
  async write(path: string, content: string): Promise<boolean> {
    const result = await this.hands.writeFile(path, content);
    return result.success;
  }

  // 快捷方法：让AI自主浏览网页
  async see(url: string): Promise<WebPageContent | null> {
    const result = await this.eyes.fetchWebPage(url);
    return result.page || null;
  }
}

// 导出单例
export const agentService = new AgentService();