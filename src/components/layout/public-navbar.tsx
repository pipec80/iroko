'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';

export function PublicNavbar() {
  const t = useTranslations('PublicNav');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: t('link_product'), href: '/product' },
    { label: t('link_pricing'), href: '/pricing' },
  ];

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
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
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Button variant="ghost" asChild className="h-9 text-sm">
            <Link href="/login">{t('login')}</Link>
          </Button>
          <Button
            asChild
            className="h-9 text-sm"
            style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
            <Link href="/signup">{t('get_started')}</Link>
          </Button>
        </div>

        <div className="ml-auto flex items-center lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('open_menu')}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="text-left">{appConfig.brand}</SheetTitle>
                <SheetDescription className="sr-only">{t('menu_description')}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-4 pb-4">
                <nav className="flex flex-col gap-4">
                  {navLinks.map(({ label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="text-foreground hover:text-primary text-base font-semibold transition-colors">
                      {label}
                    </Link>
                  ))}
                </nav>
                <hr className="border-border" />
                <div className="flex flex-col gap-3">
                  <Button variant="outline" asChild className="w-full justify-center">
                    <Link href="/login" onClick={() => setOpen(false)}>
                      {t('login')}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full justify-center"
                    style={{ background: 'var(--color-ink)', color: 'var(--color-bone)' }}>
                    <Link href="/signup" onClick={() => setOpen(false)}>
                      {t('get_started')}
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
