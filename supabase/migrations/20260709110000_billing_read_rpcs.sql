-- ============================================================================
-- Billing: RPCs de lectura (F2-2A-core)
-- ============================================================================
-- billing.* es RLS deny-all; estas RPCs SECURITY DEFINER son la única lectura
-- autorizada. entitlements lo puede leer cualquier miembro (gobierna uso, no
-- administración); overview e invoices exigen owner/admin.
-- NOTE: migración a mano (db diff deshabilitado); espejo en schemas/billing.sql.
-- ============================================================================

-- Plan efectivo de la cuenta; si no hay suscripción activa, cae al plan 'free'.
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
  SELECT p.slug, COALESCE(p.features, '{}'::jsonb), COALESCE(p.limits, '{}'::jsonb)
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  JOIN billing.plans p ON p.id = s.plan_id
  WHERE c.account_id = p_account_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT p.slug, COALESCE(p.features, '{}'::jsonb), COALESCE(p.limits, '{}'::jsonb)
    FROM billing.plans p
    WHERE p.slug = 'free'
    ORDER BY p."interval"
    LIMIT 1;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_account_entitlements(uuid) IS
  'Features+limits del plan efectivo de la cuenta (F2-2A-core). Fallback a Free sin suscripción. Callable por cualquier miembro: gobierna uso, no administración.';

-- Resumen de facturación (owner/admin): suscripción actual + últimas 5 invoices.
CREATE OR REPLACE FUNCTION public.get_billing_overview(p_account_id uuid)
RETURNS TABLE (
  plan_slug            text,
  plan_name            text,
  plan_interval        billing.plan_interval,
  status               billing.subscription_status,
  current_period_end   timestamptz,
  cancel_at_period_end boolean,
  trial_end            timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);
  RETURN QUERY
  SELECT p.slug, p.name, p."interval", s.status, s.current_period_end,
         s.cancel_at_period_end, s.trial_end
  FROM billing.subscriptions s
  JOIN billing.customers c ON c.id = s.customer_id
  JOIN billing.plans p ON p.id = s.plan_id
  WHERE c.account_id = p_account_id
    AND s.status IN ('active', 'trialing', 'past_due', 'paused')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_billing_overview(uuid) IS
  'Suscripción vigente de la cuenta para la UI de billing (owner/admin). Vacío si nunca se suscribió.';

-- Historial de facturas paginado por keyset (owner/admin).
CREATE OR REPLACE FUNCTION public.list_account_invoices(
  p_account_id        uuid,
  p_limit             integer DEFAULT 10,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id         uuid DEFAULT NULL
)
RETURNS TABLE (
  id           uuid,
  number       text,
  status       billing.invoice_status,
  currency     bpchar,
  total        integer,
  amount_paid  integer,
  hosted_url   text,
  pdf_url      text,
  created_at   timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;
  PERFORM private.assert_account_admin(p_account_id);
  RETURN QUERY
  SELECT i.id, i.number, i.status, i.currency, i.total, i.amount_paid,
         i.hosted_url, i.pdf_url, i.created_at
  FROM billing.invoices i
  JOIN billing.customers c ON c.id = i.customer_id
  WHERE c.account_id = p_account_id
    AND (
      p_cursor_created_at IS NULL
      OR i.created_at < p_cursor_created_at
      OR (i.created_at = p_cursor_created_at AND i.id < p_cursor_id)
    )
  ORDER BY i.created_at DESC, i.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_account_invoices(uuid, integer, timestamptz, uuid) IS
  'Facturas de la cuenta paginadas por keyset (owner/admin).';

GRANT EXECUTE ON FUNCTION public.get_account_entitlements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_account_invoices(uuid, integer, timestamptz, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_account_entitlements(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_billing_overview(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_account_invoices(uuid, integer, timestamptz, uuid) FROM PUBLIC;
