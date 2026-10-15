-- Plan 012.1: revoke excess grants without changing CRUD, RLS or operational roles.
-- Explicit application tables only: no extension-owned relations or sequences.

-- Plan 012.1: private helpers are not executable through inherited PUBLIC ACLs.
REVOKE EXECUTE ON FUNCTION private.apply_updated_at_trigger(regclass) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.deny_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_user_role(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.handle_new_profile() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.slugify(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.user_is_member(uuid, uuid) FROM PUBLIC;

-- Existing Storage policies also evaluate get_user_role for anonymous reads.
-- Keep their deny-by-RLS behavior without granting anon USAGE on private.
GRANT EXECUTE ON FUNCTION private.get_user_role(uuid, uuid) TO anon, authenticated;
-- Domain RLS and Realtime presence require user_is_member as authenticated only.
GRANT EXECUTE ON FUNCTION private.user_is_member(uuid, uuid) TO authenticated;
-- Required to resolve the RLS helpers; it does not grant access to private tables.
GRANT USAGE ON SCHEMA private TO authenticated;

-- Plan 012.1: trigger execution does not require API-role EXECUTE.
REVOKE EXECUTE ON FUNCTION private.sync_billing_checkout_intent() FROM PUBLIC;

-- Plan 012.1: API roles keep their existing CRUD grants and RLS contracts.
REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE
  public.accounts,
  public.accounts_memberships,
  public.announcements,
  public.api_keys,
  public.auth_recovery_codes,
  public.documents,
  public.feature_flag_overrides,
  public.feature_flags,
  public.impersonation_sessions,
  public.invitations,
  public.memberships_history,
  public.notifications,
  public.platform_admins,
  public.profiles,
  public.projects,
  public.robot_contacts,
  public.robot_memories,
  public.robot_routines,
  public.webhook_deliveries,
  public.webhook_endpoints
FROM anon, authenticated;

-- Apply the same boundary to tables created by postgres in this schema.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLES FROM anon, authenticated;

-- Plan 012.1: API roles keep their existing CRUD grants and RLS contracts.
REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE
  billing.checkout_intents,
  billing.customers,
  billing.events,
  billing.financial_anomalies,
  billing.invoice_line_items,
  billing.invoices,
  billing.payment_attempts,
  billing.payment_methods,
  billing.plans,
  billing.provider_prices,
  billing.reconciliation_state,
  billing.recovery_jobs,
  billing.subscription_items,
  billing.subscriptions
FROM anon, authenticated;

-- Apply the same boundary to tables created by postgres in this schema.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA billing
  REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLES FROM anon, authenticated;
