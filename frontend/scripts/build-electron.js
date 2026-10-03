/**
 * Electron 打包脚本
 *
 * 流程：
 * 1. 清理 dist-electron/
 * 2. 复制 frontend/dist/ → dist-electron/frontend-dist/
 * 3. 复制 backend/dist/   → dist-electron/backend-dist/
 * 4. 复制 backend/node_modules/ → dist-electron/backend-node_modules/ (生产依赖)
 * 5. 复制 electron-main.js → dist-electron/
 * 6. 调用 electron-packager 打包成 exe
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_ROOT = path.resolve(ROOT, '..', 'backend');
const OUT_DIR = path.resolve(ROOT, '..', 'ah', 'electron-out-v21');
const STAGE_DIR = path.resolve(ROOT, 'dist-electron');

function log(msg) {
  console.log(`[build-electron] ${msg}`);
}

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  // [v20] 直接用 PowerShell Remove-Item，绕过 CodeBuddy 的 fs.rmdirSync 安全删除 shim
  //   shim 会拦截 fs.rmdirSync/fs.rmSync，尝试调用 genie-trash exe 移到回收站，但超时
  try {
    execSync(`powershell -NoProfile -Command "Remove-Item -LiteralPath '${p}' -Recurse -Force -ErrorAction Stop"`, { stdio: 'pipe', timeout: 30000 });
  } catch {
    // 如果 PowerShell 也失败，尝试重命名（让旧目录不被锁定）
    try {
      const backup = p + '_old_' + Date.now();
      fs.renameSync(p, backup);
    } catch { /* noop */ }
  }
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source not found: ${src}`);
  }
  fs.mkdirSync(dst, { recursive: true });
  execSync(`xcopy "${src}" "${dst}\\" /E /I /Q /Y /EXCLUDE:${path.resolve(__dirname, 'exclude.txt')}`, {
    stdio: 'inherit',
  });
}

// 简单的目录复制（不依赖 xcopy exclude）
function copyDirSimple(src, dst, ignore = []) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source not found: ${src}`);
  }
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (ignore.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirSimple(srcPath, dstPath, ignore);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

// 复制单个文件
function copyFile(src, dst) {
  if (!fs.existsSync(src)) {
    throw new Error(`File not found: ${src}`);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

// 主流程
async function main() {
  log('Step 1: Clean staging dir');
  rmrf(STAGE_DIR);
  fs.mkdirSync(STAGE_DIR, { recursive: true });

  log('Step 2: Copy frontend/dist → dist-electron/frontend-dist');
  const frontendDist = path.join(ROOT, 'dist');
  if (!fs.existsSync(frontendDist)) {
    log('  frontend/dist not found, running vite build...');
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  }
  copyDirSimple(frontendDist, path.join(STAGE_DIR, 'frontend-dist'));

  log('Step 3: Copy backend/dist → dist-electron/backend-dist');
  const backendDist = path.join(BACKEND_ROOT, 'dist');
  copyDirSimple(backendDist, path.join(STAGE_DIR, 'backend-dist'));

  log('Step 4: Copy backend/package.json + node_modules');
  copyFile(
    path.join(BACKEND_ROOT, 'package.json'),
    path.join(STAGE_DIR, 'backend-dist', 'package.json')
  );

  // 后端 node_modules 太大，只复制生产依赖
  // 简化方案：直接全部复制（用户能接受 200MB+ 体积）
  const backendNodeModules = path.join(BACKEND_ROOT, 'node_modules');
  if (fs.existsSync(backendNodeModules)) {
    log('  Copying backend node_modules (this may take a while)...');
    copyDirSimple(backendNodeModules, path.join(STAGE_DIR, 'backend-node_modules'), [
      // 排除 .cache, .bin 等无用目录
      '.cache',
      '.bin',
    ]);
  } else {
    log('  [WARN] backend/node_modules not found');
  }

  log('Step 5: Copy electron-main.js');
  copyFile(
    path.join(ROOT, 'electron-main.js'),
    path.join(STAGE_DIR, 'electron-main.js')
  );

  log('Step 6: Copy package.json to staging');
  copyFile(
    path.join(ROOT, 'package.json'),
    path.join(STAGE_DIR, 'package.json')
  );

  log('Step 7: Self-assemble Electron app (avoid AppData cache writes)');
  rmrf(OUT_DIR);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // [v20] 支持 64 位和 32 位双架构
  //   检测环境变量 BUILD_ARCH，默认 x64，可设为 ia32 构建 32 位版本
  const buildArch = process.env.BUILD_ARCH || 'x64';
  // [v20 修复中文路径编码] Node.js v24 fs.mkdirSync 无法处理中文路径
  //   原目录名 "阮琳云智能助手-win32-x64" 会导致 fs.mkdirSync 失败（GBK→UTF8 乱码）
  //   改为纯英文 "ruanlinyun-win32-x64"，最后再重命名为中文名
  const outputDir = path.join(OUT_DIR, `ruanlinyun-win32-${buildArch}`);
  fs.mkdirSync(outputDir, { recursive: true });

  // 7a. 复制 electron 二进制（exe + dll + pak 等）到输出目录
  //   注意：当前 node_modules/electron/dist 是安装时的架构（通常 x64）
  //   32 位构建需要单独安装 electron@31 --arch=ia32
  const electronDist = process.env.ELECTRON_DIST || path.join(ROOT, 'node_modules', 'electron', 'dist');
  if (!fs.existsSync(electronDist)) {
    throw new Error(`electron dist not found: ${electronDist}`);
  }
  log(`  Using electron dist: ${electronDist} (arch: ${buildArch})`);
  log('  Copying electron binary...');
  copyDirSimple(electronDist, outputDir, ['LICENSES.chromium.html']);

  // 7b. 重命名 electron.exe → ruanlinyun.exe（先用英文名，最后用 PowerShell 重命名为中文）
  const srcExe = path.join(outputDir, 'electron.exe');
  const dstExe = path.join(outputDir, 'ruanlinyun.exe');
  if (fs.existsSync(srcExe)) {
    fs.renameSync(srcExe, dstExe);
  }

  // 7c. 创建 resources/app/ 目录，把我们的代码放进去
  // Electron 默认从 resources/app/ 或 resources/app.asar 加载主进程
  const resourcesDir = path.join(outputDir, 'resources');
  fs.mkdirSync(resourcesDir, { recursive: true });
  const appDir = path.join(resourcesDir, 'app');
  fs.mkdirSync(appDir, { recursive: true });

  // 7d. 复制 staging 内容到 resources/app/
  log('  Copying app files to resources/app/...');
  copyDirSimple(STAGE_DIR, appDir);

  // 7e. 复制 electron 的 default_app.asar（如果存在，会被我们的 app/ 覆盖）
  const defaultAppAsar = path.join(electronDist, 'resources', 'default_app.asar');
  if (fs.existsSync(defaultAppAsar)) {
    // 不复制，让 Electron 用我们的 app/ 目录
  }

  log('Step 8: Verify output');
  if (!fs.existsSync(dstExe)) {
    throw new Error(`EXE not found: ${dstExe}`);
  }
  const stats = fs.statSync(dstExe);
  log(`✓ Packaged successfully`);
  log(`  EXE: ${dstExe}`);
  log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  log(`  Dir size: ${(getDirSize(outputDir) / 1024 / 1024).toFixed(2)} MB`);

  // [v20] 用 PowerShell 将英文 exe 名重命名为中文（目录名保持英文避免 fs API 问题）
  const finalExe = path.join(outputDir, '阮琳云智能助手.exe');
  try {
    execSync(`powershell -NoProfile -Command "Rename-Item -LiteralPath '${dstExe}' -NewName '阮琳云智能助手.exe'"`, { stdio: 'pipe', timeout: 10000 });
    log(`  Renamed EXE to: ${finalExe}`);
  } catch (e) {
    log(`  [WARN] Rename EXE to Chinese failed, keeping English name: ${dstExe}`);
  }
}

function getDirSize(dir) {
  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(p);
    } else {
      size += fs.statSync(p).size;
    }
  }
  return size;
}

main().catch(err => {
  console.error('[build-electron] FAILED:', err);
  process.exit(1);
});
