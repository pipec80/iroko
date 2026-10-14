-- Plan 012.1: effective privileges, consumer controls and postgres defaults.
-- Existing behavioral suites cover RLS, Auth, CRUD, billing and Realtime.
-- Administrative checks target only the 34 application tables named by migration
-- 20261008130000_revoke_excess_grants.sql, excluding extension-owned/out-of-scope objects.
-- service_role SELECT on accounts, profiles and accounts_memberships is baseline-dependent:
-- Cloud inventory has these three grants; the isolated migration baseline does not.
-- Preserve them by comparing before/after ACL snapshots, without granting new CRUD.
-- This suite does not accept those service flows or establish Cloud parity.
-- Evidence: docs/audits/2026-10-08-plan-012-1-grants-execution.md.
-- These probe tables and their identity sequences are removed by ROLLBACK.
BEGIN;
SET LOCAL ROLE postgres;
SELECT plan(72);

CREATE TEMP TABLE __plan012_grants_scope ON COMMIT DROP AS
SELECT unnest(ARRAY[
  'public.accounts'::regclass,
  'public.accounts_memberships'::regclass,
  'public.announcements'::regclass,
  'public.api_keys'::regclass,
  'public.auth_recovery_codes'::regclass,
  'public.documents'::regclass,
  'public.feature_flag_overrides'::regclass,
  'public.feature_flags'::regclass,
  'public.impersonation_sessions'::regclass,
  'public.invitations'::regclass,
  'public.memberships_history'::regclass,
  'public.notifications'::regclass,
  'public.platform_admins'::regclass,
  'public.profiles'::regclass,
  'public.projects'::regclass,
  'public.robot_contacts'::regclass,
  'public.robot_memories'::regclass,
  'public.robot_routines'::regclass,
  'public.webhook_deliveries'::regclass,
  'public.webhook_endpoints'::regclass,
  'billing.checkout_intents'::regclass,
  'billing.customers'::regclass,
  'billing.events'::regclass,
  'billing.financial_anomalies'::regclass,
  'billing.invoice_line_items'::regclass,
  'billing.invoices'::regclass,
  'billing.payment_attempts'::regclass,
  'billing.payment_methods'::regclass,
  'billing.plans'::regclass,
  'billing.provider_prices'::regclass,
  'billing.reconciliation_state'::regclass,
  'billing.recovery_jobs'::regclass,
  'billing.subscription_items'::regclass,
  'billing.subscriptions'::regclass
])::oid AS object_oid;

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.apply_updated_at_trigger(regclass)'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.apply_updated_at_trigger(regclass)');

SELECT ok(NOT has_function_privilege('anon', 'private.apply_updated_at_trigger(regclass)', 'EXECUTE'), 'anon cannot execute private.apply_updated_at_trigger(regclass)');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.deny_mutation()'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.deny_mutation()');

SELECT ok(NOT has_function_privilege('anon', 'private.deny_mutation()', 'EXECUTE'), 'anon cannot execute private.deny_mutation()');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.get_user_role(uuid,uuid)'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.get_user_role(uuid,uuid)');

-- Storage policies resolve this helper by OID even without schema USAGE.
-- 05_grants separately verifies that anon cannot use the private schema.
SELECT ok(has_function_privilege('anon', 'private.get_user_role(uuid,uuid)', 'EXECUTE'), 'anon retains get_user_role EXECUTE for Storage RLS evaluation');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.handle_new_profile()'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.handle_new_profile()');

SELECT ok(NOT has_function_privilege('anon', 'private.handle_new_profile()', 'EXECUTE'), 'anon cannot execute private.handle_new_profile()');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.handle_new_user()'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.handle_new_user()');

SELECT ok(NOT has_function_privilege('anon', 'private.handle_new_user()', 'EXECUTE'), 'anon cannot execute private.handle_new_user()');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.rls_auto_enable()'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.rls_auto_enable()');

SELECT ok(NOT has_function_privilege('anon', 'private.rls_auto_enable()', 'EXECUTE'), 'anon cannot execute private.rls_auto_enable()');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.set_updated_at()'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.set_updated_at()');

SELECT ok(NOT has_function_privilege('anon', 'private.set_updated_at()', 'EXECUTE'), 'anon cannot execute private.set_updated_at()');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.slugify(text)'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.slugify(text)');

SELECT ok(NOT has_function_privilege('anon', 'private.slugify(text)', 'EXECUTE'), 'anon cannot execute private.slugify(text)');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.user_is_member(uuid,uuid)'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.user_is_member(uuid,uuid)');

SELECT ok(NOT has_function_privilege('anon', 'private.user_is_member(uuid,uuid)', 'EXECUTE'), 'anon cannot execute private.user_is_member(uuid,uuid)');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = 'private.sync_billing_checkout_intent()'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'), 'PUBLIC cannot execute private.sync_billing_checkout_intent()');

SELECT ok(NOT has_function_privilege('anon', 'private.sync_billing_checkout_intent()', 'EXECUTE'), 'anon cannot execute private.sync_billing_checkout_intent()');

