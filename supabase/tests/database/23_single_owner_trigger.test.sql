-- pgTAP test: private.enforce_single_owner_per_account() scoped to team
-- accounts only (fix 2026-07-24). Covers: team accounts keep the original
-- protection (can't demote/delete the sole owner), personal accounts do NOT
-- block deleting their sole owner's membership — which is required for the
-- hard-delete-old-accounts cron (DELETE FROM public.accounts) and for
-- cascading auth.users deletion (F3-C3/GDPR) to actually complete.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(6);

-- ── Seed: one user with just their auto-created personal account (used for
--    the public.accounts hard-delete scenario), a second used purely for the
--    end-to-end auth.users cascade, and a team with a single owner (to prove
--    the team protection still holds). ────────────────────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000002701', 'owner-personal@example.com',
   '{"given_name":"Personal","family_name":"Owner"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002702', 'owner-team-sole@example.com',
   '{"given_name":"Sole","family_name":"Owner"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000002703', 'purge-target@example.com',
   '{"given_name":"Purge","family_name":"Target"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000002750', 'team', 'Single Owner Team', 'single-owner-team',
  '00000000-0000-0000-0000-000000002702');
INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000002750', '00000000-0000-0000-0000-000000002702', 'owner');

-- ============================================================================
-- 1-2. Team account regression: the sole owner still can't be demoted or
--      deleted — this is the invariant the trigger exists to protect.
-- ============================================================================
SELECT throws_like(
  $$UPDATE public.accounts_memberships SET role = 'member'
    WHERE account_id = '00000000-0000-0000-0000-000000002750'
      AND user_id = '00000000-0000-0000-0000-000000002702'$$,
  '%único owner%',
  'Team account: demoting the sole owner is still blocked'
);
SELECT throws_like(
  $$DELETE FROM public.accounts_memberships
    WHERE account_id = '00000000-0000-0000-0000-000000002750'
      AND user_id = '00000000-0000-0000-0000-000000002702'$$,
  '%único owner%',
  'Team account: deleting the sole owner membership is still blocked'
);

-- ============================================================================
-- 3. Personal account: deleting the sole owner's membership row directly
--    (simulating what a cascade would do) is now allowed.
-- ============================================================================
SELECT lives_ok(
  $$DELETE FROM public.accounts_memberships
    WHERE account_id = '00000000-0000-0000-0000-000000002701'
      AND user_id = '00000000-0000-0000-0000-000000002701'$$,
  'Personal account: deleting the sole owner membership is allowed (no team invariant applies)'
);

-- ============================================================================
-- 4-5. End-to-end: DELETE FROM public.accounts on a personal account now
--      succeeds (this is exactly what hard-delete-old-accounts runs nightly).
-- ============================================================================
INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000002701', '00000000-0000-0000-0000-000000002701', 'owner');

SELECT lives_ok(
  $$DELETE FROM public.accounts WHERE id = '00000000-0000-0000-0000-000000002701'$$,
  'hard-delete-old-accounts scenario: DELETE FROM public.accounts on a personal account no longer fails'
);
SELECT ok(
  NOT EXISTS(
    SELECT 1 FROM public.accounts_memberships
    WHERE account_id = '00000000-0000-0000-0000-000000002701'
  ),
  'The personal account membership cascaded away with the account'
);

-- ============================================================================
-- 6. End-to-end: DELETE FROM auth.users for a user whose only account is
--    personal now cascades all the way through (F3-C3 purge scenario) —
--    profiles, accounts, accounts_memberships all disappear with it.
-- ============================================================================
SELECT lives_ok(
  $$DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000002703'$$,
  'auth.users delete cascades cleanly for a user who only owns a personal account'
);

SELECT * FROM finish();
ROLLBACK;
