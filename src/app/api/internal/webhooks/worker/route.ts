import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { env } from '@/env';
import { logger } from '@/lib/logger';
import { runWebhookWorker } from '@/lib/webhooks/worker';

export const runtime = 'nodejs';
// Leave hosting headroom beyond the worker's 40-second cancellation budget.
export const maxDuration = 60;

/** Dedicated internal wakeup; accepts no destination or delivery data from the caller. */
export async function POST(request: Request): Promise<Response> {
  const authorization = request.headers.get('authorization');
  const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  const expected = env.WEBHOOK_WORKER_SECRET;
  if (
    !expected ||
    !supplied ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const body: unknown = await request.json();
    if (!z.object({}).strict().safeParse(body).success)
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  try {
    return NextResponse.json(await runWebhookWorker());
  } catch {
    logger.error({ action: 'webhook.worker' }, 'Webhook worker failed');
    return NextResponse.json({ error: 'worker_failed' }, { status: 500 });
  }
}
