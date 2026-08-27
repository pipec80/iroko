-- Billing Core v2: retire the broad, unsafe legacy persistence bridge.
--
-- All application callers and test fixtures use the narrow reducer RPCs now.
-- Keeping this service_role-accessible function would leave an alternate path
-- that can overwrite a subscription from an invoice-shaped event.

BEGIN;

DROP FUNCTION IF EXISTS public.apply_subscription_event(
  uuid,
  text,
  billing.plan_interval,
  billing.subscription_status,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz,
  jsonb,
  text
);

COMMIT;
