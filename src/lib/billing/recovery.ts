import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureException, withScope } from '@sentry/nextjs';

import type { NormalizedBillingEvent } from './events';
import { reduceBillingEvent } from './reducer';
import { getPaymentProvider } from './registry';

interface RecoveryJob {
  id: string;
  provider: string;
  resource_type: 'payment';
  resource_id: string;
  reason: 'unlinked_payment' | 'payment_pending';
  attempt_count: number;
}

interface CompletionRow {
  status: 'pending' | 'resolved' | 'exhausted';
  anomaly_created: boolean;
}

export interface BillingRecoverySummary {
  claimed: number;
  resolved: number;
  retried: number;
  exhausted: number;
  anomalous: number;
  skipped: number;
}

function safeRecoveryErrorCode(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') return 'provider_timeout';
  return 'provider_recovery_failed';
}

async function completeJob(
  jobId: string,
  outcome: 'event' | 'unrelated' | 'anomaly' | 'pending' | 'error',
  errorCode: string | null,
): Promise<CompletionRow> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('complete_billing_recovery_job', {
    p_job_id: jobId,
    p_last_error_code: errorCode ?? undefined,
    p_outcome: outcome,
  });
  const row = data?.[0];
  if (error || !row || !['pending', 'resolved', 'exhausted'].includes(row.status))
    throw new Error('billing_recovery_completion_failed');
  return {
    status: row.status as CompletionRow['status'],
    anomaly_created: row.anomaly_created,
  };
}

async function correlateRecoveredEvent(
  event: NormalizedBillingEvent,
): Promise<NormalizedBillingEvent> {
  if (event.provider !== 'mercadopago') return event;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('resolve_billing_checkout_reference', {
    p_external_reference: event.accountId,
    p_external_subscription_id: event.externalSubscriptionId,
  });
  const accountId = data?.[0]?.account_id;
  if (error || !accountId) throw new Error('billing_recovery_correlation_failed');
  return { ...event, accountId };
}

function alertExhausted(provider: string): void {
  const error = new Error('billing_recovery_exhausted');
  withScope((scope) => {
    scope.setTag('billing_provider', provider);
    scope.setTag('billing_operation', 'payment_recovery');
    scope.setTag('billing_outcome', 'exhausted');
    captureException(error);
  });
  logger.error(
    { component: 'billing', provider, action: 'billing.recovery.exhausted' },
    'Billing payment recovery exhausted',
  );
}

async function processRecoveryJob(
  job: RecoveryJob,
): Promise<Omit<BillingRecoverySummary, 'claimed'>> {
  const result = { resolved: 0, retried: 0, exhausted: 0, anomalous: 0, skipped: 0 };
  let provider: ReturnType<typeof getPaymentProvider>;
  try {
    provider = getPaymentProvider(job.provider);
  } catch {
    await completeJob(job.id, 'unrelated', 'provider_not_configured');
    result.skipped = 1;
    return result;
  }
  if (!provider.recoverResource) {
    await completeJob(job.id, 'unrelated', 'provider_recovery_unsupported');
    result.skipped = 1;
    return result;
  }

  try {
    const recovered = await provider.recoverResource({
      resourceType: job.resource_type,
      resourceId: job.resource_id,
    });
    if (recovered.kind === 'event') {
      const event = await correlateRecoveredEvent(recovered.event);
      await reduceBillingEvent(event);
      await completeJob(job.id, 'event', null);
      result.resolved = 1;
    } else if (recovered.kind === 'unrelated') {
      await completeJob(job.id, 'unrelated', null);
      result.resolved = 1;
    } else if (recovered.kind === 'anomaly') {
      const admin = createAdminClient();
      const { error } = await admin.rpc('upsert_billing_financial_anomaly', {
        p_account_id: undefined,
        p_anomaly_type: recovered.anomalyType,
        p_external_resource_id: job.resource_id,
        p_observed_status: recovered.observedStatus,
        p_provider: job.provider,
        p_subscription_id: undefined,
      });
      if (error) throw new Error('billing_anomaly_persistence_failed');
      await completeJob(job.id, 'anomaly', null);
      result.anomalous = 1;
      result.resolved = 1;
    } else {
      const completion = await completeJob(job.id, 'pending', 'payment_still_pending');
      if (completion.status === 'exhausted') {
        result.exhausted = 1;
        if (completion.anomaly_created) alertExhausted(job.provider);
      } else result.retried = 1;
    }
  } catch (error) {
    const completion = await completeJob(job.id, 'error', safeRecoveryErrorCode(error));
    if (completion.status === 'exhausted') {
      result.exhausted = 1;
      if (completion.anomaly_created) alertExhausted(job.provider);
    } else result.retried = 1;
  }
  return result;
}

/** Claims and recovers a bounded batch; at most five provider calls run concurrently. */
export async function recoverBillingResources(input: {
  batchSize: number;
  maxDurationMs: number;
}): Promise<BillingRecoverySummary> {
  const startedAt = Date.now();
  const batchSize = Math.min(Math.max(Math.trunc(input.batchSize), 1), 20);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_billing_recovery_jobs', {
    p_batch_size: batchSize,
    p_visibility_seconds: 900,
  });
  if (error) throw new Error('billing_recovery_claim_failed');
  const jobs = (data ?? []) as RecoveryJob[];
  const summary: BillingRecoverySummary = {
    claimed: jobs.length,
    resolved: 0,
    retried: 0,
    exhausted: 0,
    anomalous: 0,
    skipped: 0,
  };
  for (let index = 0; index < jobs.length; index += 5) {
    if (Date.now() - startedAt >= input.maxDurationMs) break;
    const results = await Promise.all(jobs.slice(index, index + 5).map(processRecoveryJob));
    for (const result of results) {
      summary.resolved += result.resolved;
      summary.retried += result.retried;
      summary.exhausted += result.exhausted;
      summary.anomalous += result.anomalous;
      summary.skipped += result.skipped;
    }
  }
  return summary;
}
