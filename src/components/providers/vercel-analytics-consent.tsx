'use client';

import { lazy, Suspense, useSyncExternalStore } from 'react';

import { hasConsent, subscribeToConsent } from '@/lib/cookie-consent';

const Analytics = lazy(() =>
  import('@vercel/analytics/next').then((module) => ({ default: module.Analytics })),
);
const SpeedInsights = lazy(() =>
  import('@vercel/speed-insights/next').then((module) => ({ default: module.SpeedInsights })),
);

function analyticsConsent(): boolean {
  return hasConsent('analytics');
}

function noServerConsent(): boolean {
  return false;
}

export function VercelAnalyticsConsent() {
  const consented = useSyncExternalStore(subscribeToConsent, analyticsConsent, noServerConsent);
  if (!consented) return null;

  // The installed SDKs retain their injected script after React unmounts.
  // Recheck at event time so revocation also blocks those existing scripts.
  return (
    <Suspense fallback={null}>
      <Analytics beforeSend={(event) => (analyticsConsent() ? event : null)} />
      <SpeedInsights beforeSend={(event) => (analyticsConsent() ? event : null)} />
    </Suspense>
  );
}
