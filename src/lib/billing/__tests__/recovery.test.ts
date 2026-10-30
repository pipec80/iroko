import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  recoverResource: vi.fn(),
  getPaymentProvider: vi.fn(),
  reduceBillingEvent: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  captureException: vi.fn(),
  scope: { setTag: vi.fn() },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })),
}));
vi.mock('../registry', () => ({ getPaymentProvider: mocks.getPaymentProvider }));
vi.mock('../reducer', () => ({ reduceBillingEvent: mocks.reduceBillingEvent }));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback: (scope: typeof mocks.scope) => void) => callback(mocks.scope)),
  captureException: mocks.captureException,
}));

import { recoverBillingResources } from '../recovery';

const job = {
  id: '00000000-0000-0000-0000-000000000371',
  provider: 'mercadopago',
  resource_type: 'payment',
  resource_id: 'payment-371',
  reason: 'unlinked_payment',
  attempt_count: 1,
};

describe('recoverBillingResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPaymentProvider.mockReturnValue({ recoverResource: mocks.recoverResource });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'claim_billing_recovery_jobs')
        return {
          data: [{ ...job, lease_token: '00000000-0000-4000-8000-000000000372' }],
          error: null,
        };
      if (name === 'resolve_billing_checkout_reference')
        return { data: [{ account_id: '00000000-0000-4000-8000-000000000373' }], error: null };
      return { data: [{ status: 'resolved', anomaly_created: false }], error: null };
    });
  });
  it('applies correlated recovered events exclusively through the token-owned transaction', async () => {
    const event = {
      provider: 'mercadopago',
      type: 'invoice_paid',
      accountId: 'checkout-reference',
      externalEventId: 'event',
      externalSubscriptionId: 'subscription',
      externalInvoiceId: 'invoice',
      externalPaymentId: job.resource_id,
      amountPaid: 19990,
      currency: 'CLP',
      paidAt: '2026-09-09T12:00:00Z',
      raw: {},
    };
    mocks.recoverResource.mockResolvedValue({ kind: 'event', event });
    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45000 }),
    ).resolves.toMatchObject({ resolved: 1 });
    expect(mocks.rpc).toHaveBeenCalledWith('apply_billing_recovery_result', {
      p_job_id: job.id,
      p_lease_token: '00000000-0000-4000-8000-000000000372',
      p_result: {
        kind: 'event',
        event: { ...event, accountId: '00000000-0000-4000-8000-000000000373' },
      },
    });
    expect(mocks.reduceBillingEvent).not.toHaveBeenCalled();
    expect(mocks.rpc.mock.calls.some(([name]) => name === 'complete_billing_recovery_job')).toBe(
      false,
    );
  });
  it.each(['pending', 'event', 'anomaly', 'error'])(
    'skips lost lease for %s without a second persistence attempt',
    async (kind) => {
      mocks.recoverResource.mockResolvedValue(
        kind === 'anomaly' ?
          { kind, observation: { anomalyType: 'refund', externalResourceId: job.resource_id } }
        : kind === 'event' ?
          {
            kind,
            event: {
              provider: 'mercadopago',
              type: 'invoice_paid',
              accountId: 'reference',
              externalEventId: 'event',
              externalSubscriptionId: 'subscription',
              externalInvoiceId: 'invoice',
              externalPaymentId: job.resource_id,
              amountPaid: 19990,
              currency: 'CLP',
              paidAt: '2026-09-09T12:00:00Z',
              raw: {},
            },
          }
        : { kind },
      );
      if (kind === 'error') mocks.recoverResource.mockRejectedValue(new Error('provider timeout'));
      mocks.rpc.mockImplementation((name: string) =>
        name === 'resolve_billing_checkout_reference' ?
          { data: [{ account_id: '00000000-0000-4000-8000-000000000373' }], error: null }
        : name === 'claim_billing_recovery_jobs' ?
          { data: [{ ...job, lease_token: '00000000-0000-4000-8000-000000000372' }], error: null }
        : { data: null, error: { message: 'billing_recovery_lease_not_owned' } },
      );
      await expect(
        recoverBillingResources({ batchSize: 20, maxDurationMs: 45000 }),
      ).resolves.toMatchObject({ skipped: 1, resolved: 0, retried: 0 });
      expect(
        mocks.rpc.mock.calls.filter(([name]) => name === 'apply_billing_recovery_result'),
      ).toHaveLength(1);
      expect(mocks.reduceBillingEvent).not.toHaveBeenCalled();
    },
  );
  it('persists an anomaly atomically without directly mutating access', async () => {
    mocks.recoverResource.mockResolvedValue({
      kind: 'anomaly',
      observation: {
        anomalyType: 'partial_refund',
        externalResourceId: job.resource_id,
        originalAmount: 19990,
        affectedAmount: 5000,
        currency: 'CLP',
      },
    });
    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45000 }),
    ).resolves.toMatchObject({ anomalous: 1, resolved: 1 });
    expect(mocks.rpc.mock.calls.some(([name]) => name === 'upsert_billing_financial_anomaly')).toBe(
      false,
    );
  });
  it.each(['pending', 'unrelated'])('submits %s through the atomic operation', async (kind) => {
    mocks.recoverResource.mockResolvedValue({ kind });
    await recoverBillingResources({ batchSize: 20, maxDurationMs: 45000 });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_billing_recovery_result',
      expect.objectContaining({ p_result: { kind } }),
    );
  });
  it('retries provider errors with the current token and a safe error code', async () => {
    mocks.recoverResource.mockRejectedValue(new Error('secret provider response'));
    mocks.rpc.mockImplementation((name: string) =>
      name === 'claim_billing_recovery_jobs' ?
        { data: [{ ...job, lease_token: '00000000-0000-4000-8000-000000000372' }], error: null }
      : { data: [{ status: 'pending', anomaly_created: false }], error: null },
    );
    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45000 }),
    ).resolves.toMatchObject({ retried: 1 });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_billing_recovery_result',
      expect.objectContaining({
        p_result: { kind: 'error', errorCode: 'provider_recovery_failed' },
      }),
    );
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('secret provider response');
  });
  it('alerts only for newly created exhaustion anomalies', async () => {
    mocks.recoverResource.mockResolvedValue({ kind: 'pending' });
    mocks.rpc.mockImplementation((name: string) =>
      name === 'claim_billing_recovery_jobs' ?
        { data: [{ ...job, lease_token: '00000000-0000-4000-8000-000000000372' }], error: null }
      : { data: [{ status: 'exhausted', anomaly_created: true }], error: null },
    );
    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45000 }),
    ).resolves.toMatchObject({ exhausted: 1 });
    expect(mocks.captureException).toHaveBeenCalledTimes(1);
  });
  it('fails closed on invalid SQL completion without resubmitting', async () => {
    mocks.recoverResource.mockResolvedValue({ kind: 'unrelated' });
    mocks.rpc.mockImplementation((name: string) =>
      name === 'claim_billing_recovery_jobs' ?
        { data: [{ ...job, lease_token: '00000000-0000-4000-8000-000000000372' }], error: null }
      : { data: [], error: null },
    );
    await expect(recoverBillingResources({ batchSize: 20, maxDurationMs: 45000 })).rejects.toThrow(
      'billing_recovery_completion_failed',
    );
    expect(
      mocks.rpc.mock.calls.filter(([name]) => name === 'apply_billing_recovery_result'),
    ).toHaveLength(1);
  });
});
