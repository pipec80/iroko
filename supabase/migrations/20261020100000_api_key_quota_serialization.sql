-- 017.2-T1: serialize API key quota admission per account.
CREATE OR REPLACE FUNCTION public.create_api_key(
  p_account_id uuid,
  p_name       text,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS TABLE (id uuid, key text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key text;
BEGIN
  -- Serialize quota reads and admission; recheck authorization after waiting.
  PERFORM pg_advisory_xact_lock(hashtextextended('api-key-account:' || p_account_id::text, 0));
  PERFORM private.assert_account_admin(p_account_id);

  IF p_name IS NULL OR char_length(btrim(p_name)) < 1 OR char_length(btrim(p_name)) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_expiry';
  END IF;
  IF NOT private.within_plan_limit(p_account_id, 'api_keys_max',
      (SELECT count(*) FROM public.api_keys k
       WHERE k.account_id = p_account_id AND k.revoked_at IS NULL)) THEN
    RAISE EXCEPTION 'key_limit_reached';
  END IF;

  -- base64url sin padding: '+'→'-', '/'→'_', '=' eliminado por translate.
  v_key := 'irk_' || translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  RETURN QUERY
  INSERT INTO public.api_keys (account_id, name, key_prefix, key_hash, created_by, expires_at)
  VALUES (
    p_account_id,
    btrim(p_name),
    left(v_key, 12),
    encode(extensions.digest(v_key, 'sha256'), 'hex'),
    (SELECT auth.uid()),
    p_expires_at
  )
  RETURNING api_keys.id, v_key;
END;
$$;
