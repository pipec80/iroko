import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getClaims: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  setSession: vi.fn(),
  signOut: vi.fn(),
  getUserById: vi.fn(),
  generateLink: vi.fn(),
  verifyOtp: vi.fn(),
  cookieSet: vi.fn(),
  cookieGet: vi.fn(),
  cookieGetAll: vi.fn(),
  cookieDelete: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc: mocks.rpc,
    auth: {
      getSession: mocks.getSession,
      getClaims: mocks.getClaims,
      getUser: mocks.getUser,
      setSession: mocks.setSession,
      signOut: mocks.signOut,
      verifyOtp: mocks.verifyOtp,
    },
  })),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { generateLink: mocks.generateLink, getUserById: mocks.getUserById } },
  })),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: mocks.cookieSet,
    get: mocks.cookieGet,
    getAll: mocks.cookieGetAll,
    delete: mocks.cookieDelete,
  })),
}));
vi.mock('@/i18n/routing', () => ({ redirect: mocks.redirect }));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'es') }));
vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    SUPABASE_SECRET_KEY: 'unrelated-server-key',
    IMPERSONATION_COOKIE_SECRET: 'ab'.repeat(32),
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));
import { signImpersonationCookie } from '@/lib/impersonation-cookie';
import { endImpersonation, startImpersonation } from '../impersonation-actions';
const ADMIN = '11111111-1111-4111-8111-111111111111';
const TARGET = '22222222-2222-4222-8222-222222222222';
const SESSION = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
const user = (id: string) => ({ data: { user: { id } }, error: null });
const adminSession = { access_token: 'admin-at', refresh_token: 'admin-rt', user: { id: ADMIN } };
function installCookie(sessionId = SESSION) {
  const token = signImpersonationCookie({
    accessToken: 'admin-at',
    refreshToken: 'admin-rt',
    adminUserId: ADMIN,
    targetUserId: TARGET,
    sessionId: SESSION,
  });
  mocks.cookieGet.mockImplementation((name: string) =>
    name === 'admin_return_session' ? { value: token }
    : name === 'impersonation_session_id' ? { value: sessionId }
    : undefined,
  );
}
beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getUser.mockResolvedValue(user(ADMIN));
  mocks.getSession.mockResolvedValue({ data: { session: adminSession }, error: null });
  mocks.rpc.mockImplementation(async (name: string) =>
    name === 'begin_impersonation_session' ?
      {
        data: {
          id: SESSION,
          admin_id: ADMIN,
          target_user_id: TARGET,
          expires_at: '2026-10-15T21:00:00+00:00',
        },
        error: null,
      }
    : { data: null, error: null },
  );
  mocks.getUserById.mockResolvedValue({
    data: { user: { id: TARGET, email: 'target@example.test' } },
    error: null,
  });
  mocks.generateLink.mockResolvedValue({
    data: { properties: { hashed_token: 'target-token' } },
    error: null,
  });
  mocks.verifyOtp.mockResolvedValue({ error: null });
  mocks.getClaims.mockResolvedValue({
    data: {
      claims: {
        sub: TARGET,
        app_metadata: { impersonated_by: ADMIN, impersonation_expires_at: '2026-10-15T21:00:00Z' },
      },
    },
    error: null,
  });
  mocks.setSession.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.cookieGetAll.mockReturnValue([
    { name: 'sb-localhost-auth-token.0' },
    { name: 'sb-other-auth-token' },
  ]);
});
describe('startImpersonation', () => {
  it.each(['wrong-admin', 'missing-admin', 'wrong-expiry', 'wrong-sub'])(
    'restores owner and compensates when verified target claims have %s',
    async (kind) => {
      mocks.getUser
        .mockResolvedValueOnce(user(ADMIN))
        .mockResolvedValueOnce(user(TARGET))
        .mockResolvedValueOnce(user(ADMIN));
      mocks.getClaims.mockResolvedValue({
        data: {
          claims: {
            sub: kind === 'wrong-sub' ? OTHER : TARGET,
            app_metadata: {
              impersonated_by:
                kind === 'missing-admin' ? undefined
                : kind === 'wrong-admin' ? OTHER
                : ADMIN,
              impersonation_expires_at:
                kind === 'wrong-expiry' ? '2026-10-15T22:00:00Z' : '2026-10-15T21:00:00Z',
            },
          },
        },
        error: null,
      });
      expect((await startImpersonation(TARGET, 'support ticket')).error).toBe('start_failed');
      expect(mocks.setSession).toHaveBeenCalled();
      expect(mocks.rpc).toHaveBeenCalledWith('end_impersonation_session', {
        p_session_id: SESSION,
        p_reason: 'manual',
      });
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );
  it('rejects invalid reason or target without opening a row', async () => {
    expect((await startImpersonation(TARGET, 'ab')).error).toBe('validation_error');
    expect((await startImpersonation('bad-id', 'support ticket')).error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('requires a verified matching admin session before begin', async () => {
    mocks.getUser.mockResolvedValue(user(OTHER));
    expect((await startImpersonation(TARGET, 'support ticket')).error).toBe('not_authenticated');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('does not begin with missing session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect((await startImpersonation(TARGET, 'support ticket')).error).toBe('not_authenticated');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('preserves the SQL authorization denial', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'cannot_impersonate_admin' } });
    expect((await startImpersonation(TARGET, 'support ticket')).error).toBe(
      'cannot_impersonate_admin',
    );
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });
  it('binds the return cookie and verifies the actual target before redirect', async () => {
    mocks.getUser.mockResolvedValueOnce(user(ADMIN)).mockResolvedValueOnce(user(TARGET));
    expect((await startImpersonation(TARGET, 'support ticket')).error).toBeUndefined();
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'impersonation_session_id', value: SESSION }),
    );
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ type: 'magiclink', token_hash: 'target-token' });
    expect(mocks.redirect).toHaveBeenCalled();
  });
  it.each(['lookup', 'link', 'throw'])('compensates the opened row on %s failure', async (kind) => {
    if (kind === 'lookup')
      mocks.getUserById.mockResolvedValue({ data: { user: null }, error: null });
    if (kind === 'link')
      mocks.generateLink.mockResolvedValue({ data: null, error: { code: 'failed' } });
    if (kind === 'throw') mocks.generateLink.mockRejectedValue(new Error('failure'));
    expect((await startImpersonation(TARGET, 'support ticket')).error).toBeDefined();
    expect(mocks.rpc).toHaveBeenCalledWith('end_impersonation_session', {
      p_session_id: SESSION,
      p_reason: 'manual',
    });
    expect(mocks.cookieDelete).toHaveBeenCalledWith('admin_return_session');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it('restores and verifies admin before compensating a partial OTP failure', async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { code: 'partial' } });
    expect((await startImpersonation(TARGET, 'support ticket')).error).toBe('start_failed');
    expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: 'admin-at',
      refresh_token: 'admin-rt',
    });
    const endCall = mocks.rpc.mock.calls.findIndex(
      (call) => call[0] === 'end_impersonation_session',
    );
    expect(mocks.setSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.rpc.mock.invocationCallOrder[endCall]!,
    );
  });
  it('signs out and requires recovery instead of closing as the target when admin restore fails', async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { code: 'partial' } });
    mocks.setSession.mockResolvedValue({ error: { code: 'invalid' } });
    expect((await startImpersonation(TARGET, 'support ticket')).error).toBe('session_expired');
    expect(
      mocks.rpc.mock.calls.filter((call) => call[0] === 'end_impersonation_session'),
    ).toHaveLength(0);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
