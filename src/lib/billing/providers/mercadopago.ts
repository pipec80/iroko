import { env } from '@/env';
import { createClient } from '@/lib/supabase/server';

import type {
  CheckoutParams,
  NormalizedEvent,
  PaymentProvider,
  PortalParams,
  SubscriptionStatus,
} from '../types';
import { handleProviderWebhook } from '../webhook-handler';

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

/** cancelSubscription solo recibe externalId (contrato de PaymentProvider) —
 * para la cancelación diferida hace falta accountId, que se resuelve acá vía
 * la suscripción ya persistida en vez de agregar un parámetro nuevo a la
 * interfaz (rompería el contrato compartido con Stripe). */
async function findAccountIdBySubscription(externalId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_account_id_by_external_subscription', {
    p_external_subscription_id: externalId,
  });
  return data ?? null;
}

/** Adapter real de MercadoPago (F2-2A-providers). */
export const mercadopagoProvider: PaymentProvider = {
  name: 'mercadopago',

  async createCheckout(params: CheckoutParams): Promise<{ url: string }> {
    const supabase = await createClient();
    const { data: planId } = await supabase.rpc('get_plan_provider_id', {
      p_slug: params.planSlug,
      p_interval: params.interval,
      p_provider: 'mercadopago',
    });
    if (!planId) throw new Error('plan_provider_id_not_configured');

    // MercadoPago no distingue success/cancel: solo hay un back_url. cancelUrl
    // se ignora deliberadamente en este adapter (documentado en el spec, §4).
    const preapproval = await postResource<{ id: string; init_point: string }>('/preapproval', {
      preapproval_plan_id: planId,
      external_reference: params.accountId,
      back_url: params.successUrl,
      status: 'pending',
    });
    return { url: preapproval.init_point };
  },

  async createPortalSession(params: PortalParams): Promise<{ url: string }> {
    return { url: params.returnUrl };
  },

  async cancelSubscription(externalId: string, atPeriodEnd: boolean): Promise<void> {
    if (atPeriodEnd) {
      const accountId = await findAccountIdBySubscription(externalId);
      if (!accountId) throw new Error('subscription_not_found');
      const event: NormalizedEvent = {
        externalEventId: `mp_cancel_${externalId}_${Date.now()}`,
        type: 'subscription_updated',
        accountId,
        externalSubscriptionId: externalId,
        cancelAtPeriodEnd: true,
        raw: {},
      };
      await handleProviderWebhook('mercadopago', JSON.stringify(event), 'internal');
      return;
    }
    await putResource(`/preapproval/${externalId}`, { status: 'cancelled' });
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
