-- ============================================================================
-- Presence Schema (F3-3H-2)
-- ============================================================================
-- Autorización Realtime para el canal account:{accountId}:presence. Sin
-- tabla propia — solo políticas sobre realtime.messages. Reusa
-- private.user_is_member (schema private.sql) para el chequeo de membership.
-- ============================================================================

CREATE POLICY "presence_realtime_select"
  ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    topic LIKE 'account:%:presence' AND
    private.user_is_member(SPLIT_PART(topic, ':', 2)::uuid, (SELECT auth.uid()))
  );

CREATE POLICY "presence_realtime_insert"
  ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    topic LIKE 'account:%:presence' AND
    private.user_is_member(SPLIT_PART(topic, ':', 2)::uuid, (SELECT auth.uid()))
  );
