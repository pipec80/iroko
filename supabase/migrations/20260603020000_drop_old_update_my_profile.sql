-- Drop the old 6-param version that conflicts with the 10-param v2.
-- PGRST203 fires when PostgREST finds multiple matching overloads for the same call.
DROP FUNCTION IF EXISTS public.update_my_profile(text, text, text, text, text, text);
