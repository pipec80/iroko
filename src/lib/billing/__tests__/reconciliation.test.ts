import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  snapshot: vi.fn(),
  discover: vi.fn(),
  getProvider: vi.fn(),
  reduce: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })) }));
vi.mock('../registry', () => ({ getPaymentProvider: mocks.getProvider }));
vi.mock('../reducer', () => ({ reduceBillingEvent: mocks.reduce }));
import { reconcileNonTerminalSubscriptions } from '../reconciliation';

const candidate = {
  subscription_id: 'subscription-1',
  account_id: 'account-1',
  provider: 'mercadopago',
  external_subscription_id: 'pa-1',
  subscription_updated_at: '2026-09-09T12:00:00Z',
  invoice_watermark: '2026-09-10T12:00:00Z',
  scan_cursor: null,
  scan_watermark: null,
};

function completionCalls() {
  return mocks.rpc.mock.calls.filter(
    ([name]) => name === 'complete_billing_reconciliation_candidate',
  );
}

describe('reconcileNonTerminalSubscriptions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mocks.rpc.mockImplementation((name: string) =>
      name === 'claim_billing_reconciliation_candidates' ?
        { data: [candidate], error: null }
      : { data: 'completed', error: null },
    );
    mocks.getProvider.mockReturnValue({
      getSubscriptionSnapshot: mocks.snapshot,
      discoverSubscriptionInvoices: mocks.discover,
    });
    mocks.snapshot.mockResolvedValue({
      externalSubscriptionId: 'pa-1',
      status: 'active',
      currentPeriodEnd: '2026-10-09T12:00:00Z',
      cancelAtPeriodEnd: false,
      providerVersion: 'v2',
    });
    mocks.discover.mockResolvedValue({
      events: [],
      nextCursor: null,
      providerWatermark: '2026-09-11T12:00:00Z',
    });
    mocks.reduce.mockResolvedValue({ status: 'applied' });
  });

  it('claims a UUID-owned batch and completes a stable snapshot so it cannot remain leased', async () => {
    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual({
      scanned: 1,
      repaired: 1,
      stale: 0,
      anomalous: 0,
      skipped: 0,
      failed: 0,
      deferred: 0,
    });
    const claim = mocks.rpc.mock.calls.find(
      ([name]) => name === 'claim_billing_reconciliation_candidates',
    );
    expect(claim?.[1]).toEqual(
      expect.objectContaining({
        p_batch_size: 20,
        p_visibility_seconds: 90,
        p_worker_id: expect.any(String),
      }),
    );
    expect(claim?.[1].p_worker_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(mocks.reduce).toHaveBeenCalledWith(
      expect.objectContaining({ externalEventId: 'reconciliation:mercadopago:pa-1:v2' }),
      { expectedSubscriptionUpdatedAt: candidate.subscription_updated_at },
    );
    expect(completionCalls()).toHaveLength(1);
    expect(completionCalls()[0]?.[1]).toEqual(
      expect.objectContaining({
        p_subscription_id: candidate.subscription_id,
        p_outcome: 'completed',
        p_next_cursor: null,
        p_provider_watermark: '2026-09-11T12:00:00Z',
      }),
    );
  });

  it('isolates a provider rejection, records a safe failure, and continues later candidates', async () => {
    const later = {
      ...candidate,
      subscription_id: 'subscription-2',
      external_subscription_id: 'pa-2',
    };
    mocks.rpc.mockImplementation((name: string) =>
      name === 'claim_billing_reconciliation_candidates' ?
        { data: [candidate, later], error: null }
      : { data: 'completed', error: null },
    );
    mocks.snapshot.mockImplementation(async (id: string) => {
      if (id === 'pa-1') throw new Error('remote response contains a secret');
      return {
        externalSubscriptionId: id,
        status: 'active',
        cancelAtPeriodEnd: false,
        providerVersion: id,
      };
    });
    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ failed: 1, repaired: 1 }));
    expect(
      completionCalls().map(([, args]) => [
        args.p_subscription_id,
        args.p_outcome,
        args.p_error_code,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ['subscription-1', 'failed', 'provider_fetch_failed'],
        ['subscription-2', 'completed', null],
      ]),
    );
    expect(JSON.stringify(completionCalls())).not.toContain('secret');
  });

  it('runs at most five candidate provider calls concurrently', async () => {
    const candidates = Array.from({ length: 6 }, (_, index) => ({
      ...candidate,
      subscription_id: `subscription-${index + 1}`,
      external_subscription_id: `pa-${index + 1}`,
    }));
    let active = 0,
      maximum = 0;
    let releaseFirstGroup: (() => void) | undefined;
    const firstGroup = new Promise<void>((resolve) => {
      releaseFirstGroup = resolve;
    });
    mocks.rpc.mockImplementation((name: string) =>
      name === 'claim_billing_reconciliation_candidates' ?
        { data: candidates, error: null }
      : { data: 'completed', error: null },
    );
    mocks.snapshot.mockImplementation(async (id: string) => {
      active += 1;
      maximum = Math.max(maximum, active);
      if (id !== 'pa-6') await firstGroup;
      active -= 1;
      return {
        externalSubscriptionId: id,
        status: 'active',
        cancelAtPeriodEnd: false,
        providerVersion: id,
      };
    });
    const work = reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 });
    await vi.waitFor(() => expect(maximum).toBe(5));
    releaseFirstGroup?.();
    await expect(work).resolves.toEqual(expect.objectContaining({ scanned: 6 }));
    expect(maximum).toBe(5);
  });

  it('defers untouched claimed candidates when its time budget expires', async () => {
    const candidates = [
      candidate,
      { ...candidate, subscription_id: 'subscription-2', external_subscription_id: 'pa-2' },
    ];
    mocks.rpc.mockImplementation((name: string) =>
      name === 'claim_billing_reconciliation_candidates' ?
        { data: candidates, error: null }
      : { data: 'completed', error: null },
    );
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(2);
    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 1 }),
    ).resolves.toEqual(expect.objectContaining({ scanned: 2, deferred: 2 }));
    expect(mocks.snapshot).not.toHaveBeenCalled();
    expect(completionCalls().map(([, args]) => args.p_outcome)).toEqual(['deferred', 'deferred']);
  });

  it('runs snapshot before invoice discovery and reduces every discovered event sequentially', async () => {
    const discovered = [
      {
        type: 'invoice_paid',
        provider: 'mercadopago',
        externalEventId: 'invoice-1',
        accountId: 'account-1',
      },
      {
        type: 'invoice_paid',
        provider: 'mercadopago',
        externalEventId: 'invoice-2',
        accountId: 'account-1',
      },
    ];
    const order: string[] = [];
    mocks.snapshot.mockImplementation(async () => {
      order.push('snapshot');
      return {
        externalSubscriptionId: 'pa-1',
        status: 'active',
        cancelAtPeriodEnd: false,
        providerVersion: 'v2',
      };
    });
    mocks.discover.mockImplementation(async () => {
      order.push('discover');
      return { events: discovered, nextCursor: null, providerWatermark: '2026-09-11T12:00:00Z' };
    });
    mocks.reduce.mockImplementation(async (event: { externalEventId: string }) => {
      order.push(event.externalEventId);
      return { status: event.externalEventId === 'invoice-1' ? 'duplicate' : 'applied' };
    });
    await reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 });
    expect(order).toEqual([
      'snapshot',
      'reconciliation:mercadopago:pa-1:v2',
      'discover',
      'invoice-1',
      'invoice-2',
    ]);
    expect(mocks.discover).toHaveBeenCalledWith({
      externalSubscriptionId: 'pa-1',
      modifiedSince: '2026-09-08T12:00:00.000Z',
      pageSize: 20,
    });
    expect(completionCalls()[0]?.[1]).toEqual(expect.objectContaining({ p_outcome: 'completed' }));
  });

  it('persists an intermediate cursor as deferred and resumes from it without advancing final state', async () => {
    mocks.discover.mockResolvedValue({
      events: [],
      nextCursor: 'opaque-cursor',
      providerWatermark: '2026-09-11T12:00:00Z',
    });
    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ deferred: 1 }));
    expect(completionCalls()[0]?.[1]).toEqual(
      expect.objectContaining({ p_outcome: 'deferred', p_next_cursor: 'opaque-cursor' }),
    );
    mocks.rpc.mockClear();
    mocks.rpc.mockImplementation((name: string) =>
      name === 'claim_billing_reconciliation_candidates' ?
        {
          data: [
            { ...candidate, scan_cursor: 'opaque-cursor', scan_watermark: '2026-09-11T12:00:00Z' },
          ],
          error: null,
        }
      : { data: 'completed', error: null },
    );
    mocks.discover.mockResolvedValue({
      events: [],
      nextCursor: null,
      providerWatermark: '2026-09-12T12:00:00Z',
    });
    await reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 });
    expect(mocks.discover).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'opaque-cursor' }),
    );
    expect(completionCalls()[0]?.[1]).toEqual(
      expect.objectContaining({
        p_outcome: 'completed',
        p_next_cursor: null,
        p_provider_watermark: '2026-09-12T12:00:00Z',
      }),
    );
  });

  it('records an identity mismatch as an anomaly and completes without a reducer access mutation', async () => {
    mocks.snapshot.mockResolvedValue({
      externalSubscriptionId: 'other-subscription',
      status: 'active',
      cancelAtPeriodEnd: false,
    });
    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ anomalous: 1 }));
    expect(mocks.reduce).not.toHaveBeenCalled();
    expect(completionCalls()[0]?.[1]).toEqual(expect.objectContaining({ p_outcome: 'completed' }));
  });

  it('surfaces a completion failure because durable progress is unknown', async () => {
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'claim_billing_reconciliation_candidates')
        return { data: [candidate], error: null };
      if (name === 'complete_billing_reconciliation_candidate')
        return { data: null, error: { code: 'db_down' } };
      return { data: 'completed', error: null };
    });
    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 }),
    ).rejects.toThrow('billing_reconciliation_completion_failed');
  });
});
