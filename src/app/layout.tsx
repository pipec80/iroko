import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { getLocale } from 'next-intl/server';

import { env } from '@/env';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { CspNonceProvider } from '@/components/providers/csp-nonce-provider';
import { appConfig } from '@/config/app.config';

import './globals.css';

// Geist (SIL OFL 1.1) is vendored as latin-subset variable fonts so builds never
// depend on reaching fonts.googleapis.com, which failed CI intermittently.
const geistSans = localFont({
  src: './fonts/Geist-latin.woff2',
  variable: '--font-sans',
  weight: '100 900',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/GeistMono-latin.woff2',
  variable: '--font-mono',
  weight: '400 700',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5ecda' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1117' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s | ${appConfig.name}`,
  },
  description: appConfig.description,
  metadataBase: new URL(env.SITE_URL),
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: appConfig.name,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
  manifest: '/site.webmanifest',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <CspNonceProvider nonce={nonce}>
          <ThemeProvider
            nonce={nonce}
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </CspNonceProvider>
      </body>
    </html>
  );
}
