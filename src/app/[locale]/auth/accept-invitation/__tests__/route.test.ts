import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { getUser, single, captureServer, notify } = vi.hoisted(() => ({
  getUser: vi.fn(),
  single: vi.fn(),
  captureServer: vi.fn(async () => {}),
  notify: vi.fn(async () => {}),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    rpc: vi.fn(() => ({ single })),
  })),
}));

vi.mock('@/lib/analytics/server', () => ({ captureServer }));
vi.mock('@/lib/notifications', () => ({ notify }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/env', () => ({ env: { SITE_URL: 'http://localhost:3000' } }));

import { GET } from '../route';

function makeRequest(token?: string): NextRequest {
  const url =
    token ?
      `http://localhost:3000/es/auth/accept-invitation?token=${token}`
    : 'http://localhost:3000/es/auth/accept-invitation';
  return new NextRequest(url);
}

const params = Promise.resolve({ locale: 'es' });

describe('GET /[locale]/auth/accept-invitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login with invalid_invitation when no token is given', async () => {
    const response = await GET(makeRequest(), { params });

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.pathname).toBe('/es/login');
    expect(location.searchParams.get('error')).toBe('invalid_invitation');
  });

  it('redirects to login with next= when not authenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(makeRequest('tok_123'), { params });

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.pathname).toBe('/es/login');
    expect(location.searchParams.get('next')).toBe('/es/auth/accept-invitation?token=tok_123');
  });

  it('redirects to login with invitation_invalid when the RPC errors', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@test.com' } } });
    single.mockResolvedValue({ data: null, error: { code: '42501', message: 'not found' } });

    const response = await GET(makeRequest('tok_123'), { params });

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.searchParams.get('error')).toBe('invitation_invalid');
    expect(notify).not.toHaveBeenCalled();
  });

  it('captures invitation_accepted and notifies the inviter, then redirects to dashboard', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@test.com' } } });
    single.mockResolvedValue({
      data: { account_id: 'acc-1', invited_by: 'inviter-1' },
      error: null,
    });

    const response = await GET(makeRequest('tok_123'), { params });

    expect(captureServer).toHaveBeenCalledWith({
      event: 'invitation_accepted',
      properties: {},
      distinctId: 'user-1',
    });
    expect(notify).toHaveBeenCalledWith('inviter-1', {
      type: 'success',
      title: 'a@test.com aceptó tu invitación',
      link: '/es/dashboard/team',
    });
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
  });

  it('does not notify when the invitation has no inviter on record', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@test.com' } } });
    single.mockResolvedValue({
      data: { account_id: 'acc-1', invited_by: null },
      error: null,
    });

    await GET(makeRequest('tok_123'), { params });

    expect(notify).not.toHaveBeenCalled();
  });

  it('still redirects to dashboard when notify() fails', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@test.com' } } });
    single.mockResolvedValue({
      data: { account_id: 'acc-1', invited_by: 'inviter-1' },
      error: null,
    });
    notify.mockRejectedValueOnce(new Error('insert failed'));

    const response = await GET(makeRequest('tok_123'), { params });

    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
  });
});
