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
    step_invite: 'Invitar equipo',
    step_plan: 'Elegir plan',
    step_branding: 'Marca',
    org_name_label: 'Nombre de la organización',
    next: 'Siguiente',
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

  it('"Omitir configuración" calls completeOnboarding directly', async () => {
    renderWithIntl(<OnboardingWizard initialOrgName="Mi Empresa" />);

    fireEvent.click(screen.getByRole('button', { name: 'Omitir configuración' }));

    await waitFor(() => expect(mocks.completeOnboarding).toHaveBeenCalledTimes(1));
  });
});
