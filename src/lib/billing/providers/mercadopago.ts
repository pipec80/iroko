import { env } from '@/env';

import type {
  CheckoutParams,
  NormalizedEvent,
  PaymentProvider,
  PortalParams,
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
  transaction_amount: number;
  currency_id: string;
  date_created: string;
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

/** Adapter real de MercadoPago (F2-2A-providers). checkout/portal/cancel se
 * completan en la siguiente tarea del plan; por ahora lanzan si se llaman. */
export const mercadopagoProvider: PaymentProvider = {
  name: 'mercadopago',

  async createCheckout(_params: CheckoutParams): Promise<{ url: string }> {
    throw new Error('not_implemented_yet');
  },

  async createPortalSession(params: PortalParams): Promise<{ url: string }> {
    return { url: params.returnUrl };
  },

  async cancelSubscription(_externalId: string, _atPeriodEnd: boolean): Promise<void> {
    throw new Error('not_implemented_yet');
  },

  async verifyWebhook(rawBody: string, signature: string): Promise<NormalizedEvent | null> {
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
      const status = mapPreapprovalStatus(preapproval.status);
      return {
        externalEventId: `${preapproval.id}_${preapproval.status}`,
        type: status === 'canceled' ? 'subscription_canceled' : 'subscription_updated',
        accountId: preapproval.external_reference,
        status,
        externalSubscriptionId: preapproval.id,
        currentPeriodEnd: preapproval.next_payment_date,
        raw: preapproval,
      };
    }

    if (body.type === 'subscription_authorized_payment') {
      const payment = await fetchResource<AuthorizedPaymentResource>(
        `/authorized_payments/${body.data.id}`,
      );
      return {
        externalEventId: payment.id,
        type: 'invoice_paid',
        accountId: payment.external_reference,
        externalSubscriptionId: payment.preapproval_id,
        invoice: {
          amountPaid: payment.transaction_amount,
          currency: payment.currency_id,
          periodStart: payment.date_created,
          periodEnd: payment.date_created,
        },
        raw: payment,
      };
    }

    return null;
  },
};
