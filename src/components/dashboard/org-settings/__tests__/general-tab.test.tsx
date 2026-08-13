import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ getOrgLogo: vi.fn(), getOrgInfo: vi.fn() }));

vi.mock('@/app/[locale]/dashboard/org/settings/actions-logo', () => ({
  getOrgLogo: mocks.getOrgLogo,
  updateOrgLogo: vi.fn(),
  removeOrgLogo: vi.fn(),
}));

vi.mock('@/app/[locale]/dashboard/org/settings/actions-info', () => ({
  getOrgInfo: mocks.getOrgInfo,
  updateOrgInfo: vi.fn(),
}));

import { GeneralTab } from '../general-tab';
import es from '../../../../../messages/es.json';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('GeneralTab logo section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrgInfo.mockResolvedValue({ data: null });
  });

  it('should render the logo heading and upload button', async () => {
    mocks.getOrgLogo.mockResolvedValue({ data: { logoUrl: null } });
    renderWithIntl(<GeneralTab />);
    await waitFor(() => expect(screen.getByText('Logo de la organización')).toBeDefined());
    expect(screen.getByText('Subir logo')).toBeDefined();
  });
});

describe('GeneralTab info section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrgLogo.mockResolvedValue({ data: { logoUrl: null } });
  });

  it('should render the info form pre-filled once loaded', async () => {
    mocks.getOrgInfo.mockResolvedValue({
      data: { name: 'Acme', slug: 'acme', website: 'https://acme.com', country: 'Chile' },
    });
    renderWithIntl(<GeneralTab />);
    const nameInput = await screen.findByLabelText('Nombre');
    expect((nameInput as HTMLInputElement).value).toBe('Acme');
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('acme');
  });
});
