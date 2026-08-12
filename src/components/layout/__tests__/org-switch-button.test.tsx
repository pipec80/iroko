import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ switchAccount: vi.fn() }));

vi.mock('@/app/[locale]/dashboard/actions', () => ({
  switchAccount: mocks.switchAccount,
}));

import { OrgSwitchButton } from '../org-switch-button';
import type { OrgAccount } from '../app-sidebar-client';
import es from '../../../../messages/es.json';

const ORG: OrgAccount = {
  account_id: 'acc-1',
  name: 'Acme',
  slug: 'acme',
  role: 'owner',
  type: 'team',
  logo_url: '',
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('OrgSwitchButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should show a translated alert when switchAccount returns not_a_member', async () => {
    mocks.switchAccount.mockResolvedValue({ error: 'not_a_member' });
    renderWithIntl(<OrgSwitchButton org={ORG} index={0} isSelected={false} />);

    fireEvent.click(screen.getByRole('option', { name: /acme/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Ya no formas parte de esa organización.');
  });

  it('should fall back to the generic message for an unrecognized error code', async () => {
    mocks.switchAccount.mockResolvedValue({ error: 'some_unmapped_code' });
    renderWithIntl(<OrgSwitchButton org={ORG} index={0} isSelected={false} />);

    fireEvent.click(screen.getByRole('option', { name: /acme/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('No se pudo cambiar de organización. Inténtalo de nuevo.');
  });

  it('should not render an alert when there is no error yet', () => {
    renderWithIntl(<OrgSwitchButton org={ORG} index={0} isSelected={false} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
