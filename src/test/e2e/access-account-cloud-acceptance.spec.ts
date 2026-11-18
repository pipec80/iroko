import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createClient, type Session } from '@supabase/supabase-js';
import { combineChunks, createChunks, stringFromBase64URL, stringToBase64URL } from '@supabase/ssr';
import { expect, test, type BrowserContext, type Response } from '@playwright/test';

import { generateTotp } from '../totp';

const origin = 'https://project-a89lv.vercel.app';
const backend = 'https://rgrxlygtmvavqzkjyywg.supabase.co';
const cookieName = 'sb-rgrxlygtmvavqzkjyywg-auth-token';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(180_000);
test.skip(
  process.env.ACCESS_ACCOUNT_CLOUD_ACCEPTANCE !== '1',
  'Manual owned Cloud acceptance only',
);

function requireResult(condition: unknown, stage: string): asserts condition {
  if (!condition) throw new Error(`access_account_cloud_${stage}`);
}

async function seedRefresh(context: BrowserContext, session: Session) {
  // Alter the SDK's local expiration hint, never the signed JWT or project TTL.
  // A valid refresh token makes the real SSR client renew on the next request.
  const encoded = `base64-${stringToBase64URL(JSON.stringify({ ...session, expires_at: 1, expires_in: 0 }))}`;
  await context.clearCookies({ name: /^sb-rgrxlygtmvavqzkjyywg-auth-token(?:\.\d+)?$/ });
  await context.addCookies(
    createChunks(cookieName, encoded).map(({ name, value }) => ({
      name,
      value,
      url: origin,
      secure: true,
      sameSite: 'Lax' as const,
    })),
  );
}

async function readSession(context: BrowserContext): Promise<Session> {
  const cookies = await context.cookies(origin);
  const encoded = await combineChunks(
    cookieName,
    async (name) => cookies.find((cookie) => cookie.name === name)?.value ?? null,
  );
  return decodeSession(encoded);
}

function decodeSession(encoded: string | null): Session {
  requireResult(encoded && encoded.startsWith('base64-'), 'cookie_missing');
  const value = JSON.parse(stringFromBase64URL(encoded.slice(7))) as Session;
  requireResult(
    typeof value.access_token === 'string' &&
      typeof value.refresh_token === 'string' &&
      typeof value.expires_at === 'number',
    'cookie_invalid',
  );
  return value;
}

async function redirectSession(response: Response, path: string, oldToken: string) {
  const location = await response.headerValue('location');
  requireResult(response.status() === 307 && location, 'redirect_missing');
  const destination = new URL(location, origin);
  requireResult(
    destination.origin === origin && destination.pathname === path,
    'redirect_destination',
  );
  const issued = new Map(
    (await response.headersArray())
      .filter((header) => header.name.toLowerCase() === 'set-cookie')
      .map((header) => {
        const pair = header.value.split(';', 1)[0] ?? '';
        const separator = pair.indexOf('=');
        return [pair.slice(0, separator), decodeURIComponent(pair.slice(separator + 1))];
      }),
  );
  const value = await combineChunks(cookieName, async (name) => issued.get(name) ?? null);
  const session = decodeSession(value);
  requireResult(
    (session.expires_at ?? 0) > Date.now() / 1000 && session.refresh_token !== oldToken,
    'redirect_refresh_cookie',
  );
  requireResult(
    (await response.headerValue('cache-control'))?.includes('no-store'),
    'redirect_cache_control',
  );
  return session;
}

