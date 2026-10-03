@echo off
chcp 65001 >nul
title 阮琳云智能助手 - 一键启动器
setlocal enabledelayedexpansion

REM ============================================================
REM  阮琳云智能助手 - 一键启动器（CMD 版）
REM  位置：与 start.bat 同目录（scripts\）
REM  特点：自动 UAC 提权 / 读取局域网模式 / 独立窗口运行服务
REM  本启动器窗口关闭不影响服务，服务在各独立窗口中运行
REM  与 start.bat 兼容：保留原逻辑，适配 CMD 语法（延迟展开）
REM ============================================================

REM ===== 自动请求管理员权限（UAC 提权）=====
net session >nul 2>&1
if errorlevel 1 (
    echo 正在请求管理员权限...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

REM ===== 项目路径配置（使用绝对路径，不依赖当前目录）=====
set PROJECT_ROOT=c:\RUANLINYUN\ruanlinyun-assistant
set BACKEND_DIR=%PROJECT_ROOT%\backend
set FRONTEND_DIR=%PROJECT_ROOT%\frontend

if not exist "%BACKEND_DIR%" (
    echo [错误] 后端目录不存在：%BACKEND_DIR%
    pause
    exit /b 1
)
if not exist "%FRONTEND_DIR%" (
    echo [错误] 前端目录不存在：%FRONTEND_DIR%
    pause
    exit /b 1
)

REM 检查是否存在.env文件，不存在则从示例文件复制
if not exist "%PROJECT_ROOT%\.env" (
    echo 未找到.env文件，从.env.example创建...
    copy "%PROJECT_ROOT%\.env.example" "%PROJECT_ROOT%\.env"
    echo 请编辑.env文件配置相关参数
)

REM ===== 读取局域网模式状态（与 start.bat 同逻辑）=====
set LAN_MODE=0
if exist "%PROJECT_ROOT%\.lan_mode" (
    for /f "usebackq delims=" %%i in ("%PROJECT_ROOT%\.lan_mode") do set LAN_MODE_VAL=%%i
    if "!LAN_MODE_VAL!"=="1" (
        set LAN_MODE=1
        echo [局域网模式] 已开启（来源：.lan_mode 文件）
    )
)

echo.
REM ===== [v24] 优先启动打包版 EXE（生产模式）；找不到再回退开发模式 =====
set PET_EXE=%USERPROFILE%\\Desktop\\kks\\阮云小宠.exe
if not exist "%PET_EXE%" (
    set PET_EXE=%PROJECT_ROOT%\\ah\\electron-out-v21\\ruanlinyun-win32-x64\\阮云小宠.exe
)
if exist "%PET_EXE%" (
    echo === 启动打包版阮琳云智能助手（EXE）===
    echo 路径：%PET_EXE%
    start "" "%PET_EXE%"
    echo.
    echo === 启动完成（打包版）===
    echo 提示：如需开发模式（源码热更新），请使用 scripts\start.bat
    echo.
    timeout /t 3 /nobreak >nul
    exit /b 0
)
echo [信息] 未找到打包版 EXE，回退开发模式...
echo.

echo === 启动阮琳云智能助手 ===
echo.

REM ===== 启动后端服务（独立 CMD 窗口，cmd /k 保持窗口）=====
echo [1/3] 正在启动后端服务...
if "!LAN_MODE!"=="1" (
    start "阮琳云-后端 27865" cmd /k "cd /d %BACKEND_DIR% && set LAN_MODE=1 && title 阮琳云-后端 27865 && npm start"
) else (
    start "阮琳云-后端 27865" cmd /k "cd /d %BACKEND_DIR% && title 阮琳云-后端 27865 && npm start"
)

REM 等待后端服务启动
echo       等待后端就绪...
timeout /t 4 /nobreak >nul

REM ===== 启动本地 TTS 语音服务（Edge-TTS 晓晓女声，可选）=====
set TTS_PY=C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe
if exist "%TTS_PY%" (
    "%TTS_PY%" -c "import edge_tts" >nul 2>nul
    if "!errorlevel!"=="0" (
        start "阮琳云-TTS 9880" cmd /k ""%TTS_PY%" "%PROJECT_ROOT%\scripts\tts_server.py""
        echo [TTS] 本地语音服务已启动（Edge-TTS 晓晓女声，端口 9880）
    ) else (
        echo [TTS] 未安装 edge-tts，跳过本地语音服务（需 pip install edge-tts）
    )
) else (
    echo [TTS] 未找到 Python312，跳过本地语音服务
)

REM ===== 启动前端服务（独立 CMD 窗口）=====
echo [2/3] 正在启动前端服务...
if "!LAN_MODE!"=="1" (
    start "阮琳云-前端 5175" cmd /k "cd /d %FRONTEND_DIR% && set LAN_MODE=1 && title 阮琳云-前端 5175 && npm run dev"
) else (
    start "阮琳云-前端 5175" cmd /k "cd /d %FRONTEND_DIR% && title 阮琳云-前端 5175 && npm run dev"
)

REM 等待前端 vite 启动
echo       等待前端就绪...
timeout /t 4 /nobreak >nul

REM ===== 打开浏览器 =====
echo [3/3] 正在打开浏览器...
start "" http://localhost:5175

echo.
echo === 启动完成 ===
if "!LAN_MODE!"=="1" (
    echo [局域网模式] 后端窗口：阮琳云-后端 27865
    echo [局域网模式] 前端窗口：阮琳云-前端 5175
    echo [局域网模式] 浏览器：http://localhost:5175
    echo 局域网设备可通过本机IP访问，例如：http://192.168.x.x:5175
    echo 在「设置」页可查看具体的局域网IP地址
) else (
    echo 后端窗口：阮琳云-后端 27865
    echo 前端窗口：阮琳云-前端 5175
    echo 浏览器：http://localhost:5175 已自动打开
)
echo.
echo 本启动器窗口可以关闭，服务会继续运行。
echo 如需停止服务，请关闭"阮琳云-后端"和"阮琳云-前端"窗口。
echo.
echo 启动器窗口将在 5 秒后自动关闭...
timeout /t 5 /nobreak >nul
exit
