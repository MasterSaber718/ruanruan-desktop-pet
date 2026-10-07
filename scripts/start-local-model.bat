@echo off
rem ============================================================
rem  阮阮桌面宠物 · 本地兜底模型启动器（qwen3 0.6B · CPU）
rem  参数按定案：ctx 2048 · temp 0.7 · qwen3 思维链关闭（--jinja，
rem  软件侧请求带 enable_thinking:false）
rem  端口 11434（OpenAI 兼容 /v1）——软件本地兜底自动连接
rem ============================================================
chcp 65001 >nul
setlocal
set HERE=%~dp0
set LLAMA=%HERE%llama-server.exe
set MODEL=%HERE%Qwen3-0.6B-Q8_0.gguf

if not exist "%LLAMA%" (
  echo [错误] 未找到 llama-server.exe，请先解压 llama.cpp CPU 版到本目录
  pause & exit /b 1
)
if not exist "%MODEL%" (
  echo [错误] 未找到模型文件 Qwen3-0.6B-Q8_0.gguf
  pause & exit /b 1
)

echo [阮阮] 本地兜底模型启动中：http://127.0.0.1:11434/v1
"%LLAMA%" -m "%MODEL%" --host 127.0.0.1 --port 11434 --ctx-size 2048 --temp 0.7 --jinja --flash-attn off --no-mmap
pause
