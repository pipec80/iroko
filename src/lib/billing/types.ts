import type { ProviderCapabilities } from './capabilities';
import type { NormalizedBillingEvent } from './events';

export type ProviderName = 'mock' | 'stripe' | 'paddle' | 'lemonsqueezy' | 'mercadopago';

export type SubscriptionStatus =
  'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'unpaid' | 'incomplete';

export type PlanInterval = 'month' | 'year';

export interface CheckoutParams {
  accountId: string;
  customerEmail: string;
  planSlug: string;
  interval: PlanInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  url: string;
  externalCheckoutId?: string;
  externalSubscriptionId?: string;
}

export interface PortalParams {
  externalCustomerId: string;
  returnUrl: string;
}

export type CancellationTiming = 'immediate' | 'period_end';

export interface CancelSubscriptionParams {
  externalSubscriptionId: string;
  timing: CancellationTiming;
}

/** Context supplied by the HTTP receiver but not embedded in every provider body. */
export interface WebhookVerificationContext {
  /** Mercado Pago signs the `data.id` URL query parameter, when supplied. */
  dataId?: string;
  /** Provider notification identifier used as the durable delivery idempotency key. */
  webhookId?: string;
}

/** A verified notification that has no billing state to change in Iroko. */
export interface AcknowledgedWebhook {
  provider: ProviderName;
  type: 'webhook_acknowledged';
  reason:
    'unlinked_payment' | 'payment_pending' | 'payment_status_divergence' | 'unsupported_topic';
  raw: unknown;
}

export type ProviderWebhookResult = NormalizedBillingEvent | AcknowledgedWebhook;

export interface PaymentProvider {
  readonly name: ProviderName;
  readonly capabilities: ProviderCapabilities;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  createPortalSession?(params: PortalParams): Promise<{ url: string }>;
  cancelSubscription?(params: CancelSubscriptionParams): Promise<void>;
  verifyWebhook(
    rawBody: string,
    signature: string,
    context?: WebhookVerificationContext,
  ): Promise<ProviderWebhookResult | null>;
}
