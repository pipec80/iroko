'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from '@/i18n/routing';

import { BillingTab } from './billing-tab';
import { ProfileTab } from './profile-tab';
import { SecurityTab } from './security-tab';

export type ProfileSnapshot = {
  id: string;
  given_name: string | null;
  family_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  locale: string | null;
  timezone: string | null;
  phone_number: string | null;
};

type Props = {
  email: string;
  role: string;
  profile: ProfileSnapshot;
  sessionsSlot: React.ReactNode;
};

const VALID_TABS = ['profile', 'security', 'sessions', 'billing'] as const;

export function SettingsTabs({ email, role, profile, sessionsSlot }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const t = useTranslations('Settings.tabs');

  const activeTab = searchParams.get('tab') || 'profile';
  const currentTab = (VALID_TABS as readonly string[]).includes(activeTab) ? activeTab : 'profile';

  const handleTabChange = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', value);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <div className="bg-surface-container-low mb-8 inline-flex rounded-xl p-1 shadow-sm">
        <TabsList className="gap-1 border-none bg-transparent">
          <TabsTrigger
            value="profile"
            disabled={isPending}
            className="data-[state=active]:bg-surface-container-highest data-[state=active]:text-primary flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all select-none data-[state=active]:shadow-none">
            <span className="material-symbols-outlined text-[20px]">person</span>
            {t('profile')}
          </TabsTrigger>
          <TabsTrigger
            value="security"
            disabled={isPending}
            className="data-[state=active]:bg-surface-container-highest data-[state=active]:text-primary flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all select-none data-[state=active]:shadow-none">
            <span className="material-symbols-outlined text-[20px]">security</span>
            {t('security')}
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            disabled={isPending}
            className="data-[state=active]:bg-surface-container-highest data-[state=active]:text-primary flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all select-none data-[state=active]:shadow-none">
            <span className="material-symbols-outlined text-[20px]">devices</span>
            {t('sessions')}
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            disabled={isPending}
            className="data-[state=active]:bg-surface-container-highest data-[state=active]:text-primary flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all select-none data-[state=active]:shadow-none">
            <span className="material-symbols-outlined text-[20px]">card_membership</span>
            {t('billing')}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
        <ProfileTab profile={profile} email={email} role={role} />
      </TabsContent>

      <TabsContent value="security" className="mt-0 focus-visible:outline-none">
        <SecurityTab />
      </TabsContent>

      <TabsContent value="sessions" className="mt-0 focus-visible:outline-none">
        {sessionsSlot}
      </TabsContent>

      <TabsContent value="billing" className="mt-0 focus-visible:outline-none">
        <BillingTab />
      </TabsContent>
    </Tabs>
  );
}
