import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mocks.rpc }),
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
    SUPABASE_SECRET_KEY: 'test-key',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));

import { getAdminAccounts } from '../actions';

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';

describe('getAdminAccounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns validation_error for an out-of-range limit without calling the RPC', async () => {
    const result = await getAdminAccounts({ limit: 500 });
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('propagates the RPC error message when the caller is not a platform admin', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'not_platform_admin' } });
    const result = await getAdminAccounts({});
    expect(result.error).toBe('not_platform_admin');
  });

  it('propagates mfa_required from the RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'mfa_required' } });
    const result = await getAdminAccounts({});
    expect(result.error).toBe('mfa_required');
  });

  it('maps RPC rows into AdminAccountEntry[] and computes the next cursor', async () => {
    const rows = [
      {
        account_id: ACCOUNT_A,
        name: 'Acme',
        slug: 'acme',
        type: 'team',
        owner_id: 'u1',
        owner_email: 'owner@acme.test',
        plan_slug: 'pro',
        subscription_status: 'active',
        member_count: 3,
        created_at: '2026-07-01T10:00:00Z',
      },
      {
        account_id: ACCOUNT_B,
        name: 'Beta',
        slug: 'beta',
        type: 'personal',
        owner_id: null,
        owner_email: 'beta@acme.test',
        plan_slug: null,
        subscription_status: null,
        member_count: 1,
        created_at: '2026-07-01T09:00:00Z',
      },
    ];
    mocks.rpc.mockResolvedValue({ data: rows, error: null });

    const result = await getAdminAccounts({ limit: 2 });

    expect(result.error).toBeUndefined();
    expect(result.data?.entries).toHaveLength(2);
    expect(result.data?.entries[0]).toEqual({
      accountId: ACCOUNT_A,
      name: 'Acme',
      slug: 'acme',
      type: 'team',
      ownerId: 'u1',
      ownerEmail: 'owner@acme.test',
      planSlug: 'pro',
      subscriptionStatus: 'active',
      memberCount: 3,
      createdAt: '2026-07-01T10:00:00Z',
    });
    expect(result.data?.nextCursor).toEqual({ createdAt: '2026-07-01T09:00:00Z', id: ACCOUNT_B });
  });

  it('sets nextCursor to null when fewer rows than the limit are returned', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          account_id: ACCOUNT_A,
          name: 'Acme',
          slug: 'acme',
          type: 'team',
          owner_email: null,
          plan_slug: null,
          subscription_status: null,
          member_count: 1,
          created_at: '2026-07-01T08:00:00Z',
        },
      ],
      error: null,
    });
    const result = await getAdminAccounts({ limit: 20 });
    expect(result.data?.nextCursor).toBeNull();
  });

  it('passes search, cursor, and limit through to the RPC call', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    await getAdminAccounts({
      search: 'acme',
      cursor: { createdAt: '2026-07-01T09:00:00Z', id: ACCOUNT_B },
    });

    expect(mocks.rpc).toHaveBeenCalledWith('admin_list_accounts', {
      p_search: 'acme',
      p_limit: 20,
      p_cursor_created_at: '2026-07-01T09:00:00Z',
      p_cursor_id: ACCOUNT_B,
    });
  });
});
