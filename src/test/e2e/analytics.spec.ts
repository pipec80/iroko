import { expect, test, type Page, type Route } from '@playwright/test';

import { test as adminTest } from './fixtures/platform-admin';
import {
  deleteUserByEmail,
  fetchLatestMessageTo,
  querySqlAsPostgres,
  uniqueEmail,
} from './helpers';

/**
 * PostHog analytics E2E (Plan 006). Intercepts every request to the /ingest
 * reverse proxy and fulfills it locally — nothing here ever reaches the real
 * PostHog project, even though .env.local carries a real project token.
 *
 * Payload parsing is best-effort: posthog-js's wire format (single event vs.
 * batch, plain JSON vs. urlencoded `data=`) isn't pinned down here, so these
 * tests lean on request COUNT and URL-level checks, which are format-agnostic,
 * rather than asserting exact event names/properties from the request body.
 * distinctId/property correctness is covered precisely by the unit tests in
 * src/lib/analytics/__tests__ and the action-level `__tests__/actions.test.ts`
 * files touched by Plan 006 — this suite verifies the wiring end-to-end.
 */

const INGEST_GLOB = '**/ingest/**';

/**
 * posthog-js's built-in bot filter (`_is_bot()`, on by default via
 * `opt_out_useragent_filter: false`) hardcodes "headlesschrome" in its
 * blocklist and also inspects `navigator.userAgentData.brands`. Playwright's
 * Chromium trips both — the real UA string in headless mode, and (even after
 * spoofing just the UA) the Client Hints brands array, which reflects the
 * true browser independently of `navigator.userAgent`. Every `capture()`
 * call is otherwise silently dropped before it ever reaches the request
 * queue: no network request, no thrown error, no console warning (posthog's
 * own logger is itself gated behind a debug flag we don't set). Spoofing
 * `navigator.webdriver` alone (the SDK's other bot signal) is not enough —
 * the UA-string check runs first and short-circuits to `true` regardless.
 */
async function unmaskFromBotDetection(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgent', {
      get: () =>
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    if ('userAgentData' in navigator) {
      Object.defineProperty(navigator, 'userAgentData', {
        get: () => ({
          brands: [
            { brand: 'Not_A Brand', version: '8' },
            { brand: 'Chromium', version: '131' },
            { brand: 'Google Chrome', version: '131' },
          ],
          mobile: false,
          platform: 'Windows',
        }),
      });
    }
  });
}

/**
 * Intercepts and fulfills every /ingest request without letting it reach the
 * network. posthog-js loads some /ingest paths as executable <script> tags
 * (`static/tracing-headers.js`, `array/<token>/config.js`) — fulfilling those
 * with a JSON body breaks parsing (`{"status":1}` evaluated as a script is a
 * block statement, not an object literal, so `"status":1` throws a
 * SyntaxError) and left the SDK unable to ever flush its capture queue. Each
 * path gets a response shaped like what it actually expects.
 */