test('owned Cloud MFA recovery and both refresh redirects', async ({ page, baseURL }) => {
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(30_000);
  requireResult(
    baseURL === origin && process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') === backend,
    'target_mismatch',
  );
  requireResult(
    /^[a-f0-9]{40}$/.test(process.env.ACCESS_ACCOUNT_EXPECTED_SHA ?? ''),
    'revision_missing',
  );
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  requireResult(publicKey && secretKey, 'credentials_missing');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(backend, secretKey, options);
  const client = createClient(backend, publicKey, options);
  const prior = createClient(backend, publicKey, options);
  const email = `access-account-${randomUUID()}@example.test`;
  const password = `Aa1!${randomUUID()}`;
  let id: string | undefined;
  let stage = 'create_fixture';
  const bootstrap = async (target: typeof client) => {
    const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    requireResult(!link.error && link.data.properties?.hashed_token, 'fixture_bootstrap');
    requireResult(
      !(
        await target.auth.verifyOtp({
          token_hash: link.data.properties.hashed_token,
          type: 'magiclink',
        })
      ).error,
      'fixture_bootstrap',
    );
  };
  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        given_name: 'AccessAcceptance',
        family_name: process.env.GITHUB_RUN_ID ?? 'manual',
      },
    });
    requireResult(!created.error && created.data.user, stage);
    id = created.data.user.id;
    requireResult(
      process.env.ACCESS_ACCOUNT_FIXTURE_FILE && process.env.GITHUB_RUN_ID,
      'fixture_journal',
    );
    writeFileSync(
      process.env.ACCESS_ACCOUNT_FIXTURE_FILE,
      JSON.stringify({ id, runId: process.env.GITHUB_RUN_ID }),
      { mode: 0o600 },
    );
    // Only the fresh UUID is emitted for independent personal-account cleanup.
    process.stdout.write(`ACCESS_ACCOUNT_FIXTURE_ID=${id}\n`);
    stage = 'enroll';
    await bootstrap(client);
    const factor = await client.auth.mfa.enroll({ factorType: 'totp' });
    requireResult(!factor.error && factor.data, stage);
    requireResult(
      !(
        await client.auth.mfa.challengeAndVerify({
          factorId: factor.data.id,
          code: generateTotp(factor.data.totp.secret),
        })
      ).error,
      stage,
    );
    const initial = (await client.auth.getSession()).data.session;
    requireResult(initial, stage);
    stage = 'refresh_onboarding';
    await seedRefresh(page.context(), initial);
    const [onboardingResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().isNavigationRequest() &&
          new URL(response.url()).pathname === '/es/dashboard' &&
          response.status() === 307,
      ),
      page.goto('/es/dashboard'),
    ]);
    const onboardingCookie = await redirectSession(
      onboardingResponse,
      '/es/dashboard/onboarding',
      initial.refresh_token,
    );
    await page.waitForURL('**/es/dashboard/onboarding');
    const renewed = await readSession(page.context());
    requireResult(
      (renewed.expires_at ?? 0) > Date.now() / 1000 &&
        renewed.refresh_token === onboardingCookie.refresh_token,
      stage,
    );
    process.stdout.write('ACCESS_ACCOUNT_REFRESH_ONBOARDING=PASS\n');
    stage = 'refresh_login';
    requireResult(!(await client.auth.setSession(renewed)).error, stage);
    requireResult(!(await client.rpc('complete_onboarding')).error, stage);
    const refreshed = await client.auth.refreshSession();
    requireResult(!refreshed.error && refreshed.data.session, stage);
    await seedRefresh(page.context(), refreshed.data.session);
    const [loginResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().isNavigationRequest() &&
          new URL(response.url()).pathname === '/es/login' &&
          response.status() === 307,
      ),
      page.goto('/es/login'),
    ]);
    const loginCookie = await redirectSession(
      loginResponse,
      '/es/dashboard',
      refreshed.data.session.refresh_token,
    );
    await page.waitForURL('**/es/dashboard');
    const persisted = await readSession(page.context());
    requireResult(
      (persisted.expires_at ?? 0) > Date.now() / 1000 &&
        persisted.refresh_token === loginCookie.refresh_token,
      stage,
    );
    process.stdout.write('ACCESS_ACCOUNT_REFRESH_LOGIN=PASS\n');
    stage = 'generate_codes';
    requireResult(!(await client.auth.setSession(persisted)).error, stage);
    const codes = await client.rpc('generate_recovery_codes');
    const code = (codes.data as string[] | null)?.[0];
    requireResult(!codes.error && code, stage);
    await bootstrap(prior);
    requireResult(!(await prior.auth.refreshSession()).error, stage);
    await page.context().clearCookies({ name: /^sb-rgrxlygtmvavqzkjyywg-auth-token(?:\.\d+)?$/ });
    stage = 'login_mfa';
    await page.goto('/es/login');
    await page.locator('input[name="email"][type="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    stage = 'login_mfa_readiness';
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled({
      timeout: 15_000,
    });
    stage = 'login_mfa';
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.locator('#code').waitFor();
    stage = 'recover';
    await page.getByRole('button', { name: /código de recuperación/i }).click();
    await page.locator('#recovery-code').fill(code);
    await page
      .locator('form')
      .filter({ has: page.locator('#recovery-code') })
      .getByRole('button', { name: /verificar/i })
      .click();
    await page.waitForURL('**/es/login?recovered=1*');
    stage = 'reauthenticate';
    await page.locator('input[name="email"][type="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    stage = 'reauthenticate_readiness';
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled({
      timeout: 15_000,
    });
    stage = 'reauthenticate';
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForURL('**/es/dashboard/account*');
    await page.reload();
    await page.locator('#current_password').waitFor();
    const revoked = (await prior.auth.refreshSession()).error;
    requireResult(
      revoked &&
        [400, 401, 403].includes(revoked.status ?? 0) &&
        ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found'].includes(
          revoked.code ?? '',
        ),
      'old_session_revocation',
    );
    stage = 'replay';
    const current = await readSession(page.context());
    requireResult(!(await client.auth.setSession(current)).error, stage);
    const replacement = await client.auth.mfa.enroll({ factorType: 'totp' });
    requireResult(!replacement.error && replacement.data, stage);
    requireResult(
      !(
        await client.auth.mfa.challengeAndVerify({
          factorId: replacement.data.id,
          code: generateTotp(replacement.data.totp.secret),
        })
      ).error,
      stage,
    );
    const replay = await client.rpc('begin_mfa_recovery', { p_code: code });
    requireResult(!replay.error && Array.isArray(replay.data) && replay.data.length === 0, stage);
    const remaining = await client.auth.mfa.listFactors();
    requireResult(
      !remaining.error && remaining.data?.totp.some((item) => item.id === replacement.data.id),
      stage,
    );
    process.stdout.write(
      'ACCESS_ACCOUNT_MFA_RECOVERY=PASS\nACCESS_ACCOUNT_REPLAY_DENIED=PASS\nACCESS_ACCOUNT_PRIOR_SESSION_REVOKED=PASS\n',
    );
  } catch {
    if (
      stage.endsWith('_readiness') &&
      (await page.locator('input[name="captchaToken"]').count())
    ) {
      process.stdout.write('ACCESS_ACCOUNT_CAPTCHA_NOT_READY=1\n');
    }
    // Never print SDK responses, passwords, tokens, browser logs or request headers.
    throw new Error(`access_account_cloud_failed_at_${stage}`);
  } finally {
    if (id) {
      try {
        const removed = await admin.auth.admin.deleteUser(id);
        requireResult(!removed.error, 'fixture_auth_cleanup');
        process.stdout.write('ACCESS_ACCOUNT_AUTH_CLEANUP=PASS\n');
      } catch {
        throw new Error('access_account_cloud_fixture_auth_cleanup_failed');
      }
    }
  }
});
