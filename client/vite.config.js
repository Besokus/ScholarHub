import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './', // 确保根目录为当前目录
  publicDir: 'public', // 静态资源目录
  server: {
    port: 5173, // 指定开发服务器端口
  },
})