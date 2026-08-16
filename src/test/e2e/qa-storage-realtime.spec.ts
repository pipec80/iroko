import { test, expect } from './fixtures/auth';
import {
  createConfirmedUser,
  createTeamViaUi,
  deleteUserById,
  execSqlAsPostgres,
  fetchInvitationLinkTo,
  loginViaUi,
  querySqlAsPostgres,
} from './helpers';

/**
 * QA de tres features implementadas pero nunca probadas end-to-end: avatar,
 * notificaciones en tiempo real y presence. No se construye nada nuevo, solo
 * se verifica que lo que existe funciona de verdad (Plan 009 / PR 7).
 *
 * Pre-reqs: `supabase start` on :54321 + servidor Next en :3000, MAILPIT_URL
 * seteada para el test de notificaciones (reusa el flujo de invitación).
 * Escriben datos — NO llevan @smoke.
 */

// Un PNG 1x1 válido, sin necesidad de un fixture binario en el repo.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.describe('QA — avatar', () => {
  test.setTimeout(60_000);

  test('should persist the avatar after upload and reload', async ({ authenticatedPage: page }) => {
    await page.goto('/es/dashboard/account?tab=profile');
    await page.waitForURL(/\/es\/dashboard\/account/);

    const avatarForm = page.getByTestId('avatar-form');
    await avatarForm.locator('input[name="avatar"]').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await avatarForm.locator('button[type="submit"]').click();

    await expect(page.getByText('Foto actualizada.')).toBeVisible({ timeout: 15_000 });

    // El guardado fue real, no solo estado de cliente: sobrevive a un reload y
    // el <img> pasa a apuntar al bucket de avatares en Storage (unoptimized=true
    // en el <Image>, así que el src no pasa por el proxy de _next/image).
    await page.reload();
    const avatarImg = page.locator('img[alt="avatar"]');
    await expect(avatarImg).toBeVisible();
    await expect(avatarImg).toHaveAttribute('src', /\/avatars\//);
  });
});

