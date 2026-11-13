-- SQL admission only: tickets follow SQL45; no DNS, HTTP or provider delivery.
BEGIN;
DO $guard$
BEGIN
  IF to_regclass('iroko_test_guard.target_attestation') IS NULL THEN
    RAISE EXCEPTION 'local_test_attestation_required: run pnpm supa:test';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM iroko_test_guard.target_attestation
    WHERE project_id='saas-boilerplate'
      AND system_identifier=(SELECT system_identifier::text FROM pg_control_system())
      AND expires_at>clock_timestamp()) THEN
    RAISE EXCEPTION 'local_test_attestation_required: invalid or expired target';
  END IF;
END;
$guard$;
SET LOCAL search_path=public,extensions;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
SELECT plan(3);

CREATE FUNCTION pg_temp.webhook_quota_race() RETURNS SETOF text LANGUAGE plpgsql AS $test$
DECLARE
  actor uuid := gen_random_uuid();
  first_endpoint uuid;
  first_ticket uuid;
  second_ticket uuid;
  quota integer;
  peer_pid integer;
  deadline timestamptz;
  outcome text;
  quantity bigint;
  cleanup text;
BEGIN
  PERFORM iroko_test_guard.connect('webhook58-a');
  PERFORM iroko_test_guard.connect('webhook58-b');
  cleanup:=format($clean$
    DELETE FROM vault.secrets WHERE id IN (SELECT secret_id FROM public.webhook_endpoints WHERE account_id=%L);
    DELETE FROM public.webhook_endpoints WHERE account_id=%L;
    DELETE FROM billing.reconciliation_state WHERE subscription_id IN
      (SELECT s.id FROM billing.subscriptions s JOIN billing.customers c ON c.id=s.customer_id WHERE c.account_id=%L);
    DELETE FROM billing.subscriptions WHERE customer_id IN (SELECT id FROM billing.customers WHERE account_id=%L);
    DELETE FROM billing.customers WHERE account_id=%L;
    DELETE FROM public.accounts WHERE id=%L;
    DELETE FROM auth.users WHERE id=%L;
  $clean$,actor,actor,actor,actor,actor,actor,actor);
  PERFORM extensions.dblink_exec('webhook58-a',format(
    'INSERT INTO iroko_test_guard.fixture_ids VALUES (%L)',actor));
  PERFORM extensions.dblink_exec('webhook58-a',format($seed$
    INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,
      confirmation_token,email_confirmed_at,recovery_token,aud,role)
    VALUES (%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated');
    INSERT INTO billing.customers(account_id,provider) VALUES (%L,'mock');
    INSERT INTO billing.subscriptions(customer_id,plan_id,status,provider,external_subscription_id,current_period_end)
    SELECT c.id,p.id,'active','mock',%L,clock_timestamp()+interval '1 month'
    FROM billing.customers c CROSS JOIN billing.plans p
    WHERE c.account_id=%L AND c.provider='mock' AND p.slug='pro' AND p."interval"='month';
  $seed$,actor,'webhook58-'||actor||'@example.test',actor,'webhook58-'||actor,actor));
  SELECT n INTO quota FROM extensions.dblink('webhook58-a',format(
    'SELECT private.get_account_limit(%L,''webhook_endpoints_max'')',actor)) AS x(n integer);
  IF quota IS NULL OR quota<1 OR quota>100 THEN RAISE EXCEPTION 'unexpected fixture quota'; END IF;
  -- Occupy all but the last slot without touching global plan limits or Vault.
  PERFORM extensions.dblink_exec('webhook58-a',format($seed$
    INSERT INTO public.webhook_endpoints(account_id,url,secret_id,events)
    SELECT %L,'https://example.com/seed-'||n,gen_random_uuid(),ARRAY['member.joined']
    FROM generate_series(1,%s) n;
  $seed$,actor,quota-1));
  PERFORM extensions.dblink_exec('webhook58-a',format(
    'SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('webhook58-b',format(
    'SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  SELECT id INTO first_ticket FROM extensions.dblink('webhook58-a',format(
    'SELECT public.issue_webhook_url_validation(public.reserve_webhook_url_validation(%L,%L,''create'',NULL,NULL,''https://example.com/slot-a''))',actor,actor)) AS x(id uuid);
  SELECT id INTO second_ticket FROM extensions.dblink('webhook58-a',format(
    'SELECT public.issue_webhook_url_validation(public.reserve_webhook_url_validation(%L,%L,''create'',NULL,NULL,''https://example.com/slot-b''))',actor,actor)) AS x(id uuid);
  PERFORM extensions.dblink_exec('webhook58-b',$remote$
    CREATE FUNCTION pg_temp.attempt_endpoint(account uuid,ticket uuid) RETURNS text LANGUAGE plpgsql AS $body$
    BEGIN
      PERFORM id FROM public.create_webhook_endpoint_validated(account,'https://example.com/slot-b',ARRAY['member.joined'],NULL,ticket);
      RETURN 'ok';
    EXCEPTION WHEN OTHERS THEN RETURN SQLERRM;
    END $body$;
  $remote$);
  SELECT pid INTO peer_pid FROM extensions.dblink('webhook58-b','SELECT pg_backend_pid()') AS x(pid integer);
  PERFORM extensions.dblink_exec('webhook58-a','BEGIN');
  SELECT id INTO first_endpoint FROM extensions.dblink('webhook58-a',format(
    'SELECT id FROM public.create_webhook_endpoint_validated(%L,''https://example.com/slot-a'',ARRAY[''member.joined''],NULL,%L)',actor,first_ticket)) AS x(id uuid);
  RETURN NEXT ok(first_endpoint IS NOT NULL,'first session admits final webhook slot with a valid SQL ticket');
  PERFORM extensions.dblink_send_query('webhook58-b',format(
    'SELECT pg_temp.attempt_endpoint(%L,%L)',actor,second_ticket));
  deadline:=clock_timestamp()+interval '10 seconds';
  LOOP
    PERFORM pg_stat_clear_snapshot();
    EXIT WHEN extensions.dblink_is_busy('webhook58-b')=0 OR EXISTS(
      SELECT 1 FROM pg_stat_activity WHERE pid=peer_pid AND cardinality(pg_blocking_pids(pid))>0);
    IF clock_timestamp()>deadline THEN RAISE EXCEPTION 'webhook58 barrier timed out'; END IF;
  END LOOP;
  PERFORM extensions.dblink_exec('webhook58-a','COMMIT');
  SELECT result INTO outcome FROM extensions.dblink_get_result('webhook58-b') AS x(result text);
  PERFORM * FROM extensions.dblink_get_result('webhook58-b') AS x(result text);
  RETURN NEXT is(outcome,'endpoint_limit_reached','independent second session rejects the occupied final webhook slot');
  SELECT n INTO quantity FROM extensions.dblink('webhook58-a',format(
    'SELECT count(*) FROM public.webhook_endpoints WHERE account_id=%L',actor)) AS x(n bigint);
  RETURN NEXT is(quantity,quota::bigint,'persisted endpoint count respects the actual plan quota');
  PERFORM extensions.dblink_exec('webhook58-a',cleanup);
  PERFORM extensions.dblink_disconnect('webhook58-a');
  PERFORM extensions.dblink_disconnect('webhook58-b');
EXCEPTION WHEN OTHERS THEN
  IF 'webhook58-b'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_disconnect('webhook58-b');
  END IF;
  IF 'webhook58-a'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_exec('webhook58-a','ROLLBACK');
    PERFORM extensions.dblink_exec('webhook58-a',cleanup);
    PERFORM extensions.dblink_disconnect('webhook58-a');
  END IF;
  RAISE;
END;
$test$;
SELECT * FROM pg_temp.webhook_quota_race();
SELECT * FROM finish();
ROLLBACK;
