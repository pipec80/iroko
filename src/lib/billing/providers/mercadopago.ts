import { env } from '@/env';

import { getProviderPrice } from '../catalog';
import type { NormalizedBillingEvent } from '../events';
import type {
  AcknowledgedWebhook,
  CancelSubscriptionParams,
  CheckoutParams,
  PaymentProvider,
  SubscriptionStatus,
  WebhookVerificationContext,
} from '../types';

const API_BASE = 'https://api.mercadopago.com';
const RESOURCE_FETCH_TIMEOUT_MS = 10_000;
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;
const NON_TERMINAL_PAYMENT_STATUSES = new Set([
  'pending',
  'in_process',
  'in_mediation',
  'authorized',
]);

interface WebhookBody {
  id?: unknown;
  type: unknown;
  data: { id: unknown };
}

interface PreapprovalResource {
  id: string;
  status: string;
  external_reference: string;
  next_payment_date?: string;
  date_created?: string;
}

interface AuthorizedPaymentResource {
  id?: unknown;
  preapproval_id?: unknown;
  external_reference?: unknown;
  transaction_amount?: unknown;
  currency_id?: unknown;
  date_created?: unknown;
  payment: {
    id: string | number;
    status: string;
    status_detail?: unknown;
  };
}

interface PaymentResource {
  id?: unknown;
  status?: unknown;
}

interface AuthorizedPaymentSearchResponse {
  results?: unknown;
}

function normalizeExternalId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

function normalizeCurrency(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : null;
}

function normalizeAmount(value: unknown, currency: string): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && (!Number.isFinite(value) || value < 0 || Object.is(value, -0))) {
    return null;
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(value));
  if (!match) return null;

  const whole = Number(match[1]);
  if (!Number.isSafeInteger(whole)) return null;

  const fraction = match[2] ?? '';
  const fractionDigits = currency === 'CLP' ? 0 : 2;
  if (fraction.length > fractionDigits) return null;

  const scale = 10 ** fractionDigits;
  const minorAmount = whole * scale + Number(fraction.padEnd(fractionDigits, '0'));
  return Number.isSafeInteger(minorAmount) ? minorAmount : null;
}

function isAuthorizedPaymentResource(value: unknown): value is AuthorizedPaymentResource {
  if (typeof value !== 'object' || value === null || !('payment' in value)) return false;
  const nestedPayment = value.payment;
  return (
    typeof nestedPayment === 'object' &&
    nestedPayment !== null &&
    'id' in nestedPayment &&
    'status' in nestedPayment &&
    normalizeExternalId(nestedPayment.id) !== null &&
    typeof nestedPayment.status === 'string' &&
    nestedPayment.status.trim().length > 0
  );
}

function isPaymentResource(value: unknown): value is PaymentResource {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'id' in value &&
    'status' in value &&
    normalizeExternalId(value.id) !== null &&
    typeof value.status === 'string' &&
    value.status.trim().length > 0
  );
}

function isWebhookBody(value: unknown): value is WebhookBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string' &&
    value.type.length > 0 &&
    'data' in value &&
    typeof value.data === 'object' &&
    value.data !== null &&
    'id' in value.data &&
    normalizeExternalId(value.data.id) !== null
  );
}

function authorizedPaymentEventId(invoiceId: string, paymentId: string, status: string): string {
  return `authorized_payment:${encodeURIComponent(invoiceId)}:${encodeURIComponent(paymentId)}:${encodeURIComponent(status)}`;
}

function webhookEventId(context: WebhookVerificationContext | undefined, fallback: string): string {
  const notificationId = normalizeExternalId(context?.webhookId);
  return notificationId ? `mercadopago:webhook:${notificationId}` : fallback;
}

function toMercadoPagoTransactionAmount(amount: number, currency: string): number {
  return currency === 'CLP' ? amount : amount / 100;
}

/**
 * Mercado Pago appends `?preapproval_id=...` to the return URL instead of `&`,
 * so a back_url carrying its own query string comes back malformed
 * (`?status=success?preapproval_id=...`). Only the path survives.
 */
function toProviderBackUrl(successUrl: string): string {
  try {
    const url = new URL(successUrl);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return successUrl;
  }
}

function isValidProviderPrice(price: { amount: number; currency: string }): boolean {
  return (
    Number.isSafeInteger(price.amount) && price.amount >= 0 && /^[A-Z]{3}$/.test(price.currency)
  );
}

/** MercadoPago no distingue 'authorized'/'canceled' 1:1 con SubscriptionStatus
 * — mapea los estados de Preapproval al enum interno. */
function mapPreapprovalStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'authorized':
      return 'active';
    case 'paused':
      return 'paused';
    case 'canceled':
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
async function verifyManifest(signature: string, dataId?: string): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const segment of signature.split(/[,;]/)) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    parts[segment.slice(0, eq).trim()] = segment.slice(eq + 1).trim();
  }
  const ts = parts.ts;
  const requestId = parts['x-request-id'];
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // La doc oficial describe `ts` como milisegundos pero su propio ejemplo usa
  // segundos; se aceptan ambas escalas dentro de la ventana de tolerancia.
  const tsNumber = Number(ts);
  if (!Number.isFinite(tsNumber)) return false;
  const withinTolerance = (candidateMs: number): boolean =>
    Math.abs(Date.now() - candidateMs) <= WEBHOOK_TIMESTAMP_TOLERANCE_MS;
  if (!withinTolerance(tsNumber) && !withinTolerance(tsNumber * 1000)) return false;

  const manifest =
    [
      ...(dataId ? [`id:${dataId.toLowerCase()}`] : []),
      ...(requestId ? [`request-id:${requestId}`] : []),
      `ts:${ts}`,
    ].join(';') + ';';
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
  if (computed.length !== v1.length) return false;
  let difference = 0;
  for (let index = 0; index < computed.length; index += 1) {
    difference |= computed.charCodeAt(index) ^ v1.charCodeAt(index);
  }
  return difference === 0;
}

function webhookIdentifiers(
  body: WebhookBody,
  context: WebhookVerificationContext | undefined,
): { resourceId: string; signatureDataId?: string } | null {
  const bodyDataId = normalizeExternalId(body.data.id);
  if (!bodyDataId) return null;

  if (context === undefined) {
    return { resourceId: bodyDataId, signatureDataId: bodyDataId };
  }
  if (context.dataId === undefined) return { resourceId: bodyDataId };
  const queryDataId = normalizeExternalId(context.dataId);
  if (!queryDataId || queryDataId !== bodyDataId) return null;
  return { resourceId: queryDataId, signatureDataId: queryDataId };
}

function normalizeAuthorizedPaymentEvent(
  payment: AuthorizedPaymentResource,
  externalEventId: string,
): NormalizedBillingEvent | AcknowledgedWebhook | null {
  const invoiceId = normalizeExternalId(payment.id);
  const subscriptionId = normalizeExternalId(payment.preapproval_id);
  const paymentId = normalizeExternalId(payment.payment.id);
  const accountId =
    typeof payment.external_reference === 'string' && payment.external_reference.trim().length > 0 ?
      payment.external_reference
    : null;
  if (!accountId || !invoiceId || !subscriptionId || !paymentId) return null;

  const currency =
    payment.currency_id === undefined ? undefined : normalizeCurrency(payment.currency_id);
  if (currency === null) return null;
  const amount =
    payment.transaction_amount === undefined || currency === undefined ?
      null
    : normalizeAmount(payment.transaction_amount, currency);
  if (payment.transaction_amount !== undefined && amount === null) return null;
  if (typeof payment.date_created !== 'string') return null;

  if (NON_TERMINAL_PAYMENT_STATUSES.has(payment.payment.status)) {
    return acknowledgedWebhook('payment_pending', payment);
  }
  if (payment.payment.status === 'rejected') {
    return {
      provider: 'mercadopago',
      externalEventId,
      type: 'invoice_payment_failed',
      accountId,
      externalSubscriptionId: subscriptionId,
      externalInvoiceId: invoiceId,
      externalPaymentId: paymentId,
      ...(amount === null ? {} : { amountDue: amount }),
      ...(currency === undefined ? {} : { currency }),
      failureCode:
        typeof payment.payment.status_detail === 'string' ?
          payment.payment.status_detail
        : undefined,
      attemptedAt: payment.date_created,
      raw: payment,
    };
  }
  if (payment.payment.status !== 'approved') {
    return acknowledgedWebhook('payment_status_divergence', payment);
  }
  if (amount === null || currency === undefined) return null;
  return {
    provider: 'mercadopago',
    externalEventId,
    type: 'invoice_paid',
    accountId,
    externalSubscriptionId: subscriptionId,
    externalInvoiceId: invoiceId,
    externalPaymentId: paymentId,
    amountPaid: amount,
    currency,
    paidAt: payment.date_created,
    raw: payment,
  };
}

function acknowledgedWebhook(
  reason: AcknowledgedWebhook['reason'],
  raw: unknown,
): AcknowledgedWebhook {
  return { provider: 'mercadopago', type: 'webhook_acknowledged', reason, raw };
}

/**
 * Compact, secret-free reason from a Mercado Pago error body. Without it a
 * failed call is only a status code, which is not diagnosable in production.
 */
async function describeProviderError(res: Response): Promise<string> {
  const parts: string[] = [];
  try {
    const body: unknown = await res.json();
    if (typeof body === 'object' && body !== null) {
      if ('error' in body && typeof body.error === 'string') parts.push(body.error);
      if ('message' in body && typeof body.message === 'string') parts.push(body.message);
      if ('cause' in body && Array.isArray(body.cause)) {
        for (const item of body.cause) {
          if (typeof item !== 'object' || item === null) continue;
          if ('code' in item) parts.push(`code=${String(item.code)}`);
          if ('description' in item && typeof item.description === 'string') {
            parts.push(item.description);
          }
        }
      }
    }
  } catch {
    // A non-JSON body leaves the status code as the only available evidence.
  }
  return parts.join('|').slice(0, 300);
}

