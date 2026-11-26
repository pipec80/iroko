import { expect, test, type APIRequestContext } from '@playwright/test';

import { isCloudBrowserTarget } from '../cloud-protection';
import { requireUserUuid, withAuthCleanup } from '../local-auth-cleanup';
import {
  createConfirmedUser,
  execSqlAsPostgres,
  fetchLatestMessageTo,
  loginViaUi,
  SUPABASE_URL,
  uniqueEmail,
} from './helpers';

test.skip(({ baseURL }) => isCloudBrowserTarget(baseURL), 'Requires owned local Auth fixtures');

async function deleteFixtureUser(request: APIRequestContext, id: string, serviceKey: string) {
  const response = await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Owned Auth fixture cleanup failed (${response.status()})`);
  }
}

function deleteFixtureAccounts(id: string) {
  execSqlAsPostgres(`DELETE FROM public.accounts WHERE id = '${id}' OR created_by = '${id}'`);
}

test('returns to login after its Auth user disappears while a dashboard session is open', async ({
  page,
  request,
}, testInfo) => {
  const email = uniqueEmail('e2e-stale-session');
  const password = 'Owned.Session-4521!';
  const key = process.env.SUPABASE_SECRET_KEY ?? '';
  const id = requireUserUuid(await createConfirmedUser(request, email, password, key));
  const destination = '/es/dashboard/account';
  await withAuthCleanup(
    async () => {
      await loginViaUi(page, email, password);
      await page.goto(destination);
      await expect(page).toHaveURL(new RegExp(`${destination}$`));
      deleteFixtureAccounts(id);
      await deleteFixtureUser(request, id, key);
      await page.goto(destination);
      await expect(page).toHaveURL(/\/es\/login/);
      expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
    },
    () => deleteFixtureAccounts(id),
    () => deleteFixtureUser(request, id, key),
    (error) => testInfo.annotations.push({ type: 'fixture cleanup', description: error.message }),
  );
});

test('shows pending and complete status after the two email change links', async ({
  page,
  request,
}, testInfo) => {
  const oldEmail = uniqueEmail('e2e-email-old');
  const newEmail = uniqueEmail('e2e-email-new');
  const password = 'Owned.Email-4521!';
  const key = process.env.SUPABASE_SECRET_KEY ?? '';
  const id = requireUserUuid(await createConfirmedUser(request, oldEmail, password, key));

  await withAuthCleanup(
    async () => {
      await loginViaUi(page, oldEmail, password);
      await page.goto('/es/dashboard/account?tab=security');
      await page.locator('#new_email').fill(newEmail);
      await page
        .locator('form')
        .filter({ has: page.locator('#new_email') })
        .getByRole('button')
        .click();
      await expect(
        page.getByText('Te enviamos un correo de confirmación al viejo y al nuevo email.'),
      ).toBeVisible();

      for (const [email, status] of [
        [oldEmail, 'pending'],
        [newEmail, 'complete'],
      ] as const) {
        const { confirmUrl } = await fetchLatestMessageTo(request, email, 15_000, true);
        if (!confirmUrl) throw new Error('No email-change confirmation URL in Mailpit');
        expect(new URL(confirmUrl).origin).toBe(new URL(page.url()).origin);
        await page.goto(confirmUrl);
        await page.getByRole('button', { name: 'Confirmar cambio de correo' }).click();
        await expect(page).toHaveURL(new RegExp(`/es/dashboard/account.*emailChange=${status}`));
      }
      await expect(page.getByText('Se actualizó tu correo electrónico.')).toBeVisible();
      await expect(page.getByText(newEmail, { exact: true }).first()).toBeVisible();
      await page.request.post('/es/auth/logout');
      await loginViaUi(page, newEmail, password);
    },
    () => deleteFixtureAccounts(id),
    () => deleteFixtureUser(request, id, key),
    (error) => testInfo.annotations.push({ type: 'fixture cleanup', description: error.message }),
  );
});
