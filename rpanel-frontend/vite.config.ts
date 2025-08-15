import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Vite 配置文件
export default defineConfig({
  plugins: [preact()],
  server: {
    host: '0.0.0.0',      // 允许外部访问
    port: 5173,
    strictPort: true,     // 端口被占用时直接报错，不会自动换
    allowedHosts: ['betadevelop.com'], // 允许用这个域名访问
  },
});

