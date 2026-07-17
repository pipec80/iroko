-- ============================================================================
-- 3H-1.5: get_account_plan_row gana `slug` (al final, compatible con CREATE OR
-- REPLACE sin DROP); get_account_entitlements pasa a delegar en ella en vez de
-- repetir la query "sub activa → fallback free" (DRY, hallazgo architect-reviewer
-- post F3-3H-1). Ambos RPCs mantienen su comportamiento observable sin cambios.
-- NOTE: migración a mano; espejo en supabase/schemas/private.sql y public.sql
-- mismo commit. Postgres no permite cambiar las columnas de salida de una
-- función RETURNS TABLE vía CREATE OR REPLACE (ni agregando al final) — hay
-- que DROP primero. private.get_account_limit / private.account_has_feature
-- llaman a esta función desde su cuerpo (no vía un objeto con dependencia dura
-- en el catálogo), así que el DROP no falla por dependencias.
-- ============================================================================

DROP FUNCTION private.get_account_plan_row(uuid);

CREATE OR REPLACE FUNCTION private.get_account_plan_row(p_account_id uuid)
RETURNS TABLE (features jsonb, limits jsonb, slug text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(p.features, '{}'::jsonb), COALESCE(p.limits, '{}'::jsonb), p.slug
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  JOIN billing.plans p ON p.id = s.plan_id
  WHERE c.account_id = p_account_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT COALESCE(p.features, '{}'::jsonb), COALESCE(p.limits, '{}'::jsonb), p.slug
    FROM billing.plans p
    WHERE p.slug = 'free'
    ORDER BY p."interval"
    LIMIT 1;
  END IF;
END;
$$;

COMMENT ON FUNCTION private.get_account_plan_row(uuid) IS
  'Features+limits+slug del plan efectivo (sub activa → fallback free). Interno, sin check de membership (3H-1.5).';
REVOKE EXECUTE ON FUNCTION private.get_account_plan_row(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_account_entitlements(p_account_id uuid)
RETURNS TABLE (plan_slug text, features jsonb, limits jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.user_is_member(p_account_id, (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.slug, r.features, r.limits
  FROM private.get_account_plan_row(p_account_id) r;
END;
$$;

COMMENT ON FUNCTION public.get_account_entitlements(uuid) IS
  'Features+limits del plan efectivo de la cuenta (F2-2A-core). Fallback a Free sin suscripción. Callable por cualquier miembro: gobierna uso, no administración. Delega en private.get_account_plan_row (3H-1.5).';
