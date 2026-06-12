import { expect } from '@playwright/test';

import { test as authTest } from './fixtures/auth';

/**
 * Projects dashboard E2E tests.
 *
 * Pre-reqs: `supabase start` on :54321 + Next dev server on :3000.
 * These tests write data — NOT tagged @smoke.
 */

authTest.describe('Projects dashboard — create project', () => {
  authTest.setTimeout(60_000);

  authTest(
    'new project dialog: submit name → project card appears in the grid',
    async ({ authenticatedPage: page }) => {
      const projectName = `e2e-project-${Date.now()}`;

      await page.goto('/es/dashboard/projects');
      await page.waitForURL(/\/es\/dashboard\/projects/);

      // Open the "Nuevo proyecto" dialog from the header button
      await page
        .getByRole('button', { name: /nuevo proyecto/i })
        .first()
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /nuevo proyecto/i })).toBeVisible();

      // Fill in the project name
      await page.locator('input[name="name"]').fill(projectName);

      // Submit
      await page.getByRole('button', { name: /crear proyecto/i }).click();

      // Visible success: dialog closes and the new project card appears in the grid
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 15_000 });
    },
  );
});
