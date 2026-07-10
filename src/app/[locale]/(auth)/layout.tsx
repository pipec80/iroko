import { appConfig } from '@/config/app.config';
import { Link } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import React from 'react';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Left: form pane ── */}
      <div className="flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-105">
          {/* Logo mark */}
          <Link href="/" className="mb-10 flex items-center gap-2">
            <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="var(--color-ink)" />
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
            <span className="wordmark text-foreground text-[22px]">{appConfig.brand}</span>
          </Link>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
        </div>
      </div>

      {/* ── Right: ink brand panel ── */}
      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden lg:block"
        style={{ background: 'var(--color-ink)' }}>
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(245,236,218,0.05) 1px, transparent 1px),' +
              'linear-gradient(to bottom, rgba(245,236,218,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Top-right glow */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(184,81,58,0.18), transparent 60%)',
          }}
        />

        {/* Editorial content */}
        <div className="relative z-10 flex h-full max-w-[560px] flex-col justify-center gap-6 px-16 py-14">
          <span className="eyebrow" style={{ color: '#d9a441' }}>
            Proverbio Akan
          </span>

          <blockquote
            className="m-0 font-sans leading-[1.3] font-bold italic"
            style={{ fontSize: 32, color: '#f5ecda' }}>
            &ldquo;Antes de cortar el iroko, se le pide permiso al espíritu del árbol — porque sin
            tronco, no hay ramas.&rdquo;
          </blockquote>

          <hr
            style={{ width: 80, borderTopWidth: 1, borderColor: 'rgba(217,164,65,0.4)', margin: 0 }}
          />

          {/* HUD ring */}
          <svg viewBox="0 0 200 200" width="200" height="200">
            <defs>
              <radialGradient id="hud-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,58,58,0.35)" />
                <stop offset="100%" stopColor="rgba(255,58,58,0)" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="92" fill="url(#hud-glow)" />
            <g stroke="rgba(230,232,235,0.12)" strokeWidth="0.5" fill="none">
              <circle cx="100" cy="100" r="90" />
              <circle cx="100" cy="100" r="60" />
              <circle cx="100" cy="100" r="30" />
              <line x1="100" y1="0" x2="100" y2="200" />
              <line x1="0" y1="100" x2="200" y2="100" />
            </g>
            <circle cx="100" cy="100" r="70" fill="none" stroke="#ff3a3a" strokeWidth="2" />
            <circle
              cx="100"
              cy="100"
              r="40"
              fill="none"
              stroke="#4682bf"
              strokeWidth="1.6"
              strokeDasharray="3 4"
            />
            <circle cx="100" cy="100" r="14" fill="#0047ab" />
            <circle cx="100" cy="100" r="5" fill="#ff3a3a" />
            <circle cx="100" cy="30" r="4" fill="#ff3a3a" />
            <circle cx="170" cy="100" r="4" fill="#4682bf" />
            <circle cx="100" cy="170" r="4" fill="#ff3a3a" />
            <circle cx="30" cy="100" r="4" fill="#4682bf" />
          </svg>

          {/* Stats footer */}
          <div
            className="grid grid-cols-3 gap-9 border-t pt-6"
            style={{ borderColor: 'rgba(245,236,218,0.14)' }}>
            {[
              { val: '1.0', label: 'VERSION' },
              { val: '23', label: 'COMMITS' },
              { val: '∞', label: 'RAMAS' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div
                  className="font-mono leading-none font-semibold"
                  style={{ fontSize: 32, letterSpacing: '-0.04em', color: '#f5ecda' }}>
                  {val}
                </div>
                <div
                  className="eyebrow mt-1"
                  style={{ fontSize: 9, color: 'rgba(245,236,218,0.5)' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
