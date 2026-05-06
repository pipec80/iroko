import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';

const HERO_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuASEeovWyQD5A1V4QUcRrVdBzaw8Xt2ogguxVBYPlw7JJWAeffHqecBgrLq5xZUWbraM4ez9VfnfWMpG4RS1tFf2IBjhwvzSI9SR5DOr45biFiGCrW6AYVxjVhbi7DzTfwcTkhjDBkwbhLFSNMYWNcALIYfwGXxp1iE1QNejHZ9jZUD-i9rdbBk4vWetAq8WUAI1o6EgK4148-3_Y7NxCu1-QfR2S2kWZu-xznpOY4NXsE6OmG1s_tC7K6wzQdKJ6lnhWw-OG8Toae7';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Hero Section */}
      <section className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-16 px-8 py-20 md:flex-row md:py-32">
        <div className="z-10 flex w-full flex-col gap-6 md:w-1/2">
          <div className="bg-surface-container-highest text-on-surface-variant inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <span
              className="material-symbols-outlined text-primary text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              insights
            </span>
            Retail Analytics Reimagined
          </div>
          <h1 className="text-on-surface text-5xl leading-tight font-extrabold tracking-tight md:text-7xl">
            La precisión que <br /> tu retail necesita.
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-lg text-lg leading-relaxed">
            Transform data into actionable insights. Control your inventory, manage suppliers, and
            analyze sales in real-time with an editorial-grade dashboard.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <button className="from-primary to-primary-container text-on-primary ambient-shadow rounded-md bg-gradient-to-r px-8 py-4 text-lg font-semibold transition-opacity hover:opacity-90">
              Empezar ahora
            </button>
            <button className="text-primary ghost-border hover:bg-surface-container-low rounded-md px-8 py-4 font-semibold transition-colors">
              Book a Demo
            </button>
          </div>
        </div>
        <div className="relative h-[300px] w-full overflow-hidden rounded-xl md:h-[450px] md:w-1/2">
          <div className="from-primary-container/20 to-surface absolute inset-0 -z-10 rounded-full bg-gradient-to-tr blur-3xl"></div>
          <Image
            alt="Dashboard"
            className="ambient-shadow object-cover"
            src={HERO_IMAGE_URL}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-surface-container-low w-full py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-8">
          <p className="text-outline text-center text-sm font-semibold tracking-widest uppercase">
            Trusted by Leading Retailers
          </p>
          <div className="flex flex-wrap justify-center gap-12 opacity-60 grayscale transition-all duration-500 hover:grayscale-0">
            <span className="font-headline text-on-surface text-2xl font-bold">Vanguard</span>
            <span className="font-headline text-on-surface text-2xl font-bold">Meridian</span>
            <span className="font-headline text-on-surface text-2xl font-bold">Aura Brands</span>
            <span className="font-headline text-on-surface text-2xl font-bold">Nexus Retail</span>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-8 py-24">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-on-surface text-4xl font-bold">Curated Control</h2>
          <p className="text-on-surface-variant max-w-2xl">
            Everything you need to orchestrate your retail operations seamlessly, without the visual
            clutter.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Feature 1 */}
          <div className="bg-surface-container-highest ambient-shadow flex flex-col gap-6 rounded-xl p-8 transition-transform duration-300 hover:scale-[1.02]">
            <div className="bg-surface text-primary flex h-12 w-12 items-center justify-center rounded-full">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                inventory_2
              </span>
            </div>
            <h3 className="text-on-surface text-xl font-bold">Control de Inventario</h3>
            <p className="text-on-surface-variant">
              Real-time SKU tracking with predictive alerts for low stock. Keep your shelves
              perfectly balanced.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-surface-container-highest ambient-shadow flex flex-col gap-6 rounded-xl p-8 transition-transform duration-300 hover:scale-[1.02] md:-translate-y-4">
            <div className="bg-surface text-primary flex h-12 w-12 items-center justify-center rounded-full">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                query_stats
              </span>
            </div>
            <h3 className="text-on-surface text-xl font-bold">Analítica en Tiempo Real</h3>
            <p className="text-on-surface-variant">
              Editorial-grade reports that tell the story behind your numbers. Uncover trends before
              they peak.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-surface-container-highest ambient-shadow flex flex-col gap-6 rounded-xl p-8 transition-transform duration-300 hover:scale-[1.02]">
            <div className="bg-surface text-primary flex h-12 w-12 items-center justify-center rounded-full">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                storefront
              </span>
            </div>
            <h3 className="text-on-surface text-xl font-bold">Gestión de Proveedores</h3>
            <p className="text-on-surface-variant">
              Streamlined procurement workflows. Manage relationships, POs, and deliveries in one
              unified space.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
