-- ============================================================================
-- Jobs/colas: pgmq + cola email_queue (F2-2F)
-- ============================================================================
-- Primera cola pgmq del repo. pg_cron y pg_net ya están habilitados (2D) con
-- el mismo patrón — extensión de schema propio fijo, sin cláusula SCHEMA
-- explícita (a diferencia de pgcrypto/postgis/vector, que sí usan
-- `SCHEMA extensions`). No se mirroriza en supabase/schemas/*.sql, siguiendo
-- el precedente de pg_cron/pg_net/postgis/vector (extensiones no se
-- mirrorizan, solo tablas/funciones/políticas).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgmq;

SELECT pgmq.create('email_queue');
