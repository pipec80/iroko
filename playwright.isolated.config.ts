import { defineConfig, devices } from '@playwright/test';

import { requireLoopbackUrl, resolveDbTarget } from './src/test/local-e2e-target';

if (process.env.LOCAL_VALIDATION !== 'true') throw new Error('LOCAL_VALIDATION=true is required');
resolveDbTarget(process.env, '');
const baseURL = requireLoopbackUrl(process.env.PLAYWRIGHT_BASE_URL);
if (baseURL !== requireLoopbackUrl(process.env.SITE_URL))
  throw new Error('SITE_URL must match the isolated browser target');
if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Explicit disposable Supabase credentials are required');
}

export default defineConfig({
  testDir: './src/test/e2e',
  testMatch: 'robot-disabled.spec.ts',
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL, trace: 'off', screenshot: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The coordinator starts the isolated application after its environment gate.
  // This config never reads .env.local or reuses/starts a default application.
});
