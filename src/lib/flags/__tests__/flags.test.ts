import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mock del cliente Supabase. rpc() retorna el resultado configurado en
 * mocks.result.current, simulando la respuesta del RPC is_flag_enabled.
 */
const mocks = vi.hoisted(() => {
  const result = { current: { data: null as boolean | null, error: null as Error | null } };
  const rpc = vi.fn().mockImplementation(() => Promise.resolve(result.current));
  return { rpc, result };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mocks.rpc }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { isEnabled } from '../index';

const CTX = { accountId: 'acct-uuid-1' };

describe('isEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.result.current = { data: null, error: null };
  });

  it('should return true when RPC resolves the flag as enabled', async () => {
    // Arrange
    mocks.result.current = { data: true, error: null };

    // Act
    const result = await isEnabled('webhooks', CTX);

    // Assert
    expect(result).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('is_flag_enabled', {
      p_flag_name: 'webhooks',
      p_account_id: CTX.accountId,
    });
  });

  it('should return false when RPC resolves the flag as disabled', async () => {
    mocks.result.current = { data: false, error: null };
    expect(await isEnabled('webhooks', CTX)).toBe(false);
  });

  it('should return false when RPC returns null (flag not found — fail-safe)', async () => {
    mocks.result.current = { data: null, error: null };
    expect(await isEnabled('unknown_flag', CTX)).toBe(false);
  });

  it('should throw and log when Supabase returns an error', async () => {
    const { logger } = await import('@/lib/logger');
    mocks.result.current = { data: null, error: new Error('not_authorized') };

    await expect(isEnabled('webhooks', CTX)).rejects.toThrow('not_authorized');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ flag: 'webhooks', accountId: CTX.accountId }),
      'not_authorized',
    );
  });

  it('should pass the correct RPC parameters for any flag name', async () => {
    mocks.result.current = { data: true, error: null };
    await isEnabled('notifications', { accountId: 'acct-uuid-2' });

    expect(mocks.rpc).toHaveBeenCalledWith('is_flag_enabled', {
      p_flag_name: 'notifications',
      p_account_id: 'acct-uuid-2',
    });
  });
});
