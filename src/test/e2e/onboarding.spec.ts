import { expect, test } from '@playwright/test';

import { isCloudBrowserTarget } from '../cloud-protection';
import { requireUserUuid, withAuthCleanup } from '../local-auth-cleanup';
import {
  createConfirmedUser,
  execSqlAsPostgres,
  loginViaUi,
  SUPABASE_URL,
  uniqueEmail,
} from './helpers';

test('first sign-in provisions one organization and the old onboarding URL returns to the dashboard', async ({
  page,
  request,
  baseURL,
}) => {
  test.skip(isCloudBrowserTarget(baseURL), 'requires an owned local Supabase fixture');

  const email = uniqueEmail('e2e+onboarding');
  const password = 'TestPass123!';
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
  const userId = requireUserUuid(await createConfirmedUser(request, email, password, serviceKey));

  await withAuthCleanup(
    async () => {
      await loginViaUi(page, email, password);
      const selector = page.getByRole('button', { name: /cambiar de organización/i });
      await expect(selector).toContainText('Mi organización');

      await page.goto('/es/dashboard/onboarding');
      await expect(page).toHaveURL(/\/es\/dashboard$/);
      await page.reload();
      await expect(selector).toContainText('Mi organización');

      await selector.click();
      const accounts = page.getByRole('listbox');
      await expect(accounts.getByRole('option')).toHaveCount(1);
      await expect(accounts.getByRole('option')).toContainText('Mi organización');
    },
    () =>
      execSqlAsPostgres(
        `DELETE FROM public.accounts WHERE id = '${userId}' OR (created_by = '${userId}' AND type = 'team')`,
      ),
    async () => {
      const response = await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      if (!response.ok())
        throw new Error(`Owned signup fixture cleanup failed (${response.status()})`);
    },
    (error) =>
      test.info().annotations.push({ type: 'fixture cleanup', description: error.message }),
  );
});
