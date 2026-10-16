import { env } from '@/env';

import { assertMockBillingAllowed, isMockBillingAllowed } from './mock-policy';

const MAX_TOKEN_LENGTH = 65536;

async function hmacKey(): Promise<CryptoKey> {
  if (!/^[\da-f]{64}$/iu.test(env.MOCK_BILLING_SECRET))
    throw new Error('invalid_mock_billing_secret');
  const bytes = Uint8Array.from(env.MOCK_BILLING_SECRET.match(/../g) ?? [], (hex) =>
    Number.parseInt(hex, 16),
  );
  return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Signs a bounded UTF-8 mock payload. Checkout replay protection remains out of scope. */
export async function signMockPayload(payload: object): Promise<string> {
  assertMockBillingAllowed({ nodeEnv: env.NODE_ENV, allowMockBilling: env.ALLOW_MOCK_BILLING });
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (bytes.length > 48000) throw new Error('mock_payload_too_large');
  const body = encode(bytes);
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(),
    new TextEncoder().encode(body),
  );
  const hex = Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${body}.${hex}`;
}

/** Verifies canonical bytes in constant time; consumers must validate the decoded purpose/schema. */
export async function verifyMockPayload(token: string): Promise<unknown | null> {
  if (!isMockBillingAllowed({ nodeEnv: env.NODE_ENV, allowMockBilling: env.ALLOW_MOCK_BILLING }))
    return null;
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) return null;
  const segments = token.split('.');
  if (segments.length !== 2) return null;
  const [body, signature] = segments;
  if (!body || !signature || !/^[A-Za-z0-9_-]+$/.test(body) || !/^[\da-f]{64}$/.test(signature))
    return null;
  try {
    const bytes = Uint8Array.from(atob(body.replace(/-/g, '+').replace(/_/g, '/')), (char) =>
      char.charCodeAt(0),
    );
    if (encode(bytes) !== body) return null;
    const signatureBytes = Uint8Array.from(signature.match(/../g) ?? [], (hex) =>
      Number.parseInt(hex, 16),
    );
    if (
      !(await crypto.subtle.verify(
        'HMAC',
        await hmacKey(),
        signatureBytes,
        new TextEncoder().encode(body),
      ))
    )
      return null;
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}
