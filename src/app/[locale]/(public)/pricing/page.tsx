import { setRequestLocale } from 'next-intl/server';

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-8 pt-20 pb-24 lg:pt-32">
        {/* Header */}
        <header className="mx-auto mb-16 max-w-3xl text-center">
          <h1 className="text-primary font-headline mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            Planes simples y transparentes
          </h1>
          <p className="text-on-surface-variant font-body text-xl">
            Encuentra el plan perfecto para las necesidades de tu negocio. Sin costos ocultos.
          </p>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Free */}
          <div className="bg-surface-container-lowest border-outline-variant/20 hover:border-primary/30 flex flex-col rounded-2xl border p-8 transition-colors">
            <h4 className="text-on-surface mb-2 text-xl font-bold">Free</h4>
            <p className="text-on-surface-variant mb-6 h-10 text-sm">
              Para probar la plataforma y pequeños proyectos.
            </p>
            <p className="text-on-surface mb-6 font-mono text-4xl">
              $0
              <span className="text-on-surface-variant font-body text-base font-medium">/mes</span>
            </p>
            <button className="bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high mb-8 w-full rounded-xl border px-4 py-3 font-semibold transition-colors">
              Comenzar Gratis
            </button>
            <ul className="grow space-y-4">
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                Hasta 100 SKUs
              </li>
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                1 Usuario
              </li>
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                Soporte comunitario
              </li>
            </ul>
          </div>

          {/* Básico */}
          <div className="bg-surface-container-lowest border-outline-variant/20 hover:border-primary/30 flex flex-col rounded-2xl border p-8 transition-colors">
            <h4 className="text-on-surface mb-2 text-xl font-bold">Básico</h4>
            <p className="text-on-surface-variant mb-6 h-10 text-sm">
              Ideal para negocios en crecimiento y startups.
            </p>
            <p className="text-on-surface mb-6 font-mono text-4xl">
              $49
              <span className="text-on-surface-variant font-body text-base font-medium">/mes</span>
            </p>
            <button className="bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high mb-8 w-full rounded-xl border px-4 py-3 font-semibold transition-colors">
              Comenzar Básico
            </button>
            <ul className="grow space-y-4">
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                Hasta 1,000 SKUs
              </li>
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                2 Usuarios
              </li>
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                Soporte por email
              </li>
            </ul>
          </div>

          {/* Pro (Recommended) */}
          <div className="bg-primary border-primary relative flex transform flex-col rounded-2xl border p-8 shadow-xl md:-translate-y-4">
            <div className="bg-primary-container text-on-primary-container absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase shadow-sm">
              Más Popular
            </div>
            <h4 className="text-on-primary mb-2 text-xl font-bold">Pro</h4>
            <p className="text-primary-fixed-dim mb-6 h-10 text-sm">
              Para empresas consolidadas con múltiples operaciones.
            </p>
            <p className="text-on-primary mb-6 font-mono text-4xl">
              $149
              <span className="text-primary-fixed-dim font-body text-base font-medium">/mes</span>
            </p>
            <button className="bg-on-primary text-primary hover:bg-surface mb-8 w-full rounded-xl px-4 py-3 font-bold shadow-sm transition-colors">
              Comenzar Pro
            </button>
            <ul className="grow space-y-4">
              <li className="text-on-primary flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary-fixed shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                Hasta 10,000 SKUs
              </li>
              <li className="text-on-primary flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary-fixed shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                15 Usuarios
              </li>
              <li className="text-on-primary flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary-fixed shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                Multitienda
              </li>
              <li className="text-on-primary flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary-fixed shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                Soporte prioritario 24/7
              </li>
            </ul>
          </div>

          {/* Enterprise */}
          <div className="bg-surface-container-lowest border-outline-variant/20 hover:border-primary/30 flex flex-col rounded-2xl border p-8 transition-colors">
            <h4 className="text-on-surface mb-2 text-xl font-bold">Enterprise</h4>
            <p className="text-on-surface-variant mb-6 h-10 text-sm">
              Soluciones a medida para grandes corporaciones.
            </p>
            <p className="text-on-surface mb-6 py-1 font-mono text-3xl">Personalizado</p>
            <button className="bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high mb-8 w-full rounded-xl border px-4 py-3 font-semibold transition-colors">
              Contactar Ventas
            </button>
            <ul className="grow space-y-4">
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                SKUs Ilimitados
              </li>
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                Usuarios Ilimitados
              </li>
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                API Access
              </li>
              <li className="text-on-surface-variant flex items-start gap-3 text-sm">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>{' '}
                Account Manager Dedicado
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <section className="bg-surface-container-low border-outline-variant/10 mt-24 rounded-3xl border p-12 text-center md:p-16">
          <h2 className="font-headline text-on-surface mb-4 text-3xl font-bold">
            ¿Listo para transformar tu gestión?
          </h2>
          <p className="text-on-surface-variant mx-auto mb-8 max-w-2xl text-lg">
            Únete a cientos de empresas que ya optimizan sus operaciones con Axiom Ledger. Comienza
            gratis hoy mismo.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button className="bg-primary text-on-primary hover:bg-primary/90 rounded-xl px-8 py-3 font-semibold shadow-md transition-colors">
              Crear cuenta gratis
            </button>
            <button className="bg-surface-container-highest text-on-surface hover:bg-surface-variant border-outline-variant/20 rounded-xl border px-8 py-3 font-semibold transition-colors">
              Hablar con un experto
            </button>
          </div>
        </section>
      </section>
    </>
  );
}
