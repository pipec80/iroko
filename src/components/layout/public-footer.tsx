import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';

const FOOTER_LINKS = {
  producto: [
    { label: 'Características', href: '/product' },
    { label: 'Precios', href: '/pricing' },
    { label: 'Changelog', href: '#' },
    { label: 'Roadmap', href: '#' },
  ],
  recursos: [
    { label: 'Documentación', href: '#' },
    { label: 'Guía de inicio', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Estado del servicio', href: '#' },
  ],
  compania: [
    { label: 'Acerca de', href: '#' },
    { label: 'Contacto', href: '/contact' },
    { label: 'Privacidad', href: '#' },
    { label: 'Términos', href: '#' },
  ],
};

export function PublicFooter() {
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
              El tronco común para tus micro-SaaS. Autenticación, organizaciones, billing e i18n —
              todo cableado y listo para desplegar.
            </p>
            <p className="font-mono text-xs" style={{ color: 'rgba(245,236,218,0.3)' }}>
              © 2026 {appConfig.brand} · v1.0
            </p>
          </div>

          {/* Producto */}
          <div className="flex flex-col gap-4">
            <p className="eyebrow text-xs" style={{ color: 'var(--color-gold)' }}>
              Producto
            </p>
            {FOOTER_LINKS.producto.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: 'rgba(245,236,218,0.5)' }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Recursos */}
          <div className="flex flex-col gap-4">
            <p className="eyebrow text-xs" style={{ color: 'var(--color-gold)' }}>
              Recursos
            </p>
            {FOOTER_LINKS.recursos.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: 'rgba(245,236,218,0.5)' }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Compañía */}
          <div className="flex flex-col gap-4">
            <p className="eyebrow text-xs" style={{ color: 'var(--color-gold)' }}>
              Compañía
            </p>
            {FOOTER_LINKS.compania.map(({ label, href }) => (
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
