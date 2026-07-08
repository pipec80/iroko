import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticateApiKey: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/lib/api-keys', () => ({ authenticateApiKey: mocks.authenticateApiKey }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mocks.single })) })),
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
  beforeEach(() => vi.clearAllMocks());

  it('should return 401 when the API key is missing or invalid', async () => {
    mocks.authenticateApiKey.mockResolvedValue({ error: 'missing_key' });
    const response = await GET(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'missing_key' });
  });

  it('should return the account summary for a valid key', async () => {
    mocks.authenticateApiKey.mockResolvedValue({ accountId: 'acct-1' });
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
  });

  it('should return 500 when the account lookup fails', async () => {
    mocks.authenticateApiKey.mockResolvedValue({ accountId: 'acct-1' });
    mocks.single.mockResolvedValue({ data: null, error: { message: 'db down' } });
    const response = await GET(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal_error' });
  });
});
