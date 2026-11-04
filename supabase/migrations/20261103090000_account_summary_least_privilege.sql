-- Older linked projects retained a table ACL predating the column grant.
REVOKE ALL PRIVILEGES ON TABLE public.accounts FROM service_role;
GRANT SELECT (id, name, slug, type) ON TABLE public.accounts TO service_role;
