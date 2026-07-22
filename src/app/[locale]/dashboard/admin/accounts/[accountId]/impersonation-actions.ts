'use server';

import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { redirect } from '@/i18n/routing';
import { signImpersonationCookie, verifyImpersonationCookie } from '@/lib/impersonation-cookie';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { error?: string };

const RETURN_SESSION_COOKIE = 'admin_return_session';
const SESSION_ID_COOKIE = 'impersonation_session_id';
const RETURN_SESSION_MAX_AGE_SECONDS = 35 * 60; // 35 min — a bit past the 30-min impersonation cap

/**
 * Starts a real (not spoofed) session as `targetUserId`. Saves the admin's
 * own session in a signed cookie first so `endImpersonation` can restore it.
 */
export const startImpersonation = withServerAction(async function startImpersonation(
  targetUserId: string,
  reason: string,
): Promise<ActionResult> {
  if (!reason || reason.trim().length < 3) {
    return { error: 'validation_error' };
  }

  const supabase = await createClient();

  const { data: session, error: beginError } = await supabase.rpc('begin_impersonation_session', {
    p_target_user_id: targetUserId,
    p_reason: reason,
  });

  if (beginError || !session) {
    logger.warn(
      { action: 'impersonation.start', message: beginError?.message },
      'begin_impersonation_session failed',
    );
    return { error: beginError?.message ?? 'start_failed' };
  }

  const { data: currentSessionData } = await supabase.auth.getSession();
  const adminSession = currentSessionData.session;
  if (!adminSession) {
    return { error: 'not_authenticated' };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: RETURN_SESSION_COOKIE,
    value: signImpersonationCookie({
      accessToken: adminSession.access_token,
      refreshToken: adminSession.refresh_token,
      adminUserId: adminSession.user.id,
    }),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: RETURN_SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
  cookieStore.set({
    name: SESSION_ID_COOKIE,
    value: session.id,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: RETURN_SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  const adminClient = createAdminClient();
  const { data: targetUser } = await adminClient.auth.admin.getUserById(targetUserId);
  if (!targetUser?.user?.email) {
    return { error: 'target_not_found' };
  }

  const { data: link, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: targetUser.user.email,
  });

  if (linkError || !link) {
    logger.warn(
      { action: 'impersonation.start', message: linkError?.message },
      'generateLink failed',
    );
    return { error: 'start_failed' };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });

  if (verifyError) {
    logger.warn(
      { action: 'impersonation.start', message: verifyError.message },
      'verifyOtp failed while swapping to target session',
    );
    return { error: 'start_failed' };
  }

  const locale = await getLocale();
  redirect({ href: '/dashboard', locale });
  return {};
});

/**
 * Restores the admin's own session (saved by `startImpersonation`) and closes
 * the impersonation session. Order matters: restore FIRST, close the RPC
 * SECOND — so `end_impersonation_session` runs with `auth.uid()` = the admin,
 * matching the RPC's own authorization check.
 */
export const endImpersonation = withServerAction(
  async function endImpersonation(): Promise<ActionResult> {
    const cookieStore = await cookies();
    const returnCookie = cookieStore.get(RETURN_SESSION_COOKIE)?.value;
    const sessionId = cookieStore.get(SESSION_ID_COOKIE)?.value;

    const supabase = await createClient();

    if (!returnCookie) {
      await supabase.auth.signOut();
      return { error: 'session_expired' };
    }

    const payload = verifyImpersonationCookie(returnCookie);
    if (!payload) {
      await supabase.auth.signOut();
      return { error: 'session_expired' };
    }

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    });

    if (setSessionError) {
      await supabase.auth.signOut();
      return { error: 'session_expired' };
    }

    if (sessionId) {
      const { error: endError } = await supabase.rpc('end_impersonation_session', {
        p_session_id: sessionId,
        p_reason: 'manual',
      });
      if (endError) {
        logger.warn(
          { action: 'impersonation.end', message: endError.message },
          'end_impersonation_session failed',
        );
      }
    }

    cookieStore.delete(RETURN_SESSION_COOKIE);
    cookieStore.delete(SESSION_ID_COOKIE);

    const locale = await getLocale();
    redirect({ href: '/dashboard/admin/accounts', locale });
    return {};
  },
);
