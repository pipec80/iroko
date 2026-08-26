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

export interface PaymentProvider {
  readonly name: ProviderName;
  readonly capabilities: ProviderCapabilities;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  createPortalSession?(params: PortalParams): Promise<{ url: string }>;
  cancelSubscription?(params: CancelSubscriptionParams): Promise<void>;
  verifyWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent | null>;
}
