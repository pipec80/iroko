import { setRequestLocale } from 'next-intl/server';
import { Check, Code2, Layers, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

const USE_CASES = [
  {
    Icon: Code2,
    title: 'SaaS en solitario',
    desc: 'Un developer, una idea, un tarde. Iroko te da la base completa para que te centres en el diferenciador de tu producto.',
    items: ['Auth lista desde el commit 1', 'Dashboard con layout ya diseñado'],
    featured: false,
  },
  {
    Icon: Layers,
    title: 'Agencias y estudios',
    desc: 'Lanza proyectos de cliente con la misma arquitectura cada vez. Rebrandea tokens, cambia copy, despliega en horas.',
    items: ['Rebranding en una tarde', 'Multi-tenant out-of-the-box', 'Billing configurable'],
    featured: true,
  },
  {
    Icon: Users,
    title: 'Equipos de producto',
    desc: 'Olvida el scaffolding y salta directo a las features que importan. CI/CD, testing y calidad de código ya configurados.',
    items: [
      'Vitest + Playwright listos',
      'ESLint + Prettier + commitlint',
      'SLA garantizado (Custom)',
    ],
    featured: false,
  },
];

const STATS = [
  { val: '< 30 min', label: 'De clon a primer deploy' },
  { val: '6+', label: 'Módulos de producción' },
  { val: '100%', label: 'Código en tu repo' },
  { val: '∞', label: 'Proyectos posibles' },
];

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-8 pt-16 pb-24 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-muted-foreground mb-6 block">Casos de uso</span>
          <h1 className="text-foreground mb-6 text-5xl leading-[1.1] font-extrabold tracking-tighter md:text-6xl">
            Un boilerplate, <span style={{ color: 'var(--color-poppy)' }}>infinitas ramas.</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-xl leading-relaxed">
            Iroko se adapta a la escala y contexto de cada proyecto. Desde el indie hacker hasta el
            equipo de producto consolidado.
          </p>
          <Button
            asChild
            className="h-12 px-8 text-base"
            style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
            <Link href="/signup">Empezar gratis →</Link>
          </Button>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-surface-2 border-border border-y py-12">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map(({ val, label }) => (
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
            Adaptabilidad por diseño.
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl">
            El mismo tronco soporta proyectos muy distintos. La diferencia está en cómo lo
            rebrandeas y qué construyes encima.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {USE_CASES.map(({ Icon, title, desc, items, featured }) => (
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

      {/* Quote / Testimonial */}
      <section className="bg-surface-2 border-border border-y py-20">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <span className="eyebrow text-muted-foreground mb-6 block">Proverbio Akan</span>
          <blockquote
            className="mb-8 font-sans text-xl leading-[1.5] font-bold italic md:text-2xl"
            style={{ color: 'var(--color-ink)' }}>
            &ldquo;Antes de cortar el iroko, se le pide permiso al espíritu del árbol — porque sin
            tronco, no hay ramas.&rdquo;
          </blockquote>
          <hr
            className="mx-auto mb-6"
            style={{ width: 64, borderTopWidth: 1, borderColor: 'rgba(217,164,65,0.4)' }}
          />
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Sabiduría Akan · Ghana y Costa de Marfil
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-8 py-24 text-center">
        <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">
          ¿Listo para lanzar en una tarde?
        </h2>
        <p className="text-muted-foreground mb-10 text-lg">
          Sin tarjeta de crédito. Sin lock-in. El código es completamente tuyo.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            className="h-12 px-8 text-base"
            style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
            <Link href="/signup">Empezar gratis →</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 px-8 text-base">
            <Link href="/contact">Hablar con el equipo</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
