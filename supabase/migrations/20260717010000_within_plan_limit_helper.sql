-- ============================================================================
-- 3H-1.5: helper private.within_plan_limit + rewire de los 3 RPCs que
-- calculaban "count >= max" a mano con distinto código de error cada uno
-- (create_webhook_endpoint, create_api_key, invite_members). Los códigos de
-- error y el comportamiento observable NO cambian — solo se DRY-ea el cálculo
-- del límite (hallazgo architect-reviewer post F3-3H-1).
-- NOTE: migración a mano; espejo en supabase/schemas/private.sql, webhooks.sql,
-- api-keys.sql y public.sql mismo commit.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.within_plan_limit(
  p_account_id uuid,
  p_key        text,
  p_current    bigint,
  p_increment  integer DEFAULT 1
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.get_account_limit(p_account_id, p_key) IS NULL
      OR (p_current + p_increment) <= private.get_account_limit(p_account_id, p_key);
$$;

COMMENT ON FUNCTION private.within_plan_limit(uuid, text, bigint, integer) IS
  'True si (current+increment) respeta el límite del plan; límite ausente = ilimitado. p_current es bigint porque count(*) devuelve bigint (3H-1.5).';
REVOKE EXECUTE ON FUNCTION private.within_plan_limit(uuid, text, bigint, integer) FROM PUBLIC;

-- ── create_webhook_endpoint: reemplaza el cálculo de v_max por el helper ───
CREATE OR REPLACE FUNCTION public.create_webhook_endpoint(
  p_account_id  uuid,
  p_url         text,
  p_events      text[],
  p_description text DEFAULT NULL
)
RETURNS TABLE (id uuid, secret text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  IF p_url IS NULL OR p_url !~ '^https://' THEN
    RAISE EXCEPTION 'invalid_url';
  END IF;
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

  RETURN QUERY
  INSERT INTO public.webhook_endpoints (account_id, url, description, events, secret)
  VALUES (
    p_account_id,
    p_url,
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    p_events,
    'whsec_' || translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_')
  )
  RETURNING webhook_endpoints.id, webhook_endpoints.secret;
END;
$$;

COMMENT ON FUNCTION public.create_webhook_endpoint(uuid, text, text[], text) IS
  'Crea un endpoint de webhook (owner/admin). Devuelve el signing secret UNA única vez. Feature y límite según el plan de la cuenta (F3-3H-1, límite vía private.within_plan_limit desde 3H-1.5).';

-- ── create_api_key: reemplaza el cálculo de v_max por el helper ───────────
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

COMMENT ON FUNCTION public.create_api_key(uuid, text, timestamptz) IS
  'Crea una API key para la cuenta (owner/admin). Devuelve la clave en claro UNA única vez; solo el hash queda persistido. Límite de keys activas según api_keys_max del plan (F3-3H-1, límite vía private.within_plan_limit desde 3H-1.5).';

-- ── invite_members: reemplaza el cálculo de v_seats_max por el helper ─────
CREATE OR REPLACE FUNCTION public.invite_members(
  p_account_id uuid,
  p_emails     text[],
  p_role       public.membership_role DEFAULT 'member'::public.membership_role
)
RETURNS TABLE (email text, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.membership_role;
  v_email       text;
  v_norm_email  text;
  v_raw_token   text;
  v_token_hash  text;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can invite members';
  END IF;

  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot invite as owner';
  END IF;

  IF array_length(p_emails, 1) > 20 THEN
    RAISE EXCEPTION 'Maximum 20 emails per batch';
  END IF;

  IF NOT private.within_plan_limit(p_account_id, 'seats_max',
      (SELECT count(*) FROM public.accounts_memberships m WHERE m.account_id = p_account_id),
      array_length(p_emails, 1)) THEN
    RAISE EXCEPTION 'seat_limit_reached';
  END IF;

  FOREACH v_email IN ARRAY p_emails LOOP
    v_norm_email := lower(trim(v_email));
    v_raw_token  := encode(extensions.gen_random_bytes(32), 'hex');
    v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');

    BEGIN
      INSERT INTO public.invitations (account_id, email, role, invited_by, token_hash)
      VALUES (p_account_id, v_norm_email, p_role, (SELECT auth.uid()), v_token_hash);
      email := v_norm_email;
      token := v_raw_token;
      RETURN NEXT;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
END;
$$;
