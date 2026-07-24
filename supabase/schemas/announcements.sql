-- ============================================================================
-- Announcements Schema  (F3-C7)
-- ============================================================================
-- Anuncios globales de plataforma, visibles para cualquier usuario
-- autenticado. A diferencia de public.notifications (F2-2C), que es
-- estrictamente 1 fila por destinatario, un announcement no pertenece a un
-- account_id ni a un user_id -- es un broadcast de la plataforma hacia
-- todos, con su propio canal Realtime global (platform:announcements).
-- INSERT solo vía la RPC publish_announcement() (gateada a platform_admin
-- con aal2 real, mismo patrón que broadcast_alert_email, F3-C6). El trigger
-- private.announcements_broadcast() emite el evento Realtime al canal
-- global. No se toca notifications.sql: son dos primitivas paralelas con el
-- mismo *patrón* (tabla + trigger + canal + hook), no la misma tabla.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text        NOT NULL DEFAULT 'info',
  title      text        NOT NULL,
  body       text,
  link       text,
  created_by uuid        NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcements_type_check CHECK (type IN ('info', 'success', 'warning', 'error'))
);

COMMENT ON TABLE public.announcements IS
  'Anuncios globales de plataforma (F3-C7). INSERT solo vía publish_announcement() (gateado a platform_admin + aal2). Sin account_id/user_id: no pertenece a un tenant ni a un usuario. Sin UPDATE/DELETE en v1 (YAGNI) -- un anuncio mal publicado se corrige publicando uno nuevo.';
COMMENT ON COLUMN public.announcements.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.announcements.type IS
  'Categoría visual: info | success | warning | error. Mismo vocabulario que notifications.type.';
COMMENT ON COLUMN public.announcements.title IS
  'Texto breve del anuncio, mostrado en bold en el dropdown.';
COMMENT ON COLUMN public.announcements.body IS
  'Detalle opcional. NULL si el anuncio solo tiene título.';
COMMENT ON COLUMN public.announcements.link IS
  'URL opcional para navegar al hacer click. NULL si no hay acción asociada.';
COMMENT ON COLUMN public.announcements.created_by IS
  'platform_admin que publicó el anuncio.';
COMMENT ON COLUMN public.announcements.created_at IS
  'Timestamp de creación (inmutable). Ordena el historial y sirve de cursor de "no leído" en el cliente (localStorage; sin tabla announcement_reads -- YAGNI, ver design doc F3 tarea 6).';

-- Índice principal: historial ordenado por fecha desc (SELECT "últimos N" al montar la campana)
CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON public.announcements (created_at DESC);

-- Índice de soporte para el FK created_by (evita seq scan en cascadas/joins)
CREATE INDEX IF NOT EXISTS idx_announcements_created_by
  ON public.announcements (created_by);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado ve el historial completo de anuncios
CREATE POLICY "announcements_select_all"
  ON public.announcements
  FOR SELECT TO authenticated
  USING (true);

-- Bloquear INSERTs directos desde el cliente (solo publish_announcement() puede insertar)
CREATE POLICY "announcements_deny_direct_insert"
  ON public.announcements AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (false);

-- authenticated puede SELECT e INSERT (protegido por RLS); el INSERT queda
-- bloqueado en la práctica por la política restrictiva de arriba -- el grant
-- solo existe para que el rechazo sea el error de RLS ("row-level security
-- policy"), no un "permission denied" genérico de nivel de grant (mismo
-- patrón que notifications.sql).
GRANT SELECT, INSERT ON public.announcements TO authenticated;
-- Ocultar tabla de anon en REST/GraphQL (contenido solo para usuarios autenticados)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.announcements FROM anon;

-- ============================================================================
-- RPC pública: publicar un anuncio (solo platform_admin con aal2 real)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.publish_announcement(
  p_type  text,
  p_title text,
  p_body  text DEFAULT NULL,
  p_link  text DEFAULT NULL
)
RETURNS public.announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.announcements;
BEGIN
  PERFORM private.assert_platform_admin();

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title_required';
  END IF;
  IF p_type IS NULL OR p_type NOT IN ('info', 'success', 'warning', 'error') THEN
    RAISE EXCEPTION 'invalid_type';
  END IF;

  INSERT INTO public.announcements (type, title, body, link, created_by)
  VALUES (
    p_type,
    trim(p_title),
    NULLIF(trim(p_body), ''),
    NULLIF(trim(p_link), ''),
    (SELECT auth.uid())
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.publish_announcement(text, text, text, text) IS
  'Publica un anuncio global de plataforma (F3-C7). Gateado a platform_admin con aal2 real vía private.assert_platform_admin() (mismo patrón que broadcast_alert_email, F3-C6).';

REVOKE ALL ON FUNCTION public.publish_announcement(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_announcement(text, text, text, text) TO authenticated;

-- ============================================================================
-- Función trigger: emite evento Realtime al canal global platform:announcements
-- ============================================================================

CREATE OR REPLACE FUNCTION private.announcements_broadcast()
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
      'created_at', NEW.created_at
    ),
    'announcement_created',
    'platform:announcements',
    true
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.announcements_broadcast() FROM PUBLIC;

CREATE TRIGGER announcements_broadcast
  AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION private.announcements_broadcast();

-- ============================================================================
-- Autorización Realtime: canal global platform:announcements
-- ============================================================================

-- SELECT: cualquier authenticated puede recibir mensajes del canal global de anuncios
-- (a diferencia de notifications/presence, no hay ownership que validar vía SPLIT_PART:
-- es un topic fijo y único, no parametrizado por id).
CREATE POLICY "announcements_realtime_select"
  ON realtime.messages
  FOR SELECT TO authenticated
  USING (topic = 'platform:announcements');
