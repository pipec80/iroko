import { test as authTest, expect } from './fixtures/auth';

/**
 * Impersonation E2E smoke test (F3-C2). Requires a platform_admin seed with
 * MFA already enrolled and aal2 — not present in the default E2E fixtures
 * yet, so this is skipped until that seed exists. See F3-C1's manual QA
 * notes for how the admin + MFA setup was done by hand in local testing.
 */
authTest.describe('Impersonation — "Ver como" @smoke', () => {
  authTest.skip(
    true,
    'Requires a platform_admin E2E fixture with MFA enrolled (aal2) — not wired yet. ' +
      'Covered by manual QA until the fixture exists.',
  );

  authTest('admin can view as another user and exit', async ({ authenticatedPage: page }) => {
    await page.goto('/es/dashboard/admin/accounts');
    await expect(page).toHaveURL(/dashboard\/admin\/accounts/);
  });
});
