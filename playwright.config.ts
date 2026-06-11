import { existsSync, readFileSync } from 'fs';

import { defineConfig, devices } from '@playwright/test';

// .env.local is loaded by Next.js for the dev server automatically, but Playwright
// test workers are separate Node.js processes that don't inherit those vars. Load
// it here so tests can access SUPABASE_SECRET_KEY and other server-side secrets.
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (!m) continue;
    const [, key, raw] = m;
    if (!process.env[key]) process.env[key] = raw.replace(/^(['"])(.*)\1$/, '$2');
  }
}

// E2E: desactivar Turnstile — Chromium headless no soporta el widget.
// Misma estrategia que CI: sin la variable, CaptchaField no renderiza nada
// y captchaReady arranca en true → botones habilitados desde el inicio.
delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Playwright configuration for Next.js E2E testing.
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // PLAYWRIGHT_BASE_URL overrides local default — used by nightly production monitoring.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers.
   * Default to Chromium-only for speed. Add Firefox/WebKit/Mobile via CLI:
   *   pnpm test:e2e --project firefox
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Skip local server when PLAYWRIGHT_BASE_URL is set (production monitoring)
  ...(process.env.PLAYWRIGHT_BASE_URL ?
    {}
  : {
      webServer: {
        command: process.env.CI ? 'pnpm build && pnpm start' : 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
    }),
});
