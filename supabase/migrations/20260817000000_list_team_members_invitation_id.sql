-- ============================================================================
-- Plan 009 / PR 4b — Exponer invitation_id en list_team_members.
--
-- Las 4 RPCs de lifecycle (PR 4, 20260815120000) ya existen pero
-- revoke_invitation(p_invitation_id) no tiene forma de resolver ese id desde
-- la UI: list_team_members nunca lo devolvía, así que una fila 'pending' en
-- members-table.tsx no tenía ningún identificador estable para accionar.
--
-- Cambia el RETURNS TABLE (agrega una columna al final) — requiere DROP +
-- CREATE, CREATE OR REPLACE falla con "cannot change return type of existing
-- function" cuando la firma de retorno cambia.
--
-- Espejo en supabase/schemas/public.sql.
-- ============================================================================

DROP FUNCTION public.list_team_members(uuid);

CREATE FUNCTION public.list_team_members(p_account_id uuid)
RETURNS TABLE(
  user_id       uuid,
  email         text,
  display_name  text,
  given_name    text,
  family_name   text,
  avatar_url    text,
  role          text,
  status        text,
  joined_at     timestamptz,
  invitation_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts_memberships am
    WHERE am.account_id = p_account_id AND am.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not a member of this account';
  END IF;

  RETURN QUERY
  SELECT
    sub.user_id,
    sub.email,
    sub.display_name,
    sub.given_name,
    sub.family_name,
    sub.avatar_url,
    sub.role,
    sub.status,
    sub.joined_at,
    sub.invitation_id
  FROM (
    SELECT
      m.user_id,
      u.email::text,
      p.display_name,
      p.given_name,
      p.family_name,
      p.avatar_url,
      m.role::text AS role,
      'active'::text AS status,
      m.created_at AS joined_at,
      NULL::uuid AS invitation_id
    FROM public.accounts_memberships m
    JOIN public.profiles p ON p.id = m.user_id
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.account_id = p_account_id

    UNION ALL

    SELECT
      NULL::uuid AS user_id,
      i.email,
      NULL::text AS display_name,
      NULL::text AS given_name,
      NULL::text AS family_name,
      NULL::text AS avatar_url,
      i.role::text AS role,
      'pending'::text AS status,
      i.created_at AS joined_at,
      i.id AS invitation_id
    FROM public.invitations i
    WHERE i.account_id = p_account_id
      AND i.status = 'pending'
      AND i.expires_at > now()
  ) sub
  ORDER BY sub.joined_at ASC;
END;
$$;

ALTER FUNCTION public.list_team_members(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.list_team_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_team_members(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_team_members(uuid) IS
  'Lists all active members and pending invitations for an account. '
  'invitation_id is non-null only for pending rows — the handle UI needs to '
  'call revoke_invitation(p_invitation_id). SECURITY DEFINER: reads '
  'memberships + profiles + auth.users + invitations. Validates caller '
  'membership. Used by the team management page.';
