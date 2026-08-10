'use client';

import { useTranslations } from 'next-intl';

import { reopenConsentBanner } from '@/lib/cookie-consent';

export function CookiePreferencesLink() {
  const t = useTranslations('PublicFooter');

  return (
    <button
      type="button"
      onClick={reopenConsentBanner}
      className="text-left text-sm transition-colors hover:opacity-80"
      style={{ color: 'rgba(245,236,218,0.5)' }}>
      {t('link_cookie_preferences')}
    </button>
  );
}
