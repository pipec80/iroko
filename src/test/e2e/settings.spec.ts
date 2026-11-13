import { expect, test as baseTest } from '@playwright/test';

import { runAxeCheck } from './axe';
import { test as authTest } from './fixtures/auth';
import { loginViaUi } from './helpers';

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
    await runAxeCheck(page);
  });

  authTest(
    'renders security tab with password change form',
    async ({ authenticatedPage: page }) => {
      await page.goto('/es/dashboard/account?tab=security');
      await page.waitForURL(/\/es\/dashboard\/account/);

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
    'identifies the current session beyond the first row and recovers from a failed revocation',
    async ({ authenticatedPage: page, browser }) => {
      await page.goto('/es/dashboard/account?tab=profile');
      const email = await page
        .locator('strong')
        .filter({ hasText: /^e2e\+settings\+/ })
        .textContent();
      if (!email || !/^e2e\+settings\+\d+@saasboilerplate\.local$/.test(email)) {
        throw new Error('Expected the owned authenticated fixture');
      }
      const otherContext = await browser.newContext();
      try {
        const otherPage = await otherContext.newPage();
        await loginViaUi(otherPage, email, 'TestPass123!');
        await page.goto('/es/dashboard/account?tab=sessions');
        const rows = page.getByTestId('session-item');
        await expect(rows).toHaveCount(2);
        await expect(rows.first()).not.toContainText('Esta sesión');
        const current = rows.filter({ hasText: 'Esta sesión' });
        await expect(current).toHaveCount(1);
        await expect(current.getByRole('button')).toBeDisabled();

        await page.route('**/es/dashboard/account?tab=sessions', async (route) => {
          if (route.request().method() === 'POST') await route.abort('failed');
          else await route.continue();
        });
        await rows.first().getByRole('button').click();
        await expect(
          page.getByRole('alert').filter({ hasText: 'Ocurrió un error.' }),
        ).toBeVisible();
        await expect(rows).toHaveCount(2);
        await page.unroute('**/es/dashboard/account?tab=sessions');
        await rows.first().getByRole('button').click();
        await expect(page.getByText('Sesión cerrada.', { exact: true })).toBeVisible();
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText('Esta sesión');
        await page.reload();
        await expect(page.getByTestId('session-item')).toHaveCount(1);
        await expect(page.getByTestId('session-item')).toContainText('Esta sesión');
      } finally {
        await otherContext.close();
      }
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
      // Esperamos que el formulario esté visible para asegurar que cargó el DOM inicial
      await expect(page.locator('input[name="given_name"]')).toBeVisible();

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
