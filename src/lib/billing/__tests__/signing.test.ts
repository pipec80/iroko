import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: { MOCK_BILLING_SECRET: 'test-secret-please-change', BILLING_DEFAULT_PROVIDER: 'mock' },
}));

import { signMockPayload, verifyMockPayload } from '../signing';

describe('mock payload signing', () => {
  it('should round-trip a payload through sign and verify', async () => {
    const payload = { accountId: 'acct-1', planSlug: 'pro', interval: 'month' };
    const token = await signMockPayload(payload);
    expect(await verifyMockPayload<typeof payload>(token)).toEqual(payload);
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
