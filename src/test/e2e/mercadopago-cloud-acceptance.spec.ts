import { expect, test } from '@playwright/test';

const requiredSecrets = ['IROKO_E2E_TEST_USER_EMAIL', 'IROKO_E2E_TEST_USER_PASSWORD'] as const;

test.skip(
  process.env.MERCADOPAGO_CLOUD_ACCEPTANCE !== '1',
  'Mercado Pago Cloud acceptance runs only from its manual protected workflow.',
);

function requireCloudAcceptanceConfiguration() {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL;

  if (!baseUrl?.startsWith('https://')) {
    throw new Error('mercadopago_cloud_acceptance_requires_https_playwright_base_url');
  }

  if (process.env.MERCADOPAGO_CLOUD_ACCEPTANCE !== '1') {
    throw new Error('mercadopago_cloud_acceptance_requires_explicit_opt_in');
  }

  for (const name of requiredSecrets) {
    if (!process.env[name]) throw new Error(`mercadopago_cloud_acceptance_missing_${name}`);
  }
}

/**
 * Creates or resumes exactly one hosted Mercado Pago checkout against the
 * deployed application. It intentionally stops before provider login/payment:
 * financial acceptance runs require a named sandbox scenario and explicit
 * authorization, and are kept in later MP-01/MP-02 steps.
 */
test('MP-01 starts a hosted Mercado Pago checkout from the deployed app', async ({ page }) => {
  requireCloudAcceptanceConfiguration();

  await page.goto('/es/login');
  await page
    .locator('input[name="email"][type="email"]')
    .fill(process.env.IROKO_E2E_TEST_USER_EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.IROKO_E2E_TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click();
  await page.waitForURL(/\/es\/dashboard/, { timeout: 30_000 });

  await page.goto('/es/dashboard/billing');
  await page.getByTestId('subscribe-pro').click();

  await expect
    .poll(() => new URL(page.url()).hostname, { timeout: 30_000 })
    .toMatch(/mercadopago/i);
  await expect(page).toHaveURL(/^https:\/\//);
});
