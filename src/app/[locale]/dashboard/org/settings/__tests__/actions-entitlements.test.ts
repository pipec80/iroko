import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getEntitlements: vi.fn(),
  getActiveAccountId: vi.fn(),
}));

vi.mock('@/lib/billing/entitlements', () => ({ getEntitlements: mocks.getEntitlements }));
vi.mock('@/lib/active-account', () => ({ getActiveAccountId: mocks.getActiveAccountId }));
vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));

import { getOrgEntitlements } from '../actions-entitlements';

describe('getOrgEntitlements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return the entitlements of the active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue('acc-1');
    mocks.getEntitlements.mockResolvedValue({
      planSlug: 'free',
      features: { webhooks_enabled: false },
      limits: { api_keys_max: 2 },
    });
    const res = await getOrgEntitlements();
    expect(mocks.getEntitlements).toHaveBeenCalledWith('acc-1');
    expect(res.data?.planSlug).toBe('free');
    expect(res.data?.features.webhooks_enabled).toBe(false);
  });

  it('should return an error when there is no active account', async () => {
    mocks.getActiveAccountId.mockResolvedValue(null);
    const res = await getOrgEntitlements();
    expect(res.data).toBeNull();
    expect(res.error).toBe('no_active_account');
  });
});
