import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Mail, MapPin, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
              <form className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-foreground block text-sm font-semibold" htmlFor="name">
                      {t('form_name_label')}
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
                      {t('form_email_label')}
                    </Label>
                    <Input
                      className="h-11"
                      id="email"
                      name="email"
                      placeholder="jane@company.com"
                      type="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    className="text-foreground block text-sm font-semibold"
                    htmlFor="company_size">
                    {t('form_size_label')}
                  </Label>
                  <div className="relative">
                    <select
                      className="border-border bg-background text-foreground focus:ring-primary h-11 w-full cursor-pointer appearance-none rounded-md border px-4 py-2 text-sm shadow-sm transition-all focus:ring-1 focus:outline-none"
                      id="company_size"
                      name="company_size"
                      defaultValue="">
                      <option disabled value="">
                        {t('form_size_placeholder')}
                      </option>
                      <option value="solo">{t('form_size_solo')}</option>
                      <option value="2-5">{t('form_size_2_5')}</option>
                      <option value="6-20">{t('form_size_6_20')}</option>
                      <option value="20+">{t('form_size_20_plus')}</option>
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
                    {t('form_message_label')}
                  </Label>
                  <textarea
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full resize-none rounded-md border px-4 py-3 text-sm shadow-sm transition-all focus:ring-1 focus:outline-none"
                    id="message"
                    name="message"
                    placeholder={t('form_message_placeholder')}
                    rows={5}
                  />
                </div>

                <Button
                  type="button"
                  className="h-11 w-full sm:w-auto sm:px-10"
                  style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
                  {t('form_submit')}
                </Button>
              </form>
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
