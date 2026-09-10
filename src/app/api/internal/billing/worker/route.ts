import { randomUUID, timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { env } from '@/env';
import { recoverBillingResources } from '@/lib/billing/recovery';
import { reconcileNonTerminalSubscriptions } from '@/lib/billing/reconciliation';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

export const runtime = 'nodejs';
type WorkerMode = 'recovery' | 'reconciliation';

function validSecret(candidate: string | null): boolean {
  const expected = env.BILLING_RECONCILIATION_SECRET;
  if (!candidate || !expected) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function record(
  mode: WorkerMode,
  requestId: string,
  statusCode: number,
  summary: object,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc('record_billing_worker_result', {
    p_mode: mode,
    p_request_id: requestId,
    p_status_code: statusCode,
    p_summary: summary as Json,
  });
  if (error) throw new Error('billing_worker_health_write_failed');
}

export async function POST(request: Request): Promise<Response> {
  if (!validSecret(request.headers.get('x-billing-worker-secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const mode = typeof body === 'object' && body !== null && 'mode' in body ? body.mode : undefined;
  if (mode !== 'recovery' && mode !== 'reconciliation') {
    return NextResponse.json({ error: 'invalid_mode' }, { status: 400 });
  }
  const requestId = randomUUID();
  try {
    const summary =
      mode === 'recovery' ?
        await recoverBillingResources({ batchSize: 20, maxDurationMs: 45_000 })
      : await reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 });
    await record(mode, requestId, 200, summary);
    return NextResponse.json({ mode, ...summary });
  } catch {
    await record(mode, requestId, 500, { error: 'worker_failed' }).catch(() => {});
    return NextResponse.json({ error: 'worker_failed' }, { status: 500 });
  }
}
