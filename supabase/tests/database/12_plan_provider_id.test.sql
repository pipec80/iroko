-- pgTAP: get_plan_provider_id (F2-2A-providers)
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(3);

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000841', 'plan-provider-id@example.com',
   '{"given_name":"Test","family_name":"User"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

-- service_role no tiene UPDATE directo sobre billing.plans (deny-all salvo
-- RPCs); este seed corre como el superusuario ambiente del test runner.
UPDATE billing.plans
SET provider_ids = jsonb_build_object('stripe', 'price_test_123', 'mercadopago', 'plan_test_456')
WHERE slug = 'pro' AND "interval" = 'month';

SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000841','role','authenticated')::text, true);

SELECT is(
  public.get_plan_provider_id('pro', 'month', 'stripe'),
  'price_test_123', 'resuelve el price_id de Stripe para pro/month');

SELECT is(
  public.get_plan_provider_id('pro', 'month', 'mercadopago'),
  'plan_test_456', 'resuelve el preapproval_plan_id de MercadoPago para pro/month');

SELECT is(
  public.get_plan_provider_id('pro', 'month', 'lemonsqueezy'),
  NULL, 'proveedor sin ID configurado devuelve null, no error');

SELECT * FROM finish();
ROLLBACK;
