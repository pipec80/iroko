import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { getUser, refreshSession, single, captureServer, notify } = vi.hoisted(() => ({
  getUser: vi.fn(),
  refreshSession: vi.fn(),
  single: vi.fn(),
  captureServer: vi.fn(async () => {}),
  notify: vi.fn(async () => {}),
}));

// La ruta usa createServerClient directamente (no @/lib/supabase/server) para
// poder escribir las cookies de sesión sobre la respuesta del redirect.
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser, refreshSession },
    rpc: vi.fn(() => ({ single })),
  })),
}));

vi.mock('@/lib/analytics/server', () => ({ captureServer }));
vi.mock('@/lib/notifications', () => ({ notify }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  },
}));

import { GET } from '../route';

function makeRequest(token?: string): NextRequest {
  const url =
    token ?
      `http://localhost:3000/es/auth/accept-invitation?token=${token}`
    : 'http://localhost:3000/es/auth/accept-invitation';
  return new NextRequest(url);
}

const params = Promise.resolve({ locale: 'es' });

/** Usuario autenticado + invitación aceptada correctamente. */
function arrangeAcceptedInvitation(invitedBy: string | null = 'inviter-1') {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@test.com' } } });
  single.mockResolvedValue({ data: { account_id: 'acc-1', invited_by: invitedBy }, error: null });
  refreshSession.mockResolvedValue({ error: null });
}

describe('GET /[locale]/auth/accept-invitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect to login with invalid_invitation when no token is given', async () => {
    const response = await GET(makeRequest(), { params });

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.pathname).toBe('/es/login');
    expect(location.searchParams.get('error')).toBe('invalid_invitation');
  });

  it('offers the invitation entry choices without attempting acceptance when signed out', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const token = 'a'.repeat(64);
    const response = await GET(makeRequest(token), { params });

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.pathname).toBe('/es/auth/invitation');
    expect(location.searchParams.get('entry')).toBe('1');
    expect(location.searchParams.get('next')).toBe(`/es/auth/accept-invitation?token=${token}`);
    expect(single).not.toHaveBeenCalled();
  });

  it('should redirect to login with invitation_invalid when the RPC errors', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@test.com' } } });
    single.mockResolvedValue({ data: null, error: { code: '42501', message: 'not found' } });

    const response = await GET(makeRequest('tok_123'), { params });

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.searchParams.get('error')).toBe('invitation_invalid');
    expect(notify).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('keeps a real invitation available when the current session cannot accept it', async () => {
    const token = 'a'.repeat(64);
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@test.com' } } });
    single.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Invalid invitation' },
    });

    const response = await GET(makeRequest(token), { params });
    const location = new URL(response.headers.get('location') ?? '');

    expect(location.pathname).toBe('/es/auth/invitation');
    expect(location.searchParams.get('next')).toBe(`/es/auth/accept-invitation?token=${token}`);
    expect(notify).not.toHaveBeenCalled();
  });

  it('reports a full organization without refreshing the session or notifying its inviter', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    single.mockResolvedValue({ data: null, error: { message: 'seat_limit_reached' } });

    const result = await GET(makeRequest('f'.repeat(64)), { params });
    const location = new URL(result.headers.get('location') ?? '');

    expect(location.pathname).toBe('/es/auth/invitation');
    expect(location.searchParams.get('reason')).toBe('capacity');
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    expect(refreshSession).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('notifies the inviter even if acceptance analytics rejects', async () => {
    arrangeAcceptedInvitation();
    captureServer.mockRejectedValueOnce(new Error('Telemetry unavailable'));

    const result = await GET(makeRequest('a'.repeat(64)), { params });

    expect(new URL(result.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    expect(notify).toHaveBeenCalledOnce();
  });

  it('should capture invitation_accepted and notify the inviter, then redirect to dashboard', async () => {
    arrangeAcceptedInvitation();

    const response = await GET(makeRequest('tok_123'), { params });

    expect(captureServer).toHaveBeenCalledWith({
      event: 'invitation_accepted',
      properties: {},
      distinctId: 'user-1',
    });
    expect(notify).toHaveBeenCalledWith('inviter-1', {
      type: 'success',
      title: 'a@test.com aceptó tu invitación',
      // La página real de miembros es /dashboard/members; /dashboard/team fue
      // eliminada como ruta duplicada y el link quedaba en 404.
      link: '/es/dashboard/members',
    });
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
  });

  it('should refresh the session so the JWT picks up the team as active account', async () => {
    arrangeAcceptedInvitation();

    await GET(makeRequest('tok_123'), { params });

    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('should still redirect to dashboard when the session refresh fails', async () => {
    arrangeAcceptedInvitation();
    refreshSession.mockResolvedValue({ error: { code: 'network', message: 'refresh failed' } });

    const response = await GET(makeRequest('tok_123'), { params });

    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
    expect(notify).toHaveBeenCalled();
  });

  it('should not notify when the invitation has no inviter on record', async () => {
    arrangeAcceptedInvitation(null);

    await GET(makeRequest('tok_123'), { params });

    expect(notify).not.toHaveBeenCalled();
  });

  it('should still redirect to dashboard when notify() fails', async () => {
    arrangeAcceptedInvitation();
    notify.mockRejectedValueOnce(new Error('insert failed'));

    const response = await GET(makeRequest('tok_123'), { params });

    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
  });
});
