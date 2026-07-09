-- ============================================================================
-- Webhooks: agregar eventos de billing al catálogo (F2-2A-core)
-- ============================================================================
-- 2A emite subscription.* desde apply_subscription_event. El catálogo debe
-- incluirlos para que los endpoints puedan suscribirse.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.webhook_event_catalog()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY[
    'member.invited', 'member.joined', 'member.removed', 'account.updated',
    'subscription.created', 'subscription.updated', 'subscription.canceled'
  ]
$$;

REVOKE EXECUTE ON FUNCTION private.webhook_event_catalog() FROM PUBLIC;
