import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

import { resolvePlanByExternalPrice } from './catalog';
import type {
  InvoicePaidEvent,
  InvoicePaymentFailedEvent,
  NormalizedBillingEvent,
  PaymentRecoveredEvent,
  SubscriptionCanceledEvent,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
} from './events';

export type BillingReductionResult = { status: 'applied' } | { status: 'duplicate' };

/**
 * The generated Supabase function typings do not express nullable SQL
 * arguments. Keep `null` on the wire rather than inventing a value.
 */
function nullableRpcText(value: string | undefined): string {
  return value ?? (null as never);
}

/** Rejects non-serializable provider payloads before they reach the audit log. */
function toJsonPayload(value: unknown): Json {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('billing_event_payload_not_json_serializable');
  return JSON.parse(serialized) as Json;
}

async function applySubscriptionCreated(
  event: SubscriptionCreatedEvent,
): Promise<BillingReductionResult> {
  const resolvedPlan = await resolvePlanByExternalPrice({
    provider: event.provider,
    externalPriceId: event.externalPriceId,
  });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_subscription_created', {
    p_provider: event.provider,
    p_external_event_id: event.externalEventId,
    p_account_id: event.accountId,
    p_plan_id: resolvedPlan.planId,
    p_external_subscription_id: event.externalSubscriptionId,
    p_status: event.status,
    p_current_period_start: nullableRpcText(event.currentPeriodStart),
    p_current_period_end: nullableRpcText(event.currentPeriodEnd),
    p_cancel_at_period_end: event.cancelAtPeriodEnd,
    p_external_customer_id: nullableRpcText(event.externalCustomerId),
    p_payload: toJsonPayload(event.raw),
  });
  if (error) throw new Error(`billing_subscription_created_failed:${error.code}`);
  return data === 'duplicate' ? { status: 'duplicate' } : { status: 'applied' };
}

async function applyInvoicePaid(event: InvoicePaidEvent): Promise<BillingReductionResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_invoice_paid', {
    p_provider: event.provider,
    p_external_event_id: event.externalEventId,
    p_account_id: event.accountId,
    p_external_subscription_id: event.externalSubscriptionId,
    p_external_invoice_id: event.externalInvoiceId,
    p_external_payment_id: nullableRpcText(event.externalPaymentId),
    p_amount_paid: event.amountPaid,
    p_currency: event.currency,
    p_period_start: nullableRpcText(event.periodStart),
    p_period_end: nullableRpcText(event.periodEnd),
    p_paid_at: event.paidAt,
    p_hosted_url: nullableRpcText(event.hostedUrl),
    p_pdf_url: nullableRpcText(event.pdfUrl),
    p_payload: toJsonPayload(event.raw),
  });
  if (error) throw new Error(`billing_invoice_paid_failed:${error.code}`);
  return data === 'duplicate' ? { status: 'duplicate' } : { status: 'applied' };
}

async function applySubscriptionUpdated(
  event: SubscriptionUpdatedEvent,
): Promise<BillingReductionResult> {
  const resolvedPlan =
    event.externalPriceId ?
      await resolvePlanByExternalPrice({
        provider: event.provider,
        externalPriceId: event.externalPriceId,
      })
    : null;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_subscription_updated', {
    p_provider: event.provider,
    p_external_event_id: event.externalEventId,
    p_account_id: event.accountId,
    p_external_subscription_id: event.externalSubscriptionId,
    p_plan_id: resolvedPlan?.planId ?? (null as never),
    p_status: event.status,
    p_current_period_start: nullableRpcText(event.currentPeriodStart),
    p_current_period_end: nullableRpcText(event.currentPeriodEnd),
    p_cancel_at_period_end: event.cancelAtPeriodEnd,
    p_external_customer_id: nullableRpcText(event.externalCustomerId),
    p_payload: toJsonPayload(event.raw),
  });
  if (error) throw new Error(`billing_subscription_updated_failed:${error.code}`);
  return data === 'duplicate' ? { status: 'duplicate' } : { status: 'applied' };
}

async function applySubscriptionCanceled(
  event: SubscriptionCanceledEvent,
): Promise<BillingReductionResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_subscription_canceled', {
    p_provider: event.provider,
    p_external_event_id: event.externalEventId,
    p_account_id: event.accountId,
    p_external_subscription_id: event.externalSubscriptionId,
    p_canceled_at: nullableRpcText(event.canceledAt),
    p_access_until: nullableRpcText(event.accessUntil),
    p_payload: toJsonPayload(event.raw),
  });
  if (error) throw new Error(`billing_subscription_canceled_failed:${error.code}`);
  return data === 'duplicate' ? { status: 'duplicate' } : { status: 'applied' };
}

async function applyInvoicePaymentFailed(
  event: InvoicePaymentFailedEvent,
): Promise<BillingReductionResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_invoice_payment_failed', {
    p_provider: event.provider,
    p_external_event_id: event.externalEventId,
    p_account_id: event.accountId,
    p_external_subscription_id: event.externalSubscriptionId,
    p_external_invoice_id: event.externalInvoiceId,
    p_external_payment_id: nullableRpcText(event.externalPaymentId),
    p_status: 'failed',
    p_amount: event.amountDue ?? (null as never),
    p_currency: nullableRpcText(event.currency),
    p_attempted_at: event.attemptedAt,
    p_failure_code: nullableRpcText(event.failureCode),
    p_failure_message: nullableRpcText(event.failureMessage),
    p_payload: toJsonPayload(event.raw),
  });
  if (error) throw new Error(`billing_invoice_payment_failed:${error.code}`);
  return data === 'duplicate' ? { status: 'duplicate' } : { status: 'applied' };
}

async function applyPaymentRecovered(
  event: PaymentRecoveredEvent,
): Promise<BillingReductionResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_payment_recovered', {
    p_provider: event.provider,
    p_external_event_id: event.externalEventId,
    p_account_id: event.accountId,
    p_external_subscription_id: event.externalSubscriptionId,
    p_external_invoice_id: event.externalInvoiceId,
    p_external_payment_id: nullableRpcText(event.externalPaymentId),
    p_status: 'recovered',
    p_amount: event.amountPaid ?? (null as never),
    p_currency: nullableRpcText(event.currency),
    p_recovered_at: event.recoveredAt,
    p_payload: toJsonPayload(event.raw),
  });
  if (error) throw new Error(`billing_payment_recovered_failed:${error.code}`);
  return data === 'duplicate' ? { status: 'duplicate' } : { status: 'applied' };
}

/** Applies one normalized event through the persistence operation it is allowed to mutate. */
export async function reduceBillingEvent(
  event: NormalizedBillingEvent,
): Promise<BillingReductionResult> {
  if (event.type === 'subscription_created') return applySubscriptionCreated(event);
  if (event.type === 'subscription_updated') return applySubscriptionUpdated(event);
  if (event.type === 'subscription_canceled') return applySubscriptionCanceled(event);
  if (event.type === 'invoice_paid') return applyInvoicePaid(event);
  if (event.type === 'invoice_payment_failed') return applyInvoicePaymentFailed(event);
  return applyPaymentRecovered(event);
}
