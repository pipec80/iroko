import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  admitAccountApiRequest: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/lib/api-keys/admission', () => ({
  admitAccountApiRequest: mocks.admitAccountApiRequest,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: mocks.eq })),
    })),
  })),
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

import { GET } from '../route';

const request = new Request('http://localhost/api/v1/account');

describe('GET /api/v1/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockReturnValue({ single: mocks.single });
  });

  it('should return 401 when the API key is missing or invalid', async () => {
    mocks.admitAccountApiRequest.mockResolvedValue({ decision: 'missing_key' });
    const response = await GET(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'missing_key' });
  });

  it('should return the account summary for a valid key', async () => {
    mocks.admitAccountApiRequest.mockResolvedValue({ decision: 'allowed', accountId: 'acct-1' });
    mocks.single.mockResolvedValue({
      data: { id: 'acct-1', name: 'Acme', slug: 'acme', type: 'team' },
      error: null,
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: 'acct-1',
      name: 'Acme',
      slug: 'acme',
      type: 'team',
    });
    expect(mocks.eq).toHaveBeenCalledWith('id', 'acct-1');
  });

  it('should return 500 when the account lookup fails', async () => {
    mocks.admitAccountApiRequest.mockResolvedValue({ decision: 'allowed', accountId: 'acct-1' });
    mocks.single.mockResolvedValue({ data: null, error: { message: 'db down' } });
    const response = await GET(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal_error' });
  });

  it('returns 401 only after invalid credentials are confirmed', async () => {
    mocks.admitAccountApiRequest.mockResolvedValue({ decision: 'invalid_key' });
    const response = await GET(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_key' });
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  it.each(['ip_limited', 'account_limited'])(
    'returns 429 without reading the account for %s',
    async (decision) => {
      mocks.admitAccountApiRequest.mockResolvedValue({ decision, retryAfterSeconds: 3 });
      const response = await GET(request);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('3');
      expect(await response.json()).toEqual({ error: 'rate_limited' });
      expect(mocks.eq).not.toHaveBeenCalled();
    },
  );

  it('returns 503 without reading the account when admission is unavailable', async () => {
    mocks.admitAccountApiRequest.mockResolvedValue({ decision: 'unavailable' });
    const response = await GET(request);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'service_unavailable' });
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  it('returns 500 on an account transport failure after admission', async () => {
    mocks.admitAccountApiRequest.mockResolvedValue({ decision: 'allowed', accountId: 'acct-1' });
    mocks.single.mockRejectedValue(new Error('transport failure'));
    const response = await GET(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal_error' });
  });
});