SELECT ok(has_function_privilege('authenticated', 'private.get_user_role(uuid,uuid)', 'EXECUTE'), 'authenticated retains RLS helper private.get_user_role(uuid,uuid)');

SELECT ok(has_function_privilege('authenticated', 'private.user_is_member(uuid,uuid)', 'EXECUTE'), 'authenticated retains RLS helper private.user_is_member(uuid,uuid)');

SELECT is((SELECT coalesce(array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname), ARRAY[]::text[]) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid IN (SELECT object_oid FROM __plan012_grants_scope) AND c.relkind IN ('r', 'p') AND has_table_privilege('anon', c.oid, 'TRUNCATE')), ARRAY[]::text[], 'anon has no TRUNCATE on public/billing tables');

SELECT is((SELECT coalesce(array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname), ARRAY[]::text[]) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid IN (SELECT object_oid FROM __plan012_grants_scope) AND c.relkind IN ('r', 'p') AND has_table_privilege('anon', c.oid, 'REFERENCES')), ARRAY[]::text[], 'anon has no REFERENCES on public/billing tables');

SELECT is((SELECT coalesce(array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname), ARRAY[]::text[]) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid IN (SELECT object_oid FROM __plan012_grants_scope) AND c.relkind IN ('r', 'p') AND has_table_privilege('anon', c.oid, 'TRIGGER')), ARRAY[]::text[], 'anon has no TRIGGER on public/billing tables');

SELECT is((SELECT coalesce(array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname), ARRAY[]::text[]) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid IN (SELECT object_oid FROM __plan012_grants_scope) AND c.relkind IN ('r', 'p') AND has_table_privilege('anon', c.oid, 'MAINTAIN')), ARRAY[]::text[], 'anon has no MAINTAIN on public/billing tables');

SELECT is((SELECT coalesce(array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname), ARRAY[]::text[]) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid IN (SELECT object_oid FROM __plan012_grants_scope) AND c.relkind IN ('r', 'p') AND has_table_privilege('authenticated', c.oid, 'TRUNCATE')), ARRAY[]::text[], 'authenticated has no TRUNCATE on public/billing tables');

SELECT is((SELECT coalesce(array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname), ARRAY[]::text[]) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid IN (SELECT object_oid FROM __plan012_grants_scope) AND c.relkind IN ('r', 'p') AND has_table_privilege('authenticated', c.oid, 'REFERENCES')), ARRAY[]::text[], 'authenticated has no REFERENCES on public/billing tables');

SELECT is((SELECT coalesce(array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname), ARRAY[]::text[]) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid IN (SELECT object_oid FROM __plan012_grants_scope) AND c.relkind IN ('r', 'p') AND has_table_privilege('authenticated', c.oid, 'TRIGGER')), ARRAY[]::text[], 'authenticated has no TRIGGER on public/billing tables');

SELECT is((SELECT coalesce(array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname), ARRAY[]::text[]) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid IN (SELECT object_oid FROM __plan012_grants_scope) AND c.relkind IN ('r', 'p') AND has_table_privilege('authenticated', c.oid, 'MAINTAIN')), ARRAY[]::text[], 'authenticated has no MAINTAIN on public/billing tables');

SELECT ok(has_table_privilege('authenticated', 'public.profiles', 'SELECT'), 'authenticated retains SELECT on public.profiles');

SELECT ok(has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), 'authenticated retains UPDATE on public.profiles');

SELECT ok(has_table_privilege('authenticated', 'public.projects', 'SELECT'), 'authenticated retains SELECT on public.projects');

SELECT ok(has_table_privilege('authenticated', 'public.projects', 'INSERT'), 'authenticated retains INSERT on public.projects');

SELECT ok(has_table_privilege('authenticated', 'public.documents', 'SELECT'), 'authenticated retains SELECT on public.documents');

SELECT ok(has_table_privilege('authenticated', 'public.documents', 'INSERT'), 'authenticated retains INSERT on public.documents');

SELECT ok(has_table_privilege('authenticated', 'public.documents', 'UPDATE'), 'authenticated retains UPDATE on public.documents');

SELECT ok(has_table_privilege('authenticated', 'public.robot_routines', 'SELECT'), 'authenticated retains SELECT on public.robot_routines');

SELECT ok(has_table_privilege('authenticated', 'public.robot_routines', 'INSERT'), 'authenticated retains INSERT on public.robot_routines');

SELECT ok(has_table_privilege('authenticated', 'public.robot_routines', 'UPDATE'), 'authenticated retains UPDATE on public.robot_routines');

SELECT ok(has_table_privilege('authenticated', 'public.robot_routines', 'DELETE'), 'authenticated retains DELETE on public.robot_routines');

SELECT ok(has_table_privilege('authenticated', 'public.notifications', 'SELECT'), 'authenticated retains SELECT on public.notifications');

SELECT ok(has_table_privilege('authenticated', 'public.announcements', 'SELECT'), 'authenticated retains SELECT on public.announcements');

SELECT ok(has_table_privilege('service_role', 'public.notifications', 'INSERT'), 'service_role retains INSERT on public.notifications');

