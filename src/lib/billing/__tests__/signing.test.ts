import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    MOCK_BILLING_SECRET: 'cd'.repeat(32),
    BILLING_DEFAULT_PROVIDER: 'mock',
    NODE_ENV: 'test',
    ALLOW_MOCK_BILLING: undefined as string | undefined,
  },
}));

import { signMockPayload, verifyMockPayload } from '../signing';
import { env } from '@/env';

describe('mock payload signing', () => {
  it('rejects padded base64url, uppercase signature, oversized input and oversized signing', async () => {
    const token = await signMockPayload({ test: true });
    const [body, signature] = token.split('.');
    expect(await verifyMockPayload(`${body}=.${signature}`)).toBeNull();
    expect(await verifyMockPayload(`${body}.${signature?.toUpperCase()}`)).toBeNull();
    expect(await verifyMockPayload('a'.repeat(65537))).toBeNull();
    await expect(signMockPayload({ value: 'a'.repeat(48000) })).rejects.toThrow(
      'mock_payload_too_large',
    );
  });
  afterEach(() => {
    Object.assign(env, {
      NODE_ENV: 'test',
      ALLOW_MOCK_BILLING: undefined,
      BILLING_DEFAULT_PROVIDER: 'mock',
    });
  });
  it('rejects an extra token segment', async () => {
    const token = await signMockPayload({ test: true });
    expect(await verifyMockPayload(token + '.extra')).toBeNull();
  });
  it('round trips UTF-8 payloads', async () => {
    const payload = { text: 'Mañana 日本' };
    expect(await verifyMockPayload(await signMockPayload(payload))).toEqual(payload);
  });
  it('rejects signing and verification in production without opt-in even with another default', async () => {
    const token = await signMockPayload({ test: true });
    Object.assign(env, { NODE_ENV: 'production', BILLING_DEFAULT_PROVIDER: 'stripe' });
    expect(await verifyMockPayload(token)).toBeNull();
    await expect(signMockPayload({ test: true })).rejects.toThrow('mock_billing_disabled');
  });
  it('should round-trip a payload through sign and verify', async () => {
    const payload = { accountId: 'acct-1', planSlug: 'pro', interval: 'month' };
    const token = await signMockPayload(payload);
    expect(await verifyMockPayload(token)).toEqual(payload);
  });

  it('should return null when the signature is tampered', async () => {
    const token = await signMockPayload({ accountId: 'acct-1' });
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    expect(await verifyMockPayload(tampered)).toBeNull();
  });

  it('should return null for a malformed token', async () => {
    expect(await verifyMockPayload('garbage')).toBeNull();
  });
});
