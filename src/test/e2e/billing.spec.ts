import { test as authTest, expect } from './fixtures/auth';

/**
 * Billing checkout mock E2E.
 * Uses authenticatedPage (Supabase Admin API on :54321) — NOT tagged @smoke.
 * Pre-reqs: `supabase start` on :54321 + Next dev server on :3000.
 */
authTest.describe('Billing — mock checkout', () => {
  authTest.setTimeout(60_000);

  authTest('subscribing to Pro activates the plan', async ({ authenticatedPage: page }) => {
    await page.goto('/es/dashboard/billing');
    await page.waitForURL(/\/es\/dashboard\/billing/);

    // Elegir Pro → redirige a la hosted-page mock
    await page.getByTestId('subscribe-pro').click();
    await page.waitForURL(/\/billing\/mock-checkout/);

    // Pagar → vuelve a billing con la suscripción activa
    await page.getByTestId('mock-pay').click();
    await page.waitForURL(/\/dashboard\/billing/);

    await expect(page.getByTestId('current-plan')).toContainText(/pro/i);
  });
});
