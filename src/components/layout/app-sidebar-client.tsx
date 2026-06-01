'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  FolderTree,
  LayoutGrid,
  Plus,
  Settings,
  Users,
} from 'lucide-react';

import { Link, usePathname } from '@/i18n/routing';
import type { Database } from '@/types/database';
import { cn } from '@/lib/utils';

type MembershipRole = Database['public']['Enums']['membership_role'];
type AccountType = Database['public']['Enums']['account_type'];

export type OrgAccount = {
  account_id: string;
  name: string;
  slug: string;
  role: MembershipRole;
  type: AccountType;
  logo_url: string;
};

const NAV_ITEMS = [
  { id: 'overview', Icon: LayoutGrid, label: 'Inicio', href: '/dashboard' },
  { id: 'projects', Icon: FolderTree, label: 'Proyectos', href: '/dashboard/projects' },
  { id: 'members', Icon: Users, label: 'Equipo', href: '/dashboard/members' },
  { id: 'billing', Icon: CreditCard, label: 'Billing', href: '/dashboard/billing' },
  { id: 'settings', Icon: Settings, label: 'Configuración', href: '/dashboard/org/settings' },
];

const ORG_TONES = [
  'var(--color-poppy)',
  'var(--color-gold)',
  'var(--color-cobalt)',
  'var(--color-ink)',
];

function getOrgTone(index: number): string {
  return ORG_TONES[index % ORG_TONES.length] ?? 'var(--color-poppy)';
}

function orgInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = { orgs: OrgAccount[] };

export function AppSidebarClient({ orgs }: Props) {
  const pathname = usePathname();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOrg = orgs[selectedIndex] ?? null;

  return (
    <aside
      className="border-border flex h-full w-64 flex-col border-r"
      style={{ background: 'var(--sidebar)' }}>
      {/* Brand strip */}
      <div className="flex h-16 items-center px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 28 28" width="24" height="24" aria-hidden="true">
            <rect width="28" height="28" rx="5" fill="var(--color-ink)" />
            <circle
              cx="14"
              cy="14"
              r="8.5"
              fill="none"
              stroke="var(--color-poppy)"
              strokeWidth="1.8"
            />
            <circle cx="14" cy="14" r="3" fill="var(--color-cobalt)" />
          </svg>
          <span className="wordmark text-foreground text-[17px]">Iroko</span>
        </Link>
      </div>

      {/* Org switcher */}
      <div className="relative px-3 pb-2">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="border-border bg-background hover:bg-surface-2 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors">
          {selectedOrg ?
            <>
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-black text-white"
                style={{ background: getOrgTone(selectedIndex) }}>
                {orgInitials(selectedOrg.name)}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-foreground truncate text-[13px] leading-tight font-semibold">
                  {selectedOrg.name}
                </p>
                <p className="text-muted-foreground font-mono text-[9px] tracking-widest uppercase">
                  {selectedOrg.role}
                </p>
              </div>
            </>
          : <span className="text-muted-foreground text-sm">Sin organización</span>}
          {isOpen ?
            <ChevronUp className="text-muted-foreground size-3.5 shrink-0" />
          : <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />}
        </button>

        {isOpen && (
          <div
            className="border-border absolute top-full right-3 left-3 z-50 mt-1 overflow-hidden rounded-xl border shadow-xl"
            style={{ background: 'var(--popover)' }}>
            <div className="p-1.5">
              {orgs.map((org, i) => (
                <button
                  key={org.account_id}
                  type="button"
                  onClick={() => {
                    setSelectedIndex(i);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                    i === selectedIndex ? 'bg-accent' : 'hover:bg-surface-3',
                  )}>
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[10px] font-black text-white"
                    style={{ background: getOrgTone(i) }}>
                    {orgInitials(org.name)}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-foreground truncate text-[13px] font-medium">{org.name}</p>
                    <p className="text-muted-foreground font-mono text-[9px] tracking-widest uppercase">
                      {org.type}
                    </p>
                  </div>
                </button>
              ))}
              <hr className="border-border my-1.5" />
              <button
                type="button"
                className="text-muted-foreground hover:bg-surface-3 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 transition-colors">
                <Plus className="size-4 shrink-0" />
                <span className="text-[13px] font-medium">Nueva organización</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map(({ id, Icon, label, href }) => {
          const isActive =
            pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={id}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors',
                isActive ?
                  'bg-accent text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium',
              )}>
              <Icon
                className={cn('size-4 shrink-0', isActive ? 'text-primary' : '')}
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              {label}
              {isActive && (
                <div
                  className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: 'var(--color-poppy)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer engine card */}
      <div className="p-4">
        <div
          className="rounded-xl p-3.5"
          style={{ background: 'var(--color-ink)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p
            className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase"
            style={{ color: 'rgba(245,236,218,0.3)' }}>
            Engine Build
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <span
              className="font-mono text-[11px] font-bold"
              style={{ color: 'var(--color-bone)' }}>
              iroko · v1.0
            </span>
            <span
              className="rounded px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
              style={{ background: 'rgba(217,33,33,0.15)', color: 'var(--color-poppy)' }}>
              ● stable
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
