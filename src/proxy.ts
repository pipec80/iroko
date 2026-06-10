import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1. Refresh Supabase session cookies and guard protected routes.
  // If the user is not authenticated and hits a protected route, this returns a redirect.
  const supabaseResponse = await updateSession(request);

  // If updateSession decided to redirect (e.g. /dashboard -> /login), bail out now.
  if (supabaseResponse.status >= 300 && supabaseResponse.status < 400) {
    return supabaseResponse;
  }

  // 2. Generate CSP nonce and header.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const sentryReportUri =
    'https://o4511537461067776.ingest.us.sentry.io/api/4511537462771713/security/?sentry_key=f88007bc87fbd834a3f62bfc0d256a7e';

  const cspHeader = `
    default-src 'self';
    script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval' https:" : `'nonce-${nonce}' 'strict-dynamic'`};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://flagcdn.com https://cdn.jsdelivr.net https://images.unsplash.com https://api.dicebear.com https://lh3.googleusercontent.com https://upload.wikimedia.org https://www.gstatic.com https://i.pravatar.cc https://*.supabase.co ${isDev ? 'http://127.0.0.1:54321' : ''};
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' http://127.0.0.1:54321 https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://vitals.vercel-insights.com https://va.vercel-scripts.com;
    frame-src 'self' https://challenges.cloudflare.com;
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    report-uri ${sentryReportUri};
    report-to csp-endpoint;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 3. Attach nonce + CSP to the request headers so Server Components can read them.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const requestWithNonce = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
    body: request.body,
    referrer: request.referrer,
  });

  // 4. Run next-intl middleware.
  const response = intlMiddleware(requestWithNonce);

  // 5. Carry over Supabase auth cookies onto the intl response.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie.name, cookie.value, cookie);
  }

  // 6. Apply CSP + security headers.
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);
  response.headers.set('x-middleware-request-x-nonce', nonce);
  response.headers.set('x-middleware-request-content-security-policy', cspHeader);
  response.headers.set('Cache-Control', 'private, no-store');

  // CSP violation reporting endpoints (Report-To for modern browsers, report-uri as fallback)
  const reportToValue = JSON.stringify({
    group: 'csp-endpoint',
    max_age: 10886400,
    endpoints: [{ url: sentryReportUri }],
    include_subdomains: true,
  });
  response.headers.set('Report-To', reportToValue);
  response.headers.set('Reporting-Endpoints', `csp-endpoint="${sentryReportUri}"`);

  // OWASP recommended security headers
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)',
    '/',
    '/(es|en)/:path*',
  ],
};
