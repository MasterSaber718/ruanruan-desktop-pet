@echo off
chcp 65001 >nul
echo ======================================
echo   RuanLinYun Desktop 3D Renderer
echo ======================================
echo.

REM 设置 Python 路径（项目依赖优先用仓库内 Lib\site-packages，回退到原绝对路径）
if exist "%~dp0..\Lib\site-packages" (
    set PYTHONPATH=%~dp0..\Lib\site-packages
) else (
    set PYTHONPATH=c:\RUANLINYUN\Lib\site-packages
)

REM 自动探测 Python：优先项目固定路径 C:\Python314，回退到 PATH 中的 python
set PYTHON_EXE=C:\Python314\python.exe
if exist "%PYTHON_EXE%" goto python_found
where python >nul 2>nul
if %errorlevel% equ 0 (
    set PYTHON_EXE=python
    goto python_found
)
echo [ERROR] Python not found. Please install Python 3.14 or add python to PATH.
pause
exit /b 1
:python_found
echo Using Python: %PYTHON_EXE%

REM 检查依赖
echo Checking dependencies...
"%PYTHON_EXE%" -c "import PySide6, OpenGL, numpy, PIL" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Missing dependencies. Please run:
    echo   pip install PySide6 PyOpenGL numpy Pillow
    pause
    exit /b 1
)

REM 切换到桌面端目录
cd /d "%~dp0..\desktop"

echo Starting desktop renderer...
"%PYTHON_EXE%" main.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Application exited with code %errorlevel%
    pause
)
