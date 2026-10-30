-- Run only on the verified official local saas-boilerplate stack.
-- Remote fixtures use fresh UUIDs and are cleaned on success and exceptions.
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
SELECT plan(59);


CREATE FUNCTION pg_temp.race(q_a text,q_b text) RETURNS text LANGUAGE plpgsql AS $race$
DECLARE peer_pid integer; deadline timestamptz; outcome text;
BEGIN
  SELECT pid INTO peer_pid FROM extensions.dblink('freeze53-b','SELECT pg_backend_pid()') AS x(pid integer);
  PERFORM extensions.dblink_exec('freeze53-a','BEGIN');
  PERFORM * FROM extensions.dblink('freeze53-a','SELECT ('||q_a||')::text') AS x(result text);
  PERFORM extensions.dblink_send_query('freeze53-b',format('SELECT pg_temp.attempt(%L)',q_b));
  deadline:=clock_timestamp()+interval '10 seconds';
  LOOP
    PERFORM pg_stat_clear_snapshot();
    EXIT WHEN extensions.dblink_is_busy('freeze53-b')=0 OR EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=peer_pid AND cardinality(pg_blocking_pids(pid))>0);
    IF clock_timestamp()>deadline THEN RAISE EXCEPTION 'freeze53 barrier timed out'; END IF;
  END LOOP;
  PERFORM extensions.dblink_exec('freeze53-a','COMMIT');
  SELECT result INTO outcome FROM extensions.dblink_get_result('freeze53-b') AS x(result text);
  PERFORM * FROM extensions.dblink_get_result('freeze53-b') AS x(result text);
  RETURN outcome;
END;
$race$;

CREATE FUNCTION pg_temp.api_key_race(induce_failure boolean DEFAULT false) RETURNS SETOF text LANGUAGE plpgsql AS $test$
DECLARE
  actor uuid := gen_random_uuid();
  team uuid := gen_random_uuid();
  peer_pid integer;
  result text;
  deadline timestamptz;
  quantity bigint;
BEGIN
  -- Unix socket stays inside the identity-checked database container.
  PERFORM iroko_test_guard.connect('freeze53-a');
  PERFORM iroko_test_guard.connect('freeze53-b');
  PERFORM extensions.dblink_exec('freeze53-a',format('INSERT INTO iroko_test_guard.fixture_ids VALUES (%L),(%L)',actor,team));
  PERFORM extensions.dblink_exec('freeze53-a',format($seed$
    INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,
      confirmation_token,email_confirmed_at,recovery_token,aud,role)
    VALUES (%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated');
    INSERT INTO public.accounts(id,type,name,slug,created_by)
    VALUES (%L,'team','Freeze 53',%L,%L);
    INSERT INTO public.accounts_memberships(account_id,user_id,role)
    VALUES (%L,%L,'owner');
  $seed$,actor,'freeze53-'||actor||'@example.test',team,'freeze53-'||team,actor,team,actor));
  IF induce_failure THEN RAISE EXCEPTION 'freeze53 induced failure'; END IF;
  PERFORM extensions.dblink_exec('freeze53-a',format(
    'SET request.jwt.claims = %L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',format(
    'SET request.jwt.claims = %L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',$remote$
    CREATE FUNCTION pg_temp.attempt(q text) RETURNS text LANGUAGE plpgsql AS $body$
    BEGIN EXECUTE q; RETURN 'ok'; EXCEPTION WHEN OTHERS THEN RETURN SQLERRM; END $body$;
  $remote$);
  SELECT pid INTO peer_pid FROM extensions.dblink('freeze53-b','SELECT pg_backend_pid()') AS x(pid integer);
  PERFORM * FROM extensions.dblink('freeze53-a',format(
    'SELECT id FROM public.create_api_key(%L,''initial'')',team)) AS x(id uuid);
  PERFORM extensions.dblink_exec('freeze53-a','BEGIN');
  PERFORM * FROM extensions.dblink('freeze53-a',format(
    'SELECT id FROM public.create_api_key(%L,''last slot A'')',team)) AS x(id uuid);
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.create_api_key(%L,''independent account'')',actor))) AS x(outcome text);
  RETURN NEXT is(result,'ok','other account admits while first account lock is held');
  PERFORM extensions.dblink_send_query('freeze53-b',format(
    'SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.create_api_key(%L,''last slot B'')',team)));
  deadline := clock_timestamp()+interval '10 seconds';
  -- Explicit barrier: B either finishes (baseline defect) or waits on A's lock.
  WHILE extensions.dblink_is_busy('freeze53-b')=1
    AND NOT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid=peer_pid AND cardinality(pg_blocking_pids(pid))>0)
  LOOP
    PERFORM pg_stat_clear_snapshot();
    IF clock_timestamp()>deadline THEN RAISE EXCEPTION 'freeze53 barrier timed out'; END IF;
  END LOOP;
  PERFORM extensions.dblink_exec('freeze53-a','COMMIT');
  SELECT outcome INTO result FROM extensions.dblink_get_result('freeze53-b') AS x(outcome text);
  PERFORM * FROM extensions.dblink_get_result('freeze53-b') AS x(outcome text);
  RETURN NEXT is(result,'key_limit_reached','api_key_last_slot_two_sessions rejects second admission');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format(
    'SELECT count(*) FROM public.api_keys WHERE account_id=%L AND revoked_at IS NULL',team)) AS x(n bigint);
  RETURN NEXT is(quantity,2::bigint,'persisted key count equals free limit');
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format(
    'SELECT pg_temp.attempt(%L)',format('SELECT public.revoke_api_key(id) FROM public.api_keys WHERE account_id=%L LIMIT 1',team))) AS x(outcome text);
  RETURN NEXT is(result,'ok','revocation succeeds');
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format(
    'SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.create_api_key(%L,''replacement'')',team))) AS x(outcome text);
  RETURN NEXT is(result,'ok','revoked key frees quota');
  PERFORM extensions.dblink_exec('freeze53-b','SET request.jwt.claims = ''{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}''');
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format(
    'SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.create_api_key(%L,''outsider'')',team))) AS x(outcome text);
  RETURN NEXT is(result,'not_authorized','nonmember cannot create keys');
  PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM public.accounts WHERE id IN (%L,%L); DELETE FROM auth.users WHERE id=%L',team,actor,actor));
  PERFORM extensions.dblink_disconnect('freeze53-a');
  PERFORM extensions.dblink_disconnect('freeze53-b');
