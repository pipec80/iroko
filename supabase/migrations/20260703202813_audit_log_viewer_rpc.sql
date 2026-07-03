-- ============================================================================
-- Audit Log Viewer (F2-2G)
-- ============================================================================
-- Exposes audit.v_recent_activity to the account's owner/admin only, with
-- keyset pagination (created_at, id) and optional action/resource filters.
-- private.list_account_audit_logs does the query with no auth check — it is
-- REVOKEd from everyone and only reachable through the public wrapper below,
-- which performs the authorization check first.
--
-- NOTE: declarative schema diffing (supabase db diff) is disabled on this
-- project's Windows CLI (see supabase/config.toml [db] schema_paths comment)
-- — this migration is hand-written, and supabase/schemas/audit.sql was
-- updated in the same commit to mirror it as reference documentation.
-- ============================================================================

-- The `audit` schema previously only granted USAGE to service_role. Using
-- audit.action_type as a parameter type on a function callable by
-- `authenticated` requires that role to resolve the type name when binding
-- arguments (independent of the function being SECURITY DEFINER, which only
-- affects privileges inside the function body, not the caller's parameter
-- binding). This does NOT grant any data access — audit.logs stays fully
-- locked down by its RESTRICTIVE deny-all policy and table-level grants.
GRANT USAGE ON SCHEMA audit TO authenticated;

CREATE OR REPLACE FUNCTION private.list_account_audit_logs(
  p_account_id        uuid,
  p_limit             integer,
  p_cursor_created_at timestamptz,
  p_cursor_id         bigint,
  p_action            audit.action_type,
  p_resource_type     text
)
RETURNS TABLE (
  id            bigint,
  actor_id      uuid,
  actor_name    text,
  avatar_url    text,
  action        audit.action_type,
  resource_type text,
  resource_id   text,
  created_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    v.id, v.actor_id, v.actor_name, v.avatar_url, v.action, v.resource_type, v.resource_id, v.created_at
  FROM audit.v_recent_activity v
  WHERE v.account_id = p_account_id
    AND (p_action IS NULL OR v.action = p_action)
    AND (p_resource_type IS NULL OR v.resource_type = p_resource_type)
    AND (
      p_cursor_created_at IS NULL
      OR v.created_at < p_cursor_created_at
      OR (v.created_at = p_cursor_created_at AND v.id < p_cursor_id)
    )
  ORDER BY v.created_at DESC, v.id DESC
  LIMIT p_limit
$$;

COMMENT ON FUNCTION private.list_account_audit_logs IS
  'Unauthorized worker for the audit log viewer (F2-2G). Never call directly — use public.get_account_audit_logs, which checks owner/admin membership first.';

REVOKE EXECUTE ON FUNCTION private.list_account_audit_logs(
  uuid, integer, timestamptz, bigint, audit.action_type, text
) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_account_audit_logs(
  p_account_id        uuid,
  p_limit             integer DEFAULT 20,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id         bigint DEFAULT NULL,
  p_action            audit.action_type DEFAULT NULL,
  p_resource_type     text DEFAULT NULL
)
RETURNS TABLE (
  id            bigint,
  actor_id      uuid,
  actor_name    text,
  avatar_url    text,
  action        audit.action_type,
  resource_type text,
  resource_id   text,
  created_at    timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.membership_role;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;

  v_role := private.get_user_role(p_account_id, (SELECT auth.uid()));

  -- v_role IS NULL means the caller has no membership row at all on this
  -- account. `NOT IN` with NULL evaluates to NULL, and `IF NULL THEN` is
  -- false in PL/pgSQL — so the NULL case must be checked explicitly or a
  -- complete outsider would silently pass this gate.
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT * FROM private.list_account_audit_logs(
    p_account_id, p_limit, p_cursor_created_at, p_cursor_id, p_action, p_resource_type
  );
END;
$$;

COMMENT ON FUNCTION public.get_account_audit_logs IS
  'Paginated audit log for an account, restricted to owner/admin members (F2-2G).';

GRANT EXECUTE ON FUNCTION public.get_account_audit_logs(
  uuid, integer, timestamptz, bigint, audit.action_type, text
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_account_audit_logs(
  uuid, integer, timestamptz, bigint, audit.action_type, text
) FROM PUBLIC;
