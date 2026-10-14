-- Plan 014 T1: robot reference live-role RBAC. No schema or RPC signature changes.
-- CREATE OR REPLACE preserves existing EXECUTE ACLs; do not widen them.

CREATE OR REPLACE FUNCTION "public"."replace_robot_config"("p_account_id" "uuid", "p_routines" "jsonb", "p_contacts" "jsonb", "p_memories" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT COALESCE(private.get_user_role(p_account_id, v_uid) IN ('owner', 'admin', 'member'), false) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
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


COMMENT ON FUNCTION public.replace_robot_config(uuid, jsonb, jsonb, jsonb) IS 'Atomically replaces a tenant''s robot routines/contacts/memories in a single transaction. SECURITY DEFINER with a live owner/admin/member role check. Prevents the partial-write data loss of the previous delete-then-insert client flow.';

-- Plan 014 T1: replace permissive membership writes in place.
-- Reads remain scoped to live tenant memberships. JWT role claims are not authority.
ALTER POLICY "Users can insert routines to their accounts" ON public.robot_routines
  TO authenticated WITH CHECK (private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin', 'member'));
ALTER POLICY "Users can update routines of their accounts" ON public.robot_routines
  TO authenticated USING (private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin', 'member')) WITH CHECK (private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin', 'member'));
ALTER POLICY "Users can delete routines of their accounts" ON public.robot_routines
  TO authenticated USING (private.get_user_role(account_id, (SELECT auth.uid())) = 'owner');

ALTER POLICY "Users can insert contacts to their accounts" ON public.robot_contacts
  TO authenticated WITH CHECK (private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin', 'member'));
ALTER POLICY "Users can update contacts of their accounts" ON public.robot_contacts
  TO authenticated USING (private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin', 'member')) WITH CHECK (private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin', 'member'));
ALTER POLICY "Users can delete contacts of their accounts" ON public.robot_contacts
  TO authenticated USING (private.get_user_role(account_id, (SELECT auth.uid())) = 'owner');

ALTER POLICY "Users can insert memories to their accounts" ON public.robot_memories
  TO authenticated WITH CHECK (private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin', 'member'));
ALTER POLICY "Users can update memories of their accounts" ON public.robot_memories
  TO authenticated USING (private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin', 'member')) WITH CHECK (private.get_user_role(account_id, (SELECT auth.uid())) IN ('owner', 'admin', 'member'));
ALTER POLICY "Users can delete memories of their accounts" ON public.robot_memories
  TO authenticated USING (private.get_user_role(account_id, (SELECT auth.uid())) = 'owner');

ALTER POLICY "Accounts can insert their own robot configs" ON storage.objects
  TO authenticated WITH CHECK (bucket_id = 'robot_configs' AND private.get_user_role(split_part(name, '/', 1)::uuid, (SELECT auth.uid())) IN ('owner', 'admin', 'member'));
ALTER POLICY "Accounts can delete their own robot configs" ON storage.objects
  TO authenticated USING (bucket_id = 'robot_configs' AND private.get_user_role(split_part(name, '/', 1)::uuid, (SELECT auth.uid())) IN ('owner', 'admin', 'member'));
CREATE POLICY "Accounts can update their own robot configs" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'robot_configs' AND private.get_user_role(split_part(name, '/', 1)::uuid, (SELECT auth.uid())) IN ('owner', 'admin', 'member')) WITH CHECK (bucket_id = 'robot_configs' AND private.get_user_role(split_part(name, '/', 1)::uuid, (SELECT auth.uid())) IN ('owner', 'admin', 'member'));
