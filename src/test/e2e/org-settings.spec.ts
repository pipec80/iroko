import { expect, test } from './fixtures/auth';
import { createTeamViaUi } from './helpers';

test('QA-08 saves organization fields and updates the selector', async ({
  authenticatedPage: page,
}) => {
  const stamp = Date.now();
  await createTeamViaUi(page, `QA08 initial ${stamp}`);
  await page.goto('/es/dashboard/org/settings');
  const values = {
    name: `QA08 updated ${stamp}`,
    slug: `qa08-updated-${stamp}`,
    website: 'https://example.com',
    country: 'Chile',
  };
  for (const [field, value] of Object.entries(values)) {
    const input = page.locator(`#org-${field}`);
    await expect(input).toBeEditable();
    await input.fill(value);
    await page
      .locator('form')
      .filter({ has: input })
      .getByRole('button', { name: 'Guardar cambios' })
      .click();
    await expect(page.getByText('Información actualizada.')).toBeVisible();
    await expect(input).toHaveValue(value);
    if (field === 'name') {
      await expect(page.getByRole('button', { name: /cambiar de organización/i })).toContainText(
        value,
      );
    }
    await page.reload();
    await expect(input).toHaveValue(value);
  }
  await expect(page.getByRole('button', { name: /cambiar de organización/i })).toContainText(
    values.name,
  );
});
