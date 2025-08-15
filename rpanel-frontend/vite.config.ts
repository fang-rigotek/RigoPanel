import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  plugins: [
    preact(),
    UnoCSS(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['betadevelop.com'],
    proxy: {
      // 仅开发期便捷；正式走 Nginx 同域反代
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
}); 
