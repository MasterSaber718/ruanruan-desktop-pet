// ============================================================================
// Agent Hands System - AI双手系统
// 让AI可以自主控制电脑：执行命令、文件操作、进程管理等
// ============================================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getSystemSnapshot, getTimezoneInfo } from './systemInfo';

const execAsync = promisify(exec);

// 安全配置 - 允许执行的命令白名单
const ALLOWED_COMMANDS = [
  // 文件系统操作
  'ls', 'dir', 'cd', 'pwd', 'mkdir', 'touch', 'cat', 'type', 'echo',
  'copy', 'move', 'del', 'rm', 'rename', 'ren',
  // 系统信息
  'systeminfo', 'wmic', 'tasklist', 'netstat', 'ipconfig', 'ping',
  'hostname', 'whoami', 'date', 'time', 'echo',
  // 开发工具
  'npm', 'node', 'git', 'python', 'pip',
  // 文本处理
  'grep', 'find', 'sort', 'uniq', 'head', 'tail',
  // 进程管理（受限）
  'taskkill', 'kill',
];

// 禁止执行的命令黑名单
const BLOCKED_COMMANDS = [
  'format', 'fdisk', 'shutdown', 'restart', 'reboot',
  'reg', 'registry', 'net user', 'net localgroup',
  'passwd', 'chmod 777', 'chown root',
  'curl', 'wget', 'powershell -e', 'cmd /c',
  'rm -rf /', 'del /s /q C:',
];

// 安全检查函数
function isCommandSafe(command: string): { safe: boolean; reason?: string } {
  const cmdLower = command.toLowerCase().trim();
  
  // 检查黑名单
  for (const blocked of BLOCKED_COMMANDS) {
    if (cmdLower.includes(blocked.toLowerCase())) {
      return { safe: false, reason: `命令包含禁止的操作: ${blocked}` };
    }
  }
  
  // 检查危险模式
  const dangerousPatterns = [
    /\|\s*(rm|del|format|shutdown)/i,
    />\s*\/(etc|sys|windows)/i,
    /sudo\s+/i,
    /\$\(/i,  // 命令注入
    /`.*`/i,  // 命令替换
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return { safe: false, reason: '命令包含潜在危险的模式' };
    }
  }
  
  return { safe: true };
}

// 文件操作安全检查
function isPathSafe(filePath: string): { safe: boolean; reason?: string } {
  const resolvedPath = path.resolve(filePath);
  const homeDir = os.homedir();
  const projectDir = process.cwd();
  
  // 允许的目录范围
  const allowedDirs = [
    homeDir,
    projectDir,
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Desktop'),
    path.join(homeDir, 'Downloads'),
    '/tmp',
    'C:\\Temp',
  ];
  
  // 禁止访问的系统目录
  const blockedDirs = [
    '/etc', '/sys', '/proc', '/root',
    'C:\\Windows', 'C:\\Program Files', 'C:\\System32',
  ];
  
  for (const blocked of blockedDirs) {
    if (resolvedPath.toLowerCase().startsWith(blocked.toLowerCase())) {
      return { safe: false, reason: `禁止访问系统目录: ${blocked}` };
    }
  }
  
  return { safe: true };
}

// ============================================================================
// 命令执行模块
// ============================================================================

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  executionTime: number;
  command: string;
  error?: string;
}

export async function executeCommand(
  command: string,
  options: {
    timeout?: number;
    cwd?: string;
    requiresApproval?: boolean;
  } = {}
): Promise<CommandResult> {
  const startTime = Date.now();
  const timeout = options.timeout || 30000;
  
  // 安全检查
  const safetyCheck = isCommandSafe(command);
  if (!safetyCheck.safe) {
    return {
      success: false,
      stdout: '',
      stderr: '',
      executionTime: 0,
      command,
      error: safetyCheck.reason || '命令被安全策略阻止'
    };
  }
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      cwd: options.cwd || process.cwd(),
      windowsHide: true,
    });
    
    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      executionTime: Date.now() - startTime,
      command
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      executionTime: Date.now() - startTime,
      command,
      error: error.message
    };
  }
}

// ============================================================================
// 文件操作模块
// ============================================================================

export interface FileOperationResult {
  success: boolean;
  data?: string | Buffer | string[];
  path: string;
  operation: string;
  error?: string;
  size?: number;
}

