import { createHmac } from 'node:crypto';

/**
 * RFC 6238 TOTP generator for E2E fixtures — Supabase Auth's `mfa.enroll()`
 * returns a base32 secret and expects a 6-digit code back; no test-only
 * dependency exists in this repo, so this implements the algorithm directly
 * against `node:crypto`. See src/test/e2e/fixtures/platform-admin.ts.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Decodes a base32 (RFC 4648) string, tolerant of lowercase, spaces and padding. */
export function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replaceAll(/[\s=]/g, '');

  let bits = '';
  for (const char of clean) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) throw new Error(`Invalid base32 character: ${char}`);
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** Milliseconds remaining until the next TOTP step boundary (30s by default). */
export function msUntilNextTotpStep(timestampMs?: number, stepSeconds = 30): number {
  const now = timestampMs ?? Date.now();
  const stepMs = stepSeconds * 1000;
  const elapsed = now % stepMs;
  return elapsed === 0 ? stepMs : stepMs - elapsed;
}

/**
 * Generates an RFC 6238 TOTP code (HMAC-SHA1, 30s step by default).
 * @param secret - base32, as returned by `mfa.enroll()`'s `data.totp.secret`
 */
export function generateTotp(
  secret: string,
  opts?: { timestampMs?: number; stepSeconds?: number; digits?: number },
): string {
  const timestampMs = opts?.timestampMs ?? Date.now();
  const stepSeconds = opts?.stepSeconds ?? 30;
  const digits = opts?.digits ?? 6;

  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);
  // BigInt is required here — writing the counter as two 32-bit halves
  // breaks once it crosses the 32-bit boundary (RFC 6238's own T=20000000000
  // vector exercises exactly this).
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
  const offset = hmac[19]! & 0x0f;
  const truncated =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  return String(truncated % 10 ** digits).padStart(digits, '0');
}
