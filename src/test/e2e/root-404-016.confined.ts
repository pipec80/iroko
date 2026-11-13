import { expect, test } from '@playwright/test';

test('root404 returns one document and hydrates its return link', async ({ page }) => {
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
  // This misses routing outside [locale]; the localized catch-all uses a
  // different not-found component and cannot prove the root document contract.
  const response = await page.goto('/api/plan016-missing');
  if (!response) throw new Error('Root404 response missing');
  expect(response.status()).toBe(404);
  const html = await response.text();
  expect(html).toContain('Page Not Found');
  expect(html.match(/<html(?:\s|>)/gi)).toHaveLength(1);
  expect(html.match(/<body(?:\s|>)/gi)).toHaveLength(1);
  await expect(page.locator('html')).toHaveCount(1);
  await expect(page.locator('body')).toHaveCount(1);
  await page.getByRole('link', { name: 'Return Home', exact: true }).click();
  await page.waitForURL((url) => /^\/(?:es|en|pt|fr)\/?$/.test(url.pathname));
  await expect(page.getByRole('main')).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});
