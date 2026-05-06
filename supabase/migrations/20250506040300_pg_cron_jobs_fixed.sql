-- ============================================================================
-- Migration: pg_cron jobs (corrected from migration 018)
-- ============================================================================
-- Migration 018 left the jobs commented out. This migration:
--   - Enables pg_cron.
--   - Activates job 1 (hard-delete soft-deleted accounts).
--   - Activates job 2 using the CORRECT column (invitations.status +
--     expires_at; the original comment referenced accepted_at which doesn't
--     exist — the table has a status enum).
--   - Job 3 (archive billing.events) stays commented: depends on
--     billing.events_archive which we haven't created yet. Ship it when the
--     archive table lands.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres (owner).
GRANT USAGE ON SCHEMA cron TO postgres;

-- Only re-schedule if not already scheduled (idempotent migration).
DO $$
BEGIN
  -- Job 1: hard-delete accounts soft-deleted more than 90 days ago.
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hard-delete-old-accounts') THEN
    PERFORM cron.schedule(
      'hard-delete-old-accounts',
      '0 3 * * *',
      $cmd$
        DELETE FROM public.accounts
        WHERE deleted_at IS NOT NULL
          AND deleted_at < now() - interval '90 days';
      $cmd$
    );
  END IF;

  -- Job 2: expire pending invitations older than expires_at.
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-pending-invitations') THEN
    PERFORM cron.schedule(
      'expire-pending-invitations',
      '15 3 * * *',
      $cmd$
        UPDATE public.invitations
        SET status = 'expired', updated_at = now()
        WHERE status = 'pending'
          AND expires_at < now();
      $cmd$
    );
  END IF;

  -- Job 3: hard-delete anonymous users older than 30 days.
  -- anon users are useful for demos/carts but accumulate; 30d is Supabase's
  -- default recommendation.
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-anonymous-users') THEN
    PERFORM cron.schedule(
      'cleanup-anonymous-users',
      '30 3 * * *',
      $cmd$
        DELETE FROM auth.users
        WHERE is_anonymous = true
          AND created_at < now() - interval '30 days';
      $cmd$
    );
  END IF;
END $$;
