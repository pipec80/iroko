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
    mocks.reduceBillingEvent.mockResolvedValue({ status: 'applied' });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'claim_billing_recovery_jobs') return { data: [job], error: null };
      if (name === 'resolve_billing_checkout_reference') {
        return { data: [{ account_id: 'account-1', checkout_intent_id: null }], error: null };
      }
      if (name === 'complete_billing_recovery_job') {
        return { data: [{ status: 'resolved', anomaly_created: false }], error: null };
      }
      return { data: 'anomaly-id', error: null };
    });
  });

  it('routes a recovered payment through the shared reducer before resolving the job', async () => {
    const event = {
      provider: 'mercadopago' as const,
      externalEventId: 'authorized_payment:invoice:payment:approved',
      type: 'invoice_paid' as const,
      accountId: 'account-1',
      externalSubscriptionId: 'preapproval-1',
      externalInvoiceId: 'invoice-1',
      externalPaymentId: 'payment-371',
      amountPaid: 19990,
      currency: 'CLP',
      paidAt: '2026-09-09T12:00:00Z',
      raw: { never: 'logged' },
    };
    mocks.recoverResource.mockResolvedValue({ kind: 'event', event });

    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ claimed: 1, resolved: 1 }));
    expect(mocks.reduceBillingEvent).toHaveBeenCalledWith(event);
    expect(mocks.rpc).toHaveBeenCalledWith('complete_billing_recovery_job', {
      p_job_id: job.id,
      p_last_error_code: undefined,
      p_outcome: 'event',
    });
  });

  it('persists adverse payment evidence without reducing subscription access', async () => {
    mocks.recoverResource.mockResolvedValue({
      kind: 'anomaly',
      anomalyType: 'refund',
      observedStatus: 'refunded',
    });

    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ anomalous: 1 }));
    expect(mocks.reduceBillingEvent).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith(
      'upsert_billing_financial_anomaly',
      expect.objectContaining({ p_anomaly_type: 'refund', p_external_resource_id: 'payment-371' }),
    );
  });

  it('alerts once only when SQL reports a newly exhausted anomaly', async () => {
    mocks.recoverResource.mockRejectedValue(new Error('provider_down secret-body'));
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'claim_billing_recovery_jobs') return { data: [job], error: null };
      return { data: [{ status: 'exhausted', anomaly_created: true }], error: null };
    });

    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ exhausted: 1 }));
    expect(mocks.captureException).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mocks.logger.error.mock.calls)).not.toContain('secret-body');
  });

  it('resolves a payment that the provider proves is unrelated without reducing billing state', async () => {
    mocks.recoverResource.mockResolvedValue({ kind: 'unrelated' });

    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ resolved: 1 }));
    expect(mocks.reduceBillingEvent).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('complete_billing_recovery_job', {
      p_job_id: job.id,
      p_last_error_code: undefined,
      p_outcome: 'unrelated',
    });
  });

  it('releases a still-pending payment for a later retry', async () => {
    mocks.recoverResource.mockResolvedValue({ kind: 'pending' });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'claim_billing_recovery_jobs') return { data: [job], error: null };
      return { data: [{ status: 'pending', anomaly_created: false }], error: null };
    });

    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ retried: 1, exhausted: 0 }));
    expect(mocks.rpc).toHaveBeenCalledWith('complete_billing_recovery_job', {
      p_job_id: job.id,
      p_last_error_code: 'payment_still_pending',
      p_outcome: 'pending',
    });
  });

  it('alerts when a still-pending payment exhausts its durable retry budget', async () => {
    mocks.recoverResource.mockResolvedValue({ kind: 'pending' });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'claim_billing_recovery_jobs') return { data: [job], error: null };
      return { data: [{ status: 'exhausted', anomaly_created: true }], error: null };
    });

    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ retried: 0, exhausted: 1 }));
    expect(mocks.captureException).toHaveBeenCalledTimes(1);
  });

  it('skips a configured provider that does not implement payment recovery', async () => {
    mocks.getPaymentProvider.mockReturnValue({});

    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ skipped: 1 }));
    expect(mocks.rpc).toHaveBeenCalledWith('complete_billing_recovery_job', {
      p_job_id: job.id,
      p_last_error_code: 'provider_recovery_unsupported',
      p_outcome: 'unrelated',
    });
  });

  it('skips a provider that is not configured for the worker', async () => {
    mocks.getPaymentProvider.mockImplementation(() => {
      throw new Error('provider_not_configured');
    });

    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ skipped: 1 }));
    expect(mocks.rpc).toHaveBeenCalledWith('complete_billing_recovery_job', {
      p_job_id: job.id,
      p_last_error_code: 'provider_not_configured',
      p_outcome: 'unrelated',
    });
  });

  it('classifies provider timeouts without persisting the provider error message', async () => {
    const timeout = new Error('secret provider response');
    timeout.name = 'TimeoutError';
    mocks.recoverResource.mockRejectedValue(timeout);
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'claim_billing_recovery_jobs') return { data: [job], error: null };
      return { data: [{ status: 'pending', anomaly_created: false }], error: null };
    });

    await expect(
      recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ retried: 1 }));
    expect(mocks.rpc).toHaveBeenCalledWith('complete_billing_recovery_job', {
      p_job_id: job.id,
      p_last_error_code: 'provider_timeout',
      p_outcome: 'error',
    });
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('secret provider response');
  });

  it('fails closed when claiming durable recovery jobs fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'db_unavailable' } });

    await expect(recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 })).rejects.toThrow(
      'billing_recovery_claim_failed',
    );
    expect(mocks.recoverResource).not.toHaveBeenCalled();
  });

  it('fails closed when SQL returns an invalid job completion result', async () => {
    mocks.recoverResource.mockResolvedValue({ kind: 'unrelated' });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'claim_billing_recovery_jobs') return { data: [job], error: null };
      return { data: [], error: null };
    });

    await expect(recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 })).rejects.toThrow(
      'billing_recovery_completion_failed',
    );
  });
});
