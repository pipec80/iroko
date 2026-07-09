-- ============================================================================
-- Billing: USAGE en el schema billing para roles PostgREST (F2-2A-core)
-- ============================================================================
-- Bug descubierto por el e2e (no por pgTAP, que corre como superusuario):
-- las RPCs de billing usan tipos de billing.* (plan_interval, subscription_status,
-- invoice_status) como parámetros/retorno. PostgREST necesita resolver esos
-- tipos al preparar la llamada, lo que exige USAGE en el schema — independiente
-- de que las funciones sean SECURITY DEFINER (eso solo gobierna el cuerpo, no
-- la resolución de tipos de la firma). Sin este GRANT, apply_subscription_event
-- falla con 42501 incluso para service_role.
-- USAGE en el schema NO expone las tablas: billing.* sigue siendo RLS deny-all
-- y sin GRANT de SELECT/INSERT/UPDATE/DELETE a estos roles.
-- ============================================================================

GRANT USAGE ON SCHEMA billing TO anon, authenticated, service_role;
