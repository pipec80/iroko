-- Plan 012.4: describe the existing post-012.2 helper accurately; no ACL or behavior change.
COMMENT ON FUNCTION private.send_webhook_delivery(uuid) IS
  'Legacy feature gate: marks a delivery exhausted when webhooks are outside the plan. Does not send network requests or read Vault. Authorized Node-worker claims use public.claim_webhook_deliveries for exact-body signing; reviewed backend Vault capabilities are preserved, while anon/authenticated cannot access Vault directly.';