SELECT ok(has_table_privilege('supabase_auth_admin', 'public.accounts_memberships', 'SELECT'), 'supabase_auth_admin retains SELECT on public.accounts_memberships');

SELECT ok(has_table_privilege('supabase_auth_admin', 'auth.mfa_factors', 'SELECT'), 'supabase_auth_admin retains SELECT on auth.mfa_factors');

SELECT ok(has_table_privilege('authenticated', 'realtime.messages', 'SELECT'), 'authenticated retains SELECT on realtime.messages');

SELECT ok(has_table_privilege('authenticated', 'realtime.messages', 'INSERT'), 'authenticated retains INSERT on realtime.messages');

SELECT ok(has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'EXECUTE'), 'Auth retains custom access token hook');

CREATE TABLE public.__plan012_grants_probe (id bigint GENERATED BY DEFAULT AS IDENTITY);

SELECT ok(NOT has_table_privilege('anon', 'public.__plan012_grants_probe', 'TRUNCATE'), 'postgres defaults deny anon TRUNCATE in public');

SELECT ok(NOT has_table_privilege('anon', 'public.__plan012_grants_probe', 'REFERENCES'), 'postgres defaults deny anon REFERENCES in public');

SELECT ok(NOT has_table_privilege('anon', 'public.__plan012_grants_probe', 'TRIGGER'), 'postgres defaults deny anon TRIGGER in public');

SELECT ok(NOT has_table_privilege('anon', 'public.__plan012_grants_probe', 'MAINTAIN'), 'postgres defaults deny anon MAINTAIN in public');

SELECT ok(NOT has_table_privilege('authenticated', 'public.__plan012_grants_probe', 'TRUNCATE'), 'postgres defaults deny authenticated TRUNCATE in public');

SELECT ok(NOT has_table_privilege('authenticated', 'public.__plan012_grants_probe', 'REFERENCES'), 'postgres defaults deny authenticated REFERENCES in public');

SELECT ok(NOT has_table_privilege('authenticated', 'public.__plan012_grants_probe', 'TRIGGER'), 'postgres defaults deny authenticated TRIGGER in public');

SELECT ok(NOT has_table_privilege('authenticated', 'public.__plan012_grants_probe', 'MAINTAIN'), 'postgres defaults deny authenticated MAINTAIN in public');

CREATE TABLE billing.__plan012_grants_probe (id bigint GENERATED BY DEFAULT AS IDENTITY);

SELECT ok(NOT has_table_privilege('anon', 'billing.__plan012_grants_probe', 'TRUNCATE'), 'postgres defaults deny anon TRUNCATE in billing');

SELECT ok(NOT has_table_privilege('anon', 'billing.__plan012_grants_probe', 'REFERENCES'), 'postgres defaults deny anon REFERENCES in billing');

SELECT ok(NOT has_table_privilege('anon', 'billing.__plan012_grants_probe', 'TRIGGER'), 'postgres defaults deny anon TRIGGER in billing');

SELECT ok(NOT has_table_privilege('anon', 'billing.__plan012_grants_probe', 'MAINTAIN'), 'postgres defaults deny anon MAINTAIN in billing');

SELECT ok(NOT has_table_privilege('authenticated', 'billing.__plan012_grants_probe', 'TRUNCATE'), 'postgres defaults deny authenticated TRUNCATE in billing');

SELECT ok(NOT has_table_privilege('authenticated', 'billing.__plan012_grants_probe', 'REFERENCES'), 'postgres defaults deny authenticated REFERENCES in billing');

SELECT ok(NOT has_table_privilege('authenticated', 'billing.__plan012_grants_probe', 'TRIGGER'), 'postgres defaults deny authenticated TRIGGER in billing');

SELECT ok(NOT has_table_privilege('authenticated', 'billing.__plan012_grants_probe', 'MAINTAIN'), 'postgres defaults deny authenticated MAINTAIN in billing');

SELECT ok(has_table_privilege('service_role', 'public.__plan012_grants_probe', 'TRUNCATE'), 'public defaults retain service_role TRUNCATE');

SELECT ok(has_table_privilege('service_role', 'public.__plan012_grants_probe', 'REFERENCES'), 'public defaults retain service_role REFERENCES');

SELECT ok(has_table_privilege('service_role', 'public.__plan012_grants_probe', 'TRIGGER'), 'public defaults retain service_role TRIGGER');

SELECT ok(has_table_privilege('service_role', 'public.__plan012_grants_probe', 'MAINTAIN'), 'public defaults retain service_role MAINTAIN');

SELECT ok(has_sequence_privilege('anon', 'public.__plan012_grants_probe_id_seq', 'UPDATE'), 'public defaults retain anon sequence UPDATE');

SELECT ok(has_sequence_privilege('authenticated', 'public.__plan012_grants_probe_id_seq', 'UPDATE'), 'public defaults retain authenticated sequence UPDATE');

SELECT ok(has_sequence_privilege('service_role', 'public.__plan012_grants_probe_id_seq', 'UPDATE'), 'public defaults retain service_role sequence UPDATE');

SELECT * FROM finish();
ROLLBACK;
