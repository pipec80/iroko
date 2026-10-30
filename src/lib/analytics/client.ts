import type { PostHog } from 'posthog-js';

import { appConfig } from '@/config/app.config';
import { env } from '@/env';

import {
  parseAnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from './events';
import { sanitizeAnalyticsProperties } from './sanitize';

let posthogInstance: PostHog | null = null;
let warnedMissingToken = false;
let initEpoch = 0;
let pendingInit: Promise<void> | null = null;

/** Scrubs this SDK's default persistence record before init can load external scripts. */
async function sanitizePersistence(posthog: PostHog, token: string): Promise<boolean> {
  const { cookieStore, localStore } = await import('posthog-js/lib/src/storage');
  // The SDK's cookie fallback persists raw session URLs. Refuse initialization
  // before extensions can issue requests when the intended backend is denied.
  if (!localStore._is_supported()) return false;
  // posthog-js 1.411.0 parseName; this app does not configure persistence_name.
  const name = `ph_${token.replace(/\+/g, 'PL').replace(/\//g, 'SL').replace(/=/g, 'EQ')}_posthog`;
  const cleanRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype ?
      sanitizeAnalyticsProperties(value as Record<string, unknown>)
    : null;
  for (const store of [cookieStore, localStore]) {
    const raw: unknown = store._get(name);
    if (!raw) continue;
    const record: unknown = store._parse(name);
    const cleaned = cleanRecord(record);
    if (!cleaned) return false;
    if (JSON.stringify(cleaned) !== JSON.stringify(record)) {
      if (
        !store._set(
          name,
          cleaned,
          posthog.config.cookie_expiration,
          posthog.config.cross_subdomain_cookie,
          posthog.config.secure_cookie,
        )
      )
        return false;
      if (JSON.stringify(store._parse(name)) !== JSON.stringify(cleaned)) return false;
    }
  }
  // An old cookie at another scope must not survive alongside the canonical
  // cookie. Refuse analytics rather than clear unrelated domains or identities.
  for (const cookie of document.cookie.split(';')) {
    const [key, ...parts] = cookie.trim().split('=');
    if (key !== name) continue;
    try {
      const value: unknown = JSON.parse(decodeURIComponent(parts.join('=')));
      const cleaned = cleanRecord(value);
      if (!cleaned || JSON.stringify(value) !== JSON.stringify(cleaned)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

// COMMANDMENTS.md: a missing PostHog config must never break the app, but
// must never fail silently either — this is the one-time, dev-only signal
// that events are being dropped. Production always stays a silent no-op.
function warnMissingTokenOnce(): void {
  if (warnedMissingToken || process.env.NODE_ENV === 'production') return;
  warnedMissingToken = true;
  console.error(
    'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or ' +
      'un-configured, this causes events to be silently missed. This error stops ' +
      'appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured',
  );
}

/**
 * Loads and configures posthog-js. Only ever called after analytics consent
 * is granted — never on page load. No-op if the analytics feature is off or
 * the project token is unconfigured (see `warnMissingTokenOnce`).
 */
export function initAnalytics(): Promise<void> {
  if (!appConfig.features.analytics || posthogInstance) return Promise.resolve();

  const token = env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) {
    warnMissingTokenOnce();
    return Promise.resolve();
  }

  if (pendingInit) return pendingInit;
  const epoch = initEpoch;
  const initialize = async (): Promise<void> => {
    const { default: posthog } = await import('posthog-js');
    if (epoch !== initEpoch) return;
    if (!(await sanitizePersistence(posthog, token))) {
      console.error('Analytics initialization blocked: persisted URL cleanup failed');
      return;
    }
    if (epoch !== initEpoch) return;
    posthog.init(token, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      ui_host: 'https://us.posthog.com',
      defaults: '2026-05-30',
      autocapture: false,
      disable_session_recording: true,
      advanced_disable_feature_flags: true,
      save_referrer: false,
      save_campaign_params: false,
      disable_capture_url_hashes: true,
      person_profiles: 'identified_only',
      // Automatic pageview capture fires immediately on init/route-change —
      // faster than the async impersonation check in analytics-provider.tsx
      // can call pauseCapturing(), so it can leak a pageview mid-impersonation.
      // Captured manually instead, via capturePageview(), only after that
      // check resolves. See src/test/e2e/analytics.spec.ts.
      capture_pageview: false,
      // Server Actions/route handlers this app calls are same-origin — matching
      // by hostname alone links their posthog-node captures to this session.
      // window.location.hostname (not env.SITE_URL, a server-only var) works
      // correctly across local/preview/production without extra config.
      tracing_headers: ['localhost', '127.0.0.1', window.location.hostname],
      before_send: (event) => {
        if (!event) return event;
        event.properties = sanitizeAnalyticsProperties(event.properties);
        for (const key of ['$set', '$set_once']) {
          if (!(key in event)) continue;
          const update: unknown = Reflect.get(event, key);
          if (
            update &&
            typeof update === 'object' &&
            Object.getPrototypeOf(update) === Object.prototype
          ) {
            Reflect.set(event, key, sanitizeAnalyticsProperties(update as Record<string, unknown>));
          } else Reflect.deleteProperty(event, key);
        }
        return event;
      },
    });
    // NEXT_PUBLIC_VERCEL_ENV is injected by Vercel, not part of the app's env
    // schema — same pattern as instrumentation-client.ts (Sentry).
    posthog.register({ environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'local' });
    posthogInstance = posthog;
  };
  const current = initialize();
  pendingInit = current;
  void current.then(
    () => {
      if (pendingInit === current) pendingInit = null;
    },
    () => {
      if (pendingInit === current) pendingInit = null;
    },
  );
  return current;
}

/**
 * True once `initAnalytics` has actually finished (dynamic import resolved,
 * `posthog.init` called). `supabase.auth.onAuthStateChange` fires its
 * callback immediately and synchronously with the current session — before
 * `initAnalytics`'s dynamic import can possibly resolve — so callers that
 * react to auth changes must check this before touching identity/capture,
 * or they'll silently no-op against a not-yet-initialized SDK.
 */
export function isAnalyticsReady(): boolean {
  return posthogInstance !== null;
}

/** Stops capturing and clears identity. Call on analytics consent revocation. */
export function disableAnalytics(): void {
  initEpoch++;
  pendingInit = null;
  if (!posthogInstance) return;
  posthogInstance.opt_out_capturing();
  posthogInstance.reset(true);
  posthogInstance = null;
}

/** Suspends capture without discarding the instance. Call when impersonation starts. */
export function pauseCapturing(): void {
  posthogInstance?.opt_out_capturing();
}

/** Resumes capture after `pauseCapturing`. Call when impersonation ends. */
export function resumeCapturing(): void {
  posthogInstance?.opt_in_capturing();
}

/**
 * Captures `$pageview` manually — automatic capture is disabled (see
 * `initAnalytics`). Call only after confirming the session isn't
 * impersonated; a no-op before consent/init.
 */
export function capturePageview(): void {
  posthogInstance?.capture('$pageview');
}

/**
 * Captures a taxonomy event (see `events.ts`). No-op before consent/init.
 * @throws {import('zod').ZodError} if `properties` doesn't match the event's schema
 */
export function track<TName extends AnalyticsEventName>(
  name: TName,
  properties: AnalyticsEventProperties<TName>,
): void {
  if (!posthogInstance) return;
  posthogInstance.capture(name, parseAnalyticsEvent(name, properties));
}

/** Links subsequent events to the given Supabase user UUID. Never pass an email. */
export function identifyUser(userId: string): void {
  posthogInstance?.identify(userId);
}

/** Groups subsequent events under the given account UUID for tenant-level analytics. */
export function setAccountGroup(accountId: string): void {
  posthogInstance?.group('account', accountId);
}

/** Clears identity so the next person on this device isn't merged into the last one. Call on logout. */
export function resetAnalytics(): void {
  posthogInstance?.reset(true);
}
