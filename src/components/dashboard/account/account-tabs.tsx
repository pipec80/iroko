'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from '@/i18n/routing';

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

const VALID_TABS = ['profile', 'security', 'sessions'] as const;

export function AccountTabs({ email, role, profile, sessionsSlot }: Props) {
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
    <Tabs value={currentTab} onValueChange={handleTabChange} className="flex flex-col gap-6">
      {/* Top Navigation */}
      <div className="border-border w-full overflow-x-auto overflow-y-hidden border-b pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList
          variant="line"
          className="flex h-auto w-max justify-start gap-6 bg-transparent p-0">
          <TabsTrigger
            value="profile"
            disabled={isPending}
            className="data-[state=active]:text-primary text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 rounded-none border-none! bg-transparent! px-1 py-3 text-sm font-medium transition-all data-[state=active]:shadow-none">
            <span className="material-symbols-outlined text-[20px]">person</span>
            {t('profile')}
          </TabsTrigger>
          <TabsTrigger
            value="security"
            disabled={isPending}
            className="data-[state=active]:text-primary text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 rounded-none border-none! bg-transparent! px-1 py-3 text-sm font-medium transition-all data-[state=active]:shadow-none">
            <span className="material-symbols-outlined text-[20px]">security</span>
            {t('security')}
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            disabled={isPending}
            className="data-[state=active]:text-primary text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 rounded-none border-none! bg-transparent! px-1 py-3 text-sm font-medium transition-all data-[state=active]:shadow-none">
            <span className="material-symbols-outlined text-[20px]">devices</span>
            {t('sessions')}
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-col">
        <TabsContent
          value="profile"
          className="animate-in fade-in slide-in-from-right-2 mt-0 duration-300 focus-visible:outline-none">
          <ProfileTab profile={profile} email={email} role={role} />
        </TabsContent>

        <TabsContent
          value="security"
          className="animate-in fade-in slide-in-from-right-2 mt-0 duration-300 focus-visible:outline-none">
          <SecurityTab />
        </TabsContent>

        <TabsContent
          value="sessions"
          className="animate-in fade-in slide-in-from-right-2 mt-0 duration-300 focus-visible:outline-none">
          {sessionsSlot}
        </TabsContent>
      </div>
    </Tabs>
  );
}
