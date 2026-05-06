import { setRequestLocale } from 'next-intl/server';

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mt-8 mb-12 md:mb-16">
          <h1 className="text-primary font-headline mb-4 max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">
            Contacta con nuestro equipo de expertos
          </h1>
          <p className="text-on-surface-variant font-body max-w-xl text-lg">
            Estamos aquí para ayudarle a optimizar sus análisis financieros. Rellene el formulario y
            nos pondremos en contacto en breve.
          </p>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
          {/* Left Side: Form */}
          <div className="lg:col-span-7">
            <div className="bg-surface-container-highest relative overflow-hidden rounded-xl p-6 sm:p-8">
              {/* Glassmorphism subtle overlay effect */}
              <div className="bg-surface-variant/30 absolute inset-0 z-0 backdrop-blur-sm"></div>
              <form className="relative z-10 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <label
                      className="text-on-surface font-headline block text-sm font-semibold tracking-wider uppercase"
                      htmlFor="name">
                      Nombre completo
                    </label>
                    <input
                      className="bg-surface-container-lowest border-outline-variant/20 text-on-surface placeholder-outline focus:ring-primary focus:border-primary w-full rounded-md border px-4 py-3 shadow-sm transition-all focus:ring-1 focus:outline-none"
                      id="name"
                      name="name"
                      placeholder="Ej. Jane Doe"
                      type="text"
                    />
                  </div>
                  {/* Business Email */}
                  <div className="space-y-2">
                    <label
                      className="text-on-surface font-headline block text-sm font-semibold tracking-wider uppercase"
                      htmlFor="email">
                      Email corporativo
                    </label>
                    <input
                      className="bg-surface-container-lowest border-outline-variant/20 text-on-surface placeholder-outline focus:ring-primary focus:border-primary w-full rounded-md border px-4 py-3 shadow-sm transition-all focus:ring-1 focus:outline-none"
                      id="email"
                      name="email"
                      placeholder="jane@empresa.com"
                      type="email"
                    />
                  </div>
                </div>

                {/* Company Size (Dropdown) */}
                <div className="space-y-2">
                  <label
                    className="text-on-surface font-headline block text-sm font-semibold tracking-wider uppercase"
                    htmlFor="company_size">
                    Tamaño de la empresa
                  </label>
                  <div className="relative">
                    <select
                      className="bg-surface-container-lowest border-outline-variant/20 text-on-surface focus:ring-primary focus:border-primary font-body w-full cursor-pointer appearance-none rounded-md border px-4 py-3 shadow-sm transition-all focus:ring-1 focus:outline-none"
                      id="company_size"
                      name="company_size"
                      defaultValue="">
                      <option disabled value="">
                        Seleccione una opción
                      </option>
                      <option value="1-50">1 - 50 empleados</option>
                      <option value="51-200">51 - 200 empleados</option>
                      <option value="201-500">201 - 500 empleados</option>
                      <option value="500+">Más de 500 empleados</option>
                    </select>
                    <div className="text-on-surface-variant pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ fontVariationSettings: "'FILL' 0" }}>
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label
                    className="text-on-surface font-headline block text-sm font-semibold tracking-wider uppercase"
                    htmlFor="message">
                    Mensaje
                  </label>
                  <textarea
                    className="bg-surface-container-lowest border-outline-variant/20 text-on-surface placeholder-outline focus:ring-primary focus:border-primary w-full resize-none rounded-md border px-4 py-3 shadow-sm transition-all focus:ring-1 focus:outline-none"
                    id="message"
                    name="message"
                    placeholder="¿En qué podemos ayudarle?"
                    rows={4}></textarea>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    className="from-primary to-primary-container text-on-primary focus:ring-primary focus:ring-offset-surface w-full rounded-md bg-gradient-to-r px-8 py-3 font-bold transition-opacity hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:outline-none sm:w-auto"
                    type="button">
                    Enviar mensaje
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Side: Contact Details */}
          <div className="flex flex-col justify-start space-y-8 lg:col-span-5">
            <div className="bg-surface-container-low h-full rounded-xl p-8">
              <h2 className="text-primary font-headline mb-6 text-xl font-bold">
                Información de Contacto
              </h2>
              <div className="space-y-8">
                {/* Address */}
                <div className="flex items-start space-x-4">
                  <div className="bg-surface-container-highest flex-shrink-0 rounded-full p-3">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}>
                      location_on
                    </span>
                  </div>
                  <div>
                    <h3 className="text-on-surface font-headline mb-1 text-sm font-bold tracking-wider uppercase">
                      Sede Central
                    </h3>
                    <p className="text-on-surface-variant font-body">
                      Paseo de la Castellana, 42
                      <br />
                      28046 Madrid, España
                    </p>
                  </div>
                </div>

                {/* Sales Email */}
                <div className="flex items-start space-x-4">
                  <div className="bg-surface-container-highest flex-shrink-0 rounded-full p-3">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}>
                      mail
                    </span>
                  </div>
                  <div>
                    <h3 className="text-on-surface font-headline mb-1 text-sm font-bold tracking-wider uppercase">
                      Ventas
                    </h3>
                    <a
                      className="text-primary hover:text-primary-container font-mono transition-colors"
                      href="mailto:sales@axiomledger.com">
                      sales@axiomledger.com
                    </a>
                  </div>
                </div>

                {/* Support Phone */}
                <div className="flex items-start space-x-4">
                  <div className="bg-surface-container-highest flex-shrink-0 rounded-full p-3">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}>
                      support_agent
                    </span>
                  </div>
                  <div>
                    <h3 className="text-on-surface font-headline mb-1 text-sm font-bold tracking-wider uppercase">
                      Soporte Técnico
                    </h3>
                    <p className="text-primary font-mono">+34 900 123 456</p>
                    <p className="text-on-surface-variant font-body mt-1 text-xs">
                      Lun-Vie, 9:00 - 18:00 CET
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
