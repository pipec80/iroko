-- Recovery codes for MFA TOTP fallback.
-- Codes are stored hashed; the raw code is shown to the user only once.
CREATE TABLE public.auth_recovery_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash  TEXT        NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_codes_user_id ON public.auth_recovery_codes (user_id);

ALTER TABLE public.auth_recovery_codes ENABLE ROW LEVEL SECURITY;

-- (select auth.uid()) evaluated once per query, not per row — avoids auth_rls_initplan warning.
CREATE POLICY "Users can insert their own recovery codes"
  ON public.auth_recovery_codes FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own recovery codes"
  ON public.auth_recovery_codes FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can mark their own recovery codes as used"
  ON public.auth_recovery_codes FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own recovery codes"
  ON public.auth_recovery_codes FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- Hide table from anon API surface (RLS protects rows; REVOKE hides schema).
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.auth_recovery_codes FROM anon;
