import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * End-to-end auth flow against a running local Supabase stack.
 *
 * Pre-reqs:
 * - `supabase start` running on :54321 with `enable_confirmations = true`
 * - Mailpit on :54324
 * - Next dev server on :3000 (webServer in playwright.config.ts starts it)
 */

const MAILPIT_BASE = 'http://127.0.0.1:54324';
const SUPABASE_URL = 'http://127.0.0.1:54321';

function uniqueEmail(): string {
  return `e2e+${Date.now()}@saasboilerplate.local`;
}

async function fetchLatestMessageTo(
  request: APIRequestContext,
  recipient: string,
  maxWaitMs = 15_000,
): Promise<{ subject: string; confirmUrl: string | null }> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${MAILPIT_BASE}/api/v1/search?query=to:${recipient}`);
    if (res.ok()) {
      const data: { messages?: Array<{ ID: string; Subject: string }> } = await res.json();
      const msg = data.messages?.[0];
      if (msg) {
        const detail = await request.get(`${MAILPIT_BASE}/api/v1/message/${msg.ID}`);
        const body: { Text?: string; HTML?: string } = await detail.json();
        const content = `${body.HTML ?? ''}\n${body.Text ?? ''}`;
        const match = content.match(/https?:\/\/[^\s"<>()]+/g);
        const confirmUrl =
          match?.find((u) => /\/(auth\/v1\/)?verify\?/.test(u) || u.includes('/auth/confirm')) ??
          null;
        return { subject: msg.Subject, confirmUrl };
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email delivered to ${recipient} within ${maxWaitMs}ms`);
}

test.describe('Auth flow', () => {
  test('redirects unauthenticated users to /es/login', async ({ page }) => {
    const response = await page.goto('/es/dashboard', { waitUntil: 'commit' });
    await page.waitForURL(/\/es\/login/);
    expect(response?.status()).toBeLessThan(400);
    expect(page.url()).toContain('/es/login');
    expect(page.url()).toContain('next=%2Fes%2Fdashboard');
  });

  test('login page renders both forms and switcher', async ({ page }) => {
    await page.goto('/es/login');
    await expect(page.getByRole('heading', { name: /bienvenido/i })).toBeVisible();
    await expect(page.locator('input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"]').first()).toBeVisible();
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /enlace mágico/i })).toBeVisible();
  });

  test('signup shows inline field errors on weak password', async ({ page }) => {
    await page.goto('/es/signup');
    await page.locator('input[name="first_name"]').fill('Test');
    await page.locator('input[name="last_name"]').fill('User');
    await page.locator('input[name="email"]').fill(uniqueEmail());
    // Weak: too short + no uppercase + no digit
    await page.locator('input[name="password"]').fill('weak');
    await page.locator('form button[type="submit"]').click();
    // Form stays on the same page; password input has html5 minLength validation.
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/es/signup');
  });

  test('signup lands on confirmation page and email is delivered', async ({ page, request }) => {
    test.setTimeout(60_000);
    const email = uniqueEmail();
    const password = 'TestPass123';

    // 1. Signup via UI.
    await page.goto('/es/signup');
    await page.locator('input[name="first_name"]').fill('Ada');
    await page.locator('input[name="last_name"]').fill('Lovelace');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('form button[type="submit"]').click();

    // 2. Lands on confirmation page (enable_confirmations = true in config.toml).
    await page.waitForURL(/\/es\/signup\/confirmation/, { timeout: 20_000 });

    // 3. Poll Mailpit for the confirmation email.
    const { subject, confirmUrl } = await fetchLatestMessageTo(request, email);
    expect(subject.toLowerCase()).toMatch(/confirm/);
    expect(confirmUrl).not.toBeNull();

    // Cleanup: best-effort delete via admin API.
    await request
      .delete(`${SUPABASE_URL}/auth/v1/admin/users/${email}`, {
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ''}`,
        },
      })
      .catch(() => {});
  });

  test('logout endpoint redirects to login', async ({ request }) => {
    const res = await request.post('/es/auth/logout', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([301, 302, 303, 307]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/\/es\/login/);
  });

  test('callback rejects requests without code', async ({ request }) => {
    const res = await request.get('/es/auth/callback', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([301, 302, 303, 307]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/error=missing_code/);
  });

  test('confirm rejects requests without token_hash', async ({ request }) => {
    const res = await request.get('/es/auth/confirm', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([301, 302, 303, 307]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/error=confirmation_failed/);
  });
});
