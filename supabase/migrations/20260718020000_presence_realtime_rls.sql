-- ============================================================================
-- F3-3H-2: autorización Realtime para el canal account:{accountId}:presence.
-- Reusa private.user_is_member (ya existe, mismo chequeo exacto que se
-- necesita) — NO se crea un helper nuevo.
-- ============================================================================

-- SELECT: cualquier miembro de la cuenta puede recibir presence de su cuenta
CREATE POLICY "presence_realtime_select"
  ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    topic LIKE 'account:%:presence' AND
    private.user_is_member(SPLIT_PART(topic, ':', 2)::uuid, (SELECT auth.uid()))
  );

-- INSERT: el cliente escribe su propio estado de presencia (track()) — solo
-- miembros de la cuenta pueden anunciar presencia en su propio canal.
CREATE POLICY "presence_realtime_insert"
  ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    topic LIKE 'account:%:presence' AND
    private.user_is_member(SPLIT_PART(topic, ':', 2)::uuid, (SELECT auth.uid()))
  );