async function interceptIngest(page: Page): Promise<{ count: () => number; urls: string[] }> {
  await unmaskFromBotDetection(page);
  const urls: string[] = [];
  await page.route(INGEST_GLOB, async (route: Route) => {
    const url = route.request().url();
    urls.push(url);
    const isJs = new URL(url).pathname.endsWith('.js');
    // .endsWith('.js') on the full URL breaks for tracing-headers.js?v=1.411.0
    // — the query string means it never ends in ".js", so only pathname counts.
    if (isJs) {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '// mock\n',
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
  });
  return { count: () => urls.length, urls };
}

/** True if any intercepted request's URL or raw POST body contains `needle`. */
function requestsContain(urls: string[], needle: string): boolean {
  return urls.some((u) => u.includes(needle));
}

/**
 * True for a request that can carry captured event/identity data — false for
 * posthog-js's own static asset and remote-config bootstrap requests
 * (`/ingest/static/...`, `/ingest/array/<token>/config...`), which fire on
 * every `posthog.init()` regardless of consent-at-runtime or identity and
 * carry no user data. Every full navigation (`page.goto`) re-runs init from
 * scratch, so counting raw `/ingest` traffic would count this SDK bootstrap
 * noise as if it were a captured event — this filter is what makes an
 * "an event fired" or "no event fired" assertion meaningful.
 */
function isCaptureRequest(url: string): boolean {
  return !url.includes('/ingest/static/') && !url.includes('/ingest/array/');
}

function countCaptureRequests(urls: string[]): number {
  return urls.filter(isCaptureRequest).length;
}

test.describe('Analytics — consent gating', () => {
  test('sends nothing to /ingest before the visitor responds to the consent banner', async ({
    page,
    context,
  }) => {
    const ingest = await interceptIngest(page);
    await context.clearCookies();

    await page.goto('/es');
    await expect(page.getByTestId('cookie-consent-banner')).toBeVisible();
    // Give a would-be premature init a moment to fire before asserting silence.
    await page.waitForTimeout(1500);

    // Zero of everything — the SDK must not even load pre-consent, so this
    // stays a raw count (no bootstrap traffic should exist either).
    expect(ingest.count()).toBe(0);
  });

  test('accepting analytics starts sending capture requests', async ({ page, context }) => {
    const ingest = await interceptIngest(page);
    await context.clearCookies();

    await page.goto('/es');
    await page.getByTestId('cookie-consent-accept-all').click();
    await expect(page.getByTestId('cookie-consent-banner')).not.toBeVisible();

    await expect
      .poll(() => countCaptureRequests(ingest.urls), { timeout: 10_000 })
      .toBeGreaterThan(0);
  });

  test('rejecting non-essential cookies keeps analytics off', async ({ page, context }) => {
    const ingest = await interceptIngest(page);
    await context.clearCookies();

    await page.goto('/es');
    await page.getByTestId('cookie-consent-reject').click();
    await expect(page.getByTestId('cookie-consent-banner')).not.toBeVisible();
    await page.waitForTimeout(1500);

    // The SDK never loads without consent, so no bootstrap traffic either.
    expect(ingest.count()).toBe(0);
  });

  test('revoking from the footer "cookie preferences" link after accepting stops further capture', async ({
    page,
    context,
  }) => {
    const ingest = await interceptIngest(page);
    await context.clearCookies();

    await page.goto('/es');
    await page.getByTestId('cookie-consent-accept-all').click();
    await expect.poll(() => ingest.count(), { timeout: 10_000 }).toBeGreaterThan(0);

    // Reopen from the footer — this must NOT itself wipe the existing choice
    // (see cookie-consent.ts's reopenConsentBanner), only an explicit Reject does.
    await page.getByRole('button', { name: /preferencias de cookies/i }).click();
    await expect(page.getByTestId('cookie-consent-banner')).toBeVisible();
    await page.getByTestId('cookie-consent-reject').click();
    await expect(page.getByTestId('cookie-consent-banner')).not.toBeVisible();

    // posthog-js batches captures (~3s default flush interval) and, as a
    // last-chance mechanism, flushes anything still queued via sendBeacon on
    // page unload — so a pageview captured just before the reject click can
    // still leave the browser after it, on the next navigation. Outlasting
    // the flush interval here means that straggler lands in `countAtRevoke`
    // instead of leaking into the post-navigation comparison below.
    await page.waitForTimeout(3500);
    const countAtRevoke = ingest.count();
    await page.goto('/es/pricing');
    await page.waitForTimeout(1500);

    // disableAnalytics() nulls the instance, so the next navigation never
    // re-runs posthog.init() at all — no bootstrap traffic either.
    expect(ingest.count()).toBe(countAtRevoke);
  });

  test('navigating between pages does not runaway-duplicate capture requests', async ({
    page,
    context,
  }) => {
    const ingest = await interceptIngest(page);
    await context.clearCookies();

    await page.goto('/es');
    await page.getByTestId('cookie-consent-accept-all').click();
    await expect.poll(() => ingest.count(), { timeout: 10_000 }).toBeGreaterThan(0);
    const afterFirstLoad = ingest.count();

    await page.goto('/es/pricing');
    await page.waitForTimeout(2000);

    // Each full navigation re-runs posthog.init() from scratch (bootstrap
    // requests + one manual pageview) — bounded generously so a real
    // double-init/re-fired-effect bug (which would roughly double this)
    // still fails the test.
    const addedByOneNavigation = ingest.count() - afterFirstLoad;
    expect(addedByOneNavigation).toBeGreaterThan(0);
    expect(addedByOneNavigation).toBeLessThanOrEqual(8);
  });
});

test.describe('Analytics — signup to project funnel', () => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), 'requires local Supabase (127.0.0.1:54321)');
  test.setTimeout(120_000);

  test('signup → onboarding → project_created fire in order, with no PII in any request', async ({
    page,
    context,
    request,
  }) => {
    const ingest = await interceptIngest(page);
    await context.clearCookies();

    const email = uniqueEmail('e2e+analytics');
    const password = 'TestPass123!';
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';

    await page.goto('/es');
    await page.getByTestId('cookie-consent-accept-all').click();
    await expect
      .poll(() => countCaptureRequests(ingest.urls), { timeout: 10_000 })
      .toBeGreaterThan(0);

    // 1. signup_started fires on submit (client) — count must grow past the
    // fresh page load's own pageview/bootstrap baseline.
    const beforeSignup = countCaptureRequests(ingest.urls);
    await page.goto('/es/signup');
    await page.locator('input[name="first_name"]').fill('Ada');
    await page.locator('input[name="last_name"]').fill('Lovelace');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/es\/signup\/confirmation/, { timeout: 20_000 });
    await expect
      .poll(() => countCaptureRequests(ingest.urls), { timeout: 10_000 })
      .toBeGreaterThan(beforeSignup);

    // 2. Confirm via Mailpit (signup_completed + account_created fire server-side here).
    const { confirmUrl } = await fetchLatestMessageTo(request, email);
    expect(confirmUrl).not.toBeNull();
    await page.goto(confirmUrl as string);
    await page.getByRole('button', { name: /confirmar cuenta/i }).click();
    await page.waitForURL(/\/es\/dashboard/, { timeout: 20_000 });

    // 3. Onboarding (onboarding_step_completed + onboarding_completed).
    if (page.url().includes('/dashboard/onboarding')) {
      await page.getByLabel('Nombre de la organización').fill('Analytics E2E Org');
      await page.getByRole('button', { name: 'Siguiente' }).click();
      await page.getByRole('button', { name: 'Invitar después' }).click();
      const planNext = page.getByRole('button', { name: 'Siguiente' });
      if (await planNext.isVisible().catch(() => false)) await planNext.click();
      await page.getByRole('button', { name: 'Finalizar' }).click();
      await page.waitForURL(/\/es\/dashboard$/, { timeout: 20_000 });
    }

    // AnalyticsProvider persists the accepted consent to profiles.analytics_consent
    // once the user is authenticated — captureServer()'s webhook fallback
    // (src/lib/analytics/server.ts) depends on this being kept in sync, not
    // just the cookie, since a webhook carries no browser cookie at all.
    await expect
      .poll(
        () =>
          querySqlAsPostgres(
            `SELECT analytics_consent FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = '${email}'`,
          ),
        { timeout: 10_000 },
      )
      .toBe('t');

    // 4. project_created.
    const beforeProject = countCaptureRequests(ingest.urls);
    await page.goto('/es/dashboard/projects');
    const projectName = `analytics-e2e-${Date.now()}`;
    await page
      .getByRole('button', { name: /nuevo proyecto/i })
      .first()
      .click();
    await page.locator('input[name="name"]').fill(projectName);
    await page.getByRole('button', { name: /crear proyecto/i }).click();
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(() => countCaptureRequests(ingest.urls), { timeout: 10_000 })
      .toBeGreaterThan(beforeProject);

    // No PII anywhere in any intercepted request across the whole funnel —
    // best-effort: a raw substring check, meaningful whenever the SDK sends
    // an uncompressed body (typical for small dev/test payloads).
    expect(requestsContain(ingest.urls, email)).toBe(false);
    expect(requestsContain(ingest.urls, password)).toBe(false);
    expect(requestsContain(ingest.urls, 'Ada')).toBe(false);
    expect(requestsContain(ingest.urls, 'Lovelace')).toBe(false);

    await deleteUserByEmail(request, email, serviceKey);
  });
});

