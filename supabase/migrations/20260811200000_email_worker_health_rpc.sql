-- ============================================================================
-- AUD-025: expone private.email_worker_health() de forma segura para que el
-- job nightly de CI pueda leerlo por REST sin agregar un secret nuevo.
--
-- private no está en la lista de schemas expuestos por PostgREST
-- (supabase/config.toml: [api] schemas = ["public"]), así que no se puede
-- llamar directo. En vez de sumar un secret nuevo con alcance amplio
-- (ej. un access token de gestión de proyecto solo para leer un health
-- check), se sigue el mismo patrón ya usado en este repo para exponer datos
-- internos vía RPC (admin_list_accounts, get_platform_audit_logs): un
-- wrapper SECURITY DEFINER en public, gateado a service_role — el mismo
-- secret (SUPABASE_SECRET_KEY) que CI ya usa hoy para otros pasos.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_email_worker_health()
RETURNS TABLE(invoked_at timestamptz, status_code integer, error_msg text, timed_out boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM private.email_worker_health();
$$;

-- Solo service_role — es detalle operativo interno (estado del worker de
-- email), no algo que anon/authenticated deban poder consultar.
REVOKE ALL ON FUNCTION public.get_email_worker_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_worker_health() TO service_role;

COMMENT ON FUNCTION public.get_email_worker_health() IS
  'Wrapper de solo lectura sobre private.email_worker_health() para el smoke check nightly de Cloud (AUD-025). service_role only.';
