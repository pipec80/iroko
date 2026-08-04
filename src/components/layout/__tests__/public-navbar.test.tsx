import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/i18n/routing', () => ({
  Link: (p: React.ComponentProps<'a'>) => <a {...p}>{p.children}</a>,
}));

import { PublicNavbar } from '../public-navbar';
import es from '../../../../messages/es.json';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('PublicNavbar mobile menu trigger', () => {
  it('should render an accessible, labelled button to open the mobile menu', () => {
    renderWithIntl(<PublicNavbar />);
    expect(screen.getByRole('button', { name: 'Abrir menú de navegación' })).toBeDefined();
  });

  it('should render Producto and Precios links pointing at the right routes', () => {
    renderWithIntl(<PublicNavbar />);
    const productLinks = screen.getAllByRole('link', { name: 'Producto' });
    const pricingLinks = screen.getAllByRole('link', { name: 'Precios' });
    expect(productLinks.some((a) => a.getAttribute('href') === '/product')).toBe(true);
    expect(pricingLinks.some((a) => a.getAttribute('href') === '/pricing')).toBe(true);
  });
});
