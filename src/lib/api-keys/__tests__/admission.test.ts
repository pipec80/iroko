import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  env: {
    VERCEL_ENV: 'preview' as string | undefined,
    LOCAL_VALIDATION: undefined as string | undefined,
    SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_LOCAL_VALIDATION: undefined as string | undefined,
  },
}));
vi.mock('@/env', () => ({ env: mocks.env }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { admitAccountApiRequest, resolveAccountApiClientIp } from '../admission';
import { hashApiKey } from '../index';

const accountId = '00000000-0000-4000-8000-000000000001';
const key = `irk_${'A'.repeat(43)}`;
function request(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/v1/account', { headers });
}

describe('account API client identity', () => {
  beforeEach(() => {
    mocks.env.VERCEL_ENV = 'preview';
    mocks.env.LOCAL_VALIDATION = undefined;
  });
  it('uses only the Vercel canonical header', () => {
    expect(
      resolveAccountApiClientIp(
        request({
          'x-vercel-forwarded-for': '192.0.2.1',
          'x-forwarded-for': '192.0.2.2',
          'cf-connecting-ip': '192.0.2.3',
        }),
      ),
    ).toBe('192.0.2.1');
    expect(resolveAccountApiClientIp(request({ 'x-forwarded-for': '192.0.2.2' }))).toBeNull();
  });
  it.each([
    '192.0.2.1, 192.0.2.2',
    'example.com',
    '192.0.2.1:443',
    'fe80::1%eth0',
    'x'.repeat(129),
  ])('rejects ambiguous identity %s', (value) => {
    expect(resolveAccountApiClientIp(request({ 'x-vercel-forwarded-for': value }))).toBeNull();
  });
  it.each(['::ffff:192.0.2.1', '::FFFF:c000:201'])('normalizes mapped IPv4 %s', (value) => {
    expect(resolveAccountApiClientIp(request({ 'x-vercel-forwarded-for': value }))).toBe(
      '192.0.2.1',
    );
  });
  it('canonicalizes equivalent IPv6 representations', () => {
    expect(
      resolveAccountApiClientIp(request({ 'x-vercel-forwarded-for': '2001:0DB8:0:0:0:0:0:1' })),
    ).toBe('2001:db8::1');
  });
  it('fails closed outside verified hosting or explicit local validation', () => {
    mocks.env.VERCEL_ENV = undefined;
    expect(
      resolveAccountApiClientIp(request({ 'x-vercel-forwarded-for': '192.0.2.1' })),
    ).toBeNull();
    mocks.env.LOCAL_VALIDATION = 'true';
    expect(resolveAccountApiClientIp(request({ 'x-forwarded-for': '192.0.2.2' }))).toBe(
      '127.0.0.1',
    );
    mocks.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    expect(resolveAccountApiClientIp(request())).toBeNull();
    mocks.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  });
});

describe('account API admission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.VERCEL_ENV = 'preview';
    mocks.env.LOCAL_VALIDATION = undefined;
  });
  it('hashes valid keys and returns the account derived by the RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ decision: 'allowed', account_id: accountId, retry_after_seconds: 0 }],
      error: null,
    });
    expect(
      await admitAccountApiRequest(
        request({ authorization: `Bearer ${key}`, 'x-vercel-forwarded-for': '192.0.2.1' }),
      ),
    ).toEqual({ decision: 'allowed', accountId });
    expect(mocks.rpc).toHaveBeenCalledWith('admit_account_api_request', {
      p_client_ip: '192.0.2.1',
      p_key_hash: await hashApiKey(key),
    });
  });
  it('reserves the IP budget even without credentials', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ decision: 'missing_key', account_id: null, retry_after_seconds: 0 }],
      error: null,
    });
    expect(
      await admitAccountApiRequest(request({ 'x-vercel-forwarded-for': '192.0.2.1' })),
    ).toEqual({ decision: 'missing_key' });
    expect(mocks.rpc).toHaveBeenCalledWith('admit_account_api_request', {
      p_client_ip: '192.0.2.1',
    });
  });
  it.each(['Bearer irk_short', 'Basic abc', `Bearer ${'x'.repeat(2000)}`])(
    'reserves the IP budget for malformed credentials',
    async (authorization) => {
      mocks.rpc.mockResolvedValue({
        data: [{ decision: 'invalid_key', account_id: null, retry_after_seconds: 0 }],
        error: null,
      });
      expect(
        await admitAccountApiRequest(
          request({ authorization, 'x-vercel-forwarded-for': '192.0.2.1' }),
        ),
      ).toEqual({ decision: 'invalid_key' });
      expect(mocks.rpc).toHaveBeenCalledWith('admit_account_api_request', {
        p_client_ip: '192.0.2.1',
        p_key_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
    },
  );
  it.each(['ip_limited', 'account_limited'])(
    'preserves %s and positive integer Retry-After',
    async (decision) => {
      mocks.rpc.mockResolvedValue({
        data: [{ decision, account_id: null, retry_after_seconds: 2 }],
        error: null,
      });
      expect(
        await admitAccountApiRequest(request({ 'x-vercel-forwarded-for': '192.0.2.1' })),
      ).toEqual({ decision, retryAfterSeconds: 2 });
    },
  );
  it.each([
    null,
    [],
    [{ decision: 'unexpected' }],
    [{ decision: 'allowed', account_id: 'bad', retry_after_seconds: 0 }],
    [{ decision: 'ip_limited', account_id: null, retry_after_seconds: 0 }],
    [{ decision: 'account_limited', account_id: null, retry_after_seconds: 1.5 }],
    [{ decision: 'missing_key', account_id: accountId, retry_after_seconds: 0 }],
  ])('fails closed for malformed RPC output %j', async (data) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    expect(
      await admitAccountApiRequest(request({ 'x-vercel-forwarded-for': '192.0.2.1' })),
    ).toEqual({ decision: 'unavailable' });
  });
  it('distinguishes database errors and rejected promises from invalid keys', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'XX000' } });
    expect(
      await admitAccountApiRequest(request({ 'x-vercel-forwarded-for': '192.0.2.1' })),
    ).toEqual({ decision: 'unavailable' });
    mocks.rpc.mockRejectedValueOnce(new Error('transport failure'));
    expect(
      await admitAccountApiRequest(request({ 'x-vercel-forwarded-for': '192.0.2.1' })),
    ).toEqual({ decision: 'unavailable' });
  });
  it('does not call the database without trusted identity', async () => {
    expect(await admitAccountApiRequest(request())).toEqual({ decision: 'unavailable' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
