import { setRequestLocale } from 'next-intl/server';

export default async function ProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Hero Section */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-8 py-20 lg:grid-cols-2 lg:py-32">
        <div className="relative z-10 space-y-8">
          <h1 className="text-on-surface text-5xl leading-tight font-extrabold tracking-tight lg:text-7xl">
            Poder técnico para <br />
            <span className="text-primary">decisiones precisas.</span>
          </h1>
          <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed">
            Axiom Ledger transforma la complejidad de los datos en claridad accionable. Un motor
            analítico diseñado para la velocidad, construido para la precisión en el retail moderno.
          </p>
          <div className="flex gap-4 pt-4">
            <button className="from-primary to-primary-container text-on-primary flex items-center gap-2 rounded-md bg-linear-to-r px-8 py-4 text-lg font-semibold transition-opacity hover:opacity-90">
              Empieza tu prueba gratuita
              <span
                className="material-symbols-outlined text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                arrow_forward
              </span>
            </button>
            <button className="ghost-border text-primary hover:bg-surface-container-highest rounded-md px-8 py-4 text-lg font-semibold transition-colors">
              Ver documentación
            </button>
          </div>
        </div>
        <div className="relative">
          {/* Abstract UI Representation */}
          <div className="bg-surface-container-highest ambient-shadow relative z-10 flex aspect-square flex-col gap-4 rounded-xl p-6">
            <div className="ghost-border flex items-center justify-between border-b pb-4">
              <div className="bg-surface-container-lowest h-4 w-1/3 rounded-full"></div>
              <div className="bg-primary/20 h-4 w-16 rounded-full"></div>
            </div>
            <div className="bg-surface-container-lowest flex grow flex-col gap-3 rounded-lg p-4">
              <div className="flex items-end justify-between">
                <div className="w-1/2 space-y-2">
                  <div className="bg-surface-container-high h-3 w-24 rounded"></div>
                  <div className="text-primary font-mono text-3xl font-semibold tracking-tighter">
                    42,891.00
                  </div>
                </div>
                <div className="bg-tertiary-container h-8 w-16 rounded-md"></div>
              </div>
              <div className="mt-auto grid h-32 grid-cols-4 items-end gap-2">
                <div className="bg-primary-container h-full w-full rounded-t-sm"></div>
                <div className="bg-primary/40 h-3/4 w-full rounded-t-sm"></div>
                <div className="bg-primary/60 h-5/6 w-full rounded-t-sm"></div>
                <div className="bg-primary h-1/2 w-full rounded-t-sm"></div>
              </div>
            </div>
          </div>
          {/* Decorative element */}
          <div className="bg-primary-container/30 absolute -right-8 -bottom-8 -z-10 h-64 w-64 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="bg-surface-container-low mx-auto mb-24 max-w-7xl rounded-3xl px-8 py-24">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-on-surface mb-4 text-3xl font-bold tracking-tight">
            Arquitectura diseñada para la escala
          </h2>
          <p className="text-on-surface-variant">
            Cada componente de Axiom Ledger está optimizado para procesar altos volúmenes de datos
            sin comprometer la latencia.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1 */}
          <div className="bg-surface-container-highest rounded-xl p-8 transition-transform duration-300 hover:-translate-y-1">
            <div className="bg-primary/10 text-primary mb-6 flex h-12 w-12 items-center justify-center rounded-full">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                inventory_2
              </span>
            </div>
            <h3 className="mb-3 text-xl font-semibold">Gestión de Inventario en Tiempo Real</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Sincronización milimétrica a través de múltiples almacenes. Evite roturas de stock con
              actualizaciones de estado en milisegundos.
            </p>
          </div>
          {/* Card 2 */}
          <div className="bg-surface-container-highest rounded-xl p-8 transition-transform duration-300 hover:-translate-y-1">
            <div className="bg-primary/10 text-primary mb-6 flex h-12 w-12 items-center justify-center rounded-full">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                trending_up
              </span>
            </div>
            <h3 className="mb-3 text-xl font-semibold">Analítica Predictiva</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Modelos estadísticos integrados para prever la demanda, optimizando sus niveles de
              inventario basados en tendencias históricas.
            </p>
          </div>
          {/* Card 3 */}
          <div className="bg-surface-container-highest rounded-xl p-8 transition-transform duration-300 hover:-translate-y-1">
            <div className="bg-primary/10 text-primary mb-6 flex h-12 w-12 items-center justify-center rounded-full">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                database
              </span>
            </div>
            <h3 className="mb-3 text-xl font-semibold">Integración con Supabase</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Construido sobre PostgreSQL avanzado. Aproveche la potencia de las bases de datos
              relacionales con la flexibilidad de una API moderna.
            </p>
          </div>
        </div>
      </section>

      {/* Technical Edge Section */}
      <section className="mx-auto max-w-7xl px-8 py-24">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <h2 className="text-4xl font-bold tracking-tight">El &apos;Edge&apos; Técnico</h2>
            <p className="text-on-surface-variant text-lg">
              La velocidad no es una característica, es la fundación. Axiom Ledger utiliza
              renderizado en el servidor avanzado para entregar datos críticos instantáneamente.
            </p>
            <ul className="space-y-4 pt-4">
              <li className="text-on-surface flex items-center gap-3 font-medium">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  bolt
                </span>
                Construido con Next.js 16
              </li>
              <li className="text-on-surface flex items-center gap-3 font-medium">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  data_object
                </span>
                Tipografía IBM Plex Mono para lectura de precisión
              </li>
              <li className="text-on-surface flex items-center gap-3 font-medium">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  memory
                </span>
                Procesamiento Edge de baja latencia
              </li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-[#1e1e1e] p-8 shadow-2xl lg:col-span-3">
            <div className="mb-6 flex gap-2 border-b border-gray-700 pb-4">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
            <div className="space-y-2 font-mono text-sm text-gray-300">
              <p>
                <span className="text-blue-400">import</span> {'{ cache }'}{' '}
                <span className="text-blue-400">from</span>{' '}
                <span className="text-green-400">&apos;react&apos;</span>;
              </p>
              <p>
                <span className="text-blue-400">import</span> {'{ getInventoryData }'}{' '}
                <span className="text-blue-400">from</span>{' '}
                <span className="text-green-400">&apos;@/lib/db&apos;</span>;
              </p>
              <br />
              <p>
                <span className="text-blue-400">export const</span> getCachedInventory = cache(
              </p>
              <p className="pl-4">
                <span className="text-blue-400">async</span> (storeId:{' '}
                <span className="text-yellow-400">string</span>) =&gt; {'{'}
              </p>
              <p className="pl-8">
                <span className="text-purple-400">const</span> data ={' '}
                <span className="text-blue-400">await</span> getInventoryData(storeId);
              </p>
              <p className="pl-8">
                <span className="text-blue-400">return</span> data;
              </p>
              <p className="pl-4">{'}'}</p>
              <p>);</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-8 py-32 text-center">
        <div className="bg-surface-container-low relative overflow-hidden rounded-[2rem] p-16">
          <div className="from-primary/5 absolute inset-0 bg-linear-to-br to-transparent"></div>
          <div className="relative z-10 mx-auto max-w-2xl space-y-8">
            <h2 className="text-4xl font-bold tracking-tight">
              Listo para optimizar sus operaciones?
            </h2>
            <p className="text-on-surface-variant text-xl">
              Experimente la precisión técnica de Axiom Ledger hoy mismo.
            </p>
            <button className="from-primary to-primary-container text-on-primary mt-4 rounded-md bg-linear-to-r px-10 py-5 text-lg font-semibold transition-opacity hover:opacity-90">
              Empieza tu prueba gratuita
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
