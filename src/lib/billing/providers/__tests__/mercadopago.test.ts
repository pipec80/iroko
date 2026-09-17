import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    MERCADOPAGO_ACCESS_TOKEN: 'TEST-token',
    MERCADOPAGO_WEBHOOK_SECRET: 'test-mp-secret',
    MERCADOPAGO_WEBHOOK_URL: 'https://app.example.com/api/webhooks/mercadopago',
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Las firmas de estos tests usan ts fijo '1720000000' (segundos); se congela
// solo Date para que la ventana de tolerancia anti-replay lo acepte.
beforeEach(() => {
  vi.useFakeTimers({ now: 1_720_000_000_000, toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  fetchMock.mockReset();
});

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

  it('rejects a correctly signed webhook whose timestamp is outside the replay tolerance window', async () => {
    const dataId = 'pa_replay';
    const requestId = 'req_replay';
    const staleTs = '1719999000';
    const v1 = await sign('test-mp-secret', requestId, dataId, staleTs);
    const body = JSON.stringify({ type: 'subscription_preapproval', data: { id: dataId } });

    await expect(
      mercadopagoProvider.verifyWebhook(body, `ts=${staleTs},v1=${v1};x-request-id=${requestId}`),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(result).not.toHaveProperty('currentPeriodEnd');
  });

  // MercadoPago devuelve el preapproval cancelado como `cancelled` (doble L) en
  // la API real; su documentación a veces escribe `canceled`. Ambas deben mapear
  // al estado terminal.
  it.each(['cancelled', 'canceled'])(
    'maps Mercado Pago "%s" preapproval status to subscription_canceled',
    async (canceledStatus) => {
      const dataId = `pa_2_${canceledStatus}`;
      const requestId = `req_2_${canceledStatus}`;
      const ts = '1720000000';
      const v1 = await sign('test-mp-secret', requestId, dataId, ts);
      const body = JSON.stringify({ type: 'subscription_preapproval', data: { id: dataId } });

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: dataId,
          status: canceledStatus,
          external_reference: 'acc_2',
          next_payment_date: '2026-08-08T00:00:00.000-04:00',
        }),
      });

      const result = await mercadopagoProvider.verifyWebhook(
        body,
        `ts=${ts},v1=${v1};x-request-id=${requestId}`,
      );
      expect(result?.type).toBe('subscription_canceled');
      expect(result).not.toHaveProperty('accessUntil');
    },
  );

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
        json: async () => ({
          id: paymentId,
          status: 'approved',
          transaction_amount: '19990',
          transaction_amount_refunded: '0',
          currency_id: 'CLP',
        }),
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

  it('returns a typed partial-refund observation before normalizing a linked approved payment', async () => {
    const paymentId = 'payment-partial';
    const requestId = 'req-payment-partial';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: paymentId,
          status: 'approved',
          transaction_amount: '19990',
          transaction_amount_refunded: '5000',
          currency_id: 'CLP',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'invoice-partial',
              preapproval_id: 'preapproval-partial',
              external_reference: '00000000-0000-0000-0000-00000000a111',
              transaction_amount: '19990',
              currency_id: 'CLP',
              date_created: '2026-08-31T00:00:00.000-04:00',
              payment: { id: paymentId, status: 'approved' },
            },
          ],
        }),
      });

    await expect(
      mercadopagoProvider.verifyWebhook(
        JSON.stringify({ type: 'payment', data: { id: paymentId } }),
        `ts=${ts},v1=${v1};x-request-id=${requestId}`,
        { dataId: paymentId, webhookId: 'notification-partial' },
      ),
    ).resolves.toEqual({
      provider: 'mercadopago',
      type: 'financial_anomaly_observed',
      externalEventId: 'mercadopago:webhook:notification-partial',
      accountReference: '00000000-0000-0000-0000-00000000a111',
      externalSubscriptionId: 'preapproval-partial',
      observation: {
        anomalyType: 'partial_refund',
        externalResourceId: paymentId,
        observedStatus: 'approved',
        originalAmount: 19_990,
        affectedAmount: 5_000,
        currency: 'CLP',
      },
      raw: expect.any(Object),
    });
  });

  it.each([
    ['external_reference', { preapproval_id: 'preapproval-missing-reference' }],
    ['preapproval_id', { external_reference: 'account-missing-preapproval' }],
  ])(
    'returns a typed recoverable correlation failure for an adverse payment missing %s',
    async (missingIdentity, invoiceIdentity) => {
      const paymentId = `payment-missing-${missingIdentity}`;
      const requestId = `req-missing-${missingIdentity}`;
      const notificationId = `notification-missing-${missingIdentity}`;
      const ts = '1720000000';
      const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: paymentId,
            status: 'approved',
            transaction_amount: '19990',
            transaction_amount_refunded: '5000',
            currency_id: 'CLP',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [
              {
                id: `invoice-missing-${missingIdentity}`,
                ...invoiceIdentity,
                transaction_amount: '19990',
                currency_id: 'CLP',
                date_created: '2026-08-31T00:00:00.000-04:00',
                payment: { id: paymentId, status: 'approved' },
              },
            ],
          }),
        });

      await expect(
        mercadopagoProvider.verifyWebhook(
          JSON.stringify({ type: 'payment', data: { id: paymentId } }),
          `ts=${ts},v1=${v1};x-request-id=${requestId}`,
          { dataId: paymentId, webhookId: notificationId },
        ),
      ).resolves.toEqual({
        provider: 'mercadopago',
        type: 'webhook_correlation_failed',
        externalEventId: `mercadopago:webhook:${notificationId}`,
        resourceType: 'payment',
        resourceId: paymentId,
        reason: `missing_${missingIdentity}`,
        raw: expect.any(Object),
      });
    },
  );

  it('returns a typed full-refund observation for equal normalized amounts', async () => {
    const paymentId = 'payment-full-refund';
    const requestId = 'req-payment-full-refund';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: paymentId,
          status: 'approved',
          transaction_amount: '19990',
          transaction_amount_refunded: '19990',
          currency_id: 'CLP',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'invoice-full-refund',
              preapproval_id: 'preapproval-full-refund',
              external_reference: 'account-full-refund',
              transaction_amount: '19990',
              currency_id: 'CLP',
              date_created: '2026-08-31T00:00:00.000-04:00',
              payment: { id: paymentId, status: 'approved' },
            },
          ],
        }),
      });

    await expect(
      mercadopagoProvider.verifyWebhook(
        JSON.stringify({ type: 'payment', data: { id: paymentId } }),
        `ts=${ts},v1=${v1};x-request-id=${requestId}`,
        { dataId: paymentId, webhookId: 'notification-full-refund' },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        type: 'financial_anomaly_observed',
        observation: {
          anomalyType: 'refund',
          externalResourceId: paymentId,
          observedStatus: 'approved',
          originalAmount: 19_990,
          affectedAmount: 19_990,
          currency: 'CLP',
        },
      }),
    );
  });

  it.each([
    ['refunded', 'refund'],
    ['charged_back', 'chargeback'],
    ['in_mediation', 'mediation'],
  ] as const)(
    'prioritizes fresh %s evidence over an approved authorized-payment row',
    async (status, anomalyType) => {
      const paymentId = `payment-${status}`;
      const requestId = `req-${status}`;
      const ts = '1720000000';
      const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: paymentId,
            status,
            transaction_amount: '19990',
            currency_id: 'CLP',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [
              {
                id: `invoice-${status}`,
                preapproval_id: `preapproval-${status}`,
                external_reference: 'account-financial-status',
                transaction_amount: '19990',
                currency_id: 'CLP',
                date_created: '2026-08-31T00:00:00.000-04:00',
                payment: { id: paymentId, status: 'approved' },
              },
            ],
          }),
        });

      await expect(
        mercadopagoProvider.verifyWebhook(
          JSON.stringify({ type: 'payment', data: { id: paymentId } }),
          `ts=${ts},v1=${v1};x-request-id=${requestId}`,
          { dataId: paymentId, webhookId: `notification-${status}` },
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          type: 'financial_anomaly_observed',
          externalSubscriptionId: `preapproval-${status}`,
          observation: expect.objectContaining({ anomalyType, observedStatus: status }),
        }),
      );
    },
  );

  it('keeps over-refund evidence as a full refund without incompatible amounts', async () => {
    const paymentId = 'payment-over-refund';
    const requestId = 'req-over-refund';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: paymentId,
          status: 'approved',
          transaction_amount: '19990',
          transaction_amount_refunded: '20000',
          currency_id: 'CLP',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'invoice-over-refund',
              preapproval_id: 'preapproval-over-refund',
              external_reference: 'account-over-refund',
              transaction_amount: '19990',
              currency_id: 'CLP',
              date_created: '2026-08-31T00:00:00.000-04:00',
              payment: { id: paymentId, status: 'approved' },
            },
          ],
        }),
      });

    const result = await mercadopagoProvider.verifyWebhook(
      JSON.stringify({ type: 'payment', data: { id: paymentId } }),
      `ts=${ts},v1=${v1};x-request-id=${requestId}`,
      { dataId: paymentId, webhookId: 'notification-over-refund' },
    );

    expect(result).toEqual(
      expect.objectContaining({
        type: 'financial_anomaly_observed',
        observation: expect.objectContaining({
          anomalyType: 'refund',
          externalResourceId: paymentId,
          observedStatus: 'approved',
        }),
      }),
    );
    if (result?.type === 'financial_anomaly_observed') {
      expect(result.observation).not.toHaveProperty('originalAmount');
      expect(result.observation).not.toHaveProperty('affectedAmount');
    }
  });

  it('validates the fresh payment identity before classifying adverse evidence', async () => {
    const paymentId = 'payment-identity';
    const requestId = 'req-payment-identity';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'different-payment',
          status: 'refunded',
          transaction_amount: '19990',
          transaction_amount_refunded: '19990',
          currency_id: 'CLP',
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

    await expect(
      mercadopagoProvider.verifyWebhook(
        JSON.stringify({ type: 'payment', data: { id: paymentId } }),
        `ts=${ts},v1=${v1};x-request-id=${requestId}`,
        { dataId: paymentId, webhookId: 'notification-identity' },
      ),
    ).resolves.toBeNull();
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
      externalEventId: 'mercadopago:webhook:notification_not_subscription',
      resourceType: 'payment',
      resourceId: paymentId,
      observedStatus: 'approved',
      raw: {
        notification: { type: 'payment', data: { id: paymentId } },
        payment: { id: paymentId, status: 'approved' },
      },
    });
  });

  it('keeps an ordinary linked payment status divergence on its non-financial path', async () => {
    const paymentId = 'payment_rejected';
    const requestId = 'req_payment_rejected';
    const ts = '1720000000';
    const v1 = await sign('test-mp-secret', requestId, paymentId, ts);
    const body = JSON.stringify({ type: 'payment', data: { id: paymentId } });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: paymentId, status: 'rejected' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'invoice_rejected',
              preapproval_id: 'pa_rejected',
              external_reference: 'acc_rejected',
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
        webhookId: 'notification_payment_rejected',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'mercadopago',
        type: 'webhook_acknowledged',
        reason: 'payment_status_divergence',
        externalEventId: 'mercadopago:webhook:notification_payment_rejected',
        resourceType: 'payment',
        resourceId: paymentId,
        observedStatus: 'rejected',
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
        debit_date: '2026-01-31T12:00:00-03:00',
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
        periodStart: '2026-01-31T15:00:00.000Z',
        periodEnd: '2026-02-28T15:00:00.000Z',
      }),
    );
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'not-a-date'],
  ])(
    'keeps an approved authorized payment with %s debit_date valid but without a paid period',
    async (_description, debitDate) => {
      const dataId = `authorized_payment_${_description}_debit_date`;
      const requestId = `req_${_description}_debit_date`;
      const ts = '1720000000';
      const v1 = await sign('test-mp-secret', requestId, dataId, ts);
      const body = JSON.stringify({
        type: 'subscription_authorized_payment',
        data: { id: dataId },
      });

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: `invoice_${_description}_debit_date`,
          preapproval_id: 'pa_1',
          external_reference: 'acc_1',
          transaction_amount: '29900',
          currency_id: 'CLP',
          date_created: '2026-07-08T00:00:00.000-04:00',
          ...(debitDate === undefined ? {} : { debit_date: debitDate }),
          payment: { id: `payment_${_description}_debit_date`, status: 'approved' },
        }),
      });

      const result = await mercadopagoProvider.verifyWebhook(
        body,
        `ts=${ts},v1=${v1};x-request-id=${requestId}`,
      );

      expect(result).toEqual(expect.objectContaining({ type: 'invoice_paid' }));
      expect(result).not.toHaveProperty('periodStart');
      expect(result).not.toHaveProperty('periodEnd');
    },
  );

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
      externalEventId: `mercadopago:unknown:${dataId}`,
      resourceType: 'unknown',
      resourceId: dataId,
      raw: { type: 'unsupported_topic', data: { id: dataId } },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('mercadopagoProvider.recoverResource', () => {
  it('converges a previously unlinked payment using the same event normalizer', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'pay_recovery', status: 'approved' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'invoice_recovery',
              preapproval_id: 'pa_recovery',
              external_reference: 'intent_recovery',
              transaction_amount: '19990',
              currency_id: 'CLP',
              date_created: '2026-09-09T10:00:00Z',
              date_approved: '2026-09-09T10:01:00Z',
              payment: { id: 'pay_recovery', status: 'approved' },
            },
          ],
        }),
      });

    await expect(
      mercadopagoProvider.recoverResource?.({
        resourceType: 'payment',
        resourceId: 'pay_recovery',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        kind: 'event',
        event: expect.objectContaining({ type: 'invoice_paid', paidAt: '2026-09-09T10:01:00Z' }),
      }),
    );
  });

  it('keeps an unindexed payment pending instead of guessing that it is unrelated', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'pay_delayed', status: 'approved' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

    await expect(
      mercadopagoProvider.recoverResource?.({ resourceType: 'payment', resourceId: 'pay_delayed' }),
    ).resolves.toEqual({ kind: 'pending' });
  });

  it('classifies a fresh partially refunded payment with normalized CLP evidence', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'pay-partial',
          status: 'approved',
          transaction_amount: '19990',
          transaction_amount_refunded: '5000',
          currency_id: 'CLP',
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

    await expect(
      mercadopagoProvider.recoverResource?.({ resourceType: 'payment', resourceId: 'pay-partial' }),
    ).resolves.toEqual({
      kind: 'anomaly',
      observation: {
        anomalyType: 'partial_refund',
        externalResourceId: 'pay-partial',
        observedStatus: 'approved',
        originalAmount: 19990,
        affectedAmount: 5000,
        currency: 'CLP',
      },
    });
  });

  it('classifies a fully refunded payment from fresh monetary evidence', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'pay-full',
          status: 'approved',
          transaction_amount: 19990,
          transaction_amount_refunded: 19990,
          currency_id: 'CLP',
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

    await expect(
      mercadopagoProvider.recoverResource?.({ resourceType: 'payment', resourceId: 'pay-full' }),
    ).resolves.toEqual({
      kind: 'anomaly',
      observation: {
        anomalyType: 'refund',
        externalResourceId: 'pay-full',
        observedStatus: 'approved',
        originalAmount: 19990,
        affectedAmount: 19990,
        currency: 'CLP',
      },
    });
  });

  it('retains a proven refund but omits unbounded over-refund amounts', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'pay-over-refund',
        status: 'refunded',
        transaction_amount: 19990,
        transaction_amount_refunded: 20000,
        currency_id: 'CLP',
      }),
    });

    await expect(
      mercadopagoProvider.recoverResource?.({
        resourceType: 'payment',
        resourceId: 'pay-over-refund',
      }),
    ).resolves.toEqual({
      kind: 'anomaly',
      observation: {
        anomalyType: 'refund',
        externalResourceId: 'pay-over-refund',
        observedStatus: 'refunded',
        currency: 'CLP',
      },
    });
  });

  it('rejects a fresh payment whose returned id does not match the requested resource', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'pay-other',
        status: 'refunded',
        transaction_amount: 19990,
        transaction_amount_refunded: 19990,
        currency_id: 'CLP',
      }),
    });

    await expect(
      mercadopagoProvider.recoverResource?.({
        resourceType: 'payment',
        resourceId: 'pay-requested',
      }),
    ).resolves.toEqual({ kind: 'unrelated' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['charged_back', 'chargeback'],
    ['in_mediation', 'mediation'],
    ['refunded', 'refund'],
  ] as const)(
    'retains a proven %s anomaly when monetary evidence is unavailable',
    async (status, anomalyType) => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: `pay-${status}`,
            status,
            transaction_amount: '-1',
            currency_id: 'CLP',
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

      await expect(
        mercadopagoProvider.recoverResource?.({
          resourceType: 'payment',
          resourceId: `pay-${status}`,
        }),
      ).resolves.toEqual({
        kind: 'anomaly',
        observation: {
          anomalyType,
          externalResourceId: `pay-${status}`,
          observedStatus: status,
          currency: 'CLP',
        },
      });
    },
  );

  it.each([
    {
      name: 'a zero refund amount',
      payment: {
        id: 'pay-zero-refund',
        status: 'approved',
        transaction_amount: '19990',
        transaction_amount_refunded: '0',
        currency_id: 'CLP',
      },
    },
    {
      name: 'a decimal CLP amount',
      payment: {
        id: 'pay-decimal-clp',
        status: 'approved',
        transaction_amount: '19990.50',
        transaction_amount_refunded: '5000',
        currency_id: 'CLP',
      },
    },
    {
      name: 'a decimal CLP refunded amount',
      payment: {
        id: 'pay-decimal-refund-clp',
        status: 'approved',
        transaction_amount: '19990',
        transaction_amount_refunded: '5000.50',
        currency_id: 'CLP',
      },
    },
    {
      name: 'a negative original amount',
      payment: {
        id: 'pay-negative-original',
        status: 'approved',
        transaction_amount: '-19990',
        transaction_amount_refunded: '5000',
        currency_id: 'CLP',
      },
    },
    {
      name: 'a negative refund amount',
      payment: {
        id: 'pay-negative-refund',
        status: 'approved',
        transaction_amount: '19990',
        transaction_amount_refunded: '-5000',
        currency_id: 'CLP',
      },
    },
    {
      name: 'a missing currency',
      payment: {
        id: 'pay-missing-currency',
        status: 'approved',
        transaction_amount: '19990',
        transaction_amount_refunded: '5000',
      },
    },
    {
      name: 'a lowercase currency',
      payment: {
        id: 'pay-lowercase-currency',
        status: 'approved',
        transaction_amount: '19990',
        transaction_amount_refunded: '5000',
        currency_id: 'clp',
      },
    },
    {
      name: 'a malformed currency',
      payment: {
        id: 'pay-malformed-currency',
        status: 'approved',
        transaction_amount: '19990',
        transaction_amount_refunded: '5000',
        currency_id: 'CLPX',
      },
    },
  ])('never guesses a partial refund from $name', async ({ payment }) => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => payment })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

    await expect(
      mercadopagoProvider.recoverResource?.({ resourceType: 'payment', resourceId: payment.id }),
    ).resolves.toEqual({ kind: 'pending' });
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
      externalReference: 'intent_123',
    });

    expect(getProviderPrice).toHaveBeenCalledWith({
      planSlug: 'pro',
      interval: 'month',
      provider: 'mercadopago',
      currency: 'CLP',
    });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(request.body as string)).toEqual({
      reason: 'Iroko pro subscription',
      external_reference: 'intent_123',
      payer_email: 'owner@example.com',
      back_url: 'https://app/ok',
      notification_url: 'https://app.example.com/api/webhooks/mercadopago',
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

  it('strips the query string from back_url so the provider return URL stays well formed', async () => {
    getProviderPrice.mockResolvedValue({ amount: 19_990, currency: 'CLP', externalPriceId: null });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'pa_back', init_point: 'https://mp/checkout' }),
    });

    await mercadopagoProvider.createCheckout({
      accountId: 'acc_1',
      customerEmail: 'owner@example.com',
      planSlug: 'pro',
      interval: 'month',
      successUrl: 'https://app.example.com/es/dashboard/billing?status=success',
      cancelUrl: 'https://app.example.com/es/dashboard/billing?status=cancelled',
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(request.body as string).back_url).toBe(
      'https://app.example.com/es/dashboard/billing',
    );
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

  it('surfaces the provider rejection reason so a failed checkout is diagnosable', async () => {
    getProviderPrice.mockResolvedValue({ amount: 19_990, currency: 'CLP', externalPriceId: null });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        message: 'Invalid test user email',
        error: 'bad_request',
        cause: [{ code: 2198, description: 'Invalid test user email' }],
      }),
    });

    await expect(
      mercadopagoProvider.createCheckout({
        accountId: 'acc_1',
        customerEmail: 'owner@example.com',
        planSlug: 'pro',
        interval: 'month',
        successUrl: 'https://app/ok',
        cancelUrl: 'https://app/no',
      }),
    ).rejects.toThrow(/^mercadopago_post_failed_400:.*code=2198/);
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

  it.each(['cancelled', 'canceled'])(
    'confirms immediate cancellation when Mercado Pago returns "%s"',
    async (confirmedStatus) => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'pa_1', status: confirmedStatus }),
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
          signal: expect.any(AbortSignal),
        }),
      );
    },
  );

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

