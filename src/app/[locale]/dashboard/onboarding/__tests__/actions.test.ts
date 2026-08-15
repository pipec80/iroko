import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  refreshSession: vi.fn(),
  getClaims: vi.fn(),
  redirect: vi.fn(),
  getActiveAccountId: vi.fn(),
  captureServer: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    rpc: mocks.rpc,
    auth: { refreshSession: mocks.refreshSession, getClaims: mocks.getClaims },
  }),
}));

vi.mock('@/lib/active-account', () => ({
  getActiveAccountId: mocks.getActiveAccountId,
}));

vi.mock('@/lib/analytics/server', () => ({
  captureServer: mocks.captureServer,
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

  it('returns the name of the active team when the wizard is re-entered', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({
      data: [
        { account_id: 'acc-1', name: 'Mi Empresa', type: 'team', logo_url: null, role: 'owner' },
        { account_id: 'acc-2', name: 'Otra', type: 'team', logo_url: null, role: 'member' },
      ],
      error: null,
    });
    const result = await getOnboardingOrg();
    expect(mocks.rpc).toHaveBeenCalledWith('get_my_accounts');
    expect(result).toEqual({ name: 'Mi Empresa' });
  });

  it('returns null name when the active account is personal', async () => {
    // El nombre de la cuenta personal es el del usuario, no el de una
    // organización: prellenarlo como sugerencia confunde.
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({
      data: [{ account_id: 'acc-1', name: 'Ana Pérez', type: 'personal', role: 'owner' }],
      error: null,
    });
    const result = await getOnboardingOrg();
    expect(result).toEqual({ name: null });
  });

  it('returns null name when the RPC errors', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'boom', code: 'X' } });
    const result = await getOnboardingOrg();
    expect(result).toEqual({ name: null });
  });
});

describe('confirmOrgName', () => {
  /** get_my_accounts responde con el tipo pedido; el resto de RPCs, sin error. */
  function arrangeActiveAccount(type: 'personal' | 'team') {
    mocks.rpc.mockImplementation((fn: string) =>
      fn === 'get_my_accounts' ?
        Promise.resolve({
          data: [{ account_id: 'acc-1', name: 'Cuenta', type, role: 'owner' }],
          error: null,
        })
      : Promise.resolve({ error: null }),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    arrangeActiveAccount('personal');
    mocks.refreshSession.mockResolvedValue({ error: null });
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } });
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

  it('creates a real team when the active account is personal', async () => {
    // Renombrar la personal dejaba al usuario en una cuenta donde el paso
    // siguiente del wizard —invitar— iba a fallar con not_a_team.
    const result = await confirmOrgName('  Mi Empresa  ');

    expect(mocks.rpc).toHaveBeenCalledWith('create_team', { p_name: 'Mi Empresa' });
    expect(mocks.rpc).not.toHaveBeenCalledWith('rename_account', expect.anything());
    expect(result).toEqual({ success: true });
    expect(mocks.captureServer).toHaveBeenCalledWith({
      event: 'onboarding_step_completed',
      properties: { step: 'org_name' },
      distinctId: 'user-1',
      accountId: 'acc-1',
    });
  });

  it('refreshes the session so the new team becomes the active account', async () => {
    // create_team lo deja activo en profiles, pero el JWT todavía trae la
    // personal: sin refresh, invitar apuntaría a la cuenta anterior.
    await confirmOrgName('Mi Empresa');

    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('renames instead of creating a second team when one already exists', async () => {
    // El wizard es reentrable y el plan free trae teams_max=1: un segundo
    // create_team fallaría con team_limit_reached.
    arrangeActiveAccount('team');

    const result = await confirmOrgName('Mi Empresa');

    expect(mocks.rpc).toHaveBeenCalledWith('rename_account', {
      p_account_id: 'acc-1',
      p_name: 'Mi Empresa',
    });
    expect(mocks.rpc).not.toHaveBeenCalledWith('create_team', expect.anything());
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('returns no_active_account when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const result = await confirmOrgName('Mi Empresa');
    expect(result).toEqual({ error: 'no_active_account' });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.captureServer).not.toHaveBeenCalled();
  });

  it('maps the rename_account error to { error }', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'boom', code: 'X' } });
    const result = await confirmOrgName('Mi Empresa');
    expect(result).toEqual({ error: 'boom' });
    expect(mocks.captureServer).not.toHaveBeenCalled();
  });
});

describe('completeOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1', app_metadata: { account_id: 'acc-1' } } },
    });
  });

  it('calls the RPC, refreshes the session, and redirects to /dashboard', async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.refreshSession.mockResolvedValue({ error: null });

    await completeOnboarding();

    expect(mocks.rpc).toHaveBeenCalledWith('complete_onboarding');
    // Riesgo #1: si se borra la llamada a refreshSession, este assert debe fallar fuerte.
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith({ href: '/dashboard', locale: 'es' });
    expect(mocks.captureServer).toHaveBeenCalledWith({
      event: 'onboarding_completed',
      properties: {},
      distinctId: 'user-1',
      accountId: 'acc-1',
    });
  });

  it('returns an error and does not refresh or redirect when the RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'db_error', code: 'X' } });

    const result = await completeOnboarding();

    expect(result).toEqual({ error: 'db_error' });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.captureServer).not.toHaveBeenCalled();
  });
});
