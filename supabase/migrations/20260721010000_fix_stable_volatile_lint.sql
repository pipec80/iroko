-- ============================================================================
-- F3-3H-3: 5 funciones marcadas STABLE contienen expresiones que
-- `supabase db lint` detecta como VOLATILE (hallazgo real, preexistente al
-- job de advisors agregado en este PR). Downgrade a VOLATILE: siempre seguro
-- para funciones de solo lectura — pierden el hint de optimización de
-- planner, nunca cambia el resultado. Necesario para que el job nightly
-- `db-advisors` (schema lint --fail-on warning) arranque en verde.
-- ============================================================================

ALTER FUNCTION public.get_account_subscription(uuid) VOLATILE;
ALTER FUNCTION public.is_flag_enabled(text, uuid) VOLATILE;
ALTER FUNCTION public.get_account_audit_logs(uuid, integer, timestamptz, bigint, audit.action_type, text) VOLATILE;
ALTER FUNCTION public.get_account_entitlements(uuid) VOLATILE;
ALTER FUNCTION private.assert_account_admin(uuid) VOLATILE;

-- Cascada: estas llaman a assert_account_admin (ahora VOLATILE) y quedaron
-- marcadas STABLE de forma inconsistente — mismo downgrade, mismo motivo.
ALTER FUNCTION public.list_webhook_deliveries(uuid, uuid, integer, timestamptz, uuid) VOLATILE;
ALTER FUNCTION public.list_api_keys(uuid) VOLATILE;
ALTER FUNCTION public.list_webhook_endpoints(uuid) VOLATILE;
ALTER FUNCTION public.get_billing_overview(uuid) VOLATILE;
ALTER FUNCTION public.list_account_invoices(uuid, integer, timestamptz, uuid) VOLATILE;
