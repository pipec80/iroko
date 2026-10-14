import type { Page } from '@playwright/test';

import { appConfig } from '@/config/app.config';

import es from '../../../messages/es.json';
import { expect, test as authTest } from './fixtures/auth';

async function expectRobotUnavailable(page: Page) {
  await expect(page).toHaveURL(/\/es\/dashboard\/robot\/?$/);
  await expect(
    page.getByRole('heading', { name: es.Errors.not_found_title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `${appConfig.brand} Robot`, exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: es.Robot.upload_btn, exact: true })).toHaveCount(0);
  await expect(page.locator('input[type="file"][accept=".xlsx"]')).toHaveCount(0);
}

// The auth fixture creates a local user, so this spec must stay outside production smoke runs.
authTest.describe('Robot reference — disabled module', () => {
  authTest.setTimeout(60_000);
  authTest.skip(
    appConfig.features.verticals.robot,
    'This regression requires features.verticals.robot=false in the application build.',
  );

  authTest(
    'should deny the direct authenticated URL when Robot is disabled',
    async ({ authenticatedPage: page }) => {
      await page.goto('/es/dashboard/robot');
      await expectRobotUnavailable(page);

      // Assert the rendered boundary: streamed notFound responses can retain HTTP 200.
      await page.reload();
      await expectRobotUnavailable(page);
    },
  );
});
