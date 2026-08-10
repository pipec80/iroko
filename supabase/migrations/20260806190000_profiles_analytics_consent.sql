-- Persiste el consentimiento de analytics del usuario (cookie_consent.analytics)
-- para que captureServer() pueda chequearlo cuando no hay cookie disponible
-- (ej. eventos disparados por un webhook de proveedor de pago, que no lleva
-- cookies del navegador). NULL = nunca sincronizado. AnalyticsProvider lo
-- sincroniza cada vez que observa un cambio de consentimiento para un usuario
-- autenticado.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS analytics_consent boolean;

COMMENT ON COLUMN public.profiles.analytics_consent IS
  'Synced from the cookie_consent.analytics cookie whenever AnalyticsProvider '
  'observes it for a logged-in user. NULL = never synced. Lets captureServer() '
  '(e.g. billing webhooks, which carry no browser cookie) check consent without one.';
