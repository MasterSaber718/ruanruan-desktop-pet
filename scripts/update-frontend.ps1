# 阮琳云智能助手 - 前端热更新脚本
# 用途：改前端代码后，运行此脚本即可更新 exe，无需重新打包整个应用
#
# 原理：
#   electron-main.js 的 findFrontendDist 优先从 exe 同级 frontend-dist 目录加载前端
#   （热更新目录，见 electron-main.js 第 18-24 行）
#   此脚本把最新 dist 复制到该目录，exe 启动时自动加载新代码
#
# 用法：
#   cd c:\RUANLINYUN\ruanlinyun-assistant
#   powershell -ExecutionPolicy Bypass -File scripts\update-frontend.ps1
#
# 可选参数：
#   -SkipBuild  跳过构建步骤（已手动构建时用）
#   -UpdateMain 同时更新主进程 electron-main.js 和 preload.js（改了主进程代码时用）

param(
  [switch]$SkipBuild,
  [switch]$UpdateMain
)

$ErrorActionPreference = 'Stop'

# 路径常量
$frontendDir = "c:\RUANLINYUN\ruanlinyun-assistant\frontend"
$exeDir = "c:\RUANLINYUN\ruanlinyun-assistant\ah\electron-out\阮琳云智能助手-win32-x64"
$appDir = "$exeDir\resources\app"
$hotDir = "$exeDir\frontend-dist"

Write-Host "========== 阮琳云智能助手 前端热更新 ==========" -ForegroundColor Cyan

# 检查 exe 目录是否存在
if (-not (Test-Path $exeDir)) {
  Write-Host "[错误] 找不到 exe 目录: $exeDir" -ForegroundColor Red
  Write-Host "请先运行一次完整打包（npm run electron:build）生成 exe" -ForegroundColor Yellow
  exit 1
}

# 步骤1：构建前端
if (-not $SkipBuild) {
  Write-Host "`n[1/3] 构建前端..." -ForegroundColor Yellow
  Push-Location $frontendDir
  try {
    & npx vite build --config vite.config.simple.ts
    if ($LASTEXITCODE -ne 0) { throw "前端构建失败" }
    Write-Host "[1/3] 构建成功" -ForegroundColor Green
  } finally {
    Pop-Location
  }
} else {
  Write-Host "`n[1/3] 跳过构建（-SkipBuild）" -ForegroundColor DarkGray
}

# 步骤2：复制 dist 到热更新目录
Write-Host "`n[2/3] 复制 dist 到热更新目录..." -ForegroundColor Yellow
if (-not (Test-Path "$frontendDir\dist\index.html")) {
  Write-Host "[错误] dist/index.html 不存在，请先构建" -ForegroundColor Red
  exit 1
}
if (Test-Path $hotDir) { Remove-Item $hotDir -Recurse -Force }
New-Item -ItemType Directory -Path $hotDir -Force | Out-Null
Copy-Item "$frontendDir\dist\*" $hotDir -Recurse -Force
Write-Host "[2/3] 已复制到: $hotDir" -ForegroundColor Green
Write-Host "      index.html 修改时间: $((Get-Item "$hotDir\index.html").LastWriteTime)" -ForegroundColor DarkGray

# 步骤3：（可选）更新主进程和 preload
if ($UpdateMain) {
  Write-Host "`n[3/3] 更新主进程 electron-main.js + preload.js..." -ForegroundColor Yellow
  Copy-Item "$frontendDir\electron-main.js" "$appDir\electron-main.js" -Force
  Copy-Item "$frontendDir\preload.js" "$appDir\preload.js" -Force
  Write-Host "[3/3] 已更新 electron-main.js 和 preload.js" -ForegroundColor Green
} else {
  Write-Host "`n[3/3] 跳过主进程更新（改了主进程代码时加 -UpdateMain）" -ForegroundColor DarkGray
}

Write-Host "`n========== 热更新完成 ==========" -ForegroundColor Cyan
Write-Host "下一步：重启 exe 即可看到新前端" -ForegroundColor White
Write-Host ""
Write-Host "提示：" -ForegroundColor DarkGray
Write-Host "  - 只改前端：运行此脚本（默认）" -ForegroundColor DarkGray
Write-Host "  - 改了主进程：加 -UpdateMain 参数" -ForegroundColor DarkGray
Write-Host "  - 已手动构建：加 -SkipBuild 参数" -ForegroundColor DarkGray
