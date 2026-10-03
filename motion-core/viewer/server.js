#!/usr/bin/env node
/**
 * viewer-server.js — 自研最小角色操控台（配合 motion-hub 的活动作演示）
 * 服务：
 *   /            → public/index.html（控制器页面）
 *   /vendor/*    → 本地 node_modules 的 ESM（@babylonjs、babylon-mmd）
 *   /models/*    → 模型目录
 *   /mmd/*       → 共享 toon 贴图（kks 自带）
 *   /hub/*       → 反向代理到 motion-hub(9877)，免跨域
 *   /debug/*     → 运行时采样输出（验证"活动作"用）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] || 9988;
const HUB = 'http://127.0.0.1:9877';
const NM = 'C:/RUANLINYUN/_待删除/原项目-ruanlinyun-assistant/frontend/node_modules';
const PUB = path.join(__dirname, 'public');
const MODELS = path.join(__dirname, 'models');
const TOON = 'C:/Users/Administrator/Desktop/kks/resources/app/frontend-dist/mmd';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.bmp': 'image/bmp', '.tga': 'image/x-tga', '.spa': 'application/octet-stream',
  '.sph': 'application/octet-stream', '.pmx': 'application/octet-stream', '.gz': 'application/gzip',
};

function proxyHub(req, res) {
  const url = HUB + req.url.replace(/^\/hub/, '/api/motion');
  const rq = http.request(url, { method: req.method, headers: { Accept: 'text/event-stream, application/json' } }, pr => {
    res.writeHead(pr.statusCode, pr.headers);
    pr.pipe(res);
  });
  rq.on('error', () => { res.writeHead(502); res.end('hub down'); });
  req.pipe(rq);
}

// [稳定] 浏览器中断/急停造成的 EPIPE/写入已结束流 不允许击穿进程
process.on('uncaughtException', e => console.log('[swallow]', e && e.message));
process.on('unhandledRejection', e => console.log('[swallow-rejection]', e));

const samples = []; // 最近骨骼采样（验证非静止）

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = decodeURIComponent(url.pathname);

  if (p.startsWith('/hub/')) return proxyHub(req, res);

  if (p === '/debug/push') { // 页面把骨骼采样推过来
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      try {
        const j = JSON.parse(b);
        samples.push(j);
        if (samples.length > 400) samples.shift();
      } catch {}
      res.writeHead(204); res.end();
    });
    return;
  }
  if (p === '/debug/samples') {
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ count: samples.length, first: samples[0] || null, last: samples[samples.length-1] || null,
                                    distinctHeadY: new Set(samples.map(s=>s.head && s.head.toFixed(4))).size }));
  }

  // 映射静态根
  let fsPath = null;
  if (p.startsWith('/vendor/@babylonjs/')) fsPath = path.join(NM, '@babylonjs', p.slice('/vendor/@babylonjs/'.length));
  else if (p.startsWith('/vendor/babylon-mmd/')) fsPath = path.join(NM, 'babylon-mmd/esm', p.slice('/vendor/babylon-mmd/'.length));
  else if (p !== '/' && !p.includes('..') && p.endsWith('.html')) fsPath = path.join(PUB, p.slice(1));
  else if (p.startsWith('/models/')) fsPath = path.join(MODELS, p.slice('/models/'.length));
  else if (p.startsWith('/mmd/')) fsPath = path.join(TOON, p.slice('/mmd/'.length));
  else if (p.startsWith('/dist/')) fsPath = path.join(__dirname, p.slice(1));
  else if (p === '/' || p === '/index.html') fsPath = path.join(PUB, 'index.html');

  if (!fsPath) { res.writeHead(404); return res.end('404'); }
  // ESM 裸引用解析（含 dotted 文件名如 mesh.vertexData / math.vector）：
  //   命中顺序：原样 -> +'.js' -> +'/index.js'
  const dir = path.dirname(fsPath);
  const base = path.basename(fsPath);
  const stemCandidates = [base, base + '.js'];
  let idxDir = -1;
  const tryFromDirList = () => {
    idxDir++;
    fs.readdir(dir, (err, names) => {
      if (err) { res.writeHead(404); return res.end('404 ' + p); }
      while (idxDir < stemCandidates.length && stemCandidates[idxDir].endsWith('.js')) {
        // 已按字面尝试过 .js 的跳过
        break;
      }
      const hit = names.find(n => stemCandidates.includes(n)) ||
                  names.find(n => n.startsWith(base + '.') && n.endsWith('.js'));
      if (!hit) { res.writeHead(404); return res.end('404 ' + p); }
      serveFile(path.join(dir, hit));
    });
  };

  function serveFile(f) {
    // [2026-08-27 A1 修复] ESM 双实例根因：无扩展名 URL（importmap 深路径）直接返回 .js 内容，
    //   浏览器按无扩展名 URL 缓存模块 → 与 barrel 链的 .js URL 分裂成两个实例，
    //   PmxLoader 注册进影子实例导致 SceneLoader 认不出 .pmx（failed JSON parse）。
    //   统一 301 重定向到真实扩展名 URL，让浏览器模块缓存收敛为单实例。
    const reqExt = path.extname(url.pathname);
    const diskExt = path.extname(f);
    if (!reqExt && diskExt) {
      const loc = url.pathname.replace(/[^/]*$/, '') + path.basename(f);
      try { res.writeHead(301, { Location: loc, 'Cache-Control': 'no-store' }); res.end(); } catch {}
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/javascript',
                         'Cache-Control': 'no-store' });
    const st = fs.createReadStream(f);
    st.on('error', () => { try { res.end(); } catch {} });
    res.on('close', () => { try { st.destroy(); } catch {} });
    st.pipe(res);
  }

  const cand1 = fsPath;
  const cand2 = fsPath + '.js';
  fs.stat(cand1, (e1, s1) => {
    if (!e1 && s1.isFile()) return serveFile(cand1);
    fs.stat(cand2, (e2, s2b) => {
      if (!e2 && s2b.isFile()) return serveFile(cand2);
      tryFromDirList();
    });
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`[viewer] http://127.0.0.1:${PORT}/`));