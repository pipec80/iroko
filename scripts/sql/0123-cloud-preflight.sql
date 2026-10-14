-- Plan 012.3 preflight: READ ONLY, exact project must be verified externally.
-- Single JSON result for CLI/MCP. No secrets, function bodies or cron commands.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT jsonb_build_array(
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'database_identity' AS section, current_database() AS database_name,
       current_user AS database_role, current_setting('server_version') AS postgres_version
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'migration_history' AS section, count(*) AS migration_count,
       max(version) AS latest_version,
       bool_or(version = '20261013210434') AS hook_present,
       bool_or(version = '20261013210436') AS admission_present,
       bool_or(version = '20261014012941') AS summary_grant_present
FROM supabase_migrations.schema_migrations
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'object_presence' AS section,
       to_regprocedure('public.check_request()') IS NOT NULL AS hook_present,
       to_regprocedure('public.admit_account_api_request(inet,text)') IS NOT NULL AS admission_present,
       to_regclass('private.account_api_ip_admissions') IS NOT NULL AS ip_events_present,
       to_regclass('private.account_api_account_admissions') IS NOT NULL AS account_events_present
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'cleanup_cron' AS section, jobid, jobname, username, active, schedule,
       md5(command) AS command_fingerprint,
       strpos(command, 'private.cleanup_account_api_admissions()') > 0 AS admission_cleanup_present
FROM cron.job WHERE jobname = 'cleanup-rate-limits'
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'hook_configuration' AS section, d.datname AS database_name,
       coalesce(r.rolname, 'ALL') AS configured_role,
       setting = 'pgrst.db_pre_request=public.check_request' AS expected_hook
FROM pg_db_role_setting s
LEFT JOIN pg_database d ON d.oid = s.setdatabase
LEFT JOIN pg_roles r ON r.oid = s.setrole
CROSS JOIN LATERAL unnest(s.setconfig) setting
WHERE setting LIKE 'pgrst.db_pre_request=%'
) snapshot),
(SELECT coalesce(jsonb_agg(to_jsonb(snapshot)), '[]'::jsonb) FROM (
SELECT 'hook_fingerprint' AS section, md5(pg_get_functiondef(p.oid)) AS definition_fingerprint,
       p.prosecdef AS security_definer, p.proconfig
FROM pg_proc p WHERE p.oid = to_regprocedure('public.check_request()')
) snapshot),
(SELECT jsonb_agg(to_jsonb(snapshot)) FROM (SELECT 'effective_acl_baseline' AS section, p.oid::regprocedure::text AS signature,
 r.role_name, has_function_privilege(r.role_name,p.oid,'EXECUTE') AS can_execute,
 EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
 FROM pg_proc p CROSS JOIN(VALUES('anon'),('authenticated'),('service_role')) r(role_name)
 WHERE p.oid=to_regprocedure('public.check_request()')
 UNION ALL
 SELECT 'summary_acl_baseline', a.attname, 'service_role',
 has_column_privilege('service_role','public.accounts',a.attname,'SELECT'),NULL::boolean
 FROM pg_attribute a WHERE a.attrelid='public.accounts'::regclass AND a.attnum>0 AND NOT a.attisdropped) snapshot),
(SELECT jsonb_agg(to_jsonb(snapshot)) FROM (SELECT 'dependencies' AS section,
 to_regclass('public.api_keys') IS NOT NULL AS api_keys_present,
 to_regclass('private.rate_limit_counters') IS NOT NULL AS counters_present,
 EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') AS cron_installed,
 (SELECT count(*) FROM cron.job WHERE jobname='cleanup-rate-limits') AS cleanup_job_count) snapshot)
) AS sections;
COMMIT;
