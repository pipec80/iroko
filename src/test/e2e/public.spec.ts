import { expect, test } from '@playwright/test';

/**
 * Smoke renders for all public marketing pages.
 *
 * Each test is tagged @smoke — safe to run against production (read-only, no auth needed).
 * The nightly workflow targets these via `--grep "@smoke"`.
 *
 * Assertions: heading text visible in the rendered page (not just URL presence).
 */

test.describe('Public pages — smoke renders', () => {
  test('home: renders hero heading @smoke', async ({ page }) => {
    await page.goto('/es');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Un tronco común para tus');
  });

  test('pricing: renders main heading @smoke', async ({ page }) => {
    await page.goto('/es/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Precios honestos');
  });

  test('product: renders main heading @smoke', async ({ page }) => {
    await page.goto('/es/product');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Construido para que lo rebrandees',
    );
  });

  test('solutions: renders main heading @smoke', async ({ page }) => {
    await page.goto('/es/solutions');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Un boilerplate, infinitas ramas',
    );
  });

  test('contact: renders main heading @smoke', async ({ page }) => {
    await page.goto('/es/contact');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      '¿Tienes preguntas? Estamos aquí.',
    );
  });
});
