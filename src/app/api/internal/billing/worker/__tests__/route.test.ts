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
});