export async function readFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<FileOperationResult> {
  const safetyCheck = isPathSafe(filePath);
  if (!safetyCheck.safe) {
    return {
      success: false,
      path: filePath,
      operation: 'read',
      error: safetyCheck.reason
    };
  }
  
  try {
    const content = await fs.readFile(filePath, encoding);
    const stats = await fs.stat(filePath);
    
    return {
      success: true,
      data: content,
      path: filePath,
      operation: 'read',
      size: stats.size
    };
  } catch (error: any) {
    return {
      success: false,
      path: filePath,
      operation: 'read',
      error: error.message
    };
  }
}

export async function writeFile(
  filePath: string,
  content: string | Buffer
): Promise<FileOperationResult> {
  const safetyCheck = isPathSafe(filePath);
  if (!safetyCheck.safe) {
    return {
      success: false,
      path: filePath,
      operation: 'write',
      error: safetyCheck.reason
    };
  }
  
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    
    return {
      success: true,
      path: filePath,
      operation: 'write',
      size: content.length
    };
  } catch (error: any) {
    return {
      success: false,
      path: filePath,
      operation: 'write',
      error: error.message
    };
  }
}

export async function listDirectory(
  dirPath: string
): Promise<FileOperationResult> {
  const safetyCheck = isPathSafe(dirPath);
  if (!safetyCheck.safe) {
    return {
      success: false,
      path: dirPath,
      operation: 'list',
      error: safetyCheck.reason
    };
  }
  
  try {
    const files = await fs.readdir(dirPath);
    const detailedFiles = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(dirPath, file);
        try {
          const stats = await fs.stat(fullPath);
          return {
            name: file,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime
          };
        } catch {
          return { name: file, type: 'unknown', size: 0, modified: new Date() };
        }
      })
    );
    
    return {
      success: true,
      data: detailedFiles as any,
      path: dirPath,
      operation: 'list'
    };
  } catch (error: any) {
    return {
      success: false,
      path: dirPath,
      operation: 'list',
      error: error.message
    };
  }
}

export async function createDirectory(
  dirPath: string
): Promise<FileOperationResult> {
  const safetyCheck = isPathSafe(dirPath);
  if (!safetyCheck.safe) {
    return {
      success: false,
      path: dirPath,
      operation: 'createDirectory',
      error: safetyCheck.reason
    };
  }
  
  try {
    await fs.mkdir(dirPath, { recursive: true });
    
    return {
      success: true,
      path: dirPath,
      operation: 'createDirectory'
    };
  } catch (error: any) {
    return {
      success: false,
      path: dirPath,
      operation: 'createDirectory',
      error: error.message
    };
  }
}

export async function deleteFile(
  filePath: string
): Promise<FileOperationResult> {
  const safetyCheck = isPathSafe(filePath);
  if (!safetyCheck.safe) {
    return {
      success: false,
      path: filePath,
      operation: 'delete',
      error: safetyCheck.reason
    };
  }
  
  try {
    await fs.unlink(filePath);
    
    return {
      success: true,
      path: filePath,
      operation: 'delete'
    };
  } catch (error: any) {
    return {
      success: false,
      path: filePath,
      operation: 'delete',
      error: error.message
    };
  }
}

// ============================================================================
// 进程管理模块
// ============================================================================

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}

export async function listProcesses(): Promise<ProcessInfo[]> {
  try {
    const result = await execAsync('tasklist /fo csv /nh', { timeout: 10000 });
    const lines = result.stdout.split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
      return {
        pid: parseInt(parts[1]) || 0,
        name: parts[0] || 'unknown',
        cpu: 0,
        memory: parseInt(parts[4]?.replace(/[^\d]/g, '')) || 0,
        status: 'running'
      };
    });
  } catch (error) {
    return [];
  }
}

export async function killProcess(pid: number): Promise<CommandResult> {
  return executeCommand(`taskkill /pid ${pid} /f`);
}

// ============================================================================
// 系统信息模块
// ============================================================================

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

