'use client';

import { useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { parseConsentCookie, writeConsentCookie } from '@/lib/cookie-consent';
import { cn } from '@/lib/utils';

// Cookie consent never changes without a full page navigation from this
// component's own actions, so there is nothing to subscribe to.
function subscribeNoop() {
  return () => {};
}

function hasConsentSnapshot(): boolean {
  return parseConsentCookie(document.cookie) !== null;
}

// Matches what the server always assumes (no document.cookie access) —
// reading the real cookie only on the client via useSyncExternalStore
// avoids the SSR/hydration mismatch (React error #418) that a plain
// useState(() => hasConsent()) initializer would produce.
function hasConsentServerSnapshot(): boolean {
  return true;
}

export function CookieConsentBanner() {
  const t = useTranslations('CookieConsent');
  const dismissed = useSyncExternalStore(
    subscribeNoop,
    hasConsentSnapshot,
    hasConsentServerSnapshot,
  );
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [dismissedOverride, setDismissedOverride] = useState(false);

  if (dismissed || dismissedOverride) return null;

  function acceptAll() {
    writeConsentCookie({ analytics: true, marketing: true });
    setDismissedOverride(true);
  }

  function rejectNonEssential() {
    writeConsentCookie({ analytics: false, marketing: false });
    setDismissedOverride(true);
  }

  function savePreferences() {
    writeConsentCookie({ analytics, marketing });
    setDismissedOverride(true);
  }

  return (
    <div
      role="region"
      aria-label={t('message')}
      data-testid="cookie-consent-banner"
      className="border-border bg-background fixed inset-x-4 bottom-4 z-50 rounded-2xl border p-6 shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md">
      <p className="text-foreground mb-4 text-sm">{t('message')}</p>

      {customizing ?
        <div className="mb-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked disabled className="size-4" />
            {t('necessary_label')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="size-4"
              data-testid="cookie-consent-analytics-toggle"
            />
            {t('analytics_label')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
              className="size-4"
              data-testid="cookie-consent-marketing-toggle"
            />
            {t('marketing_label')}
          </label>
        </div>
      : null}

      <div className={cn('flex flex-wrap gap-2', customizing && 'justify-end')}>
        {customizing ?
          <Button size="sm" onClick={savePreferences} data-testid="cookie-consent-save">
            {t('save')}
          </Button>
        : <>
            <Button size="sm" onClick={acceptAll} data-testid="cookie-consent-accept-all">
              {t('accept_all')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={rejectNonEssential}
              data-testid="cookie-consent-reject">
              {t('reject')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCustomizing(true)}
              data-testid="cookie-consent-customize">
              {t('customize')}
            </Button>
          </>
        }
      </div>
    </div>
  );
}
