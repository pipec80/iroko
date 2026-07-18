-- ============================================================================
-- F3-3H-2: corrección chica — p_path necesita DEFAULT NULL para que
-- `supabase gen types` lo tipe como opcional (string | undefined) en vez de
-- string no-nullable, permitiendo omitir el arg para "quitar logo" sin cast.
-- CREATE OR REPLACE FUNCTION permite agregar un DEFAULT sin DROP (el tipo del
-- argumento no cambia, solo se agrega el valor por defecto).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_account_logo(p_account_id uuid, p_path text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  UPDATE public.accounts
  SET logo_url = p_path
  WHERE id = p_account_id;
END;
$$;
