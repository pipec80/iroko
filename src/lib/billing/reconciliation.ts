import { randomUUID } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';

import type { SubscriptionUpdatedEvent } from './events';
import { reduceBillingEvent } from './reducer';
import { getPaymentProvider } from './registry';

interface ClaimedCandidate {
  subscription_id: string;
  account_id: string;
  provider: string;
  external_subscription_id: string;
  subscription_updated_at: string;
  invoice_watermark: string | null;
  scan_cursor: string | null;
  scan_watermark: string | null;
}

type SafeErrorCode =
  'provider_timeout' | 'provider_fetch_failed' | 'reducer_failed' | 'anomaly_persistence_failed';

type Completion = {
  outcome: 'completed' | 'deferred' | 'failed' | 'skipped';
  providerWatermark?: string | null;
  nextCursor?: string | null;
  errorCode?: SafeErrorCode;
};

class ReconciliationDeadlineExceeded extends Error {
  constructor() {
    super('billing_reconciliation_deadline_exceeded');
    this.name = 'ReconciliationDeadlineExceeded';
  }
}

export interface ReconciliationSummary {
  scanned: number;
  repaired: number;
  stale: number;
  anomalous: number;
  skipped: number;
  failed: number;
  deferred: number;
}

function snapshotEventId(candidate: ClaimedCandidate, version: string): string {
  return `reconciliation:${encodeURIComponent(candidate.provider)}:${encodeURIComponent(candidate.external_subscription_id)}:${encodeURIComponent(version)}`;
}

function modifiedSinceWithOverlap(watermark: string | null): string {
  const watermarkTime = watermark ? Date.parse(watermark) : Number.NaN;
  return new Date(
    Number.isFinite(watermarkTime) ? watermarkTime - 48 * 60 * 60 * 1000 : 0,
  ).toISOString();
}

function providerErrorCode(error: unknown): SafeErrorCode {
  return error instanceof Error && /timeout/i.test(error.name) ?
      'provider_timeout'
    : 'provider_fetch_failed';
}

function throwIfDeadlineExceeded(deadline: number): void {
  if (Date.now() >= deadline) throw new ReconciliationDeadlineExceeded();
}

/**
 * Bounds a provider read by the invocation deadline. The provider interface
 * does not expose a cancellation signal, so this caps worker wait time and
 * lets the durable lease be deferred even if a remote read later settles.
 */
async function awaitProviderWithinDeadline<T>(
  operation: () => Promise<T>,
  deadline: number,
): Promise<T> {
  throwIfDeadlineExceeded(deadline);
  const remainingMs = deadline - Date.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new ReconciliationDeadlineExceeded()), remainingMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/** Reconciles one leased batch and durably records each candidate result before returning. */
