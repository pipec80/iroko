import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ handle: vi.fn() }));

vi.mock('@/lib/billing/webhook-handler', () => ({ handleProviderWebhook: mocks.handle }));

import { POST } from '../route';

function req(body: string, sig?: string) {
  return new Request('http://localhost/api/webhooks/mock', {
    method: 'POST',
    headers: sig ? { 'x-webhook-signature': sig } : {},
    body,
  });
}

describe('POST /api/webhooks/[provider]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should pass provider, body and signature to the handler', async () => {
    mocks.handle.mockResolvedValue({ status: 200, body: { result: 'applied' } });
    const res = await POST(req('{"x":1}', 'sig'), {
      params: Promise.resolve({ provider: 'mock' }),
    });
    expect(res.status).toBe(200);
    expect(mocks.handle).toHaveBeenCalledWith('mock', '{"x":1}', 'sig');
  });

  it('should propagate the handler error status', async () => {
    mocks.handle.mockResolvedValue({ status: 400, body: { error: 'invalid_signature' } });
    const res = await POST(req('{}'), { params: Promise.resolve({ provider: 'mock' }) });
    expect(res.status).toBe(400);
  });
});
