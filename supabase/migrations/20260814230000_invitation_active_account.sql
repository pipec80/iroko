-- ============================================================================
-- Plan 009 / PR 2 — Cierra el ciclo de invitación: invitar → aceptar → estar
-- dentro del team, de forma determinista.
--
-- PROBLEMA 1: la cuenta activa tras aceptar una invitación era impredecible.
-- private.handle_new_profile() nunca seteaba profiles.active_account_id, así
-- que quedaba NULL para todo usuario recién registrado. El hook JWT
-- (custom_access_token_hook) solo usa esa columna si está seteada; si no, cae
-- al fallback "membresía más reciente" (ORDER BY m.created_at DESC).
--
-- Consecuencia: aceptar una invitación crea la membresía MÁS reciente, así que
-- el usuario saltaba al Team solo si nunca había hecho switch_account(). Si
-- alguna vez lo hizo, se quedaba en su cuenta anterior. Mismo flujo, dos
-- resultados, según un historial invisible para él.
--
-- PROBLEMA 2: accept_invitation() creaba la membresía pero no tocaba la cuenta
-- activa, así que el destino final dependía del problema 1 en vez de ser una
-- decisión explícita.
--
-- Se cierra por los dos lados: el signup deja la Personal como cuenta activa
-- (el fallback deja de ser el camino normal) y aceptar una invitación mueve
-- la cuenta activa al team de forma explícita.
--
-- Espejo en supabase/schemas/private.sql y public.sql.
-- ============================================================================

-- NOTA SOBRE handle_new_profile: se evaluó setear ahí active_account_id para
-- que el fallback nunca fuera el camino normal, y se descartó. El trigger es
-- AFTER INSERT ON public.profiles (accounts.created_by referencia profiles, así
-- que la fila tiene que existir antes de crear la cuenta), de modo que solo
-- podría hacerse con un UPDATE — y ese UPDATE dispara trg_profiles_audit,
-- dejando una entrada de auditoría "update sobre profiles" en CADA signup que
-- ningún usuario realizó. No vale ese precio permanente: con accept_invitation
-- y create_team fijando la cuenta activa de forma explícita, el fallback solo
-- decide cuando el usuario tiene una única membresía, donde acierta siempre.


-- ── 1. Backfill de los perfiles existentes ─────────────────────────────────
-- Los usuarios creados antes de esta migración pueden tener varias membresías
-- y active_account_id en NULL: para ellos el fallback "membresía más reciente"
-- sí puede elegir mal. Se les fija la cuenta personal; si por alguna razón no
-- tuvieran una, la membresía más antigua (la original). Es una corrección
-- puntual, no un cambio de comportamiento permanente.
UPDATE public.profiles p
SET active_account_id = COALESCE(
  (SELECT a.id
     FROM public.accounts a
     JOIN public.accounts_memberships m ON m.account_id = a.id AND m.user_id = p.id
    WHERE a.type = 'personal' AND a.deleted_at IS NULL
    LIMIT 1),
  (SELECT m.account_id
     FROM public.accounts_memberships m
     JOIN public.accounts a2 ON a2.id = m.account_id
    WHERE m.user_id = p.id AND a2.deleted_at IS NULL
    ORDER BY m.created_at ASC
    LIMIT 1)
)
WHERE p.active_account_id IS NULL;


-- ── 3. Aceptar una invitación entra al team ────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS TABLE(account_id uuid, invited_by uuid)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
  v_user_id    uuid := (SELECT auth.uid());
  v_token_hash text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Hashear el token recibido antes de buscar (nunca comparar plaintext)
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token_hash = v_token_hash
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  INSERT INTO public.accounts_memberships (account_id, user_id, role, invited_by)
  VALUES (v_invitation.account_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  -- Plan 009: entrar al team al que te invitaron es el resultado esperado del
  -- flujo. Antes esto dependía del fallback del hook JWT, así que ocurría o no
  -- según si el usuario había hecho switch_account() alguna vez. El caller
  -- debe llamar a supabase.auth.refreshSession() para que el JWT lo refleje.
  UPDATE public.profiles
  SET active_account_id = v_invitation.account_id
  WHERE id = v_user_id;

  RETURN QUERY SELECT v_invitation.account_id, v_invitation.invited_by;
END;
$$;

ALTER FUNCTION public.accept_invitation(text) OWNER TO postgres;

COMMENT ON FUNCTION public.accept_invitation(text) IS
  'Accepts an invitation by token, creates the membership and switches the '
  'caller''s active account to that team. Returns the inviter''s user id '
  '(nullable) so the caller can notify them. Callers must call '
  'supabase.auth.refreshSession() afterward for the JWT to pick up the new '
  'active account. SECURITY DEFINER: mutates invitations+memberships (direct '
  'write revoked). Uses auth.uid().';

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.accept_invitation(text) TO authenticated;
GRANT ALL ON FUNCTION public.accept_invitation(text) TO service_role;
