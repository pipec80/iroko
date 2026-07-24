import { test, expect } from '@playwright/test';

import { createConfirmedUser, deleteUserById, uniqueEmail } from './helpers';

/**
 * Onboarding wizard E2E (F3-C4).
 *
 * Pre-reqs: `supabase start` on :54321 + Next dev server on :3000.
 * Users are created fresh (onboarding_completed=false by default) — do NOT
 * reuse the `authenticatedPage` fixture, which marks users as onboarded.
 */
test.describe('Onboarding wizard', () => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), 'requires local Supabase (127.0.0.1:54321)');

  const password = 'TestPass123!';

  test('signup redirects to onboarding, completing all steps lands on /dashboard, refresh does not bounce back', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('e2e+onboarding');
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const userId = await createConfirmedUser(request, email, password, serviceKey);

    await page.goto('/es/login');
    await page.locator('input[name="email"][type="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await page.waitForURL(/\/es\/dashboard\/onboarding/, { timeout: 20_000 });

    await page.getByLabel('Nombre de la organización').fill('Mi Empresa E2E');
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await page.getByRole('button', { name: 'Invitar después' }).click();

    const planNext = page.getByRole('button', { name: 'Siguiente' });
    if (await planNext.isVisible().catch(() => false)) {
      await planNext.click();
    }

    await page.getByRole('button', { name: 'Finalizar' }).click();

    await page.waitForURL(/\/es\/dashboard$/, { timeout: 20_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/es\/dashboard$/);

    await deleteUserById(request, userId, serviceKey);
  });

  test('"Omitir configuración" from step 1 also lands on /dashboard, refresh does not bounce back', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('e2e+onboarding-skip');
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const userId = await createConfirmedUser(request, email, password, serviceKey);

    await page.goto('/es/login');
    await page.locator('input[name="email"][type="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await page.waitForURL(/\/es\/dashboard\/onboarding/, { timeout: 20_000 });

    await page.getByRole('button', { name: 'Omitir configuración' }).click();

    await page.waitForURL(/\/es\/dashboard$/, { timeout: 20_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/es\/dashboard$/);

    await deleteUserById(request, userId, serviceKey);
  });
});
