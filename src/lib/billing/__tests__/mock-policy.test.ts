import { describe, expect, it } from 'vitest';

import { assertMockBillingAllowed, isMockBillingAllowed } from '../mock-policy';

describe('mock billing access', () => {
  it('denies production without explicit opt-in', () => {
    expect(isMockBillingAllowed({ nodeEnv: 'production' })).toBe(false);
    expect(() =>
      assertMockBillingAllowed({ nodeEnv: 'production', allowMockBilling: 'false' }),
    ).toThrow('mock_billing_disabled');
  });
  it('permits explicit production opt-in and local development/test', () => {
    expect(isMockBillingAllowed({ nodeEnv: 'production', allowMockBilling: 'true' })).toBe(true);
    expect(isMockBillingAllowed({ nodeEnv: 'test' })).toBe(true);
    expect(isMockBillingAllowed({ nodeEnv: 'development' })).toBe(true);
  });
});
