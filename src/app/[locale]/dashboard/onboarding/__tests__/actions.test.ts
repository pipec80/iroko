import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  refreshSession: vi.fn(),
  redirect: vi.fn(),
  getActiveAccountId: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    rpc: mocks.rpc,
    auth: { refreshSession: mocks.refreshSession },
  }),
}));

vi.mock('@/lib/active-account', () => ({
  getActiveAccountId: mocks.getActiveAccountId,
}));

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn().mockResolvedValue('es'),
}));

vi.mock('@/i18n/routing', () => ({ redirect: mocks.redirect }));

vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

import { confirmOrgName, completeOnboarding, getOnboardingOrg } from '../actions';

describe('getOnboardingOrg', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null name when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const result = await getOnboardingOrg();
    expect(result).toEqual({ name: null });
  });

  it('returns the name of the active account from get_my_accounts', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({
      data: [
        { account_id: 'acc-1', name: 'Mi Empresa', logo_url: null, role: 'owner' },
        { account_id: 'acc-2', name: 'Otra', logo_url: null, role: 'member' },
      ],
      error: null,
    });
    const result = await getOnboardingOrg();
    expect(mocks.rpc).toHaveBeenCalledWith('get_my_accounts');
    expect(result).toEqual({ name: 'Mi Empresa' });
  });

  it('returns null name when the RPC errors', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'boom', code: 'X' } });
    const result = await getOnboardingOrg();
    expect(result).toEqual({ name: null });
  });
});

describe('confirmOrgName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
  });

  it('rejects names shorter than 2 characters', async () => {
    const result = await confirmOrgName('a');
    expect(result).toEqual({ error: 'invalid_name' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects names longer than 100 characters', async () => {
    const result = await confirmOrgName('a'.repeat(101));
    expect(result).toEqual({ error: 'invalid_name' });
  });

  it('trims and calls rename_account for a valid name', async () => {
    const result = await confirmOrgName('  Mi Empresa  ');
    expect(mocks.rpc).toHaveBeenCalledWith('rename_account', {
      p_account_id: 'acc-1',
      p_name: 'Mi Empresa',
    });
    expect(result).toEqual({ success: true });
  });

  it('returns no_active_account when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const result = await confirmOrgName('Mi Empresa');
    expect(result).toEqual({ error: 'no_active_account' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('maps the rename_account error to { error }', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'boom', code: 'X' } });
    const result = await confirmOrgName('Mi Empresa');
    expect(result).toEqual({ error: 'boom' });
  });
});

describe('completeOnboarding', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the RPC, refreshes the session, and redirects to /dashboard', async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.refreshSession.mockResolvedValue({ error: null });

    await completeOnboarding();

    expect(mocks.rpc).toHaveBeenCalledWith('complete_onboarding');
    // Riesgo #1: si se borra la llamada a refreshSession, este assert debe fallar fuerte.
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith({ href: '/dashboard', locale: 'es' });
  });

  it('returns an error and does not refresh or redirect when the RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'db_error', code: 'X' } });

    const result = await completeOnboarding();

    expect(result).toEqual({ error: 'db_error' });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
