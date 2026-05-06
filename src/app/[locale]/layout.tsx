import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Providers } from '@/components/providers';
import '../globals.css';
import { routing } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const jakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'SaaS Boilerplate',
  description: 'Enterprise SaaS Boilerplate with Next.js 16',
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validación rápida de locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Activa el soporte para renderizado estático
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${jakartaSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <I18nProvider locale={locale}>
            <Providers>{children}</Providers>
          </I18nProvider>
        </Suspense>
      </body>
    </html>
  );
}

// Componente interno para cargar mensajes sin bloquear el shell del HTML
async function I18nProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
