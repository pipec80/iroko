-- Existing codes were issued without an AAL2 requirement: regenerate after TOTP.
ALTER TABLE public.auth_recovery_codes
  ADD COLUMN recovery_factor_ids uuid[],
  ADD COLUMN recovery_completed_at timestamptz;
DELETE FROM public.auth_recovery_codes;
REVOKE ALL ON TABLE public.auth_recovery_codes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.begin_mfa_recovery(p_code text)
RETURNS TABLE(recovery_id uuid, factor_ids uuid[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code public.auth_recovery_codes%ROWTYPE;
  v_factors uuid[];
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  -- Serialize with generation and with another claim by the same user.
  PERFORM 1 FROM auth.users WHERE id = v_user FOR UPDATE;
  SELECT * INTO v_code FROM public.auth_recovery_codes
    WHERE user_id = v_user
      AND code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
    FOR UPDATE;
  IF NOT FOUND OR v_code.recovery_completed_at IS NOT NULL THEN RETURN; END IF;
  IF v_code.used_at IS NOT NULL THEN
    -- A used code can resume only this reset, never target newly enrolled factors.
    IF v_code.recovery_factor_ids IS NULL OR v_code.used_at < now() - interval '15 minutes' THEN RETURN; END IF;
    RETURN QUERY SELECT v_code.id, v_code.recovery_factor_ids;
    RETURN;
  END IF;
  SELECT array_agg(id ORDER BY id) INTO v_factors FROM auth.mfa_factors
    WHERE user_id = v_user AND status = 'verified' AND factor_type = 'totp';
  IF coalesce(cardinality(v_factors), 0) = 0 THEN RETURN; END IF;
  UPDATE public.auth_recovery_codes SET used_at = now(), recovery_factor_ids = v_factors
    WHERE id = v_code.id;
  RETURN QUERY SELECT v_code.id, v_factors;
END;
$$;
REVOKE ALL ON FUNCTION public.begin_mfa_recovery(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_mfa_recovery(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_mfa_recovery(p_user_id uuid, p_recovery_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- This acknowledgement belongs exclusively to the server after Auth API reset.
  UPDATE public.auth_recovery_codes SET recovery_completed_at = coalesce(recovery_completed_at, now())
    WHERE id = p_recovery_id AND user_id = p_user_id
      AND used_at IS NOT NULL AND recovery_factor_ids IS NOT NULL;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_mfa_recovery(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_mfa_recovery(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION "public"."generate_recovery_codes"() RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id  UUID := (SELECT auth.uid());
  v_alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_codes    TEXT[] := ARRAY[]::TEXT[];
  v_code     TEXT;
  v_part1    TEXT;
  v_part2    TEXT;
  v_byte     INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM 1 FROM auth.users WHERE id = v_user_id FOR UPDATE;

  IF coalesce(auth.jwt()->>'aal', '') <> 'aal2' OR NOT EXISTS (
    SELECT 1 FROM auth.mfa_factors WHERE user_id = v_user_id AND status = 'verified' AND factor_type = 'totp'
  ) THEN
    RAISE EXCEPTION 'mfa_required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.auth_recovery_codes WHERE user_id = v_user_id
    AND recovery_factor_ids IS NOT NULL AND recovery_completed_at IS NULL
    AND used_at >= now() - interval '15 minutes') THEN
    RAISE EXCEPTION 'mfa_recovery_in_progress';
  END IF;

  DELETE FROM public.auth_recovery_codes WHERE user_id = v_user_id
    AND (recovery_factor_ids IS NULL OR recovery_completed_at IS NOT NULL);

  FOR i IN 1..10 LOOP
    v_part1 := '';
    v_part2 := '';
    FOR j IN 1..4 LOOP
      v_byte := get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet);
      v_part1 := v_part1 || substr(v_alphabet, v_byte + 1, 1);
      v_byte := get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet);
      v_part2 := v_part2 || substr(v_alphabet, v_byte + 1, 1);
    END LOOP;
    v_code := v_part1 || '-' || v_part2;

    INSERT INTO public.auth_recovery_codes (user_id, code_hash)
    VALUES (
      v_user_id,
      encode(extensions.digest(v_code, 'sha256'), 'hex')
    );

    v_codes := v_codes || v_code;
  END LOOP;

  RETURN v_codes;
END;
$$;


