-- F3-C1: super-admin back-office — platform_admins whitelist, guard
-- functions, JWT claim, and the two read-only RPCs (accounts list +
-- cross-account audit log). Hand-written (supabase db diff is unreliable
-- on Windows) and mirrored in supabase/schemas/{public,private,audit}.sql.

-- ============================================================================
-- 1. public.platform_admins — whitelist, no self-service UI
-- ============================================================================
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_admins IS
  'Whitelist de super-admins de la plataforma (back-office F3). Sin UI de auto-alta: solo se puebla a mano via SQL/Studio. RLS deny-all total — el acceso pasa por private.* que ya validan is_platform_admin() del caller.';

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_deny_all" ON public.platform_admins
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

REVOKE ALL ON public.platform_admins FROM anon, authenticated;

-- ============================================================================
-- 2. private.* guard functions
-- ============================================================================
-- authenticated previously had no USAGE on schema private (nothing there was
-- ever called directly by that role — only from SECURITY DEFINER wrappers,
-- which run as their owner and don't need it). is_platform_admin/
-- assert_platform_admin are explicitly meant to be callable directly by
-- authenticated (inside a future RLS policy "OR private.is_platform_admin()"
-- in C2/C3, and by this migration's own pgTAP test), which requires resolving
-- the schema-qualified name — hence USAGE, same rationale as
-- `GRANT USAGE ON SCHEMA audit TO authenticated` in audit.sql (F2-2G). This
-- does NOT expose any other private.* object — each function still needs its
-- own explicit GRANT EXECUTE.
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_platform_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id = p_user_id);
$$;

COMMENT ON FUNCTION private.is_platform_admin(uuid) IS
  'True si p_user_id está en la whitelist platform_admins (F3-C1). Usable dentro de policies RLS via GRANT a authenticated — en C1 ninguna policy lo usa todavía (preparado para C2/C3).';

REVOKE ALL ON FUNCTION private.is_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_platform_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.assert_platform_admin()
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_platform_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'not_platform_admin' USING ERRCODE = '42501';
  END IF;

  -- Defense in depth: the *real* aal of this session (set by GoTrue itself),
  -- not app_metadata.mfa_enrolled (which only means a factor exists — not
  -- that this particular session passed the challenge).
  IF (SELECT auth.jwt() ->> 'aal') IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'mfa_required' USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION private.assert_platform_admin() IS
  'Llamar al inicio de todo RPC del back-office de super-admin. Rechaza no-admins (not_platform_admin) y sesiones sin aal2 real (mfa_required), aunque el claim JWT diga mfa_enrolled=true (F3-C1).';

REVOKE ALL ON FUNCTION private.assert_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.assert_platform_admin() TO authenticated;

-- ============================================================================
-- 3. custom_access_token_hook — new is_platform_admin claim
-- ============================================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    uuid := (event ->> 'user_id')::uuid;
  v_account_id uuid;
  v_role       text;
  v_has_mfa    boolean;
  v_claims     jsonb := event -> 'claims';
  v_app_meta   jsonb := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb);
BEGIN
  SELECT m.account_id, m.role::text
  INTO v_account_id, v_role
  FROM public.accounts_memberships m
  WHERE m.user_id = v_user_id
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    v_app_meta := v_app_meta
      || jsonb_build_object('account_id', v_account_id)
      || jsonb_build_object('role', v_role);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors f
    WHERE f.user_id = v_user_id
      AND f.status = 'verified'
  ) INTO v_has_mfa;

  v_app_meta := v_app_meta || jsonb_build_object('mfa_enrolled', v_has_mfa);

  -- F3-C1: mirror platform_admins membership into the JWT so the edge proxy
  -- can gate /dashboard/admin without a DB round trip. Every RPC still
  -- re-checks private.is_platform_admin() against the table directly.
  v_app_meta := v_app_meta || jsonb_build_object(
    'is_platform_admin', private.is_platform_admin(v_user_id)
  );

  v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta, true);
  RETURN jsonb_set(event, '{claims}', v_claims, true);
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook(event jsonb) IS
  'Supabase Auth custom_access_token hook. Writes app_metadata.account_id + app_metadata.role from the user''s default membership, app_metadata.mfa_enrolled (true when a verified MFA factor exists), and app_metadata.is_platform_admin (F3-C1, mirrors public.platform_admins). SECURITY DEFINER.';

-- ============================================================================
-- 4. audit.logs.impersonator_id — prepared for C2, unpopulated until then
-- ============================================================================
ALTER TABLE audit.logs ADD COLUMN impersonator_id uuid NULL;

COMMENT ON COLUMN audit.logs.impersonator_id IS
  'Populated by C2 (impersonation) when an admin acts on behalf of another user. NULL for every row until then — added now (F3-C1) so the platform audit RPC ships complete on day one.';

-- ============================================================================
-- 5. private.list_platform_audit_logs + public.get_platform_audit_logs
-- ============================================================================
-- authenticated already has USAGE on the audit schema (see
-- get_account_audit_logs, F2-2G) — needed to resolve audit.action_type as a
-- parameter type. No new schema grant required here.

