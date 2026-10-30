import { localE2eBudget } from '../local-e2e-target';
import type { Page, APIRequestContext } from '@playwright/test';

import { callRpc, execSqlAsPostgres, querySqlAsPostgres, SUPABASE_URL } from './helpers';
import { test as adminTest, expect } from './fixtures/platform-admin';

/**
 * Impersonation E2E (F3-C2). Requires a platform_admin with MFA enrolled
 * and a real aal2 session — see fixtures/platform-admin.ts. Depends on
 * `docker exec psql` (execSqlAsPostgres/querySqlAsPostgres), so it cannot
 * carry @smoke and must not run against production.
 */
adminTest.describe('Impersonation — "Ver como"', () => {
  adminTest(
    'el admin entra como otro usuario y vuelve a ser él mismo',
    async ({ platformAdmin }) => {
      adminTest.setTimeout(localE2eBudget(120_000));
      const { page, adminId, targetId, targetEmail } = platformAdmin;

      // accounts.id === user_id para cuentas personales (handle_new_profile)
      // — no hace falta resolver ningún accountId.
      await page.goto(`/es/dashboard/admin/accounts/${targetId}`);
      await expect(page.getByRole('button', { name: /ver como/i })).toBeVisible();

      await page.getByRole('button', { name: /ver como/i }).click();
      await page.locator('#impersonate-reason').fill('e2e ticket #1');
      await page.getByRole('button', { name: /iniciar sesión como este usuario/i }).click();

      // Prueba real de que la sesión cambió: el banner arma el email con
      // supabase.auth.getUser() del lado servidor, no con un claim cacheado.
      // Match exacto de pathname — un regex laxo como /\/dashboard(\/|\?|$)/
      // también matchea la página actual (/dashboard/admin/accounts/<id>,
      // ya tiene un "/" después de "dashboard") y resuelve antes de tiempo.
      await page.waitForURL((url) => url.pathname === '/es/dashboard', {
        timeout: localE2eBudget(20_000, 'navigation'),
      });
      // Un solo locator sobre el texto del banner — el saludo del dashboard
      // ("Hola, {email}") también contiene el email y desambigua un locator
      // que solo busque el email suelto.
      await expect(
        page.getByText(new RegExp(`estás viendo como.*${escapeRegExp(targetEmail)}`, 'i')),
      ).toBeVisible();

      // Prueba fuerte: como el target (no-admin), /dashboard/admin no expone
      // datos de cuentas — se renderiza el 404 de la app.
      //
      // NOTA (hallazgo, no bloqueante): el HTTP status real es 200, no 404.
      // `notFound()` corre después de un `await` (getAdminAccounts) dentro de
      // un árbol que ya empezó a streamear el shell del layout raíz con 200 —
      // limitación conocida de Next.js App Router (el status no se puede
      // corregir retroactivamente una vez que el streaming arrancó). El
      // guard de src/lib/supabase/middleware.ts distingue este status de la
      // autorización: el contenido SÍ es el 404 real (no hay fuga de datos),
      // aunque el status HTTP quede en 200 después del shell.
      await page.goto('/es/dashboard/admin/accounts');
      await expect(page.getByText(/página no encontrada/i)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Cuentas' })).toHaveCount(0);

      // Salir — vuelve a ser el admin, con su sesión aal2 restaurada (no solo
      // el usuario: llegar con contenido a /admin/accounts exige is_platform_admin
      // Y aal2 simultáneamente).
      await page.goto('/es/dashboard');
      await page.getByRole('button', { name: /^salir$/i }).click();
      await page.waitForURL(/\/es\/dashboard\/admin\/accounts/, {
        timeout: localE2eBudget(20_000, 'navigation'),
      });
      await expect(page.getByRole('heading', { name: 'Cuentas' })).toBeVisible();
      await expect(page.getByText(/estás viendo como/i)).toHaveCount(0);

      // A top-level GET without impersonation evidence must preserve this
      // restored normal admin session (regression for logout CSRF).
      const unrelatedExpiry = await page
        .context()
        .request.get('/api/impersonation/expire', { maxRedirects: 0 });
      expect(unrelatedExpiry.headers().location).toContain('/es/dashboard');
      await page.goto('/es/dashboard/admin/accounts');
      await expect(page.getByRole('heading', { name: 'Cuentas' })).toBeVisible();

      // Rastro de auditoría: sesión cerrada y ambos eventos logueados.
      // SQL de una sola línea a propósito: un template literal multilínea
      // combinado con paréntesis rompe el parseo de cmd.exe en Windows (el
      // WHERE se pierde en silencio y corre la query sin filtrar) — mismo
      // patrón de una sola línea que ya usa execSqlAsPostgres en el resto
      // del repo.
      const endedSessions = querySqlAsPostgres(
        `SELECT count(*) FROM public.impersonation_sessions WHERE admin_id = '${adminId}' AND target_user_id = '${targetId}' AND ended_at IS NOT NULL`,
      );
      expect(endedSessions).toBe('1');

      const auditedEvents = querySqlAsPostgres(
        `SELECT count(*) FROM audit.logs WHERE actor_id = '${adminId}' AND action IN ('impersonate_start','impersonate_end')`,
      );
      expect(auditedEvents).toBe('2');
    },
  );

  adminTest(
    'el target expirado cierra su fila real y pierde todas sus cookies locales',
    async ({ platformAdmin }) => {
      const { page, targetId, targetEmail } = platformAdmin;
      const sessionId = await beginSession(page, targetId, targetEmail);
      execSqlAsPostgres(
        `UPDATE public.impersonation_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE id='${sessionId}'`,
      );
      await page.goto('/api/impersonation/expire?returnTo=/fr/dashboard/account');
      await expect(page).toHaveURL(/\/fr\/login\?next=.*impersonation=expired/);
      expect(
        querySqlAsPostgres(
          `SELECT ended_reason FROM public.impersonation_sessions WHERE id='${sessionId}' AND ended_at IS NOT NULL`,
        ),
      ).toBe('expired');
      expect(
        (await page.context().cookies()).filter(
          (cookie) =>
            cookie.name === 'admin_return_session' ||
            cookie.name === 'impersonation_session_id' ||
            cookie.name.startsWith('sb-127-auth-token'),
        ),
      ).toHaveLength(0);
      await page.goto('/es/dashboard/admin/accounts');
      await expect(page).toHaveURL(/\/es\/login/);
    },
  );

  adminTest(
    'preexpiry y cierre manual del target se deniegan; el owner recuperado cierra la fila',
    async ({ platformAdmin, request }) => {
      const { page, targetId, targetEmail, loginAdmin } = platformAdmin;
      const sessionId = await beginSession(page, targetId, targetEmail);
      const token = await browserAccessToken(page);
      for (const reason of ['expired', 'manual']) {
        const denied = await callRpc(
          request,
          'end_impersonation_session',
          { p_session_id: sessionId, p_reason: reason },
          token,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
        );
        expect(denied.status).toBe(403);
      }
      expect(
        querySqlAsPostgres(
          `SELECT count(*) FROM public.impersonation_sessions WHERE id='${sessionId}' AND ended_at IS NULL`,
        ),
      ).toBe('1');
      await page.goto('/api/impersonation/expire');
      await expect(page).toHaveURL(/\/es\/login/);
      expect(
        querySqlAsPostgres(
          `SELECT count(*) FROM public.impersonation_sessions WHERE id='${sessionId}' AND ended_at IS NULL`,
        ),
      ).toBe('1');
      await loginAdmin();
      await closeAsRecoveredOwner(page, request, sessionId);
    },
  );

  adminTest(
    'cookie de retorno dañada falla cerrado y el owner recupera el cierre dirigido',
    async ({ platformAdmin, request }) => {
      const { page, targetId, targetEmail, loginAdmin } = platformAdmin;
      const sessionId = await beginSession(page, targetId, targetEmail);
      const cookie = (await page.context().cookies()).find(
        (cookie) => cookie.name === 'admin_return_session',
      );
      if (!cookie) throw new Error('Return cookie missing from real impersonation session');
      await page.context().addCookies([{ ...cookie, value: 'invalid.return.cookie' }]);
      await page.getByRole('button', { name: /^salir$/i }).click();
      await expect
        .poll(
          async () =>
            (await page.context().cookies()).filter(
              (cookie) =>
                cookie.name === 'admin_return_session' ||
                cookie.name === 'impersonation_session_id' ||
                cookie.name.startsWith('sb-127-auth-token'),
            ).length,
        )
        .toBe(0);
      await page.goto('/es/dashboard/admin/accounts');
      await expect(page).toHaveURL(/\/es\/login/);
      expect(
        querySqlAsPostgres(
          `SELECT count(*) FROM public.impersonation_sessions WHERE id='${sessionId}' AND ended_at IS NULL`,
        ),
      ).toBe('1');
      await loginAdmin();
      await closeAsRecoveredOwner(page, request, sessionId);
      await expect(page.getByRole('heading', { name: 'Cuentas' })).toBeVisible();
    },
  );
});

async function beginSession(page: Page, targetId: string, targetEmail: string): Promise<string> {
  await page.goto(`/es/dashboard/admin/accounts/${targetId}`);
  await page.getByRole('button', { name: /ver como/i }).click();
  await page.locator('#impersonate-reason').fill('Plan0124 local acceptance');
  await page.getByRole('button', { name: /iniciar sesión como este usuario/i }).click();
  await page.waitForURL((url) => url.pathname === '/es/dashboard', {
    timeout: localE2eBudget(20_000, 'navigation'),
  });
  await expect(
    page.getByText(new RegExp(`estás viendo como.*${escapeRegExp(targetEmail)}`, 'i')),
  ).toBeVisible();
  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'impersonation_session_id',
  )?.value;
  if (!session || !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(session))
    throw new Error('Bound SQL session cookie missing');
  return session;
}