export function getSystemInfo(): SystemInfo {
  return {
    platform: os.platform(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    cpuCount: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime(),
    currentDirectory: process.cwd()
  };
}

export interface SystemInfoExtended extends SystemInfo {
  osName: string;
  osVersion: string;
  bootTime: string;
  cpuUsagePercent: number | null;
  memoryUsagePercent: number;
  disks: Array<{ drive: string; total: number; free: number; used: number; usagePercent: number }>;
  time: {
    iso: string;
    formatted: string;
    timezone: string;
    region: string;
    week: string;
  };
}

/** 扩展系统信息：基础信息 + CPU 使用率、磁盘占用、系统时间/时区/地区（Windows 单次快照采集） */
export async function getExtendedSystemInfo(): Promise<SystemInfoExtended> {
  const base = getSystemInfo();
  const snapshot = getSystemSnapshot();
  const tz = getTimezoneInfo();
  const now = new Date();
  const memTotal = snapshot.os?.memTotal ?? base.totalMemory;
  const memFree = snapshot.os?.memFree ?? base.freeMemory;

  return {
    ...base,
    osName: snapshot.os?.caption || os.type(),
    osVersion: snapshot.os?.version || os.release(),
    bootTime: snapshot.os?.bootTime || new Date(Date.now() - os.uptime() * 1000).toISOString(),
    cpuUsagePercent: snapshot.cpuLoad,
    memoryUsagePercent: memTotal > 0 ? Math.round(((memTotal - memFree) / memTotal) * 1000) / 10 : 0,
    disks: snapshot.disks,
    time: {
      iso: now.toISOString(),
      formatted: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      timezone: tz.timeZone,
      region: tz.region,
      week: ['日', '一', '二', '三', '四', '五', '六'][now.getDay()],
    },
  };
}

// ============================================================================
// Agent Hands 统一接口
// ============================================================================

export interface AgentAction {
  type: 'command' | 'file_read' | 'file_write' | 'file_list' | 'file_delete' | 'directory_create' | 'process_list' | 'process_kill' | 'system_info';
  params: Record<string, any>;
  requiresApproval?: boolean;
  description?: string;
}

export interface AgentActionResult {
  success: boolean;
  result?: any;
  error?: string;
  action: AgentAction;
  executionTime: number;
  approved?: boolean;
}

export class AgentHands {
  private actionHistory: AgentActionResult[] = [];
  private maxHistorySize = 100;
  
  async execute(action: AgentAction): Promise<AgentActionResult> {
    const startTime = Date.now();
    let result: any;
    let success = false;
    let error: string | undefined;
    
    try {
      switch (action.type) {
        case 'command':
          const cmdResult = await executeCommand(action.params.command, {
            timeout: action.params.timeout,
            cwd: action.params.cwd
          });
          result = cmdResult;
          success = cmdResult.success;
          error = cmdResult.error;
          break;
          
        case 'file_read':
          const readResult = await readFile(action.params.path, action.params.encoding);
          result = readResult;
          success = readResult.success;
          error = readResult.error;
          break;
          
        case 'file_write':
          const writeResult = await writeFile(action.params.path, action.params.content);
          result = writeResult;
          success = writeResult.success;
          error = writeResult.error;
          break;
          
        case 'file_list':
          const listResult = await listDirectory(action.params.path);
          result = listResult;
          success = listResult.success;
          error = listResult.error;
          break;
          
        case 'file_delete':
          const deleteResult = await deleteFile(action.params.path);
          result = deleteResult;
          success = deleteResult.success;
          error = deleteResult.error;
          break;
          
        case 'directory_create':
          const mkdirResult = await createDirectory(action.params.path);
          result = mkdirResult;
          success = mkdirResult.success;
          error = mkdirResult.error;
          break;
          
        case 'process_list':
          result = await listProcesses();
          success = true;
          break;
          
        case 'process_kill':
          const killResult = await killProcess(action.params.pid);
          result = killResult;
          success = killResult.success;
          error = killResult.error;
          break;
          
        case 'system_info':
          result = await getExtendedSystemInfo();
          success = true;
          break;
          
        default:
          error = `未知的操作类型: ${action.type}`;
          success = false;
      }
    } catch (err: any) {
      error = err.message;
      success = false;
    }
    
    const actionResult: AgentActionResult = {
      success,
      result,
      error,
      action,
      executionTime: Date.now() - startTime
    };
    
    // 记录历史
    this.actionHistory.push(actionResult);
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory = this.actionHistory.slice(-this.maxHistorySize);
    }
    
    return actionResult;
  }
  
  getHistory(): AgentActionResult[] {
    return [...this.actionHistory];
  }
  
  getRecentActions(count: number = 10): AgentActionResult[] {
    return this.actionHistory.slice(-count);
  }
  
  clearHistory(): void {
    this.actionHistory = [];
  }
}

export const agentHands = new AgentHands();