export async function reconcileNonTerminalSubscriptions(input: {
  batchSize: number;
  maxDurationMs: number;
}): Promise<ReconciliationSummary> {
  const startedAt = Date.now();
  const maxDurationMs =
    Number.isFinite(input.maxDurationMs) ? Math.max(0, Math.trunc(input.maxDurationMs)) : 0;
  const deadline = startedAt + maxDurationMs;
  const workerId = randomUUID();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_billing_reconciliation_candidates', {
    p_batch_size: Math.min(Math.max(Math.trunc(input.batchSize), 1), 20),
    p_visibility_seconds: 90,
    p_worker_id: workerId,
  });
  if (error) throw new Error('billing_reconciliation_claim_failed');
  const candidates = (data ?? []) as ClaimedCandidate[];
  const summary: ReconciliationSummary = {
    scanned: candidates.length,
    repaired: 0,
    stale: 0,
    anomalous: 0,
    skipped: 0,
    failed: 0,
    deferred: 0,
  };

  const complete = async (candidate: ClaimedCandidate, completion: Completion): Promise<void> => {
    const { error: completionError } = await admin.rpc(
      'complete_billing_reconciliation_candidate',
      {
        p_subscription_id: candidate.subscription_id,
        p_worker_id: workerId,
        p_outcome: completion.outcome,
        p_provider_watermark: completion.providerWatermark ?? (null as never),
        p_next_cursor: completion.nextCursor ?? (null as never),
        p_error_code: completion.errorCode ?? (null as never),
      },
    );
    if (completionError) throw new Error('billing_reconciliation_completion_failed');
  };

  const reconcileCandidate = async (candidate: ClaimedCandidate): Promise<Completion> => {
    if (Date.now() >= deadline) return { outcome: 'deferred' };
    let provider: ReturnType<typeof getPaymentProvider>;
    try {
      provider = getPaymentProvider(candidate.provider);
    } catch {
      summary.skipped += 1;
      return { outcome: 'skipped' };
    }
    const getSubscriptionSnapshot = provider.getSubscriptionSnapshot;
    if (!getSubscriptionSnapshot) {
      summary.skipped += 1;
      return { outcome: 'skipped' };
    }

    let snapshot: Awaited<ReturnType<NonNullable<typeof provider.getSubscriptionSnapshot>>>;
    try {
      snapshot = await awaitProviderWithinDeadline(
        () => getSubscriptionSnapshot(candidate.external_subscription_id),
        deadline,
      );
    } catch (error) {
      if (error instanceof ReconciliationDeadlineExceeded) return { outcome: 'deferred' };
      throw { errorCode: providerErrorCode(error) };
    }
    if (Date.now() >= deadline) return { outcome: 'deferred' };
    if (!snapshot || snapshot.externalSubscriptionId !== candidate.external_subscription_id) {
      const { error: anomalyError } = await admin.rpc('upsert_billing_financial_anomaly', {
        p_anomaly_type: 'status_divergence',
        p_affected_amount: undefined,
        p_currency: undefined,
        p_external_resource_id: candidate.external_subscription_id,
        p_original_amount: undefined,
        p_provider: candidate.provider,
        p_observed_status: snapshot ? 'identity_mismatch' : 'resource_not_found',
        p_account_id: candidate.account_id,
        p_subscription_id: candidate.subscription_id,
      });
      if (anomalyError) throw { errorCode: 'anomaly_persistence_failed' satisfies SafeErrorCode };
      summary.anomalous += 1;
      return { outcome: 'completed' };
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
    let snapshotResult;
    try {
      snapshotResult = await reduceBillingEvent(event, {
        expectedSubscriptionUpdatedAt: candidate.subscription_updated_at,
      });
    } catch {
      throw { errorCode: 'reducer_failed' satisfies SafeErrorCode };
    }
    if (snapshotResult.status === 'stale') summary.stale += 1;
    else if (snapshotResult.status === 'applied') summary.repaired += 1;
    if (Date.now() >= deadline) return { outcome: 'deferred' };

    const discoverSubscriptionInvoices = provider.discoverSubscriptionInvoices;
    if (!discoverSubscriptionInvoices) return { outcome: 'completed' };
    let page: Awaited<ReturnType<NonNullable<typeof provider.discoverSubscriptionInvoices>>>;
    try {
      page = await awaitProviderWithinDeadline(
        () =>
          discoverSubscriptionInvoices({
            externalSubscriptionId: candidate.external_subscription_id,
            modifiedSince: modifiedSinceWithOverlap(candidate.invoice_watermark),
            pageSize: 20,
            ...(candidate.scan_cursor ? { cursor: candidate.scan_cursor } : {}),
          }),
        deadline,
      );
    } catch (error) {
      if (error instanceof ReconciliationDeadlineExceeded) return { outcome: 'deferred' };
      throw { errorCode: providerErrorCode(error) };
    }
    try {
      for (const invoiceEvent of page.events) {
        const result = await reduceBillingEvent(invoiceEvent);
        if (result.status === 'applied') summary.repaired += 1;
        else if (result.status === 'stale') summary.stale += 1;
        if (Date.now() >= deadline) {
          return {
            outcome: 'deferred',
            providerWatermark: page.providerWatermark,
            nextCursor: candidate.scan_cursor,
          };
        }
      }
    } catch {
      throw { errorCode: 'reducer_failed' satisfies SafeErrorCode };
    }
    if (page.nextCursor) {
      return {
        outcome: 'deferred',
        providerWatermark: page.providerWatermark,
        nextCursor: page.nextCursor,
      };
    }
    return { outcome: 'completed', providerWatermark: page.providerWatermark, nextCursor: null };
  };

  const processCandidate = async (candidate: ClaimedCandidate): Promise<void> => {
    let completion: Completion;
    try {
      completion = await reconcileCandidate(candidate);
    } catch (error) {
      summary.failed += 1;
      completion = {
        outcome: 'failed',
        errorCode:
          (
            typeof error === 'object' &&
            error !== null &&
            'errorCode' in error &&
            (error.errorCode === 'provider_timeout' ||
              error.errorCode === 'provider_fetch_failed' ||
              error.errorCode === 'reducer_failed' ||
              error.errorCode === 'anomaly_persistence_failed')
          ) ?
            error.errorCode
          : 'provider_fetch_failed',
      };
    }
    if (completion.outcome === 'deferred') summary.deferred += 1;
    await complete(candidate, completion);
  };

  for (let index = 0; index < candidates.length; index += 5) {
    if (Date.now() >= deadline) {
      for (const candidate of candidates.slice(index)) {
        summary.deferred += 1;
        await complete(candidate, { outcome: 'deferred' });
      }
      break;
    }
    await Promise.all(candidates.slice(index, index + 5).map(processCandidate));
  }
  return summary;
}
