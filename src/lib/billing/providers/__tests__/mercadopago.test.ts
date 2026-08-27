import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    MERCADOPAGO_ACCESS_TOKEN: 'TEST-token',
    MERCADOPAGO_WEBHOOK_SECRET: 'test-mp-secret',
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { getProviderPrice } = vi.hoisted(() => ({ getProviderPrice: vi.fn() }));
vi.mock('../../catalog', () => ({ getProviderPrice }));

import { mercadopagoProvider } from '../mercadopago';

async function sign(secret: string, requestId: string, dataId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('mercadopagoProvider.verifyWebhook', () => {
  it('should return null when the signature does not match', async () => {
    const body = JSON.stringify({ type: 'subscription_preapproval', data: { id: 'pa_1' } });
    const result = await mercadopagoProvider.verifyWebhook(
      body,
      'ts=1720000000,v1=deadbeef;x-request-id=req_1',
    );
    expect(result).toBeNull();
  });

  it('should enrich subscription_preapproval events with a GET to /preapproval/{id}', async () => {
    const dataId = 'pa_1';
    const requestId = 'req_1';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    const body = JSON.stringify({ type: 'subscription_preapproval', data: { id: dataId } });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: dataId,
        status: 'authorized',
        external_reference: 'acc_1',
        auto_recurring: { frequency: 1, frequency_type: 'months' },
        date_created: '2026-07-08T00:00:00.000-04:00',
        next_payment_date: '2026-08-08T00:00:00.000-04:00',
      }),
    });

    const result = await mercadopagoProvider.verifyWebhook(
      body,
      `ts=${ts},v1=${v1};x-request-id=${requestId}`,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/preapproval/${dataId}`),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer TEST-token' }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        type: 'subscription_updated',
        provider: 'mercadopago',
        accountId: 'acc_1',
        status: 'active',
        externalSubscriptionId: dataId,
      }),
    );
  });

  it('should map a cancelled preapproval status to subscription_canceled', async () => {
    const dataId = 'pa_2';
    const requestId = 'req_2';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    const body = JSON.stringify({ type: 'subscription_preapproval', data: { id: dataId } });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: dataId,
        status: 'cancelled',
        external_reference: 'acc_2',
      }),
    });

    const result = await mercadopagoProvider.verifyWebhook(
      body,
      `ts=${ts},v1=${v1};x-request-id=${requestId}`,
    );
    expect(result?.type).toBe('subscription_canceled');
  });

  it('normalizes an approved authorized payment into its invoice and nested payment identities', async () => {
    const dataId = 'authorized_payment_1';
    const requestId = 'req_3';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    const body = JSON.stringify({ type: 'subscription_authorized_payment', data: { id: dataId } });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: dataId,
        preapproval_id: 'pa_1',
        external_reference: 'acc_1',
        transaction_amount: 999,
        currency_id: 'ARS',
        date_created: '2026-07-08T00:00:00.000-04:00',
        payment: {
          id: 'payment_1',
          status: 'approved',
        },
      }),
    });

    const result = await mercadopagoProvider.verifyWebhook(
      body,
      `ts=${ts},v1=${v1};x-request-id=${requestId}`,
    );
    expect(result).toEqual(
      expect.objectContaining({
        type: 'invoice_paid',
        provider: 'mercadopago',
        accountId: 'acc_1',
        externalSubscriptionId: 'pa_1',
        externalInvoiceId: 'authorized_payment_1',
        externalPaymentId: 'payment_1',
        amountPaid: 999,
        currency: 'ARS',
      }),
    );
  });

  it('normalizes a rejected authorized payment as invoice_payment_failed using its nested failure detail', async () => {
    const dataId = 'authorized_payment_rejected';
    const requestId = 'req_4';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    const body = JSON.stringify({ type: 'subscription_authorized_payment', data: { id: dataId } });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: dataId,
        preapproval_id: 'pa_1',
        external_reference: 'acc_1',
        transaction_amount: 999,
        currency_id: 'ARS',
        date_created: '2026-07-09T00:00:00.000-04:00',
        payment: {
          id: 'payment_rejected_1',
          status: 'rejected',
          status_detail: 'cc_rejected_bad_filled_card_number',
        },
      }),
    });

    const result = await mercadopagoProvider.verifyWebhook(
      body,
      `ts=${ts},v1=${v1};x-request-id=${requestId}`,
    );

    expect(result).toEqual(
      expect.objectContaining({
        type: 'invoice_payment_failed',
        provider: 'mercadopago',
        accountId: 'acc_1',
        externalSubscriptionId: 'pa_1',
        externalInvoiceId: dataId,
        externalPaymentId: 'payment_rejected_1',
        amountDue: 999,
        currency: 'ARS',
        attemptedAt: '2026-07-09T00:00:00.000-04:00',
        failureCode: 'cc_rejected_bad_filled_card_number',
      }),
    );
  });

  it('should return null for unhandled event types', async () => {
    const body = JSON.stringify({ type: 'payment', data: { id: 'x' } });
    const result = await mercadopagoProvider.verifyWebhook(body, 'ts=1,v1=x;x-request-id=y');
    expect(result).toBeNull();
  });
});

describe('mercadopagoProvider.createCheckout', () => {
  it('creates a pending CLP preapproval without an associated plan from the resolved provider price', async () => {
    getProviderPrice.mockResolvedValue({ amount: 29_900, currency: 'CLP', externalPriceId: null });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'pa_new',
        init_point: 'https://mercadopago.com/subscriptions/pa_new',
      }),
    });

    const result = await mercadopagoProvider.createCheckout({
      accountId: 'acc_1',
      customerEmail: 'owner@example.com',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/no',
    });

    expect(getProviderPrice).toHaveBeenCalledWith({
      planSlug: 'pro',
      interval: 'month',
      provider: 'mercadopago',
      currency: 'CLP',
    });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      reason: 'Iroko pro subscription',
      external_reference: 'acc_1',
      payer_email: 'owner@example.com',
      back_url: 'https://app/ok',
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 29_900,
        currency_id: 'CLP',
      },
    });
    expect(result).toEqual({
      url: 'https://mercadopago.com/subscriptions/pa_new',
      externalSubscriptionId: 'pa_new',
    });
  });

  it('converts USD catalog minor units while preserving CLP zero-decimal amounts', async () => {
    getProviderPrice.mockResolvedValue({ amount: 2_999, currency: 'USD', externalPriceId: null });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'pa_usd',
        init_point: 'https://mercadopago.com/subscriptions/pa_usd',
      }),
    });

    await mercadopagoProvider.createCheckout({
      accountId: 'acc_1',
      customerEmail: 'owner@example.com',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/no',
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(request.body as string).auto_recurring).toEqual({
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 29.99,
      currency_id: 'USD',
    });
  });

  it('does not issue an HTTP request when the active catalog price is missing', async () => {
    getProviderPrice.mockRejectedValueOnce(new Error('plan_provider_price_not_configured'));

    await expect(
      mercadopagoProvider.createCheckout({
        accountId: 'acc_1',
        customerEmail: 'owner@example.com',
        planSlug: 'pro',
        interval: 'month',
        successUrl: 'https://app/ok',
        cancelUrl: 'https://app/no',
      }),
    ).rejects.toThrow('plan_provider_price_not_configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid catalog price before it reaches Mercado Pago', async () => {
    getProviderPrice.mockResolvedValueOnce({ amount: -1, currency: 'CLP', externalPriceId: null });

    await expect(
      mercadopagoProvider.createCheckout({
        accountId: 'acc_1',
        customerEmail: 'owner@example.com',
        planSlug: 'pro',
        interval: 'month',
        successUrl: 'https://app/ok',
        cancelUrl: 'https://app/no',
      }),
    ).rejects.toThrow('provider_price_invalid');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('mercadopagoProvider.cancelSubscription', () => {
  it('rejects end-of-period cancellation because Mercado Pago does not support it natively', async () => {
    await expect(
      mercadopagoProvider.cancelSubscription?.({
        externalSubscriptionId: 'pa_1',
        timing: 'period_end',
      }),
    ).rejects.toThrow('billing_capability_not_supported:cancelAtPeriodEnd');
  });

  it('should cancel immediately via the API when atPeriodEnd is false', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'pa_1', status: 'cancelled' }),
    });
    await mercadopagoProvider.cancelSubscription?.({
      externalSubscriptionId: 'pa_1',
      timing: 'immediate',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/preapproval/pa_1'),
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"status":"cancelled"'),
      }),
    );
  });

  it('rejects immediate cancellation when Mercado Pago does not confirm cancelled status', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'pa_1', status: 'authorized' }),
    });

    await expect(
      mercadopagoProvider.cancelSubscription?.({
        externalSubscriptionId: 'pa_1',
        timing: 'immediate',
      }),
    ).rejects.toThrow('mercadopago_cancellation_not_confirmed');
  });
});

describe('mercadopagoProvider.capabilities', () => {
  it('does not advertise unsupported billing portal or deferred cancellation', () => {
    expect(mercadopagoProvider.capabilities).toMatchObject({
      customerPortal: false,
      cancelImmediately: true,
      cancelAtPeriodEnd: false,
    });
    expect(mercadopagoProvider.createPortalSession).toBeUndefined();
  });
});
