import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Mail, MapPin, Phone } from 'lucide-react';

import { ContactForm } from './contact-form';

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('PublicContact');

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-4 pt-16 pb-24 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <span className="eyebrow text-muted-foreground mb-4 block">{t('eyebrow')}</span>
          <h1 className="text-foreground mb-4 max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg">{t('lead')}</p>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
          {/* Form */}
          <div className="lg:col-span-7">
            <div className="border-border rounded-2xl border p-6 sm:p-8">
              <ContactForm />
            </div>
          </div>

          {/* Contact details */}
          <div className="flex flex-col justify-start space-y-6 lg:col-span-5">
            <div className="bg-surface-2 rounded-2xl p-8">
              <h2 className="text-foreground mb-6 text-xl font-bold">
                {t('contact_section_title')}
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(217,33,33,0.08)' }}>
                    <MapPin
                      className="size-5"
                      style={{ color: 'var(--color-poppy)' }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h3 className="text-foreground mb-1 text-sm font-bold tracking-wider uppercase">
                      {t('location_label')}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t('location_city')}
                      <br />
                      {t('location_sub')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(217,33,33,0.08)' }}>
                    <Mail
                      className="size-5"
                      style={{ color: 'var(--color-poppy)' }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h3 className="text-foreground mb-1 text-sm font-bold tracking-wider uppercase">
                      {t('email_label')}
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
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(217,33,33,0.08)' }}>
                    <Phone
                      className="size-5"
                      style={{ color: 'var(--color-poppy)' }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h3 className="text-foreground mb-1 text-sm font-bold tracking-wider uppercase">
                      {t('support_label')}
                    </h3>
                    <p className="text-muted-foreground text-sm">{t('support_channel')}</p>
                    <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {t('support_hours')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ background: 'var(--color-ink)' }}>
              <p
                className="mb-1 font-mono text-xs font-semibold tracking-wider uppercase"
                style={{ color: 'var(--color-gold)' }}>
                {t('response_label')}
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-bone)' }}>
                {t('response_time')}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'rgba(245,236,218,0.5)' }}>
                {t('response_days')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
