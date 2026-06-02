import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Capacitor 8 插件使用 ESM，无需特殊 external 配置
      external: []
    }
  },
  // 预构建优化（Capacitor 插件需提前处理）
  optimizeDeps: {
    include: [
      '@capacitor/core',
      '@capacitor/app',
      '@capacitor/filesystem',
      '@capacitor/share'
    ]
  }
})