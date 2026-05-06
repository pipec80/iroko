-- ============================================================================
-- Migration 016: Seed Default Plans
-- ============================================================================
-- In the MIGRATION (not seed.sql) because plans are fundamental business data
-- that must exist in production, not just dev environments.
--
-- Prices in cents (integer). -1 in limits means "unlimited".
-- ============================================================================

INSERT INTO billing.plans (slug, name, description, interval, price, currency, trial_days, features, limits, sort_order)
VALUES
  (
    'free',
    'Free',
    'Para empezar',
    'month',
    0,
    'USD',
    0,
    '{"max_members": 1, "api_access": false}'::jsonb,
    '{"max_projects": 3}'::jsonb,
    0
  ),
  (
    'starter',
    'Starter',
    'Para equipos pequeños',
    'month',
    2900,
    'USD',
    14,
    '{"max_members": 5, "api_access": true}'::jsonb,
    '{"max_projects": 10}'::jsonb,
    1
  ),
  (
    'pro',
    'Pro',
    'Para empresas en crecimiento',
    'month',
    7900,
    'USD',
    14,
    '{"max_members": 25, "api_access": true, "priority_support": true}'::jsonb,
    '{"max_projects": -1}'::jsonb,
    2
  ),
  (
    'enterprise',
    'Enterprise',
    'Soluciones a medida',
    'month',
    0,
    'USD',
    30,
    '{"max_members": -1, "api_access": true, "priority_support": true, "sso": true}'::jsonb,
    '{"max_projects": -1}'::jsonb,
    3
  );
