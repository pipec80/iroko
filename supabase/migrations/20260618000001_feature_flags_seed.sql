-- ============================================================================
-- Seed: Feature Flags iniciales  (F2-2E)
-- ============================================================================
-- Estos flags corresponden a los módulos F2. ON CONFLICT DO NOTHING garantiza
-- idempotencia si la migración se aplica más de una vez (ej. en reset de dev).
-- ============================================================================

INSERT INTO public.feature_flags (name, description, enabled)
VALUES
  ('notifications',
   'Notificaciones in-app en tiempo real vía Supabase Realtime (módulo 2C)',
   true),

  ('webhooks',
   'Entrega de webhooks salientes a endpoints externos vía pg_net (módulo 2D)',
   false),

  ('api_keys',
   'Gestión de API keys: crear, listar, revocar (módulo 2D)',
   false),

  ('feature_flags_admin',
   'UI de administración para gestionar feature flags por cuenta (módulo F3)',
   false),

  ('jobs',
   'Panel de estado de jobs/colas powered by pgmq + pg_cron (módulo 2F)',
   false)

ON CONFLICT (name) DO NOTHING;
