import { expect, test } from '@playwright/test';

import { deleteUserByEmail, fetchLatestMessageTo, uniqueEmail } from './helpers';

/**
 * End-to-end auth flow against a running local Supabase stack.
 *
 * Pre-reqs:
 * - `supabase start` running on :54321 with `enable_confirmations = true`
 * - Mailpit on :54324
 * - Next dev server on :3000 (webServer in playwright.config.ts starts it)
 */

test.describe('Auth flow', () => {
  test('redirects unauthenticated users to /es/login', async ({ page }) => {
    const response = await page.goto('/es/dashboard', { waitUntil: 'commit' });
    await page.waitForURL(/\/es\/login/);
    expect(response?.status()).toBeLessThan(400);
    expect(page.url()).toContain('/es/login');
    expect(page.url()).toContain('next=%2Fes%2Fdashboard');
  });

  test('login page renders both forms and switcher', async ({ page }) => {
    await page.goto('/es/login');
    await expect(page.getByRole('heading', { name: /vuelve a tu tronco/i })).toBeVisible();
    await expect(page.locator('input[name="email"][type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /enlace mágico/i })).toBeVisible();
  });

  test('signup shows inline field errors on weak password', async ({ page }) => {
    await page.goto('/es/signup');
    await page.locator('input[name="first_name"]').fill('Test');
    await page.locator('input[name="last_name"]').fill('User');
    await page.locator('input[name="email"]').fill(uniqueEmail());
    // Weak: too short + no uppercase + no digit
    await page.locator('input[name="password"]').fill('weak');
    await page.locator('form button[type="submit"]').click();
    // Form stays on the same page; password input has html5 minLength validation.
    await expect(page).toHaveURL(/\/es\/signup/);
  });

  test('signup confirms account via OTP email and reaches dashboard', async ({ page, request }) => {
    test.setTimeout(90_000);
    const email = uniqueEmail();
    const password = 'TestPass123';
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';

    // 1. Signup via UI.
    await page.goto('/es/signup');
    await page.locator('input[name="first_name"]').fill('Ada');
    await page.locator('input[name="last_name"]').fill('Lovelace');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('form button[type="submit"]').click();

    // 2. Lands on confirmation page (enable_confirmations = true in config.toml).
    await page.waitForURL(/\/es\/signup\/confirmation/, { timeout: 20_000 });

    // 3. Poll Mailpit for the confirmation email.
    const { subject, confirmUrl } = await fetchLatestMessageTo(request, email);
    expect(subject.toLowerCase()).toMatch(/confirm/);
    expect(confirmUrl).not.toBeNull();

    // 4. Follow the OTP link: /auth/click (click shield) → button click
    //    → /auth/confirm (verifyOtp) → /es/dashboard (session established).
    await page.goto(confirmUrl as string);
    await expect(page.getByRole('button', { name: /confirmar cuenta/i })).toBeVisible();
    await page.getByRole('button', { name: /confirmar cuenta/i }).click();
    await page.waitForURL(/\/es\/dashboard/, { timeout: 20_000 });

    // Cleanup: find user by email → delete by UUID.
    await deleteUserByEmail(request, email, serviceKey);
  });

  test('logout endpoint redirects to login', async ({ request }) => {
    const res = await request.post('/es/auth/logout', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([301, 302, 303, 307]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/\/es\/login/);
  });

  test('callback rejects requests without code', async ({ request }) => {
    const res = await request.get('/es/auth/callback', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([301, 302, 303, 307]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/error=missing_code/);
  });

  test('confirm rejects requests without token_hash', async ({ request }) => {
    const res = await request.get('/es/auth/confirm', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([301, 302, 303, 307]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/error=confirmation_failed/);
  });
});
