import 'server-only';

import { PostHog } from 'posthog-node';

import { env } from '@/env';
import { logger } from '@/lib/logger';

import {
  parseAnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from './events';

let warnedMissingToken = false;

// COMMANDMENTS.md: same contract as client.ts — loud once in dev, silent no-op in prod.
function warnMissingTokenOnce(): void {
  if (warnedMissingToken || process.env.NODE_ENV === 'production') return;
  warnedMissingToken = true;
  logger.error(
    { action: 'analytics.capture' },
    'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or ' +
      'un-configured, this causes events to be silently missed. This error stops ' +
      'appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured',
  );
}

export type CaptureServerInput<TName extends AnalyticsEventName> = {
  event: TName;
  properties: AnalyticsEventProperties<TName>;
  /** Supabase user UUID (`claims.sub`). Never an email. */
  distinctId: string;
  /** Groups the event under `account` for tenant-level analytics. */
  accountId?: string;
  /** Sets `$insert_id` for de-duplication (e.g. a webhook's external event id). */
  insertId?: string;
};

/**
 * Captures a single server-side analytics event via posthog-node. Creates a
 * short-lived client, flushes immediately (`flushAt: 1`) and always shuts it
 * down — Server Actions/route handlers can terminate right after returning,
 * so nothing may be left queued.
 *
 * Never throws on a delivery failure: a PostHog outage must not break the
 * business operation it's instrumenting (same pattern as email delivery in
 * team/actions.ts) — failures are logged with context instead. A taxonomy
 * violation (unknown/sensitive property) still throws — that's a bug in our
 * own call site, not an operational failure.
 */
export async function captureServer<TName extends AnalyticsEventName>(
  input: CaptureServerInput<TName>,
): Promise<void> {
  if (!env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
    warnMissingTokenOnce();
    return;
  }

  const validated = parseAnalyticsEvent(input.event, input.properties);
  const properties = input.insertId ? { ...validated, $insert_id: input.insertId } : validated;

  const client = new PostHog(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    host: env.POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    client.capture({
      distinctId: input.distinctId,
      event: input.event,
      properties,
      groups: input.accountId ? { account: input.accountId } : undefined,
    });
    await client.shutdown();
  } catch (err) {
    logger.error(
      { action: 'analytics.capture', event: input.event },
      err instanceof Error ? err.message : 'captureServer failed',
    );
  }
}
