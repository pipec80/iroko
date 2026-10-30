ALTER TABLE billing.recovery_jobs ADD COLUMN lease_token uuid,ADD COLUMN lease_expires_at timestamptz;
DO $$ DECLARE affected integer; BEGIN
 UPDATE billing.recovery_jobs SET status='pending',locked_at=NULL,last_error_code='legacy_processing_without_lease' WHERE status='processing';
 GET DIAGNOSTICS affected=ROW_COUNT; RAISE NOTICE 'billing recovery legacy processing requeued: %',affected;
END; $$;
DROP FUNCTION public.claim_billing_recovery_jobs(integer,integer);
CREATE OR REPLACE FUNCTION public.claim_billing_recovery_jobs(p_batch_size integer,p_visibility_seconds integer)
RETURNS TABLE(id uuid,provider text,resource_type text,resource_id text,reason text,attempt_count integer,lease_token uuid,lease_expires_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_batch_size IS NULL OR p_visibility_seconds IS NULL OR p_batch_size<1 OR p_batch_size>20 OR p_visibility_seconds<30 OR p_visibility_seconds>3600
    THEN RAISE EXCEPTION 'billing_recovery_claim_invalid'; END IF;
  RETURN QUERY WITH candidates AS (
    SELECT job.id FROM billing.recovery_jobs job
    WHERE (job.status='pending' AND job.next_attempt_at<=now())
       OR (job.status='processing' AND job.lease_expires_at<=clock_timestamp())
    ORDER BY job.next_attempt_at,job.created_at LIMIT p_batch_size FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE billing.recovery_jobs job SET status='processing',locked_at=now(),lease_token=gen_random_uuid(),lease_expires_at=clock_timestamp()+make_interval(secs=>p_visibility_seconds),attempt_count=LEAST(job.attempt_count+1,5)
    FROM candidates WHERE job.id=candidates.id
    RETURNING job.id,job.provider,job.resource_type,job.resource_id,job.reason,job.attempt_count,job.lease_token,job.lease_expires_at
  ) SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_billing_recovery_jobs(integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_billing_recovery_jobs(integer,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.apply_billing_recovery_result(p_job_id uuid,p_lease_token uuid,p_result jsonb)
RETURNS TABLE(status text,anomaly_created boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_job billing.recovery_jobs%ROWTYPE; v_event jsonb; v_observation jsonb; v_kind text; v_plan_id uuid;
BEGIN
 SELECT * INTO v_job FROM billing.recovery_jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND OR v_job.status<>'processing' OR p_lease_token IS NULL
 OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_expires_at IS NULL
 OR v_job.lease_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'billing_recovery_lease_not_owned'; END IF;
 v_kind:=p_result->>'kind';
 IF jsonb_typeof(p_result) IS DISTINCT FROM 'object' OR v_kind IS NULL OR v_kind NOT IN ('event','anomaly','pending','unrelated','error') THEN RAISE EXCEPTION 'billing_recovery_result_invalid'; END IF;
 IF v_kind='event' THEN
 v_event:=p_result->'event';
 IF jsonb_typeof(v_event) IS DISTINCT FROM 'object' OR (v_event->>'provider') IS DISTINCT FROM v_job.provider
 OR COALESCE(v_event->>'externalPaymentId',v_event#>>'{raw,payment,id}',v_event#>>'{raw,id}') IS DISTINCT FROM v_job.resource_id
 OR NULLIF(v_event->>'accountId','') IS NULL OR NULLIF(v_event->>'externalEventId','') IS NULL
 OR NULLIF(v_event->>'externalSubscriptionId','') IS NULL THEN RAISE EXCEPTION 'billing_recovery_result_invalid'; END IF;
 IF v_event->>'type'='subscription_created' OR v_event->>'externalPriceId' IS NOT NULL THEN
 SELECT plan_id INTO v_plan_id FROM public.resolve_billing_plan_by_external_price(v_job.provider,v_event->>'externalPriceId');
 IF v_plan_id IS NULL THEN RAISE EXCEPTION 'billing_recovery_result_invalid'; END IF;
 END IF;
IF v_event->>'type'='subscription_created' THEN
 PERFORM public.apply_subscription_created(p_provider => v_event->>'provider',
p_external_event_id => v_event->>'externalEventId',
p_account_id => (v_event->>'accountId')::uuid,
p_plan_id => v_plan_id,
p_external_subscription_id => v_event->>'externalSubscriptionId',
p_status => (v_event->>'status')::billing.subscription_status,
p_current_period_start => (v_event->>'currentPeriodStart')::timestamptz,
p_current_period_end => (v_event->>'currentPeriodEnd')::timestamptz,
p_cancel_at_period_end => (v_event->>'cancelAtPeriodEnd')::boolean,
p_external_customer_id => v_event->>'externalCustomerId',
p_payload => v_event->'raw');
ELSIF v_event->>'type'='subscription_updated' THEN
 PERFORM public.apply_subscription_updated(p_provider => v_event->>'provider',
p_external_event_id => v_event->>'externalEventId',
p_account_id => (v_event->>'accountId')::uuid,
p_external_subscription_id => v_event->>'externalSubscriptionId',
p_plan_id => v_plan_id,
p_status => (v_event->>'status')::billing.subscription_status,
p_current_period_start => (v_event->>'currentPeriodStart')::timestamptz,
p_current_period_end => (v_event->>'currentPeriodEnd')::timestamptz,
p_cancel_at_period_end => (v_event->>'cancelAtPeriodEnd')::boolean,
p_external_customer_id => v_event->>'externalCustomerId',
p_payload => v_event->'raw');
ELSIF v_event->>'type'='subscription_canceled' THEN
 PERFORM public.apply_subscription_canceled(p_provider => v_event->>'provider',
p_external_event_id => v_event->>'externalEventId',
p_account_id => (v_event->>'accountId')::uuid,
p_external_subscription_id => v_event->>'externalSubscriptionId',
p_canceled_at => (v_event->>'canceledAt')::timestamptz,
p_access_until => (v_event->>'accessUntil')::timestamptz,
p_payload => v_event->'raw');
ELSIF v_event->>'type'='invoice_paid' THEN
 PERFORM public.apply_invoice_paid(p_provider => v_event->>'provider',
p_external_event_id => v_event->>'externalEventId',
p_account_id => (v_event->>'accountId')::uuid,
p_external_subscription_id => v_event->>'externalSubscriptionId',
p_external_invoice_id => v_event->>'externalInvoiceId',
p_external_payment_id => v_event->>'externalPaymentId',
p_amount_paid => (v_event->>'amountPaid')::integer,
p_currency => v_event->>'currency',
p_period_start => (v_event->>'periodStart')::timestamptz,
p_period_end => (v_event->>'periodEnd')::timestamptz,
p_paid_at => (v_event->>'paidAt')::timestamptz,
p_hosted_url => v_event->>'hostedUrl',
p_pdf_url => v_event->>'pdfUrl',
p_payload => v_event->'raw');
ELSIF v_event->>'type'='invoice_payment_failed' THEN
 PERFORM public.apply_invoice_payment_failed(p_provider => v_event->>'provider',
p_external_event_id => v_event->>'externalEventId',
p_account_id => (v_event->>'accountId')::uuid,
p_external_subscription_id => v_event->>'externalSubscriptionId',
p_external_invoice_id => v_event->>'externalInvoiceId',
p_external_payment_id => v_event->>'externalPaymentId',
p_status => 'failed',
p_amount => (v_event->>'amountDue')::integer,
p_currency => v_event->>'currency',
p_attempted_at => (v_event->>'attemptedAt')::timestamptz,
p_failure_code => v_event->>'failureCode',
p_failure_message => v_event->>'failureMessage',
p_payload => v_event->'raw');
ELSIF v_event->>'type'='payment_recovered' THEN
 PERFORM public.apply_payment_recovered(p_provider => v_event->>'provider',
p_external_event_id => v_event->>'externalEventId',
p_account_id => (v_event->>'accountId')::uuid,
p_external_subscription_id => v_event->>'externalSubscriptionId',
p_external_invoice_id => v_event->>'externalInvoiceId',
p_external_payment_id => v_event->>'externalPaymentId',
p_status => 'recovered',
p_amount => (v_event->>'amountPaid')::integer,
p_currency => v_event->>'currency',
p_recovered_at => (v_event->>'recoveredAt')::timestamptz,
p_payload => v_event->'raw');
 ELSE RAISE EXCEPTION 'billing_recovery_result_invalid'; END IF;
 ELSIF v_kind='anomaly' THEN
 v_observation:=p_result->'observation';
 IF jsonb_typeof(v_observation) IS DISTINCT FROM 'object' OR (v_observation->>'externalResourceId') IS DISTINCT FROM v_job.resource_id OR v_observation->>'anomalyType' IS NULL THEN RAISE EXCEPTION 'billing_recovery_result_invalid'; END IF;
 PERFORM public.upsert_billing_financial_anomaly(v_job.provider,v_observation->>'anomalyType',v_job.resource_id,v_observation->>'observedStatus',NULL,NULL,(v_observation->>'originalAmount')::integer,(v_observation->>'affectedAmount')::integer,v_observation->>'currency');
 ELSIF v_kind='error' AND (p_result->>'errorCode' IS NULL OR (p_result->>'errorCode')!~'^[a-z_]{1,100}$') THEN RAISE EXCEPTION 'billing_recovery_result_invalid';
 END IF;
 RETURN QUERY SELECT * FROM public.complete_billing_recovery_job(p_job_id,v_kind,CASE WHEN v_kind='pending' THEN 'payment_still_pending' ELSE p_result->>'errorCode' END);
 UPDATE billing.recovery_jobs SET lease_token=NULL,lease_expires_at=NULL WHERE id=p_job_id;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_billing_recovery_result(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_billing_recovery_result(uuid,uuid,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.complete_billing_recovery_job(uuid,text,text) FROM service_role;
