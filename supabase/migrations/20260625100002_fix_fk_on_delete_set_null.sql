-- Fix: FKs de created_by/invited_by sin ON DELETE bloqueaban el cascade
-- de auth.users → profiles al hacer hard-delete de usuarios.
-- ON DELETE SET NULL preserva el registro del documento/proyecto/invitación
-- pero limpia la referencia al creador eliminado.

-- documents.created_by
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_created_by_fkey;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

-- projects.created_by
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

-- invitations.invited_by
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_invited_by_fkey
    FOREIGN KEY (invited_by)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;
