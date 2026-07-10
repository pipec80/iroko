import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Building2, Check, CreditCard, Database, Globe, Moon, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('PublicHome');
  const tMarketing = await getTranslations('Marketing');

  const features = [
    { Icon: ShieldCheck, title: t('feature_auth_title'), desc: t('feature_auth_desc') },
    { Icon: Building2, title: t('feature_orgs_title'), desc: t('feature_orgs_desc') },
    { Icon: CreditCard, title: t('feature_billing_title'), desc: t('feature_billing_desc') },
    { Icon: Globe, title: t('feature_i18n_title'), desc: t('feature_i18n_desc') },
    { Icon: Moon, title: t('feature_darkmode_title'), desc: t('feature_darkmode_desc') },
    { Icon: Database, title: t('feature_db_title'), desc: t('feature_db_desc') },
  ];

  const proofBeats = [
    t('proof_auth'),
    t('proof_stripe'),
    t('proof_orgs'),
    t('proof_i18n'),
    t('proof_dark'),
    t('proof_rls'),
  ];

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
      ],
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-8 pt-16 pb-24 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-muted-foreground mb-6 block">{t('hero_eyebrow')}</span>
          <h1 className="text-foreground mb-6 text-5xl leading-[1.1] font-extrabold tracking-tighter md:text-7xl">
            {t('hero_title_1')}{' '}
            <span style={{ color: 'var(--color-poppy)' }}>{t('hero_title_2')}</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-xl/relaxed">
            {t('hero_lead', { brand: appConfig.name })}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              className="h-12 px-8 text-base"
              style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
              <Link href="/signup">{t('hero_btn_started')}</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-8 text-base">
              <Link href="/product">{t('hero_btn_how')}</Link>
            </Button>
          </div>

          {/* Proof beats */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {proofBeats.map((beat) => (
              <span
                key={beat}
                className="border-border text-muted-foreground rounded-full border px-4 py-1.5 font-mono text-xs">
                {beat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-surface-2 border-border border-y py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="mb-16 text-center">
            <span className="eyebrow text-muted-foreground mb-3 block">
              {t('features_eyebrow')}
            </span>
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
              {t('features_title')}
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">{t('features_lead')}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="border-border bg-background rounded-xl border p-8 transition-transform duration-200 hover:-translate-y-1">
                <div
                  className="mb-6 flex size-12 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(217,33,33,0.08)' }}>
                  <Icon
                    className="size-5"
                    style={{ color: 'var(--color-poppy)' }}
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-foreground mb-3 text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm/relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <span className="eyebrow text-muted-foreground mb-8 block">{t('quote_eyebrow')}</span>
          <blockquote
            className="mb-8 font-sans text-2xl leading-[1.4] font-bold italic md:text-3xl"
            style={{ color: 'var(--color-ink)' }}>
            &ldquo;{tMarketing('Quote.proverb')}&rdquo;
          </blockquote>
          <hr
            className="mx-auto mb-6"
            style={{ width: 80, borderTopWidth: 1, borderColor: 'rgba(217,164,65,0.4)' }}
          />
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            {t('quote_attribution')}
          </p>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-surface-2 border-border border-y py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="mb-16 text-center">
            <span className="eyebrow text-muted-foreground mb-3 block">{t('pricing_eyebrow')}</span>
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
              {t('pricing_title')}
            </h2>
            <p className="text-muted-foreground">{t('pricing_lead')}</p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-6 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className="relative flex flex-col rounded-2xl p-8 transition-all duration-300"
                style={
                  tier.featured ?
                    {
                      background: 'var(--color-ink)',
                      transform: 'translateY(-12px)',
                      boxShadow: '0 24px 64px rgba(14,17,23,0.3)',
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

                <h3
                  className="mb-1 text-xl font-bold"
                  style={{ color: tier.featured ? 'var(--color-bone)' : undefined }}>
                  {tier.name}
                </h3>
                <p
                  className="mb-6 text-sm"
                  style={{
                    color: tier.featured ? 'rgba(245,236,218,0.6)' : undefined,
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
                        color: tier.featured ? 'rgba(245,236,218,0.5)' : undefined,
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
        </div>
      </section>

      {/* CTA Block */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div
            className="relative overflow-hidden rounded-3xl px-12 py-20 text-center"
            style={{ background: 'var(--color-ink)' }}>
            {/* Dot grid overlay */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(245,236,218,0.05) 1px, transparent 1px),' +
                  'linear-gradient(to bottom, rgba(245,236,218,0.05) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            {/* Radial glow */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(184,81,58,0.2), transparent 60%)',
              }}
            />

            <div className="relative z-10 mx-auto max-w-2xl">
              <span className="eyebrow mb-6 block" style={{ color: 'var(--color-gold)' }}>
                {t('cta_eyebrow')}
              </span>
              <h2
                className="mb-6 text-4xl font-bold tracking-tight md:text-5xl"
                style={{ color: 'var(--color-bone)' }}>
                {t('cta_title')}
              </h2>
              <p className="mb-10 text-lg" style={{ color: 'rgba(245,236,218,0.6)' }}>
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
                  style={{ color: 'rgba(245,236,218,0.7)' }}>
                  <Link href="/product">{t('cta_btn_docs')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
