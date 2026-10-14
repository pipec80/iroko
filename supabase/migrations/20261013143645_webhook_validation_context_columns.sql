-- Plan 012.2 runtime correction: Node's update-validation lookup selects
-- account_id/version and filters by id/account_id before reserving a DNS ticket.
-- Column grants permit that lookup without exposing URL/signing-secret metadata
-- or granting direct endpoint CRUD. Customer roles remain RPC-only.
GRANT SELECT (id, account_id, version)
ON TABLE public.webhook_endpoints TO service_role;
