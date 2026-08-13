import { test, expect } from './fixtures/auth';

/**
 * Active account E2E — create a second Team and switch between accounts.
 *
 * Pre-reqs: `supabase start` on :54321 + Next dev/prod server on :3000.
 * Writes data — NOT tagged @smoke.
 *
 * Selector notes (verified against the real components, not guessed):
 * - The org-switcher trigger (`app-sidebar-client.tsx`) has a fixed
 *   `aria-label="Cambiar de organización"` — aria-label overrides subtree
 *   text for the accessible name, so the trigger's name never changes to
 *   the selected org's name. Assertions on "what's currently selected" are
 *   scoped to this locator's text content instead of a page-wide getByText,
 *   because the topbar breadcrumb independently renders the same org name
 *   uppercased (`app-topbar-client.tsx`, `orgLabel = ...toUpperCase()`),
 *   which would otherwise create a second case-insensitive match.
 * - "Nueva organización" (`create-team-dialog.tsx`) only mounts once the
 *   switcher dropdown is open (`{isOpen && (...)}` in app-sidebar-client.tsx).
 */
test.describe('Active account — switch and create', () => {
  test.setTimeout(60_000);

  test('user creates a second team, switches between accounts, survives reload', async ({
    authenticatedPage: page,
  }) => {
    const teamName = `Equipo E2E ${Date.now()}`;
    const switcherTrigger = page.getByRole('button', { name: /cambiar de organización/i });

    await page.goto('/es/dashboard');
    await page.waitForURL(/\/es\/dashboard$/);
    await expect(switcherTrigger).toContainText('Personal');

    // Open the switcher dropdown, then "Nueva organización" (only rendered while open).
    await switcherTrigger.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('button', { name: /nueva organización/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/nombre/i).fill(teamName);
    await dialog.getByRole('button', { name: /^crear$/i }).click();

    // create_team redirects to /{locale}/dashboard with the new team as active account.
    await page.waitForURL(/\/es\/dashboard$/);
    await expect(switcherTrigger).toContainText(teamName);

    // Switch back to Personal via the switcher.
    await switcherTrigger.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('option', { name: /personal/i }).click();
    await page.waitForURL(/\/es\/dashboard$/);
    await expect(switcherTrigger).toContainText('Personal');

    // Survives a reload — active account is resolved server-side, not just client state.
    await page.reload();
    await expect(switcherTrigger).toContainText('Personal');
  });

  /**
   * Regression coverage for a Critical finding: some Projects-module server
   * call sites derived accountId from get_my_account_id() (most-recently-
   * created accounts_memberships row) instead of the active-account JWT
   * claim. Those two sources normally agree — create_team() sets the new
   * team as BOTH the active account AND the newest membership in the same
   * transaction — so a naive "create team, use it" test can't reproduce the
   * bug: it passes identically against the old and new code.
   *
   * The real divergence needs switch_account(), which only updates
   * profiles.active_account_id and never touches accounts_memberships. So:
   * create a project on Personal, create a Team (now active + newest
   * membership), then switch back to Personal (now: active account =
   * Personal, but newest membership = the Team). Pre-fix, opening the
   * Personal project here would call get_my_account_id() → the Team's id →
   * getBySlug(teamId, personalSlug) → null → 404, even though the project
   * is correctly listed under the (already-migrated) Projects list page.
   */
  test("user's Personal project still resolves after creating and leaving a new team", async ({
    authenticatedPage: page,
  }) => {
    const teamName = `Equipo E2E ${Date.now()}`;
    const projectName = `e2e-project-${Date.now()}`;
    const switcherTrigger = page.getByRole('button', { name: /cambiar de organización/i });

    await page.goto('/es/dashboard');
    await page.waitForURL(/\/es\/dashboard$/);
    await expect(switcherTrigger).toContainText('Personal');

    // 1. Create a project while Personal is active (same flow as projects.spec.ts).
    await page.goto('/es/dashboard/projects');
    await page.waitForURL(/\/es\/dashboard\/projects/);
    await page
      .getByRole('button', { name: /nuevo proyecto/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('input[name="name"]').fill(projectName);
    await page.getByRole('button', { name: /crear proyecto/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 15_000 });

    // 2. Create a second team. create_team redirects to /dashboard with the
    // new team as active account — it's also the newest membership now, so
    // the two sources still agree at this point.
    await page.goto('/es/dashboard');
    await page.waitForURL(/\/es\/dashboard$/);
    await switcherTrigger.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('button', { name: /nueva organización/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/nombre/i).fill(teamName);
    await dialog.getByRole('button', { name: /^crear$/i }).click();
    await page.waitForURL(/\/es\/dashboard$/);
    await expect(switcherTrigger).toContainText(teamName);

    // 3. Switch back to Personal via the switcher — active account moves back
    // to Personal, but the Team's membership row (just created) remains the
    // newest one. This is the divergence the bug depended on.
    await switcherTrigger.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('option', { name: /personal/i }).click();
    await page.waitForURL(/\/es\/dashboard$/);
    await expect(switcherTrigger).toContainText('Personal');

    // 4. The assertion that would have caught the bug: with the divergence
    // in place, the Personal project from step 1 must still resolve.
    await page.goto('/es/dashboard/projects');
    await page.waitForURL(/\/es\/dashboard\/projects/);
    const projectCard = page.getByText(projectName);
    await expect(projectCard).toBeVisible({ timeout: 15_000 });

    await projectCard.click();
    await page.waitForURL(/\/es\/dashboard\/projects\/.+/);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('404')).not.toBeVisible();
  });
});
