import { describe, it, expect } from 'vitest';

import { applyEvent } from '../subscription-state';
import type { NormalizedEvent } from '../types';

function evt(over: Partial<NormalizedEvent>): NormalizedEvent {
  return { externalEventId: 'e1', type: 'subscription_updated', accountId: 'a1', raw: {}, ...over };
}

describe('applyEvent', () => {
  it('should activate on subscription_created', () => {
    const next = applyEvent(null, evt({ type: 'subscription_created', status: 'active' }));
    expect(next).toEqual({ status: 'active', cancelAtPeriodEnd: false });
  });

  it('should default to trialing status when created event omits status', () => {
    const next = applyEvent(null, evt({ type: 'subscription_created' }));
    expect(next.status).toBe('active');
  });

  it('should carry cancelAtPeriodEnd from an update event', () => {
    const next = applyEvent(
      { status: 'active', cancelAtPeriodEnd: false },
      evt({ type: 'subscription_updated', cancelAtPeriodEnd: true }),
    );
    expect(next).toEqual({ status: 'active', cancelAtPeriodEnd: true });
  });

  it('should force canceled status on subscription_canceled', () => {
    const next = applyEvent(
      { status: 'active', cancelAtPeriodEnd: true },
      evt({ type: 'subscription_canceled' }),
    );
    expect(next).toEqual({ status: 'canceled', cancelAtPeriodEnd: false });
  });

  it('should reactivate a past_due subscription when an invoice is paid', () => {
    const next = applyEvent(
      { status: 'past_due', cancelAtPeriodEnd: false },
      evt({ type: 'invoice_paid' }),
    );
    expect(next.status).toBe('active');
  });

  it('should preserve current status on update when event omits status', () => {
    const next = applyEvent(
      { status: 'trialing', cancelAtPeriodEnd: false },
      evt({ type: 'subscription_updated' }),
    );
    expect(next.status).toBe('trialing');
  });
});
