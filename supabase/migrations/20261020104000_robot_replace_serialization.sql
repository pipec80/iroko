-- 017.2-T5: serialize complete Robot replacement on the stable account row.
CREATE OR REPLACE FUNCTION public.replace_robot_config(
  p_account_id uuid, p_routines jsonb, p_contacts jsonb, p_memories jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- The account row exists even for an empty snapshot. Authorization must be
  -- checked after this wait because a membership can be revoked meanwhile.
  PERFORM 1 FROM public.accounts WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT COALESCE(private.get_user_role(p_account_id, v_uid) IN ('owner', 'admin', 'member'), false) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.robot_routines WHERE account_id = p_account_id;
  DELETE FROM public.robot_contacts WHERE account_id = p_account_id;
  DELETE FROM public.robot_memories WHERE account_id = p_account_id;

  INSERT INTO public.robot_routines (account_id, time, activity_type, description, message)
  SELECT p_account_id,
    (r ->> 'time')::time,
    COALESCE(NULLIF(r ->> 'activity_type', ''), 'General'),
    COALESCE(r ->> 'description', ''),
    COALESCE(r ->> 'message', '')
  FROM jsonb_array_elements(COALESCE(p_routines, '[]'::jsonb)) AS r;

  INSERT INTO public.robot_contacts (account_id, name, relationship, phone, priority)
  SELECT p_account_id,
    COALESCE(NULLIF(c ->> 'name', ''), 'Desconocido'),
    COALESCE(c ->> 'relationship', ''),
    COALESCE(c ->> 'phone', ''),
    COALESCE((c ->> 'priority')::int, 1)
  FROM jsonb_array_elements(COALESCE(p_contacts, '[]'::jsonb)) AS c;

  INSERT INTO public.robot_memories (account_id, entity, name, key_fact)
  SELECT p_account_id,
    COALESCE(NULLIF(m ->> 'entity', ''), 'General'),
    COALESCE(m ->> 'name', ''),
    COALESCE(m ->> 'key_fact', '')
  FROM jsonb_array_elements(COALESCE(p_memories, '[]'::jsonb)) AS m;
END;
$$;

COMMENT ON FUNCTION public.replace_robot_config(uuid,jsonb,jsonb,jsonb) IS
  'Serializes each tenant''s complete robot replacement on its account row, then checks the live owner/admin/member role. All three collections commit or roll back together.';
