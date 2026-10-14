-- pgTAP: safe webhook validation and durable Node leases
BEGIN;
SELECT plan(48);
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000004501', 'safe-owner@example.com',
   '{"given_name":"Owner","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000004502', 'safe-member@example.com',
   '{"given_name":"Member","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000004500', 'team', 'Team Webhooks', 'safe-webhooks',
        '00000000-0000-0000-0000-000000004501');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000004500', '00000000-0000-0000-0000-000000004501', 'owner'),
  ('00000000-0000-0000-0000-000000004500', '00000000-0000-0000-0000-000000004502', 'member');

-- Sub pro (F3-3H-1: create_webhook_endpoint/send_webhook_delivery gatean por
-- feature webhooks_enabled del plan; este suite no testea ese gate en sí,
-- así que la cuenta necesita el feature activo, patrón de 11_billing.test.sql).
SELECT set_config(
  'app.test_pro_plan_id',
  (SELECT id::text FROM billing.plans WHERE slug = 'pro' AND "interval" = 'month'),
  true
);
SET LOCAL role service_role;
SELECT public.apply_subscription_created(
  'mock', 'evt_webhooks_test_1', '00000000-0000-0000-0000-000000004500',
  current_setting('app.test_pro_plan_id')::uuid,
  'sub_webhooks_test', 'active', now(), now() + interval '30 days', false,
  NULL, '{}'::jsonb);
RESET role;

-- ── 1. Member no puede crear endpoints ──────────────────────────────────────
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000004501', 'role', 'authenticated')::text,
  true
);

SELECT throws_ok($$SELECT * FROM public.create_webhook_endpoint('00000000-0000-0000-0000-000000004500','https://example.com/hook',ARRAY['member.joined'])$$,'webhook_validation_required','legacy create cannot bypass DNS ticket');

SELECT ok(NOT has_function_privilege('authenticated','public.reserve_webhook_url_validation(uuid,uuid,text,uuid,bigint,text)','EXECUTE'),'authenticated cannot reserve proofs');

SELECT ok(NOT has_function_privilege('anon','public.issue_webhook_url_validation(uuid)','EXECUTE'),'anon cannot validate proofs');

SELECT ok(has_function_privilege('service_role','public.claim_webhook_deliveries(uuid,integer,integer)','EXECUTE'),'worker can claim');

SELECT ok(NOT has_function_privilege('authenticated','public.claim_webhook_deliveries(uuid,integer,integer)','EXECUTE'),'user cannot claim signing envelope');

