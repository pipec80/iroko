-- 017.2-T4: serialize owner transitions; direct DML fails fast on contention.
CREATE OR REPLACE FUNCTION public.leave_team(p_account_id uuid)
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
  -- Account is always locked before membership authorization or mutation.
  PERFORM 1 FROM public.accounts WHERE id=p_account_id FOR UPDATE;
  SELECT type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id AND deleted_at IS NULL;

  IF v_account_type IS NULL THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;

  IF v_account_type <> 'team' THEN
    RAISE EXCEPTION 'not_a_team';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = v_uid;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

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

  SELECT active_account_id INTO v_active_id FROM public.profiles WHERE id = v_uid;
  IF v_active_id = p_account_id THEN
    UPDATE public.profiles SET active_account_id = v_uid WHERE id = v_uid;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_member_role(
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
  -- Account is always locked before membership authorization or mutation.
  PERFORM 1 FROM public.accounts WHERE id=p_account_id FOR UPDATE;
  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can change member roles';
  END IF;

  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'cannot_change_own_role';
  END IF;

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

  IF v_caller_role = 'admin' AND (v_target_role = 'admin' OR p_role = 'admin') THEN
    RAISE EXCEPTION 'Only the owner can manage admin roles';
  END IF;

  UPDATE public.accounts_memberships
  SET role = p_role
  WHERE account_id = p_account_id AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_ownership(p_account_id uuid, p_new_owner uuid)
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
  -- Account is always locked before membership authorization or mutation.
  PERFORM 1 FROM public.accounts WHERE id=p_account_id FOR UPDATE;
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

  UPDATE public.accounts_memberships
  SET role = 'owner'
  WHERE account_id = p_account_id AND user_id = p_new_owner;

  UPDATE public.accounts_memberships
  SET role = 'admin'
  WHERE account_id = p_account_id AND user_id = v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."remove_member"("p_account_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_caller_role public.membership_role;
  v_target_role public.membership_role;
BEGIN
  -- Account is always locked before membership authorization or mutation.
  PERFORM 1 FROM public.accounts WHERE id=p_account_id FOR UPDATE;
  -- Check caller role
  SELECT role INTO v_caller_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = (SELECT auth.uid());

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owner or admin can remove members';
  END IF;

  -- Cannot remove yourself
  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Cannot remove yourself. Use leave team instead.';
  END IF;

  -- Check target role — cannot remove owner
  SELECT role INTO v_target_role
  FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this account';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove the account owner';
  END IF;

  -- Admin cannot remove another admin (only owner can)
  IF v_caller_role = 'admin' AND v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Only the owner can remove an admin';
  END IF;

  DELETE FROM public.accounts_memberships
  WHERE account_id = p_account_id AND user_id = p_user_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."enforce_single_owner_per_account"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_account_id   uuid := OLD.account_id;
  v_account_type public.account_type;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.account_id IS DISTINCT FROM OLD.account_id THEN
    RAISE EXCEPTION 'membership_account_immutable' USING ERRCODE='integrity_constraint_violation';
  END IF;
  SELECT type INTO v_account_type FROM public.accounts WHERE id = v_account_id FOR UPDATE NOWAIT;
  -- RPCs already own this lock. Privileged direct DML must fail fast rather
  -- than invert the account -> membership lock order and deadlock an RPC.

  -- No es una cuenta de equipo (personal, o ya no existe) -- no aplica el
  -- invariante, dejar pasar la mutación.
  IF v_account_type IS DISTINCT FROM 'team' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.role = 'owner'
     AND NEW.role != 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts_memberships
      WHERE account_id = NEW.account_id
        AND role = 'owner'
        AND user_id != NEW.user_id
    ) THEN
      RAISE EXCEPTION 'No se puede degradar al único owner de la cuenta %', NEW.account_id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts_memberships
      WHERE account_id = OLD.account_id
        AND role = 'owner'
        AND user_id != OLD.user_id
    ) THEN
      RAISE EXCEPTION 'No se puede eliminar al único owner de la cuenta %', OLD.account_id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER trg_enforce_account_owner ON public.accounts_memberships;
CREATE TRIGGER trg_enforce_account_owner BEFORE UPDATE OF role,account_id OR DELETE ON public.accounts_memberships FOR EACH ROW EXECUTE FUNCTION private.enforce_single_owner_per_account();
