-- accept_invitation ahora devuelve también invited_by (además de account_id),
-- para que el caller pueda notificar al usuario que envió la invitación
-- cuando esta se acepta. Cambiar el tipo de retorno requiere DROP + CREATE
-- (CREATE OR REPLACE no permite cambiar el tipo de retorno de una función).

DROP FUNCTION IF EXISTS public.accept_invitation(text);

CREATE FUNCTION public.accept_invitation(p_token text)
RETURNS TABLE(account_id uuid, invited_by uuid)
LANGUAGE plpgsql SECURITY DEFINER
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

  INSERT INTO public.accounts_memberships (account_id, user_id, role, invited_by)
  VALUES (v_invitation.account_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  RETURN QUERY SELECT v_invitation.account_id, v_invitation.invited_by;
END;
$$;

ALTER FUNCTION public.accept_invitation(text) OWNER TO postgres;

COMMENT ON FUNCTION public.accept_invitation(text) IS
  'Accepts an invitation by token and creates the membership. Returns the '
  'inviter''s user id (nullable) so the caller can notify them. SECURITY '
  'DEFINER: mutates invitations+memberships (direct write revoked). Uses auth.uid().';

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.accept_invitation(text) TO authenticated;
GRANT ALL ON FUNCTION public.accept_invitation(text) TO service_role;
