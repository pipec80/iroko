-- Plan 012.2 read-only post-migration snapshot; expected baseline is 162.
-- Run after a separately authorized rollout. This script does not send HTTP,
-- claim deliveries, change cron state or disclose URLs, secrets or payloads.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT 'migration_history' AS section, count(*) AS migration_count,
       max(version) AS latest_version,
       bool_or(version = '20261009180000') AS plan_012_2_present
FROM supabase_migrations.schema_migrations;
WITH expected(signature, allowed_role) AS (VALUES
 ('public.reserve_webhook_url_validation(uuid,uuid,text,uuid,bigint,text)', 'service_role'),
 ('public.issue_webhook_url_validation(uuid)', 'service_role'),
 ('public.claim_webhook_deliveries(uuid,integer,integer)', 'service_role'),
 ('public.complete_webhook_delivery(uuid,uuid,text,integer,text)', 'service_role'),
 ('public.create_webhook_endpoint_validated(uuid,text,text[],text,uuid)', 'authenticated'),
 ('public.update_webhook_endpoint_validated(uuid,text,text[],boolean,text,bigint,uuid)', 'authenticated')
)
SELECT 'new_rpc_effective_acl' AS section, e.signature, r.role_name,
       p.oid IS NOT NULL AS function_present,
       has_function_privilege(r.role_name, p.oid, 'EXECUTE') AS can_execute,
       has_function_privilege(r.role_name, p.oid, 'EXECUTE') IS NOT DISTINCT FROM
         (r.role_name = e.allowed_role) AS acl_matches_expected,
       p.prosecdef AS security_definer,
       EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
               WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS public_execute
FROM expected e LEFT JOIN pg_proc p ON p.oid = to_regprocedure(e.signature)
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)
ORDER BY e.signature, r.role_name;
SELECT 'private_helper_effective_acl' AS section,
       p.oid::regprocedure::text AS signature, r.role_name,
       has_function_privilege(r.role_name, p.oid, 'EXECUTE') AS can_execute,
       EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
               WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS public_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)
WHERE n.nspname = 'private' AND p.proname IN (
  'assert_webhook_validation_context', 'consume_webhook_url_validation',
  'send_webhook_delivery', 'process_webhook_deliveries'
)
ORDER BY signature, r.role_name;
SELECT 'validation_ticket_protection' AS section, c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policy WHERE polrelid = c.oid) AS policy_count,
       r.role_name,
       has_table_privilege(r.role_name, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
         AS has_any_direct_table_privilege
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)
WHERE n.nspname = 'private' AND c.relname = 'webhook_url_validations';
SELECT 'delivery_state' AS section, count(*) AS total_deliveries,
       count(*) FILTER (WHERE status = 'pending' AND request_id IS NOT NULL)
         AS pending_historical_requests,
       count(*) FILTER (WHERE status = 'exhausted' AND last_error = 'worker_failed'
                              AND request_id IS NULL) AS quarantine_compatible_rows,
       count(*) FILTER (WHERE lease_token IS NOT NULL) AS active_leases,
       count(*) FILTER (WHERE lease_token IS NOT NULL AND lease_expires_at <= now())
         AS expired_leases
FROM public.webhook_deliveries;
-- worker_failed is shared with other failures: this is not an exact migration delta.
SELECT 'pg_net_queue' AS section, count(*) AS total_queued_requests,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM public.webhook_deliveries d WHERE d.request_id = q.id
       )) AS queued_customer_webhook_requests
FROM net.http_request_queue q;
SELECT 'webhook_cron' AS section, jobid, jobname, active, schedule
FROM cron.job WHERE jobname = 'process-webhook-deliveries';
SELECT 'worker_configuration_presence' AS section,
       count(*) FILTER (WHERE name = 'webhook_worker_url') AS worker_url_entries,
       count(*) FILTER (WHERE name = 'webhook_worker_secret') AS worker_secret_entries
FROM vault.secrets WHERE name IN ('webhook_worker_url', 'webhook_worker_secret');
SELECT 'legacy_failed_retry_boundary' AS section,
       count(*) AS failed_deliveries_with_legacy_request_id,
       count(*) = 0 AS no_stranded_failed_retries
FROM public.webhook_deliveries
WHERE status = 'failed' AND request_id IS NOT NULL;
SELECT 'delivery_trigger' AS section, t.tgname, t.tgenabled,
       t.tgfoid::regprocedure::text AS trigger_function
FROM pg_trigger t
WHERE t.tgrelid = 'public.webhook_deliveries'::regclass AND NOT t.tgisinternal;
-- Source check complements delivery tests; it is not runtime proof of no egress.
SELECT 'queue_only_sender_source' AS section,
       position('net.http' IN pg_get_functiondef(
         'private.send_webhook_delivery(uuid)'::regprocedure)) = 0
         AS sender_has_no_pg_net_http_call;
COMMIT;
-- Configuration presence and SQL checks do not prove Node hosting, secret parity,
-- DNS enforcement in deployment, receiver acceptance or absence of in-flight HTTP.
