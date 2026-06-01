'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Link } from '@/i18n/routing';

import { AppSidebar } from './app-sidebar';

export type TopbarUser = {
  displayName: string;
  email: string;
};

type Props = {
  user: TopbarUser;
  locale: string;
};

export function AppTopbarClient({ user, locale }: Props) {
  const t = useTranslations('Navigation');

  return (
    <header className="bg-surface-bright/80 sticky top-0 z-30 flex h-16 w-full items-center justify-between border-none px-4 backdrop-blur-xl lg:px-8">
      <div className="flex w-full items-center gap-4 lg:max-w-sm">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <span className="material-symbols-outlined">menu</span>
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-none p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Menu lateral para navegación en dispositivos móviles.
              </SheetDescription>
              <AppSidebar />
            </SheetContent>
          </Sheet>
        </div>
        <div className="relative hidden w-full max-w-sm md:block">
          <span className="material-symbols-outlined text-on-surface-variant absolute top-1/2 left-3 -translate-y-1/2 text-[18px]">
            search
          </span>
          <Input
            type="search"
            placeholder={t('search_placeholder')}
            className="bg-surface-container-lowest border-outline-variant/20 focus-visible:ring-primary/20 h-9 w-full rounded-full pl-10 text-sm shadow-none md:w-[300px] lg:w-[400px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-on-surface-variant hover:text-primary relative transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <span className="bg-primary absolute top-2.5 right-2.5 flex h-1.5 w-1.5 rounded-full"></span>
          <span className="sr-only">{t('notifications')}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-on-surface-variant hover:text-primary rounded-full transition-colors focus-visible:ring-0">
              <span
                className="material-symbols-outlined text-[28px]"
                style={{ fontVariationSettings: "'FILL' 0" }}>
                account_circle
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-outline-variant/10 bg-surface-container-lowest w-64 rounded-2xl p-2 shadow-2xl">
            <DropdownMenuLabel className="font-headline px-3 py-2">
              <div className="flex flex-col">
                <span className="text-on-surface text-sm font-bold">{user.displayName}</span>
                <span className="text-on-surface-variant text-[11px] font-medium opacity-70">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-outline-variant/10 my-1" />

            <Link href="/dashboard/account?tab=profile">
              <DropdownMenuItem className="focus:bg-surface-container-highest group cursor-pointer rounded-lg py-2.5">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary mr-3 text-[20px] transition-colors">
                  person
                </span>
                <span className="text-on-surface-variant group-hover:text-on-surface text-sm font-bold">
                  {t('profile')}
                </span>
              </DropdownMenuItem>
            </Link>

            <Link href="/dashboard/team">
              <DropdownMenuItem className="focus:bg-surface-container-highest group cursor-pointer rounded-lg py-2.5">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary mr-3 text-[20px] transition-colors">
                  group
                </span>
                <span className="text-on-surface-variant group-hover:text-on-surface text-sm font-bold">
                  {t('team')}
                </span>
              </DropdownMenuItem>
            </Link>

            <DropdownMenuSeparator className="bg-outline-variant/10 my-1" />

            <form action={`/${locale}/auth/logout`} method="POST">
              <button
                type="submit"
                className="focus:bg-error-container/20 group flex w-full cursor-pointer items-center rounded-lg px-2 py-2.5 text-left transition-colors">
                <span className="material-symbols-outlined text-error group-hover:text-error mr-3 text-[20px] transition-colors">
                  logout
                </span>
                <span className="text-error text-sm font-bold">{t('sign_out')}</span>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
