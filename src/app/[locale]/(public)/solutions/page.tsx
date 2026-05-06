import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';

const INSIGHTS_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD9ixXWyhSG5OeiC8zJp946w6XdN5S1UlrxCPqg1AnJqOQaroMSvV5UbtRUOz5Ur_-Rb_t3pq2vcZ5BMT6fGSl9sKW2xH_j4R0sdgHkBzEbiZAWRbTLT5xmeDjW_xTUZLcbbs2DJ9Wrpu2htbNC02a5sHN-k2m8gu9kEt3Sn66HpACwFpy-GyPCgipRZd1Ah2dEFH7XTVxFTQ--jFuwYe6BSnpBBpbmRz34hxoZ4woLd75pEOw9hCUn2uO3ggJvaA_K_EG1OgdDSGmm';

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Hero Section */}
      <section className="mx-auto mb-24 max-w-7xl px-8 pt-20 lg:pt-32">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h1 className="font-display text-primary mb-6 text-5xl leading-[1.1] font-extrabold tracking-tighter md:text-6xl">
              Soluciones a medida para cada escala de Retail
            </h1>
            <p className="font-body text-on-surface-variant mb-10 max-w-2xl text-xl leading-relaxed">
              Nuestra arquitectura modular se adapta a la complejidad de tu operación. Desde el
              control local hasta la analítica consolidada a nivel corporativo, unificamos tu
              ecosistema financiero.
            </p>
            <div className="flex gap-4">
              <button className="from-primary to-primary-container text-on-primary flex items-center gap-2 rounded-lg bg-gradient-to-r px-6 py-3 font-bold transition-opacity hover:opacity-90">
                Agendar Consultoría
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  arrow_forward
                </span>
              </button>
              <button className="text-primary border-outline-variant/30 hover:border-outline-variant/60 rounded-lg border px-6 py-3 font-semibold transition-colors">
                Ver Documentación
              </button>
            </div>
          </div>
          <div className="bg-surface-container-highest relative h-[400px] overflow-hidden rounded-xl lg:col-span-5">
            <Image
              alt="Business Insights"
              className="h-full w-full object-cover opacity-90 mix-blend-multiply"
              src={INSIGHTS_IMAGE_URL}
              width={800}
              height={600}
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
        </div>
      </section>

      {/* Casos de Uso (Bento Grid) */}
      <section className="bg-surface-container-low py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="mb-16">
            <h2 className="font-headline text-primary mb-4 text-3xl font-bold tracking-tight">
              Adaptabilidad por Diseño
            </h2>
            <p className="text-on-surface-variant max-w-3xl text-lg">
              Estructuras pre-configuradas para desplegar valor inmediato según la naturaleza de tu
              red comercial.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Block 1 */}
            <div className="bg-surface-container-highest group hover:bg-surface-dim flex flex-col rounded-xl p-8 transition-colors duration-300">
              <div className="bg-surface-lowest text-primary mb-6 flex h-12 w-12 items-center justify-center rounded-full">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  storefront
                </span>
              </div>
              <h3 className="font-headline text-on-surface mb-3 text-xl font-bold">
                Mini-supermercados locales
              </h3>
              <p className="text-on-surface-variant mb-8 flex-grow">
                Visibilidad inmediata del flujo de caja diario, conciliación automática de TPVs y
                control de inventario básico sin curva de aprendizaje.
              </p>
              <ul className="border-outline-variant/20 mt-auto space-y-3 border-t pt-6">
                <li className="text-on-surface-variant flex items-center gap-2 text-sm font-medium">
                  <span className="material-symbols-outlined text-primary text-base">
                    check_circle
                  </span>
                  Conciliación TPV en 1-clic
                </li>
                <li className="text-on-surface-variant flex items-center gap-2 text-sm font-medium">
                  <span className="material-symbols-outlined text-primary text-base">
                    check_circle
                  </span>
                  Alertas de stock crítico
                </li>
              </ul>
            </div>
            {/* Block 2 */}
            <div className="bg-surface-container-highest group hover:bg-surface-dim relative flex flex-col overflow-hidden rounded-xl p-8 transition-colors duration-300">
              {/* Subtle gradient accent for the middle tier */}
              <div className="from-primary to-primary-container absolute top-0 left-0 h-1 w-full bg-gradient-to-r"></div>
              <div className="bg-surface-lowest text-primary mb-6 flex h-12 w-12 items-center justify-center rounded-full">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_tree
                </span>
              </div>
              <h3 className="font-headline text-on-surface mb-3 text-xl font-bold">
                Cadenas Regionales
              </h3>
              <p className="text-on-surface-variant mb-8 flex-grow">
                Gestión multi-sucursal con consolidación de datos en tiempo real. Estandarización de
                procesos contables entre regiones.
              </p>
              <ul className="border-outline-variant/20 mt-auto space-y-3 border-t pt-6">
                <li className="text-on-surface-variant flex items-center gap-2 text-sm font-medium">
                  <span className="material-symbols-outlined text-primary text-base">
                    check_circle
                  </span>
                  Reportes comparativos por tienda
                </li>
                <li className="text-on-surface-variant flex items-center gap-2 text-sm font-medium">
                  <span className="material-symbols-outlined text-primary text-base">
                    check_circle
                  </span>
                  Gestión centralizada de catálogos
                </li>
              </ul>
            </div>
            {/* Block 3 */}
            <div className="bg-primary text-on-primary relative flex flex-col overflow-hidden rounded-xl p-8">
              {/* Glass overlay effect inside the solid card */}
              <div className="bg-surface-variant/10 pointer-events-none absolute inset-0 backdrop-blur-sm"></div>
              <div className="relative z-10 flex h-full flex-col">
                <div className="bg-on-primary/10 text-on-primary mb-6 flex h-12 w-12 items-center justify-center rounded-full">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    domain
                  </span>
                </div>
                <h3 className="font-headline mb-3 text-xl font-bold">
                  Enterprise &amp; Franquicias
                </h3>
                <p className="text-primary-fixed-dim mb-8 flex-grow">
                  Infraestructura de alta disponibilidad para miles de puntos de venta. APIs
                  robustas y control granular de permisos por franquiciado.
                </p>
                <ul className="border-on-primary/20 mt-auto space-y-3 border-t pt-6">
                  <li className="flex items-center gap-2 text-sm font-medium">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Liquidación a franquiciados
                  </li>
                  <li className="flex items-center gap-2 text-sm font-medium">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    SLA garantizado 99.99%
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Eficiencia Operativa (Bento Data Grid) */}
      <section className="mx-auto max-w-7xl px-8 py-24">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="font-headline text-primary mb-2 text-3xl font-bold tracking-tight">
              Eficiencia Operativa
            </h2>
            <p className="text-on-surface-variant">Métricas clave consolidadas en tiempo real.</p>
          </div>
          <div className="text-primary hidden items-center gap-2 text-sm font-medium md:flex">
            <span className="material-symbols-outlined text-sm">sync</span>
            Actualizado hace 2 min
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Large Highlight Card */}
          <div className="bg-surface-container-highest flex flex-col justify-between rounded-xl p-8 md:col-span-2">
            <div className="mb-12 flex items-start justify-between">
              <div>
                <p className="font-label text-on-surface-variant mb-1 text-xs font-bold tracking-widest uppercase">
                  Impacto Financiero
                </p>
                <h4 className="font-headline text-on-surface text-lg font-semibold">
                  Reducción de Mermas
                </h4>
              </div>
              <span className="material-symbols-outlined text-secondary text-3xl">
                trending_down
              </span>
            </div>
            <div>
              <div className="mb-2 flex items-baseline gap-3">
                <span className="text-primary font-mono text-6xl font-semibold">-24.8%</span>
                <span className="text-secondary bg-secondary-fixed/50 rounded-md px-2 py-1 text-sm font-medium">
                  YTD
                </span>
              </div>
              <p className="text-on-surface-variant text-sm">
                Ahorro proyectado de <span className="font-mono font-medium">€142,500</span> este
                trimestre.
              </p>
            </div>
          </div>
          {/* Stock Optimization Card */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
            <div className="bg-surface-container-highest flex flex-col justify-between rounded-xl p-6">
              <p className="font-label text-on-surface-variant mb-4 text-xs font-bold tracking-widest uppercase">
                Rotación de Inventario
              </p>
              <div>
                <div className="text-on-surface mb-1 font-mono text-4xl font-semibold">4.2x</div>
                <p className="text-on-surface-variant flex items-center gap-1 text-xs">
                  <span className="material-symbols-outlined text-tertiary text-xs">
                    arrow_upward
                  </span>
                  +0.5 vs mes anterior
                </p>
              </div>
            </div>
            <div className="bg-surface-container-highest flex flex-col justify-between rounded-xl p-6">
              <p className="font-label text-on-surface-variant mb-4 text-xs font-bold tracking-widest uppercase">
                Precisión de Stock
              </p>
              <div>
                <div className="text-on-surface mb-1 font-mono text-4xl font-semibold">99.1%</div>
                <p className="text-on-surface-variant flex items-center gap-1 text-xs">
                  <span className="material-symbols-outlined text-primary text-xs">check</span>
                  Óptimo
                </p>
              </div>
            </div>
            {/* Data Grid Preview */}
            <div className="bg-surface-container-lowest border-outline-variant/20 overflow-hidden rounded-xl border sm:col-span-2">
              <div className="bg-surface-container-high border-outline-variant/20 border-b px-4 py-2">
                <p className="font-label text-on-surface-variant text-xs font-bold tracking-wider uppercase">
                  Top SKUs Críticos
                </p>
              </div>
              <div className="p-0">
                <div className="text-on-surface-variant border-outline-variant/10 grid grid-cols-3 border-b px-4 py-2 text-xs font-medium">
                  <div>SKU</div>
                  <div className="text-right">Stock</div>
                  <div className="text-right">Días Cobertura</div>
                </div>
                <div className="border-outline-variant/10 bg-surface-container-low/50 grid grid-cols-3 border-b px-4 py-3 text-sm">
                  <div className="text-on-surface font-mono">P-8842</div>
                  <div className="text-error text-right font-mono font-medium">12</div>
                  <div className="text-right font-mono">1.5</div>
                </div>
                <div className="grid grid-cols-3 px-4 py-3 text-sm">
                  <div className="text-on-surface font-mono">P-9102</div>
                  <div className="text-on-surface text-right font-mono">84</div>
                  <div className="text-right font-mono">4.2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-surface-container-low border-outline-variant/10 border-y py-20">
        <div className="mx-auto max-w-4xl px-8 text-center">
          <span className="material-symbols-outlined text-primary/40 mb-6 text-4xl">
            format_quote
          </span>
          <blockquote className="font-display text-primary mb-8 text-2xl leading-relaxed font-medium md:text-3xl">
            &quot;La implementación de Axiom Ledger transformó nuestra cadena regional. Pasamos de
            conciliar datos ciegos a fin de mes, a tener control quirúrgico diario sobre la
            rentabilidad de cada pasillo.&quot;
          </blockquote>
          <div className="flex flex-col items-center">
            <p className="text-on-surface font-label text-sm font-bold tracking-wider uppercase">
              Elena Ríos
            </p>
            <p className="text-on-surface-variant text-sm">
              Directora de Operaciones, Supermercados Vértice
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-4xl px-8 py-24 text-center">
        <h2 className="font-headline text-primary mb-4 text-3xl font-bold">
          ¿Listo para auditar su eficiencia?
        </h2>
        <p className="text-on-surface-variant mb-10 text-lg">
          Agende una sesión técnica con nuestros arquitectos de soluciones.
        </p>
        <button className="from-primary to-primary-container text-on-primary hover:shadow-primary/20 rounded-xl bg-gradient-to-r px-8 py-4 text-lg font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          Agendar Consultoría Gratuita
        </button>
      </section>
    </>
  );
}
