export type SubscriptionStatus =
  'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'unpaid' | 'incomplete';

export type PlanInterval = 'month' | 'year';

export interface CheckoutParams {
  accountId: string;
  planSlug: string;
  interval: PlanInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface PortalParams {
  accountId: string;
  returnUrl: string;
}

export interface NormalizedEvent {
  externalEventId: string;
  type: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'invoice_paid';
  accountId: string;
  planSlug?: string;
  status?: SubscriptionStatus;
  externalSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  invoice?: { amountPaid: number; currency: string; periodStart: string; periodEnd: string };
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(params: CheckoutParams): Promise<{ url: string }>;
  createPortalSession(params: PortalParams): Promise<{ url: string }>;
  cancelSubscription(externalId: string, atPeriodEnd: boolean): Promise<void>;
  verifyWebhook(rawBody: string, signature: string): Promise<NormalizedEvent | null>;
}
