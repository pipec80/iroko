import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '@/env';

export type AdminReturnPayload = {
  accessToken: string;
  refreshToken: string;
  adminUserId: string;
};

function hmacHex(encodedPayload: string): string {
  return createHmac('sha256', env.SUPABASE_SECRET_KEY).update(encodedPayload).digest('hex');
}

/**
 * Signs the admin's session (access/refresh token) into an opaque cookie
 * value so it can be restored when the impersonation ends. Signed, not
 * encrypted — the payload isn't secret from the admin themselves (it's
 * their own tokens), but the signature stops a tampered payload (e.g. a
 * forged adminUserId) from being accepted.
 */
export function signImpersonationCookie(payload: AdminReturnPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${hmacHex(encoded)}`;
}

/**
 * Verifies and decodes a cookie produced by `signImpersonationCookie`.
 * Returns null for any malformed, tampered, or incomplete value — callers
 * must treat null as "cannot restore the admin session" and force a full
 * sign-out rather than proceeding with a partial/forged payload.
 */
export function verifyImpersonationCookie(cookieValue: string): AdminReturnPayload | null {
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;
  const expected = hmacHex(encoded);

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).accessToken !== 'string' ||
    typeof (parsed as Record<string, unknown>).refreshToken !== 'string' ||
    typeof (parsed as Record<string, unknown>).adminUserId !== 'string'
  ) {
    return null;
  }

  return parsed as AdminReturnPayload;
}
