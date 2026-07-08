import { test as base, type Page } from '@playwright/test';

const SUPABASE_URL = 'http://127.0.0.1:54321';

type AuthFixtures = {
  /** Página con sesión activa. El usuario de test se elimina al finalizar. */
  authenticatedPage: Page;
};

/**
 * Extensión del test runner de Playwright con soporte para sesiones autenticadas.
 * Crea un usuario real vía Supabase Admin API (sin flujo de email) y hace login vía UI.
 * El usuario se limpia automáticamente al finalizar cada test.
 *
 * Pre-requisito: `supabase start` corriendo en :54321 y dev server en :3000.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, request }, provide, testInfo) => {
    // Guard: contra producción (nightly define PLAYWRIGHT_BASE_URL) no existe
    // el Supabase local — saltar con causa explícita en vez de ECONNREFUSED.
    testInfo.skip(
      Boolean(process.env.PLAYWRIGHT_BASE_URL),
      'authenticatedPage requiere Supabase local (127.0.0.1:54321) — este test no debe llevar @smoke ni correr contra producción.',
    );

    const email = `e2e+settings+${Date.now()}@saasboilerplate.local`;
    const password = 'TestPass123!';
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';

    // Crear usuario vía Admin API — email_confirm: true omite el flujo de verificación
    const createRes = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        email,
        password,
        email_confirm: true,
      },
    });

    const body: { id?: string; error?: string } = await createRes.json();

    if (!body.id) {
      throw new Error(`Failed to create test user: ${JSON.stringify(body)}`);
    }

    const userId = body.id;

    // Login vía UI para establecer las cookies de sesión en el browser context.
    // Usar getByRole en lugar de form button[type="submit"] porque la página de login
    // tiene DOS botones submit (sign-in + magic link) y el selector genérico es ambiguo.
    await page.goto('/es/login');
    await page.locator('input[name="email"][type="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForURL(/\/es\/dashboard/, { timeout: 20_000 });

    await provide(page);

    // Cleanup: eliminar el usuario de test (best-effort)
    await request
      .delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      })
      .catch(() => {});
  },
});

export { expect } from '@playwright/test';
