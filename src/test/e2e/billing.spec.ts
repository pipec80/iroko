import { runAxeCheck } from './axe';
import { test as authTest, expect } from './fixtures/auth';
import {
  createConfirmedUser,
  deleteUserById,
  execSqlAsPostgres,
  loginViaUi,
  uniqueEmail,
} from './helpers';

/**
 * Billing checkout mock E2E.
 * Uses authenticatedPage (Supabase Admin API on :54321) — NOT tagged @smoke.
 * Pre-reqs: `supabase start` on :54321 + Next dev server on :3000.
 */
authTest.describe('Billing — mock checkout', () => {
  authTest.setTimeout(60_000);

  authTest('subscribing to Plus activates the plan', async ({ authenticatedPage: page }) => {
    await page.goto('/es/dashboard/billing');
    await page.waitForURL(/\/es\/dashboard\/billing/);
    await runAxeCheck(page);

    // Elegir Plus → redirige a la hosted-page mock
    await page.getByTestId('subscribe-pro').click();
    await page.waitForURL(/\/billing\/mock-checkout/);

    // Pagar → vuelve a billing con la suscripción activa
    await page.getByTestId('mock-pay').click();
    await page.waitForURL(/\/dashboard\/billing/);

    await expect(page.getByTestId('current-plan')).toContainText(/plus/i);
  });
});

authTest.describe('Billing — Mercado Pago return confirmation', () => {
  authTest.setTimeout(90_000);

  async function createPendingSubscription(
    request: Parameters<typeof createConfirmedUser>[0],
    suffix: string,
  ) {
    const password = 'TestPass123!';
    const email = uniqueEmail(`e2e+billing-confirmation+${suffix}`);
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const userId = await createConfirmedUser(request, email, password, serviceKey);
    const externalId = `e2e-preapproval-${suffix}-${Date.now()}`;

    execSqlAsPostgres(
      `UPDATE public.profiles SET onboarding_completed = true WHERE id = '${userId}'`,
    );
    execSqlAsPostgres(
      `WITH customer AS (INSERT INTO billing.customers (account_id, provider) VALUES ('${userId}', 'mercadopago') RETURNING id) INSERT INTO billing.subscriptions (customer_id, plan_id, status, provider, external_subscription_id) SELECT customer.id, (SELECT id FROM billing.plans WHERE slug = 'pro' LIMIT 1), 'incomplete', 'mercadopago', '${externalId}' FROM customer`,
    );

    return { email, password, serviceKey, userId, externalId };
  }

  authTest(
    'a pending return confirms only after the exact subscription becomes active',
    async ({ page, request }) => {
      const seeded = await createPendingSubscription(request, 'active');
      try {
        await loginViaUi(page, seeded.email, seeded.password);
        await page.goto(`/es/dashboard/billing?preapproval_id=${seeded.externalId}`);

        await expect(page.getByText(/confirmando tu suscripción/i)).toBeVisible();
        execSqlAsPostgres(
          `UPDATE billing.subscriptions SET status = 'active', updated_at = now() WHERE provider = 'mercadopago' AND external_subscription_id = '${seeded.externalId}'`,
        );

        await expect(page.getByTestId('current-plan')).toBeVisible({ timeout: 10_000 });
        await expect(page).not.toHaveURL(/preapproval_id=/);
      } finally {
        await deleteUserById(request, seeded.userId, seeded.serviceKey);
      }
    },
  );

  authTest(
    'a pending return stops after 60 seconds with a visible retry',
    async ({ page, request }) => {
      const seeded = await createPendingSubscription(request, 'timeout');
      try {
        await loginViaUi(page, seeded.email, seeded.password);
        await page.goto(`/es/dashboard/billing?preapproval_id=${seeded.externalId}`);

        await expect(page.getByText(/confirmando tu suscripción/i)).toBeVisible();
        await expect(page.getByText(/confirmación está tardando/i)).toBeVisible({
          timeout: 65_000,
        });
        await expect(page.getByRole('button', { name: 'Volver a comprobar' })).toBeVisible();
      } finally {
        await deleteUserById(request, seeded.userId, seeded.serviceKey);
      }
    },
  );
});
