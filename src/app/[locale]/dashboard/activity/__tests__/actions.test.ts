import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getClaims: mocks.getClaims },
    rpc: mocks.rpc,
  }),
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

import { getAccountAuditLogs } from '../actions';

const ACCOUNT_ID = 'acct-uuid-900';

function mockAuthenticatedWithAccount(accountId = ACCOUNT_ID) {
  mocks.getClaims.mockResolvedValue({
    data: { claims: { app_metadata: { account_id: accountId } } },
  });
}

function mockNoAccount() {
  mocks.getClaims.mockResolvedValue({ data: { claims: { app_metadata: {} } } });
}

describe('getAccountAuditLogs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns no_account error when account_id is missing from claims', async () => {
    mockNoAccount();
    const result = await getAccountAuditLogs({});
    expect(result.data).toBeNull();
    expect(result.error).toBe('no_account');
  });

  it('returns validation_error for an out-of-range limit without calling the RPC', async () => {
    mockAuthenticatedWithAccount();
    const result = await getAccountAuditLogs({ limit: 500 });
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns the RPC error message when the caller is not authorized', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'not_authorized' } });
    const result = await getAccountAuditLogs({});
    expect(result.error).toBe('not_authorized');
  });

  it('maps RPC rows into AuditLogEntry[] and computes the next cursor', async () => {
    mockAuthenticatedWithAccount();
    const rows = [
      {
        id: 3,
        actor_id: 'u1',
        actor_name: 'Alice',
        avatar_url: null,
        action: 'delete',
        resource_type: 'documents',
        resource_id: 'd1',
        created_at: '2026-07-01T10:00:00Z',
      },
      {
        id: 2,
        actor_id: 'u1',
        actor_name: 'Alice',
        avatar_url: null,
        action: 'update',
        resource_type: 'projects',
        resource_id: 'p1',
        created_at: '2026-07-01T09:00:00Z',
      },
    ];
    mocks.rpc.mockResolvedValue({ data: rows, error: null });

    const result = await getAccountAuditLogs({ limit: 2 });

    expect(result.error).toBeUndefined();
    expect(result.data?.entries).toHaveLength(2);
    expect(result.data?.entries[0]).toEqual({
      id: 3,
      actorId: 'u1',
      actorName: 'Alice',
      avatarUrl: null,
      action: 'delete',
      resourceType: 'documents',
      resourceId: 'd1',
      createdAt: '2026-07-01T10:00:00Z',
    });
    expect(result.data?.nextCursor).toEqual({ createdAt: '2026-07-01T09:00:00Z', id: 2 });
  });

  it('sets nextCursor to null when fewer rows than the limit are returned (last page)', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: 1,
          actor_id: null,
          actor_name: null,
          avatar_url: null,
          action: 'create',
          resource_type: 'projects',
          resource_id: 'p1',
          created_at: '2026-07-01T08:00:00Z',
        },
      ],
      error: null,
    });
    const result = await getAccountAuditLogs({ limit: 20 });
    expect(result.data?.nextCursor).toBeNull();
  });

  it('passes the cursor and filters through to the RPC call', async () => {
    mockAuthenticatedWithAccount();
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    await getAccountAuditLogs({
      cursor: { createdAt: '2026-07-01T09:00:00Z', id: 2 },
      action: 'create',
      resourceType: 'projects',
    });

    expect(mocks.rpc).toHaveBeenCalledWith('get_account_audit_logs', {
      p_account_id: ACCOUNT_ID,
      p_limit: 20,
      p_cursor_created_at: '2026-07-01T09:00:00Z',
      p_cursor_id: 2,
      p_action: 'create',
      p_resource_type: 'projects',
    });
  });
});
