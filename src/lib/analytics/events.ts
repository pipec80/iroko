import { z } from 'zod';

import { INVITABLE_ROLES } from '@/lib/validation/team';
import { PROJECT_TONES, PROJECT_TYPES } from '@/lib/validation/projects';

/**
 * Product analytics taxonomy (Plan 006). One `.strict()` schema per event —
 * an unknown or sensitive property throws at capture time instead of being
 * sent silently. See docs/modules/analytics.md for the business question and
 * owner behind each event.
 *
 * Never add: email, name, password, tokens, secrets, document/project
 * content, payment details, or raw form values. Identity and tenant context
 * (distinct_id, account group) are attached by the caller, not here.
 */
export const authMethodSchema = z.enum(['password', 'google', 'azure', 'magic_link']);

export const eventSchemas = {
  signup_started: z.object({ method: authMethodSchema }).strict(),
  signup_completed: z.object({ method: authMethodSchema }).strict(),
  login_completed: z.object({ method: authMethodSchema }).strict(),
  mfa_challenge_completed: z.object({}).strict(),
  onboarding_step_completed: z.object({ step: z.enum(['org_name']) }).strict(),
  onboarding_completed: z.object({}).strict(),
  account_created: z.object({ account_type: z.enum(['personal', 'team']) }).strict(),
  // Fires from the org switcher once switching re-issues the session JWT with
  // the new account_id — not wired yet, the switcher is UI-only today (see
  // docs/modules/analytics.md). Schema kept ready for when it is.
  account_switched: z.object({}).strict(),
  invitation_sent: z
    .object({
      role: z.enum(INVITABLE_ROLES),
      invited_count: z.number().int().positive(),
    })
    .strict(),
  invitation_accepted: z.object({}).strict(),
  project_created: z.object({ type: z.enum(PROJECT_TYPES), tone: z.enum(PROJECT_TONES) }).strict(),
  document_uploaded: z.object({}).strict(),
  plan_viewed: z.object({ source: z.enum(['pricing_page', 'billing_page']) }).strict(),
  checkout_started: z
    .object({ plan_slug: z.enum(['pro', 'scale']), interval: z.enum(['month', 'year']) })
    .strict(),
  subscription_activated: z
    .object({
      plan_slug: z.string().max(40),
      interval: z.enum(['month', 'year']),
      provider: z.enum(['mock', 'stripe', 'mercadopago']),
    })
    .strict(),
  subscription_cancel_requested: z.object({}).strict(),
  api_key_created: z.object({ has_expiration: z.boolean() }).strict(),
  webhook_created: z.object({ event_count: z.number().int().positive() }).strict(),
  feature_limit_reached: z.object({ limit_key: z.string().max(60) }).strict(),
} as const;

export type AnalyticsEventName = keyof typeof eventSchemas;

export type AnalyticsEventProperties<TName extends AnalyticsEventName> = z.infer<
  (typeof eventSchemas)[TName]
>;

/**
 * Validates event properties against their taxonomy schema.
 * @throws {z.ZodError} if `properties` contains an unknown or malformed field
 */
export function parseAnalyticsEvent<TName extends AnalyticsEventName>(
  name: TName,
  properties: AnalyticsEventProperties<TName>,
): AnalyticsEventProperties<TName> {
  return eventSchemas[name].parse(properties) as AnalyticsEventProperties<TName>;
}
