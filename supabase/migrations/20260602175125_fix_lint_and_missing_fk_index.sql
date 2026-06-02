-- ============================================================================
-- Fix 1: generate_recovery_codes — remove shadowed loop variables
-- ============================================================================
-- PL/pgSQL FOR-IN-integer loops auto-declare the loop variable.
-- Declaring i/j in DECLARE triggers "shadows a previously defined variable"
-- and "unused variable" linter warnings.
-- Fix: drop the explicit declarations and let the FOR loop own them.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_recovery_codes()
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id  UUID := (SELECT auth.uid());
  v_alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_codes    TEXT[] := ARRAY[]::TEXT[];
  v_code     TEXT;
  v_part1    TEXT;
  v_part2    TEXT;
  v_byte     INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.auth_recovery_codes WHERE user_id = v_user_id;

  FOR i IN 1..10 LOOP
    v_part1 := '';
    v_part2 := '';
    FOR j IN 1..4 LOOP
      v_byte := get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet);
      v_part1 := v_part1 || substr(v_alphabet, v_byte + 1, 1);
      v_byte := get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet);
      v_part2 := v_part2 || substr(v_alphabet, v_byte + 1, 1);
    END LOOP;
    v_code := v_part1 || '-' || v_part2;

    INSERT INTO public.auth_recovery_codes (user_id, code_hash)
    VALUES (
      v_user_id,
      encode(extensions.digest(v_code, 'sha256'), 'hex')
    );

    v_codes := v_codes || v_code;
  END LOOP;

  RETURN v_codes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_recovery_codes() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_recovery_codes() FROM PUBLIC;

-- ============================================================================
-- Fix 2: projects.created_by — add missing FK index
-- ============================================================================
-- The projects table (20260514000000) has created_by → profiles(id) with no index.
-- Unindexed FKs cause sequential scans on DELETE/UPDATE of the referenced row.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_created_by
  ON public.projects(created_by);
