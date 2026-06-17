import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('PublicPricing');

  const pricingTiers = [
    {
      name: t('tier_personal_name'),
      price: t('tier_personal_price'),
      period: t('tier_personal_period'),
      desc: t('tier_personal_desc'),
      cta: t('tier_personal_cta'),
      href: '#',
      featured: false,
      items: [
        t('tier_personal_item_1'),
        t('tier_personal_item_2'),
        t('tier_personal_item_3'),
        t('tier_personal_item_4'),
        t('tier_personal_item_5'),
      ],
    },
    {
      name: t('tier_studio_name'),
      price: t('tier_studio_price'),
      period: t('tier_studio_period'),
      desc: t('tier_studio_desc'),
      cta: t('tier_studio_cta'),
      href: '/signup',
      featured: true,
      items: [
        t('tier_studio_item_1'),
        t('tier_studio_item_2'),
        t('tier_studio_item_3'),
        t('tier_studio_item_4'),
        t('tier_studio_item_5'),
        t('tier_studio_item_6'),
      ],
    },
    {
      name: t('tier_custom_name'),
      price: t('tier_custom_price'),
      period: '',
      desc: t('tier_custom_desc'),
      cta: t('tier_custom_cta'),
      href: '/contact',
      featured: false,
      items: [
        t('tier_custom_item_1'),
        t('tier_custom_item_2'),
        t('tier_custom_item_3'),
        t('tier_custom_item_4'),
        t('tier_custom_item_5'),
      ],
    },
  ];

  const comparison = [
    {
      feature: t('comparison_feature_orgs'),
      personal: t('comparison_orgs_personal'),
      studio: t('comparison_orgs_studio'),
      custom: t('comparison_orgs_custom'),
    },
    { feature: t('comparison_feature_auth'), personal: true, studio: true, custom: true },
    { feature: t('comparison_feature_billing'), personal: false, studio: true, custom: true },
    { feature: t('comparison_feature_i18n'), personal: true, studio: true, custom: true },
    { feature: t('comparison_feature_dark'), personal: true, studio: true, custom: true },
    { feature: t('comparison_feature_updates'), personal: false, studio: true, custom: true },
    { feature: t('comparison_feature_discord'), personal: false, studio: true, custom: true },
    { feature: t('comparison_feature_onboarding'), personal: false, studio: false, custom: true },
    { feature: t('comparison_feature_sla'), personal: false, studio: false, custom: true },
  ];

  return (
    <>
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
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
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
              {tier.featured && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 font-mono text-xs font-bold tracking-wider uppercase"
                  style={{ background: 'var(--color-gold)', color: 'var(--color-ink)' }}>
                  {t('tier_popular_badge')}
                </div>
              )}

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

        {/* Comparison Table */}
        <div className="border-border overflow-hidden rounded-2xl border">
          <div
            className="border-border border-b px-6 py-4"
            style={{ background: 'var(--color-ink)' }}>
            <h3 className="font-mono text-sm font-semibold" style={{ color: 'var(--color-bone)' }}>
              {t('comparison_title')}
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2 border-border border-b">
                <th className="text-muted-foreground px-6 py-4 text-left text-sm font-semibold">
                  {t('comparison_feature_col')}
                </th>
                {[t('tier_personal_name'), t('tier_studio_name'), t('tier_custom_name')].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-4 py-4 text-center text-sm font-semibold"
                      style={{
                        color: col === t('tier_studio_name') ? 'var(--color-poppy)' : undefined,
                      }}>
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr
                  key={row.feature}
                  className="border-border border-b last:border-0"
                  style={{ background: i % 2 === 0 ? undefined : 'var(--surface-2)' }}>
                  <td className="text-foreground px-6 py-4 text-sm">{row.feature}</td>
                  {([row.personal, row.studio, row.custom] as (boolean | string)[]).map(
                    (val, j) => (
                      <td key={j} className="px-4 py-4 text-center">
                        {typeof val === 'boolean' ?
                          val ?
                            <Check
                              className="mx-auto size-4"
                              style={{ color: 'var(--color-poppy)' }}
                              strokeWidth={2.5}
                            />
                          : <span className="text-muted-foreground font-mono text-xs">—</span>
                        : <span className="text-foreground text-sm">{val}</span>}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
