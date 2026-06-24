-- ============================================================================
-- Migration: F2-2C Notifications
-- ============================================================================

CREATE TABLE public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  type       text        NOT NULL,
  title      text        NOT NULL,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error')),
  CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.notifications IS
  'Notificaciones in-app por usuario. Las filas se crean desde el servidor vía notify(). El trigger notify_on_insert emite el evento Realtime al canal privado del usuario.';
COMMENT ON COLUMN public.notifications.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.notifications.user_id IS
  'ID del usuario destinatario; referencia auth.users con cascade delete.';
COMMENT ON COLUMN public.notifications.type IS
  'Categoría visual: info | success | warning | error. Controla el color del ícono.';
COMMENT ON COLUMN public.notifications.title IS
  'Texto breve de la notificación, mostrado en bold en el dropdown.';
COMMENT ON COLUMN public.notifications.body IS
  'Detalle opcional. NULL si la notificación solo tiene título.';
COMMENT ON COLUMN public.notifications.link IS
  'URL opcional para navegar al hacer click. NULL si no hay acción asociada.';
COMMENT ON COLUMN public.notifications.read_at IS
  'Timestamp de lectura. NULL = no leída. Se actualiza vía mark_notifications_read().';
COMMENT ON COLUMN public.notifications.created_at IS
  'Timestamp de creación (inmutable). Usado para ordenar el listado.';

CREATE INDEX idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_deny_direct_insert"
  ON public.notifications AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (false);

-- ELIMINADA: el marcado de leído va solo por RPC mark_notifications_read
-- CREATE POLICY "notifications_update_own_read_at" ...

GRANT SELECT, INSERT ON public.notifications TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.notifications FROM anon;
-- Bloquear UPDATE directo desde authenticated: solo la RPC SECURITY DEFINER puede actualizar
REVOKE UPDATE ON public.notifications FROM authenticated;

CREATE OR REPLACE FUNCTION private.notify_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'id',         NEW.id,
      'type',       NEW.type,
      'title',      NEW.title,
      'body',       NEW.body,
      'link',       NEW.link,
      'read_at',    NEW.read_at,
      'created_at', NEW.created_at
    ),
    'notification_created',
    'user:' || NEW.user_id::text || ':notifications',
    true
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.notify_on_insert() FROM PUBLIC;

CREATE TRIGGER notifications_broadcast
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION private.notify_on_insert();

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE id = ANY(p_ids)
    AND user_id = (SELECT auth.uid())
    AND read_at IS NULL;
END;
$$;

GRANT  EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC;

CREATE POLICY "notifications_realtime_select"
  ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    topic LIKE 'user:%:notifications' AND
    SPLIT_PART(topic, ':', 2)::uuid = (SELECT auth.uid())
  );
