import { setRequestLocale } from 'next-intl/server';
import { Building2, Check, CreditCard, Database, Globe, Moon, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';

const FEATURES = [
  {
    Icon: ShieldCheck,
    title: 'Auth lista para producción',
    desc: 'Email/contraseña, OAuth, magic link, MFA TOTP y códigos de recuperación. Todo wired a Supabase Auth desde el primer commit.',
  },
  {
    Icon: Building2,
    title: 'Organizaciones y roles',
    desc: 'Multi-tenant out-of-the-box. Invitaciones por email, RBAC granular y aislamiento de datos por organización a nivel de RLS.',
  },
  {
    Icon: CreditCard,
    title: 'Billing y suscripciones',
    desc: 'Stripe wired con webhooks, portales de cliente y upgrade/downgrade. Los planes viven en la base de datos, no en el código.',
  },
  {
    Icon: Globe,
    title: 'i18n de fábrica',
    desc: 'next-intl con rutas localizadas, archivos de mensajes tipados y soporte para español e inglés desde el primer deploy.',
  },
  {
    Icon: Moon,
    title: 'Modo oscuro incluido',
    desc: 'Sistema de tokens Material Design 3 con dark mode completo. CSS variables que se adaptan al sistema operativo sin flash.',
  },
  {
    Icon: Database,
    title: 'Base de datos declarativa',
    desc: 'Schema en SQL versionado con migraciones automáticas via Supabase CLI. RLS policies con InitPlan optimization integrada.',
  },
];

const PROOF_BEATS = [
  'Auth + MFA',
  'Stripe Billing',
  'Orgs + RBAC',
  'i18n',
  'Dark mode',
  'RLS seguro',
];

const PRICING_TIERS = [
  {
    name: 'Personal',
    price: 'Gratis',
    period: 'para siempre',
    desc: 'Para proyectos en solitario y experimentos rápidos.',
    cta: 'Clonar el repo',
    href: '#',
    featured: false,
    items: [
      '1 organización',
      'Usuarios ilimitados',
      'Auth completa + MFA',
      'Soporte via GitHub Issues',
    ],
  },
  {
    name: 'Studio',
    price: '$79',
    period: '/mes',
    desc: 'Para equipos que construyen y lanzan productos reales.',
    cta: 'Empezar gratis →',
    href: '/signup',
    featured: true,
    items: [
      'Organizaciones ilimitadas',
      'Usuarios ilimitados',
      'Soporte prioritario',
      'Updates mensuales del boilerplate',
      'Canal privado Discord',
    ],
  },
  {
    name: 'Custom',
    price: 'Hablemos',
    period: '',
    desc: 'Para agencias y equipos con necesidades específicas.',
    cta: 'Contactar',
    href: '/contact',
    featured: false,
    items: [
      'Todo en Studio',
      'Implementación guiada',
      'Customización de arquitectura',
      'SLA garantizado',
    ],
  },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-8 pt-16 pb-24 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-muted-foreground mb-6 block">Step · 01 · Origen</span>
          <h1 className="text-foreground mb-6 text-5xl leading-[1.1] font-extrabold tracking-tighter md:text-7xl">
            Un tronco común para tus{' '}
            <span style={{ color: 'var(--color-poppy)' }}>micro-saas.</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-xl leading-relaxed">
            {appConfig.name} es el template que rehúsas reescribir cada vez. Autenticación,
            organizaciones, billing, internacionalización — todo cableado a Supabase y listo para
            que rebrandees y despliegues tu siguiente proyecto en una tarde.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              className="h-12 px-8 text-base"
              style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
              <Link href="/signup">Empezar gratis →</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-8 text-base">
              <Link href="/product">Ver cómo funciona</Link>
            </Button>
          </div>

          {/* Proof beats */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {PROOF_BEATS.map((beat) => (
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
            <span className="eyebrow text-muted-foreground mb-3 block">Step · 02 · Raíces</span>
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
              Todo lo que necesitas, nada que no.
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Cada módulo está cableado desde el primer commit. Sin dependencias encadenadas, sin
              configuración críptica.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, desc }) => (
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

      {/* Quote */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <span className="eyebrow text-muted-foreground mb-8 block">Proverbio Akan</span>
          <blockquote
            className="mb-8 font-sans text-2xl leading-[1.4] font-bold italic md:text-3xl"
            style={{ color: 'var(--color-ink)' }}>
            &ldquo;Antes de cortar el iroko, se le pide permiso al espíritu del árbol — porque sin
            tronco, no hay ramas.&rdquo;
          </blockquote>
          <hr
            className="mx-auto mb-6"
            style={{ width: 80, borderTopWidth: 1, borderColor: 'rgba(217,164,65,0.4)' }}
          />
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Sabiduría Akan · Ghana y Costa de Marfil
          </p>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-surface-2 border-border border-y py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="mb-16 text-center">
            <span className="eyebrow text-muted-foreground mb-3 block">Step · 03 · Ramas</span>
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
              Precios honestos, sin sorpresas.
            </h2>
            <p className="text-muted-foreground">Empieza gratis. Escala cuando necesites.</p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
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
                    Más popular
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
                Step · 04 · Frutos
              </span>
              <h2
                className="mb-6 text-4xl font-bold tracking-tight md:text-5xl"
                style={{ color: 'var(--color-bone)' }}>
                Tu próximo micro-SaaS empieza esta tarde.
              </h2>
              <p className="mb-10 text-lg" style={{ color: 'rgba(245,236,218,0.6)' }}>
                No reescribas el boilerplate otra vez. Clona, rebrandea y despliega.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  asChild
                  className="h-12 px-8 text-base"
                  style={{ background: 'var(--color-bone)', color: 'var(--color-ink)' }}>
                  <Link href="/signup">Empezar gratis →</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-12 px-8 text-base"
                  style={{ color: 'rgba(245,236,218,0.7)' }}>
                  <Link href="/product">Ver documentación</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
