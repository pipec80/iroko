-- F3-C4: RPC rename_account() — el onboarding wizard necesita renombrar la
-- cuenta activa desde el paso 1. authenticated no tiene GRANT SELECT/UPDATE
-- directo sobre public.accounts (grants hardening) a pesar de que existe la
-- policy RLS "Accounts: update por owner/admin" — toda mutación pasa por RPC,
-- mismo patrón que set_account_logo.

CREATE OR REPLACE FUNCTION "public"."rename_account"("p_account_id" "uuid", "p_name" "text") RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.assert_account_admin(p_account_id);

  UPDATE public.accounts
  SET name = p_name, updated_at = now()
  WHERE id = p_account_id;
END;
$$;

COMMENT ON FUNCTION "public"."rename_account"("p_account_id" "uuid", "p_name" "text") IS
  'Renombra la cuenta. Owner/admin únicamente vía private.assert_account_admin (F3-C4).';

GRANT EXECUTE ON FUNCTION "public"."rename_account"("p_account_id" "uuid", "p_name" "text") TO "authenticated";
REVOKE EXECUTE ON FUNCTION "public"."rename_account"("p_account_id" "uuid", "p_name" "text") FROM PUBLIC;
