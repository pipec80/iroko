'use client';

import * as React from 'react';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';
import { Toaster } from '@/components/ui/sonner';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import { appConfig } from '@/config/app.config';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster position="top-right" richColors closeButton />
        {appConfig.features.cookieConsent && <CookieConsentBanner />}
      </ThemeProvider>
    </QueryProvider>
  );
}
