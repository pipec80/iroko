'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useCspNonce } from './csp-nonce-provider';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [initialNonce] = React.useState(props.nonce);
  const nonce = useCspNonce() ?? initialNonce;
  return (
    <NextThemesProvider {...props} nonce={nonce}>
      {children}
    </NextThemesProvider>
  );
}