EXCEPTION WHEN OTHERS THEN
  IF 'freeze53-b'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_disconnect('freeze53-b');
  END IF;
  IF 'freeze53-a'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_exec('freeze53-a','ROLLBACK');
    PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM public.accounts WHERE id IN (%L,%L); DELETE FROM auth.users WHERE id=%L',team,actor,actor));
    PERFORM extensions.dblink_disconnect('freeze53-a');
  END IF;
  RAISE;
END;
$test$;
SELECT * FROM pg_temp.api_key_race();
SELECT throws_ok('SELECT * FROM pg_temp.api_key_race(true)','P0001','freeze53 induced failure','injected fixture failure propagates');
SELECT is((SELECT count(*) FROM auth.users WHERE email LIKE 'freeze53-%@example.test'),0::bigint,'second residue check after induced exception');

CREATE FUNCTION pg_temp.invitation_scenarios() RETURNS SETOF text LANGUAGE plpgsql AS $test$
DECLARE
  actor uuid := gen_random_uuid(); guest uuid := gen_random_uuid(); team uuid := gen_random_uuid(); peer uuid := gen_random_uuid();
  invitation uuid; peer_pid integer; result text; deadline timestamptz; quantity bigint;
  guest_email text := 'freeze53-'||guest||'@example.test';
