'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import {
  Bell,
  Globe,
  Keyboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { updateLocalePreferenceAction } from '@/app/[locale]/dashboard/account/actions';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import type { OrgAccount } from './app-sidebar-client';
import { AppSidebarClient } from './app-sidebar-client';

export type TopbarUser = {
  displayName: string;
  email: string;
};

type Props = {
  user: TopbarUser;
  locale: string;
  orgs: OrgAccount[];
};

// Matches NAV_ITEMS labels in sidebar exactly
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/projects': 'Proyectos',
  '/dashboard/members': 'Miembros',
  '/dashboard/billing': 'Billing',
  '/dashboard/org/settings': 'Ajustes',
  '/dashboard/account': 'Mi cuenta',
  '/dashboard/operations/robot': 'Iroko Robot',
};

function getPageTitle(pathname: string): string {
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === route || (route !== '/dashboard' && pathname.startsWith(route))) {
      return title;
    }
  }
  return 'Dashboard';
}

function userInitials(displayName: string): string {
  return displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function AppTopbarClient({ user, locale, orgs }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('UserMenu');
  const { theme, setTheme } = useTheme();
  const pageTitle = getPageTitle(pathname);
  const firstOrg = orgs[0];
  const orgLabel = firstOrg?.name.toUpperCase() ?? 'IROKO';

  function handleChangeLocale(next: string) {
    if (next === locale) return;
    // Persist to the profile (no-op for guests); don't block the navigation.
    void updateLocalePreferenceAction(next);
    // next-intl swaps the URL locale and sets the NEXT_LOCALE cookie.
    router.replace(pathname, { locale: next });
  }

  const ThemeIcon =
    theme === 'light' ? Sun
    : theme === 'dark' ? Moon
    : Monitor;

  return (
    <header
      className="border-border sticky top-0 z-20 flex w-full items-center justify-between border-b px-8"
      style={{
        height: 60,
        background: 'rgba(245,236,218,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
      {/* Left: mobile menu + breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-1">
                <Menu className="size-5" />
                <span className="sr-only">Abrir navegación</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[248px] border-none p-0">
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <SheetDescription className="sr-only">
                Menú lateral para navegación en dispositivos móviles.
              </SheetDescription>
              <AppSidebarClient orgs={orgs} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Breadcrumb */}
        <div className="hidden items-center gap-[10px] lg:flex">
          <span
            className="font-mono text-[11px] font-semibold whitespace-nowrap uppercase"
            style={{ letterSpacing: '0.16em', color: 'var(--text-tertiary)' }}>
            {orgLabel}
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 14, opacity: 0.5 }}>/</span>
          <span
            className="leading-none font-bold"
            style={{ fontSize: 18, color: 'var(--text-primary)' }}>
            {pageTitle}
          </span>
        </div>
      </div>

      {/* Right: search + bell + avatar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2"
            style={{ width: 14, height: 14, color: 'var(--text-tertiary)', strokeWidth: 1.5 }}
          />
          <input
            type="text"
            placeholder="Buscar..."
            className="focus-visible:outline-none"
            style={{
              height: 32,
              width: 240,
              padding: '0 56px 0 32px',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 13,
              outline: 'none',
              color: 'var(--text-primary)',
            }}
          />
          <span
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 font-mono"
            style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              background: 'var(--surface-2)',
              padding: '1px 6px',
              borderRadius: 3,
              border: '1px solid var(--border)',
            }}>
            ⌘ K
          </span>
        </div>

        {/* Bell */}
        <button
          className="relative flex items-center justify-center rounded-[6px] transition-colors"
          style={{ width: 32, height: 32, background: 'transparent', border: 0 }}>
          <Bell
            style={{ width: 17, height: 17, color: 'var(--text-secondary)', strokeWidth: 1.5 }}
          />
          <span
            className="absolute rounded-full"
            style={{
              top: 6,
              right: 6,
              width: 6,
              height: 6,
              background: 'var(--color-poppy)',
              border: '2px solid var(--background)',
            }}
          />
          <span className="sr-only">Notificaciones</span>
        </button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="avatar-32 cursor-pointer font-mono text-[12px] font-bold"
              style={{ background: 'var(--color-poppy)', border: 0 }}>
              {userInitials(user.displayName)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-border shadow-lg"
            style={{ width: 240, borderRadius: 10, padding: 8 }}>
            <DropdownMenuLabel style={{ padding: '8px 10px 10px' }}>
              <div className="flex flex-col">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user.displayName}
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ margin: '4px -2px' }} />

            <Link href="/dashboard/account?tab=profile">
              <DropdownMenuItem style={{ borderRadius: 4, padding: '7px 10px', gap: 10 }}>
                <User style={{ width: 15, height: 15, strokeWidth: 1.25 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t('profile')}</span>
              </DropdownMenuItem>
            </Link>

            <DropdownMenuItem style={{ borderRadius: 4, padding: '7px 10px', gap: 10 }}>
              <Settings style={{ width: 15, height: 15, strokeWidth: 1.25 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t('preferences')}</span>
            </DropdownMenuItem>

            <DropdownMenuItem style={{ borderRadius: 4, padding: '7px 10px', gap: 10 }}>
              <Keyboard style={{ width: 15, height: 15, strokeWidth: 1.25 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t('shortcuts')}</span>
              <span
                className="font-mono"
                style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
                ⌘/
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator style={{ margin: '4px -2px' }} />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger style={{ borderRadius: 4, padding: '7px 10px', gap: 10 }}>
                <ThemeIcon style={{ width: 15, height: 15, strokeWidth: 1.25 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t('theme')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent style={{ borderRadius: 8, padding: 6 }}>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem
                    value="system"
                    style={{ borderRadius: 4, padding: '7px 10px', gap: 10, fontSize: 13 }}>
                    <Monitor style={{ width: 15, height: 15, strokeWidth: 1.25 }} />
                    {t('themeSystem')}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="light"
                    style={{ borderRadius: 4, padding: '7px 10px', gap: 10, fontSize: 13 }}>
                    <Sun style={{ width: 15, height: 15, strokeWidth: 1.25 }} />
                    {t('themeLight')}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="dark"
                    style={{ borderRadius: 4, padding: '7px 10px', gap: 10, fontSize: 13 }}>
                    <Moon style={{ width: 15, height: 15, strokeWidth: 1.25 }} />
                    {t('themeDark')}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger style={{ borderRadius: 4, padding: '7px 10px', gap: 10 }}>
                <Globe style={{ width: 15, height: 15, strokeWidth: 1.25 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t('language')}</span>
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
                  {locale}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent style={{ borderRadius: 8, padding: 6 }}>
                <DropdownMenuRadioGroup value={locale} onValueChange={handleChangeLocale}>
                  <DropdownMenuRadioItem
                    value="es"
                    style={{ borderRadius: 4, padding: '7px 10px', gap: 10, fontSize: 13 }}>
                    Español
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="en"
                    style={{ borderRadius: 4, padding: '7px 10px', gap: 10, fontSize: 13 }}>
                    English
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator style={{ margin: '4px -2px' }} />

            <form action={`/${locale}/auth/logout`} method="POST">
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center rounded-[4px] px-[10px] py-[7px] text-left transition-colors hover:bg-red-50"
                style={{ gap: 10, background: 'transparent', border: 0, fontFamily: 'inherit' }}>
                <LogOut
                  style={{ width: 15, height: 15, strokeWidth: 1.25, color: 'var(--color-poppy)' }}
                />
                <span
                  style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-poppy)' }}>
                  {t('logout')}
                </span>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
