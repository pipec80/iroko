-- F3-C6: gatea broadcast_alert_email a platform_admin (deuda de seguridad
-- documentada desde F2-2F). Usa el mismo guard que admin_list_accounts /
-- get_platform_audit_logs (F3-C1): whitelist + aal2 real de sesión, no solo
-- el claim mfa_enrolled. GRANT/REVOKE no cambian — el gate es interno al
-- body, no a nivel de permisos de Postgres.

CREATE OR REPLACE FUNCTION public.broadcast_alert_email(
  p_subject text,
  p_body text
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer := 0;
  v_row record;
BEGIN
  PERFORM private.assert_platform_admin();

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
  'Encola un email de alerta en pgmq.email_queue para cada owner de cuenta (F2-2F). Gateado a platform_admin (F3-C6).';
