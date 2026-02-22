import { defineConfig } from '@playwright/test';

const FRONTEND_PORT = process.env.E2E_FRONTEND_PORT || '3100';
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts'],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `CI=true BROWSER=none HOST=127.0.0.1 PORT=${FRONTEND_PORT} npm start`,
    cwd: '../../apps/frontend',
    url: FRONTEND_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
