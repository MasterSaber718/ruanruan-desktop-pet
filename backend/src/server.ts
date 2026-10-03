import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import os from 'os';

// 加载环境变量（显式指定项目根目录的 .env，兼容从 backend/ 或 dist/ 启动）
// 注意：.env 中所有未使用的 API Key 必须留空，避免占位符被误判为有效配置
// [v58] .env 路径优先使用 electron-main 传入的 APP_ENV_FILE（打包环境 = resources/.env）
dotenv.config({ path: process.env.APP_ENV_FILE || path.resolve(__dirname, '../../.env') });

// 创建Express应用
const app = express();
const server = http.createServer(app);

/**
 * [v120] 局域网访问功能已移除：后端仅监听 127.0.0.1
 * 不再读取 LAN_MODE / .lan_mode；设置页开关也已删除。
 */
function isLanModeEnabled(): boolean {
  return false;
}

/** 获取本机所有局域网IPv4（用于动态CORS白名单） */
function getLanIPs(): string[] {
  const ips: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    // 排除虚拟网卡（VMware/VirtualBox/Hyper-V/WSL/Docker）
    // 否则 CORS 白名单会包含 192.168.111.1 这种无法用于真实通信的 IP
    const lower = name.toLowerCase();
    if (lower.includes('vmware') || lower.includes('virtualbox') ||
        lower.includes('vethernet') || lower.includes('docker') ||
        lower.includes('wsl') || lower.includes('hyper-v') || lower.includes('vmnet')) {
      continue;
    }
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      // 排除 APIPA 自动地址 169.254.x.x
      if (addr.address.startsWith('169.254.')) continue;
      ips.push(addr.address);
    }
  }
  return ips;
}

/** 动态生成 CORS 白名单：本机 + 局域网所有IP + 5175 端口 */
function buildCorsOrigins(): string[] {
  const origins = new Set<string>([
    'http://localhost:5175',
    'http://127.0.0.1:5175',
  ]);
  // 局域网模式下，把所有本机IP加进白名单
  if (isLanModeEnabled()) {
    for (const ip of getLanIPs()) {
      origins.add(`http://${ip}:5175`);
    }
    // 也允许 0.0.0.0（虽然实际不会用到，但作为兜底）
    origins.add('http://0.0.0.0:5175');
  }
  return Array.from(origins);
}

// 中间件
// [M-4] trust proxy 显式设置：仅信任本地反代（如有），不信任 X-Forwarded-For
// aiProxy.ts 的 getClientIp 使用 req.ip，遵循此设置
app.set('trust proxy', 'loopback');

app.use(cors({
  origin: (origin, callback) => {
    // 允许无 Origin 的请求（如 curl、Postman、Electron 内置请求）
    if (!origin) return callback(null, true);
    const allowed = buildCorsOrigins();
    if (allowed.includes(origin)) return callback(null, true);
    // [H-5] 修复：LAN 模式下收紧 CORS，仅允许本机 LAN IP:5175
    // 不再使用通配正则，而是与 getLanIPs() 返回的真实本机 IP 比对
    if (isLanModeEnabled()) {
      const lanIPs = getLanIPs();
      const matched = lanIPs.some(ip => origin === `http://${ip}:5175`);
      if (matched) return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// [M-5] Helmet 配置：保持 CSP 禁用（本服务永不返回 HTML），但保留其他安全头
app.use(helmet({
  contentSecurityPolicy: false,  // CSP 由前端控制，本服务为纯 JSON API
  crossOriginEmbedderPolicy: false,
  hsts: false,  // 本地服务无 HTTPS，HSTS 无意义
}));
// [M-6] 请求体限制收紧：从 10mb 改为 1mb（防 DoS）
// 大文件上传应走专门的文件路由，不走通用 JSON 解析
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));  // extended:false 不用 qs（防原型污染）

// 设置安全响应头与字符编码
app.use((_req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  next();
});

// 连接MongoDB
// [M-7] 修复：未设置 MONGODB_URI 时使用安全默认值（仅本地）
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ruanlinyun-ai';

/** 脱敏 MongoDB 错误信息（防止连接串泄露到日志） */
function sanitizeMongoError(error: any): string {
  if (!error) return 'unknown';
  const name = error.name || 'Error';
  const code = error.code || '';
  // 仅保留错误名称和代码，移除可能包含凭据的 message
  return `${name}${code ? `(${code})` : ''}`;
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected successfully');
    // 导入并初始化所有模型
    require('./models/ChatSession');
    require('./models/Update');
  })
  .catch((error) => {
    // [M-8] 修复：脱敏日志，不输出完整 error 对象（可能含连接串）
    console.error('MongoDB connection error:', sanitizeMongoError(error));
  });

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', sanitizeMongoError(error));
});

