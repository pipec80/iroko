import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getSession: vi.fn(),
  setSession: vi.fn(),
  signOut: vi.fn(),
  getUserById: vi.fn(),
  generateLink: vi.fn(),
  verifyOtp: vi.fn(),
  cookieSet: vi.fn(),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    rpc: mocks.rpc,
    auth: {
      getSession: mocks.getSession,
      setSession: mocks.setSession,
      signOut: mocks.signOut,
      verifyOtp: mocks.verifyOtp,
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { generateLink: mocks.generateLink, getUserById: mocks.getUserById } },
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mocks.cookieSet,
    get: mocks.cookieGet,
    delete: mocks.cookieDelete,
  }),
}));

vi.mock('@/i18n/routing', () => ({
  redirect: mocks.redirect,
}));

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn().mockResolvedValue('es'),
}));

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    SUPABASE_SECRET_KEY: 'test-secret-key-at-least-32-chars-long',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));

import { signImpersonationCookie } from '@/lib/impersonation-cookie';

import { endImpersonation, startImpersonation } from '../impersonation-actions';

const TARGET_ID = '22222222-2222-4222-8222-222222222222';

describe('startImpersonation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns validation_error for a reason under 3 characters', async () => {
    const result = await startImpersonation(TARGET_ID, 'ab');
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('propagates cannot_impersonate_admin from the RPC without swapping sessions', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'cannot_impersonate_admin' } });
    const result = await startImpersonation(TARGET_ID, 'ticket #123');
    expect(result.error).toBe('cannot_impersonate_admin');
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });

  it('saves the admin session, swaps to the target, and calls generateLink with the right email', async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: 'session-1', target_user_id: TARGET_ID },
      error: null,
    });
    mocks.getSession.mockResolvedValue({
      data: {
        session: { access_token: 'admin-at', refresh_token: 'admin-rt', user: { id: 'admin-1' } },
      },
    });
    mocks.getUserById.mockResolvedValue({
      data: { user: { email: 'target@example.com' } },
    });
    mocks.generateLink.mockResolvedValue({
      data: { properties: { hashed_token: 'hashed-token-value' } },
      error: null,
    });
    mocks.verifyOtp.mockResolvedValue({ error: null });

    const result = await startImpersonation(TARGET_ID, 'ticket #123');

    expect(result.error).toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith('begin_impersonation_session', {
      p_target_user_id: TARGET_ID,
      p_reason: 'ticket #123',
    });
    expect(mocks.generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: 'magiclink' }));
    expect(mocks.verifyOtp).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'magiclink', token_hash: 'hashed-token-value' }),
    );
    // admin_return_session and impersonation_session_id cookies both written
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'admin_return_session' }),
    );
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'impersonation_session_id', value: 'session-1' }),
    );
  });
});

describe('endImpersonation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forces sign-out when the return cookie is missing or invalid', async () => {
    // cookieGet is a fresh vi.fn() after clearAllMocks() — returns undefined
    // by default, no explicit stub needed (and mockReturnValue(undefined) is
    // auto-fixed away by the unicorn/no-useless-undefined eslint rule).
    const result = await endImpersonation();
    expect(result.error).toBe('session_expired');
    expect(mocks.signOut).toHaveBeenCalled();
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it('restores the admin session BEFORE calling end_impersonation_session', async () => {
    const callOrder: string[] = [];
    mocks.cookieGet.mockImplementation((name: string) => {
      if (name === 'admin_return_session') {
        return {
          value: signImpersonationCookie({
            accessToken: 'admin-at',
            refreshToken: 'admin-rt',
            adminUserId: 'admin-1',
          }),
        };
      }
      if (name === 'impersonation_session_id') return { value: 'session-1' };
      return;
    });
    mocks.setSession.mockImplementation(async () => {
      callOrder.push('setSession');
      return { error: null };
    });
    mocks.rpc.mockImplementation(async () => {
      callOrder.push('rpc');
      return { data: null, error: null };
    });

    await endImpersonation();

    expect(callOrder).toEqual(['setSession', 'rpc']);
    expect(mocks.rpc).toHaveBeenCalledWith('end_impersonation_session', {
      p_session_id: 'session-1',
      p_reason: 'manual',
    });
  });
});
