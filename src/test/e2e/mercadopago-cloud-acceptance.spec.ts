import { expect, request as apiRequest, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  assertCanonicalCloudAcceptanceUrl,
  assertSupabaseGenerateLinkStatus,
  supabaseAdminHeaders,
  supabaseGenerateLinkTokenHash,
} from './mercadopago-cloud-acceptance-config';

const requiredSecrets = [
  'IROKO_E2E_TEST_USER_EMAIL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
] as const;

// API request traces also capture secret headers from isolated Node contexts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

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

  assertCanonicalCloudAcceptanceUrl(baseUrl);

  for (const name of requiredSecrets) {
    if (!process.env[name]) throw new Error(`mercadopago_cloud_acceptance_missing_${name}`);
  }
}

/**
 * Establishes a session for the dedicated test account through the deployed
 * application's OTP confirmation route. This intentionally avoids automating
 * Turnstile: its real production protection remains enabled and headless
 * browsers do not receive an onSuccess token. The service key stays in the
 * protected GitHub environment and is never passed to the browser.
 */
async function signInTestAccountThroughOtp(page: Page) {
  // A fresh Node context inherits neither browser identity nor the Vercel
  // bypass header configured for requests to the application itself.
  const adminRequest = await apiRequest.newContext({
    baseURL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    extraHTTPHeaders: supabaseAdminHeaders(process.env.SUPABASE_SECRET_KEY!),
  });
  let body: unknown;
  try {
    const response = await adminRequest.post('/auth/v1/admin/generate_link', {
      maxRedirects: 0,
      data: { type: 'magiclink', email: process.env.IROKO_E2E_TEST_USER_EMAIL! },
    });
    assertSupabaseGenerateLinkStatus(response.status());
    body = await response.json();
  } finally {
    await adminRequest.dispose();
  }
  const tokenHash = supabaseGenerateLinkTokenHash(body);
  const confirmation = await page.request.get(
    `/es/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/es/dashboard/billing`,
    { maxRedirects: 0 },
  );
  expect(
    confirmation.status(),
    'The deployed app must exchange the generated OTP',
  ).toBeGreaterThanOrEqual(300);
  expect(confirmation.status(), 'The deployed app must exchange the generated OTP').toBeLessThan(
    400,
  );

  // page.request shares the BrowserContext cookie store. Keeping the redirect
  // un-followed retains the session on the exact deployment under test even
  // when SITE_URL is a stable production alias.
  await page.goto('/es/dashboard/billing');
  await page.waitForURL(/\/es\/dashboard\/billing/, { timeout: 30_000 });
}

/**
 * Creates or resumes exactly one hosted Mercado Pago checkout against the
 * deployed application. It intentionally stops before provider login/payment:
 * financial acceptance runs require a named sandbox scenario and explicit
 * authorization, and are kept in later MP-01/MP-02 steps.
 */
test('MP-01 starts a hosted Mercado Pago checkout from the deployed app', async ({ page }) => {
  try {
    requireCloudAcceptanceConfiguration();

    await signInTestAccountThroughOtp(page);
    await page.getByTestId('subscribe-pro').click();

    await expect
      .poll(() => new URL(page.url()).hostname, { timeout: 30_000 })
      .toMatch(/mercadopago/i);
    await expect(page).toHaveURL(/^https:\/\//);
  } catch (error) {
    // Transport failures may contain headers, response bodies or one-use URLs.
    const safeStatus =
      (
        error instanceof Error &&
        /^mercadopago_cloud_acceptance_(?:generate_link_failed_[1-5]\d{2}|invalid_generate_link_response)$/.test(
          error.message,
        )
      ) ?
        error.message
      : 'mercadopago_cloud_acceptance_scenario_failed';
    throw new Error(safeStatus);
  }
});
