import { expect, test as baseTest } from '@playwright/test';
import { test as authTest } from './fixtures/auth';

/**
 * Settings page E2E tests.
 *
 * Grupo 1 (baseTest): Protección de ruta — no requiere sesión ni Supabase local.
 *   Etiquetados @smoke: seguros contra producción (solo lectura).
 * Grupo 2 (authTest): Flujos autenticados — requiere `supabase start` + dev server.
 */

// ─── Grupo 1: Protección de ruta ──────────────────────────────────────────────

baseTest.describe('Settings page — route guard', () => {
  baseTest('redirects unauthenticated user to /es/login @smoke', async ({ page }) => {
    await page.goto('/es/dashboard/account');
    await page.waitForURL(/\/es\/login/);
    expect(page.url()).toContain('next=%2Fes%2Fdashboard%2Faccount');
  });

  baseTest('preserves next param for each settings tab @smoke', async ({ page }) => {
    for (const tab of ['profile', 'security', 'sessions']) {
      await page.goto(`/es/dashboard/account?tab=${tab}`);
      await page.waitForURL(/\/es\/login/);
      expect(page.url()).toContain('/es/login');
    }
  });
});

// ─── Grupo 2: Flujos autenticados ────────────────────────────────────────────

authTest.describe('Settings page — authenticated', () => {
  authTest.setTimeout(60_000);

  authTest('renders profile tab with form fields', async ({ authenticatedPage: page }) => {
    await page.goto('/es/dashboard/account?tab=profile');
    await page.waitForURL(/\/es\/dashboard\/account/);

    await expect(page.locator('input[name="given_name"]')).toBeVisible();
    await expect(page.locator('input[name="family_name"]')).toBeVisible();
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible();
  });

  authTest(
    'renders security tab with password change form',
    async ({ authenticatedPage: page }) => {
      await page.goto('/es/dashboard/account?tab=security');
      await page.waitForURL(/\/es\/dashboard\/account/);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('input[name="current_password"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirm_password"]')).toBeVisible();
    },
  );

  authTest(
    'renders sessions tab with at least one active session',
    async ({ authenticatedPage: page }) => {
      await page.goto('/es/dashboard/account?tab=sessions');
      await page.waitForURL(/\/es\/dashboard\/account/);

      // La sesión actual siempre debe estar presente después del login
      await expect(page.locator('[data-testid="session-item"]').first()).toBeVisible();
    },
  );

  authTest(
    'profile form shows inline error on empty required field',
    async ({ authenticatedPage: page }) => {
      await page.goto('/es/dashboard/account?tab=profile');
      await page.waitForURL(/\/es\/dashboard\/account/);

      // El fixture crea el usuario sin given_name → el campo requerido está vacío.
      // El form usa noValidate: la validación corre en el server action.
      const profileForm = page
        .locator('form')
        .filter({ has: page.locator('input[name="given_name"]') });

      await profileForm.locator('button[type="submit"]').click();

      // Aserción de comportamiento: el error inline del schema es visible.
      await expect(page.getByText('Este campo es requerido.').first()).toBeVisible();
      await expect(page.locator('input[name="given_name"]')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    },
  );

  authTest(
    'profile form saves changes and shows the success message',
    async ({ authenticatedPage: page }) => {
      await page.goto('/es/dashboard/account?tab=profile');
      await page.waitForURL(/\/es\/dashboard\/account/);
      // Espera a que termine la hidratación: un click durante esa ventana se pierde.
      await page.waitForLoadState('networkidle');

      const profileForm = page
        .locator('form')
        .filter({ has: page.locator('input[name="given_name"]') });

      // Camino feliz completo: hidratación + server action + revalidación.
      await page.locator('input[name="given_name"]').fill('Ada');
      await page.locator('input[name="family_name"]').fill('Lovelace');
      await profileForm.locator('button[type="submit"]').click();

      await expect(page.getByText('Perfil actualizado.')).toBeVisible({ timeout: 15_000 });

      // El dato persiste tras recargar — el guardado fue real, no solo UI.
      await page.reload();
      await expect(page.locator('input[name="given_name"]')).toHaveValue('Ada');
    },
  );
});
