'use client';

import React from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const t = useTranslations('Navigation');
  const pathname = usePathname();

  const navItems = [
    { icon: 'grid_view', label: t('overview'), href: '/dashboard' },
    { icon: 'inventory_2', label: t('inventory'), href: '/dashboard/inventory' },
    { icon: 'query_stats', label: t('operations'), href: '/dashboard/operations' },
    { icon: 'group', label: t('team'), href: '/dashboard/team' },
    { icon: 'analytics', label: t('reports'), href: '/dashboard/reports' },
    { icon: 'settings_suggest', label: t('settings'), href: '/dashboard/settings' },
  ];

  return (
    <aside className="bg-surface-container-low border-outline-variant/5 flex h-full w-64 flex-col border-r">
      <div className="flex h-20 items-center px-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-on-primary shadow-primary/20 flex h-9 w-9 items-center justify-center rounded-xl font-bold shadow-lg">
            RA
          </div>
          <div className="flex flex-col">
            <h2 className="text-primary font-headline text-base leading-tight font-extrabold tracking-tight">
              Retail Analytics
            </h2>
            <span className="text-on-surface-variant font-mono text-[9px] font-medium tracking-widest uppercase opacity-50">
              Corporate Edition
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 px-4 py-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200',
                isActive ?
                  'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
              )}>
              <span
                className={cn(
                  'material-symbols-outlined text-[20px] transition-transform group-hover:scale-110',
                  isActive ? 'fill-[1]' : '',
                )}>
                {item.icon}
              </span>
              <span className={cn('font-sans text-sm font-semibold', isActive ? 'font-bold' : '')}>
                {item.label}
              </span>
              {isActive && <div className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />}
            </Link>
          );
        })}
      </div>

      <div className="p-6">
        <div className="bg-surface-container-high/50 flex flex-col gap-1 rounded-2xl p-4">
          <p className="text-on-surface-variant font-mono text-[9px] font-black tracking-tighter uppercase opacity-40">
            Engine Build
          </p>
          <div className="flex items-center justify-between">
            <span className="text-on-surface text-[10px] font-bold">AXIOM LEDGER</span>
            <span className="bg-primary/20 text-primary rounded px-1.5 py-0.5 text-[8px] font-black tracking-tighter uppercase">
              v1.0.4
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
