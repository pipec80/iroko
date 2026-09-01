import { afterEach, describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    MERCADOPAGO_ACCESS_TOKEN: 'TEST-token',
    MERCADOPAGO_WEBHOOK_SECRET: 'test-mp-secret',
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

afterEach(() => fetchMock.mockReset());

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

async function signManifest(secret: string, manifest: string) {
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

  it('maps Mercado Pago canceled preapproval status to subscription_canceled', async () => {
    const dataId = 'pa_2';
    const requestId = 'req_2';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    const body = JSON.stringify({ type: 'subscription_preapproval', data: { id: dataId } });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: dataId,
        status: 'canceled',
        external_reference: 'acc_2',
      }),
    });

    const result = await mercadopagoProvider.verifyWebhook(
      body,
      `ts=${ts},v1=${v1};x-request-id=${requestId}`,
    );
    expect(result?.type).toBe('subscription_canceled');
  });

  it('verifies the lower-cased query data id and uses the notification id for idempotency', async () => {
    const dataId = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
    const requestId = 'req_query_id';
    const ts = '1720000000';
    const v1 = await signManifest(
      'test-mp-secret',
      `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`,
    );
    const body = JSON.stringify({
      id: 123,
      type: 'subscription_preapproval',
      data: { id: dataId },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: dataId, status: 'pending', external_reference: 'acc_query' }),
    });

    const result = await mercadopagoProvider.verifyWebhook(
      body,
      `ts=${ts},v1=${v1};x-request-id=${requestId}`,
      { dataId, webhookId: '123' },
    );

    expect(result).toEqual(
      expect.objectContaining({
        externalEventId: 'mercadopago:webhook:123',
        externalSubscriptionId: dataId,
      }),
    );
  });

  it('accepts a valid signature when x-request-id is absent from Mercado Pago manifest', async () => {
    const dataId = 'pa_no_request_id';
    const ts = '1720000000';
    const v1 = await signManifest('test-mp-secret', `id:${dataId};ts:${ts};`);
    const body = JSON.stringify({ type: 'subscription_preapproval', data: { id: dataId } });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: dataId, status: 'pending', external_reference: 'acc_optional' }),
    });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1}`, { dataId }),
    ).resolves.toEqual(expect.objectContaining({ externalSubscriptionId: dataId }));
  });

  it('omits data.id from the signature manifest when Mercado Pago omits it from the URL', async () => {
    const dataId = 'pa_body_only';
    const requestId = 'req_body_only';
    const ts = '1720000000';
    const v1 = await signManifest('test-mp-secret', `request-id:${requestId};ts:${ts};`);
    const body = JSON.stringify({ type: 'subscription_preapproval', data: { id: dataId } });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: dataId, status: 'pending', external_reference: 'acc_body_only' }),
    });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1};x-request-id=${requestId}`, {
        webhookId: 'notification_body_only',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        externalEventId: 'mercadopago:webhook:notification_body_only',
        externalSubscriptionId: dataId,
      }),
    );
  });

  it('normalizes a subscription payment topic through its linked authorized-payment invoice', async () => {
    const paymentId = 'payment_1';
    const requestId = 'req_payment_1';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
    const body = JSON.stringify({
      id: 'notification_payment_1',
      type: 'payment',
      data: { id: paymentId },
    });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: paymentId, status: 'approved' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'invoice_1',
              preapproval_id: 'pa_payment_1',
              external_reference: 'acc_payment_1',
              transaction_amount: '19990',
              currency_id: 'CLP',
              date_created: '2026-08-31T00:00:00.000-04:00',
              payment: { id: paymentId, status: 'approved' },
            },
          ],
        }),
      });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1};x-request-id=${requestId}`, {
        dataId: paymentId,
        webhookId: 'notification_payment_1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        type: 'invoice_paid',
        externalInvoiceId: 'invoice_1',
        externalPaymentId: paymentId,
        externalEventId: 'mercadopago:webhook:notification_payment_1',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(`/v1/payments/${paymentId}`),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`/authorized_payments/search?payment_id=${paymentId}`),
      expect.any(Object),
    );
  });

  it('acknowledges a signed generic payment that is not linked to a subscription invoice', async () => {
    const paymentId = 'payment_not_subscription';
    const requestId = 'req_payment_not_subscription';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
    const body = JSON.stringify({ type: 'payment', data: { id: paymentId } });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: paymentId, status: 'approved' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1};x-request-id=${requestId}`, {
        dataId: paymentId,
        webhookId: 'notification_not_subscription',
      }),
    ).resolves.toEqual({
      provider: 'mercadopago',
      type: 'webhook_acknowledged',
      reason: 'unlinked_payment',
      raw: {
        notification: { type: 'payment', data: { id: paymentId } },
        payment: { id: paymentId, status: 'approved' },
      },
    });
  });

  it('marks a linked payment status divergence for actionable observability', async () => {
    const paymentId = 'payment_refunded';
    const requestId = 'req_payment_refunded';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
    const body = JSON.stringify({ type: 'payment', data: { id: paymentId } });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: paymentId, status: 'refunded' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'invoice_refunded',
              preapproval_id: 'pa_refunded',
              external_reference: 'acc_refunded',
              transaction_amount: '19990',
              currency_id: 'CLP',
              date_created: '2026-08-31T00:00:00.000-04:00',
              payment: { id: paymentId, status: 'approved' },
            },
          ],
        }),
      });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1};x-request-id=${requestId}`, {
        dataId: paymentId,
        webhookId: 'notification_payment_refunded',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'mercadopago',
        type: 'webhook_acknowledged',
        reason: 'payment_status_divergence',
      }),
    );
  });

  it('adds a bounded timeout to provider resource fetches', async () => {
    const dataId = 'pa_timeout';
    const requestId = 'req_timeout';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: dataId, status: 'pending', external_reference: 'acc_timeout' }),
    });

    await mercadopagoProvider.verifyWebhook(
      JSON.stringify({ type: 'subscription_preapproval', data: { id: dataId } }),
      `ts=${ts},v1=${v1};x-request-id=${requestId}`,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/preapproval/${dataId}`),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('rejects a webhook whose signed query data id does not match the body', async () => {
    const bodyDataId = 'payment_body';
    const queryDataId = 'payment_query';
    const requestId = 'req_mismatched_data_id';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, queryDataId, ts);

    await expect(
      mercadopagoProvider.verifyWebhook(
        JSON.stringify({ type: 'payment', data: { id: bodyDataId } }),
        `ts=${ts},v1=${v1};x-request-id=${requestId}`,
        { dataId: queryDataId },
      ),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
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
        id: 10_001,
        preapproval_id: 'pa_1',
        external_reference: 'acc_1',
        transaction_amount: '29900',
        currency_id: 'CLP',
        date_created: '2026-07-08T00:00:00.000-04:00',
        payment: {
          id: 10_002,
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
        externalInvoiceId: '10001',
        externalPaymentId: '10002',
        amountPaid: 29_900,
        currency: 'CLP',
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
        id: 10_003,
        preapproval_id: 'pa_1',
        external_reference: 'acc_1',
        transaction_amount: '29900',
        currency_id: 'CLP',
        date_created: '2026-07-09T00:00:00.000-04:00',
        payment: {
          id: 10_004,
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
        externalInvoiceId: '10003',
        externalPaymentId: '10004',
        amountDue: 29_900,
        currency: 'CLP',
        attemptedAt: '2026-07-09T00:00:00.000-04:00',
        failureCode: 'cc_rejected_bad_filled_card_number',
      }),
    );
  });

  it.each(['pending', 'in_process', 'in_mediation', 'authorized'])(
    'acknowledges a non-terminal %s authorized payment without recording a failure',
    async (status) => {
      const dataId = `authorized_payment_${status}`;
      const requestId = `req_${status}`;
      const ts = '1720000000';
      const v1 = await sign('test-mp-secret', requestId, dataId, ts);
      const body = JSON.stringify({
        type: 'subscription_authorized_payment',
        data: { id: dataId },
      });

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: `invoice_${status}`,
          preapproval_id: 'pa_pending_lifecycle',
          external_reference: 'acc_pending_lifecycle',
          transaction_amount: '29900',
          currency_id: 'CLP',
          date_created: '2026-07-09T00:00:00.000-04:00',
          payment: {
            id: `payment_${status}`,
            status,
            status_detail: `${status}_detail`,
          },
        }),
      });

      await expect(
        mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1};x-request-id=${requestId}`),
      ).resolves.toEqual(
        expect.objectContaining({
          provider: 'mercadopago',
          type: 'webhook_acknowledged',
          reason: 'payment_pending',
        }),
      );
    },
  );

  it('uses distinct lifecycle external event ids when an authorized payment changes from rejected to approved', async () => {
    const invoiceId = 'authorized_payment_lifecycle';
    const paymentId = 'payment_lifecycle';
    const ts = '1720000000';
    const failedRequestId = 'req_lifecycle_failed';
    const approvedRequestId = 'req_lifecycle_approved';
    const failedBody = JSON.stringify({
      type: 'subscription_authorized_payment',
      data: { id: 'authorized_payment_lifecycle_failed' },
    });
    const approvedBody = JSON.stringify({
      type: 'subscription_authorized_payment',
      data: { id: 'authorized_payment_lifecycle_approved' },
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: invoiceId,
          preapproval_id: 'pa_lifecycle',
          external_reference: 'acc_lifecycle',
          transaction_amount: '29900',
          currency_id: 'CLP',
          date_created: '2026-07-09T00:00:00.000-04:00',
          payment: { id: paymentId, status: 'rejected', status_detail: 'cc_rejected' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: invoiceId,
          preapproval_id: 'pa_lifecycle',
          external_reference: 'acc_lifecycle',
          transaction_amount: '29900',
          currency_id: 'CLP',
          date_created: '2026-07-10T00:00:00.000-04:00',
          payment: { id: paymentId, status: 'approved' },
        }),
      });

    const failed = await mercadopagoProvider.verifyWebhook(
      failedBody,
      `ts=${ts},v1=${await sign('test-mp-secret', failedRequestId, 'authorized_payment_lifecycle_failed', ts)};x-request-id=${failedRequestId}`,
    );
    const approved = await mercadopagoProvider.verifyWebhook(
      approvedBody,
      `ts=${ts},v1=${await sign('test-mp-secret', approvedRequestId, 'authorized_payment_lifecycle_approved', ts)};x-request-id=${approvedRequestId}`,
    );

    expect(failed).toEqual(
      expect.objectContaining({
        type: 'invoice_payment_failed',
        externalInvoiceId: invoiceId,
        externalPaymentId: paymentId,
      }),
    );
    expect(approved).toEqual(
      expect.objectContaining({
        type: 'invoice_paid',
        externalInvoiceId: invoiceId,
        externalPaymentId: paymentId,
      }),
    );
    const lifecycleEventIds = [failed, approved].map((event) =>
      event && event.type !== 'webhook_acknowledged' ? event.externalEventId : undefined,
    );
    expect(lifecycleEventIds[0]).not.toBe(lifecycleEventIds[1]);
  });

  it.each([
    ['approved', '29.99', 'invoice_paid', 'amountPaid'],
    ['rejected', 29.99, 'invoice_payment_failed', 'amountDue'],
  ] as const)(
    'normalizes USD %s authorized payment amounts into minor units',
    async (status, rawAmount, type, amountField) => {
      const dataId = `authorized_payment_usd_${status}`;
      const requestId = `req_usd_${status}`;
      const ts = '1720000000';
      const v1 = await sign('test-mp-secret', requestId, dataId, ts);
      const body = JSON.stringify({
        type: 'subscription_authorized_payment',
        data: { id: dataId },
      });

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: `invoice_usd_${status}`,
          preapproval_id: 'pa_usd',
          external_reference: 'acc_usd',
          transaction_amount: rawAmount,
          currency_id: 'USD',
          date_created: '2026-07-10T00:00:00.000-04:00',
          payment: { id: `payment_usd_${status}`, status },
        }),
      });

      const result = await mercadopagoProvider.verifyWebhook(
        body,
        `ts=${ts},v1=${v1};x-request-id=${requestId}`,
      );

      expect(result).toEqual(
        expect.objectContaining({ type, currency: 'USD', [amountField]: 2_999 }),
      );
    },
  );

  it.each([
    ['missing payment', {}],
    ['null payment', { payment: null }],
    ['empty payment id', { payment: { id: '', status: 'approved' } }],
    ['empty payment status', { payment: { id: 'payment_missing_status', status: '' } }],
  ])('returns null for an authorized payment with %s', async (_description, paymentOverride) => {
    const dataId = 'authorized_payment_malformed_nested_payment';
    const requestId = 'req_malformed_nested_payment';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    const body = JSON.stringify({ type: 'subscription_authorized_payment', data: { id: dataId } });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'invoice_malformed',
        preapproval_id: 'pa_malformed',
        external_reference: 'acc_malformed',
        transaction_amount: '29900',
        currency_id: 'CLP',
        date_created: '2026-07-10T00:00:00.000-04:00',
        ...paymentOverride,
      }),
    });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1};x-request-id=${requestId}`),
    ).resolves.toBeNull();
  });

  it('returns null for an authorized payment with a malformed non-integer amount', async () => {
    const dataId = 'authorized_payment_invalid_amount';
    const requestId = 'req_5';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    const body = JSON.stringify({ type: 'subscription_authorized_payment', data: { id: dataId } });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 10_005,
        preapproval_id: 'pa_1',
        external_reference: 'acc_1',
        transaction_amount: '299.50',
        currency_id: 'CLP',
        date_created: '2026-07-10T00:00:00.000-04:00',
        payment: { id: 10_006, status: 'approved' },
      }),
    });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1};x-request-id=${requestId}`),
    ).resolves.toBeNull();
  });

  it.each([
    ['negative', '-29.99'],
    ['negative numeric zero', -0],
    ['non-numeric', 'twenty-nine'],
    ['excess USD fraction precision', '29.999'],
    ['unsafe', '9007199254740992'],
  ])('returns null for an authorized payment with a %s amount', async (_description, rawAmount) => {
    const dataId = 'authorized_payment_invalid_currency_aware_amount';
    const requestId = 'req_invalid_currency_aware_amount';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    const body = JSON.stringify({ type: 'subscription_authorized_payment', data: { id: dataId } });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'invoice_invalid_currency_aware_amount',
        preapproval_id: 'pa_invalid_currency_aware_amount',
        external_reference: 'acc_invalid_currency_aware_amount',
        transaction_amount: rawAmount,
        currency_id: 'USD',
        date_created: '2026-07-10T00:00:00.000-04:00',
        payment: { id: 'payment_invalid_currency_aware_amount', status: 'approved' },
      }),
    });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1};x-request-id=${requestId}`),
    ).resolves.toBeNull();
  });

  it('should return null for unhandled event types', async () => {
    const body = JSON.stringify({ type: 'unsupported_topic', data: { id: 'x' } });
    const result = await mercadopagoProvider.verifyWebhook(body, 'ts=1,v1=x;x-request-id=y');
    expect(result).toBeNull();
  });

  it('acknowledges an unhandled event type after its signature is verified', async () => {
    const dataId = 'unsupported_resource';
    const requestId = 'req_unsupported';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, dataId, ts);
    const body = JSON.stringify({ type: 'unsupported_topic', data: { id: dataId } });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${ts},v1=${v1};x-request-id=${requestId}`),
    ).resolves.toEqual({
      provider: 'mercadopago',
      type: 'webhook_acknowledged',
      reason: 'unsupported_topic',
      raw: { type: 'unsupported_topic', data: { id: dataId } },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('mercadopagoProvider.createCheckout', () => {
  it('rejects non-monthly intervals before resolving a catalog price', async () => {
    await expect(
      mercadopagoProvider.createCheckout({
        accountId: 'acc_1',
        customerEmail: 'owner@example.com',
        planSlug: 'pro',
        interval: 'year',
        successUrl: 'https://app/ok',
        cancelUrl: 'https://app/no',
      }),
    ).rejects.toThrow('billing_interval_not_supported:mercadopago');
    expect(getProviderPrice).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

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
      json: async () => ({ id: 'pa_1', status: 'canceled' }),
    });
    await mercadopagoProvider.cancelSubscription?.({
      externalSubscriptionId: 'pa_1',
      timing: 'immediate',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/preapproval/pa_1'),
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"status":"canceled"'),
      }),
    );
  });

  it('rejects immediate cancellation when Mercado Pago does not confirm canceled status', async () => {
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
  it('does not advertise unsupported billing portal, deferred cancellation, or pause', () => {
    expect(mercadopagoProvider.capabilities).toMatchObject({
      customerPortal: false,
      cancelImmediately: true,
      cancelAtPeriodEnd: false,
      pauseSubscription: false,
    });
    expect(mercadopagoProvider.createPortalSession).toBeUndefined();
  });
});
