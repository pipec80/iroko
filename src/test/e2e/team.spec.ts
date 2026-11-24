import { type Page, test as base, expect } from '@playwright/test';

import { isCloudBrowserTarget } from '../cloud-protection';
import { requireUserUuid, withAuthCleanup } from '../local-auth-cleanup';
import { test as authTest } from './fixtures/auth';
import {
  createConfirmedUser,
  createTeamViaUi,
  execSqlAsPostgres,
  loginViaUi,
  querySqlAsPostgres,
  SUPABASE_URL,
  uniqueEmail,
} from './helpers';

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
  teamPage: async ({ page, request, baseURL }, provide, testInfo) => {
    testInfo.skip(isCloudBrowserTarget(baseURL), 'requires an owned local Supabase fixture');
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const ownerEmail = uniqueEmail('e2e+team-owner');
    const memberEmail = uniqueEmail('e2e+team-member');
    const password = 'TestPass123!';
    const ownerId = requireUserUuid(
      await createConfirmedUser(request, ownerEmail, password, serviceKey),
    );
    const userIds = [ownerId];

    await withAuthCleanup(
      async () => {
        await loginViaUi(page, ownerEmail, password);
        await expect(page.getByRole('button', { name: /cambiar de organización/i })).toContainText(
          'Mi organización',
        );
        const accountId = requireUserUuid(
          querySqlAsPostgres(
            `SELECT a.id FROM public.profiles p JOIN public.accounts a ON a.id = p.active_account_id WHERE p.id = '${ownerId}' AND a.created_by = '${ownerId}' AND a.type = 'team'`,
          ),
        );
        const memberId = requireUserUuid(
          await createConfirmedUser(request, memberEmail, password, serviceKey),
        );
        userIds.push(memberId);

        execSqlAsPostgres(
          `INSERT INTO public.accounts_memberships (account_id, user_id, role) VALUES ('${accountId}', '${memberId}', 'member')`,
        );

        await provide(page);
      },
      () =>
        execSqlAsPostgres(
          `DELETE FROM public.accounts WHERE id IN ('${userIds.join("','")}') OR (created_by = '${ownerId}' AND type = 'team')`,
        ),
      async () => {
        const results = await Promise.allSettled(
          userIds.map(async (id) => {
            const response = await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
              headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
            });
            if (!response.ok())
              throw new Error(`Owned team fixture cleanup failed (${response.status()})`);
          }),
        );
        const failures = results.filter((result) => result.status === 'rejected');
        if (failures.length) {
          throw new AggregateError(
            failures.map((result) => result.reason),
            'Owned team fixture Auth cleanup failed',
          );
        }
      },
      (error) => testInfo.annotations.push({ type: 'fixture cleanup', description: error.message }),
    );
  },
});

// ─── Group 1: Invite a member ─────────────────────────────────────────────────

authTest.describe('Team — invite member', () => {
  authTest.setTimeout(60_000);

  authTest(
    'invite dialog: valid email → invited email appears as pending in the member list',
    async ({ authenticatedPage: page }) => {
      const invitedEmail = `e2e+invited+${Date.now()}@saasboilerplate.local`;

      // Invitar exige una cuenta de equipo: las personales son 1:1 con su
      // usuario y invite_members las rechaza con not_a_team (Plan 009).
      await createTeamViaUi(page, `Equipo Invite ${Date.now()}`);

      await page.goto('/es/dashboard/members');
      await page.waitForURL(/\/es\/dashboard\/members/);

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
      await page.goto('/es/dashboard/members');
      await page.waitForURL(/\/es\/dashboard\/members/);

      // The seeded member's email contains "e2e+team-member" — wait for their row
      const memberText = page.getByText(/e2e\+team-member/).filter({ visible: true });
      await expect(memberText).toHaveCount(1, { timeout: 10_000 });
      await expect(memberText).toBeVisible({ timeout: 10_000 });

      // Open the row's actions menu — only non-owner active members have one
      // (aria-label is the Spanish translation of "member_actions: Acciones para {name}")
      await page.getByRole('button', { name: /^acciones para/i }).click();

      // The dialog opens in "manage member" mode first (change role / transfer
      // ownership / remove) — "Eliminar miembro" moves it to the remove
      // confirmation step, where the real "Eliminar" button lives.
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: /^eliminar miembro$/i }).click();
      await page.getByRole('button', { name: /^eliminar$/i }).click();

      // Visible result: dialog gone and the member's email no longer in the list
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
      await expect(memberText).toHaveCount(0, { timeout: 15_000 });
    },
  );
});
