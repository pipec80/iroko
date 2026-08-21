-- Plan 010 / PR 2: JWT app_metadata is only a UI hint. Sensitive server
-- actions must read the caller's membership from the database at request time.
-- The private helper is intentionally not exposed through PostgREST, so this
-- narrow authenticated RPC delegates to it with the caller identity from Auth.

CREATE OR REPLACE FUNCTION public.get_my_account_role(p_account_id uuid)
RETURNS public.membership_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN private.get_user_role(p_account_id, (SELECT auth.uid()));
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_account_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_account_role(uuid) TO authenticated;
