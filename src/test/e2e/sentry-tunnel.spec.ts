import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

/**
 * Regression for the bug fixed in PR #91: next-intl's locale middleware
 * intercepted /sentry-tunnel (withSentryConfig's tunnelRoute, next.config.ts)
 * and 307-redirected it to /es/sentry-tunnel, where the tunnel rewrite doesn't
 * exist — the browser SDK's POST 404'd and every client-side event was lost.
 * src/proxy.ts now excludes sentry-tunnel from its matcher; this asserts the
 * proxy itself, not whether the request ultimately reaches Sentry's ingest.
 */

/**
 * The tunnel rewrite `withSentryConfig` injects (@sentry/nextjs
 * config/withSentryConfig/tunnel.ts) only matches requests carrying
 * `?o=<orgId>&p=<projectId>[&r=<region>]` — the browser SDK appends these
 * itself when it builds the tunnel URL from the DSN. It is NOT a generic
 * relay keyed off the envelope body's own `dsn` field. Parsing the DSN here
 * mirrors exactly what the SDK does, so the smoke check exercises the same
 * match the rewrite requires.
 */
function parseDsnForTunnel(dsn: string): { orgId: string; projectId: string; region?: string } {
  const dsnMatch = /^https?:\/\/[^@]+@([^/]+)\/(\d+)$/.exec(dsn);
  const host = dsnMatch?.[1];
  const projectId = dsnMatch?.[2];
  if (!host || !projectId) throw new Error(`Unexpected NEXT_PUBLIC_SENTRY_DSN shape: ${dsn}`);

  const hostMatch = /^o(\d+)\.ingest\.(?:([a-z]{2,3})\.)?sentry\.io$/.exec(host);
  const orgId = hostMatch?.[1];
  if (!orgId) throw new Error(`Unexpected Sentry DSN host shape: ${host}`);

  return { orgId, projectId, region: hostMatch[2] };
}

test.describe('Sentry tunnel', () => {
  test('POST /sentry-tunnel is not locale-redirected by the proxy', async ({ request }) => {
    const response = await request.post('/sentry-tunnel', {
      data: '',
      maxRedirects: 0,
    });

    expect(response.status()).not.toBe(307);
  });

  // Cloud-only (AUD-024, docs/runbooks/sentry-tunnel-smoke.md): the test above
  // only proves the proxy stops redirecting — it never proves an event
  // survives the full round trip to Sentry's real ingest. That gap is exactly
  // how AUD-005 stayed silent until a manual check found it. This test sends
  // a real envelope to the tunnel URL shaped exactly like the browser SDK
  // shapes it (query params carrying org/project, matched by the rewrite
  // withSentryConfig injects) — a 200 here is Sentry's own confirmation, not
  // an artifact of our code. Guarded to nightly/production only
  // (PLAYWRIGHT_BASE_URL) so every PR run against local Supabase doesn't
  // spend the Sentry free-tier error quota.
  test('Cloud @smoke: a real envelope through /sentry-tunnel reaches Sentry', async ({
    request,
  }) => {
    test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Cloud-only — requires the deployed Sentry DSN');

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) throw new Error('NEXT_PUBLIC_SENTRY_DSN is required for this Cloud smoke check');

    const { orgId, projectId, region } = parseDsnForTunnel(dsn);
    const tunnelUrl = `/sentry-tunnel?o=${orgId}&p=${projectId}${region ? `&r=${region}` : ''}`;

    const eventId = randomUUID().replace(/-/g, '');
    const event = {
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: 'javascript',
      level: 'info',
      message: 'Cloud smoke check — /sentry-tunnel round trip (automated, safe to ignore)',
      tags: { smoke_check: 'sentry_tunnel_cloud' },
      // Stable fingerprint: every nightly run folds into the same Sentry
      // issue instead of creating a new one per run.
      fingerprint: ['sentry-tunnel-cloud-smoke-check'],
      environment: 'ci-smoke',
    };
    const envelopeHeader = { event_id: eventId, sent_at: new Date().toISOString(), dsn };
    const itemPayload = JSON.stringify(event);
    const itemHeader = { type: 'event', length: Buffer.byteLength(itemPayload) };
    const envelope = [JSON.stringify(envelopeHeader), JSON.stringify(itemHeader), itemPayload].join(
      '\n',
    );

    const response = await request.post(tunnelUrl, {
      data: envelope,
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    });

    expect(response.status()).toBe(200);
  });
});
