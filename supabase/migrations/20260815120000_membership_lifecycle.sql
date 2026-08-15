-- ============================================================================
-- Plan 009 / PR 4 — Lifecycle mínimo de membresías.
--
-- remove_member() ya le dice al usuario "Cannot remove yourself. Use leave
-- team instead." — y leave_team no existía. Ese mensaje es la señal más clara
-- posible de que el lifecycle estaba incompleto: invitar y remover existían,
-- cambiar de rol, transferir ownership y salir del equipo no.
--
-- Las 4 RPCs siguen el mismo patrón que remove_member/invite_members: chequeo
-- de rol inline (no hay un helper assert_account_admin genérico en este repo,
-- cada RPC repite la comparación), SECURITY DEFINER, SET search_path = ''.
--
-- trg_enforce_account_owner (BEFORE DELETE OR UPDATE OF role ON
-- accounts_memberships) es la defensa de última línea contra dejar una cuenta
-- de equipo sin owner. leave_team y transfer_ownership añaden validaciones
-- previas con mensajes en español que la UI puede mapear a texto amigable —
-- el trigger sigue ahí por si algún día se muta la tabla desde otro lugar.
--
-- Espejo en supabase/schemas/public.sql.
-- ============================================================================

-- ── 1. leave_team ───────────────────────────────────────────────────────────
CREATE FUNCTION public.leave_team(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid           uuid := (SELECT auth.uid());
  v_account_type  public.account_type;
  v_caller_role   public.membership_role;
  v_active_id     uuid;
BEGIN
  SELECT type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id AND deleted_at IS NULL;

  IF v_account_type IS NULL THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;

  -- Las personales son 1:1 con su usuario (id = user id): "salir" no tiene
  -- sentido, no hay a dónde ir dentro de esa misma cuenta.
  IF v_account_type <> 'team' THEN
    RAISE EXCEPTION 'not_a_team';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = v_uid;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  -- Mensaje explícito y en el idioma del resto de las RPCs de este archivo,
  -- en vez de dejar que la caiga en el genérico de trg_enforce_account_owner.
  IF v_caller_role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts_memberships
      WHERE account_id = p_account_id AND role = 'owner' AND user_id <> v_uid
    ) THEN
      RAISE EXCEPTION 'last_owner_must_transfer';
    END IF;
  END IF;

  DELETE FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = v_uid;

  -- Si la cuenta que dejó era la activa, no puede seguir siéndolo — ya no es
  -- miembro. La personal (id = user id) siempre existe y es el destino obvio.
  SELECT active_account_id INTO v_active_id FROM public.profiles WHERE id = v_uid;
  IF v_active_id = p_account_id THEN
    UPDATE public.profiles SET active_account_id = v_uid WHERE id = v_uid;
  END IF;
END;
$$;

ALTER FUNCTION public.leave_team(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.leave_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_team(uuid) TO authenticated;

COMMENT ON FUNCTION public.leave_team(uuid) IS
  'El caller deja un team del que es miembro. Rechaza cuentas personales '
  '(not_a_team) y al último owner (last_owner_must_transfer — usar '
  'transfer_ownership primero). Si el team era la cuenta activa, mueve '
  'active_account_id a la personal del caller.';


-- ── 2. change_member_role ───────────────────────────────────────────────────
CREATE FUNCTION public.change_member_role(
  p_account_id uuid,
  p_user_id    uuid,
  p_role       public.membership_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.membership_role;
  v_target_role public.membership_role;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can change member roles';
  END IF;

  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'cannot_change_own_role';
  END IF;

  -- Asignar 'owner' es transferir ownership, un flujo separado con sus
  -- propias garantías (nunca deja la cuenta con dos owners a mitad de
  -- camino). No se replica esa lógica acá.
  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'use_transfer_ownership';
  END IF;

  SELECT role INTO v_target_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this account';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'use_transfer_ownership';
  END IF;

  -- Mismo límite que remove_member: un admin no toca a otro admin, ni para
  -- degradarlo ni (acá) para promoverlo — sin esto un admin podría ascender a
  -- otro admin a su mismo nivel de forma unilateral.
  IF v_caller_role = 'admin' AND (v_target_role = 'admin' OR p_role = 'admin') THEN
    RAISE EXCEPTION 'Only the owner can manage admin roles';
  END IF;

  UPDATE public.accounts_memberships
  SET role = p_role
  WHERE account_id = p_account_id AND user_id = p_user_id;
END;
$$;

ALTER FUNCTION public.change_member_role(uuid, uuid, public.membership_role) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.change_member_role(uuid, uuid, public.membership_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_member_role(uuid, uuid, public.membership_role) TO authenticated;

COMMENT ON FUNCTION public.change_member_role(uuid, uuid, public.membership_role) IS
  'Cambia el rol de un miembro (nunca a/desde owner — ver transfer_ownership). '
  'owner puede asignar admin/member/viewer; admin solo member/viewer y nunca '
  'toca a otro admin. Rechaza que el caller se cambie su propio rol.';


-- ── 3. transfer_ownership ───────────────────────────────────────────────────
CREATE FUNCTION public.transfer_ownership(p_account_id uuid, p_new_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid          uuid := (SELECT auth.uid());
  v_account_type public.account_type;
  v_target_role  public.membership_role;
BEGIN
  SELECT type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id AND deleted_at IS NULL;

  IF v_account_type IS NULL THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;

  IF v_account_type <> 'team' THEN
    RAISE EXCEPTION 'not_a_team';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.accounts_memberships
    WHERE account_id = p_account_id AND user_id = v_uid AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  IF p_new_owner = v_uid THEN
    RAISE EXCEPTION 'already_owner';
  END IF;

  SELECT role INTO v_target_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_new_owner;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'target_not_a_member';
  END IF;

  -- Orden obligatorio: promover primero. trg_enforce_account_owner exige que
  -- exista OTRO owner antes de aceptar que el actual deje de serlo — si se
  -- degradara primero, la cuenta quedaría momentáneamente sin owner y el
  -- propio trigger lo abortaría.
  UPDATE public.accounts_memberships
  SET role = 'owner'
  WHERE account_id = p_account_id AND user_id = p_new_owner;

  UPDATE public.accounts_memberships
  SET role = 'admin'
  WHERE account_id = p_account_id AND user_id = v_uid;
END;
$$;

ALTER FUNCTION public.transfer_ownership(uuid, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.transfer_ownership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_ownership(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.transfer_ownership(uuid, uuid) IS
  'Transfiere el ownership de una cuenta de equipo. Solo el owner actual puede '
  'llamarla; el destinatario debe ser miembro. Promueve al nuevo owner ANTES '
  'de degradar al actual (a admin) para nunca dejar la cuenta sin owner ni '
  'siquiera a mitad de transacción — trg_enforce_account_owner lo exigiría '
  'igual, esto evita depender de ese orden por accidente.';


-- ── 4. revoke_invitation ────────────────────────────────────────────────────
CREATE FUNCTION public.revoke_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation  public.invitations%ROWTYPE;
  v_caller_role public.membership_role;
BEGIN
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE id = p_invitation_id;

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

ALTER FUNCTION public.revoke_invitation(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.revoke_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_invitation(uuid) TO authenticated;

COMMENT ON FUNCTION public.revoke_invitation(uuid) IS
  'Revoca una invitación pending (deja de poder aceptarse). Solo owner/admin '
  'de la cuenta de la invitación. Idempotente en el sentido de que una '
  'invitación ya no-pending lanza invitation_not_pending en vez de silenciarse.';
