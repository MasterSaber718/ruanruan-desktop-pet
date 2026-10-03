/**
 * 网络信息路由 - 获取本机局域网IP等信息
 * [v120] 设置页「局域网访问」功能已移除：lan-mode 开关接口仅返回关闭，不再读写 .lan_mode
 */
import express, { Request, Response } from 'express';
import os from 'os';

const router = express.Router();

/** [v120] 局域网模式已移除，恒为关闭 */
function isLanModeEnabled(): boolean {
  return false;
}

/** 获取本机所有局域网IPv4地址 */
function getLocalIPs(): string[] {
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

/**
 * 判断网卡名是否为虚拟网卡
 */
function isVirtualAdapter(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('vmware') ||
    lower.includes('virtualbox') ||
    lower.includes('vethernet') ||
    lower.includes('docker') ||
    lower.includes('wsl') ||
    lower.includes('hyper-v') ||
    lower.includes('vmnet') ||
    lower.includes('loopback pseudo')
  );
}

function isApipaAddress(ip: string): boolean {
  return ip.startsWith('169.254.');
}

function getRealLanIPs(): Array<{ name: string; ip: string }> {
  const interfaces = os.networkInterfaces();
  const result: Array<{ name: string; ip: string }> = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    if (isVirtualAdapter(name)) continue;
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      if (isApipaAddress(addr.address)) continue;
      result.push({ name, ip: addr.address });
    }
  }
  return result;
}

function getPrimaryIP(_ips: string[]): string {
  const realIPs = getRealLanIPs();
  if (realIPs.length === 0) return '127.0.0.1';
  const ips = realIPs.map((x) => x.ip);
  const ip192 = ips.find((ip) => ip.startsWith('192.168.'));
  if (ip192) return ip192;
  const ip10 = ips.find((ip) => ip.startsWith('10.'));
  if (ip10) return ip10;
  const ip172 = ips.find((ip) => /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip));
  if (ip172) return ip172;
  return ips[0];
}

// GET /api/v1/network/local-ip（只读信息；设置页局域网开关已删除）
router.get('/local-ip', (_req: Request, res: Response) => {
  const allIPs = getLocalIPs();
  const realIPs = getRealLanIPs();
  const hostname = os.hostname();
  res.json({
    ips: allIPs,
    realIPs: realIPs.map((x) => x.ip),
    adapters: realIPs,
    hostname,
    primary: getPrimaryIP(allIPs),
    lanMode: isLanModeEnabled(),
  });
});

// [v129] lan-mode GET/POST 路由已删除：设置页无调用；开关功能已下线

export default router;
