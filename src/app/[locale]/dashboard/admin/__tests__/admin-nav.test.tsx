import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/i18n/routing', () => ({
  Link: (p: React.ComponentProps<'a'>) => <a {...p}>{p.children}</a>,
  usePathname: () => '/dashboard/admin/audit',
}));

import { AdminNav } from '../admin-nav';
import es from '../../../../../../messages/es.json';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('AdminNav active tab', () => {
  it('should mark the tab matching the current route with aria-current="page"', () => {
    renderWithIntl(<AdminNav />);
    expect(screen.getByRole('link', { name: 'Auditoría' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('should not set aria-current on tabs that do not match the current route', () => {
    renderWithIntl(<AdminNav />);
    expect(screen.getByRole('link', { name: 'Cuentas' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Alertas' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Anuncios' }).getAttribute('aria-current')).toBeNull();
  });
});
