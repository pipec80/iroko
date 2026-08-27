import type { ProviderName, SubscriptionStatus } from './types';

interface BillingEventBase {
  provider: ProviderName;
  externalEventId: string;
  accountId: string;
  raw: unknown;
}

export interface SubscriptionCreatedEvent extends BillingEventBase {
  type: 'subscription_created';
  externalSubscriptionId: string;
  externalPriceId: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  externalCustomerId?: string;
}

export interface SubscriptionUpdatedEvent extends BillingEventBase {
  type: 'subscription_updated';
  externalSubscriptionId: string;
  externalPriceId?: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  externalCustomerId?: string;
}

export interface SubscriptionCanceledEvent extends BillingEventBase {
  type: 'subscription_canceled';
  externalSubscriptionId: string;
  canceledAt?: string;
  accessUntil?: string;
}

export interface InvoicePaidEvent extends BillingEventBase {
  type: 'invoice_paid';
  externalSubscriptionId: string;
  externalInvoiceId: string;
  externalPaymentId?: string;
  amountPaid: number;
  currency: string;
  periodStart?: string;
  periodEnd?: string;
  paidAt: string;
  hostedUrl?: string;
  pdfUrl?: string;
}

export interface InvoicePaymentFailedEvent extends BillingEventBase {
  type: 'invoice_payment_failed';
  externalSubscriptionId: string;
  externalInvoiceId: string;
  externalPaymentId?: string;
  amountDue?: number;
  currency?: string;
  failureCode?: string;
  failureMessage?: string;
  attemptedAt: string;
}

export interface PaymentRecoveredEvent extends BillingEventBase {
  type: 'payment_recovered';
  externalSubscriptionId: string;
  externalInvoiceId: string;
  externalPaymentId?: string;
  amountPaid?: number;
  currency?: string;
  recoveredAt: string;
}

export type NormalizedBillingEvent =
  | SubscriptionCreatedEvent
  | SubscriptionUpdatedEvent
  | SubscriptionCanceledEvent
  | InvoicePaidEvent
  | InvoicePaymentFailedEvent
  | PaymentRecoveredEvent;
