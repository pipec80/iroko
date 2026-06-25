-- Tabla de historial de membresías: append-only, inmutable, requerida para SOC2 (CC6.2, CC6.3).
-- DELETE en accounts_memberships pierde toda traza de miembros; este historial la preserva.

CREATE TABLE IF NOT EXISTS public.memberships_history (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id  uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  role        public.membership_role NOT NULL,
  action      text        NOT NULL,
  actor_id    uuid,
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_history_action_check
    CHECK (action IN ('joined', 'left', 'removed', 'role_upgraded', 'role_downgraded', 'invited'))
);

CREATE INDEX idx_memberships_history_account
  ON public.memberships_history (account_id, created_at DESC);

CREATE INDEX idx_memberships_history_user
  ON public.memberships_history (user_id, created_at DESC);

CREATE INDEX idx_memberships_history_created_brin
  ON public.memberships_history USING BRIN (created_at);

-- Inmutabilidad: ninguna fila puede modificarse ni eliminarse
CREATE OR REPLACE TRIGGER memberships_history_immutable
  BEFORE DELETE OR UPDATE ON public.memberships_history
  FOR EACH ROW EXECUTE FUNCTION private.deny_mutation();

-- RLS: acceso solo por service_role; anon y authenticated nunca leen historial directamente
ALTER TABLE public.memberships_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_history_deny_all"
  ON public.memberships_history AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.memberships_history FROM anon, authenticated;
GRANT ALL ON TABLE public.memberships_history TO service_role;

-- Función de captura de cambios en membresías
CREATE OR REPLACE FUNCTION private.track_membership_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'joined';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'removed';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role = NEW.role THEN
      RETURN NEW;
    END IF;
    v_action := CASE
      WHEN OLD.role = 'viewer'  AND NEW.role IN ('member','admin','owner') THEN 'role_upgraded'
      WHEN OLD.role = 'member'  AND NEW.role IN ('admin','owner')          THEN 'role_upgraded'
      WHEN OLD.role = 'admin'   AND NEW.role = 'owner'                    THEN 'role_upgraded'
      ELSE 'role_downgraded'
    END;
  END IF;

  INSERT INTO public.memberships_history (
    account_id, user_id, role, action, actor_id, metadata
  ) VALUES (
    COALESCE(NEW.account_id, OLD.account_id),
    COALESCE(NEW.user_id,    OLD.user_id),
    COALESCE(NEW.role,       OLD.role),
    v_action,
    auth.uid(),
    jsonb_build_object(
      'old_role', OLD.role,
      'new_role', NEW.role
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION private.track_membership_changes() FROM PUBLIC;

CREATE TRIGGER trg_memberships_history
  AFTER INSERT OR UPDATE OF role OR DELETE
  ON public.accounts_memberships
  FOR EACH ROW
  EXECUTE FUNCTION private.track_membership_changes();
