-- ============================================================================
-- Jobs/colas: broadcast_alert_email (F2-2F)
-- ============================================================================
-- Encola un mensaje en pgmq.email_queue por cada owner de cuenta (no por
-- cada membership — evita duplicados si alguien es owner de varias cuentas
-- distintas se le manda uno por cuenta, que es la unidad de negocio real).
-- Sin gate de admin todavía: cualquier usuario autenticado puede invocarla.
-- platform_admin real llega en F3; esto es solo el patrón de cola.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.broadcast_alert_email(
  p_subject text,
  p_body text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer := 0;
  v_row record;
BEGIN
  IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'subject_required';
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'body_required';
  END IF;

  FOR v_row IN
    SELECT am.account_id, u.email
    FROM public.accounts_memberships am
    JOIN auth.users u ON u.id = am.user_id
    WHERE am.role = 'owner'
  LOOP
    PERFORM pgmq.send('email_queue', jsonb_build_object(
      'accountId', v_row.account_id,
      'email', v_row.email,
      'subject', p_subject,
      'body', p_body
    ));
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.broadcast_alert_email(text, text) IS
  'Encola un email de alerta en pgmq.email_queue para cada owner de cuenta (F2-2F). Sin gate de admin todavía — F3 agrega platform_admin real.';

GRANT EXECUTE ON FUNCTION public.broadcast_alert_email(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.broadcast_alert_email(text, text) FROM PUBLIC, anon;
