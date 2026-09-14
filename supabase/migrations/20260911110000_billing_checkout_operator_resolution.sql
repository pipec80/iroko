-- Audited operator resolution for checkout attempts verified against the provider.
ALTER TABLE billing.checkout_intents
  ADD COLUMN resolved_at timestamptz,
  ADD COLUMN resolution_code text,
  ADD COLUMN resolved_by text,
  ADD CONSTRAINT checkout_intents_resolution_code_bounded CHECK (
    resolution_code IS NULL
    OR (
      NULLIF(btrim(resolution_code), '') IS NOT NULL
      AND char_length(resolution_code) <= 100
    )
  ),
  ADD CONSTRAINT checkout_intents_resolved_by_bounded CHECK (
    resolved_by IS NULL
    OR (
      NULLIF(btrim(resolved_by), '') IS NOT NULL
      AND char_length(resolved_by) <= 120
    )
  ),
  ADD CONSTRAINT checkout_intents_resolution_complete CHECK (
    (resolved_at IS NULL AND resolution_code IS NULL AND resolved_by IS NULL)
    OR
    (resolved_at IS NOT NULL AND resolution_code IS NOT NULL AND resolved_by IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION private.resolve_billing_checkout_intent(
  p_intent_id uuid,
  p_outcome text,
  p_resolution_code text,
  p_operator_reference text
) RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent billing.checkout_intents%ROWTYPE;
  v_outcome text := btrim(p_outcome);
  v_resolution_code text := btrim(p_resolution_code);
  v_operator_reference text := btrim(p_operator_reference);
  v_final_status text;
BEGIN
  IF p_outcome IS NULL OR v_outcome NOT IN ('canceled', 'failed') THEN
    RAISE EXCEPTION 'billing_checkout_outcome_invalid';
  END IF;
  IF NULLIF(v_resolution_code, '') IS NULL
    OR char_length(v_resolution_code) > 100 THEN
    RAISE EXCEPTION 'billing_checkout_resolution_code_invalid';
  END IF;
  IF NULLIF(v_operator_reference, '') IS NULL
    OR char_length(v_operator_reference) > 120 THEN
    RAISE EXCEPTION 'billing_checkout_operator_reference_invalid';
  END IF;

  SELECT *
  INTO v_intent
  FROM billing.checkout_intents
  WHERE id = p_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'billing_checkout_intent_not_found';
  END IF;
  IF v_intent.external_subscription_id IS NOT NULL THEN
    RAISE EXCEPTION 'billing_checkout_remote_requires_convergence';
  END IF;
  IF NOT (
    v_intent.status = 'needs_review'
    OR (
      v_intent.status = 'pending'
      AND v_intent.lease_expires_at IS NOT NULL
      AND v_intent.lease_expires_at <= now()
    )
  ) THEN
    RAISE EXCEPTION 'billing_checkout_intent_not_resolvable';
  END IF;

  UPDATE billing.checkout_intents
  SET status = v_outcome,
      resolved_at = now(),
      resolution_code = v_resolution_code,
      resolved_by = v_operator_reference
  WHERE id = v_intent.id
  RETURNING status INTO v_final_status;

  RETURN v_final_status;
END;
$$;

ALTER FUNCTION private.resolve_billing_checkout_intent(uuid, text, text, text)
  OWNER TO postgres;

COMMENT ON FUNCTION private.resolve_billing_checkout_intent(uuid, text, text, text) IS
  'Separately authorized operator action that closes a provider-reviewed local checkout intent while preserving immutable resolution evidence.';

REVOKE ALL ON FUNCTION private.resolve_billing_checkout_intent(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
