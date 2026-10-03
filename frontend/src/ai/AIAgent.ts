// ============================================================================
// AI Agent Module - AI自主行动模块
// 让AI像人一样自主决定使用「双手」和「眼睛」来完成任务
// 底层架构重构：增加本地能力层，避免不必要的联网搜索
// ============================================================================

import { agentService, InformationSummary, CommandResult, WebPageContent } from '../services/AgentService';
import { eventBus } from './core/EventBus';
import { aiLogger } from './AILogger';

// ============================================================================
// 本地能力模块 - 不需要联网的本地操作
// ============================================================================

interface LocalCapabilityResult {
  success: boolean;
  data: unknown;
  response: string;
}

// 本地能力：时间查询
function getCurrentTime(): LocalCapabilityResult {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  return {
    success: true,
    data: { time: timeStr, date: dateStr, timestamp: now.getTime() },
    response: `现在是 ${dateStr} ${timeStr}`
  };
}

// 本地能力：日期查询
function getCurrentDate(): LocalCapabilityResult {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  return {
    success: true,
    data: { date: dateStr, timestamp: now.getTime() },
    response: `今天是 ${dateStr}`
  };
}

// 本地能力：计算
function calculate(expression: string): LocalCapabilityResult {
  try {
    // 安全检查：只允许数学运算
    const safeExpression = expression
      .replace(/[^0-9+\-*/().\s]/g, '')
      .trim();
    
    if (!safeExpression) {
      return {
        success: false,
        data: null,
        response: '请提供有效的数学表达式'
      };
    }
    
    // 使用 Function 构造函数替代 eval，限制全局作用域访问
    try {
      const calc = new Function(`"use strict"; return (${safeExpression});`);
      const result = calc();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        return {
          success: false,
          data: null,
          response: '计算结果无效'
        };
      }
      
      return {
        success: true,
        data: { expression: safeExpression, result },
        response: `${safeExpression} = ${result}`
      };
    } catch {
      return {
        success: false,
        data: null,
        response: '计算出错'
      };
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      response: `计算出错：${(error as Error).message}`
    };
  }
}

// 本地能力：倒计时
function setTimer(durationSeconds: number): LocalCapabilityResult {
  if (durationSeconds <= 0 || durationSeconds > 3600) {
    return {
      success: false,
      data: null,
      response: '倒计时时间必须在1秒到1小时之间'
    };
  }
  
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  
  // 触发倒计时事件
  eventBus.emit({ type: 'agent:timer_start', payload: { duration: durationSeconds } });
  
  // 倒计时逻辑（简化版）
  setTimeout(() => {
    eventBus.emit({ type: 'agent:timer_complete', payload: { duration: durationSeconds } });
  }, durationSeconds * 1000);
  
  return {
    success: true,
    data: { duration: durationSeconds, minutes, seconds },
    response: `已设置${minutes}分${seconds}秒倒计时，时间到我会提醒你`
  };
}

// 本地能力：系统信息
function getSystemInfo(): LocalCapabilityResult {
  const now = new Date();
  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  return {
    success: true,
    data: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: `${hours}小时${minutes}分钟`,
      timestamp: now.getTime()
    },
    response: `系统运行时间：${hours}小时${minutes}分钟\n平台：${process.platform}\nNode.js版本：${process.version}`
  };
}

// 本地能力映射
const LOCAL_CAPABILITIES: Record<string, (params?: any) => LocalCapabilityResult> = {
  time: getCurrentTime,
  date: getCurrentDate,
  calculate,
  timer: setTimer,
  systemInfo: getSystemInfo
};

// ============================================================================
// 意图识别 - 判断用户是否需要AI自主行动
// 底层重构：区分本地能力和远程能力
// ============================================================================

interface AgentIntent {
  needsAction: boolean;
  actionType: 'local' | 'search' | 'command' | 'file' | 'browse' | 'multi' | 'none';
  localCapability?: string;
  params: Record<string, any>;
  confidence: number;
  reasoning: string;
}

// 需要使用本地时间能力的关键词
const TIME_KEYWORDS = [
  '时间', '几点', '几点了', '现在', '钟点', '时钟',
  '时分', '时刻', '目前', '当前', '这会儿', '现在几点'
];

// 需要使用本地日期能力的关键词
const DATE_KEYWORDS = [
  '日期', '今天', '几号', '星期', '日历',
  '年月日', '今天几号', '今天星期', '今天日期'
];

// 需要使用计算能力的关键词
const CALC_KEYWORDS = [
  '计算', '算一下', '等于', '加', '减', '乘', '除',
  '多少', '总和', '合计', '结果', '答案',
  '数学', '公式', '表达式', '运算'
];

// 需要使用倒计时能力的关键词
const TIMER_KEYWORDS = [
  '倒计时', '定时', '提醒', '闹钟',
  '分钟', '秒', '小时', '计时', '倒数'
];

