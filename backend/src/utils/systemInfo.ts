// ============================================================================
// 系统信息采集工具 - 供 routes/system.ts 与 AgentHands（system_info）共用
// 覆盖：时间/时区/地区、CPU 使用率、内存、磁盘、开机时间、屏幕分辨率、IP 归属地
// 说明：
//   - os.loadavg() 在 Windows 上恒为 [0,0,0]，CPU 使用率改用 Win32_Processor
//   - Windows 无内置定位 API，位置信息以「时区 + 地区设置」为主，
//     IP 归属地为联网增强（ip-api.com，失败返回 null，不阻塞）
// ============================================================================
import os from 'os';
import { execSync } from 'child_process';
import axios from 'axios';

/** 常见 IANA 时区 -> 中文地区名映射（轻量替代本地 IP 库） */
const REGION_NAMES: Record<string, string> = {
  'Asia/Shanghai': '中国（北京时间）',
  'Asia/Hong_Kong': '中国香港',
  'Asia/Macau': '中国澳门',
  'Asia/Taipei': '中国台湾',
  'Asia/Tokyo': '日本',
  'Asia/Seoul': '韩国',
  'Asia/Singapore': '新加坡',
  'Asia/Kuala_Lumpur': '马来西亚',
  'Asia/Bangkok': '泰国',
  'Asia/Jakarta': '印度尼西亚',
  'Asia/Manila': '菲律宾',
  'Asia/Kolkata': '印度',
  'Asia/Dubai': '阿联酋',
  'Australia/Sydney': '澳大利亚（悉尼）',
  'America/New_York': '美国（东部时间）',
  'America/Los_Angeles': '美国（太平洋时间）',
  'America/Chicago': '美国（中部时间）',
  'America/Denver': '美国（山地时间）',
  'America/Toronto': '加拿大（东部时间）',
  'Europe/London': '英国',
  'Europe/Paris': '法国（欧洲中部时间）',
  'Europe/Berlin': '德国（欧洲中部时间）',
  'Europe/Moscow': '俄罗斯（莫斯科时间）',
  'UTC': 'UTC（协调世界时）',
};

export interface TimezoneInfo {
  timeZone: string;
  region: string;
}

/** 获取 IANA 时区及中文地区名 */
export function getTimezoneInfo(): TimezoneInfo {
  let timeZone = 'UTC';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // 忽略，默认 UTC
  }
  return { timeZone, region: REGION_NAMES[timeZone] || timeZone };
}

/** 执行 PowerShell 并返回 stdout（固定命令，无注入风险；失败返回空串） */
export function runPowerShell(script: string): string {
  try {
    return execSync(`powershell -NoProfile -NonInteractive -Command "${script}"`, {
      encoding: 'utf8',
      timeout: 15000,
      windowsHide: true,
    }).trim();
  } catch (error: any) {
    return error && error.stdout ? String(error.stdout).trim() : '';
  }
}

/** 获取 CPU 使用率（0-100，失败返回 null） */
export function getCpuUsage(): number | null {
  const out = runPowerShell('(Get-CimInstance Win32_Processor).LoadPercentage');
  const v = parseInt(out, 10);
  return isNaN(v) ? null : v;
}

export interface DiskUsage {
  drive: string;
  total: number;
  free: number;
  used: number;
  usagePercent: number;
}

/** 获取本地磁盘（DriveType=3）容量与使用率 */
export function getDiskUsage(): DiskUsage[] {
  const script = 'Get-CimInstance Win32_LogicalDisk -Filter \'DriveType=3\' | ForEach-Object { [pscustomobject]@{ drive=$_.DeviceID; total=[long]$_.Size; free=[long]$_.FreeSpace } } | ConvertTo-Json -Compress';
  try {
    const out = runPowerShell(script);
    if (!out) return [];
    let parsed = JSON.parse(out);
    if (!Array.isArray(parsed)) parsed = [parsed];
    return parsed
      .filter((d: any) => d && typeof d.total === 'number' && d.total > 0)
      .map((d: any) => {
        const total = d.total;
        const free = d.free;
        return {
          drive: d.drive,
          total,
          free,
          used: total - free,
          usagePercent: Math.round(((total - free) / total) * 1000) / 10,
        };
      });
  } catch {
    return [];
  }
}

export interface WindowsSystemInfo {
  caption: string;
  version: string;
  arch: string;
  bootTime: string;
  memTotal: number;
  memFree: number;
}

