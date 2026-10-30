import { localE2eBudget } from '../local-e2e-target';
import { expect, test } from '@playwright/test';
import { requireUserUuid } from '../local-auth-cleanup';
import {
  createConfirmedUser,
  createTeamViaUi,
  execSqlAsPostgres,
  loginViaUi,
  querySqlAsPostgres,
  uniqueEmail,
} from './helpers';

test('warm account caches and notifications follow account switch and logout/login without document reload', async ({
  page,
  request,
}) => {
  test.setTimeout(localE2eBudget(120_000));
  const password = 'TestPass123!';
  const identities: string[] = [];
  const suffix = Date.now();
  const emails = [uniqueEmail('e2e+identity-a'), uniqueEmail('e2e+identity-b')];
  const notificationRequests: string[] = [];
  const logoutStatuses: number[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/rest/v1/notifications')) notificationRequests.push(request.url());
  });
  page.on('response', (response) => {
    if (response.url().includes('/auth/v1/logout')) logoutStatuses.push(response.status());
  });
  try {
    for (const email of emails)
      identities.push(
        requireUserUuid(
          await createConfirmedUser(
            request,
            email,
            password,
            process.env.SUPABASE_SECRET_KEY ?? '',
          ),
        ),
      );
    const [a, b] = identities;
    execSqlAsPostgres(
      `UPDATE public.profiles SET onboarding_completed=true WHERE id IN ('${a}','${b}'); INSERT INTO public.notifications(user_id,type,title) VALUES ('${a}','info','NOTICE_A_${suffix}'),('${b}','info','NOTICE_B_${suffix}'); INSERT INTO public.api_keys(account_id,name,key_prefix,key_hash,created_by) VALUES ('${a}','CACHE_A_${suffix}','test','hash-a-${suffix}','${a}');`,
    );
    await loginViaUi(page, emails[0]!, password);
    await page.evaluate(() => {
      Object.assign(window, { identityDocumentMarker: 'same-document' });
    });
    await page.getByRole('button', { name: /^notificaciones$/i }).click();
    await expect(page.getByText(`NOTICE_A_${suffix}`)).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('a[href="/es/dashboard/org/settings"]').first().click();
    await page.getByRole('button', { name: /api keys/i }).click();
    await expect(page.getByText(`CACHE_A_${suffix}`)).toBeVisible({
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    const teamName = `Identity ${suffix}`;
    await createTeamViaUi(page, teamName, { preserveDocument: true });
    const team = requireUserUuid(
      querySqlAsPostgres(
        `SELECT id FROM public.accounts WHERE created_by='${a}' AND name='${teamName}'`,
      ),
    );
    execSqlAsPostgres(
      `INSERT INTO public.api_keys(account_id,name,key_prefix,key_hash,created_by) VALUES ('${team}','CACHE_B_${suffix}','test','hash-b-${suffix}','${a}');`,
    );
    await page.locator('a[href="/es/dashboard/org/settings"]').first().click();
    await page.getByRole('button', { name: /api keys/i }).click();
    await expect(page.getByText(`CACHE_B_${suffix}`)).toBeVisible({
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    await expect(page.getByText(`CACHE_A_${suffix}`)).toHaveCount(0);
    expect(await page.evaluate(() => Reflect.get(window, 'identityDocumentMarker'))).toBe(
      'same-document',
    );
    // Existing topbar dropdown trigger exposes the signed-in display name.
    await page.locator('button[data-slot="dropdown-menu-trigger"]').last().click();
    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    try {
      await expect(page.locator('input[name="email"][type="email"]')).toBeVisible({
        timeout: localE2eBudget(20_000, 'navigation'),
      });
    } catch {
      const pathname = new URL(page.url()).pathname;
      const failedToast = await page
        .getByText('No se pudo cerrar sesión. Inténtalo de nuevo.')
        .count();
      throw new Error(
        `Logout did not reach login: path=${pathname}, failedToast=${failedToast}, authLogoutStatuses=${logoutStatuses.join(',')}`,
      );
    }
    await page.locator('input[name="email"][type="email"]').fill(emails[1]!);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page.getByRole('button', { name: /^notificaciones$/i })).toBeVisible({
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    await page.getByRole('button', { name: /^notificaciones$/i }).click();
    await expect(page.getByText(`NOTICE_B_${suffix}`)).toBeVisible();
    await expect(page.getByText(`NOTICE_A_${suffix}`)).toHaveCount(0);
    expect(notificationRequests.some((url) => url.includes(`user_id=eq.${a}`))).toBe(true);
    expect(notificationRequests.some((url) => url.includes(`user_id=eq.${b}`))).toBe(true);
    expect(await page.evaluate(() => Reflect.get(window, 'identityDocumentMarker'))).toBe(
      'same-document',
    );
  } finally {
    for (const user of identities)
      execSqlAsPostgres(
        `DELETE FROM public.accounts WHERE id='${user}' OR created_by='${user}'; DELETE FROM auth.users WHERE id='${user}';`,
      );
  }
});
