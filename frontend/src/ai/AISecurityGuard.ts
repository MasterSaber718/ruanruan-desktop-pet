interface SecurityEvent {
  type: 'block' | 'warning' | 'info';
  category: 'injection' | 'rate_limit' | 'suspicious' | 'network' | 'sensitive';
  message: string;
  details: string;
  timestamp: Date;
  blocked: boolean;
}

interface SecurityConfig {
  enableInputValidation: boolean;
  enableRateLimiting: boolean;
  enableNetworkValidation: boolean;
  enableSensitiveOperationConfirmation: boolean;
  enableBehaviorDetection: boolean;
  maxRequestsPerMinute: number;
  whitelistDomains: string[];
  blacklistPatterns: string[];
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

export class AISecurityGuard {
  private static instance: AISecurityGuard;
  private securityEvents: SecurityEvent[] = [];
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private suspiciousPatterns: RegExp[] = [];
  private config: SecurityConfig;
  private operationHistory: { operation: string; timestamp: number; confirmed: boolean }[] = [];

  private constructor() {
    this.config = {
      enableInputValidation: true,
      enableRateLimiting: true,
      enableNetworkValidation: true,
      enableSensitiveOperationConfirmation: true,
      enableBehaviorDetection: true,
      maxRequestsPerMinute: 60,
      whitelistDomains: ['localhost', '127.0.0.1'],
      blacklistPatterns: [
        'rm -rf',
        'del /f /s /q',
        'format c:',
        'shutdown',
        'net user',
        'reg add',
        'reg delete',
        'powershell -enc',
        'curl.*|.*bash',
        'wget.*|.*sh',
        'nc -e',
        'mkfifo',
        '/etc/passwd',
        '~/.ssh',
        'id_rsa'
      ]
    };

    this.initializeSuspiciousPatterns();
  }

  static getInstance(): AISecurityGuard {
    if (!AISecurityGuard.instance) {
      AISecurityGuard.instance = new AISecurityGuard();
    }
    return AISecurityGuard.instance;
  }

