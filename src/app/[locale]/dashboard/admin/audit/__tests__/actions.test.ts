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

import { getPlatformAuditLogs } from '../actions';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_ID = '22222222-2222-4222-8222-222222222222';

describe('getPlatformAuditLogs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns validation_error for an unknown action without calling the RPC', async () => {
    const result = await getPlatformAuditLogs({ action: 'not_a_real_action' as never });
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('propagates not_platform_admin from the RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'not_platform_admin' } });
    const result = await getPlatformAuditLogs({});
    expect(result.error).toBe('not_platform_admin');
  });

  it('maps RPC rows into PlatformAuditLogEntry[] including impersonatorId', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: 5,
          actor_id: ACTOR_ID,
          actor_name: 'Alice',
          impersonator_id: null,
          account_id: ACCOUNT_ID,
          action: 'delete',
          resource_type: 'documents',
          resource_id: 'd1',
          created_at: '2026-07-01T10:00:00Z',
        },
      ],
      error: null,
    });

    const result = await getPlatformAuditLogs({ limit: 5 });

    expect(result.data?.entries[0]).toEqual({
      id: 5,
      actorId: ACTOR_ID,
      actorName: 'Alice',
      impersonatorId: null,
      accountId: ACCOUNT_ID,
      action: 'delete',
      resourceType: 'documents',
      resourceId: 'd1',
      createdAt: '2026-07-01T10:00:00Z',
    });
    expect(result.data?.nextCursor).toBeNull();
  });

  it('passes accountId, actorId, cursor and filters through to the RPC call', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    await getPlatformAuditLogs({
      accountId: ACCOUNT_ID,
      actorId: ACTOR_ID,
      action: 'create',
      resourceType: 'projects',
      cursor: { createdAt: '2026-07-01T09:00:00Z', id: 2 },
    });

    expect(mocks.rpc).toHaveBeenCalledWith('get_platform_audit_logs', {
      p_limit: 20,
      p_cursor_created_at: '2026-07-01T09:00:00Z',
      p_cursor_id: 2,
      p_account_id: ACCOUNT_ID,
      p_actor_id: ACTOR_ID,
      p_action: 'create',
      p_resource_type: 'projects',
    });
  });
});
