import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { appConfig } from '@/config/app.config';
import { env } from '@/env';
import { routing } from '@/i18n/routing';
import type { Database } from '@/types/database';

/** Subset of the Supabase JWT claims the edge guard reads. */
type JwtClaims = {
  sub?: string;
  aal?: string;
  app_metadata?: {
    mfa_enrolled?: boolean;
    is_platform_admin?: boolean;
    impersonated_by?: string;
    impersonation_expires_at?: string;
    onboarding_completed?: boolean;
    organization_entry_state?: 'legacy' | 'pending' | 'ready';
  } & Record<string, unknown>;
};

const PUBLIC_PATH_PREFIXES = ['/login', '/signup', '/forgot-password', '/auth'];

const PROTECTED_PATH_PREFIXES = ['/dashboard', '/reset-password'];

const AUTH_ONLY_PATHS = ['/login', '/signup', '/forgot-password'];

function isAuthOnly(pathWithoutLocale: string): boolean {
  return AUTH_ONLY_PATHS.some((prefix) => pathWithoutLocale.startsWith(prefix));
}

function isRoot(pathWithoutLocale: string): boolean {
  return pathWithoutLocale === '/' || pathWithoutLocale === '';
}

function extractLocaleAndPath(pathname: string): {
  locale: string;
  pathWithoutLocale: string;
} {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  const localeMatch = routing.locales.find((l) => l === first);

  if (localeMatch) {
    return {
      locale: localeMatch,
      pathWithoutLocale: '/' + segments.slice(1).join('/'),
    };
  }

  return {
    locale: routing.defaultLocale,
    pathWithoutLocale: pathname,
  };
}

function isProtected(pathWithoutLocale: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathWithoutLocale.startsWith(prefix));
}

function isPublicAuth(pathWithoutLocale: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathWithoutLocale.startsWith(prefix));
}

function isStaleSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('name' in error && error.name === 'AuthSessionMissingError') return true;
  return (
    'code' in error &&
    (error.code === 'refresh_token_not_found' ||
      error.code === 'refresh_token_already_used' ||
      error.code === 'session_not_found' ||
      error.code === 'user_not_found')
  );
}

