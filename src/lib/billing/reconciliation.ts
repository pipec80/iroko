import { createAdminClient } from '@/lib/supabase/admin';

import type { SubscriptionUpdatedEvent } from './events';
import { reduceBillingEvent } from './reducer';
import { getPaymentProvider } from './registry';

interface Candidate {
  account_id: string;
  provider: string;
  external_subscription_id: string;
  subscription_updated_at: string;
}

export interface ReconciliationSummary {
  scanned: number;
  repaired: number;
  stale: number;
  anomalous: number;
  skipped: number;
}

function snapshotEventId(candidate: Candidate, version: string): string {
  return `reconciliation:${encodeURIComponent(candidate.provider)}:${encodeURIComponent(candidate.external_subscription_id)}:${encodeURIComponent(version)}`;
}

/** Reconciles a bounded non-terminal batch with compare-and-swap protection. */
export async function reconcileNonTerminalSubscriptions(input: {
  batchSize: number;
  maxDurationMs: number;
}): Promise<ReconciliationSummary> {
  const startedAt = Date.now();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('get_billing_reconciliation_candidates', {
    p_batch_size: Math.min(Math.max(Math.trunc(input.batchSize), 1), 20),
  });
  if (error) throw new Error('billing_reconciliation_scan_failed');
  const candidates = (data ?? []) as Candidate[];
  const summary: ReconciliationSummary = {
    scanned: candidates.length,
    repaired: 0,
    stale: 0,
    anomalous: 0,
    skipped: 0,
  };

  const processCandidate = async (candidate: Candidate): Promise<void> => {
    let provider: ReturnType<typeof getPaymentProvider>;
    try {
      provider = getPaymentProvider(candidate.provider);
    } catch {
      summary.skipped += 1;
      return;
    }
    if (!provider.getSubscriptionSnapshot) {
      summary.skipped += 1;
      return;
    }
    const snapshot = await provider.getSubscriptionSnapshot(candidate.external_subscription_id);
    if (!snapshot || snapshot.externalSubscriptionId !== candidate.external_subscription_id) {
      const { error: anomalyError } = await admin.rpc('upsert_billing_financial_anomaly', {
        p_anomaly_type: 'status_divergence',
        p_external_resource_id: candidate.external_subscription_id,
        p_provider: candidate.provider,
        p_observed_status: snapshot ? 'identity_mismatch' : 'resource_not_found',
        p_account_id: candidate.account_id,
        p_subscription_id: undefined,
      });
      if (anomalyError) throw new Error('billing_reconciliation_anomaly_failed');
      summary.anomalous += 1;
      return;
    }
    const version =
      snapshot.providerVersion ??
      [snapshot.status, snapshot.currentPeriodEnd ?? '', String(snapshot.cancelAtPeriodEnd)].join(
        ':',
      );
    const event: SubscriptionUpdatedEvent = {
      provider: candidate.provider as SubscriptionUpdatedEvent['provider'],
      externalEventId: snapshotEventId(candidate, version),
      type: 'subscription_updated',
      accountId: candidate.account_id,
      externalSubscriptionId: snapshot.externalSubscriptionId,
      status: snapshot.status,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      raw: {},
    };
    const result = await reduceBillingEvent(event, {
      expectedSubscriptionUpdatedAt: candidate.subscription_updated_at,
    });
    if (result.status === 'stale') summary.stale += 1;
    else if (result.status === 'applied') summary.repaired += 1;
  };

  for (let index = 0; index < candidates.length; index += 5) {
    if (Date.now() - startedAt >= input.maxDurationMs) break;
    await Promise.all(candidates.slice(index, index + 5).map(processCandidate));
  }
  return summary;
}
