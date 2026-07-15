-- ============================================================================
-- API keys: límite desde el plan (F3-3H-1)
-- ============================================================================
-- Reemplaza el límite hardcodeado (20) por api_keys_max del plan efectivo.
-- NOTE: migración a mano; espejo en supabase/schemas/api-keys.sql mismo commit.
-- ============================================================================

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
  v_max integer;
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  IF p_name IS NULL OR char_length(btrim(p_name)) < 1 OR char_length(btrim(p_name)) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_expiry';
  END IF;
  v_max := private.get_account_limit(p_account_id, 'api_keys_max');
  IF v_max IS NOT NULL AND (SELECT count(*) FROM public.api_keys k
      WHERE k.account_id = p_account_id AND k.revoked_at IS NULL) >= v_max THEN
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

COMMENT ON FUNCTION public.create_api_key(uuid, text, timestamptz) IS
  'Crea una API key para la cuenta (owner/admin). Devuelve la clave en claro UNA única vez; solo el hash queda persistido. Límite de keys activas según api_keys_max del plan (F3-3H-1).';
