-- Plan 012.2 read-only Cloud readiness snapshot. Never emits URLs, payloads,
-- identifiers of customers, cron commands, credentials or decrypted Vault data.
-- Run with an authorized administrative connection; do not execute worker RPCs.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT 'migration_history' AS section, count(*) AS migration_count,
       max(version) AS latest_version,
       bool_or(version = '20261008120000') AS plan_014_present,
       bool_or(version = '20261008130000') AS plan_012_1_present,
       bool_or(version = '20261009180000') AS plan_012_2_present
FROM supabase_migrations.schema_migrations;
SELECT 'database_identity' AS section, current_database() AS database_name,
       current_setting('server_version') AS postgres_version,
       current_setting('cron.launch_active_jobs', true) AS cron_launch_active_jobs;
-- Job name is a repository-owned constant. The command can contain credentials.
SELECT 'webhook_cron' AS section, jobid, jobname, active, schedule
FROM cron.job WHERE jobname = 'process-webhook-deliveries';
SELECT 'historical_delivery_queue' AS section, count(*) AS total_deliveries,
       count(*) FILTER (WHERE status = 'pending') AS pending_deliveries,
       count(*) FILTER (WHERE status = 'pending' AND request_id IS NOT NULL)
         AS pending_historical_requests,
       count(*) FILTER (WHERE request_id IS NOT NULL) AS deliveries_with_request_id
FROM public.webhook_deliveries;
SELECT 'pg_net_queue' AS section, count(*) AS total_queued_requests,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM public.webhook_deliveries d WHERE d.request_id = q.id
       )) AS queued_customer_webhook_requests
FROM net.http_request_queue q;
-- Presence is configuration metadata, not validity or proof of deployment.
SELECT 'worker_configuration_presence' AS section,
       count(*) FILTER (WHERE name = 'webhook_worker_url') AS worker_url_entries,
       count(*) FILTER (WHERE name = 'webhook_worker_secret') AS worker_secret_entries
FROM vault.secrets WHERE name IN ('webhook_worker_url', 'webhook_worker_secret');
SELECT 'existing_webhook_rpc_effective_acl' AS section,
       p.oid::regprocedure::text AS signature, r.role_name,
       has_function_privilege(r.role_name, p.oid, 'EXECUTE') AS can_execute,
       p.prosecdef AS security_definer,
       EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
               WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS public_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)
WHERE n.nspname = 'public'
  AND p.proname IN ('create_webhook_endpoint', 'update_webhook_endpoint')
ORDER BY signature, r.role_name;
COMMIT;
-- A zero queue count cannot prove absence of in-flight pg_net HTTP requests.
-- Require operational quiescence separately before any migration authorization.
-- pg_net platform grants make queued credentials readable to SQL login roles.
-- Keep net outside Data API exposed schemas; verify through a public-key request
-- with Accept-Profile: net and limit=0 (expected PGRST106), not from ACL alone.