// 健康检查（[M-9] 修复：移除业务内容，仅返回状态）
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    mongoReady: mongoose.connection.readyState === 1,
  });
});

// API路由
import routes from './routes';
app.use('/api/v1', routes);

// [M-10] 404 处理（统一 JSON 响应，不暴露 Express 默认页面）
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// [M-11] 统一错误处理中间件（防 Express 默认错误页面泄露堆栈）
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // CORS 错误特殊处理
  if (err && err.message && err.message.startsWith('CORS blocked:')) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  console.error('[Server Error]', err instanceof Error ? err.message : err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 微信机器人自动启动（默认启用，异步执行不阻塞主服务）
// 失败时降级为 idle 状态，不影响其他功能

// ============================================================
// 本地AI模型（llama-server）—— [2026-09-20 v175.4] 已彻底外置，不再随软件启动
// ------------------------------------------------------------
// 用户决策：不再需要内置本地千问（此前无条件随软件启动，实测常驻 ~3.3GB 内存）。
// 原 models 目录（llama-cpp 运行器 + qwen2.5-3b gguf）已移出软件目录、
// 放回桌面由用户自行管理，需要跑本地模型时手动执行其中的 start-qwen-server.bat。
//
// 软件侧一切 AI 能力统一走「API 调用」（见 routes/aiHub.ts），
// 目标解析顺序：providers.json active → resources/.env 三件套 → 本地兜底(11434)。
// 即同一套 OpenAI 兼容链路：填云端地址就调云端，填本地地址就调本地；
// 本地端点无需 API Key（apiKey 留空即可），能否连通由设置页「测试连接」自证。
// ============================================================

// 启动服务器
const PORT = process.env.PORT || 27865;
// 启动时读取局域网模式（环境变量 + .lan_mode 文件）
const isLanMode = isLanModeEnabled();
const LISTEN_HOST = isLanMode ? '0.0.0.0' : '127.0.0.1';

// [M-12] 修复：未捕获异常后退出（让进程管理器重启）
// 原实现仅记录不退出，进程可能处于未定义状态
let isShuttingDown = false;
function gracefulShutdown(reason: string, error?: any) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.error(`[Fatal] ${reason}:`, error instanceof Error ? error.message : error);
  server.close(() => {
    try {
      mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });
  // 5秒后强制退出
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('uncaughtException', (error) => {
  gracefulShutdown('Uncaught Exception', error);
});

process.on('unhandledRejection', (reason) => {
  // Promise 未处理拒绝仅记录，不退出（更宽容，避免小 bug 导致服务中断）
  console.error('[Unhandled Rejection]', reason instanceof Error ? reason.message : reason);
});

// [2026-10-02 终审] 端口冲突专项处理：给明确日志而不是 uncaughtException 崩溃
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Fatal] 端口 ${PORT} 已被占用（EADDRINUSE）：大概率已有一个后端实例在跑。本进程退出。`);
    process.exit(1);
  }
  console.error('[Server error]', err.code || '', err.message);
});

server.listen({ port: PORT, host: LISTEN_HOST }, () => {
  console.log(`Server running on http://${LISTEN_HOST}:${PORT}`);
  console.log(`Health check: http://${LISTEN_HOST}:${PORT}/health`);
  if (isLanMode) {
    console.log('⚠ LAN mode enabled - server accessible from network');
    const lanIPs = getLanIPs();
    if (lanIPs.length > 0) {
      console.log('局域网访问地址:');
      lanIPs.forEach((ip) => console.log(`  http://${ip}:${PORT}`));
    }
    console.log('注意：前端 vite 服务需用 LAN_MODE=1 启动才能从局域网访问 5175 端口');
  }
  // 微信机器人自动启动（异步执行，不阻塞主服务）
  // 启动失败会降级为 idle 状态，不影响其他功能
  // [2026-09-20 v175.4] 本地千问（llama-server）已外置，不再自动启动——
  //   软件只做 API 调用（云端/本地端点都由设置页配置决定）
});

// 优雅关闭

// 优雅关闭
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    try {
      mongoose.disconnect();
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
    process.exit(0);
  });
});
