import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { getClaims, rpc } = vi.hoisted(() => ({ getClaims: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims }, rpc })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from '../route';

function makeRequest(path: string, opts?: { sessionCookie?: string }): NextRequest {
  const headers = new Headers();
  if (opts?.sessionCookie) {
    headers.set('cookie', `impersonation_session_id=${opts.sessionCookie}`);
  }
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe('GET /api/impersonation/expire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login with next=returnTo and impersonation=expired', async () => {
    getClaims.mockResolvedValue({ data: { claims: {} } });

    const response = await GET(
      makeRequest('/api/impersonation/expire?returnTo=/dashboard/billing'),
    );

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location') ?? '');
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/dashboard/billing');
    expect(location.searchParams.get('impersonation')).toBe('expired');
  });

  it('defaults next= to /dashboard when returnTo is absent', async () => {
    getClaims.mockResolvedValue({ data: { claims: {} } });

    const response = await GET(makeRequest('/api/impersonation/expire'));

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.searchParams.get('next')).toBe('/dashboard');
  });

  it('clears both impersonation cookies on the redirect response', async () => {
    getClaims.mockResolvedValue({ data: { claims: {} } });

    const response = await GET(makeRequest('/api/impersonation/expire'));

    const setCookies = response.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith('impersonation_session_id=;'))).toBe(true);
    expect(setCookies.some((c) => c.startsWith('admin_return_session=;'))).toBe(true);
  });

  it('calls end_impersonation_session with the cookie session id when actively impersonating', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { app_metadata: { impersonated_by: 'admin-uuid' } } },
    });
    rpc.mockResolvedValue({ error: null });

    await GET(makeRequest('/api/impersonation/expire', { sessionCookie: 'sess-abc' }));

    expect(rpc).toHaveBeenCalledWith('end_impersonation_session', {
      p_session_id: 'sess-abc',
      p_reason: 'expired',
    });
  });

  it('does NOT call the RPC when impersonated_by is set but no session cookie exists', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { app_metadata: { impersonated_by: 'admin-uuid' } } },
    });

    await GET(makeRequest('/api/impersonation/expire'));

    expect(rpc).not.toHaveBeenCalled();
  });

  it('does NOT call the RPC when the session is not impersonated at all', async () => {
    getClaims.mockResolvedValue({ data: { claims: {} } });

    await GET(makeRequest('/api/impersonation/expire', { sessionCookie: 'sess-abc' }));

    expect(rpc).not.toHaveBeenCalled();
  });

  it('logs a warning but still redirects when the RPC returns an error', async () => {
    const { logger } = await import('@/lib/logger');
    getClaims.mockResolvedValue({
      data: { claims: { app_metadata: { impersonated_by: 'admin-uuid' } } },
    });
    rpc.mockResolvedValue({ error: { code: '42501', message: 'not allowed' } });

    const response = await GET(
      makeRequest('/api/impersonation/expire', { sessionCookie: 'sess-abc' }),
    );

    expect(logger.warn).toHaveBeenCalled();
    expect(response.status).toBe(307);
  });
});
