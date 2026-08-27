import { env } from '@/env';

import { getProviderPrice } from '../catalog';
import type { NormalizedBillingEvent } from '../events';
import type {
  CancelSubscriptionParams,
  CheckoutParams,
  PaymentProvider,
  SubscriptionStatus,
} from '../types';

const API_BASE = 'https://api.mercadopago.com';

interface WebhookBody {
  type: string;
  data: { id: string };
}

interface PreapprovalResource {
  id: string;
  status: string;
  external_reference: string;
  next_payment_date?: string;
  date_created?: string;
}

interface AuthorizedPaymentResource {
  id: string;
  preapproval_id: string;
  external_reference: string;
  transaction_amount?: number;
  currency_id?: string;
  date_created: string;
  payment: {
    id: string;
    status: string;
    status_detail?: string;
  };
}

function toMercadoPagoTransactionAmount(amount: number, currency: string): number {
  return currency === 'CLP' ? amount : amount / 100;
}

function isValidProviderPrice(price: { amount: number; currency: string }): boolean {
  return (
    Number.isSafeInteger(price.amount) && price.amount >= 0 && /^[A-Z]{3}$/.test(price.currency)
  );
}

/** MercadoPago no distingue 'authorized'/'cancelled' 1:1 con SubscriptionStatus
 * — mapea los estados de Preapproval al enum interno. */
function mapPreapprovalStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'authorized':
      return 'active';
    case 'paused':
      return 'paused';
    case 'cancelled':
      return 'canceled';
    case 'pending':
      return 'incomplete';
    default:
      return 'incomplete';
  }
}

/** MercadoPago separa ts/v1 con ',' (dentro del header x-signature) y
 * x-request-id llega en su propio header — route.ts los concatena con ';'
 * antes de llamar acá. split('=') sobre "ts=123,v1=abc" partiría en 3 en vez
 * de 2, por eso se usa indexOf para el primer '=' de cada segmento. */
async function verifyManifest(signature: string, dataId: string): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const segment of signature.split(/[,;]/)) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    parts[segment.slice(0, eq).trim()] = segment.slice(eq + 1).trim();
  }
  const ts = parts.ts;
  const requestId = parts['x-request-id'];
  const v1 = parts.v1;
  if (!ts || !requestId || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.MERCADOPAGO_WEBHOOK_SECRET ?? ''),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return computed === v1;
}

async function fetchResource<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN ?? ''}` },
  });
  if (!res.ok) throw new Error(`mercadopago_fetch_failed_${res.status}`);
  return (await res.json()) as T;
}

async function postResource<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`mercadopago_post_failed_${res.status}`);
  return (await res.json()) as T;
}

async function putResource<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`mercadopago_put_failed_${res.status}`);
  return (await res.json()) as T;
}

/** Adapter real de MercadoPago (F2-2A-providers). */
export const mercadopagoProvider: PaymentProvider = {
  name: 'mercadopago',
  capabilities: {
    customerPortal: false,
    cancelImmediately: true,
    cancelAtPeriodEnd: false,
    updatePaymentMethod: false,
    changePlan: false,
    pauseSubscription: true,
  },

  async createCheckout(
    params: CheckoutParams,
  ): Promise<{ url: string; externalSubscriptionId: string }> {
    const providerPrice = await getProviderPrice({
      planSlug: params.planSlug,
      interval: params.interval,
      provider: 'mercadopago',
      currency: 'CLP',
    });
    if (!isValidProviderPrice(providerPrice)) {
      throw new Error('provider_price_invalid');
    }

    // MercadoPago no distingue success/cancel: solo hay un back_url. cancelUrl
    // se ignora deliberadamente en este adapter (documentado en el spec, §4).
    const preapproval = await postResource<{ id: string; init_point: string }>('/preapproval', {
      reason: `Iroko ${params.planSlug} subscription`,
      external_reference: params.accountId,
      payer_email: params.customerEmail,
      back_url: params.successUrl,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: toMercadoPagoTransactionAmount(
          providerPrice.amount,
          providerPrice.currency,
        ),
        currency_id: providerPrice.currency,
      },
    });
    return { url: preapproval.init_point, externalSubscriptionId: preapproval.id };
  },

  async cancelSubscription(params: CancelSubscriptionParams): Promise<void> {
    if (params.timing === 'period_end') {
      throw new Error('billing_capability_not_supported:cancelAtPeriodEnd');
    }
    const preapproval = await putResource<{ status: string }>(
      `/preapproval/${params.externalSubscriptionId}`,
      { status: 'cancelled' },
    );
    if (preapproval.status !== 'cancelled') {
      throw new Error('mercadopago_cancellation_not_confirmed');
    }
  },

  async verifyWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent | null> {
    let body: WebhookBody;
    try {
      body = JSON.parse(rawBody) as WebhookBody;
    } catch {
      return null;
    }
    if (!body.data?.id) return null;
    if (!(await verifyManifest(signature, body.data.id))) return null;

    if (body.type === 'subscription_preapproval') {
      const preapproval = await fetchResource<PreapprovalResource>(`/preapproval/${body.data.id}`);
      if (!preapproval.external_reference) return null;
      const status = mapPreapprovalStatus(preapproval.status);
      if (status === 'canceled') {
        return {
          provider: 'mercadopago',
          externalEventId: `${preapproval.id}_${preapproval.status}`,
          type: 'subscription_canceled',
          accountId: preapproval.external_reference,
          externalSubscriptionId: preapproval.id,
          canceledAt: preapproval.date_created,
          accessUntil: preapproval.next_payment_date,
          raw: preapproval,
        };
      }
      return {
        provider: 'mercadopago',
        externalEventId: `${preapproval.id}_${preapproval.status}`,
        type: 'subscription_updated',
        accountId: preapproval.external_reference,
        status,
        externalSubscriptionId: preapproval.id,
        currentPeriodEnd: preapproval.next_payment_date,
        // Mercado Pago has no supported period-end cancellation capability.
        cancelAtPeriodEnd: false,
        raw: preapproval,
      };
    }

    if (body.type === 'subscription_authorized_payment') {
      const payment = await fetchResource<AuthorizedPaymentResource>(
        `/authorized_payments/${body.data.id}`,
      );
      if (!payment.external_reference) return null;
      if (payment.payment.status !== 'approved') {
        return {
          provider: 'mercadopago',
          externalEventId: payment.id,
          type: 'invoice_payment_failed',
          accountId: payment.external_reference,
          externalSubscriptionId: payment.preapproval_id,
          externalInvoiceId: payment.id,
          externalPaymentId: payment.payment.id,
          ...(payment.transaction_amount === undefined ?
            {}
          : { amountDue: payment.transaction_amount }),
          ...(payment.currency_id === undefined ? {} : { currency: payment.currency_id }),
          failureCode: payment.payment.status_detail,
          attemptedAt: payment.date_created,
          raw: payment,
        };
      }
      if (payment.transaction_amount === undefined || payment.currency_id === undefined)
        return null;
      return {
        provider: 'mercadopago',
        externalEventId: payment.id,
        type: 'invoice_paid',
        accountId: payment.external_reference,
        externalSubscriptionId: payment.preapproval_id,
        externalInvoiceId: payment.id,
        externalPaymentId: payment.payment.id,
        amountPaid: payment.transaction_amount,
        currency: payment.currency_id,
        paidAt: payment.date_created,
        raw: payment,
      };
    }

    return null;
  },
};