async function providerError(prefix: string, res: Response): Promise<Error> {
  const detail = await describeProviderError(res);
  return new Error(`${prefix}_${res.status}${detail ? `:${detail}` : ''}`);
}

async function fetchResource<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN ?? ''}` },
    signal: AbortSignal.timeout(RESOURCE_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw await providerError('mercadopago_fetch_failed', res);
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
    signal: AbortSignal.timeout(RESOURCE_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw await providerError('mercadopago_post_failed', res);
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
    signal: AbortSignal.timeout(RESOURCE_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw await providerError('mercadopago_put_failed', res);
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
    pauseSubscription: false,
  },

  async createCheckout(
    params: CheckoutParams,
  ): Promise<{ url: string; externalSubscriptionId: string }> {
    if (params.interval !== 'month') {
      throw new Error('billing_interval_not_supported:mercadopago');
    }
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
      back_url: toProviderBackUrl(params.successUrl),
      notification_url: env.MERCADOPAGO_WEBHOOK_URL,
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
      `/preapproval/${encodeURIComponent(params.externalSubscriptionId)}`,
      { status: 'canceled' },
    );
    if (preapproval.status !== 'canceled') {
      throw new Error('mercadopago_cancellation_not_confirmed');
    }
  },

  async verifyWebhook(
    rawBody: string,
    signature: string,
    context?: WebhookVerificationContext,
  ): Promise<NormalizedBillingEvent | AcknowledgedWebhook | null> {
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody) as unknown;
    } catch {
      return null;
    }
    if (!isWebhookBody(parsedBody)) return null;
    const body = parsedBody;
    const identifiers = webhookIdentifiers(body, context);
    if (!identifiers || !(await verifyManifest(signature, identifiers.signatureDataId)))
      return null;
    const { resourceId: dataId } = identifiers;

    if (body.type === 'subscription_preapproval') {
      const preapproval = await fetchResource<PreapprovalResource>(
        `/preapproval/${encodeURIComponent(dataId)}`,
      );
      if (!preapproval.external_reference) return null;
      const status = mapPreapprovalStatus(preapproval.status);
      const externalEventId = webhookEventId(context, `${preapproval.id}_${preapproval.status}`);
      if (status === 'canceled') {
        return {
          provider: 'mercadopago',
          externalEventId,
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
        externalEventId,
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
      const payment = await fetchResource<unknown>(
        `/authorized_payments/${encodeURIComponent(dataId)}`,
      );
      if (!isAuthorizedPaymentResource(payment)) return null;
      const invoiceId = normalizeExternalId(payment.id);
      const paymentId = normalizeExternalId(payment.payment.id);
      if (!invoiceId || !paymentId) return null;
      return normalizeAuthorizedPaymentEvent(
        payment,
        webhookEventId(
          context,
          authorizedPaymentEventId(invoiceId, paymentId, payment.payment.status),
        ),
      );
    }

    if (body.type === 'payment') {
      const providerPayment = await fetchResource<unknown>(
        `/v1/payments/${encodeURIComponent(dataId)}`,
      );
      if (!isPaymentResource(providerPayment)) return null;
      const providerPaymentId = normalizeExternalId(providerPayment.id);
      if (!providerPaymentId || providerPaymentId !== dataId) return null;

      const invoices = await fetchResource<AuthorizedPaymentSearchResponse>(
        `/authorized_payments/search?payment_id=${encodeURIComponent(dataId)}`,
      );
      const invoice =
        Array.isArray(invoices.results) ?
          invoices.results.find(
            (candidate): candidate is AuthorizedPaymentResource =>
              isAuthorizedPaymentResource(candidate) &&
              normalizeExternalId(candidate.payment.id) === providerPaymentId,
          )
        : undefined;
      if (!invoice) {
        return acknowledgedWebhook('unlinked_payment', {
          notification: body,
          payment: providerPayment,
        });
      }
      if (invoice.payment.status !== providerPayment.status) {
        return acknowledgedWebhook('payment_status_divergence', {
          notification: body,
          payment: providerPayment,
          authorizedPayment: invoice,
        });
      }

      const invoiceId = normalizeExternalId(invoice.id);
      if (!invoiceId) return null;
      return normalizeAuthorizedPaymentEvent(
        invoice,
        webhookEventId(
          context,
          authorizedPaymentEventId(invoiceId, providerPaymentId, invoice.payment.status),
        ),
      );
    }

    return acknowledgedWebhook('unsupported_topic', body);
  },
};
