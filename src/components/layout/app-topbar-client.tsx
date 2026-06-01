'use client';

import React from 'react';
import { Bell, Globe, Keyboard, LogOut, Menu, Moon, Search, Settings, User } from 'lucide-react';

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
import { Link, usePathname } from '@/i18n/routing';
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

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/dashboard/projects': 'Proyectos',
  '/dashboard/members': 'Equipo',
  '/dashboard/billing': 'Billing',
  '/dashboard/org/settings': 'Configuración',
  '/dashboard/account': 'Mi cuenta',
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
  const pageTitle = getPageTitle(pathname);
  const firstOrg = orgs[0];
  const orgLabel = firstOrg?.name.toUpperCase() ?? 'IROKO';

  return (
    <header
      className="border-border sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-4 lg:px-6"
      style={{ background: 'var(--sidebar)' }}>
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
            <SheetContent side="left" className="w-64 border-none p-0">
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <SheetDescription className="sr-only">
                Menú lateral para navegación en dispositivos móviles.
              </SheetDescription>
              <AppSidebarClient orgs={orgs} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Breadcrumb */}
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-muted-foreground font-mono text-[11px] font-semibold tracking-widest uppercase">
            {orgLabel}
          </span>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-foreground text-[17px] font-bold">{pageTitle}</span>
        </div>
      </div>

      {/* Right: search + bell + avatar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
            strokeWidth={2}
          />
          <Input
            type="search"
            placeholder="Buscar..."
            className="border-border h-8 w-52 rounded-lg pr-10 pl-8 text-sm shadow-none"
          />
          <kbd className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[10px] font-bold">
            ⌘K
          </kbd>
        </div>

        {/* Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative h-8 w-8 transition-colors">
          <Bell className="size-4" strokeWidth={1.75} />
          <span
            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--color-poppy)' }}
          />
          <span className="sr-only">Notificaciones</span>
        </Button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full p-0 focus-visible:ring-0">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-black text-white"
                style={{ background: 'var(--color-poppy)' }}>
                {userInitials(user.displayName)}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-border w-60 rounded-xl p-1.5 shadow-xl">
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex flex-col">
                <span className="text-foreground text-[13px] font-bold">{user.displayName}</span>
                <span className="text-muted-foreground text-[11px]">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />

            <Link href="/dashboard/account?tab=profile">
              <DropdownMenuItem className="group cursor-pointer rounded-lg py-2.5">
                <User className="text-muted-foreground group-hover:text-foreground mr-3 size-4 transition-colors" />
                <span className="text-[13px] font-medium">Perfil</span>
              </DropdownMenuItem>
            </Link>

            <DropdownMenuItem className="group cursor-pointer rounded-lg py-2.5">
              <Settings className="text-muted-foreground group-hover:text-foreground mr-3 size-4 transition-colors" />
              <span className="text-[13px] font-medium">Preferencias</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="group cursor-pointer rounded-lg py-2.5">
              <Keyboard className="text-muted-foreground group-hover:text-foreground mr-3 size-4 transition-colors" />
              <span className="text-[13px] font-medium">Atajos</span>
              <kbd className="text-muted-foreground ml-auto font-mono text-[10px]">⌘/</kbd>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem className="group cursor-pointer rounded-lg py-2.5">
              <Moon className="text-muted-foreground group-hover:text-foreground mr-3 size-4 transition-colors" />
              <span className="text-[13px] font-medium">Cambiar tema</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="group cursor-pointer rounded-lg py-2.5">
              <Globe className="text-muted-foreground group-hover:text-foreground mr-3 size-4 transition-colors" />
              <span className="text-[13px] font-medium">Idioma</span>
              <span className="text-muted-foreground ml-auto font-mono text-[10px] uppercase">
                {locale}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <form action={`/${locale}/auth/logout`} method="POST">
              <button
                type="submit"
                className="hover:bg-destructive/8 group flex w-full cursor-pointer items-center rounded-lg px-2 py-2.5 text-left transition-colors">
                <LogOut
                  className="mr-3 size-4 transition-colors"
                  style={{ color: 'var(--color-poppy)' }}
                  strokeWidth={1.75}
                />
                <span className="text-[13px] font-medium" style={{ color: 'var(--color-poppy)' }}>
                  Cerrar sesión
                </span>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
