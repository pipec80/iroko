-- Fix: ON CONFLICT (account_id, email) WHERE status = 'pending' era ambiguo.
-- Cuando RETURNS TABLE(email text, token text) define la variable de salida "email",
-- PostgreSQL no puede distinguirla del nombre de columna en la cláusula ON CONFLICT
-- (error 42702: column reference "email" is ambiguous).
-- Se reemplaza con un bloque BEGIN/EXCEPTION WHEN unique_violation que logra
-- el mismo comportamiento: skip silencioso si ya existe invitación pendiente.
CREATE OR REPLACE FUNCTION public.invite_members(
  p_account_id uuid,
  p_emails     text[],
  p_role       public.membership_role DEFAULT 'member'
)
RETURNS TABLE(email text, token text)
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

REVOKE ALL ON FUNCTION public.invite_members(uuid, text[], public.membership_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_members(uuid, text[], public.membership_role) TO authenticated, service_role;
