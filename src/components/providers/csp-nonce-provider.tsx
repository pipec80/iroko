'use client';

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

const NonceContext = createContext<string | undefined>(undefined);

/** RSC responses cannot replace the nonce associated with the already-running document. */
export function CspNonceProvider({ nonce, children }: { nonce?: string; children: ReactNode }) {
  const [documentNonce] = useState(nonce);
  return <NonceContext.Provider value={documentNonce}>{children}</NonceContext.Provider>;
}

export function useCspNonce(): string | undefined {
  return useContext(NonceContext);
}
