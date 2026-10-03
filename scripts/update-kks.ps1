# 更新 kks 文件夹里的前端代码 + 主进程（用户手动执行，绕过沙箱限制）
# 用法：在 trae 输入框输入：
#   ! powershell -ExecutionPolicy Bypass -File c:\RUANLINYUN\ruanlinyun-assistant\scripts\update-kks.ps1
#
# 原理：exe 同级 frontend-dist 目录优先级最高（见 electron-main.js findFrontendDist）
#       更新此目录后，重启 exe 即可加载最新前端，无需重新打包

$src = "c:\RUANLINYUN\ruanlinyun-assistant\frontend"
$kks = "C:\Users\Administrator\Desktop\kks"
$hotDir = "$kks\frontend-dist"
$appDir = "$kks\resources\app"

Write-Host "========== 更新 kks 前端 + 主进程 ==========" -ForegroundColor Cyan

# 检查源文件
if (-not (Test-Path "$src\dist\index.html")) {
  Write-Host "[错误] 源 dist 不存在，请先构建前端" -ForegroundColor Red
  exit 1
}

# 1. 热更新目录（exe 同级 frontend-dist，最高优先级）
if (Test-Path $hotDir) { Remove-Item $hotDir -Recurse -Force }
New-Item -ItemType Directory -Path $hotDir -Force | Out-Null
Copy-Item "$src\dist\*" $hotDir -Recurse -Force
Write-Host "[1/3] 热更新目录已更新: $hotDir" -ForegroundColor Green

# 2. 同步 resources/app/frontend-dist（兜底）
$appFrontendDist = "$appDir\frontend-dist"
if (Test-Path $appFrontendDist) { Remove-Item $appFrontendDist -Recurse -Force }
New-Item -ItemType Directory -Path $appFrontendDist -Force | Out-Null
Copy-Item "$src\dist\*" $appFrontendDist -Recurse -Force
Write-Host "[2/3] resources/app/frontend-dist 已更新（兜底）" -ForegroundColor Green

# 3. 更新主进程 electron-main.js + preload.js
Copy-Item "$src\electron-main.js" "$appDir\electron-main.js" -Force
Copy-Item "$src\preload.js" "$appDir\preload.js" -Force
Write-Host "[3/3] electron-main.js + preload.js 已更新" -ForegroundColor Green

# 验证
Write-Host ""
Write-Host "========== 验证 ==========" -ForegroundColor Cyan
Write-Host "热更新目录 index.html 时间: $((Get-Item "$hotDir\index.html").LastWriteTime)" -ForegroundColor Yellow
Write-Host "热更新目录 PetPage chunk: $(Test-Path "$hotDir\assets\PetPage-935bf75c.js")" -ForegroundColor Yellow
Write-Host "electron-main.js 时间: $((Get-Item "$appDir\electron-main.js").LastWriteTime)" -ForegroundColor Yellow
Write-Host "preload.js 时间: $((Get-Item "$appDir\preload.js").LastWriteTime)" -ForegroundColor Yellow

$entryChunk = Get-ChildItem "$hotDir\assets\index-*.js" | Select-Object -First 1
if ($entryChunk) {
  $content = Get-Content $entryChunk.FullName -Raw
  if ($content -match '"/pet"') {
    Write-Host "[OK] /pet 独立入口逻辑已生效（绕过 CssBaseline 白底）" -ForegroundColor Green
  } else {
    Write-Host "[FAIL] /pet 逻辑未找到" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "完成！请重启 kks 里的 exe 测试桌宠透明显示" -ForegroundColor Cyan
Write-Host "（exe 路径: $kks\阮琳云智能助手.exe）" -ForegroundColor DarkGray
