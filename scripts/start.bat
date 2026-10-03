@echo off
chcp 65001 >nul
echo === 启动阮琳云智能助手 ===

REM 检查是否存在.env文件，不存在则从示例文件复制
if not exist ".env" (
    echo 未找到.env文件，从.env.example创建...
    copy .env.example .env
    echo 请编辑.env文件配置相关参数
)

REM 读取局域网模式状态（与设置页的 .lan_mode 文件同步）
set LAN_MODE=0
if exist ".lan_mode" (
    for /f "delims=" %%i in (.lan_mode) do set LAN_MODE_VAL=%%i
    if "%LAN_MODE_VAL%"=="1" (
        set LAN_MODE=1
        echo [局域网模式] 已开启（来源：.lan_mode 文件）
    )
)

REM 安装依赖
echo.
echo === 安装依赖 ===
cd backend
npm install

REM 启动后端服务（传 LAN_MODE 环境变量）
echo.
echo === 启动后端服务 ===
if "%LAN_MODE%"=="1" (
    start "Backend" cmd /c "set LAN_MODE=1 && npm start"
) else (
    start "Backend" cmd /c "npm start"
)

REM 等待后端服务启动
echo 等待后端服务启动...
timeout /t 3 /nobreak >nul

REM 启动本地 TTS 语音服务（Edge-TTS 晓晓女声，可选；未安装 edge-tts 时自动跳过）
set TTS_PY=C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe
if exist "%TTS_PY%" (
    "%TTS_PY%" -c "import edge_tts" >nul 2>nul
    if not errorlevel 1 (
        start "TTS 9880" cmd /k ""%TTS_PY%" "%~dp0..\scripts\tts_server.py""
        echo === TTS 语音服务已启动（Edge-TTS 晓晓女声，端口 9880）===
    ) else (
        echo === 未安装 edge-tts，跳过 TTS 服务（pip install edge-tts）===
    )
) else (
    echo === 未找到 Python312，跳过 TTS 服务 ===
)

REM 启动前端服务（传 LAN_MODE 环境变量，vite.config.ts 会读取）
echo.
echo === 启动前端服务 ===
cd ..
cd frontend
npm install
if "%LAN_MODE%"=="1" (
    start "Frontend" cmd /c "set LAN_MODE=1 && npm run dev"
) else (
    start "Frontend" cmd /c "npm run dev"
)

echo.
echo === 启动完成 ===
if "%LAN_MODE%"=="1" (
    echo [局域网模式] 后端: http://0.0.0.0:27865
    echo [局域网模式] 前端: http://0.0.0.0:5175
    echo 局域网设备可通过本机IP访问，例如：http://192.168.x.x:5175
    echo 在「设置」页可查看具体的局域网IP地址
) else (
    echo 后端服务运行在: http://127.0.0.1:27865
    echo 前端服务运行在: http://localhost:5175
)
echo.
echo 按任意键停止所有服务...
pause >nul

echo 停止服务...
taskkill /F /FI "WINDOWTITLE eq Backend"
taskkill /F /FI "WINDOWTITLE eq Frontend"
echo 服务已停止
