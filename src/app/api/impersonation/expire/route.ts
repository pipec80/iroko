import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { env } from '@/env';
import { routing } from '@/i18n/routing';
import { getSupabaseAuthCookieNames } from '@/lib/impersonation-cookie';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { normalizeNavigationLink } from '@/lib/validation/navigation-link';

const uuid = z.string().uuid();
function returnDestination(value: string | null): { locale: string; next: string } {
  const normalized = normalizeNavigationLink(value);
  const href = normalized.valid && normalized.href?.startsWith('/') ? normalized.href : null;
  const path = href?.split(/[?#]/)[0] ?? '';
  const first = path.split('/')[1] ?? '';
  const locale =
    (routing.locales as readonly string[]).includes(first) ? first : routing.defaultLocale;
  if (path === '/dashboard' || path.startsWith('/dashboard/'))
    return { locale, next: `/${locale}${href}` };
  if (href && (path === `/${locale}/dashboard` || path.startsWith(`/${locale}/dashboard/`)))
    return { locale, next: href };
  return { locale, next: `/${locale}/dashboard` };
}

/** Expires only through SQL authorization, then removes local identity even if backend cleanup fails. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  let client: Awaited<ReturnType<typeof createClient>> | undefined;
  // SameSite=Lax permits cross-site top-level GETs. Only impersonation
  // evidence may turn this endpoint into a local identity cleanup operation.
  let impersonationEvidence =
    request.cookies.has('admin_return_session') || request.cookies.has('impersonation_session_id');
  let normalIdentityVerified = false;
  try {
    client = await createClient();
    const { data, error } = await client.auth.getClaims();
    const claims = data?.claims;
    const signedAdmin = claims?.app_metadata?.impersonated_by;
    const signedImpersonation = !error && typeof signedAdmin === 'string' && signedAdmin.length > 0;
    impersonationEvidence ||= signedImpersonation;
    normalIdentityVerified = !error && uuid.safeParse(claims?.sub).success && !signedImpersonation;
    const sessionId = request.cookies.get('impersonation_session_id')?.value;
    const parsedSession = uuid.safeParse(sessionId);
    if (
      !error &&
      uuid.safeParse(claims?.sub).success &&
      uuid.safeParse(claims?.app_metadata?.impersonated_by).success &&
      parsedSession.success
    ) {
      const { error: closeError } = await client.rpc('end_impersonation_session', {
        p_session_id: parsedSession.data,
        p_reason: 'expired',
      });
      if (closeError)
        logger.warn(
          { action: 'impersonation.expire', code: closeError.code },
          'Expired row closure requires owner recovery',
        );
    }
  } catch {
    logger.warn(
      { action: 'impersonation.expire' },
      impersonationEvidence ?
        'Expiry backend unavailable; clearing local identity'
      : 'Expiry backend unavailable without impersonation evidence',
    );
  } finally {
    if (client && impersonationEvidence) {
      try {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error)
          logger.warn(
            { action: 'impersonation.logout', code: error.code },
            'Local sign-out failed',
          );
      } catch {
        logger.warn({ action: 'impersonation.logout' }, 'Local sign-out unavailable');
      }
    }
  }
  const target = returnDestination(request.nextUrl.searchParams.get('returnTo'));
  if (!impersonationEvidence && normalIdentityVerified) {
    return NextResponse.redirect(new URL(target.next, request.url));
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${target.locale}/login`;
  url.search = '';
  url.searchParams.set('next', target.next);
  if (impersonationEvidence) url.searchParams.set('impersonation', 'expired');
  const response = NextResponse.redirect(url);
  if (!impersonationEvidence) return response;
  response.cookies.delete('impersonation_session_id');
  response.cookies.delete('admin_return_session');
  // Token refresh can add chunks absent from the incoming request. Inspect the
  // current store after logout so failed sign-out cannot leave that identity.
  const currentCookies = (await cookies()).getAll();
  const names = [...request.cookies.getAll(), ...currentCookies].map((cookie) => cookie.name);
  for (const name of getSupabaseAuthCookieNames(names, env.NEXT_PUBLIC_SUPABASE_URL))
    response.cookies.delete(name);
  return response;
}
