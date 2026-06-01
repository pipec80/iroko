import { setRequestLocale } from 'next-intl/server';
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

const FEATURES = [
  {
    Icon: ShieldCheck,
    title: 'Auth completa',
    desc: 'Email/contraseña, OAuth Google, magic link, MFA TOTP, recovery codes. Todo wired a Supabase Auth con RLS por usuario.',
  },
  {
    Icon: Building2,
    title: 'Multi-tenant',
    desc: 'Organizaciones con roles (owner/admin/member), invitaciones por email y aislamiento de datos a nivel de base de datos.',
  },
  {
    Icon: CreditCard,
    title: 'Stripe integrado',
    desc: 'Webhooks, portales de cliente, upgrade/downgrade de plan. Los planes se gestionan desde la DB, no desde el código.',
  },
  {
    Icon: Globe,
    title: 'i18n con next-intl',
    desc: 'Rutas localizadas, mensajes tipados, soporte ES/EN. Añadir un idioma nuevo es cambiar un archivo JSON.',
  },
  {
    Icon: Moon,
    title: 'Dark mode nativo',
    desc: 'Tokens Material Design 3 como CSS variables. El tema se adapta al sistema sin flash ni hidratación incorrecta.',
  },
  {
    Icon: Database,
    title: 'Schema declarativo',
    desc: 'SQL en /supabase/schemas/, migraciones automáticas via CLI, RLS policies con InitPlan optimization lista.',
  },
];

const TECH_STACK = [
  { label: 'Next.js 16', sub: 'App Router + Turbopack' },
  { label: 'React 19', sub: 'Compiler habilitado' },
  { label: 'TypeScript', sub: 'strict mode + no any' },
  { label: 'Tailwind 4', sub: 'M3 tokens como CSS vars' },
  { label: 'Supabase', sub: 'DB + Auth + Storage' },
  { label: 'Vitest + Playwright', sub: 'unit + E2E' },
];

export default async function ProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-8 pt-16 pb-24 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-muted-foreground mb-6 block">Stack · Arquitectura</span>
          <h1 className="text-foreground mb-6 text-5xl leading-[1.1] font-extrabold tracking-tighter md:text-6xl">
            Construido para que lo <span style={{ color: 'var(--color-poppy)' }}>rebrandees,</span>{' '}
            no para que lo entiendas.
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-xl text-xl leading-relaxed">
            Cada decisión de arquitectura está documentada y justificada. Sin magia negra, sin
            abstracciones innecesarias. Solo código que puedes leer, modificar y desplegar.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              className="h-12 px-8 text-base"
              style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
              <Link href="/signup">Empezar gratis →</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-8 text-base">
              <Link href="/pricing">Ver planes</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-surface-2 border-border border-y py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="mb-16 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
              Módulos incluidos desde el día uno.
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              No son demos ni ejemplos. Son módulos de producción, con tests, tipado estricto y
              manejo de errores completo.
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

      {/* Tech Stack + Code Block */}
      <section className="mx-auto max-w-7xl px-8 py-24">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <span className="eyebrow text-muted-foreground mb-3 block">El stack</span>
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
                Tecnología que ya conoces, lista para producción.
              </h2>
              <p className="text-muted-foreground text-lg">
                Sin frameworks inventados. Sin librerías de nicho. Solo las herramientas que el
                ecosistema ya ha validado.
              </p>
            </div>

            <ul className="space-y-4">
              {TECH_STACK.map(({ label, sub }) => (
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
            ¿Listo para lanzar tu próximo producto?
          </h2>
          <p className="text-muted-foreground mb-10 text-lg">
            Todo lo que necesitas, nada que no. Clona, rebrandea, despliega.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              className="h-12 px-8 text-base"
              style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
              <Link href="/signup">Empezar gratis →</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-8 text-base">
              <Link href="/pricing">Ver precios</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6">
            {['Sin tarjeta de crédito', 'Deploy en < 30 min', 'Código 100% tuyo'].map((item) => (
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
