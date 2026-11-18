import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  adminSignOut: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  deleteFactor: vi.fn(),
  adminRpc: vi.fn(),
  admin: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser, getSession: mocks.getSession, signOut: mocks.signOut },
    rpc: mocks.rpc,
  })),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn() } }));

import { recoverMfa } from './recover-mfa';

describe('recoverMfa', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'caller-jwt' } },
      error: null,
    });
    mocks.adminSignOut.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'caller' } }, error: null });
    mocks.rpc.mockResolvedValue({
      data: [{ recovery_id: 'attempt', factor_ids: ['old-factor'] }],
      error: null,
    });
    mocks.admin.mockReturnValue({
      auth: { admin: { signOut: mocks.adminSignOut, mfa: { deleteFactor: mocks.deleteFactor } } },
      rpc: mocks.adminRpc,
    });
    mocks.deleteFactor.mockResolvedValue({ error: null });
    mocks.adminRpc.mockResolvedValue({ data: true, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });
  it('rejects an unauthenticated caller before claiming a code', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await recoverMfa('AB12-CD34')).toBe('invalid');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('never uses admin privileges for an invalid, used or foreign code', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    expect(await recoverMfa('AB12-CD34')).toBe('invalid');
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('resets only the claimed factors of the authenticated caller, completes then signs out', async () => {
    expect(await recoverMfa('AB12-CD34')).toBe('recovered');
    expect(mocks.rpc).toHaveBeenCalledWith('begin_mfa_recovery', { p_code: 'AB12-CD34' });
    expect(mocks.deleteFactor).toHaveBeenCalledWith({ userId: 'caller', id: 'old-factor' });
    expect(mocks.adminRpc).toHaveBeenCalledWith('complete_mfa_recovery', {
      p_user_id: 'caller',
      p_recovery_id: 'attempt',
    });
    expect(mocks.getUser).toHaveBeenCalledWith('caller-jwt');
    expect(mocks.adminSignOut).toHaveBeenCalledWith('caller-jwt', 'global');
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.deleteFactor.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.adminRpc.mock.invocationCallOrder[0] ?? 0,
    );
  });
  it('keeps the durable claim retryable when Auth fails without reporting success', async () => {
    mocks.deleteFactor.mockResolvedValue({ error: { code: 'unexpected_failure' } });
    expect(await recoverMfa('AB12-CD34')).toBe('retry');
    expect(mocks.adminRpc).not.toHaveBeenCalled();
    expect(mocks.adminSignOut).toHaveBeenCalledWith('caller-jwt', 'global');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('can finish an interrupted reset when its snapshot factor is already gone', async () => {
    mocks.deleteFactor.mockResolvedValue({ error: { code: 'mfa_factor_not_found' } });
    expect(await recoverMfa('AB12-CD34')).toBe('recovered');
  });
  it('does not report success when completion fails', async () => {
    mocks.adminRpc.mockResolvedValue({ data: false, error: null });
    expect(await recoverMfa('AB12-CD34')).toBe('retry');
  });
  it('returns a recoverable error when a transport throws', async () => {
    mocks.deleteFactor.mockRejectedValue(new Error('transport unavailable'));
    expect(await recoverMfa('AB12-CD34')).toBe('retry');
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it.each([0, 500])(
    'treats a resolved RPC transport/server error (%i) as retryable',
    async (status) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code: 'transport' }, status });
      expect(await recoverMfa('AB12-CD34')).toBe('retry');
      expect(mocks.admin).not.toHaveBeenCalled();
    },
  );
  it('treats an identity provider outage as retryable', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
    expect(await recoverMfa('AB12-CD34')).toBe('retry');
  });
  it('reports completed recovery even if signout returns a network error after clearing local storage', async () => {
    mocks.signOut.mockResolvedValue({ error: { code: 'unexpected_failure' } });
    expect(await recoverMfa('AB12-CD34')).toBe('recovered');
  });
  it('does not reset a factor unless global revocation succeeds', async () => {
    mocks.adminSignOut.mockResolvedValue({ error: { code: 'unexpected_failure' } });
    expect(await recoverMfa('AB12-CD34')).toBe('retry');
    expect(mocks.deleteFactor).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
});
