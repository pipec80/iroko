-- BREAKING CHANGE: hashear tokens de invitación con SHA-256.
-- Almacenar tokens en plaintext permite que un atacante con acceso a la DB
-- acepte todas las invitaciones pendientes.
-- Solo el hash se almacena; el token plaintext se retorna una sola vez via invite_members.
--
-- CAMBIO DE API: invite_members cambia de RETURNS integer a RETURNS TABLE(email text, token text).

-- ─────────────────────────────────────────────────────────────────
-- PARTE 1: Migrar columna token → token_hash
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.invitations
  ADD COLUMN token_hash text;

UPDATE public.invitations
  SET token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
  WHERE token IS NOT NULL;

ALTER TABLE public.invitations
  ALTER COLUMN token_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token_hash_pending
  ON public.invitations (token_hash)
  WHERE status = 'pending'::public.invitation_status;

DROP INDEX IF EXISTS idx_invitations_token;
ALTER TABLE public.invitations DROP COLUMN token;

-- ─────────────────────────────────────────────────────────────────
-- PARTE 2: accept_invitation busca por hash
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid
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

  RETURN v_invitation.account_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────
-- PARTE 3: invite_members — RETURNS TABLE(email text, token text)
-- ─────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.invite_members(uuid, text[], public.membership_role);

CREATE OR REPLACE FUNCTION public.invite_members(
  p_account_id uuid,
  p_emails     text[],
  p_role       public.membership_role DEFAULT 'member'
)
RETURNS TABLE(email text, token text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.membership_role;
  v_email       text;
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
    v_raw_token  := encode(extensions.gen_random_bytes(32), 'hex');
    v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');

    INSERT INTO public.invitations (account_id, email, role, invited_by, token_hash)
    VALUES (p_account_id, lower(trim(v_email)), p_role, (SELECT auth.uid()), v_token_hash)
    ON CONFLICT (account_id, email) WHERE status = 'pending' DO NOTHING;

    IF FOUND THEN
      -- Asignar a las columnas de salida de la TABLE y retornar fila
      email := lower(trim(v_email));
      token := v_raw_token;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.invite_members(uuid, text[], public.membership_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_members(uuid, text[], public.membership_role) TO authenticated, service_role;

COMMENT ON FUNCTION public.invite_members IS
  'Crea invitaciones y retorna (email, token) pares. El token en texto plano '
  'se retorna UNA SOLA VEZ para enviarse por email. Solo el hash se almacena en BD.';
