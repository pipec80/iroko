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

    // 3. Resolve the owner's account_id through the app's own path:
    //    password-grant login + get_my_account_id() RPC (SECURITY DEFINER,
    //    granted to authenticated). Direct REST reads of accounts_memberships
    //    return an error object (grants hardening) that silently parses as
    //    "no rows" — never query that table directly here.
    const tokenRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
      data: { email: ownerEmail, password },
    });
    const tokenBody: { access_token?: string } = await tokenRes.json();
    if (!tokenBody.access_token) {
      throw new Error(`owner password login failed: ${JSON.stringify(tokenBody)}`);
    }

    const rpcRes = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_my_account_id`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${tokenBody.access_token}`,
        'Content-Type': 'application/json',
      },
      data: {},
    });
    const rpcText = await rpcRes.text();
    if (!rpcRes.ok()) {
      throw new Error(`get_my_account_id failed (${rpcRes.status()}): ${rpcText}`);
    }
    const accountId = JSON.parse(rpcText) as string | null;
    if (!accountId) {
      throw new Error(`owner ${ownerId} has no account — handle_new_profile trigger missing?`);
    }

    // 4. Insert member into owner's account as active non-owner member.
    //    Fail loudly: a swallowed error here surfaces later as a confusing
    //    "row not visible" assertion in the test body.
    const insertRes = await request.post(`${SUPABASE_URL}/rest/v1/accounts_memberships`, {
      headers: { ...adminHeaders, Prefer: 'return=minimal' },
      data: { account_id: accountId, user_id: memberId, role: 'member' },
    });
    if (!insertRes.ok()) {
      throw new Error(`seed membership failed (${insertRes.status()}): ${await insertRes.text()}`);
    }

    // 5. Login as owner via UI
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
