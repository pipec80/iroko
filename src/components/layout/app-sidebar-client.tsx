'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  FolderTree,
  LayoutGrid,
  Settings,
  Users,
  Bot,
  Activity,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/routing';
import type { Database } from '@/types/database';
import { cn } from '@/lib/utils';
import { appConfig } from '@/config/app.config';

type MembershipRole = Database['public']['Enums']['membership_role'];
type AccountType = Database['public']['Enums']['account_type'];

export type OrgAccount = {
  account_id: string;
  name: string;
  slug: string;
  role: MembershipRole;
  type: AccountType;
  logo_url: string;
  plan?: string;
};

const ORG_TONES = ['var(--color-poppy)', 'var(--color-cobalt)', 'var(--color-ink)'];

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
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOrg = orgs[selectedIndex] ?? null;

  const navItems = [
    { id: 'overview', Icon: LayoutGrid, label: t('nav_overview'), href: '/dashboard' },
    ...(appConfig.features.projects ?
      [{ id: 'projects', Icon: FolderTree, label: t('nav_projects'), href: '/dashboard/projects' }]
    : []),
    ...(appConfig.features.verticals.robot ?
      [{ id: 'robot', Icon: Bot, label: `${appConfig.brand} Robot`, href: '/dashboard/robot' }]
    : []),
    ...(appConfig.features.members ?
      [{ id: 'members', Icon: Users, label: t('nav_members'), href: '/dashboard/members' }]
    : []),
    ...((
      appConfig.features.activityLog &&
      (selectedOrg?.role === 'owner' || selectedOrg?.role === 'admin')
    ) ?
      [{ id: 'activity', Icon: Activity, label: t('nav_activity'), href: '/dashboard/activity' }]
    : []),
    ...(appConfig.features.billing ?
      [{ id: 'billing', Icon: CreditCard, label: t('nav_billing'), href: '/dashboard/billing' }]
    : []),
    { id: 'settings', Icon: Settings, label: t('nav_settings'), href: '/dashboard/org/settings' },
  ];

  return (
    <aside className="border-border bg-surface-2 flex h-full w-[248px] flex-col border-r">
      {/* Brand strip */}
      <div className="border-border flex h-[60px] shrink-0 items-center gap-2 border-b px-[18px]">
        <Link href="/" className="flex items-center gap-2">
          <div
            className="flex shrink-0 items-center justify-center"
            style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--color-night)' }}>
            <svg viewBox="0 0 28 28" width="20" height="20" aria-hidden="true">
              <circle
                cx="14"
                cy="14"
                r="8.5"
                fill="none"
                stroke="var(--color-poppy)"
                strokeWidth="2"
              />
              <circle cx="14" cy="14" r="3" fill="var(--color-cobalt)" />
              <line x1="14" y1="3" x2="14" y2="5.5" stroke="var(--color-poppy)" strokeWidth="1.4" />
              <line
                x1="14"
                y1="22.5"
                x2="14"
                y2="25"
                stroke="var(--color-poppy)"
                strokeWidth="1.4"
              />
            </svg>
          </div>
          <span className="brand-wordmark">{appConfig.brand}</span>
        </Link>
      </div>

      {/* Org switcher */}
      <div className="px-3">
        <button type="button" onClick={() => setIsOpen((v) => !v)} className="org-switcher">
          {selectedOrg ?
            <>
              <div
                className="inline-flex shrink-0 items-center justify-center font-sans"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: getOrgTone(selectedIndex),
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 11,
                }}>
                {orgInitials(selectedOrg.name)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span
                  className="truncate text-[13px] font-semibold"
                  style={{ color: 'var(--text-primary)' }}>
                  {selectedOrg.name}
                </span>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
                  {selectedOrg.plan ?
                    `Plan ${selectedOrg.plan}`
                  : selectedOrg.role.charAt(0).toUpperCase() + selectedOrg.role.slice(1)}
                </span>
              </div>
            </>
          : <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              {t('no_org')}
            </span>
          }
          {isOpen ?
            <ChevronUp
              style={{
                strokeWidth: 1.5,
                width: 14,
                height: 14,
                color: 'var(--text-tertiary)',
                flexShrink: 0,
              }}
            />
          : <ChevronDown
              style={{
                strokeWidth: 1.5,
                width: 14,
                height: 14,
                color: 'var(--text-tertiary)',
                flexShrink: 0,
              }}
            />
          }
        </button>

        {/* Dropdown — in flow, pushes nav down */}
        {isOpen && (
          <div className="surface-card mb-2 p-1.5" style={{ boxShadow: 'var(--shadow-md)' }}>
            {orgs.map((org, i) => (
              <button
                key={org.account_id}
                type="button"
                onClick={() => {
                  setSelectedIndex(i);
                  setIsOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5"
                style={{
                  border: 0,
                  background: i === selectedIndex ? 'var(--surface-3)' : 'transparent',
                }}>
                <div
                  className="inline-flex shrink-0 items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    background: getOrgTone(i),
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 10,
                  }}>
                  {orgInitials(org.name)}
                </div>
                <span
                  className="flex-1 text-left text-[13px] font-medium"
                  style={{ color: 'var(--text-primary)' }}>
                  {org.name}
                </span>
                {org.plan && (
                  <span
                    className="font-mono text-[10px] uppercase"
                    style={{ color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>
                    {org.plan}
                  </span>
                )}
              </button>
            ))}
            <div className="my-1.5 h-px" style={{ background: 'var(--border)' }} />
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5"
              style={{ border: 0, background: 'transparent' }}>
              <div
                className="inline-flex shrink-0 items-center justify-center text-sm font-medium"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: 'var(--surface-3)',
                  color: 'var(--text-secondary)',
                }}>
                +
              </div>
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('new_org')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-1.5">
        {navItems.map(({ id, Icon, label, href }) => {
          const isActive =
            pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={id}
              href={href}
              className={cn('nav-item', isActive ? 'nav-item--active' : 'nav-item--inactive')}>
              <Icon
                style={{ width: 17, height: 17, flexShrink: 0 }}
                strokeWidth={isActive ? 1.5 : 1.25}
              />
              {label}
              {isActive && (
                <div
                  className="ml-auto shrink-0 rounded-full"
                  style={{ width: 5, height: 5, background: 'var(--color-iron)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer engine card */}
      <div className="p-3">
        <div className="surface-card px-3 py-2.5">
          <p className="col-header opacity-60">Build</p>
          <div className="mt-1 flex items-center justify-between">
            <span
              className="font-mono text-[11px] font-semibold"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              iroko · v1.0
            </span>
            <span
              className="font-mono text-[9px] font-bold uppercase"
              style={{ color: 'var(--color-iron)', letterSpacing: '0.1em' }}>
              ● stable
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
