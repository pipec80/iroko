import { describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ handleProviderWebhook: vi.fn() }));

vi.mock('@/lib/billing/webhook-handler', () => ({
  handleProviderWebhook: mocks.handleProviderWebhook,
}));

import { POST } from '../[provider]/route';

function makeRequest(
  headers: Record<string, string>,
  body = '{}',
  url = 'http://localhost/api/webhooks/x',
) {
  return new Request(url, {
    method: 'POST',
    headers,
    body,
  });
}

describe('POST /api/webhooks/[provider]', () => {
  it('should read stripe-signature for the stripe provider', async () => {
    mocks.handleProviderWebhook.mockResolvedValue({ status: 200, body: { result: 'applied' } });
    await POST(makeRequest({ 'stripe-signature': 'sig_stripe' }), {
      params: Promise.resolve({ provider: 'stripe' }),
    });
    expect(mocks.handleProviderWebhook).toHaveBeenCalledWith('stripe', '{}', 'sig_stripe');
  });

  it('should pass signed query and notification ids for the mercadopago provider', async () => {
    mocks.handleProviderWebhook.mockResolvedValue({ status: 200, body: { result: 'applied' } });
    await POST(
      makeRequest(
        { 'x-signature': 'sig_mp', 'x-request-id': 'req_1' },
        '{"id":123,"type":"subscription_preapproval","data":{"id":"PA_1"}}',
        'http://localhost/api/webhooks/mercadopago?data.id=PA_1',
      ),
      {
        params: Promise.resolve({ provider: 'mercadopago' }),
      },
    );
    expect(mocks.handleProviderWebhook).toHaveBeenCalledWith(
      'mercadopago',
      '{"id":123,"type":"subscription_preapproval","data":{"id":"PA_1"}}',
      'sig_mp;x-request-id=req_1',
      { dataId: 'PA_1', webhookId: '123' },
    );
  });

  it('should keep reading x-webhook-signature for the mock provider', async () => {
    mocks.handleProviderWebhook.mockResolvedValue({ status: 200, body: { result: 'applied' } });
    await POST(makeRequest({ 'x-webhook-signature': 'sig_mock' }), {
      params: Promise.resolve({ provider: 'mock' }),
    });
    expect(mocks.handleProviderWebhook).toHaveBeenCalledWith('mock', '{}', 'sig_mock');
  });
});
