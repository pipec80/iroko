import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  recoverBillingResources: vi.fn(),
  reconcileNonTerminalSubscriptions: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/env', () => ({ env: { BILLING_RECONCILIATION_SECRET: 's'.repeat(32) } }));
vi.mock('@/lib/billing/recovery', () => ({
  recoverBillingResources: mocks.recoverBillingResources,
}));
vi.mock('@/lib/billing/reconciliation', () => ({
  reconcileNonTerminalSubscriptions: mocks.reconcileNonTerminalSubscriptions,
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })) }));

import { POST } from '../route';

function request(body: object, secret?: string): Request {
  return new Request('http://localhost/api/internal/billing/worker', {
    method: 'POST',
    headers: secret ? { 'x-billing-worker-secret': secret } : {},
    body: JSON.stringify(body),
  });
}

describe('billing worker route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: 'recorded', error: null });
    mocks.recoverBillingResources.mockResolvedValue({
      claimed: 1,
      resolved: 1,
      retried: 0,
      exhausted: 0,
      anomalous: 0,
      skipped: 0,
    });
  });

  it('rejects a missing secret without running work', async () => {
    const response = await POST(request({ mode: 'recovery' }));
    expect(response.status).toBe(401);
    expect(mocks.recoverBillingResources).not.toHaveBeenCalled();
  });

  it('rejects an invalid mode', async () => {
    const response = await POST(request({ mode: 'other' }, 's'.repeat(32)));
    expect(response.status).toBe(400);
  });

  it('rejects malformed JSON before running work', async () => {
    const response = await POST(
      new Request('http://localhost/api/internal/billing/worker', {
        method: 'POST',
        headers: { 'x-billing-worker-secret': 's'.repeat(32) },
        body: '{',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_body' });
    expect(mocks.recoverBillingResources).not.toHaveBeenCalled();
  });

  it('runs a bounded recovery batch and stores a PII-free summary', async () => {
    const response = await POST(request({ mode: 'recovery' }, 's'.repeat(32)));
    expect(response.status).toBe(200);
    expect(mocks.recoverBillingResources).toHaveBeenCalledWith({
      batchSize: 20,
      maxDurationMs: 45_000,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'record_billing_worker_result',
      expect.objectContaining({ p_mode: 'recovery', p_status_code: 200 }),
    );
    expect(await response.json()).toEqual(
      expect.objectContaining({ mode: 'recovery', claimed: 1 }),
    );
  });

  it('runs reconciliation mode with the same bounded worker budget', async () => {
    mocks.reconcileNonTerminalSubscriptions.mockResolvedValue({
      scanned: 1,
      repaired: 1,
      stale: 0,
      anomalous: 0,
      skipped: 0,
    });

    const response = await POST(request({ mode: 'reconciliation' }, 's'.repeat(32)));

    expect(response.status).toBe(200);
    expect(mocks.reconcileNonTerminalSubscriptions).toHaveBeenCalledWith({
      batchSize: 20,
      maxDurationMs: 45_000,
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({ mode: 'reconciliation', scanned: 1, repaired: 1 }),
    );
  });

  it('returns a sanitized failure and records worker health when processing throws', async () => {
    mocks.recoverBillingResources.mockRejectedValue(new Error('provider secret response'));

    const response = await POST(request({ mode: 'recovery' }, 's'.repeat(32)));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'worker_failed' });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'record_billing_worker_result',
      expect.objectContaining({
        p_mode: 'recovery',
        p_status_code: 500,
        p_summary: { error: 'worker_failed' },
      }),
    );
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('provider secret response');
  });

  it('fails closed when the worker health record cannot be persisted', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'db_unavailable' } });

    const response = await POST(request({ mode: 'recovery' }, 's'.repeat(32)));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'worker_failed' });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});
