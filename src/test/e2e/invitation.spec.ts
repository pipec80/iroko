import { test, expect } from './fixtures/auth';
import {
  createConfirmedUser,
  createTeamViaUi,
  deleteUserById,
  deleteUserByEmail,
  execSqlAsPostgres,
  fetchInvitationLinkTo,
  fetchLatestMessageTo,
} from './helpers';

/**
 * Ciclo completo de invitación: invitar → recibir el email → aceptar → quedar
 * dentro del team.
 *
 * Hasta el Plan 009 este test no era escribible: los emails de la app salen por
 * la API HTTP de Resend y Mailpit solo intercepta el SMTP de Supabase Auth, así
 * que una invitación no aparecía en ninguna bandeja observable. Con MAILPIT_URL
 * definida el transporte local entrega a Mailpit (src/lib/email/index.tsx).
 *
 * Además cubre la regresión que motivó el PR: aceptar una invitación dejaba la
 * cuenta activa a merced del fallback del hook JWT ("membresía más reciente"),
 * así que el invitado entraba al team solo si nunca había hecho switch_account().
 *
 * Pre-reqs: `supabase start` on :54321 + servidor Next en :3000.
 * Escribe datos — NO lleva @smoke.
 *
 * Selectores verificados contra los componentes reales, no adivinados:
 * - El trigger del switcher tiene aria-label fijo "Cambiar de organización"
 *   (app-sidebar-client.tsx); se afirma sobre su texto, no con un getByText
 *   global, porque el breadcrumb del topbar renderiza el mismo nombre en
 *   mayúsculas y generaría un segundo match.
 * - "Nueva organización" solo se monta con el dropdown abierto.
 */
test.describe('Invitación — ciclo completo', () => {
  test.setTimeout(120_000);

  for (const hasAccount of [true, false]) {
    test(`opens the team after an invitation with ${hasAccount ? 'an existing' : 'a new'} account`, async ({
      authenticatedPage: page,
      request,
      browser,
    }) => {
      const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
      const stamp = Date.now();
      const teamName = `Equipo Invitación ${stamp}`;
      const inviteeEmail = `e2e+invitee+${stamp}@saasboilerplate.local`;
      const password = 'TestPass123!';
      const switcherName = /cambiar de organización/i;

      // ── Arrange: el owner crea un Team y queda parado dentro de él ──────────
      await createTeamViaUi(page, teamName);

      // ── Act 1: invitar ─────────────────────────────────────────────────────
      await page.goto('/es/dashboard/members');
      await page.waitForURL(/\/es\/dashboard\/members/);
      const dialog = page.getByRole('dialog');
      await expect(async () => {
        if (!(await dialog.isVisible())) {
          await page.getByRole('button', { name: /invitar miembro/i }).click();
        }
        await expect(dialog).toBeVisible({ timeout: 1_500 });
      }).toPass({ timeout: 15_000 });
      await page.locator('textarea[name="emails"]').fill(inviteeEmail);
      await page.getByRole('button', { name: /enviar invitación/i }).click();

      // El diálogo solo se cierra si el envío no reportó fallos: con entregas
      // fallidas queda abierto mostrando el aviso (invite-form.tsx).
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });

      // ── Act 2: el email llega de verdad ────────────────────────────────────
      const invitationLink = await fetchInvitationLinkTo(request, inviteeEmail);
      expect(invitationLink).toContain('/auth/accept-invitation?token=');

      // ── Act 3: el invitado acepta desde su propia sesión ───────────────────
      const inviteeId =
        hasAccount ? await createConfirmedUser(request, inviteeEmail, password, serviceKey) : null;

      const inviteeContext = await browser.newContext();
      const inviteePage = await inviteeContext.newPage();

      try {
        await inviteePage.goto(invitationLink);
        await inviteePage.waitForURL(/\/es\/auth\/invitation/);
        if (hasAccount) {
          await inviteePage.getByRole('link', { name: 'Iniciar sesión' }).click();
          await inviteePage.locator('input[name="email"][type="email"]').fill(inviteeEmail);
          await inviteePage.locator('input[name="password"]').fill(password);
          await inviteePage.getByRole('button', { name: /iniciar sesión/i }).click();
        } else {
          await inviteePage.getByRole('link', { name: 'Crear cuenta' }).click();
          await inviteePage.locator('input[name="first_name"]').fill('Ada');
          await inviteePage.locator('input[name="last_name"]').fill('Invitee');
          await inviteePage.locator('input[name="email"]').fill(inviteeEmail);
          await inviteePage.locator('input[name="password"]').fill(password);
          await inviteePage.locator('form button[type="submit"]').click();
          await inviteePage.waitForURL(/\/es\/signup\/confirmation/);
          const { confirmUrl } = await fetchLatestMessageTo(request, inviteeEmail, 15_000, true);
          if (!confirmUrl) throw new Error('No signup confirmation URL');
          await inviteePage.goto(confirmUrl);
          await inviteePage.getByRole('button', { name: /confirmar cuenta/i }).click();
        }
        const inviteeSwitcher = inviteePage.getByRole('button', { name: switcherName });
        await inviteePage.waitForURL(/\/es\/dashboard$/, { timeout: 20_000 });
        expect(new URL(inviteePage.url()).origin).toBe(new URL(invitationLink).origin);

        // ── Assert: el ciclo cierra dentro del team, sin recargar a mano ─────
        await expect(inviteeSwitcher).toContainText(teamName);

        // Y sobrevive a un reload: el contexto se resuelve en el servidor desde
        // el JWT, no es estado de cliente.
        await inviteePage.reload();
        await expect(inviteeSwitcher).toContainText(teamName);
      } finally {
        await inviteeContext.close();
        execSqlAsPostgres(
          `DELETE FROM public.accounts WHERE type = 'team' AND created_by = (SELECT id FROM auth.users WHERE email = '${inviteeEmail}')`,
        );
        if (inviteeId) await deleteUserById(request, inviteeId, serviceKey);
        else await deleteUserByEmail(request, inviteeEmail, serviceKey);
      }
    });
  }
});
