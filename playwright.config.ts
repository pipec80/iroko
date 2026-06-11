import { defineConfig, devices } from '@playwright/test';

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
      use: {
        ...devices['Desktop Chrome'],
        // En CI usa el Google Chrome pre-instalado en el runner (evita descargar Playwright Chromium)
        ...(process.env.CI ? { channel: 'chrome' } : {}),
      },
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