SELECT throws_ok($$SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004502','create',NULL,NULL,'https://example.com/hook')$$,'not_authorized','member cannot reserve');

CREATE TEMP TABLE ticket AS SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','create',NULL,NULL,'https://example.com/hook') AS id;

SELECT throws_ok($$SELECT * FROM public.create_webhook_endpoint_validated('00000000-0000-0000-0000-000000004500','https://example.com/hook',ARRAY['member.joined'],NULL,(SELECT id FROM ticket))$$,'invalid_webhook_validation','unvalidated reservation cannot mutate');

SELECT is(public.issue_webhook_url_validation((SELECT id FROM ticket)),(SELECT id FROM ticket),'issue returns same opaque proof');

SELECT throws_ok($$SELECT public.issue_webhook_url_validation((SELECT id FROM ticket))$$,'invalid_webhook_validation','issue cannot repeat');

SELECT throws_ok($$SELECT * FROM public.create_webhook_endpoint_validated('00000000-0000-0000-0000-000000004500','https://example.com/other',ARRAY['member.joined'],NULL,(SELECT id FROM ticket))$$,'invalid_webhook_validation','proof binds exact URL');

CREATE TEMP TABLE safe_ep AS SELECT * FROM public.create_webhook_endpoint_validated('00000000-0000-0000-0000-000000004500','https://example.com/hook',ARRAY['member.joined'],NULL,(SELECT id FROM ticket));

SELECT is((SELECT version FROM public.webhook_endpoints WHERE id=(SELECT id FROM safe_ep)),1::bigint,'endpoint begins at version1');

SELECT throws_ok($$SELECT * FROM public.create_webhook_endpoint_validated('00000000-0000-0000-0000-000000004500','https://example.com/hook',ARRAY['member.joined'],NULL,(SELECT id FROM ticket))$$,'invalid_webhook_validation','proof single use');

SELECT private.emit_webhook_event('00000000-0000-0000-0000-000000004500','member.joined','{}');

SELECT is((SELECT attempts FROM public.webhook_deliveries WHERE endpoint_id=(SELECT id FROM safe_ep)),0,'business trigger does not send');

SELECT is((SELECT request_id FROM public.webhook_deliveries WHERE endpoint_id=(SELECT id FROM safe_ep)),NULL::bigint,'no client URL is queued to pg_net');

CREATE TEMP TABLE claimed AS SELECT * FROM public.claim_webhook_deliveries('00000000-0000-0000-0000-000000004599',5,60);

SELECT is((SELECT count(*) FROM claimed),1::bigint,'one eligible job claimed');

SELECT is((SELECT attempt FROM claimed),1,'claim consumes first attempt');

SELECT is((SELECT count(*) FROM public.claim_webhook_deliveries('00000000-0000-0000-0000-000000004598',5,60)),0::bigint,'active lease prevents duplicate claim');

SELECT ok((SELECT headers ? 'X-Iroko-Signature' AND NOT headers ? 'Authorization' FROM claimed),'claim returns signed headers without auth');

SELECT is((SELECT headers->>'X-Iroko-Signature' FROM claimed),'sha256='||(SELECT encode(extensions.hmac((c.headers->>'X-Iroko-Timestamp')||'.'||c.body_text,e.secret,'sha256'),'hex') FROM claimed c CROSS JOIN safe_ep e),'HMAC binds exact returned bytes');

SELECT throws_ok($$SELECT public.complete_webhook_delivery((SELECT delivery_id FROM claimed),gen_random_uuid(),'success',200,NULL)$$,'stale_webhook_lease','completion fenced');

SELECT throws_ok($$SELECT public.complete_webhook_delivery((SELECT delivery_id FROM claimed),(SELECT lease_token FROM claimed),'retryable',NULL,'remote arbitrary text')$$,'invalid_webhook_outcome','remote error text rejected');

SELECT public.complete_webhook_delivery((SELECT delivery_id FROM claimed),(SELECT lease_token FROM claimed),'retryable',503,'http_failed');

SELECT is((SELECT status::text FROM public.webhook_deliveries WHERE id=(SELECT delivery_id FROM claimed)),'failed','retry durable');

SELECT is((SELECT next_retry_at FROM public.webhook_deliveries WHERE id=(SELECT delivery_id FROM claimed)),now()+interval '60 seconds','first retry backoff preserved');

UPDATE public.webhook_deliveries SET next_retry_at=now()-interval '1 second' WHERE id=(SELECT delivery_id FROM claimed);

CREATE TEMP TABLE claimed2 AS SELECT * FROM public.claim_webhook_deliveries('00000000-0000-0000-0000-000000004599',5,60);

SELECT is((SELECT attempt FROM claimed2),2,'retry increments attempts');

SELECT public.complete_webhook_delivery((SELECT delivery_id FROM claimed2),(SELECT lease_token FROM claimed2),'rejected',302,'redirect_denied');

SELECT is((SELECT status::text FROM public.webhook_deliveries WHERE id=(SELECT delivery_id FROM claimed2)),'exhausted','unsafe redirects terminal');

SELECT throws_ok($$SELECT public.complete_webhook_delivery((SELECT delivery_id FROM claimed2),(SELECT lease_token FROM claimed2),'success',200,NULL)$$,'stale_webhook_lease','completed token cannot replay');

CREATE TEMP TABLE update_ticket AS SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','update',(SELECT id FROM safe_ep),1,'https://example.com/new') AS id;

SELECT public.issue_webhook_url_validation((SELECT id FROM update_ticket));

SELECT public.update_webhook_endpoint_validated((SELECT id FROM safe_ep),'https://example.com/new',ARRAY['member.joined'],true,NULL,1,(SELECT id FROM update_ticket));

SELECT is((SELECT version FROM public.webhook_endpoints WHERE id=(SELECT id FROM safe_ep)),2::bigint,'update advances endpoint version');

SELECT throws_ok($$SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','update',(SELECT id FROM safe_ep),1,'https://example.com/new')$$,'webhook_version_conflict','stale update version fails');

SELECT private.process_webhook_deliveries();

SELECT is((SELECT count(*) FROM net.http_request_queue),0::bigint,'unconfigured wakeup sends nothing');

CREATE TEMP TABLE bound_ticket AS SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','update',(SELECT id FROM safe_ep),2,'https://example.com/bound') AS id;
SELECT public.issue_webhook_url_validation((SELECT id FROM bound_ticket));
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000004502","role":"authenticated"}',true);
SELECT throws_ok($$SELECT private.consume_webhook_url_validation((SELECT id FROM bound_ticket),'00000000-0000-0000-0000-000000004500','update',(SELECT id FROM safe_ep),2,'https://example.com/bound')$$,'invalid_webhook_validation','ticket binds actor');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000004501","role":"authenticated"}',true);
SELECT throws_ok($$SELECT private.consume_webhook_url_validation((SELECT id FROM bound_ticket),gen_random_uuid(),'update',(SELECT id FROM safe_ep),2,'https://example.com/bound')$$,'invalid_webhook_validation','ticket binds account');
SELECT throws_ok($$SELECT private.consume_webhook_url_validation((SELECT id FROM bound_ticket),'00000000-0000-0000-0000-000000004500','create',NULL,NULL,'https://example.com/bound')$$,'invalid_webhook_validation','ticket binds operation');
SELECT throws_ok($$SELECT private.consume_webhook_url_validation((SELECT id FROM bound_ticket),'00000000-0000-0000-0000-000000004500','update',gen_random_uuid(),2,'https://example.com/bound')$$,'invalid_webhook_validation','ticket binds endpoint');
SELECT throws_ok($$SELECT private.consume_webhook_url_validation((SELECT id FROM bound_ticket),'00000000-0000-0000-0000-000000004500','update',(SELECT id FROM safe_ep),3,'https://example.com/bound')$$,'invalid_webhook_validation','ticket binds version');
UPDATE private.webhook_url_validations SET expires_at=now()-interval '1 second' WHERE id=(SELECT id FROM bound_ticket);
SELECT throws_ok($$SELECT private.consume_webhook_url_validation((SELECT id FROM bound_ticket),'00000000-0000-0000-0000-000000004500','update',(SELECT id FROM safe_ep),2,'https://example.com/bound')$$,'invalid_webhook_validation','expired ticket rejected');
UPDATE private.webhook_url_validations SET expires_at=now()+interval '60 seconds' WHERE id=(SELECT id FROM bound_ticket);
-- Preserve the production invariant requiring at least one owner.
UPDATE public.accounts_memberships SET role='owner' WHERE account_id='00000000-0000-0000-0000-000000004500' AND user_id='00000000-0000-0000-0000-000000004502';
UPDATE public.accounts_memberships SET role='member' WHERE account_id='00000000-0000-0000-0000-000000004500' AND user_id='00000000-0000-0000-0000-000000004501';
SELECT throws_ok($$SELECT private.consume_webhook_url_validation((SELECT id FROM bound_ticket),'00000000-0000-0000-0000-000000004500','update',(SELECT id FROM safe_ep),2,'https://example.com/bound')$$,'42501','not_authorized','live role rechecked at consumption');
UPDATE public.accounts_memberships SET role='owner' WHERE account_id='00000000-0000-0000-0000-000000004500' AND user_id='00000000-0000-0000-0000-000000004501';
UPDATE public.accounts_memberships SET role='member' WHERE account_id='00000000-0000-0000-0000-000000004500' AND user_id='00000000-0000-0000-0000-000000004502';
SELECT throws_ok($$SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','update',(SELECT id FROM safe_ep),NULL,'https://example.com/bound')$$,'webhook_version_conflict','missing version rejected');
SELECT ok(NOT has_table_privilege('authenticated','private.webhook_url_validations','SELECT'),'tickets inaccessible to authenticated');
SELECT ok(NOT has_table_privilege('service_role','private.webhook_url_validations','INSERT'),'service role cannot bypass ticket RPC');
SELECT ok(NOT has_function_privilege('anon','public.complete_webhook_delivery(uuid,uuid,text,integer,text)','EXECUTE'),'anon cannot complete leases');

SELECT private.emit_webhook_event('00000000-0000-0000-0000-000000004500','member.joined','{"lease":true}');
CREATE TEMP TABLE crashed AS SELECT * FROM public.claim_webhook_deliveries('00000000-0000-0000-0000-000000004599',5,60);
UPDATE public.webhook_deliveries SET lease_expires_at=now()-interval '1 second' WHERE id=(SELECT delivery_id FROM crashed);
SELECT is((SELECT count(*) FROM public.claim_webhook_deliveries('00000000-0000-0000-0000-000000004598',5,60)),0::bigint,'expired lease waits retry backoff');
SELECT is((SELECT attempts FROM public.webhook_deliveries WHERE id=(SELECT delivery_id FROM crashed)),1,'crash retains consumed attempt');
SELECT throws_ok($$SELECT public.complete_webhook_delivery((SELECT delivery_id FROM crashed),(SELECT lease_token FROM crashed),'success',200,NULL)$$,'stale_webhook_lease','expired worker fenced after recovery');

-- A full plan must reject a create reservation before Node can perform DNS.
SAVEPOINT endpoint_capacity;
UPDATE billing.plans SET limits=jsonb_set(COALESCE(limits,'{}'::jsonb),'{webhook_endpoints_max}','0'::jsonb)
WHERE id=current_setting('app.test_pro_plan_id')::uuid;
SELECT throws_ok($$SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','create',NULL,NULL,'https://example.com/capacity')$$,'endpoint_limit_reached','full endpoint plan denies reservation before DNS');
SELECT is((SELECT count(*) FROM private.webhook_url_validations WHERE canonical_url='https://example.com/capacity'),0::bigint,'rejected capacity does not mint a DNS reservation');
SELECT lives_ok($$SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','update',(SELECT id FROM safe_ep),2,'https://example.com/capacity-update')$$,'updates remain permitted when endpoint capacity is full');
ROLLBACK TO SAVEPOINT endpoint_capacity;
RELEASE SAVEPOINT endpoint_capacity;
-- Retain consumed proofs in the rolling budget; expiry cleanup must not erase it.
DELETE FROM private.webhook_url_validations WHERE account_id='00000000-0000-0000-0000-000000004500';
INSERT INTO private.webhook_url_validations(account_id,actor_id,operation,canonical_url,consumed_at)
SELECT '00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','create','https://example.com/budget',now() FROM generate_series(1,20);
SELECT throws_ok($$SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','create',NULL,NULL,'https://example.com/budget')$$,'webhook_validation_rate_limited','consumed proofs still count toward actor budget');
UPDATE private.webhook_url_validations SET created_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute';
SELECT public.reserve_webhook_url_validation('00000000-0000-0000-0000-000000004500','00000000-0000-0000-0000-000000004501','create',NULL,NULL,'https://example.com/budget');
SELECT is((SELECT count(*) FROM private.webhook_url_validations WHERE created_at<now()-interval '1 minute'),0::bigint,'reserve cleans old proofs without worker');
SELECT * FROM finish();
ROLLBACK;
