import { gunzipSync } from 'node:zlib';
import type { Page, Route } from '@playwright/test';

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
export async function interceptIngest(
  page: Page,
): Promise<{ count: () => number; urls: string[]; payloads: string[]; envelopes: string[] }> {
  await unmaskFromBotDetection(page);
  const urls: string[] = [];
  const payloads: string[] = [];
  const envelopes: string[] = [];
  await page.route(INGEST_GLOB, async (route: Route) => {
    const url = route.request().url();
    urls.push(url);
    const request = route.request();
    envelopes.push(JSON.stringify({ url, headers: await request.allHeaders() }));
    const body = request.postDataBuffer();
    if (body?.length) {
      let decoded = body;
      if (body[0] === 0x1f && body[1] === 0x8b) decoded = gunzipSync(body);
      let text = decoded.toString('utf8');
      const data = new URLSearchParams(text).get('data');
      if (data !== null) {
        text =
          data.startsWith('{') || data.startsWith('[') ?
            data
          : Buffer.from(data, 'base64').toString('utf8');
      }
      // Fail closed on an unknown wire format rather than treating opaque bytes as private.
      JSON.parse(text);
      payloads.push(text);
    }
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
  return { count: () => urls.length, urls, payloads, envelopes };
}
