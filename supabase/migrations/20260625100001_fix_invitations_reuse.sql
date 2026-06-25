-- Fix: UNIQUE (account_id, email) bloqueaba re-invitar emails con invitaciones expiradas/revocadas.
-- Se reemplaza por un índice parcial que solo aplica en estado 'pending'.

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_account_id_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_unique
  ON public.invitations (account_id, email)
  WHERE status = 'pending'::public.invitation_status;

-- Actualizar invite_members para usar el índice parcial en ON CONFLICT
CREATE OR REPLACE FUNCTION public.invite_members(
  p_account_id uuid,
  p_emails     text[],
  p_role       public.membership_role DEFAULT 'member'
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.membership_role;
  v_inserted    integer := 0;
  v_email       text;
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
    INSERT INTO public.invitations (account_id, email, role, invited_by)
    VALUES (p_account_id, lower(trim(v_email)), p_role, (SELECT auth.uid()))
    ON CONFLICT (account_id, email) WHERE status = 'pending' DO NOTHING;

    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.invite_members(uuid, text[], public.membership_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_members(uuid, text[], public.membership_role) TO authenticated, service_role;
