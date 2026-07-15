-- ============================================================================
-- Entitlements: helpers private para límites/features por plan (F3-3H-1)
-- ============================================================================
-- Misma resolución de plan efectivo que public.get_account_entitlements
-- (sub activa/trialing más reciente → fallback plan free), pero SIN el check
-- de membership: son helpers internos para otros SECURITY DEFINER (RPCs de
-- webhooks/api keys/invitaciones y el worker de deliveries), no para la API.
-- NOTE: migración a mano; espejo en supabase/schemas/private.sql mismo commit.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.get_account_plan_row(p_account_id uuid)
RETURNS TABLE (features jsonb, limits jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(p.features, '{}'::jsonb), COALESCE(p.limits, '{}'::jsonb)
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  JOIN billing.plans p ON p.id = s.plan_id
  WHERE c.account_id = p_account_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT COALESCE(p.features, '{}'::jsonb), COALESCE(p.limits, '{}'::jsonb)
    FROM billing.plans p
    WHERE p.slug = 'free'
    ORDER BY p."interval"
    LIMIT 1;
  END IF;
END;
$$;

COMMENT ON FUNCTION private.get_account_plan_row(uuid) IS
  'Features+limits del plan efectivo (sub activa → fallback free). Interno, sin check de membership (F3-3H-1).';
REVOKE EXECUTE ON FUNCTION private.get_account_plan_row(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.get_account_limit(p_account_id uuid, p_key text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (r.limits ->> p_key)::integer
  FROM private.get_account_plan_row(p_account_id) r;
$$;

COMMENT ON FUNCTION private.get_account_limit(uuid, text) IS
  'Límite numérico del plan efectivo; NULL = ilimitado/ausente (F3-3H-1).';
REVOKE EXECUTE ON FUNCTION private.get_account_limit(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.account_has_feature(p_account_id uuid, p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((r.features ->> p_key)::boolean, false)
  FROM private.get_account_plan_row(p_account_id) r;
$$;

COMMENT ON FUNCTION private.account_has_feature(uuid, text) IS
  'Feature booleana del plan efectivo; ausente = false (F3-3H-1).';
REVOKE EXECUTE ON FUNCTION private.account_has_feature(uuid, text) FROM PUBLIC;
