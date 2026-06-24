-- ============================================================================
-- Feature Flags Schema  (F2-2E)
-- ============================================================================
-- Implementa resolución de flags en tres niveles de prioridad:
--   1. feature_flag_overrides (por cuenta)    ← máxima prioridad
--   2. billing.plans.features JSONB           ← según plan activo
--   3. feature_flags.enabled                  ← default global
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text        NOT NULL,
  enabled     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flags_name_key UNIQUE (name)
);

COMMENT ON TABLE public.feature_flags IS
  'Catálogo de feature toggles. Una fila por capacidad. La columna enabled es el default global de fallback.';
COMMENT ON COLUMN public.feature_flags.name IS
  'Slug único del flag, p.ej. ''webhooks'', ''api_keys''. Debe coincidir con la clave en billing.plans.features JSONB.';
COMMENT ON COLUMN public.feature_flags.description IS
  'Descripción legible; se muestra en el admin UI (F3).';
COMMENT ON COLUMN public.feature_flags.enabled IS
  'Default global. Puede ser sobreescrito por plan (billing.plans.features) y por cuenta (feature_flag_overrides).';
COMMENT ON COLUMN public.feature_flags.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.feature_flags.created_at IS
  'Timestamp de creación del flag (inmutable).';
COMMENT ON COLUMN public.feature_flags.updated_at IS
  'Timestamp de última modificación; actualizado automáticamente por trigger.';

CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name  text        NOT NULL,
  account_id uuid        NOT NULL,
  enabled    boolean     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flag_overrides_flag_account_key UNIQUE (flag_name, account_id),
  CONSTRAINT feature_flag_overrides_flag_name_fkey
    FOREIGN KEY (flag_name) REFERENCES public.feature_flags(name) ON DELETE CASCADE,
  CONSTRAINT feature_flag_overrides_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.feature_flag_overrides IS
  'Overrides de flags por cuenta. Tienen prioridad sobre el default global y las features del plan.';
COMMENT ON COLUMN public.feature_flag_overrides.flag_name IS
  'Referencia a feature_flags.name; cascada al borrar el flag limpia los overrides huérfanos.';
COMMENT ON COLUMN public.feature_flag_overrides.account_id IS
  'Cuenta a la que aplica el override; cascada al borrar la cuenta.';
COMMENT ON COLUMN public.feature_flag_overrides.enabled IS
  'true = forzar habilitado sin importar el plan; false = forzar deshabilitado.';
COMMENT ON COLUMN public.feature_flag_overrides.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.feature_flag_overrides.created_at IS
  'Timestamp de creación del override (inmutable).';
COMMENT ON COLUMN public.feature_flag_overrides.updated_at IS
  'Timestamp de última modificación; actualizado automáticamente por trigger.';

CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_account_flag
  ON public.feature_flag_overrides (account_id, flag_name);

SELECT private.apply_updated_at_trigger('public.feature_flags'::regclass);
SELECT private.apply_updated_at_trigger('public.feature_flag_overrides'::regclass);

ALTER TABLE public.feature_flags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_overrides  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_select_authenticated"
  ON public.feature_flags
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "feature_flag_overrides_deny_direct"
  ON public.feature_flag_overrides
  AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.feature_flag_overrides FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.feature_flags FROM anon;

CREATE OR REPLACE FUNCTION private.resolve_flag(
  p_flag_name  text,
  p_account_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT enabled
       FROM public.feature_flag_overrides
      WHERE flag_name  = p_flag_name
        AND account_id = p_account_id),
    (SELECT (p.features -> p_flag_name = to_jsonb(true))
       FROM billing.subscriptions s
       JOIN billing.plans     p ON p.id = s.plan_id
       JOIN billing.customers c ON c.id = s.customer_id
      WHERE c.account_id = p_account_id
        AND s.status IN ('active', 'trialing')
      LIMIT 1),
    (SELECT enabled
       FROM public.feature_flags
      WHERE name = p_flag_name),
    false
  )
$$;

REVOKE EXECUTE ON FUNCTION private.resolve_flag(text, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.is_flag_enabled(
  p_flag_name  text,
  p_account_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.user_is_member(p_account_id, (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN private.resolve_flag(p_flag_name, p_account_id);
END;
$$;

GRANT  EXECUTE ON FUNCTION public.is_flag_enabled(text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_flag_enabled(text, uuid) FROM PUBLIC;
