import { describe, it, expect, vi } from 'vitest';
import Stripe from 'stripe';

import subscriptionUpdatedFixture from '@/test/fixtures/stripe/subscription-updated.json';

// A deliberately UNmocked 'stripe' — the goal of this file is to exercise
// the real SDK's signature verification (webhooks.constructEvent), which
// stripe.test.ts mocks out entirely via vi.mock('stripe', ...). Without
// this, a breaking change in the SDK's constructEvent contract (or in the
// shape Stripe actually sends) would never fail a test.
const { WEBHOOK_SECRET } = vi.hoisted(() => ({ WEBHOOK_SECRET: 'whsec_contract_test_secret' }));

vi.mock('@/env', () => ({
  env: { STRIPE_SECRET_KEY: 'sk_test_contract', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET },
}));

import { stripeProvider } from '../stripe';

/** Signs `payload` the way Stripe itself does, using the real SDK's test helper. */
function signPayload(payload: string): string {
  return new Stripe('sk_test_contract').webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
}

describe('stripeProvider.verifyWebhook — real SDK contract', () => {
  it('accepts a genuinely signed customer.subscription.updated payload and normalizes it', async () => {
    const payload = JSON.stringify(subscriptionUpdatedFixture);
    const signature = signPayload(payload);

    const result = await stripeProvider.verifyWebhook(payload, signature);

    expect(result).toEqual(
      expect.objectContaining({
        externalEventId: subscriptionUpdatedFixture.id,
        type: 'subscription_updated',
        accountId: 'acc_fixture_001',
        status: 'active',
        externalSubscriptionId: subscriptionUpdatedFixture.data.object.id,
        cancelAtPeriodEnd: true,
      }),
    );
  });

  it('rejects a payload whose body was tampered with after signing (real HMAC check)', async () => {
    const payload = JSON.stringify(subscriptionUpdatedFixture);
    const signature = signPayload(payload);

    const tamperedPayload = JSON.stringify({
      ...subscriptionUpdatedFixture,
      data: {
        ...subscriptionUpdatedFixture.data,
        object: { ...subscriptionUpdatedFixture.data.object, status: 'canceled' },
      },
    });

    const result = await stripeProvider.verifyWebhook(tamperedPayload, signature);
    expect(result).toBeNull();
  });

  it('rejects a signature computed with the wrong secret', async () => {
    const payload = JSON.stringify(subscriptionUpdatedFixture);
    const wrongSignature = new Stripe('sk_test_contract').webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_a_different_secret',
    });

    const result = await stripeProvider.verifyWebhook(payload, wrongSignature);
    expect(result).toBeNull();
  });
});
