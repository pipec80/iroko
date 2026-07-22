import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: { SUPABASE_SECRET_KEY: 'test-secret-key-at-least-32-chars-long' },
}));

import { signImpersonationCookie, verifyImpersonationCookie } from './impersonation-cookie';

const PAYLOAD = {
  accessToken: 'access-token-value',
  refreshToken: 'refresh-token-value',
  adminUserId: '11111111-1111-4111-8111-111111111111',
};

describe('impersonation-cookie', () => {
  it('round-trips a valid payload', () => {
    const cookie = signImpersonationCookie(PAYLOAD);
    const result = verifyImpersonationCookie(cookie);
    expect(result).toEqual(PAYLOAD);
  });

  it('rejects a cookie with a tampered payload', () => {
    const cookie = signImpersonationCookie(PAYLOAD);
    const [, sig] = cookie.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...PAYLOAD, adminUserId: 'attacker-id' }),
    ).toString('base64url');
    const tampered = `${tamperedPayload}.${sig}`;
    expect(verifyImpersonationCookie(tampered)).toBeNull();
  });

  it('rejects a cookie with an invalid signature', () => {
    const cookie = signImpersonationCookie(PAYLOAD);
    const [encoded] = cookie.split('.');
    expect(verifyImpersonationCookie(`${encoded}.0000000000`)).toBeNull();
  });

  it('rejects a malformed cookie value', () => {
    expect(verifyImpersonationCookie('not-a-valid-cookie')).toBeNull();
    expect(verifyImpersonationCookie('')).toBeNull();
  });

  it('rejects a payload missing required fields', () => {
    const encoded = Buffer.from(JSON.stringify({ accessToken: 'x' })).toString('base64url');
    const hmac = createHmac('sha256', 'test-secret-key-at-least-32-chars-long')
      .update(encoded)
      .digest('hex');
    expect(verifyImpersonationCookie(`${encoded}.${hmac}`)).toBeNull();
  });
});
