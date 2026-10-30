import { execFileSync } from 'node:child_process';
import { localE2eBudget } from '../local-e2e-target';
import { test, expect } from './fixtures/auth';
import { SUPABASE_URL, querySqlAsPostgres } from './helpers';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test('current password rejects a wrong value and accepts the correct value in local Auth', async ({
  authenticatedPage: page,
  playwright,
}) => {
  test.setTimeout(localE2eBudget(120_000));
  expect(process.env.LOCAL_VALIDATION).toBe('true');
  // Identity check precedes even the non-secret policy inspection.
  querySqlAsPostgres('SELECT 1');
  const authFormat =
    '{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}|{{.Config.Image}}|{{range .Config.Env}}{{if eq (index (split . "=") 0) "GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION"}}{{index (split . "=") 1}}{{end}}{{end}}';
  const [running, project, image, requireReauthentication] = execFileSync(
    'docker',
    ['inspect', '--format', authFormat, 'supabase_auth_saas-boilerplate'],
    { encoding: 'utf8' },
  )
    .trim()
    .split('|');
  expect(running).toBe('true');
  expect(project).toBe('saas-boilerplate');
  const currentPasswordPolicy = execFileSync(
    'docker',
    [
      'exec',
      'supabase_auth_saas-boilerplate',
      'grep',
      '^GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=',
      '/.env',
    ],
    { encoding: 'utf8' },
  ).trim();
  expect(currentPasswordPolicy).toBe(
    'GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=true',
  );
  expect(requireReauthentication).toBe('true');
  console.log(`Local Auth ${image}: require_current_password=true, require_reauthentication=true`);
  await page.goto('/es/dashboard/account?tab=profile');
  const email = (
    await page
      .locator('form')
      .filter({ has: page.locator('input[name="email"]') })
      .locator('..')
      .locator('strong')
      .innerText()
  ).trim();
  expect(email).toMatch(/^e2e\+settings\+\d+@saasboilerplate\.local$/);
  const oldPassword = 'TestPass123!';
  const newPassword = 'ChangedPass017!';
  const independent = await playwright.request.newContext();
  try {
    const login = async (password: string) => {
      const response = await independent.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '' },
        data: { email, password },
      });
      return response.ok();
    };
    await page.goto('/es/dashboard/account?tab=security');
    const form = page
      .locator('form')
      .filter({ has: page.locator('input[name="current_password"]') });
    await form.locator('input[name="current_password"]').fill('Incorrect017!');
    await form.locator('input[name="password"]').fill(newPassword);
    await form.locator('input[name="confirm_password"]').fill(newPassword);
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[role="alert"]')).toBeVisible();
    expect(await login(newPassword)).toBe(false);
    expect(await login(oldPassword)).toBe(true);
    await form.locator('input[name="current_password"]').fill(oldPassword);
    await form.locator('input[name="password"]').fill(newPassword);
    await form.locator('input[name="confirm_password"]').fill(newPassword);
    await form.locator('button[type="submit"]').click();
    // Locator clicks wait for dispatch, not completion of the Server Action.
    await expect(form.locator('[role="alert"]')).toHaveCount(0);
    expect(await login(newPassword)).toBe(true);
    expect(await login(oldPassword)).toBe(false);
    await expect(page.getByText('Contraseña actualizada.')).toBeVisible();
  } finally {
    await independent.dispose();
  }
});
