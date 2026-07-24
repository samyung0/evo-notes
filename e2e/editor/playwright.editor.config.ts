import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Editor feature matrix. Run with: pnpm e2e:editor
 *
 * Like the perf harness (and unlike the functional sharing suite) this runs
 * against the Vite dev server with MSW mocks — no Docker stack. Everything the
 * matrix asserts (block selection, context menu, drag handles, mentions,
 * suggestions, formatting) is client-side Plate behavior; MSW supplies
 * deterministic materials/members/discussions endpoints.
 *
 * Isolation: the mock db is page-module state, so every page.goto() starts
 * from the pristine VITE_E2E_EDITOR_SEED fixtures. Tests can freely mutate
 * documents without cross-test cleanup.
 *
 * NOTE: requests fulfilled by MSW's service worker are not reliably observable
 * via page.waitForResponse — assert on resulting UI state instead.
 */

const editorDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(editorDir, '..', '..');
const port = Number(process.env.EDITOR_E2E_PORT ?? 4518);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: editorDir,
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  // Eight concurrent Chromium contexts can exhaust Windows' socket buffer
  // while Vite and MSW initialize every page. Four keeps the matrix parallel
  // without producing transient ERR_NO_BUFFER_SPACE navigation failures.
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-editor' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
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
      VITE_E2E_EDITOR_SEED: 'true',
      VITE_CLERK_PUBLISHABLE_KEY: '',
    },
  },
  projects: [
    {
      name: 'chromium-editor',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