// 系统操作命令关键词（AI应该自己执行，而不是给教程）
const SYSTEM_OPERATION_KEYWORDS = [
  // 回收站操作
  '清空回收站', '清空垃圾桶', 'empty recycle', 'empty trash',
  '回收站', '垃圾桶',
  // 系统操作
  '关机', '重启', 'shutdown', 'restart', 'reboot',
  '注销', '锁屏', 'lock', 'logoff',
  '休眠', '睡眠', 'sleep', 'hibernate',
  // 截屏
  '截屏', '截图', 'screenshot', 'capture',
  // 打开/关闭应用
  '打开浏览器', '打开记事本', '打开计算器', '打开画图',
  '打开设置', '打开控制面板', '打开任务管理器',
  '关闭浏览器', '关闭窗口', '关闭程序',
  // 音量控制
  '调高音量', '调低音量', '静音', 'volume', 'mute',
  // 网络操作
  '连接网络', '断开网络', '连接wifi', '断开wifi',
  '刷新网络', '重置网络',
  // 清理操作
  '清理磁盘', '清理垃圾', '清理缓存', '清理临时文件',
  '磁盘清理', 'cache clean',
  // 其他系统操作
  '创建快捷方式', '设置壁纸', '更换壁纸', 'set wallpaper',
  '调整分辨率', '设置分辨率', 'set resolution',
  '打开命令行', '打开终端', 'open terminal', 'open cmd'
];

// 询问教程的关键词（用户想知道怎么做）
const TUTORIAL_QUESTION_KEYWORDS = [
  '怎么', '如何', '怎样', '怎么样', '方法',
  '步骤', '教程', '怎么弄', '怎么做',
  '教我', '告诉我怎么', '请问怎么',
  '怎样操作', '如何操作', '怎样做'
];

// 需要联网搜索的关键词
const SEARCH_KEYWORDS = [
  '搜索', '查找', '查询', '百度', '谷歌', '搜索一下', '帮我查', '查一下',
  '最新', '新闻', '资讯', '天气', '股票', '汇率', '价格',
  '什么是', '怎么样', '如何', '为什么', '介绍', '讲解', '说明',
  '百科', '维基', 'wiki', '知乎', '论坛', '网站',
  '报价', '评测', '对比', '推荐', '排行榜', '排名',
  '教程', '攻略', '方法', '技巧', '经验', '步骤',
  '定义', '概念', '原理', '知识', '了解', '学习',
  '是谁', '是什么', '有什么', '在哪里', '何时', '多少',
  '新闻头条', '热点', '热搜', '趋势', '预测', '分析',
  '资料', '文献', '论文', '报告', '数据', '统计'
];

// 需要执行命令的关键词
const COMMAND_KEYWORDS = [
  '执行', '运行', '命令', 'cmd', '终端', 'shell', 'terminal',
  '打开', '启动', '关闭', '停止', '重启', 'kill',
  '安装', '卸载', '更新', '下载', '安装包', 'setup',
  '编译', '构建', '打包', '部署', 'build', 'run',
  'git', 'npm', 'python', 'node', 'yarn', 'pip',
  '进程', '任务', '服务', '端口', 'task', 'service',
  '检查', '查看', '列出', '显示', 'find', 'list',
  '创建', '新建', '删除', '移除', 'mkdir', 'rm',
  '复制', '移动', '重命名', 'copy', 'move', 'rename',
  'ping', 'ipconfig', 'netstat', 'systeminfo', 'whoami',
  'clean', '清理', '清除', 'reset', 'restart'
];

// 需要文件操作的关键词
const FILE_KEYWORDS = [
  '文件', '目录', '文件夹', '路径', 'directory', 'folder',
  '读取', '写入', '创建', '删除', '修改', 'read', 'write',
  '查看', '列出', '显示', '内容', 'content', 'view',
  '保存', '加载', '导入', '导出', 'save', 'load',
  '日志', '配置', '代码', '脚本', 'log', 'config',
  '打开文件', '编辑文件', '新建文件', '删除文件',
  // 新增：文件查找相关关键词
  '桌面', '找', '查找', '搜索', '定位', '找到', '在哪里'
];

// 需要浏览网页的关键词
const BROWSE_KEYWORDS = [
  '网页', '网站', '链接', 'URL', '网址', 'web',
  '浏览', '访问', '打开网页', '抓取', 'crawl', 'scrape',
  '页面内容', '网页内容', '网站内容', 'html',
  '爬取', '抓取网页', '获取网页', 'download'
];

// 问题类型关键词（需要搜索的问题）
const QUESTION_TYPES = [
  /什么是\s*[？?]/,
  /为什么\s*[？?]/,
  /如何\s*[？?]/,
  /怎么样\s*[？?]/,
  /有什么\s*[？?]/,
  /在哪里\s*[？?]/,
  /有哪些\s*[？?]/,
  /是谁\s*[？?]/,
  /何时\s*[？?]/,
  /多少\s*[？?]/,
  /哪个\s*[？?]/,
  /哪一个\s*[？?]/,
  /怎么\s*[？?]/,
  /能否\s*[？?]/,
  /可以\s*[？?]/,
  /应该\s*[？?]/,
  /是否\s*[？?]/
];

