import { expect, test } from '@playwright/test';

import { localE2eBudget } from '../local-e2e-target';

const analyticsScript = `(() => {
  let beforeSend;
  for (const [kind, callback] of window.vaq || []) {
    if (kind === 'beforeSend') beforeSend = callback;
  }
  window.va = (kind, payload) => {
    if (kind === 'beforeSend') { beforeSend = payload; return; }
    if (kind !== 'pageview') return;
    const event = { type: 'pageview', url: location.href, route: '/[locale]' };
    const accepted = beforeSend ? beforeSend(event) : event;
    if (accepted) fetch('/_vercel/insights/view', { method: 'POST', body: JSON.stringify(accepted) });
  };
  window.va('pageview');
})();`;

const speedScript = `(() => {
  let beforeSend;
  for (const [kind, callback] of window.siq || []) {
    if (kind === 'beforeSend') beforeSend = callback;
  }
  window.si = (kind, payload) => {
    if (kind === 'beforeSend') { beforeSend = payload; return; }
    if (kind !== 'vital') return;
    const event = { url: location.href, route: '/[locale]' };
    const accepted = beforeSend ? beforeSend(event) : event;
    if (accepted) fetch('/_vercel/speed-insights/vitals', { method: 'POST', body: JSON.stringify(accepted) });
  };
  window.si('vital');
})();`;

test('Vercel scripts and events require analytics consent, including after revocation', async ({
  page,
  context,
}) => {
  test.setTimeout(localE2eBudget(120_000));
  await context.clearCookies();
  const seen = { analyticsScript: 0, speedScript: 0, analyticsEvent: 0, speedEvent: 0 };
  const analyticsPayloads: string[] = [];
  const speedPayloads: string[] = [];

  await page.route(
    /(?:\/v1\/script\.debug\.js|\/_vercel\/insights\/script\.js)(?:\?.*)?$/,
    async (route) => {
      seen.analyticsScript++;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: analyticsScript,
      });
    },
  );
  await page.route(
    /(?:\/v1\/speed-insights\/script\.debug\.js|\/_vercel\/speed-insights\/script\.js)(?:\?.*)?$/,
    async (route) => {
      seen.speedScript++;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: speedScript,
      });
    },
  );
  await page.route('**/_vercel/insights/view', async (route) => {
    seen.analyticsEvent++;
    analyticsPayloads.push(route.request().postData() ?? '');
    await route.fulfill({ status: 204 });
  });
  await page.route('**/_vercel/speed-insights/vitals', async (route) => {
    seen.speedEvent++;
    speedPayloads.push(route.request().postData() ?? '');
    await route.fulfill({ status: 204 });
  });

  await page.goto('/es?token_hash=SYNTHETIC_TOKEN&email=SYNTHETIC_EMAIL#SYNTHETIC_FRAGMENT');
  await expect(page.getByTestId('cookie-consent-banner')).toBeVisible();
  await page.waitForTimeout(750);
  expect(seen).toEqual({ analyticsScript: 0, speedScript: 0, analyticsEvent: 0, speedEvent: 0 });

  await page.getByTestId('cookie-consent-accept-all').click();
  await expect.poll(() => seen.analyticsEvent).toBeGreaterThan(0);
  await expect.poll(() => seen.speedEvent).toBeGreaterThan(0);
  expect(seen.analyticsScript).toBe(1);
  expect(seen.speedScript).toBe(1);
  for (const payload of [...analyticsPayloads, ...speedPayloads]) {
    expect(JSON.parse(payload)).toMatchObject({ url: '/es', route: '/[locale]' });
    expect(payload).not.toContain('SYNTHETIC_TOKEN');
    expect(payload).not.toContain('SYNTHETIC_EMAIL');
    expect(payload).not.toContain('SYNTHETIC_FRAGMENT');
  }
  for (const payload of analyticsPayloads) {
    expect(JSON.parse(payload)).toMatchObject({ type: 'pageview' });
  }

  await page.getByRole('button', { name: /preferencias de cookies/i }).click();
  await page.getByTestId('cookie-consent-reject').click();
  const atRevoke = { ...seen };
  const payloadsAtRevoke = [analyticsPayloads.length, speedPayloads.length];
  await page.evaluate(() => {
    const sdk = window as Window & {
      va?: (kind: string) => void;
      si?: (kind: string) => void;
    };
    sdk.va?.('pageview');
    sdk.si?.('vital');
  });
  await page.waitForTimeout(750);
  expect(seen).toEqual(atRevoke);
  expect([analyticsPayloads.length, speedPayloads.length]).toEqual(payloadsAtRevoke);
});
