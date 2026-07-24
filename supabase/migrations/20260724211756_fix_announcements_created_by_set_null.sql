-- Fix: public.announcements.created_by tenía NOT NULL + FK default NO ACTION
-- hacia auth.users(id) (F3-C7, PR #73). Eso bloquearía borrar/purgar a un
-- platform_admin que haya publicado un anuncio (el DELETE en auth.users
-- fallaría por violación de FK). Corrige al mismo patrón ya usado por
-- api_keys.created_by: columna nullable + ON DELETE SET NULL, preservando el
-- anuncio pero anonimizando la atribución si el autor deja de existir.
-- Encontrado mientras se investigaba el cascade de borrado para F3-C3 (GDPR).

ALTER TABLE public.announcements
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.announcements
  DROP CONSTRAINT announcements_created_by_fkey;

ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.announcements.created_by IS
  'platform_admin que publicó el anuncio. NULL si esa cuenta fue borrada después (SET NULL, no bloquea el borrado).';
