import type { Metadata, Viewport } from 'next';

import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5ecda' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1117' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'Iroko',
    template: '%s | Iroko',
  },
  description: 'El tronco común para tus micro-SaaS.',
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Iroko',
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

// html/body are provided by [locale]/layout.tsx so lang is dynamic per locale.
// This root layout exists only for metadata, viewport, and global CSS.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
