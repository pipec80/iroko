-- ============================================================================
-- Migration: Advanced Extensions
-- ============================================================================
-- PostGIS    — Spatial queries, geofencing, IoT location tracking
-- pgvector   — AI embeddings for semantic search & recommendations
-- pg_trgm    — Trigram similarity for fuzzy catalog/product search
-- unaccent   — Accent-insensitive text search (es/pt locale friendly)
-- pg_partman — Automated time/range partitioning for IoT telemetry tables
-- pg_repack  — Online bloat removal without table locks (zero-downtime)
-- auto_explain — Logs execution plans of slow queries automatically
--
-- NOTE: PostGIS geometry/geography types are usable without schema prefix
-- because Supabase's postgres role has `extensions` in its search_path.
-- In your own migrations, use: SET search_path = public, extensions;
-- when creating tables with spatial columns, or prefix: extensions.geometry
--
-- NOTE: pg_partman background worker (BGW) is available on Supabase Pro+.
-- To enable automatic partition maintenance, set in Supabase Dashboard >
-- Database > Extensions and enable pg_partman, then configure:
--   pg_partman_bgw.dbname = 'postgres'
--   pg_partman_bgw.role = 'postgres'
--   pg_partman_bgw.interval = 3600   -- seconds between runs
--
-- NOTE: pg_repack and auto_explain require Pro+ plan on Supabase Cloud.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Geospatial (PostGIS)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 2. AI / Semantic search (pgvector)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 3. Fuzzy text search (pg_trgm)
--    Required for: similarity(), word_similarity(), % operator, GIN indexes
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 4. Accent-insensitive search (unaccent)
--    Use with to_tsvector + unaccent() or in IMMUTABLE wrapper functions.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 5. Automated table partitioning (pg_partman)
--    After install, use extensions.create_parent() to partition tables.
--    For IoT: partition telemetry tables by week/month automatically.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 6. Zero-downtime bloat removal (pg_repack)
--    ⚠️  REQUIERE SUPABASE PRO+ — comentado para plan Free.
--    Al upgradear a Pro, descomentar y aplicar con: pnpm supa:cloud:push
--    Use: SELECT repack.repack_table('public.my_table');
-- ---------------------------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS pg_repack;

-- ---------------------------------------------------------------------------
-- 7. auto_explain — slow query plan logging
--    ⚠️  REQUIERE SUPABASE PRO+ — comentado para plan Free.
--    El módulo necesita estar en shared_preload_libraries (solo configurable
--    por Supabase en planes Pro+). Al upgradear, descomentar estas líneas
--    y aplicar con: pnpm supa:cloud:push
--
--    Threshold recomendado por entorno:
--      dev     → 500 ms   staging → 1 000 ms   prod → 2 000 ms
-- ---------------------------------------------------------------------------
-- ALTER DATABASE postgres SET auto_explain.log_min_duration    = 1000;
-- ALTER DATABASE postgres SET auto_explain.log_analyze         = true;
-- ALTER DATABASE postgres SET auto_explain.log_buffers         = false;
-- ALTER DATABASE postgres SET auto_explain.log_timing          = true;
-- ALTER DATABASE postgres SET auto_explain.log_format          = 'text';
-- ALTER DATABASE postgres SET auto_explain.log_nested_statements = false;
