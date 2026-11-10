import {
  Activity,
  Bot,
  CreditCard,
  FolderOpen,
  FolderTree,
  LayoutGrid,
  Settings,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Database } from '@/types/database';
import type messages from '../../messages/en.json';
import type { AppConfig } from './app.config';

type MembershipRole = Database['public']['Enums']['membership_role'];
type Availability = 'projects' | 'members' | 'activityLog' | 'billing' | 'robot';

export type ProductModule = {
  id: string;
  href: string;
  label: { key: keyof typeof messages.Navigation } | { brandSuffix: string };
  Icon: LucideIcon;
  availability?: Availability;
  roles?: readonly MembershipRole[];
  sidebarOrder?: number;
  home?: {
    order: number;
    titleKey?: keyof typeof messages.Dashboard;
    descriptionKey: keyof typeof messages.Dashboard;
    Icon: LucideIcon;
    color: string;
  };
};

/** Presentation metadata only; pages, actions and RLS still enforce live authorization. */
export const productModules: readonly ProductModule[] = [
  {
    id: 'overview',
    href: '/dashboard',
    label: { key: 'nav_overview' },
    Icon: LayoutGrid,
    sidebarOrder: 0,
  },
  {
    id: 'projects',
    href: '/dashboard/projects',
    label: { key: 'nav_projects' },
    Icon: FolderTree,
    availability: 'projects',
    sidebarOrder: 1,
    home: {
      order: 0,
      titleKey: 'quick_projects',
      descriptionKey: 'quick_projects_desc',
      Icon: FolderOpen,
      color: 'var(--color-cobalt)',
    },
  },
  {
    id: 'robot',
    href: '/dashboard/robot',
    label: { brandSuffix: ' Robot' },
    Icon: Bot,
    availability: 'robot',
    sidebarOrder: 2,
    home: { order: 3, descriptionKey: 'quick_robot_desc', Icon: Bot, color: 'var(--color-ink)' },
  },
  {
    id: 'members',
    href: '/dashboard/members',
    label: { key: 'nav_members' },
    Icon: Users,
    availability: 'members',
    sidebarOrder: 3,
    home: {
      order: 1,
      titleKey: 'quick_members',
      descriptionKey: 'quick_members_desc',
      Icon: Users,
      color: 'var(--color-gold)',
    },
  },
  {
    id: 'activity',
    href: '/dashboard/activity',
    label: { key: 'nav_activity' },
    Icon: Activity,
    availability: 'activityLog',
    roles: ['owner', 'admin'],
    sidebarOrder: 4,
  },
  {
    id: 'billing',
    href: '/dashboard/billing',
    label: { key: 'nav_billing' },
    Icon: CreditCard,
    availability: 'billing',
    sidebarOrder: 5,
    home: {
      order: 2,
      titleKey: 'quick_billing',
      descriptionKey: 'quick_billing_desc',
      Icon: CreditCard,
      color: 'var(--color-poppy)',
    },
  },
  {
    id: 'settings',
    href: '/dashboard/org/settings',
    label: { key: 'nav_settings' },
    Icon: Settings,
    sidebarOrder: 6,
  },
  { id: 'account', href: '/dashboard/account', label: { key: 'nav_account' }, Icon: Settings },
];

/** Resolves installation availability and presentation role without granting data access. */
export function resolveProductModules(config: Pick<AppConfig, 'features'>, role?: MembershipRole) {
  return productModules.filter(({ availability, roles }) => {
    const enabled =
      availability === undefined ||
      (availability === 'robot' ? config.features.verticals.robot : config.features[availability]);
    return enabled && (!roles || (role !== undefined && roles.includes(role)));
  });
}

/** Matches exact paths or real children, never similarly prefixed sibling routes. */
export function matchesProductRoute(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
}

/** Selects the most specific enabled route so nested module entries keep their own title. */
export function resolveProductModuleTitle(pathname: string, modules: readonly ProductModule[]) {
  return modules
    .filter(({ href }) => matchesProductRoute(pathname, href))
    .sort((left, right) => right.href.length - left.href.length)[0];
}
