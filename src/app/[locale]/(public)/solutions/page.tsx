import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check, Code2, Layers, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('PublicSolutions');
  const tMarketing = await getTranslations('Marketing');

  const useCases = [
    {
      Icon: Code2,
      title: t('case_solo_title'),
      desc: t('case_solo_desc', { brand: appConfig.name }),
      items: [t('case_solo_item_1'), t('case_solo_item_2')],
      featured: false,
    },
    {
      Icon: Layers,
      title: t('case_agency_title'),
      desc: t('case_agency_desc'),
      items: [t('case_agency_item_1'), t('case_agency_item_2'), t('case_agency_item_3')],
      featured: true,
    },
    {
      Icon: Users,
      title: t('case_teams_title'),
      desc: t('case_teams_desc'),
      items: [t('case_teams_item_1'), t('case_teams_item_2'), t('case_teams_item_3')],
      featured: false,
    },
  ];

  const stats = [
    { val: t('stat_deploy_val'), label: t('stat_deploy_label') },
    { val: t('stat_modules_val'), label: t('stat_modules_label') },
    { val: t('stat_code_val'), label: t('stat_code_label') },
    { val: t('stat_projects_val'), label: t('stat_projects_label') },
  ];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-8 pt-16 pb-24 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-muted-foreground mb-6 block">{t('hero_eyebrow')}</span>
          <h1 className="text-foreground mb-6 text-5xl leading-[1.1] font-extrabold tracking-tighter md:text-6xl">
            {t('hero_title_1')}{' '}
            <span style={{ color: 'var(--color-poppy)' }}>{t('hero_title_2')}</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-xl leading-relaxed">
            {t('hero_lead', { brand: appConfig.name })}
          </p>
          <Button
            asChild
            className="h-12 px-8 text-base"
            style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
            <Link href="/signup">{t('hero_btn_started')}</Link>
          </Button>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-surface-2 border-border border-y py-12">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map(({ val, label }) => (
              <div key={label} className="text-center">
                <div
                  className="mb-1 font-mono text-3xl font-semibold"
                  style={{ color: 'var(--color-ink)' }}>
                  {val}
                </div>
                <div className="text-muted-foreground eyebrow text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="mx-auto max-w-7xl px-8 py-24">
        <div className="mb-16 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
            {t('section_title')}
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl">{t('section_lead')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {useCases.map(({ Icon, title, desc, items, featured }) => (
            <div
              key={title}
              className="relative flex flex-col rounded-2xl p-8 transition-all duration-300"
              style={
                featured ?
                  {
                    background: 'var(--color-ink)',
                    boxShadow: '0 16px 48px rgba(14,17,23,0.2)',
                  }
                : {
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }
              }>
              {featured && (
                <div
                  className="absolute top-0 left-0 h-1 w-full rounded-t-2xl"
                  style={{ background: 'var(--color-poppy)' }}
                />
              )}

              <div
                className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  background: featured ? 'rgba(245,236,218,0.08)' : 'rgba(217,33,33,0.08)',
                }}>
                <Icon
                  className="size-5"
                  style={{ color: featured ? 'var(--color-bone)' : 'var(--color-poppy)' }}
                  strokeWidth={1.5}
                />
              </div>

              <h3
                className="mb-3 text-xl font-bold"
                style={{ color: featured ? 'var(--color-bone)' : undefined }}>
                {title}
              </h3>
              <p
                className="mb-8 grow text-sm leading-relaxed"
                style={{
                  color: featured ? 'rgba(245,236,218,0.6)' : 'var(--muted-foreground)',
                }}>
                {desc}
              </p>

              <ul
                className="space-y-3 border-t pt-6"
                style={{ borderColor: featured ? 'rgba(245,236,218,0.1)' : 'var(--border)' }}>
                {items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <Check
                      className="size-4 shrink-0"
                      style={{
                        color: featured ? 'var(--color-gold)' : 'var(--color-poppy)',
                      }}
                      strokeWidth={2.5}
                    />
                    <span
                      style={{
                        color: featured ? 'rgba(245,236,218,0.8)' : undefined,
                      }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="bg-surface-2 border-border border-y py-20">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <span className="eyebrow text-muted-foreground mb-6 block">{t('quote_eyebrow')}</span>
          <blockquote
            className="mb-8 font-sans text-xl leading-[1.5] font-bold italic md:text-2xl"
            style={{ color: 'var(--color-ink)' }}>
            &ldquo;{tMarketing('Quote.proverb')}&rdquo;
          </blockquote>
          <hr
            className="mx-auto mb-6"
            style={{ width: 64, borderTopWidth: 1, borderColor: 'rgba(217,164,65,0.4)' }}
          />
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            {t('quote_attribution')}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-8 py-24 text-center">
        <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">{t('cta_title')}</h2>
        <p className="text-muted-foreground mb-10 text-lg">{t('cta_lead')}</p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            className="h-12 px-8 text-base"
            style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
            <Link href="/signup">{t('cta_btn_started')}</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 px-8 text-base">
            <Link href="/contact">{t('cta_btn_contact')}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
