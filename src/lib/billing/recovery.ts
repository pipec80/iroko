import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureException, withScope } from '@sentry/nextjs';

import type { NormalizedBillingEvent } from './events';
import { serializeRecoveryResult } from './recovery-result';
import type { RecoveryResultInput } from './recovery-result';
import { getPaymentProvider } from './registry';

interface RecoveryJob {
  id: string;
  provider: string;
  resource_type: 'payment';
  resource_id: string;
  reason: 'unlinked_payment' | 'payment_pending';
  attempt_count: number;
  lease_token: string;
  lease_expires_at: string;
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

async function applyResult(job: RecoveryJob, result: RecoveryResultInput): Promise<CompletionRow> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_billing_recovery_result', {
    p_job_id: job.id,
    p_lease_token: job.lease_token,
    p_result: serializeRecoveryResult(result),
  });
  if (error?.message.includes('billing_recovery_lease_not_owned')) {
    throw new Error('billing_recovery_lease_not_owned');
  }
  const row = data?.[0];
  if (error || !row || !['pending', 'resolved', 'exhausted'].includes(row.status)) {
    throw new Error('billing_recovery_completion_failed');
  }
  return { status: row.status as CompletionRow['status'], anomaly_created: row.anomaly_created };
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
  let recovered: RecoveryResultInput;
  try {
    const provider = getPaymentProvider(job.provider);
    if (!provider.recoverResource) {
      recovered = { kind: 'unrelated' };
      result.skipped = 1;
    } else {
      recovered = await provider.recoverResource({
        resourceType: job.resource_type,
        resourceId: job.resource_id,
      });
      if (recovered.kind === 'event')
        recovered = { kind: 'event', event: await correlateRecoveredEvent(recovered.event) };
    }
  } catch (error) {
    recovered = { kind: 'error', errorCode: safeRecoveryErrorCode(error) };
  }
  // Persistence failures never fall back to another write: only this token may commit effects.
  try {
    const completion = await applyResult(job, recovered);
    if (completion.status === 'exhausted') {
      result.exhausted = 1;
      if (completion.anomaly_created) alertExhausted(job.provider);
    } else if (completion.status === 'pending') result.retried = 1;
    else if (!result.skipped) {
      result.resolved = 1;
      if (recovered.kind === 'anomaly') result.anomalous = 1;
    }
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'billing_recovery_lease_not_owned')
      throw error;
    result.skipped = 1;
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
