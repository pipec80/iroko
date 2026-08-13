import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  refreshSession: vi.fn(),
  getLocale: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    rpc: mocks.rpc,
    auth: { refreshSession: mocks.refreshSession },
  }),
}));
vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));
vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    SUPABASE_SECRET_KEY: 'test-key',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));

import { switchAccount, createTeam } from './actions';

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe('dashboard actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLocale.mockResolvedValue('es');
  });

  it('switchAccount redirects to /es/dashboard after a successful switch', async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    await switchAccount(formData({ accountId: '11111111-1111-4111-8111-111111111111' }));
    expect(mocks.rpc).toHaveBeenCalledWith('switch_account', {
      p_account_id: '11111111-1111-4111-8111-111111111111',
    });
    expect(mocks.refreshSession).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith('/es/dashboard');
  });

  it('switchAccount returns not_a_member without redirecting', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'not_a_member' } });
    const res = await switchAccount(
      formData({ accountId: '11111111-1111-4111-8111-111111111111' }),
    );
    expect(res.error).toBe('not_a_member');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('switchAccount returns invalid_account_id on a malformed id', async () => {
    const res = await switchAccount(formData({ accountId: 'not-a-uuid' }));
    expect(res.error).toBe('invalid_account_id');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('createTeam redirects to /es/dashboard after creating the team', async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    await createTeam(formData({ name: 'Acme' }));
    expect(mocks.rpc).toHaveBeenCalledWith('create_team', { p_name: 'Acme' });
    expect(mocks.refreshSession).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith('/es/dashboard');
  });

  it('createTeam returns team_limit_reached without redirecting', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'team_limit_reached' } });
    const res = await createTeam(formData({ name: 'Acme' }));
    expect(res.error).toBe('team_limit_reached');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('createTeam returns name_required on an empty name', async () => {
    const res = await createTeam(formData({ name: '  ' }));
    expect(res.error).toBe('name_required');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
