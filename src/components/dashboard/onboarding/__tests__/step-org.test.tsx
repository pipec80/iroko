import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ confirmOrgName: vi.fn() }));

vi.mock('@/app/[locale]/dashboard/onboarding/actions', () => ({
  confirmOrgName: mocks.confirmOrgName,
}));

const messages = {
  Onboarding: {
    org_name_label: 'Nombre de la organización',
    next: 'Siguiente',
    error_invalid_name: 'El nombre debe tener entre 2 y 100 caracteres.',
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

import { StepOrg } from '../step-org';

describe('StepOrg', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefills the input with initialName', () => {
    renderWithIntl(<StepOrg initialName="Mi Empresa" onNext={vi.fn()} />);
    const input = screen.getByLabelText('Nombre de la organización') as HTMLInputElement;
    expect(input.value).toBe('Mi Empresa');
  });

  it('calls onNext after successfully confirming the name', async () => {
    mocks.confirmOrgName.mockResolvedValue({ success: true });
    const onNext = vi.fn();
    renderWithIntl(<StepOrg initialName="Mi Empresa" onNext={onNext} />);

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(mocks.confirmOrgName).toHaveBeenCalledWith('Mi Empresa');
  });

  it('shows the error and does not call onNext when confirmation fails', async () => {
    mocks.confirmOrgName.mockResolvedValue({ error: 'invalid_name' });
    const onNext = vi.fn();
    renderWithIntl(<StepOrg initialName="a" onNext={onNext} />);

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() =>
      expect(screen.getByText('El nombre debe tener entre 2 y 100 caracteres.')).toBeDefined(),
    );
    expect(onNext).not.toHaveBeenCalled();
  });
});
