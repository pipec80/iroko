import { expect, test } from '@playwright/test';

test('login permits a second request after an error without a CAPTCHA site key', async ({
  page,
}) => {
  await page.goto('/es/login');
  await expect(page.locator('script[src*="challenges.cloudflare.com/turnstile"]')).toHaveCount(0);
  await page.locator('input[name="email"][type="email"]').fill('plan016-absent@example.test');
  const button = page.getByRole('button', { name: /iniciar sesión/i });
  for (let attempt = 0; attempt < 2; attempt++) {
    // React resets uncontrolled fields after an action resolves, including
    // an error returned as data. A retry must enter its password again.
    await page.locator('input[name="password"]').fill('IncorrectPass123!');
    await expect(button).toBeEnabled();
    const response = page.waitForResponse(
      (res) => res.request().method() === 'POST' && new URL(res.url()).pathname === '/es/login',
    );
    await button.click();
    const result = await response;
    expect(result.ok()).toBe(true);
    expect((await result.text()).includes('invalid_credentials')).toBe(true);
    await expect(page.getByText('Credenciales incorrectas.', { exact: true })).toBeVisible();
  }
});

test('a localized404 has one document and remains interactive after hydration', async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on('pageerror', (error) => {
    if (/hydration|error #4(?:18|23|25|27)/i.test(error.message))
      hydrationErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /hydration|cannot be a (?:child|descendant)/i.test(message.text())
    )
      hydrationErrors.push(message.text());
  });
  const response = await page.goto('/es/plan016-missing-page');
  if (!response) throw new Error('Missing404 document response');
  const html = await response.text();
  expect(html.match(/<html(?:\s|>)/gi)).toHaveLength(1);
  expect(html.match(/<body(?:\s|>)/gi)).toHaveLength(1);
  await expect(page.locator('html')).toHaveCount(1);
  await expect(page.locator('body')).toHaveCount(1);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.getByRole('link', { name: 'Volver al panel' }).click();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});

test('global error Retry recovers after a controlled root failure is removed', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'plan016-root-failure', value: '1', url: 'http://localhost:3000' },
  ]);
  await page.goto('/es/login');
  await expect(page.getByRole('heading', { name: 'Something went wrong!' })).toBeVisible();
  await context.clearCookies({ name: 'plan016-root-failure' });
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});
