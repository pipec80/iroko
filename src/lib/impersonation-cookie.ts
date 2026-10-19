import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import { env } from '@/env';

const RETURN_COOKIE_TTL_SECONDS = 35 * 60;
const payloadSchema = z
  .object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    adminUserId: z.string().uuid(),
    targetUserId: z.string().uuid(),
    sessionId: z.string().uuid(),
  })
  .strict();
const envelopeSchema = payloadSchema.extend({
  version: z.literal(2),
  purpose: z.literal('admin-return'),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
});
export type AdminReturnPayload = z.infer<typeof payloadSchema>;

/** Selects only this Supabase project's auth cookie and chunks for fail-closed local logout. */
export function getSupabaseAuthCookieNames(names: string[], supabaseUrl: string): string[] {
  const prefix = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  return names.filter((name) => name === prefix || name.startsWith(`${prefix}.`));
}

function hmac(encoded: string): Buffer {
  return createHmac('sha256', Buffer.from(env.IMPERSONATION_COOKIE_SECRET, 'hex'))
    .update(encoded)
    .digest();
}

/** Signs a session-bound admin return cookie with a server-controlled lifetime and dedicated key. */
export function signImpersonationCookie(payload: AdminReturnPayload): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const envelope = {
    ...payloadSchema.parse(payload),
    version: 2,
    purpose: 'admin-return',
    issuedAt,
    expiresAt: issuedAt + RETURN_COOKIE_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(envelope)).toString('base64url');
  return `${encoded}.${hmac(encoded).toString('hex')}`;
}

/** Rejects legacy, rotated, expired or noncanonical cookies before returning any restoration tokens. */
export function verifyImpersonationCookie(value: string): AdminReturnPayload | null {
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature || !/^[A-Za-z0-9_-]+$/.test(body) || !/^[0-9a-f]{64}$/.test(signature))
    return null;
  const decoded = Buffer.from(body, 'base64url');
  if (decoded.toString('base64url') !== body) return null;
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), hmac(body))) return null;
  let input: unknown;
  try {
    input = JSON.parse(decoded.toString('utf8'));
  } catch {
    return null;
  }
  const parsed = envelopeSchema.safeParse(input);
  if (!parsed.success) return null;
  const envelope = parsed.data;
  const now = Math.floor(Date.now() / 1000);
  if (
    envelope.issuedAt > now ||
    envelope.expiresAt <= now ||
    envelope.expiresAt - envelope.issuedAt !== RETURN_COOKIE_TTL_SECONDS
  )
    return null;
  return {
    accessToken: envelope.accessToken,
    refreshToken: envelope.refreshToken,
    adminUserId: envelope.adminUserId,
    targetUserId: envelope.targetUserId,
    sessionId: envelope.sessionId,
  };
}
