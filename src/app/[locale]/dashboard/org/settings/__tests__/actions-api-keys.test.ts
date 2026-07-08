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

import { createApiKey, listApiKeys, revokeApiKey } from '../actions-api-keys';

describe('api keys server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveAccountId.mockResolvedValue('acct-1');
  });

  it('should return no_account when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const result = await createApiKey({ name: 'ci' });
    expect(result.data).toBeNull();
    expect(result.error).toBe('no_account');
  });

  it('should return validation_error for an empty name without calling the RPC', async () => {
    const result = await createApiKey({ name: '  ' });
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('should create a key and return the plaintext once', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'k1', key: 'irk_secret' }], error: null });
    const result = await createApiKey({ name: 'ci' });
    expect(result.data).toEqual({ id: 'k1', key: 'irk_secret' });
    expect(mocks.rpc).toHaveBeenCalledWith('create_api_key', {
      p_account_id: 'acct-1',
      p_name: 'ci',
      p_expires_at: undefined,
    });
  });

  it('should surface the RPC error message (not_authorized)', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'not_authorized' } });
    const result = await createApiKey({ name: 'ci' });
    expect(result.data).toBeNull();
    expect(result.error).toBe('not_authorized');
  });

  it('should map list rows to camelCase ApiKey objects', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: 'k1',
          name: 'ci',
          key_prefix: 'irk_abc12345',
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
          created_at: '2026-07-08T00:00:00Z',
        },
      ],
      error: null,
    });
    const result = await listApiKeys();
    expect(result.data?.[0]).toEqual({
      id: 'k1',
      name: 'ci',
      keyPrefix: 'irk_abc12345',
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: '2026-07-08T00:00:00Z',
    });
  });

  it('should revoke by id', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const result = await revokeApiKey({ id: '5f0c2b8e-3c4d-4b6a-9f1e-2a3b4c5d6e7f' });
    expect(result.data).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('revoke_api_key', {
      p_key_id: '5f0c2b8e-3c4d-4b6a-9f1e-2a3b4c5d6e7f',
    });
  });

  it('should reject a malformed id in revokeApiKey without calling the RPC', async () => {
    const result = await revokeApiKey({ id: 'not-a-uuid' });
    expect(result.error).toBe('validation_error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