test.describe('QA — notifications realtime', () => {
  test.setTimeout(120_000);

  test('should notify the inviter without a page reload when the invite is accepted', async ({
    authenticatedPage: page,
    request,
    browser,
  }) => {
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const stamp = Date.now();
    const teamName = `Equipo Notif ${stamp}`;
    const inviteeEmail = `e2e+notif-invitee+${stamp}@saasboilerplate.local`;
    const password = 'TestPass123!';

    await createTeamViaUi(page, teamName);
    const bell = page.getByRole('button', { name: 'Notificaciones' });

    await page.goto('/es/dashboard/members');
    await page.waitForURL(/\/es\/dashboard\/members/);
    await page.getByRole('button', { name: /invitar miembro/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('textarea[name="emails"]').fill(inviteeEmail);
    await page.getByRole('button', { name: /enviar invitación/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });

    const invitationLink = await fetchInvitationLinkTo(request, inviteeEmail);

    const inviteeId = await createConfirmedUser(request, inviteeEmail, password, serviceKey);
    execSqlAsPostgres(
      `UPDATE public.profiles SET onboarding_completed = true WHERE id = '${inviteeId}'`,
    );

    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();

    try {
      await loginViaUi(inviteePage, inviteeEmail, password);

      // accept_invitation dispara notify(inviterId, ...) en el servidor — la
      // página de A no se recarga. useNotifications guarda el push en estado
      // de React aunque el dropdown esté cerrado, así que abrirlo recién ACÁ
      // (después del accept) igual muestra el item: el broadcast ya llegó al
      // hook mientras la suscripción seguía activa, aunque el dropdown
      // estuviera cerrado en ese momento.
      await inviteePage.goto(invitationLink);
      await inviteePage.waitForURL(/\/es\/dashboard$/, { timeout: 20_000 });

      await bell.click();
      await expect(page.getByText(`${inviteeEmail} aceptó tu invitación`)).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await inviteeContext.close();
      await deleteUserById(request, inviteeId, serviceKey);
    }
  });
});

test.describe('QA — presence', () => {
  test.setTimeout(90_000);

  test('should show a teammate online and remove the indicator when they leave', async ({
    authenticatedPage: page,
    request,
    browser,
  }) => {
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const stamp = Date.now();
    const teamName = `Equipo Presence ${stamp}`;
    const teammateEmail = `e2e+presence-mate+${stamp}@saasboilerplate.local`;
    const password = 'TestPass123!';

    await createTeamViaUi(page, teamName);

    // El nombre es único por el timestamp — no hace falta el slug (que sí
    // lleva un sufijo aleatorio) para resolver el id de la cuenta recién creada.
    const accountId = querySqlAsPostgres(
      `SELECT id FROM public.accounts WHERE name = '${teamName}'`,
    );
    // authenticatedPage crea al owner con un email interno a la fixture, sin
    // exponerlo al test — se resuelve por SQL para poder aislar su fila con el
    // mismo data-testid que la del teammate, en vez de un selector de clase.
    const ownerEmail = querySqlAsPostgres(
      `SELECT u.email FROM auth.users u JOIN public.accounts_memberships m ON m.user_id = u.id ` +
        `WHERE m.account_id = '${accountId}' AND m.role = 'owner'`,
    );

    // Teammate seedeado directo vía SQL (mismo patrón que teamMgmtTest en
    // team.spec.ts): más rápido que el ciclo completo de invitación, y acá lo
    // que se prueba es presence, no invitar. El fallback del hook JWT resuelve
    // la cuenta activa del teammate a este team porque, tras el signup, esta
    // membresía es la más reciente de las dos que tiene (su personal + esta) —
    // por eso el INSERT va ANTES del login, no después.
    //
    // La creación del usuario vive dentro de este try/finally (y no antes)
    // para que cualquier falla posterior — incluidas las assertions de
    // presence — siempre limpie el usuario sembrado, sin dejarlo huérfano en
    // la DB local.
    const mateId = await createConfirmedUser(request, teammateEmail, password, serviceKey);
    let teammateContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;

    try {
      execSqlAsPostgres(
        `UPDATE public.profiles SET onboarding_completed = true WHERE id = '${mateId}'`,
      );
      execSqlAsPostgres(
        `INSERT INTO public.accounts_memberships (account_id, user_id, role) ` +
          `VALUES ('${accountId}', '${mateId}', 'member')`,
      );

      // La tabla se resuelve server-side una sola vez (RSC): sin este reload,
      // el owner seguiría viendo la lista de miembros de antes de sembrar al
      // teammate por SQL.
      await page.goto('/es/dashboard/members');
      await page.waitForURL(/\/es\/dashboard\/members/);

      const teammateRowOnOwnerPage = page.getByTestId(`member-row-${teammateEmail}`);
      await expect(teammateRowOnOwnerPage).toBeVisible();
      // Antes de que el teammate se conecte, su fila no tiene el punto "En línea".
      await expect(teammateRowOnOwnerPage.getByLabel('En línea')).not.toBeVisible();

      teammateContext = await browser.newContext();
      const teammatePage = await teammateContext.newPage();

      await loginViaUi(teammatePage, teammateEmail, password);
      await teammatePage.goto('/es/dashboard/members');
      await teammatePage.waitForURL(/\/es\/dashboard\/members/);

      // El canal es por cuenta (`account:{id}:presence`), no por request: no
      // hace falta recargar la página del owner para que el punto aparezca.
      await expect(teammateRowOnOwnerPage.getByLabel('En línea')).toBeVisible({
        timeout: 15_000,
      });

      // El teammate también ve online al owner — presence es simétrico dentro
      // del mismo canal de cuenta.
      const ownerRowOnTeammatePage = teammatePage.getByTestId(`member-row-${ownerEmail}`);
      await expect(ownerRowOnTeammatePage.getByLabel('En línea')).toBeVisible();

      // Navegar fuera de /members desmonta MembersTable → usePresence limpia
      // el canal (supabase.removeChannel en el cleanup del efecto) → sync de
      // presence real, no un cierre abrupto de conexión que dependería de un
      // timeout de servidor para notarse.
      await teammatePage.goto('/es/dashboard');
      await expect(teammateRowOnOwnerPage.getByLabel('En línea')).not.toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await teammateContext?.close();
      await deleteUserById(request, mateId, serviceKey);
    }
  });
});
