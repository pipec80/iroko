import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirmOrgName: vi.fn(),
  completeOnboarding: vi.fn(),
}));

vi.mock('@/app/[locale]/dashboard/onboarding/actions', () => ({
  confirmOrgName: mocks.confirmOrgName,
  completeOnboarding: mocks.completeOnboarding,
}));

vi.mock('@/config/app.config', () => ({
  appConfig: { features: { billing: true } },
}));

vi.mock('@/app/[locale]/dashboard/team/actions', () => ({
  inviteMembers: vi.fn(),
}));

vi.mock('@/app/[locale]/dashboard/billing/actions', () => ({
  getBillingData: vi.fn(),
  listInvoices: vi.fn(),
  startCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
}));

vi.mock('@/app/[locale]/dashboard/org/settings/actions-logo', () => ({
  getOrgLogo: vi.fn(),
  updateOrgLogo: vi.fn(),
  removeOrgLogo: vi.fn(),
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

const messages = {
  Onboarding: {
    step_org: 'Confirmar organización',
    step_org_description: 'Descripción org',
    step_invite: 'Invitar equipo',
    step_invite_description: 'Descripción invite',
    step_plan: 'Elegir plan',
    step_plan_description: 'Descripción plan',
    step_branding: 'Marca',
    step_branding_description: 'Descripción branding',
    step_counter: 'Paso {current} de {total}',
    org_name_label: 'Nombre de la organización',
    next: 'Siguiente',
    back: 'Atrás',
    skip_setup: 'Omitir configuración',
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

import { OnboardingWizard } from '../onboarding-wizard';

describe('OnboardingWizard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts on the Org step', () => {
    renderWithIntl(<OnboardingWizard initialOrgName="Mi Empresa" />);
    expect(screen.getByLabelText('Nombre de la organización')).toBeDefined();
  });

  it('shows the step counter for the current step', () => {
    renderWithIntl(<OnboardingWizard initialOrgName="Mi Empresa" />);
    expect(screen.getByText('Paso 1 de 4')).toBeDefined();
  });

  it('does not show a Back button on the first step', () => {
    renderWithIntl(<OnboardingWizard initialOrgName="Mi Empresa" />);
    expect(screen.queryByRole('button', { name: 'Atrás' })).toBeNull();
  });

  it('"Omitir configuración" calls completeOnboarding directly', async () => {
    renderWithIntl(<OnboardingWizard initialOrgName="Mi Empresa" />);

    fireEvent.click(screen.getByRole('button', { name: 'Omitir configuración' }));

    await waitFor(() => expect(mocks.completeOnboarding).toHaveBeenCalledTimes(1));
  });

  it('advancing to step 2 shows Back, which returns to step 1', async () => {
    mocks.confirmOrgName.mockResolvedValue({ success: true });
    renderWithIntl(<OnboardingWizard initialOrgName="Mi Empresa" />);

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(screen.getByText('Paso 2 de 4')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(screen.getByText('Paso 1 de 4')).toBeDefined();
  });
});
