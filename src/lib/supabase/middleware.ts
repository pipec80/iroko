import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/env';
import { routing } from '@/i18n/routing';
import type { Database } from '@/types/database';

/** Subset of the Supabase JWT claims the edge guard reads. */
type JwtClaims = {
  sub?: string;
  aal?: string;
  app_metadata?: { mfa_enrolled?: boolean; is_platform_admin?: boolean } & Record<string, unknown>;
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

/**
 * Refreshes Supabase auth tokens and guards protected routes.
 * Must run before any other edge logic in src/proxy.ts.
 *
 * @returns The response with refreshed cookies, or a redirect if auth is required.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
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
    const isStaleToken =
      err != null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'refresh_token_not_found';
    if (!isStaleToken) throw err;
  }

  const { locale, pathWithoutLocale } = extractLocaleAndPath(request.nextUrl.pathname);

  if (!claims && isProtected(pathWithoutLocale) && !isPublicAuth(pathWithoutLocale)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
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
    url.searchParams.set('mfa', 'required');
    return NextResponse.redirect(url);
  }

  // Super-admin back-office gate (F3-C1). Runs after the generic MFA gate, so
  // by this point an admin who hasn't cleared aal2 yet has already been sent
  // to /login?mfa=required — this block only has to decide between "not an
  // admin at all" (404, never reveal the route) and "admin but never
  // enrolled MFA" (this route REQUIRES enrollment, unlike the rest of the
  // app where the generic gate only applies to users who already enrolled).
  if (claims != null && pathWithoutLocale.startsWith('/dashboard/admin')) {
    const isPlatformAdmin = claims.app_metadata?.is_platform_admin === true;

    if (!isPlatformAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/not-found`;
      return NextResponse.rewrite(url, { status: 404 });
    }

    if (claims.app_metadata?.mfa_enrolled !== true) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/dashboard/account/security`;
      url.searchParams.set('mfa', 'required_admin');
      return NextResponse.redirect(url);
    }
  }

  // Authenticated users are bounced off the marketing root and auth-only pages —
  // unless they still owe an MFA challenge, in which case they must stay on
  // /login to complete it (otherwise the two redirects would loop).
  if (claims && !mfaPending && (isRoot(pathWithoutLocale) || isAuthOnly(pathWithoutLocale))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.searchParams.delete('next');
    return NextResponse.redirect(url);
  }

  // Prevent CDN caching of responses with refreshed session cookies.
  // See https://supabase.com/docs/guides/auth/server-side/advanced-guide#can-i-use-server-side-rendering-with-a-cdn-or-cache
  supabaseResponse.headers.set('Cache-Control', 'private, no-store');

  return supabaseResponse;
}
