import { test, expect } from './fixtures/auth';
import {
  createConfirmedUser,
  createTeamViaUi,
  deleteUserById,
  execSqlAsPostgres,
  loginViaUi,
  querySqlAsPostgres,
} from './helpers';

/**
 * Camino feliz de las 4 RPCs de lifecycle de membresías (Plan 009 / PR 4b):
 * cambiar rol, transferir ownership, salir del equipo, revocar invitación.
 * Nada de esto se había probado E2E — las RPCs existían desde el PR 4 pero
 * sin ningún punto de entrada en la UI hasta este PR.
 *
 * Pre-reqs: `supabase start` on :54321 + servidor Next en :3000.
 * Escriben datos — NO llevan @smoke.
 */

test.describe('QA — lifecycle de membresías', () => {
  test.setTimeout(60_000);

  test('owner cambia el rol de un miembro', async ({ authenticatedPage: page, request }) => {
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const stamp = Date.now();
    const teamName = `Equipo Rol ${stamp}`;
    const memberEmail = `e2e+role-target+${stamp}@saasboilerplate.local`;
    const password = 'TestPass123!';

    await createTeamViaUi(page, teamName);
    const accountId = querySqlAsPostgres(
      `SELECT id FROM public.accounts WHERE name = '${teamName}'`,
    );

    const memberId = await createConfirmedUser(request, memberEmail, password, serviceKey);

    try {
      execSqlAsPostgres(
        `UPDATE public.profiles SET onboarding_completed = true WHERE id = '${memberId}'`,
      );
      execSqlAsPostgres(
        `INSERT INTO public.accounts_memberships (account_id, user_id, role) ` +
          `VALUES ('${accountId}', '${memberId}', 'member')`,
      );

      await page.goto('/es/dashboard/members');
      await page.waitForURL(/\/es\/dashboard\/members/);

      const row = page.getByTestId(`member-row-${memberEmail}`);
      await row.getByRole('button', { name: /acciones para/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.locator('select[name="role"]').selectOption('viewer');
      await dialog.getByRole('button', { name: /^guardar$/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });

      expect(
        querySqlAsPostgres(
          `SELECT role FROM public.accounts_memberships WHERE account_id = '${accountId}' ` +
            `AND user_id = '${memberId}'`,
        ),
      ).toBe('viewer');
    } finally {
      await deleteUserById(request, memberId, serviceKey);
    }
  });

  test('owner transfiere la propiedad a un admin', async ({ authenticatedPage: page, request }) => {
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const stamp = Date.now();
    const teamName = `Equipo Transfer ${stamp}`;
    const adminEmail = `e2e+transfer-target+${stamp}@saasboilerplate.local`;
    const password = 'TestPass123!';

    await createTeamViaUi(page, teamName);
    const accountId = querySqlAsPostgres(
      `SELECT id FROM public.accounts WHERE name = '${teamName}'`,
    );
    const ownerId = querySqlAsPostgres(
      `SELECT user_id FROM public.accounts_memberships WHERE account_id = '${accountId}' ` +
        `AND role = 'owner'`,
    );

    const adminId = await createConfirmedUser(request, adminEmail, password, serviceKey);

    try {
      execSqlAsPostgres(
        `UPDATE public.profiles SET onboarding_completed = true WHERE id = '${adminId}'`,
      );
      execSqlAsPostgres(
        `INSERT INTO public.accounts_memberships (account_id, user_id, role) ` +
          `VALUES ('${accountId}', '${adminId}', 'admin')`,
      );

      await page.goto('/es/dashboard/members');
      await page.waitForURL(/\/es\/dashboard\/members/);

      const row = page.getByTestId(`member-row-${adminEmail}`);
      await row.getByRole('button', { name: /acciones para/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /transferir propiedad/i }).click();
      await dialog.getByRole('button', { name: /^transferir$/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });

      expect(
        querySqlAsPostgres(
          `SELECT role FROM public.accounts_memberships WHERE account_id = '${accountId}' ` +
            `AND user_id = '${adminId}'`,
        ),
      ).toBe('owner');
      expect(
        querySqlAsPostgres(
          `SELECT role FROM public.accounts_memberships WHERE account_id = '${accountId}' ` +
            `AND user_id = '${ownerId}'`,
        ),
      ).toBe('admin');
    } finally {
      await deleteUserById(request, adminId, serviceKey);
    }
  });

  test('un member sale del equipo', async ({ authenticatedPage: page, request }) => {
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const stamp = Date.now();
    const teamName = `Equipo Leave ${stamp}`;
    const memberEmail = `e2e+leave-team+${stamp}@saasboilerplate.local`;
    const password = 'TestPass123!';

    await createTeamViaUi(page, teamName);
    const accountId = querySqlAsPostgres(
      `SELECT id FROM public.accounts WHERE name = '${teamName}'`,
    );

    const memberId = await createConfirmedUser(request, memberEmail, password, serviceKey);

    try {
      execSqlAsPostgres(
        `UPDATE public.profiles SET onboarding_completed = true WHERE id = '${memberId}'`,
      );
      // El INSERT va ANTES del login: el fallback del hook JWT resuelve la
      // cuenta activa a la membresía más reciente (mismo patrón que
      // qa-storage-realtime.spec.ts) — necesitamos que el team activo sea
      // este, no la Personal, para que el botón "Salir del equipo" aparezca.
      execSqlAsPostgres(
        `INSERT INTO public.accounts_memberships (account_id, user_id, role) ` +
          `VALUES ('${accountId}', '${memberId}', 'member')`,
      );

      const memberContext = await page.context().browser()?.newContext();
      if (!memberContext) throw new Error('No se pudo crear un nuevo contexto de browser');
      const memberPage = await memberContext.newPage();

      try {
        await loginViaUi(memberPage, memberEmail, password);
        await memberPage.goto('/es/dashboard/members');
        await memberPage.waitForURL(/\/es\/dashboard\/members/);

        await memberPage.getByRole('button', { name: /salir del equipo/i }).click();
        const dialog = memberPage.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: /^salir$/i }).click();
        await memberPage.waitForURL(/\/es\/dashboard$/, { timeout: 20_000 });

        expect(
          querySqlAsPostgres(
            `SELECT count(*) FROM public.accounts_memberships WHERE account_id = '${accountId}' ` +
              `AND user_id = '${memberId}'`,
          ),
        ).toBe('0');
      } finally {
        await memberContext.close();
      }
    } finally {
      await deleteUserById(request, memberId, serviceKey);
    }
  });

  test('owner revoca una invitación pendiente', async ({ authenticatedPage: page }) => {
    const stamp = Date.now();
    const teamName = `Equipo Revoke ${stamp}`;
    const inviteeEmail = `e2e+revoke-target+${stamp}@saasboilerplate.local`;

    await createTeamViaUi(page, teamName);

    await page.goto('/es/dashboard/members');
    await page.waitForURL(/\/es\/dashboard\/members/);
    await page.getByRole('button', { name: /invitar miembro/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('textarea[name="emails"]').fill(inviteeEmail);
    await page.getByRole('button', { name: /enviar invitación/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });

    const row = page.getByTestId(`member-row-${inviteeEmail}`);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /revocar invitación/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^revocar$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });

    // La fila desaparece: list_team_members solo lista invitaciones pending,
    // y revoke_invitation las pasa a status='revoked'.
    await expect(row).not.toBeVisible({ timeout: 15_000 });
  });
});
