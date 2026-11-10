import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { appConfig } from '@/config/app.config';
import { AppSidebarClient, type OrgAccount } from '../app-sidebar-client';
import { AppTopbarClient } from '../app-topbar-client';
import en from '../../../../messages/en.json';
import es from '../../../../messages/es.json';
import pt from '../../../../messages/pt.json';
import fr from '../../../../messages/fr.json';

const mocks = vi.hoisted(() => ({ pathname: '/dashboard', push: vi.fn() }));
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }));
vi.mock('@/app/[locale]/dashboard/account/actions', () => ({
  updateLocalePreferenceAction: vi.fn(),
}));
vi.mock('@/app/[locale]/dashboard/actions', () => ({ switchAccount: vi.fn() }));
vi.mock('../create-team-dialog', () => ({ CreateTeamDialog: () => null }));
vi.mock('@/components/notifications/notification-bell', () => ({ NotificationBell: () => null }));
vi.mock('@/components/providers/document-draft-provider', () => ({
  useDocumentDraftTransition: () => ({
    confirmTransition: vi.fn(),
    clear: vi.fn(),
    cancelTransition: vi.fn(),
  }),
}));
vi.mock('@/components/providers/query-provider', () => ({ useIdentityScope: () => null }));

const admin: OrgAccount = {
  account_id: 'admin-account',
  name: 'Admin workspace',
  slug: 'admin-workspace',
  role: 'admin',
  type: 'team',
  logo_url: '',
};
const viewer: OrgAccount = {
  ...admin,
  account_id: 'viewer-account',
  name: 'Viewer workspace',
  role: 'viewer',
};
const user = { id: 'user', displayName: 'Test User', email: 'test@example.com', avatarUrl: null };
const originalFeatures = structuredClone(appConfig.features);

function navigation(activeAccountId = admin.account_id, locale = 'es', messages = es) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppSidebarClient orgs={[admin, viewer]} activeAccountId={activeAccountId} />
      <AppTopbarClient
        user={user}
        locale={locale}
        orgs={[admin, viewer]}
        activeAccountId={activeAccountId}
      />
    </NextIntlClientProvider>
  );
}

describe('product navigation consumers', () => {
  beforeEach(() => {
    mocks.pathname = '/dashboard';
    mocks.push.mockClear();
    Object.assign(appConfig.features, structuredClone(originalFeatures));
  });
  afterEach(() => {
    cleanup();
    Object.assign(appConfig.features, structuredClone(originalFeatures));
  });

  it.each([
    ['/dashboard', 'nav_overview'],
    ['/dashboard/members', 'nav_members'],
    ['/dashboard/activity/event', 'nav_activity'],
    ['/dashboard/billing/invoices', 'nav_billing'],
    ['/dashboard/org/settings/security', 'nav_settings'],
  ] as const)('keeps the sidebar and title aligned for %s', (pathname, key) => {
    mocks.pathname = pathname;
    render(navigation());
    expect(screen.getByRole('link', { name: es.Navigation[key] }).className).toContain(
      'nav-item--active',
    );
    expect(within(screen.getByRole('banner')).getByText(es.Navigation[key])).toBeDefined();
  });

  it.each([
    ['es', es],
    ['en', en],
    ['pt', pt],
    ['fr', fr],
  ] as const)('preserves translated child-route labels in %s', (locale, messages) => {
    mocks.pathname = '/dashboard/members/detail';
    render(navigation(admin.account_id, locale, messages));
    expect(screen.getByRole('link', { name: messages.Navigation.nav_members })).toBeDefined();
    expect(
      within(screen.getByRole('banner')).getByText(messages.Navigation.nav_members),
    ).toBeDefined();
  });

  it.each([
    ['billing', '/dashboard/billing/invoices', 'nav_billing'],
    ['members', '/dashboard/members/detail', 'nav_members'],
    ['activityLog', '/dashboard/activity/event', 'nav_activity'],
  ] as const)('omits disabled %s from both navigation and title', (feature, pathname, key) => {
    appConfig.features[feature] = false;
    mocks.pathname = pathname;
    render(navigation());
    expect(screen.queryByRole('link', { name: es.Navigation[key] })).toBeNull();
    expect(within(screen.getByRole('banner')).getByText(es.Navigation.nav_overview)).toBeDefined();
  });

  it('recomputes activity visibility and title when the active account changes', () => {
    mocks.pathname = '/dashboard/activity/event';
    const { rerender } = render(navigation());
    expect(screen.getByRole('link', { name: es.Navigation.nav_activity })).toBeDefined();
    rerender(navigation(viewer.account_id));
    expect(screen.queryByRole('link', { name: es.Navigation.nav_activity })).toBeNull();
    expect(within(screen.getByRole('banner')).getByText(es.Navigation.nav_overview)).toBeDefined();
    rerender(navigation(admin.account_id));
    expect(within(screen.getByRole('banner')).getByText(es.Navigation.nav_activity)).toBeDefined();
  });

  it('does not mistake a route prefix for a child route', () => {
    mocks.pathname = '/dashboard/memberships';
    render(navigation());
    expect(screen.getByRole('link', { name: es.Navigation.nav_members }).className).toContain(
      'nav-item--inactive',
    );
    expect(within(screen.getByRole('banner')).getByText(es.Navigation.nav_overview)).toBeDefined();
  });

  it('keeps account and platform-admin child titles', () => {
    mocks.pathname = '/dashboard/account/security';
    const { rerender } = render(navigation());
    expect(within(screen.getByRole('banner')).getByText(es.Navigation.nav_account)).toBeDefined();
    mocks.pathname = '/dashboard/admin/audit/event';
    rerender(navigation());
    expect(within(screen.getByRole('banner')).getByText(es.Admin.nav_audit)).toBeDefined();
  });

  it('uses the same viewer navigation in the mobile drawer', () => {
    render(navigation(viewer.account_id));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación' }));
    const drawer = within(screen.getByRole('dialog', { name: 'Menú de navegación' }));
    expect(drawer.getByRole('link', { name: es.Navigation.nav_members })).toBeDefined();
    expect(drawer.queryByRole('link', { name: es.Navigation.nav_activity })).toBeNull();
    expect(drawer.queryByRole('link', { name: es.Navigation.nav_projects })).toBeNull();
  });

  it('blocks the Projects shortcut while disabled and preserves its enabled destination', () => {
    const { rerender } = render(navigation());
    expect(screen.queryByRole('link', { name: es.Navigation.nav_projects })).toBeNull();
    fireEvent.keyDown(document, { key: 'p', ctrlKey: true, shiftKey: true });
    expect(mocks.push).not.toHaveBeenCalled();
    appConfig.features.projects = true;
    mocks.pathname = '/dashboard/projects/example/doc/id';
    rerender(navigation());
    expect(within(screen.getByRole('banner')).getByText(es.Navigation.nav_projects)).toBeDefined();
    expect(screen.getByRole('link', { name: es.Navigation.nav_projects }).className).toContain(
      'nav-item--active',
    );
    fireEvent.keyDown(document, { key: 'p', ctrlKey: true, shiftKey: true });
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: '/dashboard/projects',
      query: { new: '1' },
    });
  });
});
