import { expect, test } from '@playwright/test';

test.describe('Cookie consent banner', () => {
  test('shows on first visit and disappears after accepting', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es');

    const banner = page.getByTestId('cookie-consent-banner');
    await expect(banner).toBeVisible();

    await page.getByTestId('cookie-consent-accept-all').click();
    await expect(banner).not.toBeVisible();

    const cookies = await context.cookies();
    const consentCookie = cookies.find((cookie) => cookie.name === 'cookie_consent');
    expect(consentCookie).toBeDefined();

    await page.reload();
    await expect(page.getByTestId('cookie-consent-banner')).not.toBeVisible();
  });

  test('customize flow persists individual category choices', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es');

    await page.getByTestId('cookie-consent-customize').click();
    await page.getByTestId('cookie-consent-analytics-toggle').check();
    await page.getByTestId('cookie-consent-save').click();

    await expect(page.getByTestId('cookie-consent-banner')).not.toBeVisible();

    const cookies = await context.cookies();
    const consentCookie = cookies.find((cookie) => cookie.name === 'cookie_consent');
    expect(consentCookie?.value).toBeDefined();
    const parsed: unknown = JSON.parse(decodeURIComponent(consentCookie?.value ?? '{}'));
    expect(parsed).toMatchObject({ analytics: true, marketing: false });
  });
});

test.describe('Legal pages', () => {
  test('renders /es/legal/terms', async ({ page }) => {
    const response = await page.goto('/es/legal/terms');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Términos de Servicio');
  });

  test('renders /en/legal/terms', async ({ page }) => {
    const response = await page.goto('/en/legal/terms');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Terms of Service');
  });

  test('renders /es/legal/privacy', async ({ page }) => {
    const response = await page.goto('/es/legal/privacy');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Política de Privacidad');
  });
});
