// vite.config.ts（完全覆盖，只保留这些代码）
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // 强制指定入口文件：src/main.tsx
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/main.tsx'), // 显式入口路径
      },
    },
  },
  // 开发服务器配置，确保入口生效
  server: {
    open: true, // 自动打开浏览器
    fs: {
      strict: false, // 宽松文件检查，避免路径权限问题
    },
  },
});