/** 获取 Windows 系统名/版本/架构/开机时间/物理内存（CIM，中文经 UTF-8 转码） */
export function getWindowsSystemInfo(): WindowsSystemInfo | null {
  const script = '[Console]::OutputEncoding=[Text.Encoding]::UTF8; $os=Get-CimInstance Win32_OperatingSystem; [pscustomobject]@{ caption=$os.Caption; version=$os.Version; arch=$os.OSArchitecture; bootTime=$os.LastBootUpTime.ToString(\'o\'); memTotal=[long]$os.TotalVisibleMemorySize*1KB; memFree=[long]$os.FreePhysicalMemory*1KB } | ConvertTo-Json -Compress';
  try {
    const out = runPowerShell(script);
    if (!out) return null;
    const d = JSON.parse(out);
    if (!d || typeof d.caption !== 'string') return null;
    return d;
  } catch {
    return null;
  }
}

export interface ScreenInfo {
  width: number;
  height: number;
  x: number;
  y: number;
  workWidth: number;
  workHeight: number;
}

/** 获取主屏幕分辨率与工作区（Windows Forms） */
export function getScreenInfo(): ScreenInfo | null {
  const script = 'Add-Type -AssemblyName System.Windows.Forms; $s=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $w=[System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea; [pscustomobject]@{ width=$s.Width; height=$s.Height; x=$s.X; y=$s.Y; workWidth=$w.Width; workHeight=$w.Height } | ConvertTo-Json -Compress';
  try {
    const out = runPowerShell(script);
    if (!out) return null;
    return JSON.parse(out);
  } catch {
    return null;
  }
}

export interface IpLocation {
  ip: string;
  country: string;
  regionName: string;
  city: string;
  timezone: string;
}

/** 获取公网 IP 归属地（联网查询 ip-api.com，失败返回 null，最多等待 2.5 秒） */
export async function getIpLocation(): Promise<IpLocation | null> {
  try {
    const resp = await axios.get('http://ip-api.com/json/?fields=status,query,country,regionName,city,timezone', {
      timeout: 2500,
    });
    const d = resp.data;
    if (d && d.status === 'success') {
      return {
        ip: d.query,
        country: d.country,
        regionName: d.regionName,
        city: d.city,
        timezone: d.timezone,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** 获取本机所有非内网回环 IPv4 地址 */
export function getLocalIPv4s(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}

export interface SystemSnapshot {
  os: WindowsSystemInfo | null;
  cpuLoad: number | null;
  disks: DiskUsage[];
  screen: ScreenInfo | null;
}

/**
 * 单次 PowerShell 调用采集 Windows 系统快照（OS/CPU/磁盘/屏幕）
 * 相比分别调用 getWindowsSystemInfo/getCpuUsage/getDiskUsage/getScreenInfo
 * 只启动一次 powershell 进程，耗时约 2-4 秒（高负载下可能更慢）
 */
export function getSystemSnapshot(): SystemSnapshot {
  const empty: SystemSnapshot = { os: null, cpuLoad: null, disks: [], screen: null };
  const script = "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Add-Type -AssemblyName System.Windows.Forms; $os=Get-CimInstance Win32_OperatingSystem; $cpuLoad=@((Get-CimInstance Win32_Processor).LoadPercentage | Measure-Object -Average).Average; $disks=Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { [pscustomobject]@{ drive=$_.DeviceID; total=[long]$_.Size; free=[long]$_.FreeSpace } }; $s=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $w=[System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea; [pscustomobject]@{ os=[pscustomobject]@{ caption=$os.Caption; version=$os.Version; arch=$os.OSArchitecture; bootTime=$os.LastBootUpTime.ToString('o'); memTotal=[long]$os.TotalVisibleMemorySize*1KB; memFree=[long]$os.FreePhysicalMemory*1KB }; cpuLoad=$cpuLoad; disks=$disks; screen=[pscustomobject]@{ width=$s.Width; height=$s.Height; x=$s.X; y=$s.Y; workWidth=$w.Width; workHeight=$w.Height } } | ConvertTo-Json -Compress -Depth 4";
  try {
    const out = runPowerShell(script);
    if (!out) return empty;
    const d = JSON.parse(out);
    if (!d || typeof d !== 'object') return empty;
    const rawDisks = Array.isArray(d.disks) ? d.disks : d.disks ? [d.disks] : [];
    const disks: DiskUsage[] = rawDisks
      .filter((x: any) => x && typeof x.total === 'number' && x.total > 0)
      .map((x: any) => {
        const total = x.total;
        const free = x.free;
        return {
          drive: x.drive,
          total,
          free,
          used: total - free,
          usagePercent: Math.round(((total - free) / total) * 1000) / 10,
        };
      });
    return {
      os: d.os && typeof d.os.caption === 'string' ? d.os : null,
      cpuLoad: typeof d.cpuLoad === 'number' && isFinite(d.cpuLoad) ? Math.round(d.cpuLoad * 10) / 10 : null,
      disks,
      screen: d.screen && typeof d.screen.width === 'number' ? d.screen : null,
    };
  } catch {
    return empty;
  }
}
