import { NextResponse, type NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

/**
 * Closes an expired impersonation session server-side. Reached only via the
 * edge redirect in middleware.ts when `impersonation_expires_at` has passed.
 * Runs on the Node runtime (not edge) because it needs a full Supabase
 * client to call `end_impersonation_session`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const impersonatedBy = data?.claims?.app_metadata?.impersonated_by as string | undefined;

  if (impersonatedBy) {
    // We don't track the session id client-side — look it up by target
    // (the current user, since we're still in their session at this point)
    // via a lightweight query the RLS-deny-all table can't answer directly,
    // so this goes through end_impersonation_session's own lookup instead:
    // the RPC accepts a session id, but we only know the admin/target pair
    // here. Simplest correct fix: query is unnecessary — end_impersonation_session
    // requires p_session_id, so store it in a short-lived cookie set at
    // startImpersonation() instead of re-deriving it here.
    const sessionId = request.cookies.get('impersonation_session_id')?.value;
    if (sessionId) {
      const { error } = await supabase.rpc('end_impersonation_session', {
        p_session_id: sessionId,
        p_reason: 'expired',
      });
      if (error) {
        logger.warn(
          { action: 'impersonation.expire', code: error.code, message: error.message },
          'end_impersonation_session failed during auto-expiry',
        );
      }
    }
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/dashboard';
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', returnTo);
  url.searchParams.set('impersonation', 'expired');

  const response = NextResponse.redirect(url);
  response.cookies.delete('impersonation_session_id');
  response.cookies.delete('admin_return_session');
  return response;
}
