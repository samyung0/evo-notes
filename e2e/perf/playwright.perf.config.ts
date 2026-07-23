import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Editor performance harness. Run with: pnpm perf
 *
 * Unlike the functional e2e suite this runs against the Vite dev server with
 * MSW mocks (no Docker stack): typing latency and frame rate are entirely
 * client-side, and mocks remove backend variance from the numbers.
 *
 * Environment knobs:
 * - PERF_CPU     CPU throttling rate applied via CDP after page load
 *                (default 4; try 6+ to approximate low-end mobile).
 * - PERF_PORT    Vite port for the harness (default 4517).
 *
 * Numbers are absolute-machine-dependent: budgets in the specs are regression
 * tripwires with generous headroom, not UX targets. Use DevTools traces for
 * diagnosis; use these tests to notice when something gets much worse.
 */

const perfDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(perfDir, '..', '..');
const port = Number(process.env.PERF_PORT ?? 4517);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: perfDir,
  testMatch: '**/*.perf.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-perf' }]],
  use: {
    baseURL,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    cwd: root,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_USE_MSW: 'true',
      // Adds the deterministic large/small perf notes to the mock db.
      VITE_PERF_SEED: 'true',
      VITE_CLERK_PUBLISHABLE_KEY: '',
    },
  },
  projects: [
    {
      name: 'chromium-perf',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
