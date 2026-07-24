import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ inviteMembers: vi.fn() }));

vi.mock('@/app/[locale]/dashboard/team/actions', () => ({
  inviteMembers: mocks.inviteMembers,
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

import { InviteForm } from '../invite-form';
import es from '../../../../../messages/es.json';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('InviteForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the role dropdown and the emails textarea', () => {
    renderWithIntl(<InviteForm />);
    expect(screen.getByText('Rol')).toBeDefined();
    expect(screen.getByLabelText('Correos electrónicos')).toBeDefined();
  });

  it('calls onSuccess after a successful submit', async () => {
    mocks.inviteMembers.mockResolvedValue({ success: true, count: 1 });
    const onSuccess = vi.fn();
    renderWithIntl(<InviteForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText('Correos electrónicos'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('shows the billing link when the error is seat_limit_reached', async () => {
    mocks.inviteMembers.mockResolvedValue({ error: 'seat_limit_reached' });
    renderWithIntl(<InviteForm />);

    fireEvent.change(screen.getByLabelText('Correos electrónicos'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() =>
      expect(screen.getByRole('link').getAttribute('href')).toBe('/dashboard/billing'),
    );
  });

  it('renders the secondaryButton slot', () => {
    renderWithIntl(<InviteForm secondaryButton={<button type="button">Cancelar</button>} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDefined();
  });
});