  private initializeSuspiciousPatterns(): void {
    const patterns = [
      /\$\(.*\)/g,
      /`.*`/g,
      /;\s*(rm|del|format|shutdown|net|cat|chmod|mkdir|rmdir)/gi,
      /&\s*&\s*(rm|del|format|shutdown|net|cat|chmod)/g,
      /\|\s*(bash|sh|cmd|powershell)/gi,
      /(curl|wget).*\|.*(bash|sh|cmd)/gi,
      /base64\s+-d\s+/gi,
      /nc\s+-[el]/gi,
      /\/etc\/passwd/gi,
      /\/etc\/shadow/gi,
      /~\/\.ssh\//gi,
      /select\s+.*\s+from\s+.*\s+where\s+.*\s+like\s+['"]%/gi,
      /union\s+select/gi,
      /drop\s+table/gi,
      /insert\s+into.*values/gi,
      /delete\s+from/gi,
      /update\s+.*\s+set/gi,
      /<script[^>]*>.*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /passthru\s*\(/gi,
      /shell_exec\s*\(/gi,
      /popen\s*\(/gi,
      /proc_open\s*\(/gi
    ];

    this.suspiciousPatterns = patterns;
  }

  validateInput(input: string): { safe: boolean; reason?: string; sanitized?: string } {
    if (!this.config.enableInputValidation) {
      return { safe: true };
    }

    let sanitized = input;

    for (const pattern of this.suspiciousPatterns) {
      const matches = input.match(pattern);
      if (matches) {
        this.logSecurityEvent({
          type: 'block',
          category: 'injection',
          message: '检测到可疑的输入模式',
          details: `匹配模式: ${pattern.toString()}, 匹配内容: ${matches.join(', ')}`,
          blocked: true
        });
        return {
          safe: false,
          reason: `检测到可疑输入模式: ${matches[0]}`,
          sanitized: input.replace(pattern, '[已过滤]')
        };
      }
    }

    for (const patternStr of this.config.blacklistPatterns) {
      const pattern = new RegExp(patternStr, 'gi');
      if (pattern.test(input)) {
        this.logSecurityEvent({
          type: 'block',
          category: 'injection',
          message: '检测到黑名单命令',
          details: `黑名单模式: ${patternStr}`,
          blocked: true
        });
        return {
          safe: false,
          reason: `检测到黑名单命令: ${patternStr}`,
          sanitized: input.replace(pattern, '[已过滤]')
        };
      }
    }

    const dangerousChars = /[<>'"\\]/g;
    if (dangerousChars.test(input)) {
      sanitized = input.replace(dangerousChars, (match) => {
        const escapeMap: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
          '\\': '\\\\'
        };
        return escapeMap[match] || match;
      });

      if (sanitized !== input) {
        this.logSecurityEvent({
          type: 'warning',
          category: 'injection',
          message: '输入包含特殊字符，已进行转义处理',
          details: `原始输入: ${input}, 转义后: ${sanitized}`,
          blocked: false
        });
      }
    }

    return { safe: true, sanitized };
  }

  validateNetworkRequest(url: string, options?: RequestInit): { safe: boolean; reason?: string } {
    if (!this.config.enableNetworkValidation) {
      return { safe: true };
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      if (this.config.whitelistDomains.includes(hostname)) {
        return { safe: true };
      }

      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipPattern.test(hostname)) {
        const octets = hostname.split('.').map(Number);
        const isPrivate = octets[0] === 10 ||
                          (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
                          (octets[0] === 192 && octets[1] === 168) ||
                          octets[0] === 127;

        if (!isPrivate) {
          this.logSecurityEvent({
            type: 'warning',
            category: 'network',
            message: '检测到外部IP地址访问',
            details: `目标IP: ${hostname}`,
            blocked: false
          });
        }
      }

      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq'];
      if (suspiciousTlds.some(tld => hostname.endsWith(tld))) {
        this.logSecurityEvent({
          type: 'warning',
          category: 'network',
          message: '检测到可疑域名后缀',
          details: `域名: ${hostname}`,
          blocked: false
        });
      }

      if (options?.body) {
        const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        const inputValidation = this.validateInput(bodyStr);
        if (!inputValidation.safe) {
          return { safe: false, reason: inputValidation.reason };
        }
      }

    } catch (e) {
      this.logSecurityEvent({
        type: 'block',
        category: 'network',
        message: '无效的URL格式',
        details: `URL: ${url}, 错误: ${e instanceof Error ? e.message : String(e)}`,
        blocked: true
      });
      return { safe: false, reason: '无效的URL格式' };
    }

    return { safe: true };
  }

  checkRateLimit(identifier: string = 'default'): { allowed: boolean; reason?: string; remaining?: number } {
    if (!this.config.enableRateLimiting) {
      return { allowed: true };
    }

    const now = Date.now();
    const entry = this.rateLimitMap.get(identifier);

    if (!entry) {
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + 60000,
        lastRequest: now
      });
      return { allowed: true, remaining: this.config.maxRequestsPerMinute - 1 };
    }

    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + 60000;
      entry.lastRequest = now;
      return { allowed: true, remaining: this.config.maxRequestsPerMinute - 1 };
    }

    if (entry.count >= this.config.maxRequestsPerMinute) {
      this.logSecurityEvent({
        type: 'warning',
        category: 'rate_limit',
        message: '请求频率超限',
        details: `标识符: ${identifier}, 频率: ${entry.count}/分钟`,
        blocked: true
      });
      return {
        allowed: false,
        reason: `请求过于频繁，请等待 ${Math.ceil((entry.resetTime - now) / 1000)} 秒`,
        remaining: 0
      };
    }

    entry.count++;
    entry.lastRequest = now;
    return { allowed: true, remaining: this.config.maxRequestsPerMinute - entry.count };
  }

  requiresConfirmation(operation: string): boolean {
    if (!this.config.enableSensitiveOperationConfirmation) {
      return false;
    }

    const sensitiveOperations = [
      '删除文件',
      '格式化',
      '关闭系统',
      '修改系统设置',
      '创建用户',
      '删除用户',
      '修改密码',
      '网络连接',
      '下载文件',
      '安装软件',
      '卸载软件',
      '修改注册表',
      '执行命令',
      '访问敏感目录',
      '复制系统文件',
      '移动系统文件'
    ];

    return sensitiveOperations.some(sensitive =>
      operation.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  recordOperation(operation: string, confirmed: boolean): void {
    this.operationHistory.push({
      operation,
      timestamp: Date.now(),
      confirmed
    });

    if (this.operationHistory.length > 100) {
      this.operationHistory = this.operationHistory.slice(-50);
    }

    if (!confirmed) {
      this.logSecurityEvent({
        type: 'warning',
        category: 'sensitive',
        message: '敏感操作被拒绝',
        details: `操作: ${operation}`,
        blocked: true
      });
    }
  }

  detectAnomalousBehavior(input: string, context?: { recentInputs?: string[] }): {
    anomalous: boolean;
    reason?: string;
    risk: 'low' | 'medium' | 'high';
  } {
    if (!this.config.enableBehaviorDetection) {
      return { anomalous: false, risk: 'low' };
    }

    const recentInputs = context?.recentInputs || [];

    if (recentInputs.length >= 5) {
      const uniqueInputs = new Set(recentInputs);
      const repetitionRate = 1 - (uniqueInputs.size / recentInputs.length);

      if (repetitionRate > 0.8) {
        this.logSecurityEvent({
          type: 'warning',
          category: 'suspicious',
          message: '检测到异常的输入重复模式',
          details: `重复率: ${(repetitionRate * 100).toFixed(1)}%`,
          blocked: false
        });
        return {
          anomalous: true,
          reason: '输入重复率过高，可能是自动化攻击',
          risk: 'medium'
        };
      }
    }

    const inputPatterns = input.match(/\S+/g) || [];
    if (inputPatterns.length > 50) {
      this.logSecurityEvent({
        type: 'warning',
        category: 'suspicious',
        message: '检测到超长的单条输入',
        details: `输入长度: ${inputPatterns.length} 个词`,
        blocked: false
      });
      return {
        anomalous: true,
        reason: '输入长度异常，可能是恶意注入尝试',
        risk: 'medium'
      };
    }

    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = input.match(urlPattern) || [];
    if (urls.length > 3) {
      this.logSecurityEvent({
        type: 'warning',
        category: 'suspicious',
        message: '检测到多个URL链接',
        details: `URL数量: ${urls.length}`,
        blocked: false
      });
      return {
        anomalous: true,
        reason: '输入包含过多URL，可能是钓鱼攻击',
        risk: 'medium'
      };
    }

    const codePatterns = input.match(/```[\s\S]*?```/g) || [];
    if (codePatterns.length > 5) {
      this.logSecurityEvent({
        type: 'warning',
        category: 'suspicious',
        message: '检测到过多代码块',
        details: `代码块数量: ${codePatterns.length}`,
        blocked: false
      });
      return {
        anomalous: true,
        reason: '输入包含过多代码，可能是代码注入尝试',
        risk: 'low'
      };
    }

    return { anomalous: false, risk: 'low' };
  }

  private logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };
    this.securityEvents.push(fullEvent);

    if (this.securityEvents.length > 500) {
      this.securityEvents = this.securityEvents.slice(-250);
    }

    if (event.blocked) {
      console.warn('[AISecurityGuard] 🔒 安全事件:', fullEvent);
    } else if (event.type === 'warning') {
      console.warn('[AISecurityGuard] ⚠️ 警告:', fullEvent);
    }
  }

  getSecurityLogs(filter?: { type?: SecurityEvent['type']; category?: SecurityEvent['category']; since?: Date }): SecurityEvent[] {
    let logs = [...this.securityEvents];

    if (filter?.type) {
      logs = logs.filter(log => log.type === filter.type);
    }
    if (filter?.category) {
      logs = logs.filter(log => log.category === filter.category);
    }
    if (filter?.since) {
      logs = logs.filter(log => log.timestamp >= filter.since!);
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getSecurityStats(): {
    totalEvents: number;
    blockedEvents: number;
    warnings: number;
    byCategory: Record<string, number>;
    recentThreatLevel: 'low' | 'medium' | 'high';
  } {
    const stats = {
      totalEvents: this.securityEvents.length,
      blockedEvents: this.securityEvents.filter(e => e.blocked).length,
      warnings: this.securityEvents.filter(e => e.type === 'warning').length,
      byCategory: {} as Record<string, number>,
      recentThreatLevel: 'low' as 'low' | 'medium' | 'high'
    };

    for (const event of this.securityEvents) {
      stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1;
    }

    const recentEvents = this.securityEvents.filter(
      e => Date.now() - e.timestamp.getTime() < 300000
    );

    const recentBlocked = recentEvents.filter(e => e.blocked).length;
    if (recentBlocked > 10) {
      stats.recentThreatLevel = 'high';
    } else if (recentBlocked > 3) {
      stats.recentThreatLevel = 'medium';
    }

    return stats;
  }

  clearLogs(): void {
    this.securityEvents = [];
  }

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  addWhitelistDomain(domain: string): void {
    if (!this.config.whitelistDomains.includes(domain)) {
      this.config.whitelistDomains.push(domain);
    }
  }

  removeWhitelistDomain(domain: string): void {
    this.config.whitelistDomains = this.config.whitelistDomains.filter(d => d !== domain);
  }

  addBlacklistPattern(pattern: string): void {
    if (!this.config.blacklistPatterns.includes(pattern)) {
      this.config.blacklistPatterns.push(pattern);
    }
  }

  removeBlacklistPattern(pattern: string): void {
    this.config.blacklistPatterns = this.config.blacklistPatterns.filter(p => p !== pattern);
  }

  generateSecurityReport(): string {
    const stats = this.getSecurityStats();
    const recentLogs = this.getSecurityLogs({ since: new Date(Date.now() - 3600000) });

    let report = '=== AI安全防护报告 ===\n\n';
    report += `报告时间: ${new Date().toLocaleString()}\n\n`;
    report += `【统计概览】\n`;
    report += `- 总安全事件: ${stats.totalEvents}\n`;
    report += `- 拦截事件: ${stats.blockedEvents}\n`;
    report += `- 警告事件: ${stats.warnings}\n`;
    report += `- 当前威胁等级: ${stats.recentThreatLevel}\n\n`;
    report += `【分类统计】\n`;
    for (const [category, count] of Object.entries(stats.byCategory)) {
      report += `- ${category}: ${count}\n`;
    }
    report += '\n';

    if (recentLogs.length > 0) {
      report += `【最近1小时事件】\n`;
      for (const log of recentLogs.slice(0, 10)) {
        report += `[${log.timestamp.toLocaleTimeString()}] ${log.blocked ? '🔒' : '⚠️'} ${log.message}\n`;
        report += `   详情: ${log.details}\n`;
      }
    }

    return report;
  }
}

export const aiSecurityGuard = AISecurityGuard.getInstance();
