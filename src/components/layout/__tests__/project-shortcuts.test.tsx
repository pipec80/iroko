import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, expect, it, vi } from 'vitest';
import { appConfig } from '@/config/app.config';
import es from '../../../../messages/es.json';

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@/config/app.config', () => ({
  appConfig: { brand: 'Iroko', features: { projects: false, verticals: { robot: false } } },
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('@/app/[locale]/dashboard/account/actions', () => ({
  updateLocalePreferenceAction: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('@/components/providers/document-draft-provider', () => ({
  useDocumentDraftTransition: () => ({}),
}));
vi.mock('@/components/providers/query-provider', () => ({ useIdentityScope: () => null }));
vi.mock('@/components/notifications/notification-bell', () => ({ NotificationBell: () => null }));
vi.mock('../app-sidebar-client', () => ({ AppSidebarClient: () => null }));
vi.mock('../create-team-dialog', () => ({ CreateTeamDialog: () => null }));

import { AppTopbarClient } from '../app-topbar-client';
import { ShortcutsDialog } from '../shortcuts-dialog';

beforeEach(() => {
  vi.clearAllMocks();
  appConfig.features.projects = false;
});

it.each([false, true])('only navigates the project shortcut when enabled=%s', (enabled) => {
  appConfig.features.projects = enabled;
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <AppTopbarClient
        user={{ id: 'user', displayName: 'Test', email: '', avatarUrl: null }}
        locale="es"
        orgs={[]}
        activeAccountId={null}
      />
    </NextIntlClientProvider>,
  );
  fireEvent.keyDown(document, { key: 'p', ctrlKey: true, shiftKey: true });
  if (enabled)
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: '/dashboard/projects',
      query: { new: '1' },
    });
  else expect(mocks.push).not.toHaveBeenCalled();
});

it.each([false, true])('only advertises the project shortcut when enabled=%s', (enabled) => {
  appConfig.features.projects = enabled;
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ShortcutsDialog open onOpenChange={vi.fn()} />
    </NextIntlClientProvider>,
  );
  if (enabled) expect(screen.getByText(es.Shortcuts.shortcut_create_project)).toBeDefined();
  else expect(screen.queryByText(es.Shortcuts.shortcut_create_project)).toBeNull();
});
