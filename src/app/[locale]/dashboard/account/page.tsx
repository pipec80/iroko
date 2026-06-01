import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SessionsTab } from '@/components/dashboard/account/sessions-tab';
import { AccountTabs } from '@/components/dashboard/account/account-tabs';
import { createClient } from '@/lib/supabase/server';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Settings');

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  const email = (claimsData?.claims.email as string | undefined) ?? '';
  const role = (claimsData?.claims.app_metadata?.role as string | undefined) ?? 'member';

  const { data: profile } =
    userId ?
      await supabase
        .from('profiles')
        .select(
          'id, given_name, family_name, display_name, avatar_url, locale, timezone, phone_number',
        )
        .eq('id', userId)
        .maybeSingle()
    : { data: null };

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('profile.description')}</p>
      </header>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="bg-surface-3 h-10 w-72 animate-pulse rounded-xl" />
            <div className="bg-surface-3 h-80 w-full animate-pulse rounded-2xl" />
          </div>
        }>
        <AccountTabs
          email={email}
          role={role}
          profile={
            profile ?? {
              id: userId ?? '',
              given_name: null,
              family_name: null,
              display_name: null,
              avatar_url: null,
              locale: locale,
              timezone: 'America/Santiago',
              phone_number: null,
            }
          }
          sessionsSlot={<SessionsTab />}
        />
      </Suspense>
    </div>
  );
}
