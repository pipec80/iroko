import 'server-only';

import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Completes a caller-bound recovery claim; retrying only targets its original factors. */
export async function recoverMfa(code: string): Promise<'recovered' | 'invalid' | 'retry'> {
  try {
    return await recoverAuthenticatedMfa(code);
  } catch {
    // Transport errors can contain credentials: log only the operation, not the error.
    logger.warn({ action: 'auth.recovery.transport' }, 'MFA recovery transport failed');
    return 'retry';
  }
}

async function recoverAuthenticatedMfa(code: string): Promise<'recovered' | 'invalid' | 'retry'> {
  const client = await createClient();
  // Session data only supplies the token; getUser validates that exact token.
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();
  if (sessionError) return 'retry';
  if (!session) return 'invalid';
  const {
    data: { user },
    error: identityError,
  } = await client.auth.getUser(session.access_token);
  if (identityError) {
    return (
        identityError.status === 401 ||
          identityError.status === 403 ||
          identityError.name === 'AuthSessionMissingError'
      ) ?
        'invalid'
      : 'retry';
  }
  if (!user) return 'invalid';

  const { data, error, status } = await client.rpc('begin_mfa_recovery', { p_code: code });
  if (error) return status === 401 || status === 403 ? 'invalid' : 'retry';
  const claim = data?.[0];
  if (!claim?.factor_ids.length) return 'invalid';

  const admin = createAdminClient();
  // Admin API preserves 401/403 errors; the user SDK's logout treats them as success.
  // Require a confirmed global logout before removing MFA from the account.
  const { error: revokeError } = await admin.auth.admin.signOut(session.access_token, 'global');
  if (revokeError) return 'retry';

  for (const id of claim.factor_ids) {
    const { error: resetError } = await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id });
    if (resetError && resetError.code !== 'mfa_factor_not_found') {
      logger.warn(
        { userId: user.id, action: 'auth.recovery.reset', code: resetError.code },
        'MFA recovery requires retry',
      );
      return 'retry';
    }
  }
  const { data: completed, error: completionError } = await admin.rpc('complete_mfa_recovery', {
    p_user_id: user.id,
    p_recovery_id: claim.recovery_id,
  });
  if (completionError || !completed) return 'retry';

  // Reset has completed. The installed SDK clears local storage before its logout request.
  try {
    const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
    if (signOutError) {
      logger.warn(
        { userId: user.id, action: 'auth.recovery.signout', code: signOutError.code },
        'MFA reset completed; reauthentication required',
      );
    }
  } catch {
    logger.warn(
      { userId: user.id, action: 'auth.recovery.signout' },
      'MFA reset completed; reauthentication required',
    );
  }
  return 'recovered';
}
