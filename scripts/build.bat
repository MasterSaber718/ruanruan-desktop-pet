@echo off

REM 阮琳云智能助手Windows打包脚本 (仅支持Windows和Android)

echo === 开始打包阮琳云智能助手 ===

REM 检查Node.js是否安装
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: Node.js 未安装
    echo 请访问 https://nodejs.org/ 下载并安装最新版本的Node.js
    echo 安装完成后重新运行此脚本
    pause
    exit /b 1
)

REM 检查npm是否可用
npm --version >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: npm 不可用
    echo 请确保Node.js安装正确
    pause
    exit /b 1
)

REM 检查并安装构建工具
echo 检查构建工具...
npm list -g electron-packager >nul 2>nul
if %errorlevel% neq 0 (
    echo 安装Electron Packager...
    npm install -g electron-packager
)

npm list -g react-native-cli >nul 2>nul
if %errorlevel% neq 0 (
    echo 安装React Native CLI...
    npm install -g react-native-cli
)

REM 创建输出目录
set OUTPUT_DIR=..\ah
mkdir "%OUTPUT_DIR%" 2>nul
mkdir "%OUTPUT_DIR%\backend" 2>nul
mkdir "%OUTPUT_DIR%\frontend" 2>nul
mkdir "%OUTPUT_DIR%\config" 2>nul
mkdir "%OUTPUT_DIR%\scripts" 2>nul
mkdir "%OUTPUT_DIR%\android" 2>nul
mkdir "%OUTPUT_DIR%\desktop" 2>nul

REM 构建前端
echo.
echo === 构建前端 ===
cd "..\frontend"
npm install
npm run build

REM 构建后端
echo.
echo === 构建后端 ===
cd "..\backend"
npm install
npm run build

REM 构建移动应用
echo.
echo === 构建Android应用 (APK) ===
cd ".."
cd "frontend"
REM 检查React Native是否安装
npm list -g react-native-cli >nul 2>nul
if %errorlevel% equ 0 (
    echo React Native已安装，开始构建Android应用...
    react-native run-android --variant=release || echo Android构建失败，可能需要配置Android开发环境
    REM 假设APK文件在android/app/build/outputs/apk/release目录
    if exist "android\app\build\outputs\apk\release\app-release.apk" (
        copy "android\app\build\outputs\apk\release\app-release.apk" "..\ah\android\ruanlinyun-assistant.apk"
        echo Android APK 已复制到 %OUTPUT_DIR%\android\
    ) else (
        echo Android APK 未找到，可能需要手动构建
    )
) else (
    echo React Native 未安装，跳过Android应用构建
    echo 请运行: npm install -g react-native-cli 来安装
)
cd ".."

REM 构建桌面应用 (Windows EXE)
echo.
echo === 构建Windows桌面应用 (EXE) ===
echo.
echo === 构建原生桌面端(Python+PySide6)打包 ===
REM 自动探测 Python：优先项目固定路径 C:\Python314，回退到 PATH 中的 python
set PYTHON_EXE=C:\Python314\python.exe
if not exist "%PYTHON_EXE%" (
    where python >nul 2>nul
    if %errorlevel% equ 0 set PYTHON_EXE=python
)
if exist "%PYTHON_EXE%" (
    echo Using Python: %PYTHON_EXE%
    "%PYTHON_EXE%" -m pip --version >nul 2>nul
    if %errorlevel% neq 0 (
        echo [WARN] pip不可用，跳过PyInstaller打包
    ) else (
        echo Installing desktop requirements...
        "%PYTHON_EXE%" -m pip install -r "desktop\requirements.txt" >nul 2>nul
        "%PYTHON_EXE%" -m pip install pyinstaller >nul 2>nul
        if not exist "%OUTPUT_DIR%\desktop_native" mkdir "%OUTPUT_DIR%\desktop_native" 2>nul
        echo Packaging desktop renderer with PyInstaller...
        cd "desktop"
        "%PYTHON_EXE%" -m PyInstaller --noconfirm --clean --windowed --name "RuanLinYunDesktop" ^
          --add-data "shaders;shaders" ^
          --distpath "..\ah\desktop_native" ^
          --workpath "..\ah\pyinstaller_work" ^
          --specpath "..\ah\pyinstaller_spec" ^
          main.py || echo PyInstaller打包失败，可能缺少VC运行库或依赖
        cd ".."
    )
) else (
    echo [WARN] Python not found at %PYTHON_EXE% ，跳过PyInstaller打包
)
REM 检查Electron Packager是否安装
npm list -g electron-packager >nul 2>nul
if %errorlevel% equ 0 (
    echo Electron Packager已安装，开始构建Windows桌面应用...
    cd "frontend"
    REM 构建Windows应用 (EXE)
    electron-packager . "阮琳云智能助手" --platform=win32 --arch=x64 --out="../ah/desktop" || echo Windows构建失败，可能需要配置Electron环境
    cd ".."
    echo Windows桌面应用已构建到 %OUTPUT_DIR%\desktop\
) else (
    echo Electron Packager 未安装，跳过Windows桌面应用构建
    echo 请运行: npm install -g electron-packager 来安装
)

REM 复制必要文件到输出目录
echo.
echo === 复制文件到输出目录 ===

REM 复制后端构建文件
xcopy "backend\dist" "%OUTPUT_DIR%\backend\dist" /E /I
copy "backend\package.json" "%OUTPUT_DIR%\backend\"
copy "backend\package-lock.json" "%OUTPUT_DIR%\backend\"

REM 复制前端构建文件
xcopy "frontend\dist" "%OUTPUT_DIR%\frontend\dist" /E /I

REM 复制配置文件
xcopy "config" "%OUTPUT_DIR%\config" /E /I 2>nul

REM 复制启动脚本
copy "scripts\start.sh" "%OUTPUT_DIR%\"
copy "scripts\start.bat" "%OUTPUT_DIR%\"

REM 复制环境变量示例文件
copy ".env.example" "%OUTPUT_DIR%\"

REM 复制README文件
copy "README.md" "%OUTPUT_DIR%\"

echo.
echo === 打包完成 ===
echo 输出目录: %OUTPUT_DIR%
echo.
echo 使用方法:
echo 1. 复制ah目录到目标机器
echo 2. 根据设备类型选择相应的安装包:
echo    - Windows: 运行 start.bat 或使用desktop目录中的EXE文件
echo    - Android: 安装android目录中的APK文件
echo 3. 首次运行时会自动配置环境
echo 4. 打开应用或浏览器访问 http://localhost:3000
echo.
echo 按任意键退出...
pause >nul
