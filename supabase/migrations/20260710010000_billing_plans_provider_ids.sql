-- ============================================================================
-- Billing: billing.plans.provider_ids (F2-2A-providers)
-- ============================================================================
-- Mapeo planSlug+interval → ID específico de cada proveedor (price_id de
-- Stripe, preapproval_plan_id de MercadoPago), resuelto por get_plan_provider_id.
--
-- NOTE: migración escrita a mano (db diff deshabilitado en Windows, ver
-- supabase/config.toml); supabase/schemas/billing.sql se actualiza como
-- espejo en el mismo commit.
-- ============================================================================

ALTER TABLE billing.plans ADD COLUMN provider_ids jsonb DEFAULT '{}'::jsonb;
