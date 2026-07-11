import Stripe from 'stripe';

import { env } from '@/env';
import { createClient } from '@/lib/supabase/server';

import type {
  CheckoutParams,
  NormalizedEvent,
  PaymentProvider,
  PortalParams,
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

function fromSubscriptionEvent(
  stripeEvent: Stripe.Event,
  type: NormalizedEvent['type'],
): NormalizedEvent | null {
  const sub = stripeEvent.data.object as Stripe.Subscription;
  const accountId = sub.metadata?.accountId;
  if (!accountId) return null;
  // API 2025-03-31.basil: el período de facturación vive por ítem, no en la
  // suscripción — este adapter solo soporta suscripciones de un único ítem.
  const item = sub.items.data[0];
  return {
    externalEventId: stripeEvent.id,
    type,
    accountId,
    status: mapStatus(sub.status),
    externalSubscriptionId: sub.id,
    currentPeriodStart: item ? new Date(item.current_period_start * 1000).toISOString() : undefined,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000).toISOString() : undefined,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    raw: sub,
  };
}

function fromInvoiceEvent(stripeEvent: Stripe.Event): NormalizedEvent | null {
  const invoice = stripeEvent.data.object as Stripe.Invoice;
  // API 2025-03-31.basil: la suscripción de origen se mudó a
  // invoice.parent.subscription_details (antes invoice.subscription).
  const subscriptionDetails = invoice.parent?.subscription_details;
  const accountId = subscriptionDetails?.metadata?.accountId;
  if (!accountId) return null;
  const subscriptionId = subscriptionDetails?.subscription;
  return {
    externalEventId: stripeEvent.id,
    type: 'invoice_paid',
    accountId,
    externalSubscriptionId: typeof subscriptionId === 'string' ? subscriptionId : undefined,
    invoice: {
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      periodStart: new Date(invoice.period_start * 1000).toISOString(),
      periodEnd: new Date(invoice.period_end * 1000).toISOString(),
    },
    raw: invoice,
  };
}

/** Adapter real de Stripe (F2-2A-providers). checkout/portal/cancel se
 * completan en la siguiente tarea del plan; por ahora lanzan si se llaman. */
export const stripeProvider: PaymentProvider = {
  name: 'stripe',

  async createCheckout(params: CheckoutParams): Promise<{ url: string }> {
    const supabase = await createClient();
    const { data: priceId } = await supabase.rpc('get_plan_provider_id', {
      p_slug: params.planSlug,
      p_interval: params.interval,
      p_provider: 'stripe',
    });
    if (!priceId) throw new Error('plan_provider_id_not_configured');

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: { metadata: { accountId: params.accountId } },
      metadata: { accountId: params.accountId },
    });
    if (!session.url) throw new Error('checkout_session_missing_url');
    return { url: session.url };
  },

  async createPortalSession(params: PortalParams): Promise<{ url: string }> {
    const session = await getStripe().billingPortal.sessions.create({
      customer: params.accountId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  },

  async cancelSubscription(externalId: string, atPeriodEnd: boolean): Promise<void> {
    if (atPeriodEnd) {
      await getStripe().subscriptions.update(externalId, { cancel_at_period_end: true });
    } else {
      await getStripe().subscriptions.cancel(externalId);
    }
  },

  async verifyWebhook(rawBody: string, signature: string): Promise<NormalizedEvent | null> {
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
