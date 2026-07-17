import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/i18n/routing', () => ({
  Link: (p: React.ComponentProps<'a'>) => <a {...p}>{p.children}</a>,
  usePathname: () => '/dashboard',
}));

import { AppSidebarClient, type OrgAccount } from '../app-sidebar-client';
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
