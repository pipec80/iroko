-- pgTAP: helpers de entitlements + límites por plan en RPCs (F3-3H-1)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(4);

-- Seed: 2 usuarios → handle_new_profile crea cuenta personal+owner por cada uno.
-- Cuenta A queda en free (sin suscripción); cuenta B recibe sub pro vía RPC.
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000001001', 'limits-free@example.com',
   '{"given_name":"Free","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000001002', 'limits-pro@example.com',
   '{"given_name":"Pro","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES
  ('00000000-0000-0000-0000-000000001100', 'team', 'Limits Free', 'limits-free',
   '00000000-0000-0000-0000-000000001001'),
  ('00000000-0000-0000-0000-000000001101', 'team', 'Limits Pro', 'limits-pro',
   '00000000-0000-0000-0000-000000001002');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000001100', '00000000-0000-0000-0000-000000001001', 'owner'),
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000001002', 'owner');

-- Sub pro para la cuenta B (patrón de 11_billing.test.sql)
SET LOCAL role service_role;
SELECT public.apply_subscription_event(
  '00000000-0000-0000-0000-000000001101', 'pro', 'month', 'active',
  'sub_limits_pro', 'evt_limits_1', 'subscription_created',
  now(), now() + interval '30 days', false, NULL, NULL);
RESET role;

-- ── helpers ──────────────────────────────────────────────────────────────
SELECT is(
  private.get_account_limit('00000000-0000-0000-0000-000000001100', 'webhook_endpoints_max'),
  0, 'cuenta free: webhook_endpoints_max = 0');

SELECT is(
  private.get_account_limit('00000000-0000-0000-0000-000000001101', 'api_keys_max'),
  20, 'cuenta pro: api_keys_max = 20');

SELECT is(
  private.account_has_feature('00000000-0000-0000-0000-000000001100', 'webhooks_enabled'),
  false, 'cuenta free: webhooks_enabled = false');

SELECT is(
  private.account_has_feature('00000000-0000-0000-0000-000000001101', 'webhooks_enabled'),
  true, 'cuenta pro: webhooks_enabled = true');

SELECT * FROM finish();
ROLLBACK;
