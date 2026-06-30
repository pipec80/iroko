-- Activa el sistema de auditoría existente: audit.logs tiene la estructura correcta
-- pero nada escribía en ella. Esta migración conecta las 6 tablas core con la función
-- genérica private.audit_log().

-- ─────────────────────────────────────────────────────────────────
-- Función genérica de auditoría
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action      audit.action_type;
  v_account_id  uuid;
  v_resource_id text;
  v_row         jsonb;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'create'
    WHEN 'UPDATE' THEN 'update'
    WHEN 'DELETE' THEN 'delete'
  END::audit.action_type;

  v_row := to_jsonb(COALESCE(NEW, OLD));

  BEGIN
    v_account_id := (v_row ->> 'account_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_account_id := NULL;
  END;

  IF v_account_id IS NULL AND TG_TABLE_NAME = 'profiles' THEN
    v_account_id := (v_row ->> 'id')::uuid;
  END IF;

  v_resource_id := COALESCE(v_row ->> 'id', v_row ->> 'account_id', '');

  INSERT INTO audit.logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    account_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    v_resource_id,
    v_account_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    NULLIF(
      trim(split_part(
        COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', ''),
        ',', 1
      )),
      ''
    )::inet,
    current_setting('request.headers', true)::json->>'user-agent'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION private.audit_log() FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────────
-- Triggers en las 6 tablas core
-- ─────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_profiles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.audit_log();

CREATE TRIGGER trg_accounts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION private.audit_log();

CREATE TRIGGER trg_memberships_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts_memberships
  FOR EACH ROW EXECUTE FUNCTION private.audit_log();

CREATE TRIGGER trg_invitations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION private.audit_log();

CREATE TRIGGER trg_projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION private.audit_log();

CREATE TRIGGER trg_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION private.audit_log();

-- ─────────────────────────────────────────────────────────────────
-- Índice adicional para consultas SOC2 por tipo de acción
-- ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit.logs (action, created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- Grants para que service_role pueda escribir en audit.logs
-- ─────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT ON audit.logs TO service_role;
GRANT USAGE ON SEQUENCE audit.logs_id_seq TO service_role;
