import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })),
}));

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

import { authenticateApiKey, hashApiKey } from '../index';

function requestWithAuth(header?: string) {
  return new Request('http://localhost/api/v1/account', {
    headers: header ? { authorization: header } : {},
  });
}

describe('hashApiKey', () => {
  it('should produce a 64-char lowercase hex sha-256', async () => {
    const hash = await hashApiKey('irk_test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should be deterministic for the same input', async () => {
    expect(await hashApiKey('irk_abc')).toBe(await hashApiKey('irk_abc'));
  });
});

describe('authenticateApiKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return missing_key when there is no Authorization header', async () => {
    const result = await authenticateApiKey(requestWithAuth());
    expect(result).toEqual({ error: 'missing_key' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('should return missing_key when the bearer token lacks the irk_ prefix', async () => {
    const result = await authenticateApiKey(requestWithAuth('Bearer sk_wrong'));
    expect(result).toEqual({ error: 'missing_key' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('should return invalid_key when the RPC finds no account', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const result = await authenticateApiKey(requestWithAuth('Bearer irk_abc123'));
    expect(result).toEqual({ error: 'invalid_key' });
  });

  it('should return invalid_key when the RPC errors', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'boom', code: '500' } });
    const result = await authenticateApiKey(requestWithAuth('Bearer irk_abc123'));
    expect(result).toEqual({ error: 'invalid_key' });
  });

  it('should return the accountId and call the RPC with the sha-256 hash', async () => {
    mocks.rpc.mockResolvedValue({ data: 'acct-1', error: null });
    const result = await authenticateApiKey(requestWithAuth('Bearer irk_abc123'));
    expect(result).toEqual({ accountId: 'acct-1' });
    expect(mocks.rpc).toHaveBeenCalledWith('verify_api_key', {
      p_key_hash: await hashApiKey('irk_abc123'),
    });
  });
});
