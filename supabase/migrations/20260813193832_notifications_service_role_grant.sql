-- ============================================================================
-- Migration: GRANT INSERT en notifications para service_role
-- ============================================================================
-- Hallazgo de QA manual (2026-08-13): notify() (src/lib/notifications/index.ts)
-- inserta vía admin client (service_role) a propósito — la política RLS
-- "notifications_deny_direct_insert" bloquea INSERT directo de authenticated,
-- forzando todo insert a pasar por el server helper. Pero la tabla nunca tuvo
-- un GRANT explícito para service_role: se creó (20260618000002) después del
-- hardening de 20260609190000, que revocó los default privileges de
-- service_role para tablas futuras. En Cloud, notify() falla en silencio
-- para cualquier flujo que la use (billing webhooks, invitaciones de equipo,
-- accept-invitation) — confirmado con has_table_privilege contra producción,
-- no solo local.
-- ============================================================================

GRANT INSERT ON public.notifications TO service_role;
