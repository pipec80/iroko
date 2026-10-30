import { act, render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  switchAccount: vi.fn(),
  confirmTransition: vi.fn(),
  cancelTransition: vi.fn(),
}));
vi.mock('@/components/providers/document-draft-provider', () => ({
  useDocumentDraftTransition: () => ({
    confirmTransition: mocks.confirmTransition,
    cancelTransition: mocks.cancelTransition,
  }),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirmTransition.mockResolvedValue(true);
    mocks.switchAccount.mockResolvedValue({ error: 'switch_failed' });
  });

  it('does not switch accounts when the draft transition is cancelled', async () => {
    mocks.confirmTransition.mockResolvedValue(false);
    renderWithIntl(<OrgSwitchButton org={ORG} index={0} isSelected={false} />);
    fireEvent.click(screen.getByRole('option', { name: /acme/i }));
    await vi.waitFor(() => expect(mocks.confirmTransition).toHaveBeenCalledOnce());
    expect(mocks.switchAccount).not.toHaveBeenCalled();
  });

  it('does not lock drafts or switch when the selected account is already active', async () => {
    renderWithIntl(<OrgSwitchButton org={ORG} index={0} isSelected />);
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: /acme/i }));
    });
    expect(mocks.confirmTransition).not.toHaveBeenCalled();
    expect(mocks.switchAccount).not.toHaveBeenCalled();
  });

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
