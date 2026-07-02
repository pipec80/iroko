-- ============================================================================
-- Migration: atomic replace_robot_config RPC
-- ============================================================================
-- Reliability fix:
--   uploadRobotConfigAction deleted the three robot_* tables and then inserted
--   from four separate client calls. A failure between the DELETE and the
--   INSERTs (or a partial insert) left the tenant with NO configuration — data
--   loss on every hiccup. The Supabase JS client cannot span a transaction, so
--   the delete+insert must live in one SECURITY DEFINER function that runs as a
--   single atomic unit (any error rolls the whole thing back).
--
--   Membership is enforced inside the function (SECURITY DEFINER bypasses RLS),
--   matching the existing "any member of the account" write policy.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.replace_robot_config(
  p_account_id uuid,
  p_routines   jsonb,
  p_contacts   jsonb,
  p_memories   jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT private.user_is_member(p_account_id, v_uid) THEN
    RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.robot_routines WHERE account_id = p_account_id;
  DELETE FROM public.robot_contacts WHERE account_id = p_account_id;
  DELETE FROM public.robot_memories WHERE account_id = p_account_id;

  INSERT INTO public.robot_routines (account_id, time, activity_type, description, message)
  SELECT
    p_account_id,
    (r ->> 'time')::time,
    COALESCE(NULLIF(r ->> 'activity_type', ''), 'General'),
    COALESCE(r ->> 'description', ''),
    COALESCE(r ->> 'message', '')
  FROM jsonb_array_elements(COALESCE(p_routines, '[]'::jsonb)) AS r;

  INSERT INTO public.robot_contacts (account_id, name, relationship, phone, priority)
  SELECT
    p_account_id,
    COALESCE(NULLIF(c ->> 'name', ''), 'Desconocido'),
    COALESCE(c ->> 'relationship', ''),
    COALESCE(c ->> 'phone', ''),
    COALESCE((c ->> 'priority')::int, 1)
  FROM jsonb_array_elements(COALESCE(p_contacts, '[]'::jsonb)) AS c;

  INSERT INTO public.robot_memories (account_id, entity, name, key_fact)
  SELECT
    p_account_id,
    COALESCE(NULLIF(m ->> 'entity', ''), 'General'),
    COALESCE(m ->> 'name', ''),
    COALESCE(m ->> 'key_fact', '')
  FROM jsonb_array_elements(COALESCE(p_memories, '[]'::jsonb)) AS m;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_robot_config(uuid, jsonb, jsonb, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_robot_config(uuid, jsonb, jsonb, jsonb) FROM anon, public;

COMMENT ON FUNCTION public.replace_robot_config(uuid, jsonb, jsonb, jsonb) IS
  'Atomically replaces a tenant''s robot routines/contacts/memories in a single '
  'transaction. SECURITY DEFINER with an internal membership check. Prevents the '
  'partial-write data loss of the previous delete-then-insert client flow.';
