-- RPCs for MFA recovery codes.
-- pgcrypto is already installed in the extensions schema (migration 001).
-- All functions are SECURITY DEFINER with SET search_path = '' to prevent
-- search_path injection, and explicitly REVOKE'd from PUBLIC.

-- Generates 10 new recovery codes for the authenticated user.
-- Deletes any existing codes first (only the current batch is valid).
-- Returns plaintext codes ONE TIME — only hashes are persisted.
CREATE OR REPLACE FUNCTION public.generate_recovery_codes()
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_codes    TEXT[] := ARRAY[]::TEXT[];
  v_code     TEXT;
  v_part1    TEXT;
  v_part2    TEXT;
  v_byte     INT;
  i          INT;
  j          INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.auth_recovery_codes WHERE user_id = v_user_id;

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

GRANT EXECUTE ON FUNCTION public.generate_recovery_codes() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_recovery_codes() FROM PUBLIC;

-- Consumes a recovery code (sets used_at). Returns true if code was valid and unused.
-- Normalises input with upper(trim()) so users can paste with spaces or lowercase.
CREATE OR REPLACE FUNCTION public.consume_recovery_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_hash    TEXT;
  v_id      UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_hash := encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');

  UPDATE public.auth_recovery_codes
     SET used_at = now()
   WHERE user_id = v_user_id
     AND code_hash = v_hash
     AND used_at IS NULL
   RETURNING id INTO v_id;

  RETURN v_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_recovery_code(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_recovery_code(TEXT) FROM PUBLIC;

-- Returns the number of unused recovery codes for the authenticated user.
CREATE OR REPLACE FUNCTION public.count_unused_recovery_codes()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count   INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT count(*)::int INTO v_count
    FROM public.auth_recovery_codes
   WHERE user_id = v_user_id AND used_at IS NULL;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_unused_recovery_codes() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.count_unused_recovery_codes() FROM PUBLIC;
