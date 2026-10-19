import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  createClient: vi.fn(),
  cookies: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321' } }));
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['es', 'en', 'pt', 'fr'], defaultLocale: 'es' },
}));
import { GET } from '../route';
const ADMIN = '11111111-1111-4111-8111-111111111111';
const TARGET = '22222222-2222-4222-8222-222222222222';
const SESSION = '33333333-3333-4333-8333-333333333333';
function request(path = '/api/impersonation/expire', session = SESSION) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: {
      cookie: `impersonation_session_id=${session}; admin_return_session=obsolete; sb-localhost-auth-token.0=target; sb-other-auth-token=other`,
    },
  });
}
function cleared(response: Response) {
  const cookies = response.headers.getSetCookie();
  expect(cookies.some((value) => value.startsWith('admin_return_session=;'))).toBe(true);
  expect(cookies.some((value) => value.startsWith('impersonation_session_id=;'))).toBe(true);
  expect(cookies.some((value) => value.startsWith('sb-localhost-auth-token.0=;'))).toBe(true);
  expect(cookies.some((value) => value.startsWith('sb-other-auth-token='))).toBe(false);
}
beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.cookies.mockResolvedValue({ getAll: () => [] });
  mocks.createClient.mockResolvedValue({
    auth: { getClaims: mocks.getClaims, signOut: mocks.signOut },
    rpc: mocks.rpc,
  });
  mocks.getClaims.mockResolvedValue({
    data: { claims: { sub: TARGET, app_metadata: { impersonated_by: ADMIN } } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});
describe('expired impersonation route', () => {
  it('preserves an unrelated normal session when a top-level GET has no impersonation evidence', async () => {
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: ADMIN, app_metadata: {} } },
      error: null,
    });
    const response = await GET(
      new NextRequest('http://localhost:3000/api/impersonation/expire', {
        headers: { cookie: 'sb-localhost-auth-token.0=normal-session' },
      }),
    );
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('http://localhost:3000/es/dashboard');
    expect(response.headers.getSetCookie()).toEqual([]);
  });
  it.each([ADMIN, 'malformed-signed-marker'])(
    'still clears a signed target identity with marker %s when both auxiliary cookies were removed',
    async (marker) => {
      mocks.getClaims.mockResolvedValue({
        data: { claims: { sub: TARGET, app_metadata: { impersonated_by: marker } } },
        error: null,
      });
      const response = await GET(
        new NextRequest('http://localhost:3000/api/impersonation/expire', {
          headers: { cookie: 'sb-localhost-auth-token.0=target-session' },
        }),
      );
      expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(
        response.headers
          .getSetCookie()
          .some((value) => value.startsWith('sb-localhost-auth-token.0=;')),
      ).toBe(true);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it('removes newly refreshed auth chunks even when signOut fails', async () => {
    const current = [{ name: 'sb-localhost-auth-token.0', value: 'old' }];
    mocks.cookies.mockResolvedValue({ getAll: () => current });
    mocks.getClaims.mockImplementation(async () => {
      current.push({ name: 'sb-localhost-auth-token.1', value: 'refreshed' });
      return {
        data: { claims: { sub: TARGET, app_metadata: { impersonated_by: ADMIN } } },
        error: null,
      };
    });
    mocks.signOut.mockRejectedValue(new Error('unavailable'));
    const response = await GET(request());
    expect(
      response.headers
        .getSetCookie()
        .some((value) => value.startsWith('sb-localhost-auth-token.1=;')),
    ).toBe(true);
  });
  it('closes through the signed target identity then logs out locally and clears current auth cookies', async () => {
    const response = await GET(request('/api/impersonation/expire?returnTo=/en/dashboard/billing'));
    expect(mocks.rpc).toHaveBeenCalledWith('end_impersonation_session', {
      p_session_id: SESSION,
      p_reason: 'expired',
    });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signOut.mock.invocationCallOrder[0]!,
    );
    const url = new URL(response.headers.get('location')!);
    expect(url.pathname).toBe('/en/login');
    expect(url.searchParams.get('next')).toBe('/en/dashboard/billing');
    expect(url.searchParams.get('impersonation')).toBe('expired');
    cleared(response);
  });
  it('uses a localized dashboard fallback', async () => {
    const url = new URL((await GET(request())).headers.get('location')!);
    expect(url.pathname).toBe('/es/login');
    expect(url.searchParams.get('next')).toBe('/es/dashboard');
  });
  it.each([
    'https://evil.test',
    '//evil.test',
    '/es/login',
    '/es/auth/logout',
    '/es/api/impersonation/expire',
    '/es/../api/impersonation/expire',
  ])('rejects unsafe or cyclic return target %s', async (next) => {
    const response = await GET(
      request(`/api/impersonation/expire?returnTo=${encodeURIComponent(next)}`),
    );
    expect(new URL(response.headers.get('location')!).searchParams.get('next')).toBe(
      '/es/dashboard',
    );
  });
  it('normalizes a legacy internal dashboard target', async () => {
    const response = await GET(request('/api/impersonation/expire?returnTo=/dashboard/billing'));
    expect(new URL(response.headers.get('location')!).searchParams.get('next')).toBe(
      '/es/dashboard/billing',
    );
  });
  it.each(['no-claims', 'bad-sub', 'bad-admin', 'bad-session'])(
    'never authorizes RPC from %s but always signs out',
    async (kind) => {
      if (kind === 'no-claims')
        mocks.getClaims.mockResolvedValue({ data: { claims: {} }, error: null });
      if (kind === 'bad-sub')
        mocks.getClaims.mockResolvedValue({
          data: { claims: { sub: 'bad', app_metadata: { impersonated_by: ADMIN } } },
          error: null,
        });
      if (kind === 'bad-admin')
        mocks.getClaims.mockResolvedValue({
          data: { claims: { sub: TARGET, app_metadata: { impersonated_by: 'bad' } } },
          error: null,
        });
      const response = await GET(
        request('/api/impersonation/expire', kind === 'bad-session' ? 'bad' : SESSION),
      );
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
      cleared(response);
    },
  );
  it.each(['claims', 'rpc', 'logout', 'client'])(
    'clears browser identity even if %s fails',
    async (kind) => {
      if (kind === 'claims') mocks.getClaims.mockRejectedValue(new Error('unavailable'));
      if (kind === 'rpc') mocks.rpc.mockRejectedValue(new Error('unavailable'));
      if (kind === 'logout') mocks.signOut.mockRejectedValue(new Error('unavailable'));
      if (kind === 'client') mocks.createClient.mockRejectedValue(new Error('unavailable'));
      const response = await GET(request());
      expect(response.status).toBe(307);
      cleared(response);
      if (kind !== 'client') expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    },
  );
});
