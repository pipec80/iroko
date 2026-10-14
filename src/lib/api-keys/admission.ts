import { isIP } from 'node:net';

import { z } from 'zod';

import { env } from '@/env';
import { isLocalValidation } from '@/lib/local-validation';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

import { hashApiKey } from './index';

const MAX_IP_HEADER_LENGTH = 128;
const API_KEY_PATTERN = /^Bearer irk_[A-Za-z0-9_-]{43}$/;
const MAX_AUTHORIZATION_LENGTH = 512;
const MAX_RETRY_AFTER_SECONDS = 300;

const admissionRowSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('allowed'),
    account_id: z.uuid(),
    retry_after_seconds: z.literal(0),
  }),
  z.object({
    decision: z.enum(['missing_key', 'invalid_key']),
    account_id: z.null(),
    retry_after_seconds: z.literal(0),
  }),
  z.object({
    decision: z.enum(['ip_limited', 'account_limited']),
    account_id: z.null(),
    retry_after_seconds: z.number().int().min(1).max(MAX_RETRY_AFTER_SECONDS),
  }),
]);
const admissionResponseSchema = z.tuple([admissionRowSchema]);

export type AccountApiAdmission =
  | { decision: 'allowed'; accountId: string }
  | { decision: 'missing_key' | 'invalid_key' | 'unavailable' }
  | { decision: 'ip_limited' | 'account_limited'; retryAfterSeconds: number };

function normalizeIp(value: string | null): string | null {
  if (!value || value.length > MAX_IP_HEADER_LENGTH || value.includes('%') || !isIP(value))
    return null;
  if (isIP(value) === 4) return value;
  const canonical = new URL(`http://[${value}]`).hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(canonical);
  if (!mapped) return canonical;
  const [, highHex, lowHex] = mapped;
  if (!highHex || !lowHex) return null;
  const high = Number.parseInt(highHex, 16);
  const low = Number.parseInt(lowHex, 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join('.');
}

/** Only the hosting provider's canonical identity or explicit isolated local mode is trusted. */
export function resolveAccountApiClientIp(request: Request): string | null {
  try {
    if (isLocalValidation({ ...process.env, ...env })) return '127.0.0.1';
  } catch {
    logger.error({ action: 'api_v1.admission.identity' }, 'Invalid local validation configuration');
    return null;
  }
  if (!env.VERCEL_ENV) return null;
  return normalizeIp(request.headers.get('x-vercel-forwarded-for'));
}

async function getKeyHash(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  // Malformed credentials still consume IP budget, without hashing unbounded input.
  const key =
    authorization.length <= MAX_AUTHORIZATION_LENGTH && API_KEY_PATTERN.test(authorization) ?
      authorization.slice('Bearer '.length)
    : 'invalid_api_key_format';
  return hashApiKey(key);
}

/** Commits durable admission before the independent account lookup; no credentials are logged. */
export async function admitAccountApiRequest(request: Request): Promise<AccountApiAdmission> {
  const clientIp = resolveAccountApiClientIp(request);
  if (!clientIp) return { decision: 'unavailable' };
  try {
    const admin = createAdminClient();
    const keyHash = await getKeyHash(request);
    const { data, error } = await admin.rpc('admit_account_api_request', {
      p_client_ip: clientIp,
      ...(keyHash === null ? {} : { p_key_hash: keyHash }),
    });
    if (error) {
      logger.error(
        { action: 'api_v1.admission', code: error.code },
        'Account API admission failed',
      );
      return { decision: 'unavailable' };
    }
    const result = admissionResponseSchema.safeParse(data);
    if (!result.success) {
      logger.error({ action: 'api_v1.admission' }, 'Invalid account API admission response');
      return { decision: 'unavailable' };
    }
    const row = result.data[0];
    if (row.decision === 'allowed') return { decision: row.decision, accountId: row.account_id };
    if (row.decision === 'ip_limited' || row.decision === 'account_limited') {
      return { decision: row.decision, retryAfterSeconds: row.retry_after_seconds };
    }
    return { decision: row.decision };
  } catch {
    logger.error({ action: 'api_v1.admission' }, 'Account API admission unavailable');
    return { decision: 'unavailable' };
  }
}
