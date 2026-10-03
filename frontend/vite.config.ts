import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

/**
 * 局域网模式判定：与后端 backend/src/server.ts 保持一致
 * 优先级：环境变量 LAN_MODE > .lan_mode 文件 > 默认关闭
 *
 * 局域网模式开启时，vite 服务绑定 0.0.0.0，允许局域网设备访问 5175 端口
 * 否则绑定 localhost，仅本机可访问（更安全）
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
    // 局域网模式：0.0.0.0（允许外部访问）；本机模式：localhost（更安全）
    host: isLanMode() ? '0.0.0.0' : 'localhost',
    port: 5175,
    // 局域网模式下允许外部访问
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['@yohawing/three-mmd-loader']
  },
  build: {
    // [2026-08-05 启动优化] 手动分块：大依赖拆到独立chunk，配合 React.lazy 懒加载
    // 首页只加载 react + mui + 业务代码（约1MB），Babylon.js（5MB+）只在模型预览时加载
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pages') && (id.includes('HomePage') || id.includes('NewPage') || id.includes('PetPage') || id.includes('SettingsPage'))) return 'pages';
          if (id.includes('node_modules')) {
            if (id.includes('@babylonjs') || id.includes('babylon-mmd')) return 'babylon';
            if (id.includes('@mui')) return 'mui';
          }
        }
      }
    }
  }
})