describe('endImpersonation', () => {
  it('clears local identity when the signed return is unavailable', async () => {
    expect((await endImpersonation()).error).toBe('session_expired');
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.cookieDelete).toHaveBeenCalledWith('sb-localhost-auth-token.0');
    expect(mocks.cookieDelete).not.toHaveBeenCalledWith('sb-other-auth-token');
  });
  it('rejects a different unsigned session id before restoration', async () => {
    installCookie(OTHER);
    expect((await endImpersonation()).error).toBe('session_expired');
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('restores verified admin before owner RPC', async () => {
    installCookie();
    mocks.getUser.mockResolvedValueOnce(user(TARGET)).mockResolvedValueOnce(user(ADMIN));
    await endImpersonation();
    expect(mocks.rpc).toHaveBeenCalledWith('end_impersonation_session', {
      p_session_id: SESSION,
      p_reason: 'manual',
    });
    expect(mocks.setSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getUser.mock.invocationCallOrder[1]!,
    );
    expect(mocks.getUser.mock.invocationCallOrder[1]).toBeLessThan(
      mocks.rpc.mock.invocationCallOrder[0]!,
    );
    expect(mocks.redirect).toHaveBeenCalled();
  });
  it('does not close if restored identity is not the signed admin', async () => {
    installCookie();
    mocks.getUser.mockResolvedValueOnce(user(TARGET)).mockResolvedValueOnce(user(OTHER));
    expect((await endImpersonation()).error).toBe('session_expired');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('reports owner-RPC failure rather than redirecting as if it closed', async () => {
    installCookie();
    mocks.getUser.mockResolvedValueOnce(user(TARGET)).mockResolvedValueOnce(user(ADMIN));
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    expect((await endImpersonation()).error).toBe('end_failed');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it('clears cookies even if signOut rejects', async () => {
    mocks.signOut.mockRejectedValue(new Error('unavailable'));
    expect((await endImpersonation()).error).toBe('session_expired');
    expect(mocks.cookieDelete).toHaveBeenCalledWith('admin_return_session');
    expect(mocks.cookieDelete).toHaveBeenCalledWith('sb-localhost-auth-token.0');
  });
});
