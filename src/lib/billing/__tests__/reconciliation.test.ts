import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  snapshot: vi.fn(),
  getProvider: vi.fn(),
  reduce: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })) }));
vi.mock('../registry', () => ({ getPaymentProvider: mocks.getProvider }));
vi.mock('../reducer', () => ({ reduceBillingEvent: mocks.reduce }));
import { reconcileNonTerminalSubscriptions } from '../reconciliation';

const candidate = {
  account_id: 'account-1',
  provider: 'mercadopago',
  external_subscription_id: 'pa-1',
  subscription_updated_at: '2026-09-09T12:00:00Z',
};

describe('reconcileNonTerminalSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: [candidate], error: null });
    mocks.getProvider.mockReturnValue({ getSubscriptionSnapshot: mocks.snapshot });
    mocks.snapshot.mockResolvedValue({
      externalSubscriptionId: 'pa-1',
      status: 'active',
      currentPeriodEnd: '2026-10-09T12:00:00Z',
      cancelAtPeriodEnd: false,
      providerVersion: 'v2',
    });
  });
  it('repairs through the reducer with the scanned updated_at CAS', async () => {
    mocks.reduce.mockResolvedValue({ status: 'applied' });
    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45000 }),
    ).resolves.toEqual({ scanned: 1, repaired: 1, stale: 0, anomalous: 0, skipped: 0 });
    expect(mocks.reduce).toHaveBeenCalledWith(
      expect.objectContaining({ externalEventId: 'reconciliation:mercadopago:pa-1:v2' }),
      { expectedSubscriptionUpdatedAt: candidate.subscription_updated_at },
    );
  });
  it('does not overwrite a webhook update that wins after the scan', async () => {
    mocks.reduce.mockResolvedValue({ status: 'stale' });
    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45000 }),
    ).resolves.toEqual(expect.objectContaining({ repaired: 0, stale: 1 }));
  });

  it('skips a provider that is not configured for reconciliation', async () => {
    mocks.getProvider.mockImplementation(() => {
      throw new Error('provider_not_configured');
    });

    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45000 }),
    ).resolves.toEqual({ scanned: 1, repaired: 0, stale: 0, anomalous: 0, skipped: 1 });
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });

  it('skips a provider that does not expose subscription snapshots', async () => {
    mocks.getProvider.mockReturnValue({});

    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45000 }),
    ).resolves.toEqual({ scanned: 1, repaired: 0, stale: 0, anomalous: 0, skipped: 1 });
    expect(mocks.reduce).not.toHaveBeenCalled();
  });

  it('records a missing provider resource as an anomaly without mutating the subscription', async () => {
    mocks.snapshot.mockResolvedValue(null);

    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45000 }),
    ).resolves.toEqual({ scanned: 1, repaired: 0, stale: 0, anomalous: 1, skipped: 0 });
    expect(mocks.rpc).toHaveBeenCalledWith('upsert_billing_financial_anomaly', {
      p_anomaly_type: 'status_divergence',
      p_external_resource_id: 'pa-1',
      p_provider: 'mercadopago',
      p_observed_status: 'resource_not_found',
      p_account_id: 'account-1',
      p_subscription_id: undefined,
    });
    expect(mocks.reduce).not.toHaveBeenCalled();
  });
});
