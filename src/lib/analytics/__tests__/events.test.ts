import { describe, expect, it } from 'vitest';

import { eventSchemas, parseAnalyticsEvent } from '../events';

const SENSITIVE_KEYS = ['email', 'password', 'token', 'otp', 'api_key', 'secret'];

describe('eventSchemas', () => {
  it('accepts every event name declared in the taxonomy', () => {
    expect(Object.keys(eventSchemas).length).toBe(19);
  });

  it('accepts the documented valid shape for each event', () => {
    const validPayloads: Record<string, unknown> = {
      signup_started: { method: 'password' },
      signup_completed: { method: 'password' },
      login_completed: { method: 'google' },
      mfa_challenge_completed: {},
      onboarding_step_completed: { step: 'org_name' },
      onboarding_completed: {},
      account_created: { account_type: 'personal' },
      account_switched: {},
      invitation_sent: { role: 'member', invited_count: 3 },
      invitation_accepted: {},
      project_created: { type: 'docs', tone: 'iron' },
      document_uploaded: {},
      plan_viewed: { source: 'pricing_page' },
      checkout_started: { plan_slug: 'pro', interval: 'month' },
      subscription_activated: { plan_slug: 'pro', interval: 'year', provider: 'stripe' },
      subscription_cancel_requested: {},
      api_key_created: { has_expiration: true },
      webhook_created: { event_count: 2 },
      feature_limit_reached: { limit_key: 'seats_max' },
    };

    for (const [name, schema] of Object.entries(eventSchemas)) {
      expect(
        schema.safeParse(validPayloads[name]).success,
        `${name} should accept its valid shape`,
      ).toBe(true);
    }
  });

  it('rejects an unknown property on every event schema', () => {
    for (const [name, schema] of Object.entries(eventSchemas)) {
      const result = schema.safeParse({ unexpected_field: 'value' });
      expect(result.success, `${name} should reject an unknown property`).toBe(false);
    }
  });

  it.each(SENSITIVE_KEYS)('rejects a sensitive "%s" property on every event schema', (key) => {
    for (const [name, schema] of Object.entries(eventSchemas)) {
      const result = schema.safeParse({ [key]: 'leaked-value' });
      expect(result.success, `${name} should reject "${key}"`).toBe(false);
    }
  });

  it('rejects an invalid enum value', () => {
    const result = eventSchemas.project_created.safeParse({ type: 'not-a-type', tone: 'iron' });
    expect(result.success).toBe(false);
  });
});

describe('parseAnalyticsEvent', () => {
  it('returns the validated properties for a valid event', () => {
    const result = parseAnalyticsEvent('signup_started', { method: 'password' });
    expect(result).toEqual({ method: 'password' });
  });

  it('throws for a property outside the taxonomy', () => {
    expect(() =>
      // @ts-expect-error — deliberately passing a property outside the schema
      parseAnalyticsEvent('signup_started', { method: 'password', email: 'leak@test.com' }),
    ).toThrow();
  });
});
