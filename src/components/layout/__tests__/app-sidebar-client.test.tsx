import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi } from 'vitest';
import { appConfig } from '@/config/app.config';

vi.mock('@/i18n/routing', () => ({
  Link: (p: React.ComponentProps<'a'>) => <a {...p}>{p.children}</a>,
  usePathname: () => '/dashboard',
}));

vi.mock('@/app/[locale]/dashboard/actions', () => ({
  switchAccount: vi.fn(),
  createTeam: vi.fn(),
}));

import { AppSidebarClient, type OrgAccount } from '../app-sidebar-client';
import { switchAccount } from '@/app/[locale]/dashboard/actions';
import es from '../../../../messages/es.json';

const ORG_WITH_LOGO: OrgAccount = {
  account_id: 'acc-1',
  name: 'Acme',
  slug: 'acme',
  role: 'owner',
  type: 'team',
  logo_url: 'org-assets/acc-1/logo.png',
};

const ORG_WITHOUT_LOGO: OrgAccount = { ...ORG_WITH_LOGO, account_id: 'acc-2', logo_url: '' };

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('AppSidebarClient logo rendering', () => {
  it('omits the deferred modules while retaining the offered navigation', () => {
    renderWithIntl(<AppSidebarClient orgs={[ORG_WITHOUT_LOGO]} />);
    expect(screen.queryByRole('link', { name: es.Navigation.nav_projects })).toBeNull();
    expect(screen.queryByRole('link', { name: `${appConfig.brand} Robot` })).toBeNull();
    expect(screen.getByRole('link', { name: es.Navigation.nav_members })).toBeDefined();
  });
  it.each([null, 'unknown-account'])(
    'allows activating the first account with unresolved active context %s',
    async (activeAccountId) => {
      vi.mocked(switchAccount).mockClear();
      vi.mocked(switchAccount).mockResolvedValue({});
      renderWithIntl(
        <AppSidebarClient orgs={[ORG_WITHOUT_LOGO]} activeAccountId={activeAccountId} />,
      );
      fireEvent.click(screen.getByRole('button', { name: es.Navigation.org_switcher_label }));
      fireEvent.click(screen.getByRole('option', { name: /acme/i }));
      await waitFor(() => expect(switchAccount).toHaveBeenCalledOnce());
      expect(vi.mocked(switchAccount).mock.calls[0]?.[0].get('accountId')).toBe(
        ORG_WITHOUT_LOGO.account_id,
      );
    },
  );

  it('should render the logo image when logo_url is present', () => {
    renderWithIntl(<AppSidebarClient orgs={[ORG_WITH_LOGO]} />);
    expect(screen.getByRole('img', { name: 'Acme' })).toBeDefined();
  });

  it('should fall back to initials when there is no logo_url', () => {
    renderWithIntl(<AppSidebarClient orgs={[ORG_WITHOUT_LOGO]} />);
    expect(screen.queryByRole('img', { name: 'Acme' })).toBeNull();
    expect(screen.getByText('A')).toBeDefined();
  });
});