BEGIN
  PERFORM iroko_test_guard.connect('freeze53-a');
  PERFORM iroko_test_guard.connect('freeze53-b');
  PERFORM extensions.dblink_exec('freeze53-a',format('INSERT INTO iroko_test_guard.fixture_ids VALUES (%L),(%L)',actor,team));
  PERFORM extensions.dblink_exec('freeze53-a',format($seed$
    INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
    VALUES (%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated'),(%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated');
    INSERT INTO public.accounts(id,type,name,slug,created_by) VALUES (%L,'team','Freeze 53',%L,%L);
    INSERT INTO public.accounts_memberships(account_id,user_id,role) VALUES (%L,%L,'owner');
  $seed$,actor,'freeze53-'||actor||'@example.test',guest,guest_email,team,'freeze53-'||team,actor,team,actor));
  PERFORM extensions.dblink_exec('freeze53-a',format('INSERT INTO iroko_test_guard.fixture_ids VALUES (%L)',guest));
  PERFORM extensions.dblink_exec('freeze53-a',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',$remote$
    CREATE FUNCTION pg_temp.attempt(q text) RETURNS text LANGUAGE plpgsql AS $body$
    BEGIN EXECUTE q; RETURN 'ok'; EXCEPTION WHEN OTHERS THEN RETURN SQLERRM; END $body$;
  $remote$);
  SELECT pid INTO peer_pid FROM extensions.dblink('freeze53-b','SELECT pg_backend_pid()') AS x(pid integer);
  PERFORM extensions.dblink_exec('freeze53-a','BEGIN');
  PERFORM * FROM extensions.dblink('freeze53-a',format('SELECT email FROM public.invite_members(%L,ARRAY[%L])',team,guest_email)) AS x(email text);
  PERFORM extensions.dblink_send_query('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.invite_members(%L,ARRAY[''other@example.test''])',team)));
  deadline:=clock_timestamp()+interval '10 seconds';
  WHILE extensions.dblink_is_busy('freeze53-b')=1 AND NOT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=peer_pid AND cardinality(pg_blocking_pids(pid))>0) LOOP
    PERFORM pg_stat_clear_snapshot();
    IF clock_timestamp()>deadline THEN RAISE EXCEPTION 'freeze53 invitation barrier timed out'; END IF;
  END LOOP;
  PERFORM extensions.dblink_exec('freeze53-a','COMMIT');
  SELECT outcome INTO result FROM extensions.dblink_get_result('freeze53-b') AS x(outcome text);
  PERFORM * FROM extensions.dblink_get_result('freeze53-b') AS x(outcome text);
  RETURN NEXT is(result,'seat_limit_reached','invite_last_slot_two_batches rejects second reservation');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.invitations WHERE account_id=%L AND status=''pending''',team)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'only one reservation persisted');
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.invite_members(%L,ARRAY[%L,%L])',team,guest_email,upper(guest_email)))) AS x(outcome text);
  RETURN NEXT is(result,'ok','duplicate normalized emails do not reserve extra seats');
  PERFORM extensions.dblink_exec('freeze53-a',format('UPDATE public.invitations SET token_hash=encode(extensions.digest(%L,''sha256''),''hex'') WHERE account_id=%L AND email=%L','freeze53-'||guest,team,guest_email));
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.accept_invitation(%L)','freeze53-'||guest))) AS x(outcome text);
  RETURN NEXT is(result,'Invalid or expired invitation','token bound to authenticated email');
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',guest,'role','authenticated')::text));
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.accept_invitation(%L)','freeze53-'||guest))) AS x(outcome text);
  RETURN NEXT is(result,'ok','reservation converts into membership');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.accounts_memberships WHERE account_id=%L',team)) AS x(n bigint);
  RETURN NEXT is(quantity,2::bigint,'membership count respects quota');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.profiles WHERE id=%L AND active_account_id=%L',guest,team)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'accepted invitation switches active account');

  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.accept_invitation(%L)','freeze53-'||guest))) AS x(outcome text);
  RETURN NEXT is(result,'Invalid or expired invitation','second acceptance rejected');
  SELECT id INTO invitation FROM extensions.dblink('freeze53-a',format('SELECT id FROM public.invitations WHERE account_id=%L AND email=%L',team,guest_email)) AS x(id uuid);
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT public.revoke_invitation(%L)',invitation))) AS x(outcome text);
  RETURN NEXT is(result,'invitation_not_pending','accepted transition cannot be revoked');
  PERFORM extensions.dblink_exec('freeze53-a',format($seed$
    INSERT INTO iroko_test_guard.fixture_ids VALUES (%L);
    INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
    VALUES (%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated');
    DELETE FROM public.accounts_memberships WHERE account_id=%L AND user_id=%L;
    UPDATE public.invitations SET status='pending',expires_at=clock_timestamp()+interval '1 day' WHERE id=%L;
    INSERT INTO public.invitations(account_id,email,token_hash,invited_by) VALUES (%L,%L,encode(extensions.digest(%L,'sha256'),'hex'),%L);
  $seed$,peer,peer,'freeze53-'||peer||'@example.test',team,guest,invitation,team,'freeze53-'||peer||'@example.test','freeze53-'||peer,actor));
  PERFORM extensions.dblink_exec('freeze53-a',format('SET request.jwt.claims=%L',json_build_object('sub',guest,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',peer,'role','authenticated')::text));
  result:=pg_temp.race(format('(SELECT account_id::text FROM public.accept_invitation(%L))','freeze53-'||guest),format('SELECT * FROM public.accept_invitation(%L)','freeze53-'||peer));
  RETURN NEXT is(result,'seat_limit_reached','accept_last_slot_two_users rejects second admission');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.accounts_memberships WHERE account_id=%L',team)) AS x(n bigint);
  RETURN NEXT is(quantity,2::bigint,'concurrent acceptance leaves quota respected');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.invitations WHERE account_id=%L AND status=''pending''',team)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'quota rejection does not consume pending invitation');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.profiles WHERE id=%L AND active_account_id=%L',peer,team)) AS x(n bigint);
  RETURN NEXT is(quantity,0::bigint,'quota rejection leaves active account unchanged');

  -- Reissue the pending invitation under Pro, then reduce the effective quota.
  PERFORM extensions.dblink_exec('freeze53-a',format($seed$
    INSERT INTO billing.customers(account_id,provider) VALUES (%L,'mock');
    INSERT INTO billing.subscriptions(customer_id,plan_id,status,provider,external_subscription_id,current_period_end)
    SELECT c.id,p.id,'active','mock',%L,clock_timestamp()+interval '1 month'
    FROM billing.customers c CROSS JOIN billing.plans p WHERE c.account_id=%L AND c.provider='mock' AND p.slug='pro' AND p."interval"='month';
    UPDATE public.invitations SET status='revoked' WHERE account_id=%L AND email=%L AND status='pending';
  $seed$,team,'freeze53-sub-'||team,team,team,'freeze53-'||peer||'@example.test'));
  PERFORM extensions.dblink_exec('freeze53-a',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM * FROM extensions.dblink('freeze53-a',format('SELECT email FROM public.invite_members(%L,ARRAY[%L])',team,'freeze53-'||peer||'@example.test')) AS x(email text);
  PERFORM extensions.dblink_exec('freeze53-a',format('UPDATE public.invitations SET token_hash=encode(extensions.digest(%L,''sha256''),''hex'') WHERE account_id=%L AND email=%L AND status=''pending''; UPDATE billing.subscriptions SET status=''canceled'',current_period_end=clock_timestamp()-interval ''1 day'' WHERE external_subscription_id=%L','freeze53-'||peer,team,'freeze53-'||peer||'@example.test','freeze53-sub-'||team));
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.accept_invitation(%L)','freeze53-'||peer))) AS x(outcome text);
  RETURN NEXT is(result,'seat_limit_reached','downgrade after invitation emission blocks acceptance at new limit');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.invitations WHERE account_id=%L AND email=%L AND status=''pending''',team,'freeze53-'||peer||'@example.test')) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'downgrade rejection preserves reservation');
  SELECT id INTO invitation FROM extensions.dblink('freeze53-a',format('SELECT id FROM public.invitations WHERE account_id=%L AND email=%L AND status=''pending''',team,'freeze53-'||peer||'@example.test')) AS x(id uuid);
  PERFORM extensions.dblink_exec('freeze53-a',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  result:=pg_temp.race(format('public.revoke_invitation(%L)',invitation),format('SELECT * FROM public.accept_invitation(%L)','freeze53-'||peer));
  RETURN NEXT is(result,'Invalid or expired invitation','revoke wins while accept waits');
  PERFORM extensions.dblink_exec('freeze53-a',format('UPDATE public.invitations SET status=''pending'' WHERE id=%L; DELETE FROM public.accounts_memberships WHERE account_id=%L AND user_id=%L',invitation,team,guest));
  PERFORM extensions.dblink_exec('freeze53-a',format('SET request.jwt.claims=%L',json_build_object('sub',peer,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  result:=pg_temp.race(format('(SELECT account_id::text FROM public.accept_invitation(%L))','freeze53-'||peer),format('SELECT public.revoke_invitation(%L)',invitation));
  RETURN NEXT is(result,'invitation_not_pending','accept wins while revoke waits');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.accounts_memberships WHERE account_id=%L AND user_id=%L',team,peer)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'accepted membership survives racing revoke');
  PERFORM extensions.dblink_exec('freeze53-a',format('UPDATE public.invitations SET status=''pending'',expires_at=clock_timestamp()-interval ''1 second'' WHERE id=%L',invitation));
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',peer,'role','authenticated')::text));
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT * FROM public.accept_invitation(%L)','freeze53-'||peer))) AS x(outcome text);
  RETURN NEXT is(result,'Invalid or expired invitation','expired pending invitation cannot accept');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.invitations WHERE id=%L AND status=''pending''',invitation)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'expired rejection does not consume invitation');

  PERFORM extensions.dblink_exec('freeze53-a',format('UPDATE public.invitations SET status=''pending'',expires_at=clock_timestamp()+interval ''1 day'' WHERE id=%L',invitation));
  PERFORM extensions.dblink_exec('freeze53-a',$remote$
    CREATE FUNCTION pg_temp.expire_while_locked(team uuid, invitation uuid) RETURNS void LANGUAGE plpgsql AS $body$
    BEGIN PERFORM 1 FROM public.accounts WHERE id=team FOR UPDATE;
      UPDATE public.invitations SET expires_at=clock_timestamp()-interval '1 second' WHERE id=invitation;
    END $body$;
  $remote$);
  result:=pg_temp.race(format('pg_temp.expire_while_locked(%L,%L)',team,invitation),format('SELECT * FROM public.accept_invitation(%L)','freeze53-'||peer));
  RETURN NEXT is(result,'Invalid or expired invitation','expiry changed while acceptance waits is revalidated');
  PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM billing.reconciliation_state WHERE subscription_id IN (SELECT s.id FROM billing.subscriptions s JOIN billing.customers c ON c.id=s.customer_id WHERE c.account_id=%L); DELETE FROM billing.subscriptions WHERE customer_id IN (SELECT id FROM billing.customers WHERE account_id=%L); DELETE FROM billing.customers WHERE account_id=%L',team,team,team));
  PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM public.accounts WHERE id IN (%L,%L,%L,%L); DELETE FROM auth.users WHERE id IN (%L,%L,%L)',team,actor,guest,peer,actor,guest,peer));
  PERFORM extensions.dblink_disconnect('freeze53-a'); PERFORM extensions.dblink_disconnect('freeze53-b');
EXCEPTION WHEN OTHERS THEN
  IF 'freeze53-b'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN PERFORM extensions.dblink_disconnect('freeze53-b'); END IF;
  IF 'freeze53-a'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_exec('freeze53-a','ROLLBACK');
    PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM billing.reconciliation_state WHERE subscription_id IN (SELECT s.id FROM billing.subscriptions s JOIN billing.customers c ON c.id=s.customer_id WHERE c.account_id=%L); DELETE FROM billing.subscriptions WHERE customer_id IN (SELECT id FROM billing.customers WHERE account_id=%L); DELETE FROM billing.customers WHERE account_id=%L',team,team,team));
  PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM public.accounts WHERE id IN (%L,%L,%L,%L); DELETE FROM auth.users WHERE id IN (%L,%L,%L)',team,actor,guest,peer,actor,guest,peer));
    PERFORM extensions.dblink_disconnect('freeze53-a');
  END IF;
  RAISE;
END;
$test$;
SELECT * FROM pg_temp.invitation_scenarios();


-- T3: real authenticated DML, actor belongs to both accounts.
CREATE TEMP TABLE freeze53_ids AS SELECT gen_random_uuid() AS actor,gen_random_uuid() AS other_account,gen_random_uuid() AS project_a,gen_random_uuid() AS project_b,gen_random_uuid() AS document;
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
SELECT actor,'freeze53-'||actor||'@example.test','{}',now(),now(),'',now(),'','authenticated','authenticated' FROM freeze53_ids;
INSERT INTO public.accounts(id,type,name,slug,created_by) SELECT other_account,'team','Freeze 53 B','freeze53-'||other_account,actor FROM freeze53_ids;
INSERT INTO public.accounts_memberships(account_id,user_id,role) SELECT other_account,actor,'owner' FROM freeze53_ids;
INSERT INTO public.projects(id,account_id,name,slug,created_by) SELECT project_a,actor,'A','freeze53-a',actor FROM freeze53_ids UNION ALL SELECT project_b,other_account,'B','freeze53-b',actor FROM freeze53_ids;
SELECT set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true) FROM freeze53_ids;
GRANT SELECT ON freeze53_ids TO authenticated;
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('INSERT INTO public.documents(project_id,account_id,name) VALUES (%L,%L,''cross account'')',project_b,actor),'23503',NULL,'cross account INSERT rejected') FROM freeze53_ids;
SELECT lives_ok(format('INSERT INTO public.documents(id,project_id,account_id,name) VALUES (%L,%L,%L,''same account'')',document,project_a,actor),'same account document persists') FROM freeze53_ids;
SELECT throws_ok(format('UPDATE public.documents SET project_id=%L WHERE id=%L',project_b,document),'23503',NULL,'cross account project UPDATE rejected') FROM freeze53_ids;
SELECT throws_ok(format('UPDATE public.documents SET account_id=%L WHERE id=%L',other_account,document),'23503',NULL,'cross account account UPDATE rejected') FROM freeze53_ids;
SELECT throws_ok(format('INSERT INTO public.documents(project_id,account_id,name) VALUES (NULL,%L,''null project'')',actor),'23502',NULL,'project remains NOT NULL') FROM freeze53_ids;
RESET ROLE;
SELECT is((SELECT count(*) FROM public.documents d JOIN freeze53_ids i ON i.document=d.id),1::bigint,'one valid document persisted');
DELETE FROM public.projects WHERE id IN (SELECT project_a FROM freeze53_ids);
SELECT is((SELECT count(*) FROM public.documents d JOIN freeze53_ids i ON i.document=d.id),0::bigint,'project delete cascades');
SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conname='documents_project_account_fkey' AND convalidated),'composite FK validated');

CREATE FUNCTION pg_temp.owner_race() RETURNS SETOF text LANGUAGE plpgsql AS $test$
DECLARE
  actor uuid := gen_random_uuid();
  peer uuid := gen_random_uuid();
  team uuid := gen_random_uuid();
  peer_pid integer;
  result text;
  deadline timestamptz;
  quantity bigint;
BEGIN
  -- Unix socket stays inside the identity-checked database container.
  PERFORM iroko_test_guard.connect('freeze53-a');
  PERFORM iroko_test_guard.connect('freeze53-b');
  PERFORM extensions.dblink_exec('freeze53-a',format('INSERT INTO iroko_test_guard.fixture_ids VALUES (%L),(%L)',actor,team));
  PERFORM extensions.dblink_exec('freeze53-a',format($seed$
    INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,
      confirmation_token,email_confirmed_at,recovery_token,aud,role)
    VALUES (%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated');
    INSERT INTO public.accounts(id,type,name,slug,created_by)
    VALUES (%L,'team','Freeze 53',%L,%L);
    INSERT INTO public.accounts_memberships(account_id,user_id,role)
    VALUES (%L,%L,'owner');
  $seed$,actor,'freeze53-'||actor||'@example.test',team,'freeze53-'||team,actor,team,actor));
  PERFORM extensions.dblink_exec('freeze53-a',format('INSERT INTO iroko_test_guard.fixture_ids VALUES (%L)',peer));
  PERFORM extensions.dblink_exec('freeze53-a',format($seed$ INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role) VALUES (%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated'); INSERT INTO public.accounts_memberships(account_id,user_id,role) VALUES (%L,%L,'owner') $seed$,peer,'freeze53-'||peer||'@example.test',team,peer));
  PERFORM extensions.dblink_exec('freeze53-a',format(
    'SET request.jwt.claims = %L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',format(
    'SET request.jwt.claims = %L',json_build_object('sub',peer,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',$remote$
    CREATE FUNCTION pg_temp.attempt(q text) RETURNS text LANGUAGE plpgsql AS $body$
    BEGIN EXECUTE q; RETURN 'ok'; EXCEPTION WHEN OTHERS THEN RETURN SQLERRM; END $body$;
  $remote$);
  SELECT pid INTO peer_pid FROM extensions.dblink('freeze53-b','SELECT pg_backend_pid()') AS x(pid integer);
  PERFORM extensions.dblink_exec('freeze53-a','BEGIN');
  PERFORM * FROM extensions.dblink('freeze53-a',format(
    'SELECT public.leave_team(%L)::text',team)) AS x(outcome text);
  PERFORM extensions.dblink_send_query('freeze53-b',format(
    'SELECT pg_temp.attempt(%L)',format('SELECT public.leave_team(%L)',team)));
  deadline := clock_timestamp()+interval '10 seconds';
  -- Explicit barrier: B either finishes (baseline defect) or waits on A's lock.
  WHILE extensions.dblink_is_busy('freeze53-b')=1
    AND NOT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid=peer_pid AND cardinality(pg_blocking_pids(pid))>0)
  LOOP
    PERFORM pg_stat_clear_snapshot();
    IF clock_timestamp()>deadline THEN RAISE EXCEPTION 'freeze53 barrier timed out'; END IF;
  END LOOP;
  PERFORM extensions.dblink_exec('freeze53-a','COMMIT');
  SELECT outcome INTO result FROM extensions.dblink_get_result('freeze53-b') AS x(outcome text);
  PERFORM * FROM extensions.dblink_get_result('freeze53-b') AS x(outcome text);
  RETURN NEXT is(result,'last_owner_must_transfer','two owners leaving preserves loser membership');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.accounts_memberships WHERE account_id=%L AND role=''owner''',team)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'persisted final owner remains');

  PERFORM extensions.dblink_exec('freeze53-a',format('INSERT INTO public.accounts_memberships(account_id,user_id,role) VALUES (%L,%L,''owner'')',team,actor));
  PERFORM extensions.dblink_exec('freeze53-a',format('SET request.jwt.claims=%L',json_build_object('sub',peer,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  result:=pg_temp.race(format('public.transfer_ownership(%L,%L)',team,actor),format('SELECT public.leave_team(%L)',team));
  RETURN NEXT is(result,'last_owner_must_transfer','transfer before racing leave preserves new owner');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.accounts_memberships WHERE account_id=%L AND role=''owner'' AND user_id=%L',team,actor)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'ownership transfer commits exactly the intended owner');
  -- Waiting caller loses its membership before attempting another member role change.
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',peer,'role','authenticated')::text));
  result:=pg_temp.race(format('public.leave_team(%L)',team),format('SELECT public.change_member_role(%L,%L,''member'')',team,actor));
  RETURN NEXT is(result,'Only owner or admin can change member roles','waiting role change revalidates caller after departure');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.accounts_memberships WHERE account_id=%L AND role=''owner''',team)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'leave versus role change leaves one owner');
  -- Privileged direct DML cannot deadlock a RPC by inverting account/row locks.
  PERFORM extensions.dblink_exec('freeze53-a',format('INSERT INTO public.accounts_memberships(account_id,user_id,role) VALUES (%L,%L,''owner'')',team,peer));
  PERFORM extensions.dblink_exec('freeze53-a',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  result:=pg_temp.race(format('public.leave_team(%L)',team),format('DELETE FROM public.accounts_memberships WHERE account_id=%L AND user_id=%L',team,peer));
  RETURN NEXT is(result,'could not obtain lock on row in relation "accounts"','direct DML contention fails fast rather than deadlocks');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.accounts_memberships WHERE account_id=%L AND role=''owner''',team)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'direct DML contention still preserves final owner');

  PERFORM extensions.dblink_exec('freeze53-a',format('INSERT INTO public.accounts_memberships(account_id,user_id,role) VALUES (%L,%L,''owner'')',team,actor));
  PERFORM extensions.dblink_exec('freeze53-a',$remote$
    CREATE FUNCTION pg_temp.demote_owner(team uuid, actor uuid) RETURNS void LANGUAGE plpgsql AS $body$
    BEGIN UPDATE public.accounts_memberships SET role='admin' WHERE account_id=team AND user_id=actor; END $body$;
  $remote$);
  result:=pg_temp.race(format('pg_temp.demote_owner(%L,%L)',team,actor),format('UPDATE public.accounts_memberships SET role=''admin'' WHERE account_id=%L AND user_id=%L',team,peer));
  RETURN NEXT is(result,'could not obtain lock on row in relation "accounts"','direct owner demotions reject contending mutation');
  SELECT n INTO quantity FROM extensions.dblink('freeze53-a',format('SELECT count(*) FROM public.accounts_memberships WHERE account_id=%L AND role=''owner''',team)) AS x(n bigint);
  RETURN NEXT is(quantity,1::bigint,'direct concurrent demotions retain one persisted owner');
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format('SELECT public.leave_team(%L)',actor))) AS x(outcome text);
  RETURN NEXT is(result,'not_a_team','personal account cannot be left through team flow');
  PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM public.accounts WHERE id IN (%L,%L,%L); DELETE FROM auth.users WHERE id IN (%L,%L)',team,actor,peer,actor,peer));
  PERFORM extensions.dblink_disconnect('freeze53-a');
  PERFORM extensions.dblink_disconnect('freeze53-b');
EXCEPTION WHEN OTHERS THEN
  IF 'freeze53-b'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_disconnect('freeze53-b');
  END IF;
  IF 'freeze53-a'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_exec('freeze53-a','ROLLBACK');
    PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM public.accounts WHERE id IN (%L,%L,%L); DELETE FROM auth.users WHERE id IN (%L,%L)',team,actor,peer,actor,peer));
    PERFORM extensions.dblink_disconnect('freeze53-a');
  END IF;
  RAISE;
END;
$test$;
SELECT * FROM pg_temp.owner_race();
SELECT throws_ok(format('UPDATE public.accounts_memberships SET account_id=%L WHERE account_id=%L AND user_id=%L',other_account,actor,actor),'23000','membership_account_immutable','owner membership cannot move accounts by direct DML') FROM freeze53_ids;

CREATE FUNCTION pg_temp.robot_replace_scenarios() RETURNS SETOF text LANGUAGE plpgsql AS $test$
DECLARE
  actor uuid := gen_random_uuid(); member uuid := gen_random_uuid(); team uuid := gen_random_uuid();
  result text; count_rows bigint; snapshot text;
  a_routines jsonb := '[{"time":"08:00","activity_type":"A"}]';
  a_contacts jsonb := '[{"name":"A","phone":"100"}]';
  a_memories jsonb := '[{"entity":"A","name":"A","key_fact":"A"}]';
  b_routines jsonb := '[{"time":"09:00","activity_type":"B"}]';
  b_contacts jsonb := '[{"name":"B","phone":"200"}]';
  b_memories jsonb := '[{"entity":"B","name":"B","key_fact":"B"}]';
BEGIN
  PERFORM iroko_test_guard.connect('freeze53-a');
  PERFORM iroko_test_guard.connect('freeze53-b');
  PERFORM extensions.dblink_exec('freeze53-a',format('INSERT INTO iroko_test_guard.fixture_ids VALUES (%L),(%L),(%L)',actor,member,team));
  PERFORM extensions.dblink_exec('freeze53-a',format($seed$
    INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
    VALUES (%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated'),
           (%L,%L,'{}',now(),now(),'',now(),'','authenticated','authenticated');
    INSERT INTO public.accounts(id,type,name,slug,created_by) VALUES (%L,'team','Freeze 53 Robot',%L,%L);
    INSERT INTO public.accounts_memberships(account_id,user_id,role)
    VALUES (%L,%L,'owner'),(%L,%L,'member');
  $seed$,actor,'freeze53-'||actor||'@example.test',member,'freeze53-'||member||'@example.test',
    team,'freeze53-robot-'||team,actor,team,actor,team,member));
  PERFORM extensions.dblink_exec('freeze53-a',format('SET request.jwt.claims=%L',json_build_object('sub',actor,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',format('SET request.jwt.claims=%L',json_build_object('sub',member,'role','authenticated')::text));
  PERFORM extensions.dblink_exec('freeze53-b',$remote$
    CREATE FUNCTION pg_temp.attempt(q text) RETURNS text LANGUAGE plpgsql AS $body$
    BEGIN EXECUTE q; RETURN 'ok'; EXCEPTION WHEN OTHERS THEN RETURN SQLERRM; END $body$;
  $remote$);

  result := pg_temp.race(
    format('public.replace_robot_config(%L,%L::jsonb,%L::jsonb,%L::jsonb)',team,a_routines,a_contacts,a_memories),
    format('SELECT public.replace_robot_config(%L,%L::jsonb,%L::jsonb,%L::jsonb)',team,b_routines,b_contacts,b_memories));
  RETURN NEXT is(result,'ok','empty_robot_two_replacements: second writer succeeds');
  SELECT s INTO snapshot FROM extensions.dblink('freeze53-a',format($query$
    SELECT string_agg(kind||':'||name,',' ORDER BY kind,name) FROM (
      SELECT 'routine' AS kind,activity_type AS name FROM public.robot_routines WHERE account_id=%L
      UNION ALL SELECT 'contact',name FROM public.robot_contacts WHERE account_id=%L
      UNION ALL SELECT 'memory',name FROM public.robot_memories WHERE account_id=%L
    ) rows
  $query$,team,team,team)) AS x(s text);
  RETURN NEXT is(snapshot,'contact:B,memory:B,routine:B','empty_robot_two_replacements: persisted snapshot is complete B, never mixed');
  SELECT n INTO count_rows FROM extensions.dblink('freeze53-a',format(
    'SELECT count(*) FROM public.robot_routines WHERE account_id=%L',actor)) AS x(n bigint);
  RETURN NEXT is(count_rows,0::bigint,'other account robot routines remain untouched');

  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format(
    'SELECT public.replace_robot_config(%L,%L::jsonb,%L::jsonb,%L::jsonb)',team,'[]','[]','[]'))) AS x(outcome text);
  RETURN NEXT is(result,'ok','empty replacement succeeds');
  SELECT n INTO count_rows FROM extensions.dblink('freeze53-a',format($query$
    SELECT (SELECT count(*) FROM public.robot_routines WHERE account_id=%L)
         + (SELECT count(*) FROM public.robot_contacts WHERE account_id=%L)
         + (SELECT count(*) FROM public.robot_memories WHERE account_id=%L)
  $query$,team,team,team)) AS x(n bigint);
  RETURN NEXT is(count_rows,0::bigint,'empty replacement removes all three collections');

  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format(
    'SELECT public.replace_robot_config(%L,%L::jsonb,%L::jsonb,%L::jsonb)',team,b_routines,b_contacts,b_memories))) AS x(outcome text);
  RETURN NEXT is(result,'ok','valid snapshot restored before rollback case');
  SELECT outcome INTO result FROM extensions.dblink('freeze53-b',format('SELECT pg_temp.attempt(%L)',format(
    'SELECT public.replace_robot_config(%L,%L::jsonb,%L::jsonb,%L::jsonb)',team,a_routines,a_contacts,'{"not_an_array":true}'))) AS x(outcome text);
  RETURN NEXT is(result LIKE '%cannot extract elements from an object%',true,'third collection parse error rejects replacement');
  SELECT s INTO snapshot FROM extensions.dblink('freeze53-a',format($query$
    SELECT string_agg(kind||':'||name,',' ORDER BY kind,name) FROM (
      SELECT 'routine' AS kind,activity_type AS name FROM public.robot_routines WHERE account_id=%L
      UNION ALL SELECT 'contact',name FROM public.robot_contacts WHERE account_id=%L
      UNION ALL SELECT 'memory',name FROM public.robot_memories WHERE account_id=%L
    ) rows
  $query$,team,team,team)) AS x(s text);
  RETURN NEXT is(snapshot,'contact:B,memory:B,routine:B','parse error rolls back all three collections');

  PERFORM extensions.dblink_exec('freeze53-a',$remote$
    CREATE FUNCTION pg_temp.replace_then_revoke(team uuid, member uuid) RETURNS void LANGUAGE plpgsql AS $body$
    BEGIN
      PERFORM public.replace_robot_config(team,'[{"time":"08:00","activity_type":"A"}]',
        '[{"name":"A","phone":"100"}]','[{"entity":"A","name":"A","key_fact":"A"}]');
      DELETE FROM public.accounts_memberships WHERE account_id=team AND user_id=member;
    END $body$;
  $remote$);
  result := pg_temp.race(format('pg_temp.replace_then_revoke(%L,%L)',team,member),format(
    'SELECT public.replace_robot_config(%L,%L::jsonb,%L::jsonb,%L::jsonb)',team,b_routines,b_contacts,b_memories));
  RETURN NEXT is(result,'not_authorized','waiting member loses role before replacement');
  SELECT s INTO snapshot FROM extensions.dblink('freeze53-a',format($query$
    SELECT string_agg(kind||':'||name,',' ORDER BY kind,name) FROM (
      SELECT 'routine' AS kind,activity_type AS name FROM public.robot_routines WHERE account_id=%L
      UNION ALL SELECT 'contact',name FROM public.robot_contacts WHERE account_id=%L
      UNION ALL SELECT 'memory',name FROM public.robot_memories WHERE account_id=%L
    ) rows
  $query$,team,team,team)) AS x(s text);
  RETURN NEXT is(snapshot,'contact:A,memory:A,routine:A','revocation race preserves authorized complete snapshot');

  PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM public.accounts WHERE id IN (%L,%L,%L); DELETE FROM auth.users WHERE id IN (%L,%L)',team,actor,member,actor,member));
  PERFORM extensions.dblink_disconnect('freeze53-a');
  PERFORM extensions.dblink_disconnect('freeze53-b');
EXCEPTION WHEN OTHERS THEN
  IF 'freeze53-b'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_disconnect('freeze53-b');
  END IF;
  IF 'freeze53-a'=ANY(coalesce(extensions.dblink_get_connections(),ARRAY[]::text[])) THEN
    PERFORM extensions.dblink_exec('freeze53-a','ROLLBACK');
    PERFORM extensions.dblink_exec('freeze53-a',format('DELETE FROM public.accounts WHERE id IN (%L,%L,%L); DELETE FROM auth.users WHERE id IN (%L,%L)',team,actor,member,actor,member));
    PERFORM extensions.dblink_disconnect('freeze53-a');
  END IF;
  RAISE;
END;
$test$;
SELECT * FROM pg_temp.robot_replace_scenarios();
SELECT * FROM finish();
ROLLBACK;
