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
   * created membership) instead of the active-account JWT claim. A user who
   * switched away from their most-recent membership got a 404 clicking into
   * a project that was correctly listed on the (already-migrated) Projects
   * list page. This test proves the cross-cutting property that bug broke:
   * after switching active account, creating a project and opening its
   * detail page must resolve — not 404 — for the newly-active team.
   */
  test('user creates a project in a newly-switched team, then opens it without a 404', async ({
    authenticatedPage: page,
  }) => {
    const teamName = `Equipo E2E ${Date.now()}`;
    const projectName = `e2e-project-${Date.now()}`;
    const switcherTrigger = page.getByRole('button', { name: /cambiar de organización/i });

    await page.goto('/es/dashboard');
    await page.waitForURL(/\/es\/dashboard$/);

    // Create a second team — create_team makes it the active account and redirects here.
    await switcherTrigger.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('button', { name: /nueva organización/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/nombre/i).fill(teamName);
    await dialog.getByRole('button', { name: /^crear$/i }).click();
    await page.waitForURL(/\/es\/dashboard$/);
    await expect(switcherTrigger).toContainText(teamName);

    // Create a project in the newly-active team (same flow as projects.spec.ts).
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

    const projectCard = page.getByText(projectName);
    await expect(projectCard).toBeVisible({ timeout: 15_000 });

    // The assertion that would have caught the bug: opening the project's
    // detail page from the newly-active team must resolve, not 404.
    await projectCard.click();
    await page.waitForURL(/\/es\/dashboard\/projects\/.+/);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('404')).not.toBeVisible();
  });
});
