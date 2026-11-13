-- Local-only independent-session admission test; use the attested pnpm supa:test runner.
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
SET LOCAL search_path = public, extensions;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
SELECT plan(5);

CREATE FUNCTION pg_temp.team_quota_race() RETURNS SETOF text LANGUAGE plpgsql AS $test$
DECLARE
  actor uuid := gen_random_uuid();
  first_team uuid;
  peer_pid integer;
  deadline timestamptz;
  outcome text;
  quantity bigint;
BEGIN
  PERFORM iroko_test_guard.connect('team57-a');
  PERFORM iroko_test_guard.connect('team57-b');
  PERFORM extensions.dblink_exec('team57-a',format(
    'INSERT INTO iroko_test_guard.fixture_ids VALUES (%L)',actor));
  PERFORM extensions.dblink_exec('team57-a',format($seed$
    INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,
      confirmation_token,email_confirmed_at,recovery_token,aud,role)
    VALUES (%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated');
  $seed$,actor,'team57-'||actor||'@example.test'));
  PERFORM extensions.dblink_exec('team57-a',format(
    'SET request.jwt.claims = %L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('team57-b',format(
    'SET request.jwt.claims = %L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('team57-b',$remote$
    CREATE FUNCTION pg_temp.attempt_team(name text) RETURNS text LANGUAGE plpgsql AS $body$
    DECLARE team uuid;
    BEGIN
      team := public.create_team(name);
      INSERT INTO iroko_test_guard.fixture_ids VALUES (team);
      RETURN 'ok';
    EXCEPTION WHEN OTHERS THEN RETURN SQLERRM;
    END $body$;
  $remote$);
  SELECT pid INTO peer_pid FROM extensions.dblink('team57-b','SELECT pg_backend_pid()') AS x(pid integer);
  PERFORM extensions.dblink_exec('team57-a','BEGIN');
  SELECT id INTO first_team FROM extensions.dblink('team57-a',
    'SELECT public.create_team(''Team57 slot A'')') AS x(id uuid);
  PERFORM extensions.dblink_exec('team57-a',format(
    'INSERT INTO iroko_test_guard.fixture_ids VALUES (%L)',first_team));
  RETURN NEXT ok(first_team IS NOT NULL,'first independent session admits the free team slot');
  PERFORM extensions.dblink_send_query('team57-b',
    'SELECT pg_temp.attempt_team(''Team57 slot B'')');
  deadline := clock_timestamp()+interval '10 seconds';
  LOOP
    PERFORM pg_stat_clear_snapshot();
    EXIT WHEN extensions.dblink_is_busy('team57-b')=0 OR EXISTS(
      SELECT 1 FROM pg_stat_activity WHERE pid=peer_pid AND cardinality(pg_blocking_pids(pid))>0);
    IF clock_timestamp()>deadline THEN RAISE EXCEPTION 'team57 barrier timed out'; END IF;
  END LOOP;
  PERFORM extensions.dblink_exec('team57-a','COMMIT');
  SELECT result INTO outcome FROM extensions.dblink_get_result('team57-b') AS x(result text);
  PERFORM * FROM extensions.dblink_get_result('team57-b') AS x(result text);
  RETURN NEXT is(outcome,'team_limit_reached','second independent session rejects the occupied final slot');
  SELECT n INTO quantity FROM extensions.dblink('team57-a',format(
    'SELECT count(*) FROM public.accounts WHERE created_by=%L AND type=''team'' AND deleted_at IS NULL',actor)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'persisted teams do not exceed the free quota');
  SELECT result INTO outcome FROM extensions.dblink('team57-b',
    'SELECT pg_temp.attempt_team('''')') AS x(result text);
  RETURN NEXT is(outcome,'invalid_name','invalid names remain rejected');
  PERFORM extensions.dblink_exec('team57-b','SET request.jwt.claims = ''{"role":"anon"}''');
  SELECT result INTO outcome FROM extensions.dblink('team57-b',
    'SELECT pg_temp.attempt_team(''Unauthorized team'')') AS x(result text);
  RETURN NEXT is(outcome,'not_authenticated','unauthenticated callers remain rejected');
  PERFORM extensions.dblink_exec('team57-a',format(
    'DELETE FROM public.accounts WHERE created_by=%L; DELETE FROM auth.users WHERE id=%L',actor,actor));
  PERFORM extensions.dblink_disconnect('team57-a');
  PERFORM extensions.dblink_disconnect('team57-b');
EXCEPTION WHEN OTHERS THEN
  IF 'team57-b'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_disconnect('team57-b');
  END IF;
  IF 'team57-a'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_exec('team57-a','ROLLBACK');
    PERFORM extensions.dblink_exec('team57-a',format(
      'DELETE FROM public.accounts WHERE created_by=%L; DELETE FROM auth.users WHERE id=%L',actor,actor));
    PERFORM extensions.dblink_disconnect('team57-a');
  END IF;
  RAISE;
END;
$test$;
SELECT * FROM pg_temp.team_quota_race();
SELECT * FROM finish();
ROLLBACK;
