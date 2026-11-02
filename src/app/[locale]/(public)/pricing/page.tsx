import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check } from 'lucide-react';

import { PlanViewedTracker } from '@/components/analytics/plan-viewed-tracker';
import { getPublicCatalog } from '@/lib/billing/public-catalog';
import { catalogFields, formatPlanAmount, getPlanItems } from '@/lib/billing/presentation';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('PublicPricing');

  const tCatalog = await getTranslations('PublicCatalog');
  const catalog = await getPublicCatalog();
  const pricingTiers = catalog.plans.map((plan) => ({
    ...plan,
    price: formatPlanAmount(plan.amount, plan.currency, locale),
    period: tCatalog(plan.interval),
    desc: plan.description,
    cta: tCatalog(plan.slug === 'free' ? 'free_cta' : 'paid_cta'),
    href: '/signup',
    featured: plan.slug === 'pro',
    items: [
      ...getPlanItems(plan, tCatalog, locale),
      ...(plan.trialDays > 0 ? [tCatalog('trial', { days: plan.trialDays })] : []),
    ],
  }));

  return (
    <>
      <PlanViewedTracker source="pricing_page" />
      <section className="mx-auto w-full max-w-7xl px-8 pt-16 pb-24 lg:pt-24">
        {/* Header */}
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <span className="eyebrow text-muted-foreground mb-4 block">{t('header_eyebrow')}</span>
          <h1 className="text-foreground mb-4 text-5xl font-extrabold tracking-tighter md:text-6xl">
            {t('header_title_1')}{' '}
            <span style={{ color: 'var(--color-poppy)' }}>{t('header_title_2')}</span>
          </h1>
          <p className="text-muted-foreground text-xl">{t('header_lead')}</p>
        </div>

        {/* Pricing cards */}
        <div className="mx-auto mb-24 grid max-w-5xl grid-cols-1 items-center gap-6 md:grid-cols-3">
          {catalog.status === 'unavailable' && (
            <p
              role="status"
              data-testid="catalog-unavailable"
              className="text-muted-foreground col-span-full text-center">
              {tCatalog('unavailable')}
            </p>
          )}
          {pricingTiers.map((tier) => (
            <div
              key={`${tier.slug}-${tier.interval}`}
              data-testid="catalog-plan"
              data-plan-slug={tier.slug}
              data-plan-interval={tier.interval}
              className="relative flex flex-col rounded-2xl p-8 transition-all duration-300"
              style={
                tier.featured ?
                  {
                    background: 'var(--color-ink)',
                    transform: 'translateY(-12px)',
                    boxShadow: '0 24px 64px rgba(14,17,23,0.25)',
                  }
                : {
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }
              }>
              <h2
                className="mb-1 text-xl font-bold"
                style={{ color: tier.featured ? 'var(--color-bone)' : undefined }}>
                {tier.name}
              </h2>
              <p
                className="mb-6 text-sm"
                style={{
                  color: tier.featured ? 'rgba(245,236,218,0.6)' : 'var(--muted-foreground)',
                }}>
                {tier.desc}
              </p>

              <div className="mb-6 flex items-baseline gap-1">
                <span
                  className="font-mono text-4xl font-semibold"
                  style={{ color: tier.featured ? 'var(--color-bone)' : undefined }}>
                  {tier.price}
                </span>
                {tier.period && (
                  <span
                    className="text-sm"
                    style={{
                      color: tier.featured ? 'rgba(245,236,218,0.5)' : 'var(--muted-foreground)',
                    }}>
                    {tier.period}
                  </span>
                )}
              </div>

              <Button
                asChild
                className="mb-8 h-11 w-full"
                variant={tier.featured ? 'default' : 'outline'}
                style={
                  tier.featured ?
                    { background: 'var(--color-bone)', color: 'var(--color-ink)' }
                  : undefined
                }>
                <Link href={tier.href}>{tier.cta}</Link>
              </Button>

              <ul className="grow space-y-3">
                {tier.items.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <Check
                      className="size-4 shrink-0"
                      style={{
                        color: tier.featured ? 'var(--color-gold)' : 'var(--color-poppy)',
                      }}
                      strokeWidth={2.5}
                    />
                    <span
                      style={{
                        color: tier.featured ? 'rgba(245,236,218,0.8)' : undefined,
                      }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Only capabilities present in the current catalog are compared. */}
        {catalog.status === 'available' && (
          <div className="border-border overflow-x-auto rounded-2xl border">
            <table className="w-full">
              <caption className="text-foreground p-4 text-left font-semibold">
                {t('comparison_title')}
              </caption>
              <thead>
                <tr className="bg-surface-2 border-border border-b">
                  <th scope="col" className="p-4 text-left">
                    {t('comparison_feature_col')}
                  </th>
                  {catalog.plans.map((plan) => (
                    <th scope="col" key={`${plan.slug}-${plan.interval}`} className="p-4">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalogFields
                  .filter(({ key, kind }) =>
                    catalog.plans.some((plan) => plan[kind][key] !== undefined),
                  )
                  .map(({ key, kind }) => (
                    <tr key={key} className="border-border border-b last:border-0">
                      <th scope="row" className="p-4 text-left font-normal">
                        {tCatalog(key)}
                      </th>
                      {catalog.plans.map((plan) => {
                        const value = plan[kind][key];
                        return (
                          <td key={`${plan.slug}-${plan.interval}`} className="p-4 text-center">
                            {value === undefined ?
                              tCatalog('unspecified')
                            : typeof value === 'boolean' ?
                              tCatalog(value ? 'included' : 'excluded')
                            : new Intl.NumberFormat(locale).format(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CTA */}
        <div
          className="relative mt-24 overflow-hidden rounded-3xl px-12 py-20 text-center"
          style={{ background: 'var(--color-ink)' }}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(245,236,218,0.04) 1px, transparent 1px),' +
                'linear-gradient(to bottom, rgba(245,236,218,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10 mx-auto max-w-xl">
            <h2
              className="mb-4 text-3xl font-bold tracking-tight"
              style={{ color: 'var(--color-bone)' }}>
              {t('cta_title')}
            </h2>
            <p className="mb-8 text-lg" style={{ color: 'rgba(245,236,218,0.6)' }}>
              {t('cta_lead')}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                className="h-12 px-8 text-base"
                style={{ background: 'var(--color-bone)', color: 'var(--color-ink)' }}>
                <Link href="/signup">{t('cta_btn_started')}</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-12 px-8 text-base"
                style={{ color: 'rgba(245,236,218,0.6)' }}>
                <Link href="/contact">{t('cta_btn_team')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
