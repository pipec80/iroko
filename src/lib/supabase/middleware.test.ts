import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getClaims: mocks.getClaims },
  })),
}));

// El routing real importa next/navigation — para lógica pura basta la forma.
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'es'], defaultLocale: 'es' },
}));

vi.mock('@/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));

import { updateSession } from './middleware';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

function mockSession() {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-uuid-1' } } });
}

function mockNoSession() {
  mocks.getClaims.mockResolvedValue({ data: null });
}

/** MFA enrolled but still at aal1 — the TOTP challenge is pending. */
function mockMfaPendingSession() {
  mocks.getClaims.mockResolvedValue({
    data: { claims: { sub: 'user-uuid-1', aal: 'aal1', app_metadata: { mfa_enrolled: true } } },
  });
}

/** MFA enrolled and completed — aal2. */
function mockAal2Session() {
  mocks.getClaims.mockResolvedValue({
    data: { claims: { sub: 'user-uuid-1', aal: 'aal2', app_metadata: { mfa_enrolled: true } } },
  });
}

describe('updateSession', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('unauthenticated requests', () => {
    it('redirects /es/dashboard to /es/login preserving the destination in next=', async () => {
      mockNoSession();
      const response = await updateSession(makeRequest('/es/dashboard'));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location') ?? '');
      expect(location.pathname).toBe('/es/login');
      expect(location.searchParams.get('next')).toBe('/es/dashboard');
    });

    it('redirects nested protected paths (/es/dashboard/account)', async () => {
      mockNoSession();
      const response = await updateSession(makeRequest('/es/dashboard/account?tab=security'));

      const location = new URL(response.headers.get('location') ?? '');
      expect(location.pathname).toBe('/es/login');
      expect(location.searchParams.get('next')).toBe('/es/dashboard/account');
    });

    it('protects /reset-password — requires a recovery session', async () => {
      mockNoSession();
      const response = await updateSession(makeRequest('/es/reset-password'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/es/login');
    });

    it('respects the request locale when redirecting (/en/dashboard → /en/login)', async () => {
      mockNoSession();
      const response = await updateSession(makeRequest('/en/dashboard'));
      expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/en/login');
    });

    it('lets /es/login pass through without redirect loop', async () => {
      mockNoSession();
      const response = await updateSession(makeRequest('/es/login'));
      expect(response.headers.get('location')).toBeNull();
    });

    it('lets public marketing pages pass through', async () => {
      mockNoSession();
      const response = await updateSession(makeRequest('/es/pricing'));
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('authenticated requests', () => {
    it('redirects the root to the dashboard', async () => {
      mockSession();
      const response = await updateSession(makeRequest('/es'));
      expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
    });

    it('redirects auth-only pages (login/signup) to the dashboard', async () => {
      mockSession();
      for (const path of ['/es/login', '/es/signup', '/es/forgot-password']) {
        const response = await updateSession(makeRequest(path));
        expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
      }
    });

    it('drops any next= param when bouncing off auth pages (open-redirect hygiene)', async () => {
      mockSession();
      const response = await updateSession(makeRequest('/es/login?next=//evil.com'));
      const location = new URL(response.headers.get('location') ?? '');
      expect(location.searchParams.get('next')).toBeNull();
    });

    it('lets protected pages pass and disables CDN caching of the response', async () => {
      mockSession();
      const response = await updateSession(makeRequest('/es/dashboard'));

      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    });
  });

  describe('MFA (aal2) enforcement', () => {
    it('blocks a protected route when MFA is enrolled but the session is still aal1', async () => {
      mockMfaPendingSession();
      const response = await updateSession(makeRequest('/es/dashboard'));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location') ?? '');
      expect(location.pathname).toBe('/es/login');
      expect(location.searchParams.get('mfa')).toBe('required');
    });

    it('does NOT bounce an aal1-MFA user off /login (they must finish the challenge)', async () => {
      mockMfaPendingSession();
      const response = await updateSession(makeRequest('/es/login'));
      // No redirect to /dashboard — otherwise /login → /dashboard → /login loops.
      expect(response.headers.get('location')).toBeNull();
    });

    it('lets an aal2 session reach protected routes normally', async () => {
      mockAal2Session();
      const response = await updateSession(makeRequest('/es/dashboard'));
      expect(response.headers.get('location')).toBeNull();
    });

    it('bounces an aal2 user off /login to the dashboard like any authed user', async () => {
      mockAal2Session();
      const response = await updateSession(makeRequest('/es/login'));
      expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
    });

    it('does NOT block /reset-password for an aal1-MFA user (recovery runs at aal1)', async () => {
      mockMfaPendingSession();
      const response = await updateSession(makeRequest('/es/reset-password'));
      // Recovery flow must proceed — no bounce to the MFA challenge.
      expect(response.headers.get('location')).toBeNull();
    });

    it('does not enforce aal2 for users without an enrolled factor', async () => {
      // Plain session (no mfa_enrolled) stays at aal1 forever — must pass through.
      mockSession();
      const response = await updateSession(makeRequest('/es/dashboard'));
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('stale token handling', () => {
    it('treats refresh_token_not_found as unauthenticated instead of crashing the edge', async () => {
      mocks.getClaims.mockRejectedValue(
        Object.assign(new Error('Refresh token not found'), { code: 'refresh_token_not_found' }),
      );
      const response = await updateSession(makeRequest('/es/dashboard'));
      expect(response.headers.get('location')).toContain('/es/login');
    });

    it('re-throws unexpected auth errors — they must reach Sentry, not be swallowed', async () => {
      mocks.getClaims.mockRejectedValue(new Error('network unreachable'));
      await expect(updateSession(makeRequest('/es/dashboard'))).rejects.toThrow(
        'network unreachable',
      );
    });
  });

  describe('locale extraction fallback', () => {
    it('uses defaultLocale when the path has no recognized locale prefix', async () => {
      mockNoSession();
      const response = await updateSession(makeRequest('/dashboard'));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location') ?? '');
      // Should fall back to 'es' (the mocked defaultLocale)
      expect(location.pathname).toBe('/es/login');
      expect(location.searchParams.get('next')).toBe('/dashboard');
    });

    it('passes through when path has unrecognized locale-like prefix (not matched as protected)', async () => {
      mockNoSession();
      const response = await updateSession(makeRequest('/fr/dashboard'));

      // 'fr' is not in mocked locales → pathWithoutLocale = '/fr/dashboard'
      // which doesn't start with '/dashboard', so it's not protected → pass-through
      expect(response.headers.get('location')).toBeNull();
    });
  });
});
