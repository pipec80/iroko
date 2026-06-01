import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SessionsTab } from '@/components/dashboard/account/sessions-tab';
import { AccountTabs } from '@/components/dashboard/account/account-tabs';
import { createClient } from '@/lib/supabase/server';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
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
    <div className="animate-in fade-in flex flex-col gap-8 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-on-surface text-3xl font-bold tracking-tight md:text-4xl">
          {t('title')}
        </h1>
        <p className="text-on-surface-variant text-base">{t('profile.description')}</p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col gap-8">
            <div className="bg-muted h-12 w-96 animate-pulse rounded-xl" />
            <div className="bg-muted h-[400px] w-full animate-pulse rounded-3xl" />
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
