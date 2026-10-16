'use server';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { env } from '@/env';
import { redirect } from '@/i18n/routing';
import {
  getSupabaseAuthCookieNames,
  signImpersonationCookie,
  verifyImpersonationCookie,
} from '@/lib/impersonation-cookie';
import type { AdminReturnPayload } from '@/lib/impersonation-cookie';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { error?: string };
type Client = Awaited<ReturnType<typeof createClient>>;
type CookieStore = Awaited<ReturnType<typeof cookies>>;
const RETURN_COOKIE = 'admin_return_session';
const SESSION_COOKIE = 'impersonation_session_id';
const RETURN_TTL_SECONDS = 35 * 60;
const uuid = z.string().uuid();

function clearReturnCookies(store: CookieStore): void {
  store.delete(RETURN_COOKIE);
  store.delete(SESSION_COOKIE);
}
async function localSignOut(client: Client, store: CookieStore): Promise<void> {
  try {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error)
      logger.warn({ action: 'impersonation.logout', code: error.code }, 'Local sign-out failed');
  } catch {
    logger.warn({ action: 'impersonation.logout' }, 'Local sign-out unavailable');
  } finally {
    clearReturnCookies(store);
    for (const name of getSupabaseAuthCookieNames(
      store.getAll().map((cookie) => cookie.name),
      env.NEXT_PUBLIC_SUPABASE_URL,
    ))
      store.delete(name);
  }
}
async function restoreAdmin(client: Client, payload: AdminReturnPayload): Promise<boolean> {
  try {
    const { error } = await client.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    });
    if (error) return false;
    const { data, error: identityError } = await client.auth.getUser();
    return !identityError && data.user?.id === payload.adminUserId;
  } catch {
    return false;
  }
}
async function closeOwnerRow(client: Client, sessionId: string): Promise<boolean> {
  try {
    const { error } = await client.rpc('end_impersonation_session', {
      p_session_id: sessionId,
      p_reason: 'manual',
    });
    if (!error) return true;
    logger.error(
      { action: 'impersonation.end', sessionId, code: error.code },
      'Owner session closure requires recovery',
    );
  } catch {
    logger.error(
      { action: 'impersonation.end', sessionId },
      'Owner session closure unavailable; recovery required',
    );
  }
  return false;
}
class StartFailure extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** Verifies the admin before opening SQL state; compensates every failure after begin. */
export const startImpersonation = withServerAction(async function startImpersonation(
  targetUserId: string,
  reason: string,
): Promise<ActionResult> {
  if (!uuid.safeParse(targetUserId).success || !reason || reason.trim().length < 3)
    return { error: 'validation_error' };
  const client = await createClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  const { data: identity, error: identityError } = await client.auth.getUser();
  const adminSession = sessionData.session;
  if (
    sessionError ||
    identityError ||
    !adminSession ||
    !identity.user ||
    identity.user.id !== adminSession.user.id
  )
    return { error: 'not_authenticated' };
  const store = await cookies();
  const locale = await getLocale();
  const { data: session, error: beginError } = await client.rpc('begin_impersonation_session', {
    p_target_user_id: targetUserId,
    p_reason: reason,
  });
  if (beginError || !session) return { error: beginError?.message ?? 'start_failed' };
  const payload: AdminReturnPayload = {
    accessToken: adminSession.access_token,
    refreshToken: adminSession.refresh_token,
    adminUserId: identity.user.id,
    targetUserId,
    sessionId: session.id,
  };
  let swapAttempted = false;
  let failure: string | null = null;
  try {
    store.set({
      name: RETURN_COOKIE,
      value: signImpersonationCookie(payload),
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: RETURN_TTL_SECONDS,
      path: '/',
    });
    store.set({
      name: SESSION_COOKIE,
      value: session.id,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: RETURN_TTL_SECONDS,
      path: '/',
    });
    const admin = createAdminClient();
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetUserId);
    if (targetError || !target.user?.email) throw new StartFailure('target_not_found');
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: target.user.email,
    });
    if (linkError || !link?.properties.hashed_token) throw new StartFailure('start_failed');
    swapAttempted = true;
    const { error: otpError } = await client.auth.verifyOtp({
      type: 'magiclink',
      token_hash: link.properties.hashed_token,
    });
    if (otpError) throw new StartFailure('start_failed');
    const { data: targetIdentity, error: targetIdentityError } = await client.auth.getUser();
    if (targetIdentityError || targetIdentity.user?.id !== targetUserId)
      throw new StartFailure('start_failed');
    // The hook can see multiple active rows for a target. A correct user ID
    // alone does not prove that this token belongs to the row just opened.
    const { data: claimData, error: claimError } = await client.auth.getClaims();
    const claims = claimData?.claims;
    const metadata = claims?.app_metadata;
    const expiry =
      typeof metadata?.impersonation_expires_at === 'string' ?
        Date.parse(metadata.impersonation_expires_at)
      : Number.NaN;
    if (
      claimError ||
      claims?.sub !== targetUserId ||
      metadata?.impersonated_by !== payload.adminUserId ||
      !Number.isFinite(expiry) ||
      expiry !== Date.parse(session.expires_at)
    ) {
      throw new StartFailure('start_failed');
    }
  } catch (error) {
    failure = error instanceof StartFailure ? error.code : 'start_failed';
    logger.warn(
      { action: 'impersonation.start', sessionId: session.id },
      'Start failed; compensating owner session',
    );
  }
  if (failure) {
    if (swapAttempted && !(await restoreAdmin(client, payload))) {
      logger.error(
        { action: 'impersonation.recovery', sessionId: session.id, userId: payload.adminUserId },
        'Admin restoration failed; authenticated owner recovery required',
      );
      await localSignOut(client, store);
      return { error: 'session_expired' };
    }
    const closed = await closeOwnerRow(client, session.id);
    if (closed) clearReturnCookies(store);
    return { error: closed ? failure : 'start_failed' };
  }
  redirect({ href: '/dashboard', locale });
  return {};
});

/** Restores and verifies the bound admin before owner-authorized closure; never treats RPC failure as success. */
export const endImpersonation = withServerAction(
  async function endImpersonation(): Promise<ActionResult> {
    const store = await cookies();
    const client = await createClient();
    const cookie = store.get(RETURN_COOKIE)?.value;
    const payload = cookie ? verifyImpersonationCookie(cookie) : null;
    if (!payload || store.get(SESSION_COOKIE)?.value !== payload.sessionId) {
      await localSignOut(client, store);
      return { error: 'session_expired' };
    }
    let currentUserId: string | undefined;
    try {
      const { data, error } = await client.auth.getUser();
      if (!error) currentUserId = data.user?.id;
    } catch {
      /* Fail closed below. */
    }
    if (
      (currentUserId !== payload.targetUserId && currentUserId !== payload.adminUserId) ||
      !(await restoreAdmin(client, payload))
    ) {
      await localSignOut(client, store);
      return { error: 'session_expired' };
    }
    if (!(await closeOwnerRow(client, payload.sessionId))) return { error: 'end_failed' };
    clearReturnCookies(store);
    const locale = await getLocale();
    redirect({ href: '/dashboard/admin/accounts', locale });
    return {};
  },
);
