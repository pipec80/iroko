import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';

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

/**
 * Resolves the local Supabase origin from the actually configured URL instead
 * of NODE_ENV. The E2E suite runs `next build && next start` (production
 * mode) against local Supabase, so gating on isDev alone blocked every client
 * call to it (notifications, announcements, realtime websocket) under CSP.
 * Safe in real production: NEXT_PUBLIC_SUPABASE_URL there is always the Cloud
 * project's https://*.supabase.co URL, never a loopback host.
 */
function localSupabaseOrigin(supabaseUrl: string): { http: string; ws: string } | null {
  try {
    const { hostname, origin } = new URL(supabaseUrl);
    if (hostname !== '127.0.0.1' && hostname !== 'localhost') return null;
    return { http: origin, ws: origin.replace(/^http/, 'ws') };
  } catch {
    return null;
  }
}

export function buildCspHeader(isDev: boolean, isPreview: boolean, supabaseUrl: string): string {
  const local = localSupabaseOrigin(supabaseUrl);
  const localOrigin = local?.http ?? '';
  const localWsOrigin = local?.ws ?? '';
  // AUD-018: Vercel injects a feedback widget script only on preview deployments
  // (VERCEL_ENV=preview) — never in production. Without this, every preview page
  // load generated a blocked-script CSP report, burning Sentry's error quota.
  const vercelLiveOrigin = isPreview ? 'https://vercel.live' : '';

  const directives: string[] = [
    // PostHog (posthog-js) is served through the /ingest reverse proxy
    // (rewrites in next.config.ts), so its script bundle, static assets and
    // event ingestion are all same-origin ('self'). No *.posthog.com entry
    // is needed anywhere in this policy — see docs/modules/analytics.md.
    "default-src 'self'",
    // NOTE: 'unsafe-inline' (no per-request nonce) — decisión heredada de cuando
    // cacheComponents estaba activo (nonces forzaban dynamic rendering en todas
    // las páginas estáticas). cacheComponents está deshabilitado ahora (ver
    // next.config.ts, incompatibilidad con next-intl), así que adoptar nonces ya
    // no chocaría con generación estática — queda como mejora de seguridad futura,
    // fuera de scope de este fix. Mientras tanto, los directivas de abajo
    // (object-src 'none', base-uri, frame-ancestors) más React's auto-escaping y
    // cero dangerouslySetInnerHTML mantienen la superficie de XSS residual mínima.
    // See SECURITY.md.
    isDev ?
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"
    : [
        "script-src 'self' 'unsafe-inline'",
        'https://va.vercel-scripts.com',
        'https://vitals.vercel-insights.com',
        'https://challenges.cloudflare.com',
        vercelLiveOrigin,
      ]
        .filter(Boolean)
        .join(' '),
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
      vercelLiveOrigin,
      localOrigin,
      localWsOrigin,
    ]
      .filter(Boolean)
      .join(' '),
    ["frame-src 'self'", 'https://challenges.cloudflare.com', vercelLiveOrigin]
      .filter(Boolean)
      .join(' '),
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
  const isPreview = env.VERCEL_ENV === 'preview';
  const cspHeader = buildCspHeader(isDev, isPreview, env.NEXT_PUBLIC_SUPABASE_URL);

  const supabaseResponse = await updateSession(request);
  if (supabaseResponse.status >= 300 && supabaseResponse.status < 400) {
    applySecurityHeaders(supabaseResponse, cspHeader);
    return supabaseResponse;
  }

  const intlResponse = intlMiddleware(request);

  // updateSession solo setea Cache-Control cuando hay sesión que proteger
  // (claims != null o se refrescó la cookie) — dejar páginas anónimas
  // cacheables normalmente. La respuesta final es intlResponse, no
  // supabaseResponse, así que esa decisión debe propagarse explícitamente
  // igual que las cookies más abajo, o se pierde en silencio.
  const cacheControl = supabaseResponse.headers.get('Cache-Control');
  if (cacheControl) intlResponse.headers.set('Cache-Control', cacheControl);

  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    applySecurityHeaders(intlResponse, cspHeader);
    return intlResponse;
  }

  // Base the final response on intlResponse, not a fresh NextResponse.next().
  // next-intl's middleware sets an internal request header (x-next-intl-locale)
  // on its own NextResponse.next({request: {headers}}) so getRequestConfig can
  // read the resolved locale downstream via headers(). A bare NextResponse.next()
  // silently drops that header, making every non-default locale fall back to
  // defaultLocale ('es') for the actual page render (confirmed bug, F3-C5).
  for (const cookie of supabaseResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  }

  applySecurityHeaders(intlResponse, cspHeader);
  return intlResponse;
}

export const config = {
  matcher: [
    {
      // sentry-tunnel excluido: es el tunnelRoute de withSentryConfig (ver
      // next.config.ts) — si next-intl lo intercepta, redirige el POST del SDK
      // a /es/sentry-tunnel donde el rewrite del túnel no existe (404) y los
      // eventos del navegador se pierden. ingest excluido por el mismo motivo:
      // es el reverse proxy first-party de PostHog (rewrites en next.config.ts)
      // — un intercept de next-intl redirigiría el POST de captura a /es/ingest,
      // donde el rewrite no existe (404) y los eventos se pierden.
      source:
        '/((?!api|sentry-tunnel|ingest|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
