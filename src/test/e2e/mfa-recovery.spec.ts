import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

import { requireUserUuid, withAuthCleanup } from '../local-auth-cleanup';
import { generateTotp } from '../totp';
import { isCloudBrowserTarget } from '../cloud-protection';
import { createConfirmedUser, execSqlAsPostgres, SUPABASE_URL, uniqueEmail } from './helpers';

test('MFA recovery resets the lost factor, requires reauthentication and survives reload', async ({
  page,
  request,
  baseURL,
}) => {
  test.skip(
    isCloudBrowserTarget(baseURL),
    'Owned local Auth fixture; Cloud acceptance is separate',
  );
  const key = process.env.SUPABASE_SECRET_KEY ?? '';
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  expect(key.length > 0 && publicKey.length > 0).toBe(true);
  const email = uniqueEmail('mfa-recovery');
  const password = 'Mfa.Recovery-1234!';
  const id = requireUserUuid(await createConfirmedUser(request, email, password, key));
  await withAuthCleanup(
    async () => {
      const client = createClient(SUPABASE_URL, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signedIn = await client.auth.signInWithPassword({ email, password });
      expect(signedIn.error).toBeNull();
      expect((await client.rpc('complete_onboarding')).error).toBeNull();
      const enrolled = await client.auth.mfa.enroll({ factorType: 'totp' });
      expect(enrolled.error).toBeNull();
      if (!enrolled.data) throw new Error('Owned fixture TOTP enrollment failed');
      const verified = await client.auth.mfa.challengeAndVerify({
        factorId: enrolled.data.id,
        code: generateTotp(enrolled.data.totp.secret),
      });
      expect(verified.error).toBeNull();
      const generated = await client.rpc('generate_recovery_codes');
      expect(generated.error).toBeNull();
      const code = (generated.data as string[] | null)?.[0];
      if (!code) throw new Error('Owned fixture recovery generation failed');
      const previousSession = createClient(SUPABASE_URL, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      expect((await previousSession.auth.signInWithPassword({ email, password })).error).toBeNull();
      expect((await previousSession.auth.refreshSession()).error).toBeNull();

      // Separate browser session starts at AAL1 and cannot pass the MFA guard.
      await page.goto('/es/login');
      await page.locator('input[name="email"][type="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page.locator('#code')).toBeVisible();
      await page.getByRole('button', { name: /código de recuperación/i }).click();
      await page.locator('#recovery-code').fill(code);
      await page
        .locator('form')
        .filter({ has: page.locator('#recovery-code') })
        .getByRole('button', { name: /verificar|recuperar/i })
        .click();
      await expect(page).toHaveURL(/\/es\/login\?recovered=1/);
      await expect(page.getByRole('status')).toContainText('Inicia sesión');
      await page.locator('input[name="email"][type="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/\/es\/dashboard\/account/);
      await page.reload();
      await expect(page).toHaveURL(/\/es\/dashboard\/account/);
      await expect(page.locator('#current_password')).toBeVisible();
      expect((await previousSession.auth.refreshSession()).error).not.toBeNull();

      expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
      const replacement = await client.auth.mfa.enroll({ factorType: 'totp' });
      expect(replacement.error).toBeNull();
      if (!replacement.data) throw new Error('Replacement fixture enrollment failed');
      expect(
        (
          await client.auth.mfa.challengeAndVerify({
            factorId: replacement.data.id,
            code: generateTotp(replacement.data.totp.secret),
          })
        ).error,
      ).toBeNull();
      const reused = await client.rpc('begin_mfa_recovery', { p_code: code });
      expect(reused.error).toBeNull();
      expect(reused.data).toEqual([]);
      const factors = await client.auth.mfa.listFactors();
      expect(factors.error).toBeNull();
      expect(factors.data?.totp.map((factor) => factor.id)).toEqual([replacement.data.id]);
    },
    () =>
      execSqlAsPostgres(
        `DELETE FROM public.accounts WHERE (id='${id}' AND type='personal') OR (created_by='${id}' AND type='team')`,
      ),
    async () => {
      const deleted = await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!deleted.ok()) throw new Error(`Owned MFA fixture cleanup failed (${deleted.status()})`);
    },
    () => {
      throw new Error('Owned MFA fixture cleanup failed after test failure');
    },
  );
});
