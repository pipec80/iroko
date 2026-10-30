import { appConfig } from '@/config/app.config';
import es from '../../../messages/es.json';
import { expect, test } from './fixtures/auth';

// Mutating auth fixtures: local acceptance only, never a production @smoke.
test('Projects/editor are absent from navigation, shortcuts and direct authenticated URLs', async ({
  authenticatedPage: page,
}) => {
  expect(appConfig.features.projects).toBe(false);
  await page.goto('/es/dashboard');
  await expect(page.locator('a[href*="/dashboard/projects"]')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+p');
  await expect(page).toHaveURL(/\/es\/dashboard$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  for (const route of [
    '/es/dashboard/projects',
    '/es/dashboard/projects/existing-project',
    '/es/dashboard/projects/existing-project/doc/660e8400-e29b-41d4-a716-446655440111',
  ]) {
    await page.goto(route);
    // Streamed notFound may retain HTTP 200: assert the effective rendered boundary.
    await expect(
      page.getByRole('heading', { name: es.Errors.not_found_title, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
  }
});
