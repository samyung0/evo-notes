import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import path from 'node:path';

export default defineConfig({
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
    port: 5173,
    open: true,
    // When MSW is disabled (VITE_USE_MSW=false) /api hits the Go gateway.
    // With MSW on, the service worker intercepts before the proxy, so this is
    // harmless either way.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
});
