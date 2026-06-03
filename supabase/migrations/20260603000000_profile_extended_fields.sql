-- ============================================================================
-- Migration: Extended profile fields
-- Adds birth_date, bio, website_url, company to public.profiles.
-- Columns appended to avoid unnecessary diffs on existing rows.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN birth_date   date,
  ADD COLUMN bio          text  CHECK (char_length(bio) <= 500),
  ADD COLUMN website_url  text  CHECK (char_length(website_url) <= 255),
  ADD COLUMN company      text  CHECK (char_length(company) <= 100);

COMMENT ON COLUMN public.profiles.birth_date  IS 'OIDC birthdate claim — stored as date, not exposed in JWT.';
COMMENT ON COLUMN public.profiles.bio         IS 'Short user bio, max 500 chars.';
COMMENT ON COLUMN public.profiles.website_url IS 'Personal or professional website URL.';
COMMENT ON COLUMN public.profiles.company     IS 'Company or organization name.';
