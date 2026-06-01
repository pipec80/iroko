import { setRequestLocale } from 'next-intl/server';
import { Mail, MapPin, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-4 pt-16 pb-24 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <span className="eyebrow text-muted-foreground mb-4 block">Contacto</span>
          <h1 className="text-foreground mb-4 max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">
            ¿Tienes preguntas? Estamos aquí.
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg">
            Cuéntanos tu proyecto y te responderemos en menos de 24 horas.
          </p>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
          {/* Form */}
          <div className="lg:col-span-7">
            <div className="border-border rounded-2xl border p-6 sm:p-8">
              {/* Form has no action — submit logic is handled by backend integration */}
              <form className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-foreground block text-sm font-semibold" htmlFor="name">
                      Nombre completo
                    </Label>
                    <Input
                      className="h-11"
                      id="name"
                      name="name"
                      placeholder="Jane Doe"
                      type="text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground block text-sm font-semibold" htmlFor="email">
                      Email
                    </Label>
                    <Input
                      className="h-11"
                      id="email"
                      name="email"
                      placeholder="jane@empresa.com"
                      type="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    className="text-foreground block text-sm font-semibold"
                    htmlFor="company_size">
                    Tamaño del equipo
                  </Label>
                  <div className="relative">
                    <select
                      className="border-border bg-background text-foreground focus:ring-primary h-11 w-full cursor-pointer appearance-none rounded-md border px-4 py-2 text-sm shadow-sm transition-all focus:ring-1 focus:outline-none"
                      id="company_size"
                      name="company_size"
                      defaultValue="">
                      <option disabled value="">
                        Selecciona una opción
                      </option>
                      <option value="solo">Solo (indie hacker)</option>
                      <option value="2-5">2 - 5 personas</option>
                      <option value="6-20">6 - 20 personas</option>
                      <option value="20+">Más de 20 personas</option>
                    </select>
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
                      <svg
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground block text-sm font-semibold" htmlFor="message">
                    Mensaje
                  </Label>
                  <textarea
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full resize-none rounded-md border px-4 py-3 text-sm shadow-sm transition-all focus:ring-1 focus:outline-none"
                    id="message"
                    name="message"
                    placeholder="Cuéntanos sobre tu proyecto..."
                    rows={5}
                  />
                </div>

                <Button
                  type="button"
                  className="h-11 w-full sm:w-auto sm:px-10"
                  style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
                  Enviar mensaje →
                </Button>
              </form>
            </div>
          </div>

          {/* Contact details */}
          <div className="flex flex-col justify-start space-y-6 lg:col-span-5">
            <div className="bg-surface-2 rounded-2xl p-8">
              <h2 className="text-foreground mb-6 text-xl font-bold">Contacto directo</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(217,33,33,0.08)' }}>
                    <MapPin
                      className="size-5"
                      style={{ color: 'var(--color-poppy)' }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h3 className="text-foreground mb-1 text-sm font-bold tracking-wider uppercase">
                      Ubicación
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Madrid, España
                      <br />
                      Remote-first 🌍
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(217,33,33,0.08)' }}>
                    <Mail
                      className="size-5"
                      style={{ color: 'var(--color-poppy)' }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h3 className="text-foreground mb-1 text-sm font-bold tracking-wider uppercase">
                      Email
                    </h3>
                    <a
                      className="text-muted-foreground hover:text-foreground font-mono text-sm transition-colors"
                      href="mailto:hola@iroko.dev">
                      hola@iroko.dev
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(217,33,33,0.08)' }}>
                    <Phone
                      className="size-5"
                      style={{ color: 'var(--color-poppy)' }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h3 className="text-foreground mb-1 text-sm font-bold tracking-wider uppercase">
                      Soporte
                    </h3>
                    <p className="text-muted-foreground text-sm">Discord privado</p>
                    <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                      Lun–Vie, 9:00–18:00 CET
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ background: 'var(--color-ink)' }}>
              <p
                className="mb-1 font-mono text-xs font-semibold tracking-wider uppercase"
                style={{ color: 'var(--color-gold)' }}>
                Tiempo de respuesta
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-bone)' }}>
                &lt; 24 horas
              </p>
              <p className="mt-1 text-sm" style={{ color: 'rgba(245,236,218,0.5)' }}>
                En días laborables.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
