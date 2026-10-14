-- Plan012.2: DNS validation proofs and a fenced Node delivery queue.
-- No customer URL is sent by pg_net. Existing cron activation is unchanged.
-- Apply only after pausing the old worker: queued rows below can be removed,
-- but PostgreSQL cannot recall an HTTP request already in flight.
ALTER TABLE public.webhook_endpoints ADD COLUMN version bigint NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE public.webhook_deliveries
  ADD COLUMN lease_token uuid,
  ADD COLUMN lease_owner uuid,
  ADD COLUMN lease_expires_at timestamptz;

CREATE TABLE private.webhook_url_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('create','update')),
  endpoint_id uuid REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  expected_version bigint,
  canonical_url text NOT NULL,
  policy_version integer NOT NULL DEFAULT 1 CHECK (policy_version = 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '60 seconds',
  validated_at timestamptz,
  consumed_at timestamptz,
  CHECK ((operation='create' AND endpoint_id IS NULL AND expected_version IS NULL)
      OR (operation='update' AND endpoint_id IS NOT NULL AND expected_version IS NOT NULL))
);
CREATE INDEX webhook_url_validations_actor ON private.webhook_url_validations(actor_id,created_at);
CREATE INDEX webhook_url_validations_account ON private.webhook_url_validations(account_id,created_at);
CREATE INDEX webhook_url_validations_created ON private.webhook_url_validations(created_at);
CREATE INDEX webhook_url_validations_endpoint ON private.webhook_url_validations(endpoint_id);
ALTER TABLE private.webhook_url_validations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.webhook_url_validations FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.assert_webhook_validation_context(
 p_account_id uuid,p_actor_id uuid,p_operation text,p_endpoint_id uuid,p_expected_version bigint
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_version bigint; v_role public.membership_role;
BEGIN
 v_role:=private.get_user_role(p_account_id,p_actor_id);
 IF p_actor_id IS NULL OR v_role IS NULL OR v_role NOT IN ('owner','admin') THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 IF NOT private.account_has_feature(p_account_id,'webhooks_enabled') THEN RAISE EXCEPTION 'feature_not_in_plan'; END IF;
 IF p_operation='update' THEN
   SELECT e.version INTO v_version FROM public.webhook_endpoints e WHERE e.id=p_endpoint_id AND e.account_id=p_account_id;
   IF v_version IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
   IF p_expected_version IS NULL OR v_version<>p_expected_version THEN RAISE EXCEPTION 'webhook_version_conflict'; END IF;
 ELSIF p_operation IS DISTINCT FROM 'create' OR p_endpoint_id IS NOT NULL OR p_expected_version IS NOT NULL THEN
   RAISE EXCEPTION 'invalid_webhook_validation';
 END IF;
END; $$;
REVOKE ALL ON FUNCTION private.assert_webhook_validation_context(uuid,uuid,text,uuid,bigint) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.reserve_webhook_url_validation(
 p_account_id uuid,p_actor_id uuid,p_operation text,p_endpoint_id uuid DEFAULT NULL,
 p_expected_version bigint DEFAULT NULL,p_canonical_url text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 -- Account then actor gives one deterministic order across all reservations.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('webhook-account:'||p_account_id::text,0));
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('webhook-actor:'||p_actor_id::text,0));
 PERFORM private.assert_webhook_validation_context(p_account_id,p_actor_id,p_operation,p_endpoint_id,p_expected_version);
 -- Capacity is checked before Node receives a reservation and performs DNS.
 -- Updates do not allocate another endpoint; create rechecks on consumption.
 IF p_operation='create' AND NOT private.within_plan_limit(p_account_id,'webhook_endpoints_max',
   (SELECT count(*) FROM public.webhook_endpoints e WHERE e.account_id=p_account_id)) THEN
   RAISE EXCEPTION 'endpoint_limit_reached';
 END IF;
 PERFORM private.assert_safe_webhook_url(p_canonical_url);
 -- Reservations also maintain expiry when no delivery worker is configured.
 -- Preserve the complete last minute, including consumed proofs, for budgets.
 DELETE FROM private.webhook_url_validations WHERE id IN (
 SELECT id FROM private.webhook_url_validations
 WHERE expires_at<now() AND created_at<now()-interval '1 minute'
 ORDER BY created_at LIMIT 1000);
 IF (SELECT count(*) FROM private.webhook_url_validations WHERE actor_id=p_actor_id AND created_at>now()-interval '1 minute')>=20
 OR (SELECT count(*) FROM private.webhook_url_validations WHERE account_id=p_account_id AND created_at>now()-interval '1 minute')>=100
 OR (SELECT count(*) FROM private.webhook_url_validations WHERE actor_id=p_actor_id AND expires_at>now() AND consumed_at IS NULL)>=10
 OR (SELECT count(*) FROM private.webhook_url_validations WHERE account_id=p_account_id AND expires_at>now() AND consumed_at IS NULL)>=100 THEN
   RAISE EXCEPTION 'webhook_validation_rate_limited';
 END IF;
 INSERT INTO private.webhook_url_validations(account_id,actor_id,operation,endpoint_id,expected_version,canonical_url)
 VALUES(p_account_id,p_actor_id,p_operation,p_endpoint_id,p_expected_version,p_canonical_url) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.issue_webhook_url_validation(p_reservation_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v private.webhook_url_validations%ROWTYPE;
BEGIN
 SELECT * INTO v FROM private.webhook_url_validations WHERE id=p_reservation_id FOR UPDATE;
 IF NOT FOUND OR v.expires_at<=now() OR v.validated_at IS NOT NULL OR v.consumed_at IS NOT NULL OR v.policy_version<>1 THEN RAISE EXCEPTION 'invalid_webhook_validation'; END IF;
 PERFORM private.assert_webhook_validation_context(v.account_id,v.actor_id,v.operation,v.endpoint_id,v.expected_version);
 PERFORM private.assert_safe_webhook_url(v.canonical_url);
 UPDATE private.webhook_url_validations SET validated_at=now() WHERE id=v.id;
 RETURN v.id;
END; $$;

CREATE OR REPLACE FUNCTION private.consume_webhook_url_validation(
 p_ticket uuid,p_account_id uuid,p_operation text,p_endpoint_id uuid,p_expected_version bigint,p_url text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v private.webhook_url_validations%ROWTYPE;
BEGIN
 SELECT * INTO v FROM private.webhook_url_validations WHERE id=p_ticket FOR UPDATE;
 IF NOT FOUND OR v.actor_id IS DISTINCT FROM (SELECT auth.uid()) OR v.account_id IS DISTINCT FROM p_account_id
 OR v.operation IS DISTINCT FROM p_operation OR v.endpoint_id IS DISTINCT FROM p_endpoint_id
 OR v.expected_version IS DISTINCT FROM p_expected_version OR v.canonical_url IS DISTINCT FROM p_url
 OR v.expires_at<=now() OR v.validated_at IS NULL OR v.consumed_at IS NOT NULL OR v.policy_version<>1 THEN
   RAISE EXCEPTION 'invalid_webhook_validation';
 END IF;
 PERFORM private.assert_webhook_validation_context(v.account_id,v.actor_id,v.operation,v.endpoint_id,v.expected_version);
 UPDATE private.webhook_url_validations SET consumed_at=now() WHERE id=v.id;
END; $$;
REVOKE ALL ON FUNCTION private.consume_webhook_url_validation(uuid,uuid,text,uuid,bigint,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.create_webhook_endpoint_validated(
  p_account_id  uuid,
  p_url         text,
  p_events      text[],
  p_description text,
  p_validation_ticket uuid
)
RETURNS TABLE (id uuid, secret text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id        uuid;
  v_secret    text;
  v_secret_id uuid;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('webhook-account:'||p_account_id::text,0));
  PERFORM private.assert_account_admin(p_account_id);
  PERFORM private.assert_safe_webhook_url(p_url);
  IF p_events IS NULL OR array_length(p_events, 1) IS NULL
     OR NOT (p_events <@ private.webhook_event_catalog()) THEN
    RAISE EXCEPTION 'invalid_events';
  END IF;

  IF NOT private.account_has_feature(p_account_id, 'webhooks_enabled') THEN
    RAISE EXCEPTION 'feature_not_in_plan';
  END IF;
  IF NOT private.within_plan_limit(p_account_id, 'webhook_endpoints_max',
      (SELECT count(*) FROM public.webhook_endpoints e WHERE e.account_id = p_account_id)) THEN
    RAISE EXCEPTION 'endpoint_limit_reached';
  END IF;

  PERFORM private.consume_webhook_url_validation(p_validation_ticket,p_account_id,'create',NULL,NULL,p_url);
  v_id := gen_random_uuid();
  v_secret := 'whsec_' || translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_secret_id := vault.create_secret(v_secret, 'webhook_endpoint:' || v_id::text);

  INSERT INTO public.webhook_endpoints (id, account_id, url, description, events, secret_id)
  VALUES (
    v_id,
    p_account_id,
    p_url,
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    p_events,
    v_secret_id
  );

  id := v_id;
  secret := v_secret;
  RETURN NEXT;
END;
$$;


CREATE OR REPLACE FUNCTION public.update_webhook_endpoint_validated(
  p_endpoint_id uuid,
  p_url         text,
  p_events      text[],
  p_enabled     boolean,
  p_description text,
  p_expected_version bigint,
  p_validation_ticket uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT e.account_id INTO v_account_id
  FROM public.webhook_endpoints e WHERE e.id = p_endpoint_id;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('webhook-account:'||v_account_id::text,0));
  PERFORM private.assert_account_admin(v_account_id);
  PERFORM 1 FROM public.webhook_endpoints WHERE id=p_endpoint_id FOR UPDATE;
  PERFORM private.assert_safe_webhook_url(p_url);
  IF p_events IS NULL OR array_length(p_events, 1) IS NULL
     OR NOT (p_events <@ private.webhook_event_catalog()) THEN
    RAISE EXCEPTION 'invalid_events';
  END IF;

  PERFORM private.consume_webhook_url_validation(p_validation_ticket,v_account_id,'update',p_endpoint_id,p_expected_version,p_url);
  UPDATE public.webhook_endpoints
  SET version     = version+1,
      url         = p_url,
      description = NULLIF(btrim(COALESCE(p_description, '')), ''),
      events      = p_events,
      enabled     = COALESCE(p_enabled, enabled)
  WHERE id = p_endpoint_id;
END;
$$;


-- Deliberate protocol migration: tokenless RPCs fail instead of bypassing DNS.
CREATE OR REPLACE FUNCTION public.create_webhook_endpoint(
 p_account_id uuid,p_url text,p_events text[],p_description text DEFAULT NULL
) RETURNS TABLE(id uuid,secret text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.assert_account_admin(p_account_id);
 PERFORM private.assert_safe_webhook_url(p_url);
 IF p_events IS NULL OR array_length(p_events,1) IS NULL OR NOT(p_events<@private.webhook_event_catalog()) THEN RAISE EXCEPTION 'invalid_events'; END IF;
 IF NOT private.account_has_feature(p_account_id,'webhooks_enabled') THEN RAISE EXCEPTION 'feature_not_in_plan'; END IF;
 RAISE EXCEPTION 'webhook_validation_required';
END; $$;
CREATE OR REPLACE FUNCTION public.update_webhook_endpoint(
 p_endpoint_id uuid,p_url text,p_events text[],p_enabled boolean,p_description text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_account uuid;
BEGIN
 SELECT account_id INTO v_account FROM public.webhook_endpoints WHERE id=p_endpoint_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
 PERFORM private.assert_account_admin(v_account);
 PERFORM private.assert_safe_webhook_url(p_url);
 IF NOT private.account_has_feature(v_account,'webhooks_enabled') THEN RAISE EXCEPTION 'feature_not_in_plan'; END IF;
 RAISE EXCEPTION 'webhook_validation_required';
END; $$;

-- Only queue state is touched inside domain transactions. No DNS/network here.
CREATE OR REPLACE FUNCTION private.send_webhook_delivery(p_delivery_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.webhook_deliveries d SET status='exhausted',last_error='feature_not_in_plan',next_retry_at=NULL
 WHERE d.id=p_delivery_id AND NOT private.account_has_feature(d.account_id,'webhooks_enabled');
END; $$;
REVOKE ALL ON FUNCTION private.send_webhook_delivery(uuid) FROM PUBLIC,anon,authenticated,service_role;

-- Remove only not-yet-dispatched historical customer webhook requests.
DELETE FROM net.http_request_queue q USING public.webhook_deliveries d WHERE q.id=d.request_id;
UPDATE public.webhook_deliveries SET status='exhausted',last_error='worker_failed',next_retry_at=NULL,request_id=NULL
WHERE request_id IS NOT NULL AND status='pending';
-- Completed historical failures retain a pg_net request_id. Clear that obsolete
-- transport marker so Node can retry them, preserving attempts and backoff.
UPDATE public.webhook_deliveries SET request_id=NULL
WHERE request_id IS NOT NULL AND status='failed';

CREATE OR REPLACE FUNCTION public.claim_webhook_deliveries(
 p_worker_id uuid,p_batch_size integer,p_visibility_seconds integer
) RETURNS TABLE(delivery_id uuid,lease_token uuid,endpoint_version bigint,canonical_url text,body_text text,headers jsonb,attempt integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v record; v_token uuid; v_body text; v_ts text; v_attempt integer;
BEGIN
 IF p_worker_id IS NULL OR p_batch_size IS NULL OR p_batch_size<1 OR p_batch_size>5 OR p_visibility_seconds IS DISTINCT FROM 60 THEN RAISE EXCEPTION 'invalid_webhook_claim'; END IF;
 -- A crash already consumed its claimed attempt. Recovery waits its backoff.
 UPDATE public.webhook_deliveries d
 SET status=CASE WHEN d.attempts>=4 THEN 'exhausted'::public.webhook_delivery_status ELSE 'failed'::public.webhook_delivery_status END,
 last_error='lease_expired',next_retry_at=CASE WHEN d.attempts>=4 THEN NULL ELSE now()+CASE d.attempts WHEN 1 THEN interval '60 seconds' WHEN 2 THEN interval '300 seconds' ELSE interval '1800 seconds' END END,
 lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL
 WHERE d.lease_expires_at<=now() AND d.lease_token IS NOT NULL;
 UPDATE public.webhook_deliveries d SET status='exhausted',last_error=CASE WHEN NOT e.enabled THEN 'endpoint_disabled' ELSE 'feature_not_in_plan' END,
 next_retry_at=NULL,lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL
 FROM public.webhook_endpoints e WHERE e.id=d.endpoint_id AND d.status IN ('pending','failed')
 AND d.lease_token IS NULL AND (NOT e.enabled OR NOT private.account_has_feature(d.account_id,'webhooks_enabled'));
 FOR v IN
 SELECT d.*,e.url,e.version,vs.decrypted_secret AS signing_secret
 FROM public.webhook_deliveries d JOIN public.webhook_endpoints e ON e.id=d.endpoint_id
 JOIN vault.decrypted_secrets vs ON vs.id=e.secret_id
 WHERE d.status IN ('pending','failed') AND d.lease_token IS NULL AND d.request_id IS NULL
 AND d.attempts<4 AND (d.next_retry_at IS NULL OR d.next_retry_at<=now())
 AND e.enabled AND private.account_has_feature(d.account_id,'webhooks_enabled')
 ORDER BY COALESCE(d.next_retry_at,d.created_at),d.id LIMIT p_batch_size FOR UPDATE OF d SKIP LOCKED
 LOOP
  v_token:=gen_random_uuid();v_attempt:=v.attempts+1;v_ts:=extract(epoch FROM now())::bigint::text;
  v_body:=jsonb_build_object('id',v.id,'type',v.event_type,'created_at',v.created_at,'account_id',v.account_id,'data',v.payload)::text;
  UPDATE public.webhook_deliveries d SET attempts=v_attempt,status='pending',lease_token=v_token,lease_owner=p_worker_id,lease_expires_at=now()+interval '60 seconds',next_retry_at=NULL WHERE d.id=v.id;
  delivery_id:=v.id;lease_token:=v_token;endpoint_version:=v.version;canonical_url:=v.url;body_text:=v_body;attempt:=v_attempt;
  headers:=jsonb_build_object('Content-Type','application/json','X-Iroko-Event',v.event_type,'X-Iroko-Delivery-Id',v.id::text,'X-Iroko-Timestamp',v_ts,'X-Iroko-Signature','sha256='||encode(extensions.hmac(v_ts||'.'||v_body,v.signing_secret,'sha256'),'hex'));
  RETURN NEXT;
 END LOOP;
 -- Keep the full last-minute reservation history for durable rate accounting.
 DELETE FROM private.webhook_url_validations WHERE id IN (
 SELECT id FROM private.webhook_url_validations WHERE expires_at<now() AND created_at<now()-interval '1 minute' ORDER BY created_at LIMIT 1000);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_webhook_delivery(
 p_delivery_id uuid,p_lease_token uuid,p_outcome text,p_http_status integer DEFAULT NULL,p_error_code text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.webhook_deliveries%ROWTYPE;
BEGIN
 SELECT * INTO v FROM public.webhook_deliveries WHERE id=p_delivery_id FOR UPDATE;
 IF NOT FOUND OR v.lease_token IS DISTINCT FROM p_lease_token OR p_lease_token IS NULL OR v.lease_expires_at<=now() THEN RAISE EXCEPTION 'stale_webhook_lease'; END IF;
 IF p_outcome IS NULL OR p_outcome NOT IN ('success','retryable','rejected')
 OR (p_http_status IS NOT NULL AND p_http_status NOT BETWEEN 100 AND 599)
 OR (p_outcome='success' AND (p_http_status IS NULL OR p_http_status NOT BETWEEN 200 AND 299 OR p_error_code IS NOT NULL))
 OR (p_outcome<>'success' AND (p_error_code IS NULL OR p_error_code NOT IN ('dns_failed','dns_timeout','unsafe_destination','invalid_url','tls_failed','redirect_denied','response_too_large','request_timeout','network_failed','http_failed','worker_failed','lease_expired','feature_not_in_plan','endpoint_disabled'))) THEN RAISE EXCEPTION 'invalid_webhook_outcome'; END IF;
 UPDATE public.webhook_deliveries SET
 status=CASE WHEN p_outcome='success' THEN 'success'::public.webhook_delivery_status WHEN p_outcome='rejected' OR attempts>=4 THEN 'exhausted'::public.webhook_delivery_status ELSE 'failed'::public.webhook_delivery_status END,
 last_status_code=p_http_status,last_error=p_error_code,
 delivered_at=CASE WHEN p_outcome='success' THEN now() ELSE NULL END,
 next_retry_at=CASE WHEN p_outcome='retryable' AND attempts<4 THEN now()+CASE attempts WHEN 1 THEN interval '60 seconds' WHEN 2 THEN interval '300 seconds' ELSE interval '1800 seconds' END ELSE NULL END,
 lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL WHERE id=p_delivery_id;
END; $$;

CREATE OR REPLACE FUNCTION private.process_webhook_deliveries()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_url text;v_secret text;
BEGIN
 SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name='webhook_worker_url';
 SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='webhook_worker_secret';
 IF v_url IS NULL OR v_secret IS NULL OR v_secret='' THEN RETURN; END IF;
 -- Operator-owned exact route, never an endpoint/customer-supplied destination.
 IF v_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?/api/internal/webhooks/worker$' THEN RETURN; END IF;
 PERFORM private.assert_safe_webhook_url(v_url);
 PERFORM net.http_post(url:=v_url,body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_secret),timeout_milliseconds:=45000);
END; $$;
REVOKE ALL ON FUNCTION private.process_webhook_deliveries() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION public.reserve_webhook_url_validation(uuid,uuid,text,uuid,bigint,text),public.issue_webhook_url_validation(uuid),public.claim_webhook_deliveries(uuid,integer,integer),public.complete_webhook_delivery(uuid,uuid,text,integer,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_webhook_url_validation(uuid,uuid,text,uuid,bigint,text),public.issue_webhook_url_validation(uuid),public.claim_webhook_deliveries(uuid,integer,integer),public.complete_webhook_delivery(uuid,uuid,text,integer,text) TO service_role;
REVOKE ALL ON FUNCTION public.create_webhook_endpoint_validated(uuid,text,text[],text,uuid),public.update_webhook_endpoint_validated(uuid,text,text[],boolean,text,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_webhook_endpoint_validated(uuid,text,text[],text,uuid),public.update_webhook_endpoint_validated(uuid,text,text[],boolean,text,bigint,uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_webhook_endpoint(uuid,text,text[],text),public.update_webhook_endpoint(uuid,text,text[],boolean,text) FROM PUBLIC,anon;
COMMENT ON FUNCTION private.send_webhook_delivery(uuid) IS 'Queue-only business trigger feature gate. Node owns final DNS, pinned TLS and delivery.';
COMMENT ON FUNCTION private.process_webhook_deliveries() IS 'Existing cron definition wakes only the operator-configured authenticated Node worker. No configuration means no egress.';
