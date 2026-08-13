-- ============================================================================
-- Migration: Account info fields (website, country) + update_account_info RPC
-- ============================================================================
-- org/settings > "Información de la organización" era una maqueta pura sin
-- backend (hallazgo de QA manual, 2026-08-13). Agrega las columnas que faltaban,
-- un formato estricto de slug (antes aceptaba cualquier texto), y el RPC que
-- guarda name/slug/website/country. get_my_accounts() se extiende con las
-- columnas nuevas al final — compatible con callers existentes que ya
-- destructuran campos puntuales.
-- ============================================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS country text;

-- Los slugs generados por private.slugify()/generate_unique_slug() ya cumplen
-- este formato; se verificó contra la data local antes de agregar el CHECK.
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- CREATE OR REPLACE no permite ampliar el row type de un RETURNS TABLE
-- existente (incluso solo agregando columnas al final) — hay que dropearla.
DROP FUNCTION public.get_my_accounts();

CREATE FUNCTION public.get_my_accounts()
RETURNS TABLE(
  account_id uuid,
  name text,
  slug text,
  type public.account_type,
  logo_url text,
  role public.membership_role,
  website text,
  country text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id, a.name, a.slug, a.type, a.logo_url, m.role, a.website, a.country
  FROM public.accounts a
  JOIN public.accounts_memberships m ON m.account_id = a.id
  WHERE m.user_id = (SELECT auth.uid())
    AND a.deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_my_accounts() IS 'Returns accounts the current user belongs to. SECURITY DEFINER: reads accounts_memberships (direct SELECT revoked). Uses auth.uid() internally.';

-- DROP FUNCTION se lleva los grants existentes — reaplicar lo mismo que ya
-- tenía antes (04_function_security.test.sql exige que anon NO la ejecute).
ALTER FUNCTION public.get_my_accounts() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_accounts() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_my_accounts() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_accounts() TO service_role;

CREATE OR REPLACE FUNCTION public.update_account_info(
  p_account_id uuid,
  p_name text,
  p_slug text,
  p_website text DEFAULT NULL,
  p_country text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  IF btrim(p_name) = '' OR char_length(p_name) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  IF p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR char_length(p_slug) > 60 THEN
    RAISE EXCEPTION 'invalid_slug';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.accounts WHERE slug = p_slug AND id != p_account_id
  ) THEN
    RAISE EXCEPTION 'slug_taken';
  END IF;

  UPDATE public.accounts
  SET name = p_name,
      slug = p_slug,
      website = NULLIF(btrim(p_website), ''),
      country = NULLIF(btrim(p_country), ''),
      updated_at = now()
  WHERE id = p_account_id;
END;
$$;

ALTER FUNCTION public.update_account_info(uuid, text, text, text, text) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION public.update_account_info(uuid, text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_account_info(uuid, text, text, text, text) FROM PUBLIC;

COMMENT ON FUNCTION public.update_account_info(uuid, text, text, text, text) IS 'Actualiza name/slug/website/country de la cuenta. Owner/admin únicamente vía private.assert_account_admin. Website/country vacíos se guardan como NULL.';
