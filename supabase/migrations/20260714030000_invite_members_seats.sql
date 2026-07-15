-- ============================================================================
-- invite_members: límite de seats desde el plan (F3-3H-1)
-- ============================================================================
-- Agrega el check de seats_max: members actuales + invitados no puede exceder
-- el límite del plan efectivo de la cuenta.
-- NOTE: migración a mano; espejo en supabase/schemas/public.sql mismo commit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invite_members(
  p_account_id uuid,
  p_emails     text[],
  p_role       public.membership_role DEFAULT 'member'::public.membership_role
)
RETURNS TABLE (email text, token text)
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
  v_seats_max   integer;
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

  v_seats_max := private.get_account_limit(p_account_id, 'seats_max');
  IF v_seats_max IS NOT NULL AND
     (SELECT count(*) FROM public.accounts_memberships m
      WHERE m.account_id = p_account_id) + array_length(p_emails, 1) > v_seats_max THEN
    RAISE EXCEPTION 'seat_limit_reached';
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

COMMENT ON FUNCTION public.invite_members(uuid, text[], public.membership_role) IS
  'Crea invitaciones y retorna (email, token) pares. El token en texto plano se retorna UNA SOLA VEZ para enviarse por email. Solo el hash se almacena en BD. Rechaza si members actuales + invitados excede seats_max del plan (F3-3H-1).';
