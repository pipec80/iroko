import { expect, test, type Page, type Response } from '@playwright/test';

function nonceFrom(response: Response): string {
  const policy = response.headers()['content-security-policy'] ?? '';
  const script = policy.split(';').find((value) => value.trim().startsWith('script-src '));
  expect(script).toBeTruthy();
  expect(script).not.toContain('unsafe-inline');
  expect(script).not.toContain('unsafe-eval');
  const nonce = /'nonce-([A-Za-z0-9+/]{22}==)'/.exec(script ?? '')?.[1];
  expect(nonce).toBeTruthy();
  expect(response.headers()['cache-control']).toContain('no-store');
  if (!nonce) throw new Error('Document CSP nonce missing');
  return nonce;
}

function requiredResponse(response: Response | null): Response {
  if (!response) throw new Error('Document navigation did not return an HTTP response');
  return response;
}

async function documentNonce(page: Page): Promise<string> {
  return page
    .locator('script[nonce]')
    .first()
    .evaluate((script: HTMLScriptElement) => script.nonce);
}

test.describe('Production document CSP', () => {
  test('a real server-render failure retains nonce protection and a hydrated error boundary', async ({
    page,
  }) => {
    const response = requiredResponse(await page.goto('/es/csp-runtime-error'));
    // App Router can stream the shell before the error; observe the boundary,
    // rather than equating a streamed 200 with successful page rendering.
    expect([200, 500]).toContain(response.status());
    const nonce = nonceFrom(response);
    expect(await documentNonce(page)).toBe(nonce);
    await expect(page.getByRole('alert').filter({ has: page.getByRole('heading') })).toBeVisible();
    await expect(page.getByRole('button', { name: /intentar|reintentar/i })).toBeVisible();
  });
  for (const locale of ['es', 'en', 'pt', 'fr']) {
    test(`${locale}: coherent nonce, hydration and observable inline blocking`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(`/${locale}/login`);
      expect(response).not.toBeNull();
      const nonce = nonceFrom(requiredResponse(response));
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      expect(await documentNonce(page)).toBe(nonce);
      expect(
        await page
          .locator('script')
          .evaluateAll((scripts) =>
            scripts
              .filter(
                (script) =>
                  script.textContent?.trim() &&
                  (!script.getAttribute('type') ||
                    script.getAttribute('type') === 'text/javascript'),
              )
              .every((script) => (script as HTMLScriptElement).nonce !== ''),
          ),
      ).toBe(true);
      const result = await page.evaluate((validNonce) => {
        const blocked = document.createElement('script');
        blocked.text = 'window.__cspBlocked = true';
        document.body.append(blocked);
        const allowed = document.createElement('script');
        allowed.nonce = validNonce;
        allowed.text = 'window.__cspAllowed = true';
        document.body.append(allowed);
        const state = window as Window & { __cspBlocked?: boolean; __cspAllowed?: boolean };
        return { blocked: state.__cspBlocked === true, allowed: state.__cspAllowed === true };
      }, nonce);
      expect(result).toEqual({ blocked: false, allowed: true });
      await page.locator('input[name="email"][type="email"]').fill('csp-no-account@example.test');
      await expect(page.locator('input[name="email"][type="email"]')).toHaveValue(
        'csp-no-account@example.test',
      );
      expect(
        errors.filter((error) => /hydration|Minified React error #4(?:18|23|25|27)/i.test(error)),
      ).toEqual([]);
      const reloaded = await page.reload();
      const nextNonce = nonceFrom(requiredResponse(reloaded));
      expect(nextNonce).not.toBe(nonce);
      expect(await documentNonce(page)).toBe(nextNonce);
    });
  }

  for (const path of [
    '/es/missing.csp-document',
    '/api/missing-csp-document',
    '/apiish/missing-csp-document',
  ]) {
    test(`error document is protected at ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response).not.toBeNull();
      expect(requiredResponse(response).headers()['content-type']).toContain('text/html');
      const nonce = nonceFrom(requiredResponse(response));
      expect(await documentNonce(page)).toBe(nonce);
      await expect(page.locator('body')).not.toBeEmpty();
    });
  }

  test('soft navigation retains the live document nonce for late CAPTCHA mounting', async ({
    page,
  }) => {
    await page.goto('/es/pricing');
    const nonce = await documentNonce(page);
    await expect(page.locator('script[src*="challenges.cloudflare.com/turnstile"]')).toHaveCount(0);
    await page.evaluate(() => {
      (window as Window & { __documentMarker?: string }).__documentMarker = 'same-document';
    });
    const signup = page.locator('a[href="/es/login"]').first();
    await expect(signup).toBeVisible();
    await signup.hover(); // Exercise prefetch before the actual client navigation.
    await signup.click();
    await page.waitForURL('**/es/login');
    expect(
      await page.evaluate(
        () => (window as Window & { __documentMarker?: string }).__documentMarker,
      ),
    ).toBe('same-document');
    expect(await documentNonce(page)).toBe(nonce);
    const turnstile = page.locator('script[src*="challenges.cloudflare.com/turnstile"]');
    await expect(turnstile).toHaveCount(1);
    expect(await turnstile.evaluate((script: HTMLScriptElement) => script.nonce)).toBe(nonce);
  });

  test('theme initialization and a login server action execute under the nonce policy', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto('/es/login');
    await expect(page.locator('html')).toHaveClass(/dark/);
    const nonce = await documentNonce(page);
    await page.locator('input[name="email"][type="email"]').fill('csp-no-account@example.test');
    await page.locator('input[name="password"]').fill('IncorrectPassword123!');
    const action = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.request().headers()['next-action'] !== undefined,
    );
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    expect((await action).status()).toBe(200);
    await expect(page.getByRole('alert').first()).toBeVisible();
    expect(await documentNonce(page)).toBe(nonce);
  });
});
