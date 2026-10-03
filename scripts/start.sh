#!/bin/bash

# 阮琳云智能助手启动脚本 (Linux/Mac)

echo "=== 启动阮琳云智能助手 ==="

# 检查是否存在.env文件，不存在则从示例文件复制
if [ ! -f ".env" ]; then
  echo "未找到.env文件，从.env.example创建..."
  cp .env.example .env
  echo "请编辑.env文件配置相关参数"
fi

# 安装依赖
echo "\n=== 安装依赖 ==="
cd backend
npm install

# 启动后端服务
echo "\n=== 启动后端服务 ==="
npm start &

# 等待后端服务启动
sleep 3

# 启动前端服务
echo "\n=== 启动前端服务 ==="
cd ../frontend
npm install
npm run dev &

echo "\n=== 启动完成 ==="
echo "后端服务运行在: http://127.0.0.1:27865"
echo "前端服务运行在: http://localhost:5175"
echo "\n按 Ctrl+C 停止所有服务"

# 等待用户输入
trap "kill 0" EXIT
wait
