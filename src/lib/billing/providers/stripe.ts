import Stripe from 'stripe';

import { env } from '@/env';
import { getProviderPrice } from '../catalog';
import type { NormalizedBillingEvent } from '../events';
import type {
  CancelSubscriptionParams,
  CheckoutParams,
  PaymentProvider,
  SubscriptionStatus,
} from '../types';

let stripeClient: Stripe | undefined;

/** Lazy: instanciar a nivel de módulo rompe el build cuando STRIPE_SECRET_KEY
 * no está seteada (el SDK lanza si el apiKey viene vacío), y ese import
 * ocurre siempre — registry.ts solo condiciona el registro, no el import. */
function getStripe(): Stripe {
  stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY ?? '');
  return stripeClient;
}

/** incomplete_expired no tiene equivalente propio en SubscriptionStatus — el
 * checkout nunca se completó, así que cae a 'canceled' (estado terminal). */
function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'incomplete_expired') return 'canceled';
  return status as SubscriptionStatus;
}

function toIsoTimestamp(unixSeconds: number | null | undefined): string | undefined {
  return typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000).toISOString() : undefined;
}

function getExternalPriceId(item: Stripe.SubscriptionItem | undefined): string | undefined {
  if (!item?.price) return undefined;
  return typeof item.price === 'string' ? item.price : item.price.id;
}

function fromSubscriptionEvent(
  stripeEvent: Stripe.Event,
  type: 'subscription_created' | 'subscription_updated' | 'subscription_canceled',
): NormalizedBillingEvent | null {
  const sub = stripeEvent.data.object as Stripe.Subscription;
  const accountId = sub.metadata?.accountId;
  if (!accountId) return null;
  // API 2025-03-31.basil: el período de facturación vive por ítem, no en la
  // suscripción — este adapter solo soporta suscripciones de un único ítem.
  const item = sub.items.data[0];
  const externalPriceId = getExternalPriceId(item);
  const currentPeriodStart = toIsoTimestamp(item?.current_period_start);
  const currentPeriodEnd = toIsoTimestamp(item?.current_period_end);

  if (type === 'subscription_canceled') {
    return {
      provider: 'stripe',
      externalEventId: stripeEvent.id,
      type,
      accountId,
      externalSubscriptionId: sub.id,
      canceledAt: toIsoTimestamp(sub.canceled_at),
      accessUntil: currentPeriodEnd,
      raw: sub,
    };
  }

  if (type === 'subscription_created' && !externalPriceId) return null;

  if (type === 'subscription_created') {
    if (!externalPriceId) return null;
    return {
      provider: 'stripe',
      externalEventId: stripeEvent.id,
      type,
      accountId,
      status: mapStatus(sub.status),
      externalSubscriptionId: sub.id,
      externalPriceId,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      raw: sub,
    };
  }

  return {
    provider: 'stripe',
    externalEventId: stripeEvent.id,
    type,
    accountId,
    status: mapStatus(sub.status),
    externalSubscriptionId: sub.id,
    ...(externalPriceId ? { externalPriceId } : {}),
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    raw: sub,
  };
}

function fromInvoiceEvent(stripeEvent: Stripe.Event): NormalizedBillingEvent | null {
  const invoice = stripeEvent.data.object as Stripe.Invoice;
  // API 2025-03-31.basil: la suscripción de origen se mudó a
  // invoice.parent.subscription_details (antes invoice.subscription).
  const subscriptionDetails = invoice.parent?.subscription_details;
  const accountId = subscriptionDetails?.metadata?.accountId;
  if (!accountId) return null;
  const subscriptionId = subscriptionDetails?.subscription;
  const paidAt = toIsoTimestamp(invoice.status_transitions?.paid_at);
  if (typeof subscriptionId !== 'string' || !paidAt) return null;

  return {
    provider: 'stripe',
    externalEventId: stripeEvent.id,
    type: 'invoice_paid',
    accountId,
    externalSubscriptionId: subscriptionId,
    externalInvoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    periodStart: toIsoTimestamp(invoice.period_start),
    periodEnd: toIsoTimestamp(invoice.period_end),
    paidAt,
    raw: invoice,
  };
}

/** Adapter real de Stripe (F2-2A-providers). checkout/portal/cancel se
 * completan en la siguiente tarea del plan; por ahora lanzan si se llaman. */
export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  capabilities: {
    customerPortal: false,
    cancelImmediately: true,
    cancelAtPeriodEnd: true,
    updatePaymentMethod: false,
    changePlan: false,
    pauseSubscription: false,
  },

  async createCheckout(params: CheckoutParams): Promise<{ url: string }> {
    const providerPrice = await getProviderPrice({
      planSlug: params.planSlug,
      interval: params.interval,
      provider: 'stripe',
      currency: 'USD',
    });
    if (!providerPrice.externalPriceId) {
      throw new Error('provider_price_external_id_not_configured');
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: providerPrice.externalPriceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.customerEmail,
      subscription_data: { metadata: { accountId: params.accountId } },
      metadata: { accountId: params.accountId },
    });
    if (!session.url) throw new Error('checkout_session_missing_url');
    return { url: session.url };
  },

  async cancelSubscription(params: CancelSubscriptionParams): Promise<void> {
    if (params.timing === 'period_end') {
      await getStripe().subscriptions.update(params.externalSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await getStripe().subscriptions.cancel(params.externalSubscriptionId);
    }
  },

  async verifyWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent | null> {
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET ?? '',
      );
    } catch {
      return null;
    }
    switch (event.type) {
      case 'customer.subscription.created':
        return fromSubscriptionEvent(event, 'subscription_created');
      case 'customer.subscription.updated':
        return fromSubscriptionEvent(event, 'subscription_updated');
      case 'customer.subscription.deleted':
        return fromSubscriptionEvent(event, 'subscription_canceled');
      case 'invoice.paid':
        return fromInvoiceEvent(event);
      default:
        return null;
    }
  },
};