test.describe('Analytics — impersonation', () => {
  adminTest(
    'no analytics events fire while an admin is impersonating another user',
    async ({ platformAdmin }) => {
      adminTest.setTimeout(120_000);
      const { page, targetId } = platformAdmin;

      const ingest = await interceptIngest(page);

      // The consent banner is global — accept it as the admin first.
      if (
        await page
          .getByTestId('cookie-consent-banner')
          .isVisible()
          .catch(() => false)
      ) {
        await page.getByTestId('cookie-consent-accept-all').click();
      }

      await page.goto(`/es/dashboard/admin/accounts/${targetId}`);
      await page.getByRole('button', { name: /ver como/i }).click();
      await page.locator('#impersonate-reason').fill('e2e analytics check');
      await page.getByRole('button', { name: /iniciar sesión como este usuario/i }).click();
      await page.waitForURL((url) => url.pathname === '/es/dashboard', { timeout: 20_000 });

      // Bootstrap traffic (static assets, remote config) is harmless SDK
      // plumbing that fires on every posthog.init() call regardless of
      // identity — the real guarantee under test is that no CAPTURE (event
      // carrying data) happens while impersonating, which countCaptureRequests
      // isolates from that noise. Outlast the ~3s batch flush interval first
      // — otherwise the admin's own pre-impersonation pageview (queued while
      // browsing the accounts page, still unflushed) can land after this
      // snapshot and read as a capture that happened during impersonation.
      await page.waitForTimeout(3500);
      const captureCountAtImpersonationStart = countCaptureRequests(ingest.urls);
      await page.goto('/es/dashboard/projects');
      await page.waitForTimeout(2000);

      expect(countCaptureRequests(ingest.urls)).toBe(captureCountAtImpersonationStart);

      // Exit impersonation — best-effort cleanup, not asserted here (covered
      // by impersonation.spec.ts).
      await page.goto('/es/dashboard');
      await page
        .getByRole('button', { name: /^salir$/i })
        .click()
        .catch(() => {});
    },
  );
});
