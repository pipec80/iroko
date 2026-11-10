-- Plan015 T1: a missing plan limit must not grant an unlimited quota.
-- An explicit -1 remains the documented unlimited sentinel.
CREATE OR REPLACE FUNCTION private.within_plan_limit(
  p_account_id uuid,
  p_key text,
  p_current bigint,
  p_increment integer DEFAULT 1
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN private.get_account_limit(p_account_id, p_key) = -1 THEN true
    WHEN private.get_account_limit(p_account_id, p_key) >= 0 THEN
      (p_current + p_increment) <= private.get_account_limit(p_account_id, p_key)
    ELSE false
  END;
$$;

COMMENT ON FUNCTION private.within_plan_limit(uuid, text, bigint, integer) IS
  'True si (current+increment) respeta un límite explícito no negativo, o si el límite explícito es -1 (ilimitado). Límite ausente o error de lectura no concede cuota. p_current es bigint porque count(*) devuelve bigint.';
