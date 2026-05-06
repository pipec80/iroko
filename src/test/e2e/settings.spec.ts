import { expect, test } from '@playwright/test';

/**
 * Settings page smoke tests (no login required — we assert the route guard + UI skeleton).
 * Full CRUD scenarios require a logged-in session which is costly in CI; the hand-off is
 * covered by the unit tests + manual walkthrough.
 */

test.describe('Settings page', () => {
  test('requires authentication', async ({ page }) => {
    await page.goto('/es/dashboard/settings');
    await page.waitForURL(/\/es\/login/);
    expect(page.url()).toContain('next=%2Fes%2Fdashboard%2Fsettings');
  });

  test('requires authentication for each tab', async ({ page }) => {
    for (const tab of ['profile', 'security', 'sessions']) {
      await page.goto(`/es/dashboard/settings?tab=${tab}`);
      await page.waitForURL(/\/es\/login/);
    }
  });
});
