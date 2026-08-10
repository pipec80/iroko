-- ============================================================================
-- Seed: Storage buckets
-- ============================================================================
-- Executed automatically on: supabase db reset
-- Synced with config.toml [storage.buckets.*] — must stay in sync manually.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    2097152,  -- 2 MiB
    ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']
  ),
  (
    'org-assets',
    'org-assets',
    true,
    5242880,  -- 5 MiB
    ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']
  ),
  (
    'documents',
    'documents',
    false,
    52428800,  -- 50 MiB
    NULL       -- allowed_mime_types enforced in server action
  )
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Seed: Vault secrets consumidos por el cron de process-email-queue
-- ============================================================================
-- Solo para local — en Cloud se crean a mano vía SQL Editor (ver
-- docs/exec-plans/active/002-email-worker-cloud.md), nunca en una migración
-- versionada porque el valor difiere por entorno.
--
-- email_worker_secret debe ser EL MISMO valor que el secret de la Edge
-- Function local (supabase/functions/.env → CRON_SECRET); si se cambia uno,
-- hay que cambiar el otro.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret('http://api.supabase.internal:8000', 'project_url');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'email_worker_secret') THEN
    PERFORM vault.create_secret(
      '21c26bcebabe848f2cdfd10971ed3a3469cd419d22210dc32f25a4a7f42e7f37',
      'email_worker_secret'
    );
  END IF;
END $$;
