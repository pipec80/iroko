import { test as authTest, expect } from './fixtures/auth';

/**
 * Activity log viewer E2E smoke test.
 * Pre-reqs: `supabase start` on :54321 + Next dev server on :3000.
 */
authTest.describe('Activity — audit log viewer @smoke', () => {
  authTest('owner can view their account activity log', async ({ authenticatedPage: page }) => {
    await page.goto('/es/dashboard/activity');
    await page.waitForURL(/\/es\/dashboard\/activity/);

    await expect(page.getByRole('heading', { name: /registro de actividad/i })).toBeVisible();
  });
});
