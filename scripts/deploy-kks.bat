@echo off
chcp 65001 >nul
set SRC=c:\RUANLINYUN\ruanlinyun-assistant\frontend
set KKS=C:\Users\Administrator\Desktop\kks
set LOG=c:\RUANLINYUN\ruanlinyun-assistant\scripts\deploy-kks-result.log

echo ========== kks 部署开始 ========== > "%LOG%"
echo 时间: %date% %time% >> "%LOG%"

echo [1/4] 更新热更新目录 frontend-dist >> "%LOG%"
if exist "%KKS%\frontend-dist" rmdir /s /q "%KKS%\frontend-dist"
mkdir "%KKS%\frontend-dist"
xcopy /E /Y /I /Q "%SRC%\dist\*" "%KKS%\frontend-dist\" >> "%LOG%" 2>&1
echo 热更新目录 index.html 时间: >> "%LOG%"
for %%F in ("%KKS%\frontend-dist\index.html") do echo %%~tF >> "%LOG%"

echo [2/4] 更新 resources/app/frontend-dist 兜底 >> "%LOG%"
if exist "%KKS%\resources\app\frontend-dist" rmdir /s /q "%KKS%\resources\app\frontend-dist"
mkdir "%KKS%\resources\app\frontend-dist"
xcopy /E /Y /I /Q "%SRC%\dist\*" "%KKS%\resources\app\frontend-dist\" >> "%LOG%" 2>&1

echo [3/4] 更新 electron-main.js 含禁用硬件加速 >> "%LOG%"
copy /Y "%SRC%\electron-main.js" "%KKS%\resources\app\electron-main.js" >> "%LOG%" 2>&1

echo [4/4] 更新 preload.js >> "%LOG%"
copy /Y "%SRC%\preload.js" "%KKS%\resources\app\preload.js" >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo ========== 验证 ========== >> "%LOG%"
if exist "%KKS%\frontend-dist\index.html" (echo [OK] 热更新目录 index.html 存在 >> "%LOG%") else (echo [FAIL] 热更新目录 index.html 缺失 >> "%LOG%")
if exist "%KKS%\frontend-dist\assets\PetPage-935bf75c.js" (echo [OK] PetPage chunk 存在 >> "%LOG%") else (echo [FAIL] PetPage chunk 缺失 >> "%LOG%")
findstr /C:"disableHardwareAcceleration" "%KKS%\resources\app\electron-main.js" >nul && echo [OK] electron-main.js 含禁用硬件加速 >> "%LOG%" || echo [FAIL] electron-main.js 未含禁用硬件加速 >> "%LOG%"
findstr /C:"path.dirname(process.execPath)" "%KKS%\resources\app\electron-main.js" >nul && echo [OK] electron-main.js 含热更新逻辑 >> "%LOG%" || echo [FAIL] electron-main.js 未含热更新逻辑 >> "%LOG%"

echo. >> "%LOG%"
echo ========== 部署完成 ========== >> "%LOG%"
