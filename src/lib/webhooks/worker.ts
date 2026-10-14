import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';

import { sendWebhookRequest } from './transport';
import type { DeliveryOutcome } from './transport';

const claimSchema = z.object({
  delivery_id: z.uuid(),
  lease_token: z.uuid(),
  endpoint_version: z.number().int().positive().safe(),
  canonical_url: z.string().max(2000),
  body_text: z.string(),
  attempt: z.number().int().min(1).max(4),
  headers: z
    .object({
      'Content-Type': z.literal('application/json'),
      'X-Iroko-Event': z.string().max(100),
      'X-Iroko-Delivery-Id': z.uuid(),
      'X-Iroko-Timestamp': z.string().regex(/^\d{1,16}$/),
      'X-Iroko-Signature': z.string().regex(/^sha256=[a-f0-9]{64}$/),
    })
    .strict(),
});
const errorCodes = new Set([
  'dns_failed',
  'dns_timeout',
  'unsafe_destination',
  'invalid_url',
  'tls_failed',
  'redirect_denied',
  'response_too_large',
  'request_timeout',
  'network_failed',
  'http_failed',
  'worker_failed',
]);

/** Sends at most five fenced claims within a bounded invocation; late SQL completions never count as success. */
export async function runWebhookWorker(): Promise<{
  claimed: number;
  succeeded: number;
  retryable: number;
  rejected: number;
  completionFailed: number;
}> {
  const admin = createAdminClient();
  const signal = AbortSignal.timeout(40_000);
  const { data, error } = await admin
    .rpc('claim_webhook_deliveries', {
      p_worker_id: randomUUID(),
      p_batch_size: 5,
      p_visibility_seconds: 60,
    })
    .abortSignal(signal);
  if (error) throw new Error('webhook_claim_failed');
  const claims = z.array(claimSchema).max(5).safeParse(data);
  if (!claims.success) throw new Error('webhook_claim_invalid');
  const totals = {
    claimed: claims.data.length,
    succeeded: 0,
    retryable: 0,
    rejected: 0,
    completionFailed: 0,
  };
  await Promise.all(
    claims.data.map(async (claim) => {
      let outcome: DeliveryOutcome;
      try {
        outcome = await sendWebhookRequest({
          url: claim.canonical_url,
          bodyText: claim.body_text,
          headers: claim.headers,
          signal,
        });
      } catch {
        outcome = { kind: 'retryable', code: 'worker_failed' };
      }
      const code =
        outcome.kind === 'success' ? undefined
        : errorCodes.has(outcome.code) ? outcome.code
        : 'worker_failed';
      const status =
        (
          outcome.statusCode !== undefined &&
          Number.isInteger(outcome.statusCode) &&
          outcome.statusCode >= 100 &&
          outcome.statusCode <= 599
        ) ?
          outcome.statusCode
        : undefined;
      try {
        const { error: completionError } = await admin
          .rpc('complete_webhook_delivery', {
            p_delivery_id: claim.delivery_id,
            p_lease_token: claim.lease_token,
            p_outcome: outcome.kind,
            p_http_status: status,
            p_error_code: code,
          })
          .abortSignal(signal);
        if (completionError) {
          totals.completionFailed++;
          return;
        }
        if (outcome.kind === 'success') totals.succeeded++;
        else if (outcome.kind === 'retryable') totals.retryable++;
        else totals.rejected++;
      } catch {
        totals.completionFailed++;
      }
    }),
  );
  return totals;
}
