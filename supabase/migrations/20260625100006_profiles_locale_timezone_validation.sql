-- Validación de locale y timezone en profiles via trigger.
-- Los CHECK constraints no pueden usar funciones STABLE/VOLATILE (pg_timezone_names),
-- por eso se usa un trigger BEFORE INSERT/UPDATE.

-- Función de validación
CREATE OR REPLACE FUNCTION private.validate_profile_locale_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validar locale: formato BCP47 básico (es, en, es-CL, en-US, etc.)
  IF NEW.locale IS NOT NULL
     AND NEW.locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' THEN
    RAISE EXCEPTION 'locale inválido: %. Formato esperado: es, en, es-CL, en-US', NEW.locale
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validar timezone: debe existir en la base de datos de zonas horarias de PostgreSQL
  IF NEW.timezone IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone
     ) THEN
    RAISE EXCEPTION 'timezone inválido: %. Usar nombres IANA (ej: America/Santiago, Europe/Madrid)', NEW.timezone
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_profile_locale_timezone() FROM PUBLIC;

-- Trigger: solo se dispara si locale o timezone cambia (evita overhead en otros campos)
CREATE TRIGGER trg_profiles_validate_locale_timezone
  BEFORE INSERT OR UPDATE OF locale, timezone
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_profile_locale_timezone();

-- Verificar datos existentes (emite WARNING si hay valores inválidos, pero no bloquea)
DO $$
DECLARE
  v_bad_locales   integer;
  v_bad_timezones integer;
BEGIN
  SELECT COUNT(*) INTO v_bad_locales
  FROM public.profiles
  WHERE locale IS NOT NULL AND locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$';

  SELECT COUNT(*) INTO v_bad_timezones
  FROM public.profiles p
  WHERE p.timezone IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p.timezone);

  IF v_bad_locales > 0 OR v_bad_timezones > 0 THEN
    RAISE WARNING 'Hay % locales y % timezones inválidos en profiles. Corregir antes de aplicar.',
      v_bad_locales, v_bad_timezones;
  END IF;
END $$;
