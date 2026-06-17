'use client';

import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';

const NAV_LINKS = [
  { label: 'Producto', href: '/product' },
  { label: 'Precios', href: '/pricing' },
];

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 right-0 left-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(245,236,218,0.86)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(14,17,23,0.08)' : '1px solid transparent',
      }}>
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-8 py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
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
          <span className="wordmark text-foreground text-[20px]">{appConfig.brand}</span>
        </Link>

        <nav className="hidden grow items-center gap-6 lg:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild className="h-9 text-sm">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button
            asChild
            className="h-9 text-sm"
            style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
            <Link href="/signup">Empezar gratis →</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
