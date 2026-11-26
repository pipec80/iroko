CREATE FUNCTION public.get_my_organization_quota()
RETURNS TABLE (owned_count integer, organization_limit integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT (
    SELECT count(*)::integer
    FROM public.accounts_memberships AS m
    JOIN public.accounts AS a ON a.id = m.account_id
    WHERE m.user_id = actor.id AND m.role = 'owner' AND a.type = 'team'
      AND a.deleted_at IS NULL
  ), private.organization_limit(actor.id)
  FROM (SELECT (SELECT auth.uid()) AS id) AS actor
  WHERE actor.id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_my_organization_quota() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_organization_quota() TO authenticated;
