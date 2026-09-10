-- CAS-safe subscription reconciliation and internal worker health state.
BEGIN;

CREATE TABLE private.billing_worker_health (
  mode text PRIMARY KEY CHECK (mode IN ('recovery','reconciliation')),
  request_id text,
  last_invoked_at timestamptz,
  last_completed_at timestamptz,
  last_status_code integer CHECK (last_status_code BETWEEN 100 AND 599),
  last_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_net_request_id bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.billing_worker_health FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_billing_reconciliation_candidates(p_batch_size integer)
RETURNS TABLE(account_id uuid,provider text,external_subscription_id text,subscription_updated_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_batch_size<1 OR p_batch_size>20 THEN RAISE EXCEPTION 'billing_reconciliation_batch_invalid'; END IF;
  RETURN QUERY SELECT customer.account_id,subscription.provider,subscription.external_subscription_id,subscription.updated_at
  FROM billing.subscriptions subscription JOIN billing.customers customer ON customer.id=subscription.customer_id
  WHERE subscription.status IN ('incomplete','trialing','active','past_due','paused')
    AND subscription.external_subscription_id IS NOT NULL
  ORDER BY subscription.updated_at,subscription.id LIMIT p_batch_size;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_billing_reconciliation_snapshot(
  p_provider text,p_external_event_id text,p_account_id uuid,p_external_subscription_id text,
  p_plan_id uuid,p_status billing.subscription_status,p_current_period_start timestamptz,
  p_current_period_end timestamptz,p_cancel_at_period_end boolean,p_external_customer_id text,
  p_payload jsonb,p_expected_subscription_updated_at timestamptz
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_updated_at timestamptz;
BEGIN
  SELECT subscription.updated_at INTO v_updated_at FROM billing.subscriptions subscription
  JOIN billing.customers customer ON customer.id=subscription.customer_id
  WHERE customer.account_id=p_account_id AND subscription.provider=p_provider
    AND subscription.external_subscription_id=p_external_subscription_id FOR UPDATE OF subscription;
  IF NOT FOUND THEN RAISE EXCEPTION 'billing_subscription_not_found'; END IF;
  IF v_updated_at IS DISTINCT FROM p_expected_subscription_updated_at THEN RETURN 'stale'; END IF;
  RETURN public.apply_subscription_updated(p_provider,p_external_event_id,p_account_id,
    p_external_subscription_id,p_plan_id,p_status,p_current_period_start,p_current_period_end,
    p_cancel_at_period_end,p_external_customer_id,p_payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_billing_worker_result(
  p_mode text,p_request_id text,p_status_code integer,p_summary jsonb
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_mode NOT IN ('recovery','reconciliation') OR p_status_code NOT BETWEEN 100 AND 599
    OR jsonb_typeof(COALESCE(p_summary,'{}'::jsonb))<>'object' THEN RAISE EXCEPTION 'billing_worker_result_invalid'; END IF;
  INSERT INTO private.billing_worker_health(mode,request_id,last_invoked_at,last_completed_at,last_status_code,last_summary)
  VALUES(p_mode,left(p_request_id,100),now(),now(),p_status_code,COALESCE(p_summary,'{}'::jsonb))
  ON CONFLICT(mode) DO UPDATE SET request_id=EXCLUDED.request_id,last_invoked_at=EXCLUDED.last_invoked_at,
    last_completed_at=EXCLUDED.last_completed_at,last_status_code=EXCLUDED.last_status_code,
    last_summary=EXCLUDED.last_summary,updated_at=now();
  RETURN 'recorded';
END;
$$;

CREATE OR REPLACE FUNCTION private.invoke_billing_worker(p_mode text)
RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_url text; v_secret text; v_request_id bigint;
BEGIN
  IF p_mode NOT IN ('recovery','reconciliation') THEN RAISE EXCEPTION 'billing_worker_mode_invalid'; END IF;
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name='billing_worker_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='billing_reconciliation_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN RAISE EXCEPTION 'billing_worker_vault_not_configured'; END IF;
  SELECT net.http_post(url=>rtrim(v_url,'/')||'/api/internal/billing/worker',
    headers=>jsonb_build_object('Content-Type','application/json','X-Billing-Worker-Secret',v_secret),
    body=>jsonb_build_object('mode',p_mode),timeout_milliseconds=>45000) INTO v_request_id;
  INSERT INTO private.billing_worker_health(mode,last_invoked_at,last_net_request_id)
  VALUES(p_mode,now(),v_request_id) ON CONFLICT(mode) DO UPDATE SET last_invoked_at=now(),
    last_net_request_id=EXCLUDED.last_net_request_id,updated_at=now();
  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_billing_reconciliation_candidates(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.apply_billing_reconciliation_snapshot(text,text,uuid,text,uuid,billing.subscription_status,timestamptz,timestamptz,boolean,text,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_billing_worker_result(text,text,integer,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.invoke_billing_worker(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_billing_reconciliation_candidates(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_billing_reconciliation_snapshot(text,text,uuid,text,uuid,billing.subscription_status,timestamptz,timestamptz,boolean,text,jsonb,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_billing_worker_result(text,text,integer,jsonb) TO service_role;

COMMIT;
