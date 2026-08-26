import { describe, expect, it } from 'vitest';

import { assertProviderCapability } from '../capabilities';

const noPortal = {
  customerPortal: false,
  cancelImmediately: true,
  cancelAtPeriodEnd: false,
  updatePaymentMethod: false,
  changePlan: false,
  pauseSubscription: false,
};

describe('assertProviderCapability', () => {
  it('rejects an unsupported provider operation', () => {
    expect(() => assertProviderCapability(noPortal, 'customerPortal')).toThrow(
      'billing_capability_not_supported:customerPortal',
    );
  });

  it('allows a supported provider operation', () => {
    expect(() => assertProviderCapability(noPortal, 'cancelImmediately')).not.toThrow();
  });
});
