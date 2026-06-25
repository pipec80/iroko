-- Hard-delete de accounts con orden FK correcto + anonimización GDPR de billing.events.
-- FK billing.events.customer_id: NO ACTION → SET NULL para preservar eventos fiscales
-- pero anonimizar la referencia al cliente eliminado.

-- ─────────────────────────────────────────────────────────────────
-- PARTE 1: FK billing.events.customer_id → SET NULL
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE billing.events
  DROP CONSTRAINT IF EXISTS events_customer_id_fkey;

ALTER TABLE billing.events
  ADD CONSTRAINT events_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES billing.customers(id)
    ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────
-- PARTE 2: deny_mutation permite FK SET NULL (pg_trigger_depth > 0)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.deny_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF pg_trigger_depth() > 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Mutations not allowed on append-only table %', TG_TABLE_NAME;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- PARTE 3: Job pg_cron de hard-delete con orden correcto
-- ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hard-delete-old-accounts') THEN
    PERFORM cron.schedule(
      'hard-delete-old-accounts',
      '0 3 * * *',
      $cmd$
        DO $inner$
        DECLARE
          v_cutoff timestamptz := now() - INTERVAL '90 days';
        BEGIN
          DELETE FROM billing.payment_methods pm
          USING billing.customers c
          JOIN public.accounts a ON a.id = c.account_id
          WHERE pm.customer_id = c.id
            AND a.deleted_at IS NOT NULL
            AND a.deleted_at < v_cutoff;

          DELETE FROM billing.subscription_items si
          USING billing.subscriptions s
          JOIN billing.customers c ON c.id = s.customer_id
          JOIN public.accounts a ON a.id = c.account_id
          WHERE si.subscription_id = s.id
            AND a.deleted_at IS NOT NULL
            AND a.deleted_at < v_cutoff;

          DELETE FROM billing.subscriptions s
          USING billing.customers c
          JOIN public.accounts a ON a.id = c.account_id
          WHERE s.customer_id = c.id
            AND a.deleted_at IS NOT NULL
            AND a.deleted_at < v_cutoff;

          DELETE FROM billing.invoice_line_items ili
          USING billing.invoices i
          JOIN billing.customers c ON c.id = i.customer_id
          JOIN public.accounts a ON a.id = c.account_id
          WHERE ili.invoice_id = i.id
            AND a.deleted_at IS NOT NULL
            AND a.deleted_at < v_cutoff;

          DELETE FROM billing.invoices i
          USING billing.customers c
          JOIN public.accounts a ON a.id = c.account_id
          WHERE i.customer_id = c.id
            AND a.deleted_at IS NOT NULL
            AND a.deleted_at < v_cutoff;

          -- billing.events.customer_id queda NULL por FK SET NULL (anonimización GDPR)
          DELETE FROM billing.customers c
          USING public.accounts a
          WHERE c.account_id = a.id
            AND a.deleted_at IS NOT NULL
            AND a.deleted_at < v_cutoff;

          -- FK CASCADE elimina profiles, memberships, projects, documents, invitations
          DELETE FROM public.accounts
          WHERE deleted_at IS NOT NULL
            AND deleted_at < v_cutoff;

          RAISE LOG 'hard-delete-old-accounts: completado para cuentas eliminadas antes de %', v_cutoff;
        END $inner$;
      $cmd$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-invitations') THEN
    PERFORM cron.schedule(
      'cleanup-expired-invitations',
      '15 3 * * *',
      $cmd$
        DELETE FROM public.invitations
        WHERE status IN ('expired', 'revoked')
          AND updated_at < now() - INTERVAL '30 days';
      $cmd$
    );
  END IF;
END $$;
