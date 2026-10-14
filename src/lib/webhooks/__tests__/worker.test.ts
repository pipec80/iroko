import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    rpc: (...args: unknown[]) => ({ abortSignal: () => mocks.rpc(...args) }),
  })),
}));
vi.mock('../transport', () => ({ sendWebhookRequest: mocks.send }));
import { runWebhookWorker } from '../worker';

const id = '11111111-1111-4111-8111-111111111111';
const row = {
  delivery_id: id,
  lease_token: id,
  endpoint_version: 1,
  canonical_url: 'https://example.com/hook',
  body_text: '{ "data": "árbol" }',
  headers: {
    'Content-Type': 'application/json',
    'X-Iroko-Event': 'account.updated',
    'X-Iroko-Delivery-Id': id,
    'X-Iroko-Timestamp': '123',
    'X-Iroko-Signature': `sha256=${'a'.repeat(64)}`,
  },
  attempt: 1,
};
describe('webhook worker fenced delivery', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.rpc.mockImplementation(async (name: string) => ({
      data: name === 'claim_webhook_deliveries' ? [row] : null,
      error: null,
    }));
    mocks.send.mockResolvedValue({ kind: 'success', statusCode: 204 });
  });
  it('sends exact signed text and completes using the claimed fencing token', async () => {
    await expect(runWebhookWorker()).resolves.toEqual({
      claimed: 1,
      succeeded: 1,
      retryable: 0,
      rejected: 0,
      completionFailed: 0,
    });
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ bodyText: row.body_text, url: row.canonical_url }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith('complete_webhook_delivery', {
      p_delivery_id: id,
      p_lease_token: id,
      p_outcome: 'success',
      p_http_status: 204,
      p_error_code: undefined,
    });
  });
  it('records unsafe destinations as terminal and never substitutes remote error text', async () => {
    mocks.send.mockResolvedValue({ kind: 'rejected', code: 'unsafe_destination' });
    expect((await runWebhookWorker()).rejected).toBe(1);
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      'complete_webhook_delivery',
      expect.objectContaining({ p_outcome: 'rejected', p_error_code: 'unsafe_destination' }),
    );
  });
  it('does not send malformed claimed headers', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ ...row, headers: { ...row.headers, Host: 'private.internal' } }],
      error: null,
    });
    await expect(runWebhookWorker()).rejects.toThrow('webhook_claim_invalid');
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('does not report a delivery as completed after a stale lease rejection', async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({
      data: name === 'claim_webhook_deliveries' ? [row] : null,
      error: name === 'complete_webhook_delivery' ? { message: 'lease_expired' } : null,
    }));
    expect((await runWebhookWorker()).completionFailed).toBe(1);
  });
  it('sanitizes unexpected transport failures and leaves the queue retryable', async () => {
    mocks.send.mockRejectedValue(new Error('https://secret.example/credential'));
    expect((await runWebhookWorker()).retryable).toBe(1);
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      'complete_webhook_delivery',
      expect.objectContaining({ p_error_code: 'worker_failed' }),
    );
  });
});
