import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  Building2,
  Check,
  CreditCard,
  Database,
  Globe,
  Moon,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

export default async function ProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('PublicProduct');

  const features = [
    { Icon: ShieldCheck, title: t('feature_auth_title'), desc: t('feature_auth_desc') },
    { Icon: Building2, title: t('feature_multitenant_title'), desc: t('feature_multitenant_desc') },
    { Icon: CreditCard, title: t('feature_stripe_title'), desc: t('feature_stripe_desc') },
    { Icon: Globe, title: t('feature_i18n_title'), desc: t('feature_i18n_desc') },
    { Icon: Moon, title: t('feature_dark_title'), desc: t('feature_dark_desc') },
    { Icon: Database, title: t('feature_schema_title'), desc: t('feature_schema_desc') },
  ];

  const techStack = [
    { label: 'Next.js 16', sub: t('tech_nextjs_sub') },
    { label: 'React 19', sub: t('tech_react_sub') },
    { label: 'TypeScript', sub: t('tech_ts_sub') },
    { label: 'Tailwind 4', sub: t('tech_tailwind_sub') },
    { label: 'Supabase', sub: t('tech_supabase_sub') },
    { label: 'Vitest + Playwright', sub: t('tech_testing_sub') },
  ];

  const proofItems = [t('cta_proof_no_card'), t('cta_proof_deploy'), t('cta_proof_code')];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-8 pt-16 pb-24 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-muted-foreground mb-6 block">{t('hero_eyebrow')}</span>
          <h1 className="text-foreground mb-6 text-5xl leading-[1.1] font-extrabold tracking-tighter md:text-6xl">
            {t('hero_title_1')}{' '}
            <span style={{ color: 'var(--color-poppy)' }}>{t('hero_title_emphasis')}</span>{' '}
            {t('hero_title_2')}
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-xl text-xl leading-relaxed">
            {t('hero_lead')}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              className="h-12 px-8 text-base"
              style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
              <Link href="/signup">{t('hero_btn_started')}</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-8 text-base">
              <Link href="/pricing">{t('hero_btn_pricing')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-surface-2 border-border border-y py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="mb-16 text-center">
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
                  className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(217,33,33,0.08)' }}>
                  <Icon
                    className="size-5"
                    style={{ color: 'var(--color-poppy)' }}
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-foreground mb-3 text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack + Code Block */}
      <section className="mx-auto max-w-7xl px-8 py-24">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <span className="eyebrow text-muted-foreground mb-3 block">{t('tech_eyebrow')}</span>
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
                {t('tech_title')}
              </h2>
              <p className="text-muted-foreground text-lg">{t('tech_lead')}</p>
            </div>

            <ul className="space-y-4">
              {techStack.map(({ label, sub }) => (
                <li key={label} className="flex items-center gap-4">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(217,33,33,0.08)' }}>
                    <Zap
                      className="size-4"
                      style={{ color: 'var(--color-poppy)' }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <span className="text-foreground text-sm font-semibold">{label}</span>
                    <span className="text-muted-foreground ml-2 text-sm">{sub}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Code block */}
          <div
            className="relative overflow-hidden rounded-xl shadow-2xl"
            style={{ background: '#0e1117' }}>
            <div
              className="flex items-center gap-2 border-b px-6 py-4"
              style={{ borderColor: 'rgba(245,236,218,0.08)' }}>
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground ml-3 font-mono text-xs">
                src/app/[locale]/dashboard/page.tsx
              </span>
            </div>
            <div className="space-y-2 p-6 font-mono text-sm" style={{ color: '#e5e7eb' }}>
              <p>
                <span style={{ color: '#60a5fa' }}>import</span>
                {' { '}
                <span style={{ color: '#fbbf24' }}>getServerSession</span>
                {' } '}
                <span style={{ color: '#60a5fa' }}>from</span>{' '}
                <span style={{ color: '#34d399' }}>&apos;@/lib/supabase/server&apos;</span>;
              </p>
              <p>
                <span style={{ color: '#60a5fa' }}>import</span>
                {' { '}
                <span style={{ color: '#fbbf24' }}>redirect</span>
                {' } '}
                <span style={{ color: '#60a5fa' }}>from</span>{' '}
                <span style={{ color: '#34d399' }}>&apos;@/i18n/routing&apos;</span>;
              </p>
              <br />
              <p>
                <span style={{ color: '#60a5fa' }}>export default async function</span>{' '}
                <span style={{ color: '#fbbf24' }}>DashboardPage</span>() {'{'}
              </p>
              <p className="pl-4">
                <span style={{ color: '#a78bfa' }}>const</span> session ={' '}
                <span style={{ color: '#60a5fa' }}>await</span> getServerSession();
              </p>
              <p className="pl-4">
                <span style={{ color: '#60a5fa' }}>if</span> (!session){' '}
                <span style={{ color: '#60a5fa' }}>redirect</span>(
                <span style={{ color: '#34d399' }}>&apos;/login&apos;</span>);
              </p>
              <br />
              <p className="pl-4">
                <span style={{ color: '#60a5fa' }}>return</span>{' '}
                <span style={{ color: '#f472b6' }}>&lt;Dashboard</span>{' '}
                <span style={{ color: '#fbbf24' }}>user</span>={'{'}session.user{'}'}{' '}
                <span style={{ color: '#f472b6' }}>/&gt;</span>;
              </p>
              <p>{'}'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface-2 border-border border-t py-24">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
            {t('cta_title')}
          </h2>
          <p className="text-muted-foreground mb-10 text-lg">{t('cta_lead')}</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              className="h-12 px-8 text-base"
              style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
              <Link href="/signup">{t('cta_btn_started')}</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-8 text-base">
              <Link href="/pricing">{t('cta_btn_pricing')}</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6">
            {proofItems.map((item) => (
              <span key={item} className="flex items-center gap-2 text-sm">
                <Check
                  className="size-4"
                  style={{ color: 'var(--color-poppy)' }}
                  strokeWidth={2.5}
                />
                <span className="text-muted-foreground">{item}</span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