describe('mercadopagoProvider.discoverSubscriptionInvoices', () => {
  function authorizedPayment(
    index: number,
    status: 'approved' | 'rejected' = 'approved',
    overrides: Record<string, unknown> = {},
  ) {
    return {
      id: `invoice_${index}`,
      preapproval_id: 'pa /subscription?',
      external_reference: 'account_discovery',
      transaction_amount: '29900',
      currency_id: 'CLP',
      date_created: `2026-09-${String((index % 20) + 1).padStart(2, '0')}T10:00:00Z`,
      last_modified: `2026-09-${String((index % 20) + 1).padStart(2, '0')}T11:00:00Z`,
      payment: {
        id: `payment_${index}`,
        status,
        ...(status === 'rejected' ? { status_detail: 'cc_rejected' } : {}),
      },
      ...overrides,
    };
  }

  it('paginates exact preapproval invoices without duplicates and returns a stable watermark', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => authorizedPayment(index));
    const secondPage = Array.from({ length: 5 }, (_, index) => authorizedPayment(index + 20));
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paging: { offset: 0, limit: 20, total: 25 }, results: firstPage }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paging: { offset: 20, limit: 20, total: 25 }, results: secondPage }),
      });

    const first = await mercadopagoProvider.discoverSubscriptionInvoices?.({
      externalSubscriptionId: 'pa /subscription?',
      modifiedSince: '2026-09-01T00:00:00Z',
      pageSize: 20,
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.mercadopago.com/authorized_payments/search?preapproval_id=pa%20%2Fsubscription%3F&limit=20&offset=0',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(first).toMatchObject({
      nextCursor: expect.any(String),
      providerWatermark: '2026-09-20T11:00:00Z',
    });
    expect(first?.events).toHaveLength(20);

    const second = await mercadopagoProvider.discoverSubscriptionInvoices?.({
      externalSubscriptionId: 'pa /subscription?',
      modifiedSince: '2026-09-01T00:00:00Z',
      pageSize: 20,
      cursor: first?.nextCursor ?? undefined,
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.mercadopago.com/authorized_payments/search?preapproval_id=pa%20%2Fsubscription%3F&limit=20&offset=20',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(second).toMatchObject({ nextCursor: null, providerWatermark: '2026-09-05T11:00:00Z' });
    expect(second?.events).toHaveLength(5);
    expect(
      new Set(
        [...(first?.events ?? []), ...(second?.events ?? [])].map((event) => event.externalEventId),
      ),
    ).toHaveLength(25);
  });

  it('rejects a page that includes an invoice from another preapproval', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        paging: { offset: 0, limit: 1, total: 1 },
        results: [authorizedPayment(1, 'approved', { preapproval_id: 'pa_other' })],
      }),
    });

    await expect(
      mercadopagoProvider.discoverSubscriptionInvoices?.({
        externalSubscriptionId: 'pa /subscription?',
        modifiedSince: '2026-09-01T00:00:00Z',
        pageSize: 1,
      }),
    ).rejects.toThrow('mercadopago_discovery_identity_mismatch');
  });

  it.each([
    ['bad paging total', undefined, { offset: 0, limit: 1, total: '1' }],
    ['wrong returned offset', undefined, { offset: 1, limit: 1, total: 1 }],
    ['wrong returned limit', undefined, { offset: 0, limit: 2, total: 1 }],
    ['cursor with an unknown key', 'eyJvZmZzZXQiOjAsImV4dHJhIjp0cnVlfQ', undefined],
    ['cursor with a negative offset', 'eyJvZmZzZXQiOi0xfQ', undefined],
  ] as const)('rejects %s', async (_description, cursor, paging) => {
    if (paging) {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ paging, results: [authorizedPayment(1)] }),
      });
    }

    await expect(
      mercadopagoProvider.discoverSubscriptionInvoices?.({
        externalSubscriptionId: 'pa /subscription?',
        modifiedSince: '2026-09-01T00:00:00Z',
        pageSize: 1,
        ...(cursor ? { cursor } : {}),
      }),
    ).rejects.toThrow(/mercadopago_discovery_(invalid_paging|invalid_cursor)/);
  });

  it('rejects a cursor offset not divisible by the requested page size', async () => {
    await expect(
      mercadopagoProvider.discoverSubscriptionInvoices?.({
        externalSubscriptionId: 'pa /subscription?',
        modifiedSince: '2026-09-01T00:00:00Z',
        pageSize: 2,
        cursor: 'eyJvZmZzZXQiOjF9',
      }),
    ).rejects.toThrow('mercadopago_discovery_invalid_cursor');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an incomplete non-terminal page so it cannot emit an unaligned cursor', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        paging: { offset: 0, limit: 2, total: 3 },
        results: [authorizedPayment(1)],
      }),
    });

    await expect(
      mercadopagoProvider.discoverSubscriptionInvoices?.({
        externalSubscriptionId: 'pa /subscription?',
        modifiedSince: '2026-09-01T00:00:00Z',
        pageSize: 2,
      }),
    ).rejects.toThrow('mercadopago_discovery_invalid_paging');
  });

  it('treats an impossible RFC3339 calendar date as unknown modification evidence', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        paging: { offset: 0, limit: 1, total: 1 },
        results: [authorizedPayment(4, 'approved', { last_modified: '2026-02-30T11:00:00Z' })],
      }),
    });

    const result = await mercadopagoProvider.discoverSubscriptionInvoices?.({
      externalSubscriptionId: 'pa /subscription?',
      modifiedSince: '2026-09-01T00:00:00Z',
      pageSize: 1,
    });

    expect(result).toMatchObject({ providerWatermark: null });
    expect(result?.events).toHaveLength(1);
  });

  it('emits invalid RFC3339 clock and offset values conservatively without advancing the watermark', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        paging: { offset: 0, limit: 2, total: 2 },
        results: [
          authorizedPayment(8, 'approved', { last_modified: '2026-09-02T24:00:00Z' }),
          authorizedPayment(9, 'approved', { last_modified: '2026-09-02T00:00:00+24:00' }),
        ],
      }),
    });

    const result = await mercadopagoProvider.discoverSubscriptionInvoices?.({
      externalSubscriptionId: 'pa /subscription?',
      modifiedSince: '2026-09-01T00:00:00Z',
      pageSize: 2,
    });

    expect(result).toMatchObject({ providerWatermark: null });
    expect(result?.events).toHaveLength(2);
  });

  it('advances to the next page after a fully stale page so it can emit a later invoice', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paging: { offset: 0, limit: 2, total: 3 },
          results: [
            authorizedPayment(5, 'approved', { last_modified: '2026-08-30T00:00:00Z' }),
            authorizedPayment(6, 'approved', { last_modified: '2026-08-31T00:00:00Z' }),
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paging: { offset: 2, limit: 2, total: 3 },
          results: [authorizedPayment(7, 'approved', { last_modified: '2026-09-02T00:00:00Z' })],
        }),
      });

    const first = await mercadopagoProvider.discoverSubscriptionInvoices?.({
      externalSubscriptionId: 'pa /subscription?',
      modifiedSince: '2026-09-01T00:00:00Z',
      pageSize: 2,
    });
    expect(first).toMatchObject({ events: [], nextCursor: expect.any(String) });

    const second = await mercadopagoProvider.discoverSubscriptionInvoices?.({
      externalSubscriptionId: 'pa /subscription?',
      modifiedSince: '2026-09-01T00:00:00Z',
      pageSize: 2,
      cursor: first?.nextCursor ?? undefined,
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.mercadopago.com/authorized_payments/search?preapproval_id=pa%20%2Fsubscription%3F&limit=2&offset=2',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      second?.events.map((event) =>
        event.type === 'invoice_paid' || event.type === 'invoice_payment_failed' ?
          event.externalInvoiceId
        : undefined,
      ),
    ).toEqual(['invoice_7']);
  });

  it.each([
    [0, 1],
    [100, 20],
  ])('clamps requested page size %d to provider limit %d', async (pageSize, expectedLimit) => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ paging: { offset: 0, limit: expectedLimit, total: 0 }, results: [] }),
    });

    await mercadopagoProvider.discoverSubscriptionInvoices?.({
      externalSubscriptionId: 'pa /subscription?',
      modifiedSince: '2026-09-01T00:00:00Z',
      pageSize,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.mercadopago.com/authorized_payments/search?preapproval_id=pa%20%2Fsubscription%3F&limit=${expectedLimit}&offset=0`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('filters only valid stale modifications, emits unknown modifications conservatively, and normalizes lifecycle events', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        paging: { offset: 0, limit: 4, total: 4 },
        results: [
          authorizedPayment(1, 'approved', { last_modified: '2026-08-31T23:59:59Z' }),
          authorizedPayment(2, 'approved', { last_modified: 'not-a-date' }),
          authorizedPayment(3, 'rejected', { last_modified: '2026-09-02T00:00:00Z' }),
          authorizedPayment(3, 'approved', { last_modified: '2026-09-03T00:00:00Z' }),
        ],
      }),
    });

    const result = await mercadopagoProvider.discoverSubscriptionInvoices?.({
      externalSubscriptionId: 'pa /subscription?',
      modifiedSince: '2026-09-01T00:00:00Z',
      pageSize: 4,
    });

    expect(result).toMatchObject({ nextCursor: null, providerWatermark: '2026-09-03T00:00:00Z' });
    expect(result?.events.map((event) => event.type)).toEqual([
      'invoice_paid',
      'invoice_payment_failed',
      'invoice_paid',
    ]);
    expect(result?.events.map((event) => event.externalEventId)).toEqual([
      'authorized_payment:invoice_2:payment_2:approved',
      'authorized_payment:invoice_3:payment_3:rejected',
      'authorized_payment:invoice_3:payment_3:approved',
    ]);
  });
});
