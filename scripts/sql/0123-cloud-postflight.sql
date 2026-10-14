-- Plan 012.3 postflight: READ ONLY, exact project must be verified externally.
-- Single JSON result for CLI/MCP. No secrets, function bodies or cron commands.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT jsonb_build_array(
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'migration_history' AS section, count(*) AS migration_count,
       max(version) AS latest_version,
       count(*) FILTER (WHERE version IN ('20261013210434','20261013210436','20261014012941')) = 3
         AS all_0123_migrations_present
FROM supabase_migrations.schema_migrations
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'function_acl' AS section, p.oid::regprocedure::text AS signature,
       r.role_name, has_function_privilege(r.role_name,p.oid,'EXECUTE') AS can_execute,
       p.prosecdef AS security_definer, p.proconfig,
       md5(pg_get_functiondef(p.oid)) AS definition_fingerprint,
       EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
               WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
FROM pg_proc p
CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) r(role_name)
WHERE p.oid IN (to_regprocedure('public.admit_account_api_request(inet,text)'),
               to_regprocedure('private.cleanup_account_api_admissions()'),
               to_regprocedure('public.check_request()'))
ORDER BY signature,r.role_name
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'event_table_protection' AS section, c.oid::regclass::text AS relation,
       c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policy WHERE polrelid=c.oid) AS policy_count,
       r.role_name,
       has_table_privilege(r.role_name,c.oid,
         'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AS any_table_privilege,
       has_any_column_privilege(r.role_name,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') AS any_column_privilege
FROM pg_class c
CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) r(role_name)
WHERE c.oid IN (to_regclass('private.account_api_ip_admissions'),
                to_regclass('private.account_api_account_admissions'))
ORDER BY relation,r.role_name
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'event_indexes' AS section, c.oid::regclass::text AS relation,
       count(*) AS total_indexes, bool_and(i.indisvalid AND i.indisready) AS all_valid_ready
FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
WHERE c.oid IN (to_regclass('private.account_api_ip_admissions'),
                to_regclass('private.account_api_account_admissions'))
GROUP BY c.oid ORDER BY relation
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'summary_column_acl' AS section, a.attname AS column_name,
       has_column_privilege('service_role','public.accounts',a.attname,'SELECT') AS can_select
FROM pg_attribute a
WHERE a.attrelid='public.accounts'::regclass AND a.attnum>0 AND NOT a.attisdropped
ORDER BY a.attnum
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'summary_table_acl' AS section,
       has_table_privilege('service_role','public.accounts','SELECT') AS wildcard_select
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'cleanup_cron' AS section, jobid, jobname, username, active, schedule,
       md5(command) AS command_fingerprint,
       md5(replace(command,E'\nSELECT private.cleanup_account_api_admissions()' || chr(59),'')) AS prior_command_fingerprint,
       strpos(command,'private.cleanup_account_api_admissions()')>0 AS admission_cleanup_present
FROM cron.job WHERE jobname='cleanup-rate-limits'
) snapshot)
) AS sections;
COMMIT;
