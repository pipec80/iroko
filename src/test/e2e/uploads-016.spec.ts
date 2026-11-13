import { test, expect } from './fixtures/auth';
import { createTeamViaUi, querySqlAsPostgres, SUPABASE_URL } from './helpers';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.setTimeout(120_000);

test('logo accepts its5MiB transport boundary and persists a second upload without remounting', async ({
  authenticatedPage: page,
  request,
}) => {
  await page.goto('/es/dashboard/account?tab=profile');
  const email = await page
    .locator('strong')
    .filter({ hasText: /^e2e\+settings\+/ })
    .textContent();
  if (!email || !/^e2e\+settings\+\d+@saasboilerplate\.local$/.test(email)) {
    throw new Error('Expected owned upload identity');
  }
  const userId = querySqlAsPostgres(`SELECT id FROM auth.users WHERE email='${email}'`);
  if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error('Missing owned upload identity');
  const name = `Plan016 logo ${Date.now()}`;
  await createTeamViaUi(page, name);
  const teamId = querySqlAsPostgres(
    `SELECT id FROM public.accounts WHERE created_by='${userId}' AND name='${name}' AND type='team'`,
  );
  if (!/^[0-9a-f-]{36}$/.test(teamId)) throw new Error('Missing owned upload team');
  const failures: unknown[] = [];
  try {
    await page.goto('/es/dashboard/org/settings');
    const input = page.locator('input[name="logo"]');
    const form = page.locator('form').filter({ has: input });
    const submit = form.locator('button[type="submit"]');
    await input.setInputFiles({ name: 'valid.png', mimeType: 'image/png', buffer: png });
    await expect(submit).toBeEnabled();
    await input.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid'),
    });
    await expect(form.getByRole('alert')).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(input).toHaveValue('');
    await input.setInputFiles({
      name: 'oversize.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(form.getByRole('alert')).toContainText('Máximo 5MB.');
    await expect(submit).toBeDisabled();
    const boundary = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024 - png.length)]);
    for (const bytes of [boundary, Buffer.concat([png, Buffer.from('second-logo')])]) {
      await input.setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: bytes });
      await expect(submit).toBeEnabled();
      await expect(form.getByRole('status')).toHaveCount(0);
      const completed = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === '/es/dashboard/org/settings',
        { timeout: 45_000 },
      );
      await submit.click();
      expect((await completed).ok()).toBe(true);
      await expect(form.getByRole('status')).toHaveText('Logo actualizado.', { timeout: 15_000 });
      await expect(submit).toBeDisabled();
      await expect(input).toHaveValue('');
      const result = await request.get(
        `${SUPABASE_URL}/storage/v1/object/public/org-assets/${teamId}/logo.png?plan016=${Date.now()}`,
      );
      expect(result.ok()).toBe(true);
      expect(await result.body()).toEqual(bytes);
    }
    await page.reload();
    const saved = form.locator('img[alt="logo"]');
    await expect(saved).toHaveAttribute('src', new RegExp(`/org-assets/${teamId}/logo\\.png`));
  } catch (error) {
    failures.push(error);
  }
  try {
    const key = process.env.SUPABASE_SECRET_KEY ?? '';
    const cleanup = await request.delete(`${SUPABASE_URL}/storage/v1/object/org-assets`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      data: { prefixes: [`${teamId}/logo.png`] },
    });
    expect(cleanup.ok()).toBe(true);
    expect(
      querySqlAsPostgres(
        `SELECT count(*) FROM storage.objects WHERE bucket_id='org-assets' AND name='${teamId}/logo.png'`,
      ),
    ).toBe('0');
  } catch (error) {
    failures.push(error);
  }
  if (failures.length)
    throw new AggregateError(failures, 'Logo acceptance or owned cleanup failed');
});
