-- 017.2-T2: account -> invitation serialization and seat reservations.
CREATE OR REPLACE FUNCTION "public"."invite_members"("p_account_id" "uuid", "p_emails" "text"[], "p_role" "public"."membership_role" DEFAULT 'member'::"public"."membership_role") RETURNS TABLE("email" "text", "token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_caller_role public.membership_role;
  v_account_type public.account_type;
  v_email       text;
  v_norm_email  text;
  v_raw_token   text;
  v_token_hash  text;
  v_reserved bigint;
BEGIN
  -- Plan 009: las cuentas personales son 1:1 con su usuario (el trigger
  -- enforce_single_owner_per_account ya lo asumía); colaborar define a un team.
  SELECT type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id AND deleted_at IS NULL FOR UPDATE;

  IF v_account_type IS DISTINCT FROM 'team' THEN
    RAISE EXCEPTION 'not_a_team';
  END IF;

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

  -- Reservations are distinct normalized pending emails, excluding members.
  SELECT count(*) INTO v_reserved FROM (
    SELECT lower(btrim(i.email)) AS address FROM public.invitations i
    WHERE i.account_id=p_account_id AND i.status='pending' AND i.expires_at>clock_timestamp()
    UNION
    SELECT lower(btrim(e)) FROM unnest(p_emails) AS e
  ) reserved WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts_memberships m JOIN auth.users u ON u.id=m.user_id
    WHERE m.account_id=p_account_id AND lower(btrim(u.email))=reserved.address
  );
  IF NOT private.within_plan_limit(p_account_id, 'seats_max',
      (SELECT count(*) FROM public.accounts_memberships m WHERE m.account_id=p_account_id)+v_reserved,0) THEN
    RAISE EXCEPTION 'seat_limit_reached';
  END IF;
  -- Expired pending rows no longer reserve and must not prevent reinvitation.
  UPDATE public.invitations SET status='expired',updated_at=clock_timestamp()
  WHERE account_id=p_account_id AND status='pending' AND expires_at<=clock_timestamp();

  FOR v_email IN SELECT DISTINCT lower(btrim(e)) FROM unnest(p_emails) AS e LOOP
    IF EXISTS(SELECT 1 FROM public.accounts_memberships m JOIN auth.users u ON u.id=m.user_id
      WHERE m.account_id=p_account_id AND lower(btrim(u.email))=v_email) THEN CONTINUE; END IF;
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

CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_token" "text") RETURNS TABLE("account_id" "uuid", "invited_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
  v_user_id    uuid := (SELECT auth.uid());
  v_token_hash text;
  v_account_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Hashear el token recibido antes de buscar (nunca comparar plaintext)
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  -- Preliminary lookup locates the account; it grants no authorization.
  SELECT i.account_id INTO v_account_id FROM public.invitations i WHERE i.token_hash=v_token_hash;
  PERFORM 1 FROM public.accounts WHERE id=v_account_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
  SELECT * INTO v_invitation FROM public.invitations
  WHERE token_hash=v_token_hash AND status='pending' AND expires_at>clock_timestamp()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF lower(btrim((SELECT email FROM auth.users WHERE id = v_user_id)))
     IS DISTINCT FROM lower(btrim(v_invitation.email)) THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.accounts_memberships m WHERE m.account_id=v_account_id AND m.user_id=v_user_id)
     AND NOT private.within_plan_limit(v_account_id,'seats_max',
       (SELECT count(*) FROM public.accounts_memberships m WHERE m.account_id=v_account_id)) THEN
    RAISE EXCEPTION 'seat_limit_reached';
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

CREATE OR REPLACE FUNCTION public.revoke_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation  public.invitations%ROWTYPE;
  v_caller_role public.membership_role;
  v_account_id uuid;
BEGIN
  SELECT account_id INTO v_account_id FROM public.invitations WHERE id=p_invitation_id;
  PERFORM 1 FROM public.accounts WHERE id=v_account_id FOR UPDATE;
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE id = p_invitation_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_not_pending';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = v_invitation.account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can revoke invitations';
  END IF;

  UPDATE public.invitations
  SET status = 'revoked', updated_at = now()
  WHERE id = p_invitation_id;
END;
$$;