function analyzeAgentIntent(userInput: string): AgentIntent {
  const inputLower = userInput.toLowerCase();
  
  // ==================== 第零层：系统操作命令检测（最高优先级） ====================
  // 区分"询问教程"和"命令执行"
  
  // 检查是否包含询问教程的关键词
  const hasTutorialQuestion = TUTORIAL_QUESTION_KEYWORDS.some(kw => inputLower.includes(kw));
  
  // 检查是否包含系统操作关键词
  const systemOperationMatches = SYSTEM_OPERATION_KEYWORDS.filter(kw => inputLower.includes(kw));
  
  if (systemOperationMatches.length >= 1) {
    // 如果包含询问教程关键词，说明用户想知道怎么做，不执行
    if (hasTutorialQuestion) {
      // 这是询问教程，让普通对话处理
      return {
        needsAction: false,
        actionType: 'none',
        params: {},
        confidence: 0,
        reasoning: '检测到询问教程意图，用户想知道怎么做'
      };
    }
    
    // 否则，这是命令执行意图，AI应该自己动手
    // 提取具体操作
    const operation = systemOperationMatches[0];
    
    // 根据操作类型生成对应的命令
    let command = '';
    switch (operation) {
      case '清空回收站':
      case '清空垃圾桶':
      case '回收站':
      case '垃圾桶':
        // 使用-Confirm:$false自动确认，并使用-ErrorAction SilentlyContinue忽略错误（回收站为空时）
        command = 'powershell.exe -NoProfile -Command "Clear-RecycleBin -Force -Confirm:$false -ErrorAction SilentlyContinue"';
        break;
      case '关机':
        command = 'shutdown /s /t 0';
        break;
      case '重启':
        command = 'shutdown /r /t 0';
        break;
      case '锁屏':
        command = 'rundll32.exe user32.dll,LockWorkStation';
        break;
      case '注销':
        command = 'shutdown /l';
        break;
      case '截屏':
      case '截图':
        command = 'powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds"';
        break;
      case '打开浏览器':
        command = 'start msedge';
        break;
      case '打开记事本':
        command = 'start notepad';
        break;
      case '打开计算器':
        command = 'start calc';
        break;
      case '打开命令行':
      case '打开终端':
        command = 'start cmd';
        break;
      case '打开任务管理器':
        command = 'start taskmgr';
        break;
      case '打开设置':
        command = 'start ms-settings:';
        break;
      case '打开控制面板':
        command = 'start control';
        break;
      default:
        command = operation;
    }
    
    return {
      needsAction: true,
      actionType: 'command',
      params: { command, operation },
      confidence: 0.95,
      reasoning: `检测到系统操作命令: ${operation}，AI应该自己执行`
    };
  }
  
  // ==================== 第一层：本地能力检测（优先级最高） ====================
  
  // 检测时间查询意图
  const timeMatches = TIME_KEYWORDS.filter(kw => inputLower.includes(kw));
  if (timeMatches.length >= 1) {
    // 强时间关键词检测
    const strongTimeKeywords = ['几点', '几点了', '现在几点', '时间'];
    const hasStrongKeyword = timeMatches.some(kw => strongTimeKeywords.includes(kw));
    
    if (hasStrongKeyword || timeMatches.length >= 2) {
      return {
        needsAction: true,
        actionType: 'local',
        localCapability: 'time',
        params: {},
        confidence: 0.95,
        reasoning: `检测到时间查询关键词: ${timeMatches.join(', ')}`
      };
    }
  }
  
  // 检测日期查询意图
  const dateMatches = DATE_KEYWORDS.filter(kw => inputLower.includes(kw));
  if (dateMatches.length >= 1) {
    const strongDateKeywords = ['几号', '今天', '星期', '日期'];
    const hasStrongKeyword = dateMatches.some(kw => strongDateKeywords.includes(kw));
    
    if (hasStrongKeyword || dateMatches.length >= 2) {
      return {
        needsAction: true,
        actionType: 'local',
        localCapability: 'date',
        params: {},
        confidence: 0.95,
        reasoning: `检测到日期查询关键词: ${dateMatches.join(', ')}`
      };
    }
  }
  
  // 检测计算意图
  const calcMatches = CALC_KEYWORDS.filter(kw => inputLower.includes(kw));
  if (calcMatches.length >= 1) {
    // 检查是否包含数学表达式
    const hasMathExpression = /[0-9]+\s*[+\-*/]\s*[0-9]+/.test(userInput);
    
    if (hasMathExpression || calcMatches.some(kw => ['计算', '算一下', '等于'].includes(kw))) {
      // 提取数学表达式
      const match = userInput.match(/([0-9+\-*/().\s]+)/);
      return {
        needsAction: true,
        actionType: 'local',
        localCapability: 'calculate',
        params: { expression: match ? match[1].trim() : userInput },
        confidence: 0.9,
        reasoning: `检测到计算意图: ${calcMatches.join(', ')}`
      };
    }
  }
  
  // 检测倒计时意图
  const timerMatches = TIMER_KEYWORDS.filter(kw => inputLower.includes(kw));
  if (timerMatches.length >= 1) {
    // 提取时间数值
    const timeMatch = userInput.match(/(\d+)\s*(秒|分钟|分|小时|时)/);
    let duration = 0;
    if (timeMatch) {
      const num = parseInt(timeMatch[1]);
      const unit = timeMatch[2];
      if (unit === '秒') duration = num;
      else if (unit === '分钟' || unit === '分') duration = num * 60;
      else if (unit === '小时' || unit === '时') duration = num * 3600;
    }
    
    return {
      needsAction: true,
      actionType: 'local',
      localCapability: 'timer',
      params: { duration },
      confidence: 0.85,
      reasoning: `检测到倒计时意图: ${timerMatches.join(', ')}`
    };
  }
  
  // 检测系统信息查询意图
  if (inputLower.includes('系统') && (inputLower.includes('运行') || inputLower.includes('版本') || inputLower.includes('时间'))) {
    return {
      needsAction: true,
      actionType: 'local',
      localCapability: 'systemInfo',
      params: {},
      confidence: 0.8,
      reasoning: '检测到系统信息查询意图'
    };
  }
  
  // ==================== 第二层：文件操作检测（必须在联网搜索之前） ====================
  
  // 检查文件操作意图（需要在联网搜索之前检测，因为"文件"会误匹配到搜索关键词）
  const fileMatches = FILE_KEYWORDS.filter(kw => inputLower.includes(kw));
  
  // 检测是否包含桌面相关关键词
  const hasDesktop = inputLower.includes('桌面');
  // 检测是否包含查找相关关键词
  const hasSearch = inputLower.includes('找') || inputLower.includes('查找') || inputLower.includes('搜索') || inputLower.includes('定位') || inputLower.includes('在哪里');
  
  // 如果有桌面关键词或者查找关键词，且有文件关键词，触发文件操作
  if (fileMatches.length >= 1 && (hasDesktop || hasSearch)) {
    // 提取文件名（查找操作）
    let fileName = '';
    let path = '';
    
    // 尝试提取文件名（中文或英文单词）
    const fileNamePatterns = [
      /(桌面|电脑上|本地)\s*(的)?\s*([\u4e00-\u9fa5a-zA-Z0-9._-]+)/i,
      /(找|查找|搜索|定位)\s*(一下)?\s*([\u4e00-\u9fa5a-zA-Z0-9._-]+)/i,
      /([\u4e00-\u9fa5a-zA-Z0-9._-]+)\s*(文件|文件夹|目录)/i,
    ];
    
    for (const pattern of fileNamePatterns) {
      const match = userInput.match(pattern);
      if (match) {
        fileName = match[match.length - 1];
        break;
      }
    }
    
    // 如果是桌面相关，设置桌面路径
    if (hasDesktop) {
      path = '%USERPROFILE%\\Desktop';
    }
    
    // 判断操作类型
    let operation = 'list';
    if (inputLower.includes('读取') || inputLower.includes('查看') || inputLower.includes('read')) {
      operation = 'read';
    } else if (inputLower.includes('写入') || inputLower.includes('保存') || inputLower.includes('write')) {
      operation = 'write';
    } else if (inputLower.includes('列出') || inputLower.includes('显示') || inputLower.includes('list')) {
      operation = 'list';
    } else if (inputLower.includes('删除') || inputLower.includes('remove') || inputLower.includes('delete')) {
      operation = 'delete';
    } else if (inputLower.includes('创建') || inputLower.includes('新建') || inputLower.includes('create')) {
      operation = 'create';
    } else if (hasSearch || fileName) {
      operation = 'search';
    }
    
    return {
      needsAction: true,
      actionType: 'file',
      params: { path, operation, fileName },
      confidence: hasDesktop || hasSearch ? 0.85 : 0.75,
      reasoning: `检测到文件操作关键词: ${fileMatches.join(', ')}`
    };
  }
  
  // 原有逻辑：至少2个文件关键词（排除桌面和搜索）
  const basicFileKeywords = ['目录', '文件夹', '路径', 'directory', 'folder',
    '读取', '写入', '创建', '删除', '修改', 'read', 'write',
    '查看', '列出', '显示', '内容', 'content', 'view',
    '保存', '加载', '导入', '导出', 'save', 'load',
    '日志', '配置', '代码', '脚本', 'log', 'config',
    '打开文件', '编辑文件', '新建文件', '删除文件'];
  const basicFileMatches = basicFileKeywords.filter(kw => inputLower.includes(kw));
  if (basicFileMatches.length >= 2) {
    const pathPatterns = [
      /文件\s*[:：]\s*([^\s,]+)/i,
      /路径\s*[:：]\s*([^\s,]+)/i,
      /([A-Za-z]:\\[^\s]+)/i,
      /(\/[^\s]+\.[a-z]+)/i,
    ];
    
    let path = '';
    for (const pattern of pathPatterns) {
      const match = userInput.match(pattern);
      if (match) {
        path = match[1];
        break;
      }
    }
    
    const operation = inputLower.includes('读取') || inputLower.includes('查看') || inputLower.includes('read') ? 'read'
      : inputLower.includes('写入') || inputLower.includes('保存') || inputLower.includes('write') ? 'write'
      : inputLower.includes('列出') || inputLower.includes('显示') || inputLower.includes('list') ? 'list'
      : inputLower.includes('删除') || inputLower.includes('remove') || inputLower.includes('delete') ? 'delete'
      : inputLower.includes('创建') || inputLower.includes('新建') || inputLower.includes('create') ? 'create'
      : 'read';
    
    return {
      needsAction: true,
      actionType: 'file',
      params: { path, operation },
      confidence: 0.75,
      reasoning: `检测到文件操作关键词: ${basicFileMatches.join(', ')}`
    };
  }
  
  // ==================== 第三层：联网能力检测 ====================
  
  // 检查问题类型（需要搜索）
  for (const pattern of QUESTION_TYPES) {
    if (pattern.test(userInput)) {
      const query = userInput.replace(/[？?]/g, '').trim();
      const hasCommandKeyword = COMMAND_KEYWORDS.some(kw => inputLower.includes(kw));
      
      if (!hasCommandKeyword) {
        return {
          needsAction: true,
          actionType: 'search',
          params: { query },
          confidence: 0.9,
          reasoning: `检测到问题类型，需要搜索相关信息`
        };
      }
    }
  }
  
  // 检查搜索意图
  const searchMatches = SEARCH_KEYWORDS.filter(kw => inputLower.includes(kw));
  if (searchMatches.length >= 1) {
    const strongSearchKeywords = ['搜索', '查找', '查询', '查一下', '帮我查'];
    const hasStrongKeyword = searchMatches.some(kw => strongSearchKeywords.includes(kw));
    
    if (hasStrongKeyword || searchMatches.length >= 2) {
      let query = userInput;
      for (const kw of SEARCH_KEYWORDS) {
        query = query.replace(new RegExp(kw, 'gi'), '');
      }
      query = query.replace(/[，,。！？、]/g, '').trim();
      
      return {
        needsAction: true,
        actionType: 'search',
        params: { query: query || userInput },
        confidence: hasStrongKeyword ? 0.9 : 0.8,
        reasoning: `检测到搜索关键词: ${searchMatches.join(', ')}`
      };
    }
  }
  
  // 检查命令执行意图
  const commandMatches = COMMAND_KEYWORDS.filter(kw => inputLower.includes(kw));
  if (commandMatches.length >= 1) {
    let command = '';
    const commandPatterns = [
      { pattern: /执行\s*[`'"]?([^`'"]+)[`'"]?/i, extract: 1 },
      { pattern: /运行\s*[`'"]?([^`'"]+)[`'"]?/i, extract: 1 },
      { pattern: /命令\s*[:：]\s*([^,\n]+)/i, extract: 1 },
      { pattern: /(npm|git|python|node|yarn|pip)\s+([a-z]+)/i, extract: 0 },
      { pattern: /(ping|ipconfig|netstat|tasklist)\s*[^\s]*/i, extract: 0 },
    ];
    
    for (const { pattern, extract } of commandPatterns) {
      const match = userInput.match(pattern);
      if (match) {
        command = extract === 0 ? match[0] : match[extract];
        break;
      }
    }
    
    if (!command && commandMatches.some(kw => ['执行', '运行', '命令'].includes(kw))) {
      return {
        needsAction: true,
        actionType: 'command',
        params: { command: '', needsClarification: true },
        confidence: 0.6,
        reasoning: '检测到命令执行意图，但需要用户明确具体命令'
      };
    }
    
    if (command) {
      return {
        needsAction: true,
        actionType: 'command',
        params: { command: command.trim() },
        confidence: 0.85,
        reasoning: `检测到命令关键词: ${commandMatches.join(', ')}`
      };
    }
  }
  
  // 检查网页浏览意图
  const browseMatches = BROWSE_KEYWORDS.filter(kw => inputLower.includes(kw));
  if (browseMatches.length >= 1 || inputLower.includes('http') || inputLower.includes('www.')) {
    const urlMatch = userInput.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
    const url = urlMatch ? urlMatch[1] : '';
    
    return {
      needsAction: true,
      actionType: 'browse',
      params: { url: url || userInput },
      confidence: 0.85,
      reasoning: `检测到网页浏览关键词: ${browseMatches.join(', ')}`
    };
  }
  
  // 检查是否需要最新信息
  const needsLatestInfo = [
    '今天', '现在', '最近', '最新', '今日', '当前',
    '最近的', '最新的', '今天的', '现在的'
  ].some(kw => inputLower.includes(kw));
  
  if (needsLatestInfo) {
    // 排除已经被本地能力处理的情况
    if (!timeMatches.length && !dateMatches.length) {
      return {
        needsAction: true,
        actionType: 'search',
        params: { query: userInput },
        confidence: 0.7,
        reasoning: '检测到时间相关词汇，可能需要最新信息'
      };
    }
  }
  
  // 检查复合意图
  const allMatches = [...searchMatches, ...commandMatches, ...fileMatches, ...browseMatches];
  if (allMatches.length >= 2) {
    return {
      needsAction: true,
      actionType: 'multi',
      params: { originalInput: userInput },
      confidence: 0.65,
      reasoning: `检测到多种意图关键词: ${allMatches.join(', ')}`
    };
  }
  
  return {
    needsAction: false,
    actionType: 'none',
    params: {},
    confidence: 0,
    reasoning: '未检测到需要自主行动的意图'
  };
}

// ============================================================================
// AI Agent 核心类
// ============================================================================

export interface AgentActionResult {
  success: boolean;
  actionType: string;
  result?: any;
  error?: string;
  executionTime: number;
  aiResponse: string;
}

export class AIAgent {
  private actionHistory: AgentActionResult[] = [];
  private maxHistorySize = 100;
  private isActing = false;
  
  // 处理用户输入，判断是否需要自主行动
  async process(userInput: string): Promise<AgentActionResult | null> {
    const intent = analyzeAgentIntent(userInput);
    
    if (!intent.needsAction) {
      return null;
    }
    
    aiLogger.info('AIAgent', `检测到自主行动意图: ${intent.actionType}`, {
      reasoning: intent.reasoning,
      confidence: intent.confidence
    });
    
    eventBus.emit({
      type: 'agent:action_start',
      payload: {
        actionType: intent.actionType,
        params: intent.params,
        reasoning: intent.reasoning
      }
    });
    
    this.isActing = true;
    const startTime = Date.now();
    
    let result: any;
    let success = false;
    let error: string | undefined;
    let aiResponse = '';
    
    try {
      switch (intent.actionType) {
        case 'local':
          // 本地能力：直接执行，不需要联网
          result = this.performLocalAction(intent.localCapability!, intent.params);
          success = result.success;
          aiResponse = result.response;
          break;
          
        case 'search':
          result = await this.performSearch(intent.params.query);
          success = result !== null;
          aiResponse = this.generateSearchResponse(result, intent.params.query);
          break;
          
        case 'command':
          // 如果需要澄清，返回追问
          if (intent.params.needsClarification) {
            aiResponse = '请告诉我你想执行什么具体命令？例如："执行 npm install" 或 "运行 git status"';
            success = true;
            break;
          }
          result = await this.performCommand(intent.params.command, intent.params.operation);
          success = result.success;
          aiResponse = this.generateCommandResponse(result, intent.params.command);
          error = result.error;
          break;
          
        case 'file':
          result = await this.performFileOperation(intent.params as any);
          success = result.success;
          aiResponse = this.generateFileResponse(result, intent.params as any);
          error = result.error;
          break;
          
        case 'browse':
          result = await this.performBrowse(intent.params.url);
          success = result !== null;
          aiResponse = this.generateBrowseResponse(result, intent.params.url);
          break;
          
        case 'multi':
          result = await this.performMultiAction(intent.params.originalInput);
          success = true;
          aiResponse = this.generateMultiResponse(result);
          break;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      error = errMsg;
      success = false;
      aiResponse = `抱歉，我在执行操作时遇到了问题：${errMsg}`;
    }
    
    this.isActing = false;
    const executionTime = Date.now() - startTime;
    
    const actionResult: AgentActionResult = {
      success,
      actionType: intent.actionType,
      result,
      error,
      executionTime,
      aiResponse
    };
    
    this.actionHistory.push(actionResult);
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory = this.actionHistory.slice(-this.maxHistorySize);
    }
    
    eventBus.emit({ type: 'agent:action_complete', payload: actionResult });
    
    return actionResult;
  }
  
  // 执行本地操作
  private performLocalAction(capability: string, params: Record<string, any>): LocalCapabilityResult {
    aiLogger.info('AIAgent', `执行本地能力: ${capability}`, { params });
    
    const handler = LOCAL_CAPABILITIES[capability];
    if (handler) {
      const result = handler(params);
      aiLogger.info('AIAgent', `本地能力执行完成: ${capability}`, { success: result.success });
      return result;
    }
    
    return {
      success: false,
      data: null,
      response: `未知的本地能力: ${capability}`
    };
  }
  
  // 执行搜索
  private async performSearch(query: string): Promise<InformationSummary | null> {
    aiLogger.info('AIAgent', `正在搜索: ${query}`);
    const summary = await agentService.look(query);
    
    if (summary) {
      aiLogger.info('AIAgent', `搜索完成，找到 ${summary.sources.length} 个结果`, {
        confidence: summary.confidence,
        searchTime: summary.searchTime
      });
    }
    
    return summary;
  }
  
  // 执行命令
  private async performCommand(command: string, operation?: string): Promise<CommandResult & { operation?: string }> {
    aiLogger.info('AIAgent', `正在执行命令: ${command}`, { operation });
    const result = await agentService.do(command);
    
    aiLogger.info('AIAgent', `命令执行完成`, {
      success: result.success,
      executionTime: result.executionTime
    });
    
    // 附加操作类型
    return { ...result, operation };
  }
  
  // 执行文件操作
  private async performFileOperation(params: { path: string; operation: string; fileName?: string; content?: string }): Promise<any> {
    aiLogger.info('AIAgent', `正在执行文件操作: ${params.operation}`, { path: params.path, fileName: params.fileName });
    
    let result;
    switch (params.operation) {
      case 'read':
        result = await agentService.hands.readFile(params.path);
        break;
      case 'write':
        result = await agentService.hands.writeFile(params.path, params.content || '');
        break;
      case 'list':
        result = await agentService.hands.listDirectory(params.path);
        break;
      case 'delete':
        result = await agentService.hands.deleteFile(params.path);
        break;
      case 'create':
        result = await agentService.hands.createDirectory(params.path);
        break;
      case 'search': {
        // 搜索文件操作：使用命令执行来搜索文件
        const fileName = params.fileName || '';
        
        if (fileName) {
          // 构建搜索命令，使用-Name只输出文件名，避免format被拦截
          const searchCommand = `powershell.exe -NoProfile -Command "Get-ChildItem -Path ([Environment]::GetFolderPath('Desktop')) -Recurse -Filter '*${fileName}*' -ErrorAction SilentlyContinue | Select-Object FullName,Length | Out-String -Width 200"`;
          result = await agentService.do(searchCommand);
        } else {
          // 列出桌面内容
          const listCommand = `powershell.exe -NoProfile -Command "Get-ChildItem -Path ([Environment]::GetFolderPath('Desktop')) -ErrorAction SilentlyContinue | Select-Object Name,Length | Out-String -Width 200"`;
          result = await agentService.do(listCommand);
        }
        break;
      }
      default:
        result = await agentService.hands.readFile(params.path);
    }
    
    return result;
  }
  
  // 执行网页浏览
  private async performBrowse(url: string): Promise<WebPageContent | null> {
    aiLogger.info('AIAgent', `正在浏览网页: ${url}`);
    const page = await agentService.see(url);
    
    if (page) {
      aiLogger.info('AIAgent', `网页抓取完成`, {
        title: page.title,
        contentLength: page.content.length
      });
    }
    
    return page;
  }
  
  // 执行复合操作
  private async performMultiAction(originalInput: string): Promise<any[]> {
    const results = [];
    const searchResult = await this.performSearch(originalInput);
    if (searchResult) {
      results.push({ type: 'search', result: searchResult });
    }
    return results;
  }
  
  // 生成搜索响应
  private generateSearchResponse(summary: InformationSummary | null, query: string): string {
    if (!summary) {
      return `我尝试搜索"${query}"，但没有找到相关信息。可能网络连接有问题，或者这个话题比较特殊。`;
    }
    
    let response = `我帮你搜索了"${query}"，找到了一些信息：\n\n`;
    
    if (summary.keyPoints.length > 0) {
      response += `**主要发现：**\n`;
      for (const point of summary.keyPoints.slice(0, 3)) {
        response += `- ${point}\n`;
      }
      response += '\n';
    }
    
    if (summary.aggregatedContent) {
      response += `**详细信息：**\n${summary.aggregatedContent.slice(0, 500)}...\n\n`;
    }
    
    response += `(信息置信度: ${Math.round(summary.confidence * 100)}%，搜索耗时: ${summary.searchTime}ms)`;
    
    return response;
  }
  
  // 生成命令响应
  private generateCommandResponse(result: CommandResult, command: string): string {
    // 检查是否是系统操作命令
    const operation = result.operation || '';
    
    if (!result.success) {
      // 如果是系统操作命令失败，给出更友好的提示
      if (operation) {
        return `我尝试执行"${operation}"操作，但遇到了问题：\n${result.error || result.stderr}\n\n可能需要管理员权限，或者这个操作在你的系统上不支持。`;
      }
      return `我尝试执行命令"${command}"，但遇到了问题：\n${result.error || result.stderr}\n\n可能这个命令需要特殊权限或者格式不对。`;
    }
    
    // 如果是系统操作命令成功，给出简洁确认
    if (operation) {
      switch (operation) {
        case '清空回收站':
        case '清空垃圾桶':
        case '回收站':
        case '垃圾桶':
          if (result.success) {
            return `✅ 已帮你清空回收站！`;
          } else {
            // 检查是否是因为回收站为空
            const stderr = result.stderr || '';
            if (stderr.includes('找不到') || stderr.includes('Empty') || stderr.includes('Failed')) {
              return `✅ 回收站已经是空的，无需清理。`;
            }
            return `⚠️ 清空回收站可能需要管理员权限。如果你看到桌面上的回收站图标里有文件，可以尝试右键"清空回收站"来手动清理。`;
          }
        case '关机':
          return `⚠️ 正在执行关机操作...`;
        case '重启':
          return `⚠️ 正在执行重启操作...`;
        case '锁屏':
          return `✅ 已帮你锁屏！`;
        case '截屏':
        case '截图':
          return `✅ 截屏已完成！`;
        case '打开浏览器':
          return `✅ 已帮你打开浏览器！`;
        case '打开记事本':
          return `✅ 已帮你打开记事本！`;
        case '打开计算器':
          return `✅ 已帮你打开计算器！`;
        case '打开命令行':
        case '打开终端':
          return `✅ 已帮你打开命令行窗口！`;
        case '打开任务管理器':
          return `✅ 已帮你打开任务管理器！`;
        case '打开设置':
          return `✅ 已帮你打开系统设置！`;
        case '打开控制面板':
          return `✅ 已帮你打开控制面板！`;
        default:
          return `✅ "${operation}"操作已完成！`;
      }
    }
    
    // 普通命令执行响应
    let response = `我成功执行了命令"${command}"：\n\n`;
    
    if (result.stdout) {
      response += `**输出结果：**\n${result.stdout.slice(0, 1000)}\n\n`;
    }
    
    if (result.stderr) {
      response += `**警告信息：**\n${result.stderr.slice(0, 500)}\n\n`;
    }
    
    response += `(执行耗时: ${result.executionTime}ms)`;
    
    return response;
  }
  
  // 生成文件操作响应
  private generateFileResponse(result: any, params: { path: string; operation: string; fileName?: string }): string {
    // 搜索操作的结果是命令执行结果
    if (params.operation === 'search') {
      if (!result.success) {
        return `我尝试搜索文件"${params.fileName}"，但遇到了问题：\n${result.error || result.stderr}`;
      }
      
      const output = result.stdout || '';
      if (!output || output.trim() === '') {
        return `我在你的电脑上搜索了"${params.fileName}"，但没有找到相关文件。你可以检查一下文件名是否正确。`;
      }
      
      return `我在你的电脑上找到了"${params.fileName}"相关的文件：\n\n${output}`;
    }
    
    // 其他文件操作
    if (!result.success) {
      return `我尝试对文件"${params.path}"执行${params.operation}操作，但失败了：\n${result.error}`;
    }
    
    switch (params.operation) {
      case 'read':
        return `我读取了文件"${params.path}"的内容：\n\n${(result.content || '').slice(0, 1000)}...\n\n(文件大小: ${result.size}字节)`;
      case 'list': {
        const files = result.files || [];
        return `我列出了目录"${params.path}"的内容：\n\n${files.map((f: { type: string; name: string; size: number }) => `${f.type === 'directory' ? '📁' : '📄'} ${f.name} (${f.size}字节)`).join('\n')}`;
      }
      case 'write':
        return `我成功写入文件"${params.path}"，写入 ${result.size} 字节。`;
      case 'delete':
        return `我成功删除了文件"${params.path}"。`;
      case 'create':
        return `我成功创建了目录"${params.path}"。`;
      default:
        return `文件操作完成。`;
    }
  }
  
  // 生成网页浏览响应
  private generateBrowseResponse(page: WebPageContent | null, url: string): string {
    if (!page) {
      return `我尝试访问网页"${url}"，但无法获取内容。可能网址无效或者网络有问题。`;
    }
    
    let response = `我浏览了网页"${url}"，获取了以下信息：\n\n`;
    response += `**标题：** ${page.title}\n\n`;
    response += `**内容摘要：**\n${page.summary.slice(0, 500)}...\n\n`;
    
    if (page.metadata.author) {
      response += `**作者：** ${page.metadata.author}\n`;
    }
    if (page.metadata.publishDate) {
      response += `**发布时间：** ${page.metadata.publishDate}\n`;
    }
    
    response += `\n(抓取耗时: ${page.fetchTime}ms)`;
    
    return response;
  }
  
  // 生成复合操作响应
  private generateMultiResponse(results: any[]): string {
    return `我执行了多个操作来帮你完成任务：\n\n${results.map(r => `- ${r.type}: 完成`).join('\n')}`;
  }
  
  // 获取状态
  getStatus(): {
    isActing: boolean;
    historyCount: number;
    recentActions: AgentActionResult[];
    availableCapabilities: string[];
  } {
    return {
      isActing: this.isActing,
      historyCount: this.actionHistory.length,
      recentActions: this.actionHistory.slice(-5),
      availableCapabilities: ['time', 'date', 'calculate', 'timer', 'systemInfo', 'search', 'command', 'file', 'browse']
    };
  }
  
  // 获取历史
  getHistory(): AgentActionResult[] {
    return [...this.actionHistory];
  }
  
  // 清除历史
  clearHistory(): void {
    this.actionHistory = [];
  }
  
  // 检查是否正在行动
  isCurrentlyActing(): boolean {
    return this.isActing;
  }
}

// 导出单例
export const aiAgent = new AIAgent();