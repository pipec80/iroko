-- Agregar columna dedicada pending_deletion a profiles.
-- El estado operacional se almacenaba en metadata JSONB (no indexable, frágil).
-- La columna booleana es más segura, indexable y expresa intención clara.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_deletion boolean NOT NULL DEFAULT false;

-- Migrar estado existente desde metadata JSONB
UPDATE public.profiles
  SET pending_deletion = true
  WHERE metadata->>'pending_deletion' = 'true';

-- Limpiar la clave del JSONB (ya no es la fuente de verdad)
UPDATE public.profiles
  SET metadata = metadata - 'pending_deletion'
  WHERE metadata ? 'pending_deletion';

-- Índice parcial para el job de hard-delete
CREATE INDEX IF NOT EXISTS idx_profiles_pending_deletion
  ON public.profiles (deleted_at)
  WHERE pending_deletion = true;

-- Actualizar request_account_deletion para usar la columna
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    deleted_at        = now(),
    pending_deletion  = true,
    updated_at        = now()
  WHERE id = v_uid;

  UPDATE public.accounts
  SET deleted_at = now(), updated_at = now()
  WHERE created_by = v_uid AND type = 'personal' AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated, service_role;

COMMENT ON FUNCTION public.request_account_deletion() IS
  'Marca el perfil + account personal del caller como soft-deleted. '
  'pending_deletion=true habilita el job pg_cron de hard-delete a los 90 días.';

COMMENT ON COLUMN public.profiles.pending_deletion IS
  'true = usuario solicitó eliminación de cuenta. El job hard-delete-old-accounts '
  'lo elimina definitivamente 90 días después de deleted_at.';
