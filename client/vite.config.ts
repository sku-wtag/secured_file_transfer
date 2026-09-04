import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const defaultClientPort = 5100;
const defaultApiProxyTarget = 'http://localhost:3000';
const reactDevtoolsBridgeUrl = 'http://localhost:8097';

function toPort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toUrl(value: string | undefined, fallback: string): string {
  return value === undefined || value.trim() === '' ? fallback : value;
}

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

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, repoRoot, ''), ...process.env };

  return {
    plugins: [react(), tailwindcss(), reactDevtoolsBridge()],
    resolve: {
      conditions: mode === 'development' ? ['development'] : [],
    },
    optimizeDeps: {
      exclude: ['shared'],
    },
    server: {
      port: toPort(env.CLIENT_PORT, defaultClientPort),
      proxy: {
        '/api': {
          target: toUrl(env.API_PROXY_TARGET, defaultApiProxyTarget),
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
  };
});
