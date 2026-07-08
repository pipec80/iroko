import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getActiveAccountId: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mocks.rpc }),
}));

vi.mock('@/lib/active-account', () => ({ getActiveAccountId: mocks.getActiveAccountId }));

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

import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookDeliveries,
  listWebhookEndpoints,
  updateWebhookEndpoint,
} from '../actions-webhooks';

const ENDPOINT_ID = '5f0c2b8e-3c4d-4b6a-9f1e-2a3b4c5d6e7f';

describe('webhooks server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveAccountId.mockResolvedValue('acct-1');
  });

  it('should return validation_error for an http url without calling the RPC', async () => {
    const result = await createWebhookEndpoint({
      url: 'http://example.com/hook',
      events: ['member.joined'],
    });
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('should return no_account when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const result = await createWebhookEndpoint({
      url: 'https://example.com/hook',
      events: ['member.joined'],
    });
    expect(result.error).toBe('no_account');
  });

  it('should create an endpoint and return the secret once', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ id: ENDPOINT_ID, secret: 'whsec_abc' }],
      error: null,
    });
    const result = await createWebhookEndpoint({
      url: 'https://example.com/hook',
      description: 'ci',
      events: ['member.joined'],
    });
    expect(result.data).toEqual({ id: ENDPOINT_ID, secret: 'whsec_abc' });
    expect(mocks.rpc).toHaveBeenCalledWith('create_webhook_endpoint', {
      p_account_id: 'acct-1',
      p_url: 'https://example.com/hook',
      p_description: 'ci',
      p_events: ['member.joined'],
    });
  });

  it('should surface RPC errors (not_authorized)', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'not_authorized' } });
    const result = await listWebhookEndpoints();
    expect(result.data).toBeNull();
    expect(result.error).toBe('not_authorized');
  });

  it('should map endpoint rows to camelCase', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: ENDPOINT_ID,
          url: 'https://example.com/hook',
          description: null,
          events: ['member.joined'],
          enabled: true,
          created_at: '2026-07-08T00:00:00Z',
          updated_at: '2026-07-08T00:00:00Z',
        },
      ],
      error: null,
    });
    const result = await listWebhookEndpoints();
    expect(result.data?.[0]).toEqual({
      id: ENDPOINT_ID,
      url: 'https://example.com/hook',
      description: null,
      events: ['member.joined'],
      enabled: true,
      createdAt: '2026-07-08T00:00:00Z',
      updatedAt: '2026-07-08T00:00:00Z',
    });
  });

  it('should update an endpoint passing enabled through', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const result = await updateWebhookEndpoint({
      id: ENDPOINT_ID,
      url: 'https://example.com/hook',
      events: ['member.joined'],
      enabled: false,
    });
    expect(result.data).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('update_webhook_endpoint', {
      p_endpoint_id: ENDPOINT_ID,
      p_url: 'https://example.com/hook',
      p_description: undefined,
      p_events: ['member.joined'],
      p_enabled: false,
    });
  });

  it('should delete an endpoint by id', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const result = await deleteWebhookEndpoint({ id: ENDPOINT_ID });
    expect(result.data).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('delete_webhook_endpoint', {
      p_endpoint_id: ENDPOINT_ID,
    });
  });

  it('should page deliveries with a keyset cursor', async () => {
    const rows = [
      {
        id: 'd2',
        endpoint_id: ENDPOINT_ID,
        event_type: 'member.joined',
        status: 'success',
        attempts: 1,
        last_status_code: 200,
        last_error: null,
        created_at: '2026-07-08T10:00:00Z',
        delivered_at: '2026-07-08T10:00:05Z',
      },
      {
        id: 'd1',
        endpoint_id: ENDPOINT_ID,
        event_type: 'member.removed',
        status: 'failed',
        attempts: 2,
        last_status_code: 500,
        last_error: 'http_500',
        created_at: '2026-07-08T09:00:00Z',
        delivered_at: null,
      },
    ];
    mocks.rpc.mockResolvedValue({ data: rows, error: null });

    const result = await listWebhookDeliveries({ endpointId: ENDPOINT_ID, limit: 2 });

    expect(result.data?.entries).toHaveLength(2);
    expect(result.data?.entries[0]?.status).toBe('success');
    expect(result.data?.nextCursor).toEqual({ createdAt: '2026-07-08T09:00:00Z', id: 'd1' });
    expect(mocks.rpc).toHaveBeenCalledWith('list_webhook_deliveries', {
      p_account_id: 'acct-1',
      p_endpoint_id: ENDPOINT_ID,
      p_limit: 2,
      p_cursor_created_at: undefined,
      p_cursor_id: undefined,
    });
  });

  it('should set nextCursor to null on the last page', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const result = await listWebhookDeliveries({});
    expect(result.data?.entries).toEqual([]);
    expect(result.data?.nextCursor).toBeNull();
  });
});
