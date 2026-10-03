import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

/**
 * 局域网模式判定：与后端 backend/src/server.ts 保持一致
 * 优先级：环境变量 LAN_MODE > .lan_mode 文件 > 默认关闭
 */
function isLanMode(): boolean {
  if (process.env.LAN_MODE === '1') return true
  try {
    const file = path.resolve(__dirname, '..', '.lan_mode')
    return fs.existsSync(file) && fs.readFileSync(file, 'utf-8').trim() === '1'
  } catch {
    return false
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: isLanMode() ? '0.0.0.0' : 'localhost',
    port: 5175,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['@yohawing/three-mmd-loader']
  },
  build: {
    // [移动端适配] 目标平台包含移动端
    target: 'es2020',
    // [移动端适配] 启用 CSS 代码分割
    cssCodeSplit: true,
    // [移动端适配] 生成 sourcemap（调试用，生产可关）
    sourcemap: false,
    // [移动端适配] 警告阈值
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Babylon.js（5MB+）拆到独立 chunk，仅模型预览/桌宠时加载
            if (id.includes('@babylonjs') || id.includes('babylon-mmd')) return 'babylon';
            // MUI 拆到独立 chunk（所有页面共用）
            if (id.includes('@mui')) return 'mui';
            // three.js 拆到独立 chunk（移动端不需要时可延迟加载）
            if (id.includes('three') || id.includes('@types/three')) return 'three';
          }
          // AI 模块（50+ 文件，500+KB）拆到独立 chunk，仅发消息时懒加载
          if (id.includes('/src/ai/')) return 'ai';
        }
      }
    }
  }
})
