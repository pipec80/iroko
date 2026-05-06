-- Fix: handle_new_profile() collides with accounts_slug_key when two users
-- have the same display_name. Append first 8 chars of user_id (via base36)
-- as a discriminator after slugify; keeps slugs readable and unique.

CREATE OR REPLACE FUNCTION private.handle_new_profile()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
DECLARE
  v_account_id uuid;
  v_base_slug text;
  v_slug text;
  v_attempt int := 0;
BEGIN
  RAISE LOG 'handle_new_profile: creating personal account for user_id=%', NEW.id;

  v_base_slug := private.slugify(COALESCE(NEW.display_name, NEW.id::text));
  v_slug := v_base_slug;

  -- Retry up to 5 times with a short uid suffix if the slug is taken.
  WHILE EXISTS (SELECT 1 FROM public.accounts WHERE slug = v_slug) LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      -- Final fallback: fully qualify with the user UUID.
      v_slug := v_base_slug || '-' || replace(NEW.id::text, '-', '');
      EXIT;
    END IF;
    v_slug := v_base_slug || '-' || substring(replace(NEW.id::text, '-', '') FROM 1 FOR 6 + v_attempt);
  END LOOP;

  INSERT INTO public.accounts (id, type, name, slug, created_by)
  VALUES (
    NEW.id,
    'personal',
    COALESCE(NEW.display_name, 'Personal'),
    v_slug,
    NEW.id
  )
  RETURNING id INTO v_account_id;

  INSERT INTO public.accounts_memberships (account_id, user_id, role)
  VALUES (v_account_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;
