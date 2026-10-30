import { describe, it, expect, vi } from 'vitest';
import { readdirSync } from 'node:fs';
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

import { buildCspHeader as buildPolicy, config, proxy } from './proxy';

function buildCspHeader(isDev: boolean, isPreview: boolean, supabaseUrl: string) {
  return buildPolicy({ nonce: 'fixture-nonce', isDev, isPreview, supabaseUrl });
}

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
  it.each([
    '/sentry-tunnel',
    '/ingest/e',
    '/_next/static/chunk.js',
    '/api/missing',
    '/favicon.ico',
    '/unknown.file',
    '/api-like-error',
    '/es/dashboard',
    '/',
  ])('covers potential HTML documents at %s', (path) => {
    expect(matchesProxy(path)).toBe(true);
  });
  it('does not omit prefetch requests', () => {
    expect(config.matcher[0]).not.toHaveProperty('missing');
  });
});
const CLOUD_SUPABASE_URL = 'https://xxxx.supabase.co';
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

describe('buildCspHeader', () => {
  const options = {
    nonce: 'fixture-nonce',
    isDev: false,
    isPreview: false,
    supabaseUrl: CLOUD_SUPABASE_URL,
  };
  it('removes inline/eval script execution while retaining the style exception', () => {
    const policy = buildPolicy(options);
    const scripts = policy.split('; ').find((value) => value.startsWith('script-src'));
    expect(scripts).toContain("'nonce-fixture-nonce'");
    expect(scripts).not.toContain('unsafe-inline');
    expect(scripts).not.toContain('unsafe-eval');
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain('strict-dynamic');
  });
  it('derives report destination from the configured DSN', () => {
    const policy = buildPolicy({
      ...options,
      sentryDsn: 'https://public-key@errors.example/prefix/123',
    });
    expect(policy).toContain(
      'report-uri https://errors.example/prefix/api/123/security/?sentry_key=public-key',
    );
    expect(policy).toContain('report-to csp-endpoint');
    expect(policy).not.toContain('o4511537461067776');
  });
  it.each([
    undefined,
    'bad-dsn',
    'http://public-key@127.0.0.1:9/123',
    'https://public-key@localhost/123',
  ])('omits reporting for missing, malformed or loopback DSN %s', (sentryDsn) => {
    expect(buildPolicy({ ...options, sentryDsn })).not.toContain('report-uri');
    expect(buildPolicy({ ...options, sentryDsn })).not.toContain('report-to');
  });
  it('disables reporting during local validation with any configured DSN', () => {
    expect(
      buildPolicy({
        ...options,
        localValidation: true,
        sentryDsn: 'https://public-key@errors.example/123',
      }),
    ).not.toContain('report-uri');
  });
  it('should NOT allow vercel.live in production (isPreview=false)', () => {
    const csp = buildCspHeader(false, false, CLOUD_SUPABASE_URL);
    expect(csp).not.toContain('vercel.live');
  });

  // AUD-018: the Vercel Live feedback widget script (only injected on preview
  // deployments) was blocked by CSP, generating a report per page load.
  it('should allow vercel.live in script-src, connect-src, and frame-src on preview', () => {
    const csp = buildCspHeader(false, true, CLOUD_SUPABASE_URL);
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src'));
    const connectSrc = csp.split('; ').find((d) => d.startsWith('connect-src'));
    const frameSrc = csp.split('; ').find((d) => d.startsWith('frame-src'));

    expect(scriptSrc).toContain('https://vercel.live');
    expect(connectSrc).toContain('https://vercel.live');
    expect(frameSrc).toContain('https://vercel.live');
  });

  it('should still allow vercel.live in dev regardless of isPreview (dev already allows https:)', () => {
    const csp = buildCspHeader(true, false, LOCAL_SUPABASE_URL);
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src'));
    expect(scriptSrc).toBe("script-src 'self' 'nonce-fixture-nonce' 'unsafe-eval' https:");
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
  it('preserves pass-through for every existing public asset', async () => {
    const files = readdirSync('public', { recursive: true });
    for (const file of files) {
      if (typeof file !== 'string' || !file.includes('.')) continue;
      const response = await proxy(makeRequest(`/${file.replaceAll('\\', '/')}`));
      expect(response.status).toBe(200);
      expect(intlMiddlewareMock).not.toHaveBeenCalled();
      expect(getClaimsMock).not.toHaveBeenCalled();
    }
  });
  it('prevents caching infrastructure HTML documents without changing asset caching', async () => {
    const document = makeRequest('/api/missing.file');
    document.headers.set('accept', 'text/html');
    expect((await proxy(document)).headers.get('cache-control')).toBe('private, no-store');
    expect(
      (await proxy(makeRequest('/_next/static/chunk.js'))).headers.get('cache-control'),
    ).toBeNull();
  });
  it('overwrites untrusted nonce/CSP and forwards a unique nonce preserving intl overrides', async () => {
    getClaimsMock.mockResolvedValue({ data: null });
    const request = makeRequest('/en/missing.file');
    request.headers.set('x-nonce', 'attacker');
    request.headers.set('content-security-policy', 'attacker');
    const forwarded = new Headers(request.headers);
    forwarded.set('x-next-intl-locale', 'en');
    intlMiddlewareMock.mockReturnValue(NextResponse.next({ request: { headers: forwarded } }));
    const response = await proxy(request);
    const nonce = response.headers.get('x-middleware-request-x-nonce');
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(nonce).not.toBe('attacker');
    expect(response.headers.get('x-middleware-request-content-security-policy')).toBe(
      response.headers.get('content-security-policy'),
    );
    expect(response.headers.get('content-security-policy')).toContain(`'nonce-${nonce}'`);
    expect(response.headers.get('x-middleware-request-x-next-intl-locale')).toBe('en');
    expect(response.headers.get('x-middleware-override-headers')).toContain('x-next-intl-locale');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    intlMiddlewareMock.mockReturnValue(NextResponse.next());
    const second = await proxy(makeRequest('/en/missing.file'));
    expect(second.headers.get('x-middleware-request-x-nonce')).not.toBe(nonce);
  });

  it.each([
    '/api/missing',
    '/sentry-tunnel',
    '/ingest/e',
    '/_next/static/chunk.js',
    '/favicon.ico',
  ])(
    'passes infrastructure %s without intl redirects while forwarding CSP for error documents',
    async (path) => {
      const response = await proxy(makeRequest(path));
      expect(response.status).toBe(200);
      expect(intlMiddlewareMock).not.toHaveBeenCalled();
      expect(getClaimsMock).not.toHaveBeenCalled();
      expect(response.headers.get('x-middleware-request-x-nonce')).toBeTruthy();
    },
  );
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
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin');
  });

  // ADR 0004: every nonce-bearing document is request-specific, including
  // anonymous pages; shared HTML caching would reuse a document nonce.
  it('prevents shared HTML caching on anonymous nonce-bearing pages', async () => {
    getClaimsMock.mockResolvedValue({ data: null });
    const request = makeRequest('/es/pricing');
    mockIntlPassThrough(request);

    const response = await proxy(request);

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('propagates Cache-Control: private from updateSession onto the final intlResponse when authenticated', async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: 'user-uuid-1' } } });
    const request = makeRequest('/es/dashboard');
    mockIntlPassThrough(request);

    const response = await proxy(request);

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
