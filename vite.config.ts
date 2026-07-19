import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/i18n/paraglide',
        strategy: ['localStorage', 'preferredLanguage', 'baseLocale'],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@paraglide': path.resolve(__dirname, './src/i18n/paraglide'),
      },
    },
    server: {
      port: parseInt(env.VITE_PORT) || 5173,
      open: true,
      watch: {
        ignored: ['**/pipeline/**', '**/old-pipeline/**', '**/server/**', '**/dist/**'],
      },
      // When MSW is disabled (VITE_USE_MSW=false) /api hits the Go gateway.
      // With MSW on, the service worker intercepts before the proxy, so this is
      // harmless either way.
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          // Forward E2E identity headers used by Playwright actor fixtures.
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const user = req.headers['x-e2e-user-id'];
              const secret = req.headers['x-e2e-secret'];
              if (typeof user === 'string') proxyReq.setHeader('X-E2E-User-Id', user);
              if (typeof secret === 'string') proxyReq.setHeader('X-E2E-Secret', secret);
            });
          },
        },
      },
    },
  };
});
