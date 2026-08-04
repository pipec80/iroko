import { expect, test } from '@playwright/test';

/**
 * Regression for the bug fixed in PR #91: next-intl's locale middleware
 * intercepted /sentry-tunnel (withSentryConfig's tunnelRoute, next.config.ts)
 * and 307-redirected it to /es/sentry-tunnel, where the tunnel rewrite doesn't
 * exist — the browser SDK's POST 404'd and every client-side event was lost.
 * src/proxy.ts now excludes sentry-tunnel from its matcher; this asserts the
 * proxy itself, not whether the request ultimately reaches Sentry's ingest.
 */

test.describe('Sentry tunnel', () => {
  test('POST /sentry-tunnel is not locale-redirected by the proxy', async ({ request }) => {
    const response = await request.post('/sentry-tunnel', {
      data: '',
      maxRedirects: 0,
    });

    expect(response.status()).not.toBe(307);
  });
});
