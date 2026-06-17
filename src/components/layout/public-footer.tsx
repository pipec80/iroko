import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';

export async function PublicFooter() {
  const t = await getTranslations('PublicFooter');

  const footerLinks = {
    product: [
      { label: t('link_features'), href: '/product' },
      { label: t('link_pricing'), href: '/pricing' },
      { label: t('link_changelog'), href: '#' },
      { label: t('link_roadmap'), href: '#' },
    ],
    resources: [
      { label: t('link_docs'), href: '#' },
      { label: t('link_getting_started'), href: '#' },
      { label: t('link_blog'), href: '#' },
      { label: t('link_status'), href: '#' },
    ],
    company: [
      { label: t('link_about'), href: '#' },
      { label: t('link_contact'), href: '/contact' },
      { label: t('link_privacy'), href: '#' },
      { label: t('link_terms'), href: '#' },
    ],
  };

  return (
    <footer style={{ background: 'var(--color-ink)' }}>
      <div className="mx-auto max-w-7xl px-8 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="flex flex-col gap-6">
            <Link href="/" className="flex items-center gap-2">
              <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
                <rect width="32" height="32" rx="6" fill="var(--color-bone)" fillOpacity="0.08" />
                <circle
                  cx="16"
                  cy="16"
                  r="10"
                  fill="none"
                  stroke="var(--color-poppy)"
                  strokeWidth="2.2"
                />
                <circle cx="16" cy="16" r="3.5" fill="var(--color-cobalt)" />
              </svg>
              <span className="wordmark text-[20px]" style={{ color: 'var(--color-bone)' }}>
                {appConfig.brand}
              </span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,236,218,0.5)' }}>
              {t('brand_description')}
            </p>
            <p className="font-mono text-xs" style={{ color: 'rgba(245,236,218,0.3)' }}>
              © 2026 {appConfig.brand} · v1.0
            </p>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-4">
            <p className="eyebrow text-xs" style={{ color: 'var(--color-gold)' }}>
              {t('section_product')}
            </p>
            {footerLinks.product.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: 'rgba(245,236,218,0.5)' }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-4">
            <p className="eyebrow text-xs" style={{ color: 'var(--color-gold)' }}>
              {t('section_resources')}
            </p>
            {footerLinks.resources.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: 'rgba(245,236,218,0.5)' }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div className="flex flex-col gap-4">
            <p className="eyebrow text-xs" style={{ color: 'var(--color-gold)' }}>
              {t('section_company')}
            </p>
            {footerLinks.company.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: 'rgba(245,236,218,0.5)' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className="mt-16 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row"
          style={{ borderColor: 'rgba(245,236,218,0.1)' }}>
          <p className="font-mono text-xs" style={{ color: 'rgba(245,236,218,0.25)' }}>
            {appConfig.name.toUpperCase()} · MICRO-SAAS BOILERPLATE · MADE WITH NEXT.JS 16 +
            SUPABASE
          </p>
          <p className="font-mono text-xs" style={{ color: 'rgba(245,236,218,0.25)' }}>
            BUILD · REBRAND · DEPLOY · REPEAT
          </p>
        </div>
      </div>
    </footer>
  );
}
