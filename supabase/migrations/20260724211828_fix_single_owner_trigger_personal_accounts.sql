-- Fix: private.enforce_single_owner_per_account() (2026-06-25) bloqueaba
-- CUALQUIER borrado del owner de una cuenta, incluidas las personales -- que
-- por diseño son 1:1 con su único usuario y no tienen "transferencia de
-- ownership" posible. Efecto real: DELETE FROM public.accounts de una cuenta
-- personal (lo que hace el cron hard-delete-old-accounts cada noche para
-- cuentas soft-deleted hace 90+ días) cascadea a accounts_memberships y el
-- trigger lo aborta con "No se puede eliminar al único owner de la cuenta" --
-- el cron viene fallando en silencio para TODA cuenta personal desde que
-- existe. Encontrado mientras se construía F3-C3 (GDPR): el mismo bloqueo
-- rompería el borrado en cascada de auth.users -> profiles -> accounts_memberships.
--
-- El invariante "nunca dejar una cuenta sin owner" solo tiene sentido para
-- cuentas de equipo (type = 'team'); se restringe el chequeo a ese caso.

CREATE OR REPLACE FUNCTION private.enforce_single_owner_per_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id   uuid := COALESCE(NEW.account_id, OLD.account_id);
  v_account_type public.account_type;
BEGIN
  SELECT type INTO v_account_type FROM public.accounts WHERE id = v_account_id;

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

COMMENT ON FUNCTION private.enforce_single_owner_per_account() IS
  'Impide dejar una cuenta de EQUIPO (type=team) sin owner al degradar/eliminar una membresía. No aplica a cuentas personales (1:1 con su único usuario, sin transferencia de ownership posible) -- fix 2026-07-24, ver comentario de la migración.';
