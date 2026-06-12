import { type Page, test as base, expect } from '@playwright/test';

import { test as authTest } from './fixtures/auth';

const SUPABASE_URL = 'http://127.0.0.1:54321';

/**
 * Team management E2E tests.
 *
 * Pre-reqs: `supabase start` on :54321 + Next dev server on :3000.
 * These tests write data — NOT tagged @smoke.
 *
 * Group 1 (authTest): invite — reuses the standard authenticated fixture.
 * Group 2 (teamMgmtTest): remove — a local fixture extension that pre-seeds a
 *   second active member via service_role so the remove button appears.
 */

// ─── Fixture: logged-in owner with a second active member pre-seeded ─────────

type TeamMgmtFixtures = {
  /** Page logged in as owner; a second "member" user has been seeded into the account. */
  teamPage: Page;
};

const teamMgmtTest = base.extend<TeamMgmtFixtures>({
  teamPage: async ({ page, request }, provide) => {
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const now = Date.now();
    const ownerEmail = `e2e+team-owner+${now}@saasboilerplate.local`;
    const memberEmail = `e2e+team-member+${now}@saasboilerplate.local`;
    const password = 'TestPass123!';

    const adminHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };
    const readHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

    // 1. Create owner user (triggers handle_new_user → profile + personal account)
    const ownerRes = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: adminHeaders,
      data: { email: ownerEmail, password, email_confirm: true },
    });
    const ownerBody: { id?: string } = await ownerRes.json();
    if (!ownerBody.id) throw new Error(`create owner failed: ${JSON.stringify(ownerBody)}`);
    const ownerId = ownerBody.id;

    // 2. Create member user (also gets their own profile + account via trigger)
    const memberRes = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: adminHeaders,
      data: { email: memberEmail, password, email_confirm: true },
    });
    const memberBody: { id?: string } = await memberRes.json();
    if (!memberBody.id) throw new Error(`create member failed: ${JSON.stringify(memberBody)}`);
    const memberId = memberBody.id;

    // 3. Poll for owner's account_id — the on_auth_user_created trigger chain
    //    (handle_new_user → handle_new_profile) can take a few hundred ms in CI.
    //    Retry up to 6 × 600 ms = 3.6 s before giving up.
    let accountId: string | undefined;
    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise((r) => setTimeout(r, 600));
      const acctRes = await request.get(
        `${SUPABASE_URL}/rest/v1/accounts_memberships?user_id=eq.${ownerId}&select=account_id`,
        { headers: readHeaders },
      );
      const acctRows: Array<{ account_id: string }> = await acctRes.json();
      accountId = acctRows[0]?.account_id;
      if (accountId) break;
    }
    if (!accountId) throw new Error(`owner account not found for ${ownerId} after 6 attempts`);

    // 5. Insert member into owner's account as active non-owner member
    await request.post(`${SUPABASE_URL}/rest/v1/accounts_memberships`, {
      headers: { ...adminHeaders, Prefer: 'return=minimal' },
      data: { account_id: accountId, user_id: memberId, role: 'member' },
    });

    // 6. Login as owner via UI
    await page.goto('/es/login');
    await page.locator('input[name="email"][type="email"]').fill(ownerEmail);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForURL(/\/es\/dashboard/, { timeout: 20_000 });

    await provide(page);

    // Cleanup — ON DELETE CASCADE on profiles removes memberships too
    await request
      .delete(`${SUPABASE_URL}/auth/v1/admin/users/${memberId}`, { headers: readHeaders })
      .catch(() => {});
    await request
      .delete(`${SUPABASE_URL}/auth/v1/admin/users/${ownerId}`, { headers: readHeaders })
      .catch(() => {});
  },
});

// ─── Group 1: Invite a member ─────────────────────────────────────────────────

authTest.describe('Team — invite member', () => {
  authTest.setTimeout(60_000);

  authTest(
    'invite dialog: valid email → invited email appears as pending in the member list',
    async ({ authenticatedPage: page }) => {
      const invitedEmail = `e2e+invited+${Date.now()}@saasboilerplate.local`;

      await page.goto('/es/dashboard/team');
      await page.waitForURL(/\/es\/dashboard\/team/);

      // Open the invite dialog
      await page.getByRole('button', { name: /invitar miembro/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Fill the emails textarea and submit
      await page.locator('textarea[name="emails"]').fill(invitedEmail);
      await page.getByRole('button', { name: /enviar invitación/i }).click();

      // Visible success: dialog closes AND invited email appears in the member list
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(invitedEmail)).toBeVisible({ timeout: 15_000 });
    },
  );
});

// ─── Group 2: Remove an active member ─────────────────────────────────────────

teamMgmtTest.describe('Team — remove member', () => {
  teamMgmtTest.setTimeout(60_000);

  teamMgmtTest(
    'remove dialog: confirm → member row disappears from the list',
    async ({ teamPage: page }) => {
      await page.goto('/es/dashboard/team');
      await page.waitForURL(/\/es\/dashboard\/team/);

      // The seeded member's email contains "e2e+team-member" — wait for their row
      const memberText = page.getByText(/e2e\+team-member/);
      await expect(memberText).toBeVisible({ timeout: 10_000 });

      // Click the remove button — only non-owner active members have it
      // (title is the Spanish translation of "remove_member")
      await page.getByTitle(/eliminar miembro/i).click();

      // Confirm removal in the dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: /^eliminar$/i }).click();

      // Visible result: dialog gone and the member's email no longer in the list
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/e2e\+team-member/)).not.toBeVisible({ timeout: 15_000 });
    },
  );
});
