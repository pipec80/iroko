'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

import {
  capturePageview,
  disableAnalytics,
  identifyUser,
  initAnalytics,
  isAnalyticsReady,
  pauseCapturing,
  resetAnalytics,
  resumeCapturing,
  setAccountGroup,
} from '@/lib/analytics/client';
import { hasConsent, subscribeToConsent } from '@/lib/cookie-consent';
import { createClient } from '@/lib/supabase/client';

function getAnalyticsConsentSnapshot(): boolean {
  return hasConsent('analytics');
}

// Matches what the server always assumes (no document.cookie access) — same
// reasoning as CookieConsentBanner's hasConsentServerSnapshot, but false
// here: analytics must never initialize before the client confirms consent.
function getAnalyticsConsentServerSnapshot(): boolean {
  return false;
}

type SyncedIdentity = { userId: string | null; impersonated: boolean };
type SyncedConsent = { userId: string | null; consent: boolean | null };

/**
 * Loads posthog-js only after analytics consent is granted (never before —
 * see `initAnalytics`), and keeps PostHog identity in sync with the Supabase
 * session: identify + group on login, reset on logout, pause capture for
 * the duration of an impersonation. Also owns `$pageview` capture — disabled
 * at the SDK level (see `initAnalytics`) because automatic pageview capture
 * fires immediately on navigation, racing ahead of the async impersonation
 * check below and leaking a pageview before `pauseCapturing()` can run.
 * Mounted once inside `Providers`, alongside `CookieConsentBanner`.
 */
export function AnalyticsProvider(): null {
  const hasAnalyticsConsent = useSyncExternalStore(
    subscribeToConsent,
    getAnalyticsConsentSnapshot,
    getAnalyticsConsentServerSnapshot,
  );
  // Impersonation swaps the session via a Server Action (new cookies + a
  // Next.js soft redirect) — the browser's own supabase-js client never
  // fires onAuthStateChange for that, since it didn't initiate the change
  // itself. pathname as a dependency re-checks claims on every client-side
  // navigation too, closing that gap (confirmed by src/test/e2e/analytics.spec.ts).
  const pathname = usePathname();
  const lastSyncedRef = useRef<SyncedIdentity>({ userId: null, impersonated: false });
  // TOKEN_REFRESHED (and other) auth events fire onAuthStateChange without a
  // real navigation — dedupe so a pageview isn't re-sent for the same path.
  const lastPageviewPathnameRef = useRef<string | null>(null);
  const lastSyncedConsentRef = useRef<SyncedConsent>({ userId: null, consent: null });

  // Persists cookie_consent.analytics to profiles.analytics_consent for
  // logged-in users. captureServer() falls back to this column when a
  // request carries no browser cookie at all (payment-provider webhooks) —
  // see src/lib/analytics/server.ts. Deliberately independent from the
  // effect below: it must run (and sync a rejection) even when
  // hasAnalyticsConsent is false, and shouldn't re-run on every navigation.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function syncConsentToDb(): Promise<void> {
      const { data } = await supabase.auth.getClaims();
      if (cancelled) return;
      const claims = data?.claims;
      // No session, or impersonating: this browser's cookie doesn't belong
      // to the target user's own choice — never overwrite their record.
      if (!claims || claims.app_metadata?.impersonated_by) return;
      if (
        lastSyncedConsentRef.current.userId === claims.sub &&
        lastSyncedConsentRef.current.consent === hasAnalyticsConsent
      ) {
        return;
      }
      lastSyncedConsentRef.current = { userId: claims.sub, consent: hasAnalyticsConsent };
      await supabase
        .from('profiles')
        .update({ analytics_consent: hasAnalyticsConsent })
        .eq('id', claims.sub);
    }

    void syncConsentToDb();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => void syncConsentToDb());

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hasAnalyticsConsent]);

  useEffect(() => {
    if (!hasAnalyticsConsent) {
      disableAnalytics();
      lastSyncedRef.current = { userId: null, impersonated: false };
      lastPageviewPathnameRef.current = null;
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    function maybeCapturePageview(): void {
      if (lastPageviewPathnameRef.current === pathname) return;
      lastPageviewPathnameRef.current = pathname;
      capturePageview();
    }

    async function syncIdentity(): Promise<void> {
      const { data } = await supabase.auth.getClaims();
      if (cancelled) return;
      // supabase.auth.onAuthStateChange fires its callback immediately and
      // synchronously with the current session — before initAnalytics's
      // dynamic import can possibly resolve. Bail out without touching any
      // dedup ref: the .then(syncIdentity) chained onto initAnalytics itself
      // is guaranteed to re-run this once the SDK is actually ready.
      if (!isAnalyticsReady()) return;

      const claims = data?.claims;

      if (!claims) {
        if (lastSyncedRef.current.userId !== null) resetAnalytics();
        lastSyncedRef.current = { userId: null, impersonated: false };
        maybeCapturePageview();
        return;
      }

      // impersonated_by/account_id only exist inside the JWT the custom
      // access-token hook mints — never on the raw session.user object.
      const impersonatedBy = claims.app_metadata?.impersonated_by as string | undefined;
      if (impersonatedBy) {
        if (!lastSyncedRef.current.impersonated) pauseCapturing();
        lastSyncedRef.current = { userId: claims.sub, impersonated: true };
        return;
      }

      if (lastSyncedRef.current.impersonated) resumeCapturing();

      // Only re-identify when the person actually changed — identify() sends
      // its own network event, so calling it on every navigation would spam
      // duplicate $identify captures for the same, unchanged user.
      if (lastSyncedRef.current.userId !== claims.sub) {
        identifyUser(claims.sub);
        const accountId = claims.app_metadata?.account_id as string | undefined;
        if (accountId) setAccountGroup(accountId);
      }
      lastSyncedRef.current = { userId: claims.sub, impersonated: false };
      maybeCapturePageview();
    }

    void initAnalytics().then(syncIdentity);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => void syncIdentity());

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hasAnalyticsConsent, pathname]);

  return null;
}
