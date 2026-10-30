-- 017.5-T8: exact, authorized account lookup for detail pages beyond the first list page.
CREATE FUNCTION public.get_admin_account(p_account_id uuid)
RETURNS TABLE (
  account_id uuid,
  name text,
  slug text,
  type public.account_type,
  owner_id uuid,
  owner_email text,
  plan_slug text,
  subscription_status billing.subscription_status,
  member_count integer,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.assert_platform_admin();

  RETURN QUERY
  SELECT a.id, a.name, a.slug, a.type, u.id, u.email::text,
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
  WHERE a.id = p_account_id AND a.deleted_at IS NULL
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_admin_account(uuid) IS
  'Exact account detail lookup for a live platform admin with AAL2; same columns as admin_list_accounts.';
REVOKE ALL ON FUNCTION public.get_admin_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_account(uuid) TO authenticated;
