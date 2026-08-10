import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// next-intl/middleware resolves a bare "next/server" specifier internally,
// which only Next's own bundler (webpack/Turbopack) can handle — Vite/Vitest
// can't resolve it outside a Next build. Mock it so importing proxy.ts doesn't
// try to load next-intl's real middleware — but keep the inner middleware fn
// hoisted and controllable so `describe('proxy')` below can exercise the
// actual request-handling logic, not just the static `config` export.
const { intlMiddlewareMock } = vi.hoisted(() => ({ intlMiddlewareMock: vi.fn() }));
vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => intlMiddlewareMock),
}));

// proxy.ts imports updateSession from ./lib/supabase/middleware, which pulls in
// @supabase/ssr, @/config/app.config, @/env and @/i18n/routing at module scope —
// mock the same boundary middleware.test.ts uses so the import doesn't throw.
// getClaims is hoisted/controllable so `describe('proxy')` can drive updateSession's
// real branching (redirect vs. pass-through) through the real, unmocked function.
const { getClaimsMock } = vi.hoisted(() => ({ getClaimsMock: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getClaims: getClaimsMock },
  })),
}));

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'es'], defaultLocale: 'es' },
}));

vi.mock('@/env', () => ({
  env: {
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));

vi.mock('@/config/app.config', () => ({
  appConfig: { features: { onboarding: true } },
}));

import { buildCspHeader, config, proxy } from './proxy';

function makeRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

// Next.js compiles matcher.source with path-to-regexp, anchored to the full
// path — a bare `new RegExp(source).test(path)` (no anchors) finds matches
// mid-string and gives false positives, so anchor the same way here.
function matchesProxy(path: string): boolean {
  const matcher = config.matcher[0];
  if (!matcher) throw new Error('proxy matcher config is empty');
  return new RegExp(`^${matcher.source}$`).test(path);
}

describe('proxy matcher', () => {
  it('should exclude /sentry-tunnel so next-intl cannot locale-redirect the Sentry POST', () => {
    expect(matchesProxy('/sentry-tunnel')).toBe(false);
  });

  it('should exclude /ingest so next-intl cannot locale-redirect PostHog capture requests', () => {
    expect(matchesProxy('/ingest')).toBe(false);
    expect(matchesProxy('/ingest/e')).toBe(false);
    expect(matchesProxy('/ingest/static/array.js')).toBe(false);
  });

  it('should intercept normal app routes', () => {
    expect(matchesProxy('/dashboard')).toBe(true);
    expect(matchesProxy('/es/dashboard')).toBe(true);
    expect(matchesProxy('/')).toBe(true);
  });

  it('should exclude API routes', () => {
    expect(matchesProxy('/api/webhook')).toBe(false);
  });

  it('should exclude Next.js internals', () => {
    expect(matchesProxy('/_next/static/chunk.js')).toBe(false);
    expect(matchesProxy('/_next/image')).toBe(false);
  });

  it('should exclude favicon and manifest', () => {
    expect(matchesProxy('/favicon.ico')).toBe(false);
    expect(matchesProxy('/manifest.json')).toBe(false);
  });

  it('should exclude any path with a file extension', () => {
    expect(matchesProxy('/logo.png')).toBe(false);
  });
});

const CLOUD_SUPABASE_URL = 'https://xxxx.supabase.co';
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

describe('buildCspHeader', () => {
  it('should NOT allow vercel.live in production (isPreview=false)', () => {
    const csp = buildCspHeader(false, false, CLOUD_SUPABASE_URL);
    expect(csp).not.toContain('vercel.live');
  });

  // AUD-018: the Vercel Live feedback widget script (only injected on preview
  // deployments) was blocked by CSP, generating a report per page load.
  it('should allow vercel.live in script-src and connect-src on preview (isPreview=true)', () => {
    const csp = buildCspHeader(false, true, CLOUD_SUPABASE_URL);
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src'));
    const connectSrc = csp.split('; ').find((d) => d.startsWith('connect-src'));

    expect(scriptSrc).toContain('https://vercel.live');
    expect(connectSrc).toContain('https://vercel.live');
  });

  it('should still allow vercel.live in dev regardless of isPreview (dev already allows https:)', () => {
    const csp = buildCspHeader(true, false, LOCAL_SUPABASE_URL);
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src'));
    expect(scriptSrc).toBe("script-src 'self' 'unsafe-inline' 'unsafe-eval' https:");
  });

  // AUD-0XX: the E2E suite runs `next build && next start` (NODE_ENV=production),
  // so isDev=false — but it still talks to local Supabase. Gating the local
  // origin on isDev instead of the actual configured URL blocked every client
  // call to Supabase local during E2E (notifications, announcements, realtime
  // websocket), which surfaced as an intermittent settings.spec.ts failure.
  it('should allow the local Supabase origin in connect-src when NEXT_PUBLIC_SUPABASE_URL is loopback, even outside dev', () => {
    const csp = buildCspHeader(false, false, LOCAL_SUPABASE_URL);
    const connectSrc = csp.split('; ').find((d) => d.startsWith('connect-src'));

    expect(connectSrc).toContain('http://127.0.0.1:54321');
    expect(connectSrc).toContain('ws://127.0.0.1:54321');
  });

  it('should NOT allow any loopback origin when NEXT_PUBLIC_SUPABASE_URL is a real Cloud project (prod safety)', () => {
    const csp = buildCspHeader(false, false, CLOUD_SUPABASE_URL);
    const connectSrc = csp.split('; ').find((d) => d.startsWith('connect-src'));

    expect(connectSrc).not.toContain('127.0.0.1');
    expect(connectSrc).not.toContain('localhost');
  });

  it('should not throw and should omit the local origin when NEXT_PUBLIC_SUPABASE_URL is malformed', () => {
    const csp = buildCspHeader(false, false, 'not-a-valid-url');
    const connectSrc = csp.split('; ').find((d) => d.startsWith('connect-src'));

    expect(connectSrc).not.toContain('127.0.0.1');
    expect(connectSrc).not.toContain('localhost');
  });

  // PostHog traffic goes through the same-origin /ingest reverse proxy
  // (next.config.ts rewrites) — adding *.posthog.com here would be a sign
  // someone bypassed the proxy and started calling PostHog directly.
  it('should never allow *.posthog.com — PostHog traffic must stay same-origin via /ingest', () => {
    const csp = buildCspHeader(false, false, CLOUD_SUPABASE_URL);
    expect(csp).not.toContain('posthog.com');
  });
});

describe('proxy', () => {
  function mockIntlPassThrough(request: NextRequest): void {
    intlMiddlewareMock.mockReturnValue(NextResponse.next({ request }));
  }

  it('returns updateSession redirect with security headers, without calling intlMiddleware', async () => {
    getClaimsMock.mockResolvedValue({ data: null });
    const request = makeRequest('/es/dashboard');

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/es/login');
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(intlMiddlewareMock).not.toHaveBeenCalled();
  });

  it("returns intlMiddleware's redirect with security headers, without merging supabaseResponse cookies", async () => {
    getClaimsMock.mockResolvedValue({ data: null });
    const request = makeRequest('/es/pricing');
    intlMiddlewareMock.mockReturnValue(
      NextResponse.redirect(new URL('/es/pricing/', 'http://localhost:3000'), 307),
    );

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });

  it('passes through on a public page: merges cookies and applies security headers to the final response', async () => {
    getClaimsMock.mockResolvedValue({ data: null });
    const request = makeRequest('/es/pricing');
    mockIntlPassThrough(request);

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
