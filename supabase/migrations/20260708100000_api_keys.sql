-- ============================================================================
-- API Keys (F2-2D)
-- ============================================================================
-- Claves de API por cuenta, almacenadas SOLO como hash SHA-256. La clave en
-- claro se devuelve una única vez desde create_api_key. Sin acceso directo
-- del cliente: RLS deny-all + REVOKE; todo pasa por RPCs SECURITY DEFINER.
-- verify_api_key es solo para service_role (el caller externo no tiene JWT).
--
-- NOTE: migración escrita a mano (db diff deshabilitado en Windows, ver
-- supabase/config.toml); supabase/schemas/api-keys.sql se actualiza como
-- espejo en el mismo commit.
-- ============================================================================

CREATE TABLE public.api_keys (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name         text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  key_prefix   text        NOT NULL,
  key_hash     text        NOT NULL UNIQUE,
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.api_keys IS
  'Claves de API por cuenta (F2-2D). Solo se persiste el hash SHA-256; la clave en claro se muestra una única vez al crearla. Gestionada exclusivamente vía RPCs.';
COMMENT ON COLUMN public.api_keys.name IS
  'Etiqueta elegida por el usuario para identificar la clave (ej: "CI deploy").';
COMMENT ON COLUMN public.api_keys.key_prefix IS
  'Primeros 12 caracteres de la clave (irk_xxxxxxxx) para identificarla en la UI.';
COMMENT ON COLUMN public.api_keys.key_hash IS
  'SHA-256 hex de la clave completa. El índice UNIQUE da lookup O(1) en verify_api_key.';
COMMENT ON COLUMN public.api_keys.last_used_at IS
  'Actualizado por verify_api_key en cada uso válido.';
COMMENT ON COLUMN public.api_keys.expires_at IS
  'NULL = sin expiración.';
COMMENT ON COLUMN public.api_keys.revoked_at IS
  'NULL = activa. Revocación soft vía revoke_api_key (idempotente).';

CREATE INDEX idx_api_keys_account_created ON public.api_keys (account_id, created_at DESC);
-- FK de soporte (regla del repo: todo FK con índice — ver 06_indexes.test.sql)
CREATE INDEX idx_api_keys_created_by ON public.api_keys (created_by);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
-- Sin políticas: deny-all incluso si algún grant se filtrara.
REVOKE ALL ON public.api_keys FROM authenticated, anon;

-- ============================================================================
-- Helper compartido de autorización (lo reusa la migración de webhooks)
-- ============================================================================

CREATE OR REPLACE FUNCTION private.assert_account_admin(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid  uuid := (SELECT auth.uid());
  v_role public.membership_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  v_role := private.get_user_role(p_account_id, v_uid);
  -- v_role NULL (sin membership) debe chequearse explícito: NOT IN con NULL
  -- evalúa a NULL y el IF sería falso (mismo bug evitado en F2-2G).
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION private.assert_account_admin(uuid) IS
  'Aborta con not_authenticated/not_authorized salvo que el caller sea owner o admin de la cuenta. Reusado por RPCs de api_keys y webhooks (F2-2D).';
REVOKE EXECUTE ON FUNCTION private.assert_account_admin(uuid) FROM PUBLIC;

-- ============================================================================
-- create_api_key
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
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  IF p_name IS NULL OR char_length(btrim(p_name)) < 1 OR char_length(btrim(p_name)) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_expiry';
  END IF;
  IF (SELECT count(*) FROM public.api_keys k
      WHERE k.account_id = p_account_id AND k.revoked_at IS NULL) >= 20 THEN
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
  'Crea una API key para la cuenta (owner/admin). Devuelve la clave en claro UNA única vez; solo el hash queda persistido. Máx 20 activas por cuenta.';

-- ============================================================================
-- list_api_keys
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_api_keys(p_account_id uuid)
RETURNS TABLE (
  id           uuid,
  name         text,
  key_prefix   text,
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  RETURN QUERY
  SELECT k.id, k.name, k.key_prefix, k.last_used_at, k.expires_at, k.revoked_at, k.created_at
  FROM public.api_keys k
  WHERE k.account_id = p_account_id
  ORDER BY k.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_api_keys(uuid) IS
  'Lista las API keys de la cuenta (owner/admin). Nunca expone key_hash.';

-- ============================================================================
-- revoke_api_key
-- ============================================================================

CREATE OR REPLACE FUNCTION public.revoke_api_key(p_key_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT k.account_id INTO v_account_id FROM public.api_keys k WHERE k.id = p_key_id;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  PERFORM private.assert_account_admin(v_account_id);
  UPDATE public.api_keys SET revoked_at = now()
  WHERE id = p_key_id AND revoked_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.revoke_api_key(uuid) IS
  'Revoca (soft) una API key. Idempotente: revocar dos veces no cambia revoked_at.';

-- ============================================================================
-- verify_api_key (solo service_role)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_api_key(p_key_hash text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE key_hash = p_key_hash
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING account_id INTO v_account_id;
  RETURN v_account_id;  -- NULL si no existe / revocada / expirada
END;
$$;

COMMENT ON FUNCTION public.verify_api_key(text) IS
  'Valida un hash de API key y actualiza last_used_at. NULL = inválida. Ejecutable SOLO por service_role: el caller externo autentica por header, no por JWT.';

-- ============================================================================
-- Grants
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_api_key(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_api_keys(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_api_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_api_key(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_api_key(uuid, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_api_keys(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revoke_api_key(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_api_key(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_api_key(text) FROM authenticated, anon;
