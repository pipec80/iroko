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
