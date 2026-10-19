-- Preserve the existing signature and ACL; no backend EXECUTE grant is added.
CREATE OR REPLACE FUNCTION public.end_impersonation_session(
  p_session_id uuid, p_reason text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.impersonation_sessions;
  v_uid uuid := (SELECT auth.uid());
  v_claims jsonb := (SELECT auth.jwt());
  -- current_user is the function owner inside SECURITY DEFINER. The role GUC
  -- retains the caller role selected by PostgREST after JWT verification.
  v_caller_role text := current_setting('role', true);
BEGIN
  SELECT * INTO v_session
  FROM public.impersonation_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF (
    (v_caller_role = 'service_role' AND v_claims ->> 'role' = 'service_role')
    OR (
      v_caller_role = 'authenticated'
      AND v_claims ->> 'role' = 'authenticated'
      AND v_uid IS NOT NULL
      AND (
        v_uid = v_session.admin_id
        OR (
          v_uid = v_session.target_user_id
          AND v_claims -> 'app_metadata' ->> 'impersonated_by' = v_session.admin_id::text
          AND p_reason = 'expired'
          AND v_session.expires_at <= clock_timestamp()
        )
      )
    )
  ) IS NOT TRUE THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  -- Authorization still applies to retries; only the first close emits audit.
  IF v_session.ended_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.impersonation_sessions
  SET ended_at = clock_timestamp(), ended_reason = p_reason
  WHERE id = p_session_id;

  INSERT INTO audit.logs (actor_id, action, resource_type, resource_id, new_data)
  VALUES (
    v_session.admin_id, 'impersonate_end', 'impersonation_sessions', p_session_id::text,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

COMMENT ON FUNCTION public.end_impersonation_session(uuid, text) IS
  'Closes under row lock for the authenticated owner, or the authenticated target only after expiry with matching signed app_metadata admin and expired reason. Reserved backend branch requires caller role and JWT role service_role; existing ACL does not grant backend execution. Authorized retries do not duplicate audit.';
