import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

/** Reselects a valid file if hydration missed its change event; never accepts a page error. */
export async function selectValidFile(
  input: Locator,
  submit: Locator,
  file: Parameters<Locator['setInputFiles']>[0],
): Promise<void> {
  const page = input.page();
  const errors: Error[] = [];
  const onPageError = (error: Error) => errors.push(error);
  page.on('pageerror', onPageError);
  try {
    await expect(async () => {
      if (errors.length) return;
      await input.setInputFiles(file);
      await expect(submit).toBeEnabled({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    expect(errors, 'Page errors during valid file selection').toEqual([]);
  } finally {
    page.off('pageerror', onPageError);
  }
}
