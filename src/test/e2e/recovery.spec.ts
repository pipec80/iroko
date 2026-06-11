import { expect, test } from '@playwright/test';

import { createConfirmedUser, deleteUserById, fetchLatestMessageTo, uniqueEmail } from './helpers';

/**
 * Password recovery E2E tests.
 *
 * Covers the full OTP recovery flow:
 *   forgot-password → recovery email → /auth/click → /es/reset-password → /es/dashboard
 *
 * Pre-reqs:
 * - `supabase start` running on :54321 with Mailpit on :54324
 * - Next dev/prod server on :3000
 */

// ─── Render / smoke tests (no Supabase needed) ───────────────────────────────

test.describe('Forgot password page', () => {
  test('renders form with email input and submit button', async ({ page }) => {
    await page.goto('/es/forgot-password');
    await expect(page.getByRole('heading', { name: /restablecer contraseña/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar enlace/i })).toBeVisible();
  });
});

test.describe('Reset password page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/es/reset-password');
    await expect(page).toHaveURL(/\/es\/login\?next=%2Fes%2Freset-password/);
  });
});

// ─── Full recovery flow (requires Supabase + Mailpit) ────────────────────────

test.describe('Password recovery flow', () => {
  test('recovery OTP email resets password and reaches dashboard', async ({ page, request }) => {
    test.setTimeout(120_000);
    const email = uniqueEmail('e2e-recovery');
    const password = 'OldPass123!';
    const newPassword = 'NewPass456!';
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';

    const userId = await createConfirmedUser(request, email, password, serviceKey);

    try {
      // 1. Submit forgot-password form.
      await page.goto('/es/forgot-password');
      await page.locator('input[name="email"]').fill(email);
      await page.getByRole('button', { name: /enviar enlace/i }).click();

      // 2. Success message appears on the same page (no redirect).
      await expect(page.getByText(/enviamos un enlace/i)).toBeVisible({ timeout: 10_000 });

      // 3. Poll Mailpit for the recovery email.
      const { confirmUrl } = await fetchLatestMessageTo(request, email);
      expect(confirmUrl).not.toBeNull();

      // 4. /auth/click renders the "Restablecer contraseña" button (type=recovery).
      await page.goto(confirmUrl as string);
      await expect(page.getByRole('button', { name: /restablecer contraseña/i })).toBeVisible();
      await page.getByRole('button', { name: /restablecer contraseña/i }).click();

      // 5. /auth/confirm calls verifyOtp(type=recovery) → redirects to /es/reset-password.
      await page.waitForURL(/\/es\/reset-password/, { timeout: 20_000 });

      // 6. Set the new password.
      await page.locator('input[name="password"]').fill(newPassword);
      await page.locator('input[name="confirm_password"]').fill(newPassword);
      await page.getByRole('button', { name: /actualizar contraseña/i }).click();

      // 7. updatePasswordAction redirects to /es/dashboard — session fully established.
      await page.waitForURL(/\/es\/dashboard/, { timeout: 20_000 });
    } finally {
      await deleteUserById(request, userId, serviceKey);
    }
  });
});
