import { test, expect } from './fixtures/platform-admin';
import { execSqlAsPostgres, querySqlAsPostgres } from './helpers';

test('platform audit preserves cross-account scope, pagination and retry', async ({
  platformAdmin,
}) => {
  const { page, adminId, targetId } = platformAdmin;
  const fixturePrefix = `plan014-${adminId}-`;
  const fixturePredicate = `resource_id LIKE '${fixturePrefix}%'`;
  try {
    execSqlAsPostgres(`
      INSERT INTO audit.logs (actor_id, action, resource_type, resource_id,
        account_id, impersonator_id, created_at)
      SELECT '${targetId}', 'export', 'profiles', '${fixturePrefix}' || n,
        CASE WHEN n % 2 = 0 THEN '${adminId}'::uuid ELSE '${targetId}'::uuid END,
        '${adminId}', now() + n * interval '1 second'
      FROM generate_series(1, 24) AS n;
    `);
    await page.goto('/es/dashboard/admin/audit');
    const action = page.getByRole('combobox', { name: 'Filtrar por acción', exact: true });
    const resource = page.getByRole('combobox', {
      name: 'Filtrar por tipo de recurso',
      exact: true,
    });
    const loadMore = page.getByRole('button', { name: 'Cargar más', exact: true });
    const loadError = page.getByRole('alert').filter({
      hasText: 'No se pudo cargar la actividad. Inténtalo de nuevo.',
    });
    await expect(action).toBeVisible();

    await action.selectOption('export');
    await expect(action).toBeEnabled();
    await resource.selectOption('profiles');
    await expect(resource).toBeEnabled();
    await expect(action).toHaveValue('export');
    await expect(resource).toHaveValue('profiles');
    // Account IDs are rendered in the shared table, separate from impersonator IDs.
    // The target ID appears once per target-account row; 10 of the first 20.
    await expect(page.getByText(targetId, { exact: true })).toHaveCount(10);
    await expect(loadMore).toBeVisible();
    await loadMore.click();
    await expect(page.getByText(targetId, { exact: true })).toHaveCount(12);
    // Admin ID occurs once per impersonation and once per admin-account row.
    await expect(page.getByText(adminId, { exact: true })).toHaveCount(36);

    let failuresInjected = 0;
    await page.route('**/es/dashboard/admin/audit', async (route) => {
      const request = route.request();
      if (
        request.method() === 'POST' &&
        request.headers()['next-action'] &&
        failuresInjected === 0
      ) {
        failuresInjected++;
        await route.abort('failed');
        return;
      }
      await route.continue();
    });
    await action.selectOption('delete');
    await expect(loadError).toContainText('No se pudo cargar la actividad. Inténtalo de nuevo.');
    await expect(action).toBeEnabled();
    await expect(action).toHaveValue('export');
    await expect(page.getByText(targetId, { exact: true })).toHaveCount(12);
    await expect(page.getByText(adminId, { exact: true })).toHaveCount(36);
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(action).toBeEnabled();
    await expect(action).toHaveValue('delete');
    await expect(loadError).toBeHidden();
    await expect(page.getByText(targetId, { exact: true })).toHaveCount(0);
    expect(failuresInjected).toBe(1);
  } finally {
    // Only this identity-checked local postgres connection may remove owned fixtures.
    // SET LOCAL restores trigger execution on commit/rollback; application guards stay enabled.
    execSqlAsPostgres(`
      BEGIN;
      SET LOCAL session_replication_role = replica;
      DELETE FROM audit.logs WHERE ${fixturePredicate};
      SET LOCAL session_replication_role = origin;
      COMMIT;
    `);
    expect(querySqlAsPostgres(`SELECT count(*) FROM audit.logs WHERE ${fixturePredicate}`)).toBe(
      '0',
    );
  }
});
