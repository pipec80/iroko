import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/env';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

const SENTRY_INGEST_ORIGIN = 'https://o4511537461067776.ingest.us.sentry.io';
const SENTRY_REPORT_URI = `${SENTRY_INGEST_ORIGIN}/api/4511537462771713/security/?sentry_key=f88007bc87fbd834a3f62bfc0d256a7e`;

// Image origins the template itself needs in production: our own Supabase
// Storage CDN, Google OAuth avatars, flag icons, and Vercel/Google static assets.
const PRODUCTION_IMG_HOSTS = [
  'https://flagcdn.com',
  'https://cdn.jsdelivr.net',
  'https://lh3.googleusercontent.com',
  'https://upload.wikimedia.org',
  'https://www.gstatic.com',
  'https://*.supabase.co',
];

// DEMO-ONLY placeholder avatar/photo providers used by the marketing/demo pages.
// A buyer shipping their own product should DELETE this list — nothing in the
// core app depends on it.
const DEMO_IMG_HOSTS = [
  'https://images.unsplash.com',
  'https://api.dicebear.com',
  'https://i.pravatar.cc',
];

function buildCspHeader(isDev: boolean): string {
  const localOrigin = isDev ? 'http://127.0.0.1:54321' : '';
  const localWsOrigin = isDev ? 'ws://127.0.0.1:54321' : '';

  const directives: string[] = [
    "default-src 'self'",
    // NOTE: 'unsafe-inline' (no per-request nonce). Per-request nonces force
    // every page into dynamic rendering, which is incompatible with this app's
    // statically-generated marketing pages (cacheComponents). The high-value
    // directives below (object-src 'none', base-uri, frame-ancestors) plus
    // React's auto-escaping and zero dangerouslySetInnerHTML keep the residual
    // XSS surface minimal. See SECURITY.md.
    isDev ?
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"
    : "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vitals.vercel-insights.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    ["img-src 'self' blob: data:", ...PRODUCTION_IMG_HOSTS, ...DEMO_IMG_HOSTS, localOrigin]
      .filter(Boolean)
      .join(' '),
    "font-src 'self' https://fonts.gstatic.com",
    [
      "connect-src 'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://challenges.cloudflare.com',
      'https://vitals.vercel-insights.com',
      'https://va.vercel-scripts.com',
      SENTRY_INGEST_ORIGIN,
      localOrigin,
      localWsOrigin,
    ]
      .filter(Boolean)
      .join(' '),
    "frame-src 'self' https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
    `report-uri ${SENTRY_REPORT_URI}`,
    'report-to csp-endpoint',
  ];

  return directives.join('; ');
}

function applySecurityHeaders(response: { headers: Headers }, cspHeader: string): void {
  const reportToValue = JSON.stringify({
    group: 'csp-endpoint',
    max_age: 10886400,
    endpoints: [{ url: SENTRY_REPORT_URI }],
    include_subdomains: true,
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Report-To', reportToValue);
  response.headers.set('Reporting-Endpoints', `csp-endpoint="${SENTRY_REPORT_URI}"`);
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
}

export async function proxy(request: NextRequest) {
  const isDev = env.NODE_ENV === 'development';
  const cspHeader = buildCspHeader(isDev);

  const supabaseResponse = await updateSession(request);
  if (supabaseResponse.status >= 300 && supabaseResponse.status < 400) {
    applySecurityHeaders(supabaseResponse, cspHeader);
    return supabaseResponse;
  }

  const intlResponse = intlMiddleware(request);

  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    applySecurityHeaders(intlResponse, cspHeader);
    return intlResponse;
  }

  const response = NextResponse.next();

  for (const cookie of intlResponse.cookies.getAll()) {
    response.cookies.set(cookie.name, cookie.value, cookie);
  }
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie.name, cookie.value, cookie);
  }

  applySecurityHeaders(response, cspHeader);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
