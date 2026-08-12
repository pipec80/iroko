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
});
