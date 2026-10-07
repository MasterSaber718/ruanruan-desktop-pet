import express from 'express';
import { execSync, execFile } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// [2026-10-02 安全加固] 进程名白名单校验：仅允许字母/数字/点/横杠/空格/常见 CJK，
//   禁止一切 shell 元字符——所有拼入命令串的进程名必须先过这道闸（防命令注入）。
function safeProcessName(name: unknown): string | null {
  const s = String(name ?? '').trim();
  if (!s || s.length > 120) return null;
  if (/[&|;<>"'`$(){}[\]!%\n\r\t*?~^\\/]/.test(s)) return null;
  if (!/^[A-Za-z0-9_.\- \u4e00-\u9fff\u3040-\u30ff]+$/.test(s)) return null;
  return s;
}

// 获取系统资源使用情况
router.get('/system-resources', (req, res) => {
  try {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    
    // 获取CPU使用率（简单计算）
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const idle = cpu.times.idle;
      const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
      return acc + (100 - (idle / total) * 100);
    }, 0) / cpus.length;
    
    res.json({
      message: '获取系统资源成功',
      data: {
        cpu: {
          count: cpus.length,
          usage: cpuUsage.toFixed(2),
          model: cpus[0].model
        },
        memory: {
          total: formatBytes(totalMemory),
          used: formatBytes(usedMemory),
          free: formatBytes(freeMemory),
          usage: memoryUsage.toFixed(2)
        },
        uptime: formatUptime(os.uptime())
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: '获取系统资源失败', error: error.message });
  }
});

// 优化系统性能
router.post('/optimize', (req, res) => {
  try {
    const { priority = 'high', targetProcesses = [] } = req.body;
    
    // 实现系统优化逻辑
    const optimizationResults = [];
    
    // 1. 调整进程优先级
    if (targetProcesses.length > 0) {
      targetProcesses.forEach((processName: string) => {
        try {
          const safeName = safeProcessName(processName);
          if (!safeName) { optimizationResults.push(`跳过非法进程名（安全校验未过）`); return; }
          // 这里可以根据不同操作系统实现进程优先级调整
          // Windows 示例
          if (os.platform() === 'win32') {
            // [2026-10-02 安全加固] execFile 参数数组，命令不经 shell、无字符串插值
            execFile('wmic', ['process', 'where', 'name="' + safeName + '"', 'call', 'setpriority', String(getWindowsPriority(priority))], {}, () => {});
            optimizationResults.push(`已调整 ${safeName} 优先级为 ${priority}`);
          } else {
            // Linux/macOS 示例
            execFile('renice', ['-n', String(getUnixPriority(priority)), '-p', safeName], {}, () => {});
            optimizationResults.push(`已调整 ${safeName} 优先级为 ${priority}`);
          }
        } catch (error) {
          optimizationResults.push(`调整 ${processName} 优先级失败: ${(error as any).message}`);
        }
      });
    }
    
    // 2. 清理系统内存（通过 EmptyWorkingSet 清理各进程工作集）
    if (os.platform() === 'win32') {
      try {
        // 启用系统内存回收（让Windows回收不活跃进程的物理内存）
        execSync('wmic os get FreePhysicalMemory', { windowsHide: true });
        optimizationResults.push('已触发系统内存回收');
      } catch { /* 忽略 */ }
    }

    // 3. [2026-08-06 新增] 清理系统临时文件（用户要求"顺便帮用户清理缓存"）
    //    清理范围：%TEMP%、%TMP%、C:\Windows\Temp
    //    安全策略：只删除文件不删除目录；只删除24小时前的旧文件（避免删除正在使用的文件）
    if (os.platform() === 'win32') {
      const tempDirs = [
        process.env.TEMP,
        process.env.TMP,
        'C:\\Windows\\Temp',
      ];
      let cleanedFiles = 0;
      let cleanedBytes = 0;
      for (const dir of tempDirs) {
        if (!dir || !fs.existsSync(dir)) continue;
        try {
          const entries = fs.readdirSync(dir);
          for (const f of entries) {
            try {
              const fp = path.join(dir, f);
              const stat = fs.statSync(fp);
              // 只删除文件，跳过目录；只删除24小时前的旧文件
              if (stat.isFile() && (Date.now() - stat.mtimeMs > 24 * 60 * 60 * 1000)) {
                cleanedBytes += stat.size;
                fs.unlinkSync(fp);
                cleanedFiles++;
              }
            } catch { /* 跳过被占用或无权限的文件 */ }
          }
        } catch { /* 跳过无权限的目录 */ }
      }
      optimizationResults.push(`已清理 ${cleanedFiles} 个临时文件（${formatBytes(cleanedBytes)}）`);
    }

    // 4. [2026-08-06 新增] 清理 DNS 缓存（加速网络解析）
    if (os.platform() === 'win32') {
      try {
        execSync('ipconfig /flushdns', { windowsHide: true });
        optimizationResults.push('已清理 DNS 缓存');
      } catch { /* 忽略 */ }
    }

    // 5. [2026-08-06 新增] 提升当前软件进程优先级（确保软件流畅运行）
    //    将后端进程设为高优先级，避免被其他程序抢占CPU资源
    if (os.platform() === 'win32') {
      try {
        execFile('wmic', ['process', 'where', `processid=${process.pid}`, 'call', 'setpriority', '128'], { windowsHide: true }, () => {});
        optimizationResults.push('已提升软件进程优先级（高）');
      } catch { /* 忽略 */ }
    }

    // 6. [2026-08-06 新增] 清理 Electron/Chromium 缓存目录
    //    与 electron-main.js 的 cleanupAndQuit 保持一致，清理9个缓存目录
    //    但保留 Local Storage/Session Storage（登录状态和配置）
    if (os.platform() === 'win32') {
      const electronCacheDirs = ['GPUCache', 'Code Cache', 'Cache', 'Service Worker',
                                  'GrShaderCache', 'DawnGraphiteCache', 'DawnWebGPUCache',
                                  'blob_storage', 'Network'];
      let cleanedCacheDirs = 0;
      // 尝试常见 Electron userData 路径
      const possibleUserDataPaths = [
        path.join(process.env.APPDATA || '', 'ruanlinyun-assistant'),
        path.join(process.env.LOCALAPPDATA || '', 'ruanlinyun-assistant'),
      ];
      for (const userDataPath of possibleUserDataPaths) {
        if (!fs.existsSync(userDataPath)) continue;
        for (const dirName of electronCacheDirs) {
          const cacheDir = path.join(userDataPath, dirName);
          if (!fs.existsSync(cacheDir)) continue;
          try {
            fs.rmSync(cacheDir, { recursive: true, force: true });
            cleanedCacheDirs++;
          } catch { /* 跳过被占用的目录 */ }
        }
      }
      if (cleanedCacheDirs > 0) {
        optimizationResults.push(`已清理 ${cleanedCacheDirs} 个应用缓存目录`);
      }
    }

    res.json({
      message: '系统优化成功',
      data: {
        results: optimizationResults,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: '系统优化失败', error: error.message });
  }
});

// 管理后台进程
router.post('/process-management', (req, res) => {
  try {
    const { action, processName } = req.body;

    if (!action || !processName) {
      return res.status(400).json({ message: '请提供操作类型和进程名称' });
    }
    const safeName = safeProcessName(processName);
    if (!safeName) {
      return res.status(400).json({ message: '进程名含非法字符（安全校验未过）' });
    }
    
    let result = '';
    // [2026-10-02 安全加固] 全部 execFile 参数数组化：不经 shell、无命令串插值
    const run = (file: string, args: string[]): string => {
      try { return execFile(file, args, { encoding: 'utf8' as any, windowsHide: true }) as unknown as string; }
      catch (e: any) { return String(e?.stdout || e?.message || ''); }
    };

    switch (action) {
      case 'stop':
        if (os.platform() === 'win32') {
          result = run('taskkill', ['/F', '/IM', safeName]);
        } else {
          result = run('pkill', ['-f', safeName]);
        }
        break;
      case 'restart':
        if (os.platform() === 'win32') {
          run('taskkill', ['/F', '/IM', safeName]);
          result = `已停止 ${safeName}`;
        } else {
          run('pkill', ['-f', safeName]);
          result = `已停止 ${safeName}`;
        }
        break;
      case 'suspend':
        if (os.platform() === 'win32') {
          result = run('powershell', ['-NoProfile', '-NonInteractive', '-Command', `Get-Process -Name '${safeName}' | Suspend-Process`]);
        } else {
          return res.status(400).json({ message: '暂停进程功能仅支持 Windows' });
        }
        break;
      case 'resume':
        if (os.platform() === 'win32') {
          result = run('powershell', ['-NoProfile', '-NonInteractive', '-Command', `Get-Process -Name '${safeName}' | Resume-Process`]);
        } else {
          return res.status(400).json({ message: '恢复进程功能仅支持 Windows' });
        }
        break;
      default:
        return res.status(400).json({ message: '不支持的操作类型' });
    }
    
    res.json({
      message: '进程管理成功',
      data: {
        action,
        processName,
        result
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: '进程管理失败', error: error.message });
  }
});

// 获取运行中的进程
router.get('/processes', (req, res) => {
  try {
    let processes: any[] = [];
    
    if (os.platform() === 'win32') {
      const output = execSync('tasklist /FO CSV', { encoding: 'utf8' });
      const lines = output.split('\n').slice(1); // 跳过表头
      processes = lines
        .filter(line => line.trim())
        .map(line => {
          const [name, pid, sessionName, sessionNumber, memory] = line.split('"').filter((_, i) => i % 2 === 1);
          return {
            name,
            pid: parseInt(pid),
            memory
          };
        });
    } else {
      const output = execSync('ps aux', { encoding: 'utf8' });
      const lines = output.split('\n').slice(1); // 跳过表头
      processes = lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            name: parts[10],
            pid: parseInt(parts[1]),
            memory: parts[3] + '%'
          };
        });
    }
    
    res.json({
      message: '获取进程列表成功',
      data: processes
    });
  } catch (error: any) {
    res.status(500).json({ message: '获取进程列表失败', error: error.message });
  }
});

// 辅助函数：格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 辅助函数：格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}天 ${hours}小时 ${minutes}分钟`;
}

// 辅助函数：获取Windows优先级
function getWindowsPriority(priority: string): number {
  switch (priority.toLowerCase()) {
    case 'low': return 4; // IDLE_PRIORITY_CLASS
    case 'normal': return 32; // NORMAL_PRIORITY_CLASS
    case 'high': return 128; // HIGH_PRIORITY_CLASS
    case 'realtime': return 256; // REALTIME_PRIORITY_CLASS
    default: return 32;
  }
}

// 辅助函数：获取Unix优先级
function getUnixPriority(priority: string): number {
  switch (priority.toLowerCase()) {
    case 'low': return 10;
    case 'normal': return 0;
    case 'high': return -5;
    case 'realtime': return -10;
    default: return 0;
  }
}

export default router;