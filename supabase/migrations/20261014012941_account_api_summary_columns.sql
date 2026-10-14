-- The API account handler reads a summary only after durable admission.
-- Column grants also authorize its id filter, without exposing metadata,
-- billing details, wildcard SELECT or direct mutations to the backend role.
GRANT SELECT (id, name, slug, type) ON TABLE public.accounts TO service_role;
NOTIFY pgrst, 'reload schema';
