'use client';

import { useEffect } from 'react';

import { track } from '@/lib/analytics/client';

/** Fires `plan_viewed` once on mount. Renders nothing. */
export function PlanViewedTracker({ source }: { source: 'pricing_page' | 'billing_page' }) {
  useEffect(() => {
    track('plan_viewed', { source });
  }, [source]);

  return null;
}
