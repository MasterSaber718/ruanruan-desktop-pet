// ============================================================================
// 系统信息路由 - 获取电脑系统信息（时间/时区/地区、CPU/内存/磁盘、开机时间等）
// 与 AgentHands.system_info 互补：本路由提供面向「获取电脑信息」问答的聚合数据
// 挂载：routes/index.ts -> router.use('/system', systemRouter)
// ============================================================================
import express, { Request, Response } from 'express';
import os from 'os';
import {
  getTimezoneInfo,
  getSystemSnapshot,
  getIpLocation,
  getLocalIPv4s,
} from '../utils/systemInfo';

const router = express.Router();

// GET /api/v1/system/info - 综合系统信息
router.get('/info', async (_req: Request, res: Response) => {
  const tz = getTimezoneInfo();
  const snapshot = getSystemSnapshot();
  const now = new Date();

  const memTotal = snapshot.os?.memTotal ?? os.totalmem();
  const memFree = snapshot.os?.memFree ?? os.freemem();
  const memUsed = memTotal - memFree;

  // 位置：Windows 无内置定位，先用时区 + 地区设置；联网后补充 IP 归属地
  // 硬性 3 秒上限（Promise.race），避免 DNS/连接悬挂阻塞接口
  const ipLocation = await Promise.race([
    getIpLocation(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
  ]);

  res.json({
    success: true,
    device: {
      platform: os.platform(),
      osName: snapshot.os?.caption || os.type(),
      osVersion: snapshot.os?.version || os.release(),
      arch: snapshot.os?.arch || os.arch(),
      hostname: os.hostname(),
      username: (() => {
        try {
          return os.userInfo().username;
        } catch {
          return '';
        }
      })(),
      cpuModel: os.cpus()[0]?.model || '',
      cpuCount: os.cpus().length,
      bootTime: snapshot.os?.bootTime || new Date(Date.now() - os.uptime() * 1000).toISOString(),
      uptimeSeconds: Math.floor(os.uptime()),
    },
    cpu: {
      usagePercent: snapshot.cpuLoad,
    },
    memory: {
      total: memTotal,
      free: memFree,
      used: memUsed,
      usagePercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0,
    },
    disk: snapshot.disks,
    screen: snapshot.screen,
    time: {
      iso: now.toISOString(),
      localTime: now.toString(),
      formatted: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      timezone: tz.timeZone,
      timezoneOffsetMinutes: -now.getTimezoneOffset(),
      week: ['日', '一', '二', '三', '四', '五', '六'][now.getDay()],
    },
    network: {
      ips: getLocalIPv4s(),
      hostname: os.hostname(),
    },
    location: {
      timezone: tz.timeZone,
      region: tz.region,
      source: ipLocation ? 'ip-api' : 'local',
      ipLocation,
    },
  });
});

// GET /api/v1/system/time - 时间/日期/时区（轻量，供「现在几点/今天几号」问答）
router.get('/time', (_req: Request, res: Response) => {
  const now = new Date();
  const tz = getTimezoneInfo();
  res.json({
    success: true,
    time: {
      iso: now.toISOString(),
      formatted: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      clock: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      week: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()],
      timezone: tz.timeZone,
      region: tz.region,
      timezoneOffsetMinutes: -now.getTimezoneOffset(),
    },
  });
});

export default router;
