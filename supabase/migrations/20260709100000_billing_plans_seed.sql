-- ============================================================================
-- Billing: seed de planes (F2-2A-core)
-- ============================================================================
-- Datos de referencia (DML): deben existir en local y en prod, por eso van en
-- migración versionada y no en seed.sql (que solo corre en db reset local).
-- Reemplaza el catálogo placeholder de 20250505220016 (starter/enterprise y un
-- pro/month con distinto precio y shape de features) por Free/Pro/Scale
-- mensual+anual, que es lo que consumen las RPCs y la UI de 2A-core. Se
-- verificó que ninguna suscripción referencia starter/enterprise (solo hay
-- datos locales/dev hasta ahora), así que se eliminan en vez de desactivarse.
-- Idempotente vía UPSERT (slug, interval). Montos en centavos.
-- ============================================================================

ALTER TABLE billing.plans DROP CONSTRAINT IF EXISTS plans_slug_key;
ALTER TABLE billing.plans ADD CONSTRAINT plans_slug_interval_key UNIQUE (slug, "interval");

DELETE FROM billing.plans WHERE slug IN ('starter', 'enterprise');

INSERT INTO billing.plans (slug, name, description, "interval", price, currency, trial_days, features, limits, sort_order, is_active)
VALUES
  ('free',  'Free',  'Para empezar y evaluar.',            'month',      0, 'USD',  0,
    '{"webhooks_enabled": false, "api_keys_enabled": true,  "priority_support": false}'::jsonb,
    '{"api_keys_max": 2,  "webhook_endpoints_max": 0,  "seats_max": 2}'::jsonb, 0, true),
  ('pro',   'Pro',   'Para equipos en crecimiento.',        'month',   2900, 'USD', 14,
    '{"webhooks_enabled": true,  "api_keys_enabled": true,  "priority_support": false}'::jsonb,
    '{"api_keys_max": 20, "webhook_endpoints_max": 10, "seats_max": 10}'::jsonb, 1, true),
  ('pro',   'Pro',   'Para equipos en crecimiento.',        'year',   29000, 'USD', 14,
    '{"webhooks_enabled": true,  "api_keys_enabled": true,  "priority_support": false}'::jsonb,
    '{"api_keys_max": 20, "webhook_endpoints_max": 10, "seats_max": 10}'::jsonb, 1, true),
  ('scale', 'Scale', 'Para operaciones a gran escala.',     'month',   9900, 'USD', 14,
    '{"webhooks_enabled": true,  "api_keys_enabled": true,  "priority_support": true}'::jsonb,
    '{"api_keys_max": 100, "webhook_endpoints_max": 50, "seats_max": 50}'::jsonb, 2, true),
  ('scale', 'Scale', 'Para operaciones a gran escala.',     'year',   99000, 'USD', 14,
    '{"webhooks_enabled": true,  "api_keys_enabled": true,  "priority_support": true}'::jsonb,
    '{"api_keys_max": 100, "webhook_endpoints_max": 50, "seats_max": 50}'::jsonb, 2, true)
ON CONFLICT (slug, "interval") DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  trial_days = EXCLUDED.trial_days,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
