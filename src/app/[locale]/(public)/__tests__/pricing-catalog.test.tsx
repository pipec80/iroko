import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

import en from '../../../../../messages/en.json';
import es from '../../../../../messages/es.json';
import pt from '../../../../../messages/pt.json';
import fr from '../../../../../messages/fr.json';
import type { PublicCatalogResult } from '@/lib/billing/public-catalog';
import { formatPlanAmount } from '@/lib/billing/presentation';

const mocks = vi.hoisted(() => ({ locale: 'es' as 'es' | 'en' | 'pt' | 'fr', catalog: vi.fn() }));
const dictionaries = { en, es, pt, fr };
vi.mock('next-intl/server', () => ({
  setRequestLocale: (locale: keyof typeof dictionaries) => {
    mocks.locale = locale;
  },
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale: mocks.locale,
      messages: {
        PublicHome: dictionaries[mocks.locale].PublicHome,
        PublicPricing: dictionaries[mocks.locale].PublicPricing,
        Marketing: dictionaries[mocks.locale].Marketing,
        PublicCatalog: dictionaries[mocks.locale].PublicCatalog,
      } as AbstractIntlMessages,
      namespace,
    }),
}));
vi.mock('@/lib/billing/public-catalog', () => ({ getPublicCatalog: mocks.catalog }));
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
vi.mock('@/components/analytics/plan-viewed-tracker', () => ({ PlanViewedTracker: () => null }));

import HomePage from '../page';
import PricingPage from '../pricing/page';

afterEach(cleanup);

describe.each([
  ['landing', HomePage],
  ['pricing', PricingPage],
] as const)('%s current catalog', (_, Page) => {
  it.each(['es', 'en', 'pt', 'fr'] as const)(
    'shows catalog prices, names and limits in %s',
    async (locale) => {
      const catalog: PublicCatalogResult = {
        status: 'available',
        provider: 'mercadopago',
        checkoutAvailable: true,
        plans: ['free', 'pro', 'scale'].map((slug, i) => ({
          slug,
          name:
            slug === 'free' ? 'Free'
            : slug === 'pro' ? 'Plus'
            : 'Pro',
          description: null,
          amount: i === 0 ? 0 : 45678 + i,
          currency: 'CLP',
          interval: 'month',
          trialDays: 0,
          features: { webhooks_enabled: true },
          limits: { seats_max: 37 },
        })),
      };
      mocks.catalog.mockResolvedValue(catalog);
      render(await Page({ params: Promise.resolve({ locale }) }));
      expect(
        screen.getAllByText(
          (_, element) =>
            element?.children.length === 0 &&
            element.textContent === formatPlanAmount(45679, 'CLP', locale),
        ).length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText(/37/).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Plus').length).toBeGreaterThan(0);
      expect(
        screen.queryByRole('link', { name: /sales|ventas|Hablemos|Parlons|conversar/i }),
      ).toBeNull();
      expect(document.querySelector('a[href="#"]')).toBeNull();
      expect(
        document.querySelectorAll('[data-testid="catalog-plan"] a[href="/signup"]').length,
      ).toBe(3);
    },
  );

  it.each(['es', 'en', 'pt', 'fr'] as const)(
    'shows translated unavailability without fallback offers in %s',
    async (locale) => {
      mocks.catalog.mockResolvedValue({
        status: 'unavailable',
        provider: 'mercadopago',
        plans: [],
        checkoutAvailable: false,
      });
      render(await Page({ params: Promise.resolve({ locale }) }));
      expect(screen.getByTestId('catalog-unavailable').textContent).toBe(
        dictionaries[locale].PublicCatalog.unavailable,
      );
      expect(screen.queryByTestId('catalog-plan')).toBeNull();
      expect(screen.queryByText(/\$79|79 €/)).toBeNull();
    },
  );
});
