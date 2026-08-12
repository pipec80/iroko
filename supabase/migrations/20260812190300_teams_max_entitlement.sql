-- DML: agrega el límite teams_max a los planes existentes (Bloque 1).
-- No captado por schema diff (caveat conocido de supabase-setup.md).

UPDATE billing.plans
SET limits = limits || '{"teams_max": 1}'::jsonb
WHERE slug = 'free';

UPDATE billing.plans
SET limits = limits || '{"teams_max": 3}'::jsonb
WHERE slug = 'pro';

UPDATE billing.plans
SET limits = limits || '{"teams_max": 10}'::jsonb
WHERE slug = 'scale';
