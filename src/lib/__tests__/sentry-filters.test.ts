import { describe, it, expect } from 'vitest';
import type { ErrorEvent } from '@sentry/nextjs';

import { shouldFilterClientEvent, shouldFilterServerEvent } from '../sentry-filters';

function eventWithMessage(message: string): ErrorEvent {
  return { exception: { values: [{ value: message }] } } as ErrorEvent;
}

const NOISE_MESSAGES = [
  'ChunkLoadError: Loading chunk 42 failed',
  'Loading chunk 7 failed after 3 retries',
  'NetworkError when attempting to fetch resource',
];

describe('shouldFilterClientEvent', () => {
  it.each(NOISE_MESSAGES)('filters out noise: %s', (message) => {
    expect(shouldFilterClientEvent(eventWithMessage(message))).toBe(true);
  });

  it('does not filter an actionable error', () => {
    expect(shouldFilterClientEvent(eventWithMessage('TypeError: cannot read x of undefined'))).toBe(
      false,
    );
  });

  it('does not filter the Next 16 prerender interruption — server-only concern', () => {
    expect(
      shouldFilterClientEvent(
        eventWithMessage('During prerendering, `cookies()` rejects because...'),
      ),
    ).toBe(false);
  });

  it('treats a missing exception value as non-noise (empty string never matches)', () => {
    expect(shouldFilterClientEvent({} as ErrorEvent)).toBe(false);
  });
});

describe('shouldFilterServerEvent', () => {
  it.each(NOISE_MESSAGES)('filters out the same noise as the client: %s', (message) => {
    expect(shouldFilterServerEvent(eventWithMessage(message))).toBe(true);
  });

  it('filters the Next 16 prerender cookies() interruption (IROKO-6)', () => {
    expect(
      shouldFilterServerEvent(
        eventWithMessage('During prerendering, `cookies()` rejects because it can be interrupted'),
      ),
    ).toBe(true);
  });

  it('filters HangingPromiseRejectionError', () => {
    expect(
      shouldFilterServerEvent(eventWithMessage('HangingPromiseRejectionError: the promise hung')),
    ).toBe(true);
  });

  it('does not filter an actionable server error', () => {
    expect(shouldFilterServerEvent(eventWithMessage('Error: RPC connection refused'))).toBe(false);
  });
});
