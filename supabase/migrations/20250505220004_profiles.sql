-- ============================================================================
-- Migration 004: Profiles (OIDC-Compliant)
-- ============================================================================
-- User profiles extending auth.users with OpenID Connect standard claims.
-- OIDC compliance ensures SSO compatibility (Cognito, Auth0, Okta, Google).
--
-- Auto-created via trigger on auth.users INSERT (signup flow).
-- RLS auto-enabled by event trigger from migration 001.
-- ============================================================================

CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  given_name    text,
  family_name   text,
  display_name  text GENERATED ALWAYS AS (
    COALESCE(given_name || ' ' || family_name, given_name, family_name)
  ) STORED,
  avatar_url    text,
  locale        text DEFAULT 'es',
  timezone      text DEFAULT 'America/Santiago',
  phone_number  text,
  onboarding_completed boolean DEFAULT false,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz   -- soft delete
);

-- Auto-update updated_at
SELECT private.apply_updated_at_trigger('public.profiles');

-- ---------------------------------------------------------------------------
-- Trigger: auto-create profile on signup
-- SECURITY DEFINER + search_path = '' to safely insert from auth schema.
-- Includes RAISE LOG for debugging signup flows (ajuste #11).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE LOG 'handle_new_user: creating profile for user_id=%', NEW.id;

  INSERT INTO public.profiles (id, given_name, family_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'given_name',
    NEW.raw_user_meta_data ->> 'family_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
