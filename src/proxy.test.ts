import { describe, it, expect, vi } from 'vitest';

// next-intl/middleware resolves a bare "next/server" specifier internally,
// which only Next's own bundler (webpack/Turbopack) can handle — Vite/Vitest
// can't resolve it outside a Next build. Mock it so importing proxy.ts doesn't
// try to load next-intl's real middleware; only `config` (a static export) is
// under test here, never the request-handling logic.
vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => vi.fn()),
}));

// proxy.ts imports updateSession from ./lib/supabase/middleware, which pulls in
// @supabase/ssr, @/config/app.config, @/env and @/i18n/routing at module scope —
// mock the same boundary middleware.test.ts uses so the import doesn't throw.
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getClaims: vi.fn() },
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

import { buildCspHeader, config } from './proxy';

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
});
