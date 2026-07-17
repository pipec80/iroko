import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ getOrgLogo: vi.fn() }));

vi.mock('@/app/[locale]/dashboard/org/settings/actions-logo', () => ({
  getOrgLogo: mocks.getOrgLogo,
  updateOrgLogo: vi.fn(),
  removeOrgLogo: vi.fn(),
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
  beforeEach(() => vi.clearAllMocks());

  it('should render the logo heading and upload button', async () => {
    mocks.getOrgLogo.mockResolvedValue({ data: { logoUrl: null } });
    renderWithIntl(<GeneralTab />);
    await waitFor(() => expect(screen.getByText('Logo de la organización')).toBeDefined());
    expect(screen.getByText('Subir logo')).toBeDefined();
  });
});
