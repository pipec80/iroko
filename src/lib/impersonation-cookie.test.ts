import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => ({
  IMPERSONATION_COOKIE_SECRET: 'ab'.repeat(32),
  SUPABASE_SECRET_KEY: 'unrelated-supabase-key',
}));
vi.mock('@/env', () => ({ env: settings }));
import { signImpersonationCookie, verifyImpersonationCookie } from './impersonation-cookie';

const PAYLOAD = {
  accessToken: 'access-token-value',
  refreshToken: 'refresh-token-value',
  adminUserId: '11111111-1111-4111-8111-111111111111',
  targetUserId: '22222222-2222-4222-8222-222222222222',
  sessionId: '33333333-3333-4333-8333-333333333333',
};
const NOW = 1_800_000_000;
function signedEnvelope(override: Record<string, unknown> = {}) {
  const envelope = {
    ...PAYLOAD,
    version: 2,
    purpose: 'admin-return',
    issuedAt: NOW,
    expiresAt: NOW + 2100,
    ...override,
  };
  const encoded = Buffer.from(JSON.stringify(envelope)).toString('base64url');
  const signature = createHmac('sha256', Buffer.from(settings.IMPERSONATION_COOKIE_SECRET, 'hex'))
    .update(encoded)
    .digest('hex');
  return `${encoded}.${signature}`;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW * 1000);
  settings.IMPERSONATION_COOKIE_SECRET = 'ab'.repeat(32);
});
afterEach(() => vi.useRealTimers());

describe('impersonation return cookie v2', () => {
  it('signs a server-timed envelope with exact lifetime and returns only the bound payload', () => {
    const cookie = signImpersonationCookie(PAYLOAD);
    const envelope = JSON.parse(Buffer.from(cookie.split('.')[0]!, 'base64url').toString('utf8'));
    expect(envelope).toEqual({
      ...PAYLOAD,
      version: 2,
      purpose: 'admin-return',
      issuedAt: NOW,
      expiresAt: NOW + 2100,
    });
    expect(verifyImpersonationCookie(cookie)).toEqual(PAYLOAD);
  });
  it('uses a dedicated key and rejects old cookies after rotation', () => {
    const cookie = signImpersonationCookie(PAYLOAD);
    const [body, signature] = cookie.split('.');
    expect(signature).not.toBe(
      createHmac('sha256', settings.SUPABASE_SECRET_KEY).update(body!).digest('hex'),
    );
    settings.IMPERSONATION_COOKIE_SECRET = 'cd'.repeat(32);
    expect(verifyImpersonationCookie(cookie)).toBeNull();
  });
  it.each([
    { version: 1 },
    { purpose: 'checkout' },
    { issuedAt: NOW + 1 },
    { issuedAt: NOW - 2100, expiresAt: NOW },
    { expiresAt: NOW + 2101 },
    { accessToken: '' },
    { refreshToken: '' },
    { adminUserId: 'admin' },
    { targetUserId: '' },
    { sessionId: 'session' },
    { extra: true },
  ])('rejects signed but invalid envelope %j', (override) => {
    expect(verifyImpersonationCookie(signedEnvelope(override))).toBeNull();
  });
  it('rejects the legacy signed payload without envelope fields', () => {
    const body = Buffer.from(JSON.stringify(PAYLOAD)).toString('base64url');
    const sig = createHmac('sha256', settings.SUPABASE_SECRET_KEY).update(body).digest('hex');
    expect(verifyImpersonationCookie(`${body}.${sig}`)).toBeNull();
  });
  it('rejects malformed and noncanonical encodings before accepting a signature', () => {
    const token = signedEnvelope();
    const [body, sig] = token.split('.');
    for (const value of [
      '',
      'broken',
      `${token}.extra`,
      `${body}.${sig!.toUpperCase()}`,
      `${body}.${sig}zz`,
      `${body}=.${sig}`,
      `${body}.00`,
      `!.${sig}`,
    ]) {
      expect(verifyImpersonationCookie(value)).toBeNull();
    }
  });
  it('rejects a changed payload with the original signature', () => {
    const [, sig] = signedEnvelope().split('.');
    expect(
      verifyImpersonationCookie(`${Buffer.from('{}').toString('base64url')}.${sig}`),
    ).toBeNull();
  });
});
