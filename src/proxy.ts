import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/env';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

export type CspOptions = {
  nonce: string;
  isDev: boolean;
  isPreview: boolean;
  supabaseUrl: string;
  sentryDsn?: string;
  localValidation?: boolean;
};

function sentryDestination(dsn: string | undefined): { origin: string; report?: string } | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const segments = url.pathname.split('/').filter(Boolean);
    const project = segments.pop();
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
      !url.username ||
      url.password ||
      !project ||
      !/^\d+$/.test(project)
    )
      return null;
    if (loopback) return { origin: url.origin };
    const prefix = segments.length ? `/${segments.join('/')}` : '';
    return {
      origin: url.origin,
      report: `${url.origin}${prefix}/api/${project}/security/?sentry_key=${encodeURIComponent(url.username)}`,
    };
  } catch {
    return null;
  }
}

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

export function buildCspHeader(options: CspOptions): string {
  const { nonce, isDev, isPreview, supabaseUrl } = options;
  const sentry = sentryDestination(options.sentryDsn);
  const report = !options.localValidation ? sentry?.report : undefined;
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
    // Request-time documents and explicit consumers share this nonce (ADR 0004).
    isDev ?
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https:`
    : [
        `script-src 'self' 'nonce-${nonce}'`,
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
      sentry?.origin ?? '',
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
    ...(report ? [`report-uri ${report}`, 'report-to csp-endpoint'] : []),
  ];

  return directives.join('; ');
}

function applySecurityHeaders(
  response: { headers: Headers },
  cspHeader: string,
  report?: string,
): void {
  response.headers.set('Content-Security-Policy', cspHeader);
  if (report) {
    const reportToValue = JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [{ url: report }],
      include_subdomains: true,
    });

    response.headers.set('Report-To', reportToValue);
    response.headers.set('Reporting-Endpoints', `csp-endpoint="${report}"`);
  } else {
    response.headers.delete('Report-To');
    response.headers.delete('Reporting-Endpoints');
  }
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  // Same-origin analytics requests must not receive Auth query tokens in Referer.
  response.headers.set('Referrer-Policy', 'strict-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
}

/** Infrastructure still receives CSP so error documents render with a nonce, without locale rewrites. */
function isInfrastructurePath(path: string): boolean {
  return (
    ['/api', '/ingest', '/sentry-tunnel', '/_next'].some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    ) ||
    [
      '/favicon.ico',
      // Keep this inventory aligned with public/; proxy tests check every actual file.
      '/wordmark-iroko.svg',
      '/wordmark-iroko-dark.svg',
      '/window.svg',
      '/vercel.svg',
      '/sitemap-0.xml',
      '/ornament-iroko.svg',
      '/next.svg',
      '/mark-iroko.svg',
      '/mark-iroko-light.svg',
      '/logo-microsoft.svg',
      '/logo-google.svg',
      '/lockup-iroko.svg',
      '/icon-maskable-512.svg',
      '/icon-512.svg',
      '/icon-192.svg',
      '/globe.svg',
      '/file.svg',
      '/favicon-light.svg',
      '/favicon-32.svg',
      '/favicon-16.svg',
      '/apple-touch-icon.svg',
      '/favicon.svg',
      '/favicon-32.png',
      '/favicon-16.png',
      '/favicon-48.png',
      '/favicon-64.png',
      '/icon-192.png',
      '/icon-512.png',
      '/icon-maskable-512.png',
      '/og-image-mark.png',
      '/apple-touch-icon.png',
      '/manifest.json',
      '/site.webmanifest',
      '/robots.txt',
      '/sitemap.xml',
    ].includes(path)
  );
}

function forwardNonce(response: NextResponse, nonce: string, csp: string): void {
  const overrides = new Set(
    (response.headers.get('x-middleware-override-headers') ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  );
  const nonceHeaders: ReadonlyArray<readonly [string, string]> = [
    ['x-nonce', nonce],
    ['content-security-policy', csp],
  ];
  for (const [name, value] of nonceHeaders) {
    overrides.add(name);
    response.headers.set(`x-middleware-request-${name}`, value);
  }
  response.headers.set('x-middleware-override-headers', [...overrides].join(','));
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const options: CspOptions = {
    nonce,
    isDev: env.NODE_ENV === 'development',
    isPreview: env.VERCEL_ENV === 'preview',
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    sentryDsn: env.NEXT_PUBLIC_SENTRY_DSN,
    localValidation: env.LOCAL_VALIDATION === 'true' || env.NEXT_PUBLIC_LOCAL_VALIDATION === 'true',
  };
  const csp = buildCspHeader(options);
  const report = options.localValidation ? undefined : sentryDestination(options.sentryDsn)?.report;
  request.headers.set('x-nonce', nonce);
  request.headers.set('content-security-policy', csp);

  if (isInfrastructurePath(request.nextUrl.pathname)) {
    const localeSegment = request.nextUrl.pathname.split('/')[1];
    const locale =
      routing.locales.find((value) => value === localeSegment) ?? routing.defaultLocale;
    request.headers.set('x-next-intl-locale', locale);
    const response = NextResponse.next({ request: { headers: request.headers } });
    if (
      request.headers.get('sec-fetch-dest') === 'document' ||
      request.headers.get('accept')?.includes('text/html')
    ) {
      response.headers.set('Cache-Control', 'private, no-store');
    }
    forwardNonce(response, nonce, csp);
    applySecurityHeaders(response, csp, report);
    return response;
  }

  const session = await updateSession(request);
  const response =
    session.status >= 300 && session.status < 400 ? session : intlMiddleware(request);
  if (response !== session) {
    for (const cookie of session.cookies.getAll())
      response.cookies.set(cookie.name, cookie.value, cookie);
  }
  // Nonce-bearing HTML cannot enter shared caches; retain stronger session protections.
  response.headers.set(
    'Cache-Control',
    session.headers.get('Cache-Control') ?? 'private, no-store',
  );
  forwardNonce(response, nonce, csp);
  applySecurityHeaders(response, csp, report);
  return response;
}

export const config = {
  // No extension, API-prefix or prefetch exclusions: unknown paths can render HTML errors.
  matcher: [{ source: '/(.*)' }],
};
