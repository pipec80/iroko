-- Trigger que previene degradar o eliminar al último owner de una cuenta.
-- Sin este constraint, un UPDATE directo en accounts_memberships podría
-- dejar una cuenta sin owner, rompiendo la invariante de negocio.

CREATE OR REPLACE FUNCTION private.enforce_single_owner_per_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Al cambiar el rol de un owner a otro rol: verificar que queda al menos un owner
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

  -- Al eliminar una membresía de owner: verificar que queda al menos un owner
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

REVOKE ALL ON FUNCTION private.enforce_single_owner_per_account() FROM PUBLIC;

CREATE TRIGGER trg_enforce_account_owner
  BEFORE UPDATE OF role OR DELETE
  ON public.accounts_memberships
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_single_owner_per_account();