/** Reads only this loopback project's local session; tokens are never logged. */
async function browserAccessToken(page: Page): Promise<string> {
  const prefix = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  const cookies = (await page.context().cookies())
    .filter((cookie) => cookie.name === prefix || cookie.name.startsWith(prefix + '.'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const value = cookies.map((cookie) => cookie.value).join('');
  const input: unknown = JSON.parse(
    value.startsWith('base64-') ? Buffer.from(value.slice(7), 'base64url').toString('utf8') : value,
  );
  if (
    typeof input !== 'object' ||
    input === null ||
    !('access_token' in input) ||
    typeof input.access_token !== 'string'
  )
    throw new Error('Verified UI session cookie missing');
  return input.access_token;
}
async function closeAsRecoveredOwner(
  page: Page,
  request: APIRequestContext,
  sessionId: string,
): Promise<void> {
  const result = await callRpc(
    request,
    'end_impersonation_session',
    { p_session_id: sessionId, p_reason: 'manual' },
    await browserAccessToken(page),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  );
  expect(result.ok).toBe(true);
  expect(
    querySqlAsPostgres(
      `SELECT ended_reason FROM public.impersonation_sessions WHERE id='${sessionId}' AND ended_at IS NOT NULL`,
    ),
  ).toBe('manual');
}

/** Escapes regex metacharacters so a raw email string can be used in `new RegExp(...)`. */
function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
