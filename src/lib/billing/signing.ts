import { env } from '@/env';

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.MOCK_BILLING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded);
}

/** Firma un payload del mock (checkout o webhook): `<base64url(json)>.<hmac hex>`. */
export async function signMockPayload(payload: object): Promise<string> {
  const body = toBase64Url(JSON.stringify(payload));
  return `${body}.${await hmacHex(body)}`;
}

/** Verifica y decodifica un token del mock. Devuelve null si la firma no valida. */
export async function verifyMockPayload<T>(token: string): Promise<T | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  if ((await hmacHex(body)) !== sig) return null;
  try {
    return JSON.parse(fromBase64Url(body)) as T;
  } catch {
    return null;
  }
}
