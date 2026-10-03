#!/bin/bash

# 阮琳云智能助手打包脚本 (仅支持Windows和Android)

set -e

echo "=== 开始打包阮琳云智能助手 ==="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装"
    echo "请访问 https://nodejs.org/ 下载并安装最新版本的Node.js"
    echo "安装完成后重新运行此脚本"
    exit 1
fi

# 检查npm是否可用
if ! command -v npm &> /dev/null; then
    echo "错误: npm 不可用"
    echo "请确保Node.js安装正确"
    exit 1
fi

# 检查并安装构建工具
echo "检查构建工具..."
if ! command -v electron-packager &> /dev/null; then
    echo "安装Electron Packager..."
    npm install -g electron-packager
fi

if ! command -v react-native &> /dev/null; then
    echo "安装React Native CLI..."
    npm install -g react-native-cli
fi

# 创建输出目录
OUTPUT_DIR="../ah"
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/backend"
mkdir -p "$OUTPUT_DIR/frontend"
mkdir -p "$OUTPUT_DIR/config"
mkdir -p "$OUTPUT_DIR/scripts"
mkdir -p "$OUTPUT_DIR/android"
mkdir -p "$OUTPUT_DIR/desktop"

# 构建前端
echo "\n=== 构建前端 ==="
cd "../frontend"
npm install
npm run build

# 构建后端
echo "\n=== 构建后端 ==="
cd "../backend"
npm install
npm run build

# 构建移动应用
echo "\n=== 构建Android应用 (APK) ==="
cd ".."

# 构建Android应用 (APK)
if command -v react-native &> /dev/null; then
  echo "\n=== 构建Android应用 (APK) ==="
  cd "frontend"
  react-native run-android --variant=release || echo "Android构建失败，可能需要配置Android开发环境"
  cd ".."
  # 假设APK文件在android/app/build/outputs/apk/release目录
  if [ -f "frontend/android/app/build/outputs/apk/release/app-release.apk" ]; then
    cp "frontend/android/app/build/outputs/apk/release/app-release.apk" "$OUTPUT_DIR/android/ruanlinyun-assistant.apk"
    echo "Android APK 已复制到 $OUTPUT_DIR/android/"
  else
    echo "Android APK 未找到，可能需要手动构建"
  fi
else
  echo "React Native 未安装，跳过Android应用构建"
  echo "请运行: npm install -g react-native-cli 来安装"
fi

# 构建桌面应用 (Windows EXE)
echo "\n=== 构建Windows桌面应用 (EXE) ==="
if command -v electron-packager &> /dev/null; then
  echo "\n=== 构建Windows桌面应用 (EXE) ==="
  cd "frontend"
  # 构建Windows应用 (EXE)
  electron-packager . "阮琳云智能助手" --platform=win32 --arch=x64 --out="../ah/desktop" || echo "Windows构建失败，可能需要配置Electron环境"
  cd ".."
  echo "Windows桌面应用已构建到 $OUTPUT_DIR/desktop/"
else
  echo "Electron Packager 未安装，跳过Windows桌面应用构建"
  echo "请运行: npm install -g electron-packager 来安装"
fi

# 复制必要文件到输出目录
echo "\n=== 复制文件到输出目录 ==="

# 复制后端构建文件
cp -r "backend/dist" "$OUTPUT_DIR/backend/"
cp "backend/package.json" "$OUTPUT_DIR/backend/"
cp "backend/package-lock.json" "$OUTPUT_DIR/backend/"

# 复制前端构建文件
cp -r "frontend/dist" "$OUTPUT_DIR/frontend/"

# 复制配置文件
cp -r "config" "$OUTPUT_DIR/" 2>/dev/null || echo "配置目录不存在，跳过"

# 复制启动脚本
cp "scripts/start.sh" "$OUTPUT_DIR/"
cp "scripts/start.bat" "$OUTPUT_DIR/"

# 复制环境变量示例文件
cp ".env.example" "$OUTPUT_DIR/"

# 复制README文件
cp "README.md" "$OUTPUT_DIR/"

echo "\n=== 打包完成 ==="
echo "输出目录: $OUTPUT_DIR"
echo "\n使用方法:"
echo "1. 复制ah目录到目标机器"
echo "2. 根据设备类型选择相应的安装包:"
echo "   - Windows: 运行 start.bat 或使用desktop目录中的EXE文件"
echo "   - Android: 安装android目录中的APK文件"
echo "3. 首次运行时会自动配置环境"
echo "4. 打开应用或浏览器访问 http://localhost:3000"
