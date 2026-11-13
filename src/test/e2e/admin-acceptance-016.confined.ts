import { randomUUID } from 'node:crypto';

import { test, expect } from './fixtures/platform-admin';
import { execSqlAsPostgres, querySqlAsPostgres } from './helpers';

test('preserves an invitation destination through password and real MFA', async ({
  platformAdmin,
}) => {
  const { page, adminId, targetId, loginAdmin } = platformAdmin;
  const teamId = randomUUID();
  const token = randomUUID();
  const teamName = `Plan016 invitation ${teamId}`;
  const invitationPath = `/es/auth/accept-invitation?token=${token}`;
  execSqlAsPostgres(`
    BEGIN;
    INSERT INTO public.accounts(id,type,name,slug,created_by)
    VALUES ('${teamId}','team','${teamName}','plan016-${teamId}','${targetId}');
    INSERT INTO public.accounts_memberships(account_id,user_id,role)
    VALUES ('${teamId}','${targetId}','owner');
    INSERT INTO public.invitations(account_id,email,role,invited_by,token_hash,expires_at)
    SELECT '${teamId}',email,'member','${targetId}',
      encode(extensions.digest('${token}','sha256'),'hex'),now()+interval '1 hour'
    FROM auth.users WHERE id='${adminId}';
    COMMIT;
  `);

  await page.context().clearCookies();
  await page.goto(invitationPath);
  const loginUrl = new URL(page.url());
  expect(loginUrl.pathname).toBe('/es/login');
  expect(loginUrl.searchParams.get('next') === invitationPath).toBe(true);
  try {
    await loginAdmin(invitationPath);
  } catch (error) {
    const state = querySqlAsPostgres(`
      SELECT json_build_object(
        'accepted',EXISTS(SELECT 1 FROM public.invitations WHERE account_id='${teamId}' AND status='accepted'),
        'member',EXISTS(SELECT 1 FROM public.accounts_memberships WHERE account_id='${teamId}' AND user_id='${adminId}')
      )
    `);
    throw new Error(
      `${error instanceof Error ? error.message : 'Invitation login failed'}; owned state=${state}`,
    );
  }
  await expect(page.getByRole('button', { name: /cambiar de organización/i })).toContainText(
    teamName,
  );
  expect(new URL(page.url()).pathname).toBe('/es/dashboard');
  expect(
    querySqlAsPostgres(
      `SELECT count(*) FROM public.accounts_memberships WHERE account_id='${teamId}' AND user_id='${adminId}' AND role='member'`,
    ),
  ).toBe('1');
  await page.reload();
  await expect(page.getByRole('button', { name: /cambiar de organización/i })).toContainText(
    teamName,
  );
});

test('opens exact account detail when the account is outside the first hundred', async ({
  platformAdmin,
}) => {
  const { page, adminId, targetId, targetEmail } = platformAdmin;
  execSqlAsPostgres(`
    INSERT INTO public.accounts(id,type,name,slug,created_by,created_at)
    SELECT id,'team','Plan016 newer '||id::text,'plan016-'||id::text,'${adminId}',
      now()+n*interval '1 second'
    FROM (SELECT gen_random_uuid() AS id,n FROM generate_series(1,101) n) own_accounts;
  `);
  expect(
    querySqlAsPostgres(`
      SELECT count(*) FROM (
        SELECT id FROM public.accounts WHERE deleted_at IS NULL
        ORDER BY created_at DESC,id DESC LIMIT 100
      ) first_batch WHERE id='${targetId}'
    `),
  ).toBe('0');
  await page.goto('/es/dashboard/admin/accounts');
  await expect(page.getByRole('heading', { name: 'Cuentas', exact: true })).toBeVisible();
  await expect(page.locator(`a[href$="/dashboard/admin/accounts/${targetId}"]`)).toHaveCount(0);
  await page.goto(`/es/dashboard/admin/accounts/${targetId}`);
  await expect(page.getByRole('button', { name: /ver como/i })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(targetEmail);
});

test('shows a generic admin error for an unknown database failure and recovers after retry', async ({
  platformAdmin,
}) => {
  const { page, adminId } = platformAdmin;
  const suffix = randomUUID().replaceAll('-', '');
  const schema = `iroko016_${suffix}`;
  const trigger = `iroko016_${suffix}`;
  const title = `Plan016 controlled failure ${suffix}`;
  let ownsTrigger = false;
  try {
    await page.goto('/es/dashboard/admin/announcements');
    const form = page.locator('form').filter({ has: page.locator('#announcement-title') });
    await form.getByRole('button', { name: /publicar/i }).click();
    await expect(form.getByRole('alert')).toHaveText('Revisá los datos del formulario.');

    // Only this UUID-marked fixture fails; existing announcements and other
    // callers retain their normal behavior. Creation is atomic and ownership
    // is claimed only after success, so a collision cannot authorize cleanup.
    execSqlAsPostgres(`
      BEGIN;
      CREATE SCHEMA ${schema};
      REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC;
      CREATE FUNCTION ${schema}.reject_owned_title() RETURNS trigger
      LANGUAGE plpgsql SET search_path='' AS $fixture$
      BEGIN RAISE EXCEPTION 'plan016_controlled_unknown_failure'; END;
      $fixture$;
      CREATE TRIGGER ${trigger} BEFORE INSERT ON public.announcements
      FOR EACH ROW WHEN (NEW.title='${title}')
      EXECUTE FUNCTION ${schema}.reject_owned_title();
      COMMIT;
    `);
    ownsTrigger = true;
    await page.locator('#announcement-title').fill(title);
    await form.getByRole('button', { name: /publicar/i }).click();
    await expect(form.getByRole('alert')).toHaveText('Ocurrió un error. Intentá de nuevo.');
    await expect(form.getByRole('alert')).not.toContainText('No tenés acceso');
    expect(
      querySqlAsPostgres(
        `SELECT count(*) FROM public.announcements WHERE title='${title}' AND created_by='${adminId}'`,
      ),
    ).toBe('0');

    execSqlAsPostgres(
      `BEGIN; DROP TRIGGER ${trigger} ON public.announcements; DROP SCHEMA ${schema} CASCADE; COMMIT;`,
    );
    ownsTrigger = false;
    await form.getByRole('button', { name: /publicar/i }).click();
    await expect(form.getByRole('status')).toBeVisible();
    expect(
      querySqlAsPostgres(
        `SELECT count(*) FROM public.announcements WHERE title='${title}' AND created_by='${adminId}'`,
      ),
    ).toBe('1');
  } finally {
    if (ownsTrigger) {
      execSqlAsPostgres(
        `BEGIN; DROP TRIGGER ${trigger} ON public.announcements; DROP SCHEMA ${schema} CASCADE; COMMIT;`,
      );
    }
    execSqlAsPostgres(
      `DELETE FROM public.announcements WHERE title='${title}' AND created_by='${adminId}'`,
    );
  }
});
