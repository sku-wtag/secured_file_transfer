import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';
const reactDevtoolsBridgeUrl = 'http://localhost:8097';

function reactDevtoolsBridge(): Plugin {
  return {
    name: 'react-devtools-bridge',
    apply: 'serve',
    transformIndexHtml: () => [
      {
        tag: 'script',
        attrs: { src: reactDevtoolsBridgeUrl },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), reactDevtoolsBridge()],
  resolve: {
    conditions: mode === 'development' ? ['development'] : [],
  },
  optimizeDeps: {
    exclude: ['shared'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
