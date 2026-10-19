-- Validate canonical TS helper output; never erase or heuristically normalize
-- historical links here. Dirty data requires the reviewed TS backfill first.
CREATE OR REPLACE FUNCTION private.is_safe_navigation_link(p_link text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_authority text;
  v_host text;
  v_port text;
  v_path text;
BEGIN
  IF p_link IS NULL THEN RETURN true; END IF;
  IF length(p_link) NOT BETWEEN 1 AND 2000
    OR p_link ~ '[^!-~]' OR position(chr(92) IN p_link) > 0
    OR p_link ~ '%([^0-9A-Fa-f]|[0-9A-Fa-f]([^0-9A-Fa-f]|$)|$)'
  THEN RETURN false; END IF;

  IF left(p_link, 1) = '/' AND left(p_link, 2) <> '//' THEN
    v_path := split_part(split_part(p_link, '?', 1), '#', 1);
  ELSIF p_link LIKE 'https://%' THEN
    v_authority := substring(p_link FROM '^https://([^/?#]+)');
    v_path := substring(p_link FROM '^https://[^/?#]+(/[^?#]*)');
    IF v_authority IS NULL OR v_path IS NULL THEN RETURN false; END IF;
    IF left(v_authority, 1) = '[' THEN
      v_host := substring(v_authority FROM '^\[([0-9a-f:]+)\]');
      IF v_host IS NULL THEN RETURN false; END IF;
      IF family(v_host::inet) <> 6 THEN RETURN false; END IF;
      v_port := substring(v_authority FROM '^\[[0-9a-f:]+\](.*)$');
      IF v_port <> '' AND v_port !~ '^:[0-9]+$' THEN RETURN false; END IF;
      v_port := nullif(substr(v_port, 2), '');
    ELSE
      -- WHATWG permits ASCII punctuation in hostnames beyond DNS labels.
      -- Credentials and host delimiters are excluded here, not in the path.
      v_host := split_part(v_authority, ':', 1);
      IF v_host !~ '^[a-z0-9.!"$&''()*+,;=_`{}~-]+$' THEN RETURN false; END IF;
      IF position(':' IN v_authority) > 0 THEN
        v_port := substring(v_authority FROM ':([0-9]+)$');
        IF v_port IS NULL OR v_authority <> v_host || ':' || v_port THEN RETURN false; END IF;
      END IF;
    END IF;
    IF v_port IS NOT NULL AND (
      length(v_port) > 5 OR v_port::integer > 65535
      OR (length(v_port) > 1 AND left(v_port, 1) = '0') OR v_port = '443'
    ) THEN RETURN false; END IF;
  ELSE
    RETURN false;
  END IF;

  -- Check the path only: dots, slashes and @ in query/fragment are harmless.
  IF v_path ~* '(^|/)(\.|%2e){1,2}(/|$)' THEN RETURN false; END IF;
  RETURN true;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION private.is_safe_navigation_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_safe_navigation_link(text) TO authenticated, service_role;
COMMENT ON FUNCTION private.is_safe_navigation_link(text) IS
  'Pure invoker navigation validator for canonical TS href output: NULL, single-slash internal paths or absolute HTTPS; no credentials, controls, backslashes, malformed percent escapes or path dot segments. Not a transport/SSRF policy or WHATWG normalizer.';

DO $$
DECLARE v_announcements bigint; v_notifications bigint;
BEGIN
  -- Reset replays statements without an enclosing transaction. Keep the lock,
  -- preflight and constraint installation in this single atomic DO statement.
  LOCK TABLE public.announcements, public.notifications IN SHARE ROW EXCLUSIVE MODE;
  SELECT count(*) INTO v_announcements FROM public.announcements WHERE NOT private.is_safe_navigation_link(link);
  SELECT count(*) INTO v_notifications FROM public.notifications WHERE NOT private.is_safe_navigation_link(link);
  IF v_announcements > 0 OR v_notifications > 0 THEN
    RAISE EXCEPTION 'navigation_link_preflight_required: announcements=%, notifications=%; classify and backfill with the TS normalizer before applying', v_announcements, v_notifications;
  END IF;
  ALTER TABLE public.announcements ADD CONSTRAINT announcements_navigation_link_check CHECK (private.is_safe_navigation_link(link));
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_navigation_link_check CHECK (private.is_safe_navigation_link(link));
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_announcement(
  p_type text, p_title text, p_body text DEFAULT NULL, p_link text DEFAULT NULL
)
RETURNS public.announcements
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.announcements;
  v_link text := nullif(btrim(p_link, ' '), '');
BEGIN
  PERFORM private.assert_platform_admin();
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title_required';
  END IF;
  IF p_type IS NULL OR p_type NOT IN ('info', 'success', 'warning', 'error') THEN
    RAISE EXCEPTION 'invalid_type';
  END IF;
  IF NOT private.is_safe_navigation_link(v_link) THEN
    RAISE EXCEPTION 'invalid_link';
  END IF;
  INSERT INTO public.announcements (type, title, body, link, created_by)
  VALUES (p_type, trim(p_title), nullif(trim(p_body), ''), v_link, (SELECT auth.uid()))
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
