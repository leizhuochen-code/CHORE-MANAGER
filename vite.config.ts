import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 相对路径：构建产物可直接双击 dist/index.html（file:// + HashRouter）运行
  base: './',
  plugins: [react()],
  test: {
    environment: 'node', // recurrence 测试是纯函数，无需 jsdom
    include: ['src/**/*.test.ts'],
  },
})
