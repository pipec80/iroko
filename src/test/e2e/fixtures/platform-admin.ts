import { expect, test as base, type Page } from '@playwright/test';

import { generateTotp, msUntilNextTotpStep } from '../../totp';
import {
  createConfirmedUser,
  deleteUserById,
  enrollTotpFactor,
  execSqlAsPostgres,
  passwordGrant,
  verifyTotpFactor,
} from '../helpers';

type PlatformAdminFixtures = {
  /** Página con sesión aal2 real de un platform_admin, más un usuario target. */
  platformAdmin: { page: Page; adminId: string; targetId: string; targetEmail: string };
};

/**
 * Extiende Playwright con un fixture de platform_admin con MFA (TOTP) real
 * enrolado y sesión aal2 — requisito de `private.assert_platform_admin()`,
 * que exige el `aal` real de GoTrue, no solo el claim `mfa_enrolled`.
 *
 * Habilita src/test/e2e/impersonation.spec.ts, que hasta ahora dependía de
 * este fixture y no existía (ver docs/exec-plans/active/005-quality-hardening.md,
 * workstream E).
 *
 * Pre-requisito: `supabase start` corriendo en :54321 (igual que fixtures/auth.ts).
 */
export const test = base.extend<PlatformAdminFixtures>({
  platformAdmin: async ({ page, request }, provide, testInfo) => {
    // No puede correr contra producción: depende de `docker exec psql` y de
    // la service key local (igual que fixtures/auth.ts).
    testInfo.skip(
      Boolean(process.env.PLAYWRIGHT_BASE_URL),
      'platformAdmin requiere Supabase local (127.0.0.1:54321) — no puede correr contra producción.',
    );

    const hydrationErrors: string[] = [];
    page.on('pageerror', (err) => {
      if (/error #4(18|23|25|27)/.test(err.message)) hydrationErrors.push(err.message);
    });

    const apikey = process.env.SUPABASE_SECRET_KEY ?? '';
    const adminEmail = `e2e+platform-admin+${Date.now()}@saasboilerplate.local`;
    const targetEmail = `e2e+impersonation-target+${Date.now()}@saasboilerplate.local`;
    const password = 'TestPass123!';

    const adminId = await createConfirmedUser(request, adminEmail, password, apikey);
    const targetId = await createConfirmedUser(request, targetEmail, password, apikey);

    // onboarding_completed=true para ambos — sin esto el edge gate manda a
    // /dashboard/onboarding (middleware.ts). El target también lo necesita:
    // tras ser impersonado, cae en /dashboard con su propio claim.
    execSqlAsPostgres(
      `UPDATE public.profiles SET onboarding_completed = true WHERE id IN ('${adminId}','${targetId}')`,
    );

    // El claim is_platform_admin se mintea al emitir el token — el insert
    // en platform_admins va ANTES de cualquier login que genere una sesión.
    execSqlAsPostgres(`INSERT INTO public.platform_admins (user_id) VALUES ('${adminId}')`);

    // Enrolar TOTP por REST (sesión aal1, solo para enrolar; se descarta).
    const adminAccessToken = await passwordGrant(request, adminEmail, password, apikey);
    const { factorId, secret } = await enrollTotpFactor(request, adminAccessToken, apikey);

    const enrollCode = generateTotp(secret);
    await verifyTotpFactor(request, adminAccessToken, apikey, factorId, enrollCode);

    // Login real por UI: password -> pantalla de MFA -> código TOTP -> aal2.
    await page.goto('/es/login');
    await page.locator('input[name="email"][type="email"]').fill(adminEmail);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page.locator('#code')).toBeVisible({ timeout: 10_000 });

    // Evitar reusar el mismo código TOTP consumido en el verify de
    // enrolamiento — si coinciden, esperar al siguiente step.
    let loginCode = generateTotp(secret);
    if (loginCode === enrollCode) {
      await new Promise((r) => setTimeout(r, msUntilNextTotpStep()));
      loginCode = generateTotp(secret);
    }
    await page.locator('#code').fill(loginCode);
    await page.getByRole('button', { name: /verificar y continuar/i }).click();
    await page.waitForURL(/\/es\/dashboard/, { timeout: 20_000 });

    // Sanity gate del propio fixture: si esto falla, el problema es el
    // fixture (aal2/whitelist), no el test real que lo usa.
    await page.goto('/es/dashboard/admin/accounts');
    await expect(page.getByRole('heading', { name: 'Cuentas' })).toBeVisible({ timeout: 10_000 });

    await provide({ page, adminId, targetId, targetEmail });

    expect(hydrationErrors, 'Errores de hydration mismatch de React durante el test').toEqual([]);

    await deleteUserById(request, targetId, apikey);
    await deleteUserById(request, adminId, apikey);
  },
});

export { expect };
