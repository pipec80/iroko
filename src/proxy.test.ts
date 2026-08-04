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

import { config } from './proxy';

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
