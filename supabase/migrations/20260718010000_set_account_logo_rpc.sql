-- ============================================================================
-- F3-3H-2: RPC para setear/quitar el logo de una cuenta. NUNCA UPDATE directo
-- desde el server action — el gate de owner/admin vive acá (SECURITY DEFINER),
-- mismo patrón que create_webhook_endpoint/create_api_key.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_account_logo(p_account_id uuid, p_path text)
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

COMMENT ON FUNCTION public.set_account_logo(uuid, text) IS
  'Setea (o quita, con p_path NULL) el logo_url de la cuenta. Owner/admin únicamente vía private.assert_account_admin (F3-3H-2).';
REVOKE EXECUTE ON FUNCTION public.set_account_logo(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_account_logo(uuid, text) TO authenticated;
