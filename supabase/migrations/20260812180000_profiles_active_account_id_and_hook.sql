-- Task 1: profiles.active_account_id + JWT hook
-- Add a nullable active_account_id column to profiles table to track user's current preferred account
-- Update custom_access_token_hook to prefer this column when set, with fallback to most recent membership

ALTER TABLE ONLY "public"."profiles"
    ADD COLUMN "active_account_id" "uuid";

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_active_account_id_fkey" FOREIGN KEY ("active_account_id")
    REFERENCES "public"."accounts"("id") ON DELETE SET NULL;

CREATE INDEX "idx_profiles_active_account_id" ON "public"."profiles"("active_account_id");

CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id    uuid := (event ->> 'user_id')::uuid;
  v_account_id uuid;
  v_role       text;
  v_has_mfa    boolean;
  v_onboarding_completed boolean;
  v_imp_admin  uuid;
  v_imp_exp    timestamptz;
  v_claims     jsonb := event -> 'claims';
  v_app_meta   jsonb := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb);
BEGIN
  -- Bloque 1: preferir la preferencia persistida del usuario (switch_account),
  -- solo si sigue siendo una membership válida (no la dejó, no se borró).
  SELECT m.account_id, m.role::text
  INTO v_account_id, v_role
  FROM public.profiles p
  JOIN public.accounts_memberships m
    ON m.account_id = p.active_account_id AND m.user_id = p.id
  WHERE p.id = v_user_id;

  -- Fallback: comportamiento original (membership más reciente).
  IF v_account_id IS NULL THEN
    SELECT m.account_id, m.role::text
    INTO v_account_id, v_role
    FROM public.accounts_memberships m
    WHERE m.user_id = v_user_id
    ORDER BY m.created_at DESC, m.account_id DESC
    LIMIT 1;
  END IF;

  IF v_account_id IS NOT NULL THEN
    v_app_meta := v_app_meta
      || jsonb_build_object('account_id', v_account_id)
      || jsonb_build_object('role', v_role);
  END IF;

  -- Does the user have at least one verified MFA factor? The edge guard uses
  -- this to force aal2 before granting access to protected routes.
  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors f
    WHERE f.user_id = v_user_id
      AND f.status = 'verified'
  ) INTO v_has_mfa;

  v_app_meta := v_app_meta || jsonb_build_object('mfa_enrolled', v_has_mfa);

  -- F3-C4: onboarding gate — el edge guard fuerza el wizard mientras esté en false.
  -- COALESCE fail-open: si no hay fila de profile, nunca trabar a nadie fuera de /dashboard.
  SELECT p.onboarding_completed INTO v_onboarding_completed
  FROM public.profiles p WHERE p.id = v_user_id;

  v_app_meta := v_app_meta || jsonb_build_object(
    'onboarding_completed', COALESCE(v_onboarding_completed, true)
  );

  -- F3-C1: mirror platform_admins membership into the JWT so the edge proxy
  -- can gate /dashboard/admin without a DB round trip. Every RPC still
  -- re-checks private.is_platform_admin() against the table directly.
  v_app_meta := v_app_meta || jsonb_build_object(
    'is_platform_admin', private.is_platform_admin(v_user_id)
  );

  -- F3-C2: si hay una sesión de impersonation activa DONDE este usuario es
  -- el target, mintear quién lo está impersonando y hasta cuándo. El edge
  -- (middleware.ts) usa esto para el banner y el cap de 30 min; ningún RPC
  -- confía en esto para autorización (RLS ve auth.uid() real, siempre).
  SELECT admin_id, expires_at
  INTO v_imp_admin, v_imp_exp
  FROM public.impersonation_sessions
  WHERE target_user_id = v_user_id AND ended_at IS NULL
  LIMIT 1;

  IF v_imp_admin IS NOT NULL THEN
    v_app_meta := v_app_meta
      || jsonb_build_object('impersonated_by', v_imp_admin)
      || jsonb_build_object('impersonation_expires_at', v_imp_exp);
  END IF;

  v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta, true);
  RETURN jsonb_set(event, '{claims}', v_claims, true);
END;
$$;

ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";
