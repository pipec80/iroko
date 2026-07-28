'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const ADMIN_NAV_ITEMS = [
  { href: '/dashboard/admin/accounts', labelKey: 'nav_accounts' },
  { href: '/dashboard/admin/audit', labelKey: 'nav_audit' },
  { href: '/dashboard/admin/alerts', labelKey: 'nav_alerts' },
  { href: '/dashboard/admin/announcements', labelKey: 'nav_announcements' },
] as const;

export function AdminNav() {
  const t = useTranslations('Admin');
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 border-b border-(--border) pb-3">
      {ADMIN_NAV_ITEMS.map(({ href, labelKey }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-md px-2 py-1 text-sm',
              isActive ? 'nav-item--active font-semibold' : 'nav-item--inactive font-medium',
            )}>
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
