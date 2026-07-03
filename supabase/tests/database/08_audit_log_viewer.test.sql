-- pgTAP test: get_account_audit_logs — RPC gates the audit log viewer to
-- owner/admin members of the target account and rejects everyone else,
-- including users with NO membership row at all (get_user_role returns NULL,
-- which must NOT silently pass the `NOT IN` check — see F2-2G plan).
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(8);

-- ── Seed three unrelated users (auth.users insert auto-creates a personal
--    account + owner membership per user via existing triggers — irrelevant
--    to this test; we only care about the shared TEAM accounts below). ──────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000801', 'audit-owner@example.com',
   '{"given_name":"Owner","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000802', 'audit-member@example.com',
   '{"given_name":"Member","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000803', 'audit-outsider@example.com',
   '{"given_name":"Outsider","family_name":"C"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

-- ── Two shared TEAM accounts (distinct from the auto-created personal ones) ─
INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000900', 'team', 'Team Nine Hundred', 'team-900',
   '00000000-0000-0000-0000-000000000801'),
  ('00000000-0000-0000-0000-000000000901', 'team', 'Team Nine-Oh-One', 'team-901',
   '00000000-0000-0000-0000-000000000801');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000900', '00000000-0000-0000-0000-000000000801', 'owner'),
  ('00000000-0000-0000-0000-000000000900', '00000000-0000-0000-0000-000000000802', 'member'),
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000801', 'owner');

-- ── Audit logs: 3 rows on account 900 (staggered timestamps, all pushed into
--    the future relative to now() — the accounts_memberships INSERTs above
--    already fired trg_memberships_audit and wrote 2 auto-generated
--    'create'/'accounts_memberships' rows for account 900 at the
--    transaction's frozen now(); shifting our manual rows forward keeps
--    "most recent" assertions deterministic regardless of that noise), plus
--    1 row on account 901 that must never leak into a 900 query. ──────────
INSERT INTO audit.logs (actor_id, action, resource_type, resource_id, account_id, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000801', 'create', 'projects', 'p1',
   '00000000-0000-0000-0000-000000000900', now() + interval '1 hour'),
  ('00000000-0000-0000-0000-000000000801', 'update', 'projects', 'p1',
   '00000000-0000-0000-0000-000000000900', now() + interval '2 hours'),
  ('00000000-0000-0000-0000-000000000802', 'delete', 'documents', 'd1',
   '00000000-0000-0000-0000-000000000900', now() + interval '3 hours'),
  ('00000000-0000-0000-0000-000000000801', 'create', 'projects', 'p9',
   '00000000-0000-0000-0000-000000000901', now());

-- ── Act as the owner (A) ─────────────────────────────────────────────────────
SET LOCAL role authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000801', 'role', 'authenticated')::text,
  true
);

-- 1. Owner sees all 5 rows that belong to account 900: the 3 manually seeded
--    ones plus 2 auto-generated 'create'/'accounts_memberships' rows from
--    the membership INSERTs above (trg_memberships_audit — expected, not a
--    bug; see the comment on the audit.logs seed above).
SELECT is(
  (SELECT count(*)::int FROM public.get_account_audit_logs('00000000-0000-0000-0000-000000000900')),
  5,
  'Owner sees all 5 audit rows for their account (3 manual + 2 from membership triggers)'
);

-- 2. Account 901's row never appears when querying account 900.
SELECT is(
  (SELECT count(*)::int FROM public.get_account_audit_logs('00000000-0000-0000-0000-000000000900')
   WHERE resource_id = 'p9'),
  0,
  'Account 901''s audit row never appears when querying account 900'
);

-- 3. Member (B, role=member) is rejected — only owner/admin may view.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000802', 'role', 'authenticated')::text,
  true
);
SELECT throws_ok(
  $$SELECT * FROM public.get_account_audit_logs('00000000-0000-0000-0000-000000000900')$$,
  'not_authorized'
);

-- 4. Outsider (C, NO membership row — get_user_role returns NULL) is rejected
--    too. Regression test for the NULL NOT IN (...) trap described in the
--    plan's Global Constraints.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000803', 'role', 'authenticated')::text,
  true
);
SELECT throws_ok(
  $$SELECT * FROM public.get_account_audit_logs('00000000-0000-0000-0000-000000000900')$$,
  'not_authorized'
);

-- ── Back to the owner for the remaining checks ──────────────────────────────
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000801', 'role', 'authenticated')::text,
  true
);

-- 5. p_limit is respected.
SELECT is(
  (SELECT count(*)::int FROM public.get_account_audit_logs('00000000-0000-0000-0000-000000000900', 2)),
  2,
  'p_limit=2 returns exactly 2 rows'
);

-- 6. Results are ordered newest first.
SELECT is(
  (SELECT resource_type FROM public.get_account_audit_logs('00000000-0000-0000-0000-000000000900', 1)),
  'documents',
  'Most recent row (delete/documents) comes first'
);

-- 7. Filter by action + resource_type narrows results. action alone would
--    also match the 2 auto-generated 'create'/'accounts_memberships' rows,
--    so both filters are combined to isolate the manually seeded row.
SELECT is(
  (SELECT count(*)::int FROM public.get_account_audit_logs(
    '00000000-0000-0000-0000-000000000900', 20, NULL, NULL,
    'create'::audit.action_type, 'projects'
  )),
  1,
  'Filtering by action=create + resource_type=projects returns only that one row'
);

-- 8. Invalid limit is rejected before any data is touched.
SELECT throws_ok(
  $$SELECT * FROM public.get_account_audit_logs('00000000-0000-0000-0000-000000000900', 0)$$,
  'invalid_limit'
);

RESET role;
SELECT * FROM finish();
ROLLBACK;
