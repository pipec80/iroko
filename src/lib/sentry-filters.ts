import type { ErrorEvent } from '@sentry/nextjs';

// Chunk load failures and generic network errors are almost always caused
// by the user's connection or a stale deploy mid-navigation, not an
// actionable bug — dropped on both client and server.
const NOISE_PATTERNS = /ChunkLoadError|Loading chunk|NetworkError/;

// Next 16 (cacheComponents): expected prerender interruption when a layout
// reads cookies() — React handles it and the route falls back to dynamic.
// This is a Next.js control-flow signal, not an error (IROKO-6 was this,
// surfaced only from local E2E runs). Server-only: never observed client-side.
const NEXT_PRERENDER_INTERRUPT_PATTERNS =
  /During prerendering, `cookies\(\)` rejects|HangingPromiseRejectionError/;

function eventMessage(event: ErrorEvent): string {
  return event.exception?.values?.[0]?.value ?? '';
}

/** Sentry beforeSend filter for the client SDK (instrumentation-client.ts). */
export function shouldFilterClientEvent(event: ErrorEvent): boolean {
  return NOISE_PATTERNS.test(eventMessage(event));
}

/** Sentry beforeSend filter for the server SDK (sentry.server.config.ts). */
export function shouldFilterServerEvent(event: ErrorEvent): boolean {
  const message = eventMessage(event);
  return NOISE_PATTERNS.test(message) || NEXT_PRERENDER_INTERRUPT_PATTERNS.test(message);
}
