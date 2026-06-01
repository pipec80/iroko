import { getLocale, getTranslations } from 'next-intl/server';

import { listMySessions } from '@/app/[locale]/dashboard/account/actions';

import { SessionsTabClient } from './sessions-tab-client';

export async function SessionsTab() {
  const [sessions, t, locale] = await Promise.all([
    listMySessions(),
    getTranslations('Settings.sessions'),
    getLocale(),
  ]);

  return (
    <SessionsTabClient
      sessions={sessions}
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
      }}
    />
  );
}
