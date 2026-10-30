import { getLocale, getTranslations } from 'next-intl/server';

import { listMySessions } from '@/app/[locale]/dashboard/account/actions';
import { createClient } from '@/lib/supabase/server';

import { SessionsTabClient } from './sessions-tab-client';

export async function SessionsTab() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const sessionId = claimsData?.claims.session_id;
  const currentSessionId = typeof sessionId === 'string' ? sessionId : null;
  const [sessions, t, tErrors, locale] = await Promise.all([
    listMySessions(),
    getTranslations('Settings.sessions'),
    getTranslations('Settings.errors'),
    getLocale(),
  ]);

  return (
    <SessionsTabClient
      sessions={sessions}
      currentSessionId={currentSessionId}
      locale={locale}
      labels={{
        heading: t('heading'),
        description: t('description'),
        device: t('device'),
        ip: t('ip'),
        last_active: t('last_active'),
        aal: t('aal'),
        actions: t('actions'),
        revoke: t('revoke'),
        revoke_all_others: t('revoke_all_others'),
        current_badge: t('current_badge'),
        none: t('none'),
        session_revoked: t('success.session_revoked'),
        other_sessions_revoked: t('success.other_sessions_revoked'),
        error: tErrors('generic'),
        device_unknown: t('device_unknown'),
        device_iphone: t('device_iphone'),
        device_android: t('device_android'),
        device_windows: t('device_windows'),
        device_macos: t('device_macos'),
        device_linux: t('device_linux'),
        device_browser: t('device_browser'),
      }}
    />
  );
}
