import { querySqlAsPostgres } from './helpers';
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
      adminTest.setTimeout(120_000);
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
      await page.waitForURL((url) => url.pathname === '/es/dashboard', { timeout: 20_000 });
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
      // comentario en src/lib/supabase/middleware.ts ("AdminLayout's own
      // notFound() call produces a genuine 404 status") está desactualizado;
      // el contenido SÍ es el 404 real (no hay fuga de datos), solo el
      // status HTTP queda en 200. Documentado para un follow-up de Plan 005/006,
      // fuera de alcance de este fixture.
      await page.goto('/es/dashboard/admin/accounts');
      await expect(page.getByText(/página no encontrada/i)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Cuentas' })).toHaveCount(0);

      // Salir — vuelve a ser el admin, con su sesión aal2 restaurada (no solo
      // el usuario: llegar con contenido a /admin/accounts exige is_platform_admin
      // Y aal2 simultáneamente).
      await page.goto('/es/dashboard');
      await page.getByRole('button', { name: /^salir$/i }).click();
      await page.waitForURL(/\/es\/dashboard\/admin\/accounts/, { timeout: 20_000 });
      await expect(page.getByRole('heading', { name: 'Cuentas' })).toBeVisible();
      await expect(page.getByText(/estás viendo como/i)).toHaveCount(0);

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
});

/** Escapes regex metacharacters so a raw email string can be used in `new RegExp(...)`. */
function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