/**
 * Refreshes Supabase auth tokens and guards protected routes.
 * Must run before any other edge logic in src/proxy.ts.
 *
 * @returns The response with refreshed cookies, or a redirect if auth is required.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });
  let sessionCookiesRefreshed = false;

  // Redirects are separate responses: the SDK's writes must reach the browser.
  function redirectWithSession(url: URL): NextResponse {
    const response = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie);
    for (const header of ['cache-control', 'expires', 'pragma']) {
      const value = supabaseResponse.headers.get(header);
      if (value !== null) response.headers.set(header, value);
    }
    return response;
  }

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          sessionCookiesRefreshed = true;
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet)
            supabaseResponse.cookies.set(name, value, options);
          if (headers) {
            for (const [key, value] of Object.entries(headers))
              supabaseResponse.headers.set(key, value);
          }
        },
      },
    },
  );

  // IMPORTANT: do not add logic between createServerClient and getClaims().
  // getClaims() validates the JWT locally without hitting the auth server —
  // cheaper than getUser() and safe for proxy use.
  // When the JWT is expired, the SDK internally tries to refresh it. If the
  // refresh token is stale (e.g. user deleted, session invalidated), the SDK
  // throws AuthApiError instead of returning { error }. We catch it here and
  // treat it as unauthenticated so the redirect logic below can run normally.
  let claims: JwtClaims | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    claims = (data?.claims as JwtClaims | undefined) ?? null;
  } catch (err) {
    if (!isStaleSessionError(err)) throw err;
  }

  const { locale, pathWithoutLocale } = extractLocaleAndPath(request.nextUrl.pathname);
  const protectedRoute = isProtected(pathWithoutLocale) && !isPublicAuth(pathWithoutLocale);

  // A still-valid JWT can outlive its account or session after a database
  // reset. Check Auth on full dashboard navigations before displaying it.
  if (
    claims &&
    protectedRoute &&
    request.method === 'GET' &&
    request.headers.get('sec-fetch-mode') === 'navigate'
  ) {
    const { error } = await supabase.auth.getUser();
    if (isStaleSessionError(error)) {
      if (error?.code === 'user_not_found') await supabase.auth.signOut({ scope: 'local' });
      claims = null;
    } else if (error) {
      throw error;
    }
  }

  if (!claims && protectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = '';
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return redirectWithSession(url);
  }

  // MFA (AAL2) enforcement. A user with a verified factor who signed in with a
  // password only holds an aal1 session — GoTrue considers it valid, but the
  // MFA challenge is still pending. Without this guard, navigating straight to
  // the app would bypass MFA. `mfa_enrolled` is injected into the JWT by
  // custom_access_token_hook, so this stays a pure claims check (no I/O).
  //
  // Scope: the app itself (/dashboard). /reset-password is deliberately excluded
  // — password recovery runs on an aal1 recovery session, and an MFA user who
  // forgot their password cannot complete the TOTP challenge beforehand.
  const mfaPending =
    claims != null && claims.app_metadata?.mfa_enrolled === true && claims.aal !== 'aal2';

  if (mfaPending && pathWithoutLocale.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = '';
    url.searchParams.set('mfa', 'required');
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return redirectWithSession(url);
  }

  // Onboarding gate (F3-C4). The claim is minted by custom_access_token_hook —
  // strict === false so tokens issued before this claim existed (undefined)
  // are never trapped until their next natural refresh.
  const onboardingPending =
    claims != null &&
    appConfig.features.onboarding &&
    (claims.app_metadata?.organization_entry_state ?? 'legacy') === 'legacy' &&
    claims.app_metadata?.onboarding_completed === false;

  if (
    onboardingPending &&
    pathWithoutLocale.startsWith('/dashboard') &&
    !pathWithoutLocale.startsWith('/dashboard/onboarding')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard/onboarding`;
    return redirectWithSession(url);
  }

  // Super-admin back-office gate (F3-C1). Runs after the generic MFA gate, so
  // by this point an admin who hasn't cleared aal2 yet has already been sent
  // to /login?mfa=required — this block only has to decide between "not an
  // admin at all" (404, never reveal the route) and "admin but never
  // enrolled MFA" (this route REQUIRES enrollment, unlike the rest of the
  // app where the generic gate only applies to users who already enrolled).
  if (
    claims != null &&
    claims.app_metadata?.is_platform_admin === true &&
    pathWithoutLocale.startsWith('/dashboard/admin')
  ) {
    // A rewrite's response status is always 200 in Next.js regardless of
    // what the destination renders — faking a 404 here would leak a wrong
    // HTTP status to any client checking it. So non-admins are NOT
    // intercepted at the edge for this route: the request passes through
    // unchanged (same URL, no redirect) and AdminLayout's own `notFound()`
    // call denies access with not-found content after re-deriving the claim.
    // If the shell already streamed, HTTP may remain 200; it is not evidence
    // of authorized content. This block handles the admin-but-unenrolled case.
    if (claims.app_metadata?.mfa_enrolled !== true) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/dashboard/account`;
      url.searchParams.set('tab', 'security');
      url.searchParams.set('mfa', 'required_admin');
      return redirectWithSession(url);
    }
  }

  // Impersonation expiry cap (F3-C2). Applies to any /dashboard/* route (not
  // just /dashboard/admin) because the impersonated user navigates the app
  // normally. The edge can't call an RPC directly (no full Supabase client
  // here beyond what's already wired for auth), so it redirects to a
  // dedicated Node-runtime route handler that closes the session server-side
  // and sends the user back to where they were.
  const impersonationExpiresAt = claims?.app_metadata?.impersonation_expires_at;
  if (
    claims != null &&
    impersonationExpiresAt != null &&
    new Date(impersonationExpiresAt).getTime() <= Date.now() &&
    pathWithoutLocale.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/api/impersonation/expire';
    url.search = '';
    url.searchParams.set('returnTo', request.nextUrl.pathname);
    return redirectWithSession(url);
  }

  if (
    request.method === 'GET' &&
    !request.headers.has('next-router-prefetch') &&
    request.headers.get('purpose') !== 'prefetch' &&
    !claims?.app_metadata?.impersonated_by &&
    claims?.app_metadata?.organization_entry_state === 'pending' &&
    (pathWithoutLocale === '/dashboard' || pathWithoutLocale.startsWith('/dashboard/'))
  ) {
    const { error } = await supabase.rpc('ensure_initial_organization');
    const refreshError = error ?? (await supabase.auth.refreshSession()).error;
    const { data: refreshed } = refreshError ? { data: null } : await supabase.auth.getClaims();
    if (refreshed?.claims.app_metadata?.organization_entry_state !== 'ready') {
      const unavailable = new NextResponse(
        'Organization setup is temporarily unavailable. Reload to retry.',
        {
          status: 503,
          headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '5' },
        },
      );
      for (const cookie of supabaseResponse.cookies.getAll()) unavailable.cookies.set(cookie);
      return unavailable;
    }
    // The SDK already forwarded the refreshed cookies to this request.
    // Server Action fetches do not apply cookies while following a redirect.
  }

  // Authenticated users are bounced off the marketing root and auth-only pages —
  // unless they still owe an MFA challenge, in which case they must stay on
  // /login to complete it (otherwise the two redirects would loop).
  //
  // F3-C4: redirect() called from a Server Action (e.g. signInAction) resolves
  // client-side and does not re-run the middleware for the resulting /dashboard
  // navigation — so the onboarding gate above (which only matches paths already
  // starting with /dashboard) never sees it. This is the request that actually
  // runs the middleware for a fresh login, so it must pick the right destination
  // itself instead of relying on a second pass that never happens.
  if (claims && !mfaPending && (isRoot(pathWithoutLocale) || isAuthOnly(pathWithoutLocale))) {
    const url = request.nextUrl.clone();
    url.pathname = onboardingPending ? `/${locale}/dashboard/onboarding` : `/${locale}/dashboard`;
    url.searchParams.delete('next');
    return redirectWithSession(url);
  }

  // Prevent CDN caching only when there's actual session state to protect —
  // an authenticated response (claims != null) or a cookie refresh just
  // happened. Anonymous marketing pages with nothing to refresh regain
  // normal framework/CDN caching. See
  // https://supabase.com/docs/guides/auth/server-side/advanced-guide#can-i-use-server-side-rendering-with-a-cdn-or-cache
  if (claims != null || sessionCookiesRefreshed) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store');
  }

  return supabaseResponse;
}
