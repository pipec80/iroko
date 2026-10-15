import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  prepareWebhookUrlValidation,
  webhookRegistrationErrorCode,
} from '@/lib/webhooks/registration';

export const runtime = 'nodejs';
const MAX_BODY_BYTES = 4096;
const requestSchema = z
  .object({
    accountId: z.uuid(),
    operation: z.enum(['create', 'update']),
    endpointId: z.uuid().optional(),
    url: z.string().max(2000),
  })
  .strict()
  .refine((value) => (value.operation === 'update' ? !!value.endpointId : !value.endpointId));

async function readBody(request: Request): Promise<unknown> {
  if (!request.body) throw new Error('invalid_body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error('invalid_body');
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } finally {
    reader.releaseLock();
  }
}

/** Session-authenticated validation; durable role and budget checks precede DNS. */
export async function POST(request: Request): Promise<Response> {
  const authorization = request.headers.get('authorization');
  const bearer =
    authorization?.length && authorization.length <= 8192 ?
      /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(authorization)?.[1]
    : undefined;
  if (authorization !== null && !bearer)
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await readBody(request));
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  try {
    const result = await prepareWebhookUrlValidation(input, bearer);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const code = webhookRegistrationErrorCode(error);
    const status =
      code === 'not_authenticated' ? 401
      : code === 'not_authorized' || code === 'feature_not_in_plan' ? 403
      : code === 'webhook_validation_rate_limited' ? 429
      : code === 'validation_failed' ? 500
      : 400;
    return NextResponse.json({ error: code }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
