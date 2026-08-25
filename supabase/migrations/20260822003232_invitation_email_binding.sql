-- Plan 010 / PR 3: an invitation token is bound to its intended recipient.
--
-- `auth.users.email` is nullable (for example, phone-only identities), so the
-- comparison uses IS DISTINCT FROM rather than <>. That fails closed when the
-- caller has no email while keeping the generic error to avoid a token oracle.

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS TABLE(account_id uuid, invited_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
  v_user_id    uuid := (SELECT auth.uid());
  v_token_hash text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Hashear el token recibido antes de buscar (nunca comparar plaintext)
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token_hash = v_token_hash
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF lower(btrim((SELECT email FROM auth.users WHERE id = v_user_id)))
     IS DISTINCT FROM lower(btrim(v_invitation.email)) THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  INSERT INTO public.accounts_memberships (account_id, user_id, role, invited_by)
  VALUES (v_invitation.account_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  -- Plan 009: entrar al team al que te invitaron es el resultado esperado del
  -- flujo. Antes dependía del fallback del hook JWT, así que ocurría o no
  -- según si el usuario había hecho switch_account() alguna vez.
  UPDATE public.profiles
  SET active_account_id = v_invitation.account_id
  WHERE id = v_user_id;

  RETURN QUERY SELECT v_invitation.account_id, v_invitation.invited_by;
END;
$$;