CREATE OR REPLACE FUNCTION private.list_platform_audit_logs(
  p_limit             integer,
  p_cursor_created_at timestamptz,
  p_cursor_id         bigint,
  p_account_id        uuid,
  p_actor_id          uuid,
  p_action            audit.action_type,
  p_resource_type     text
)
RETURNS TABLE (
  id             bigint,
  actor_id       uuid,
  actor_name     text,
  impersonator_id uuid,
  account_id     uuid,
  action         audit.action_type,
  resource_type  text,
  resource_id    text,
  created_at     timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT v.id, v.actor_id, v.actor_name, l.impersonator_id, v.account_id,
         v.action, v.resource_type, v.resource_id, v.created_at
  FROM audit.v_recent_activity v
  JOIN audit.logs l ON l.id = v.id
  WHERE (p_account_id IS NULL OR v.account_id = p_account_id)
    AND (p_actor_id IS NULL OR v.actor_id = p_actor_id)
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

COMMENT ON FUNCTION private.list_platform_audit_logs IS
  'Unauthorized worker for the platform-wide (cross-account) audit log viewer (F3-C1). Never call directly — use public.get_platform_audit_logs, which asserts platform_admin first.';

REVOKE ALL ON FUNCTION private.list_platform_audit_logs(
  integer, timestamptz, bigint, uuid, uuid, audit.action_type, text
) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_platform_audit_logs(
  p_limit             integer DEFAULT 20,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id         bigint DEFAULT NULL,
  p_account_id        uuid DEFAULT NULL,
  p_actor_id          uuid DEFAULT NULL,
  p_action            audit.action_type DEFAULT NULL,
  p_resource_type     text DEFAULT NULL
)
RETURNS TABLE (
  id             bigint,
  actor_id       uuid,
  actor_name     text,
  impersonator_id uuid,
  account_id     uuid,
  action         audit.action_type,
  resource_type  text,
  resource_id    text,
  created_at     timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_platform_admin();

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;

  RETURN QUERY
  SELECT * FROM private.list_platform_audit_logs(
    p_limit, p_cursor_created_at, p_cursor_id, p_account_id, p_actor_id, p_action, p_resource_type
  );
END;
$$;

COMMENT ON FUNCTION public.get_platform_audit_logs IS
  'Cross-account paginated audit log, restricted to platform_admins (F3-C1). Exposes impersonator_id (populated starting C2).';

GRANT EXECUTE ON FUNCTION public.get_platform_audit_logs(
  integer, timestamptz, bigint, uuid, uuid, audit.action_type, text
) TO authenticated;

REVOKE ALL ON FUNCTION public.get_platform_audit_logs(
  integer, timestamptz, bigint, uuid, uuid, audit.action_type, text
) FROM PUBLIC;

-- ============================================================================
-- 6. public.admin_list_accounts
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_list_accounts(
  p_search              text DEFAULT NULL,
  p_limit               integer DEFAULT 20,
  p_cursor_created_at   timestamptz DEFAULT NULL,
  p_cursor_id           uuid DEFAULT NULL
)
RETURNS TABLE (
  account_id           uuid,
  name                 text,
  slug                 text,
  type                 public.account_type,
  owner_email          text,
  plan_slug            text,
  subscription_status  billing.subscription_status,
  member_count         integer,
  created_at           timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_platform_admin();

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;

  RETURN QUERY
  SELECT a.id, a.name, a.slug, a.type, u.email::text,
         p.slug, s.status,
         (SELECT count(*)::int FROM public.accounts_memberships m WHERE m.account_id = a.id),
         a.created_at
  FROM public.accounts a
  LEFT JOIN public.accounts_memberships om ON om.account_id = a.id AND om.role = 'owner'
  LEFT JOIN auth.users u ON u.id = om.user_id
  LEFT JOIN billing.customers c ON c.account_id = a.id
  LEFT JOIN billing.subscriptions s ON s.customer_id = c.id
    AND s.status IN ('active', 'trialing', 'past_due', 'paused')
  LEFT JOIN billing.plans p ON p.id = s.plan_id
  WHERE a.deleted_at IS NULL
    AND (p_search IS NULL OR a.name ILIKE '%' || p_search || '%' OR a.slug ILIKE '%' || p_search || '%')
    AND (
      p_cursor_created_at IS NULL
      OR a.created_at < p_cursor_created_at
      OR (a.created_at = p_cursor_created_at AND a.id < p_cursor_id)
    )
  ORDER BY a.created_at DESC, a.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.admin_list_accounts IS
  'Lista de cuentas con owner + estado de suscripción para el back-office de super-admin (F3-C1, "caso call-center"). Restringido a platform_admins.';

GRANT EXECUTE ON FUNCTION public.admin_list_accounts(
  text, integer, timestamptz, uuid
) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_accounts(
  text, integer, timestamptz, uuid
) FROM PUBLIC;
