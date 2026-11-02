import { test, expect } from '@playwright/test';

import { formatPlanAmount } from '@/lib/billing/presentation';
import { localE2eBudget, requireLoopbackUrl } from '../local-e2e-target';
import { querySqlAsPostgres } from './helpers';

interface CatalogFixtureRow {
  slug: string;
  name: string;
  interval: string;
  amount: number;
  currency: string;
  seats: number | null;
}

// Read-only public-surface regression. This does not accept checkout or account entitlements.
test('public catalog matches the configured official local catalog in all locales', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(localE2eBudget(30_000));
  page.setDefaultNavigationTimeout(localE2eBudget(30_000, 'navigation'));
  requireLoopbackUrl(baseURL);
  await page.context().route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ?
        route.continue()
      : route.abort();
  });
  const useMercadoPago = process.env.BILLING_DEFAULT_PROVIDER === 'mercadopago';
  const catalogQuery =
    useMercadoPago ?
      `
    SELECT coalesce(json_agg(row_to_json(catalog)), '[]'::json) FROM (
      SELECT p.slug, p.name, p.interval, pp.amount, pp.currency, (p.limits->>'seats_max')::integer AS seats
      FROM billing.plans p JOIN billing.provider_prices pp ON pp.plan_id=p.id
      WHERE p.is_active AND pp.is_active AND p.interval='month'
        AND pp.provider='mercadopago' AND pp.currency='CLP' ORDER BY p.sort_order
    ) catalog
  `
    : `
    SELECT coalesce(json_agg(row_to_json(catalog)), '[]'::json) FROM (
      SELECT slug, name, interval, price AS amount, currency, (limits->>'seats_max')::integer AS seats
      FROM billing.plans WHERE is_active ORDER BY sort_order
    ) catalog
  `;
  const plans = JSON.parse(querySqlAsPostgres(catalogQuery)) as CatalogFixtureRow[];
  expect(plans.length).toBeGreaterThan(0);
  for (const locale of ['es', 'en', 'pt', 'fr']) {
    for (const route of ['', '/pricing']) {
      await page.goto(`/${locale}${route}`);
      const cards = page.getByTestId('catalog-plan');
      await expect(cards).toHaveCount(plans.length);
      for (const plan of plans) {
        const card = page.locator(
          `[data-testid="catalog-plan"][data-plan-slug="${plan.slug}"][data-plan-interval="${plan.interval}"]`,
        );
        await expect(card).toHaveCount(1);
        await expect(card.getByRole('heading', { name: plan.name, exact: true })).toBeVisible();
        await expect(card).toContainText(formatPlanAmount(plan.amount, plan.currency, locale));
        if (plan.seats !== null)
          await expect(card).toContainText(new Intl.NumberFormat(locale).format(plan.seats));
        await expect(card.getByRole('link')).toHaveAttribute('href', `/${locale}/signup`);
      }
    }
  }
});
