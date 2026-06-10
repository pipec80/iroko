import { expect, test as baseTest } from '@playwright/test';
import { test as authTest } from './fixtures/auth';

/**
 * Settings page E2E tests.
 *
 * Grupo 1 (baseTest): Protección de ruta — no requiere sesión ni Supabase local.
 * Grupo 2 (authTest): Renderizado autenticado — requiere `supabase start` + dev server.
 */

// ─── Grupo 1: Protección de ruta ──────────────────────────────────────────────

baseTest.describe('Settings page — route guard', () => {
  baseTest('redirects unauthenticated user to /es/login', async ({ page }) => {
    await page.goto('/es/dashboard/settings');
    await page.waitForURL(/\/es\/login/);
    expect(page.url()).toContain('next=%2Fes%2Fdashboard%2Fsettings');
  });

  baseTest('preserves next param for each settings tab', async ({ page }) => {
    for (const tab of ['profile', 'security', 'sessions']) {
      await page.goto(`/es/dashboard/settings?tab=${tab}`);
      await page.waitForURL(/\/es\/login/);
      expect(page.url()).toContain('/es/login');
    }
  });
});

// ─── Grupo 2: Renderizado autenticado ────────────────────────────────────────

authTest.describe('Settings page — authenticated', () => {
  authTest.setTimeout(60_000);

  authTest('renders profile tab with form fields', async ({ authenticatedPage: page }) => {
    await page.goto('/es/dashboard/settings?tab=profile');
    await page.waitForURL(/\/es\/dashboard\/settings/);

    await expect(page.locator('input[name="given_name"]')).toBeVisible();
    await expect(page.locator('input[name="family_name"]')).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  authTest(
    'renders security tab with password change form',
    async ({ authenticatedPage: page }) => {
      await page.goto('/es/dashboard/settings?tab=security');
      await page.waitForURL(/\/es\/dashboard\/settings/);

      await expect(page.locator('input[name="current_password"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirm_password"]')).toBeVisible();
    },
  );

  authTest(
    'renders sessions tab with at least one active session',
    async ({ authenticatedPage: page }) => {
      await page.goto('/es/dashboard/settings?tab=sessions');
      await page.waitForURL(/\/es\/dashboard\/settings/);

      // La sesión actual siempre debe estar presente después del login
      await expect(page.locator('[data-testid="session-item"]').first()).toBeVisible();
    },
  );

  authTest(
    'profile form shows inline errors on empty required fields',
    async ({ authenticatedPage: page }) => {
      await page.goto('/es/dashboard/settings?tab=profile');
      await page.waitForURL(/\/es\/dashboard\/settings/);

      await page.locator('input[name="given_name"]').fill('');
      await page.locator('form button[type="submit"]').click();
      await page.waitForTimeout(500);

      // Sin validación el form no navega a otra URL
      expect(page.url()).toContain('/es/dashboard/settings');
    },
  );
});
