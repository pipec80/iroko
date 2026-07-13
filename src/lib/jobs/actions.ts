'use server';

import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';

type ActionResult<T> = { data: T | null; error?: string };

/** Encola un email de alerta en pgmq.email_queue para todos los owners de
 * cuenta (F2-2F). Sin gate de admin todavía — cualquier usuario autenticado
 * puede dispararlo; F3 agrega el control real de platform_admin. */
export const broadcastAlertEmail = withServerAction(async function broadcastAlertEmail(input: {
  subject: string;
  body: string;
}): Promise<ActionResult<{ enqueued: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('broadcast_alert_email', {
    p_subject: input.subject,
    p_body: input.body,
  });
  if (error) return { data: null, error: error.message ?? 'broadcast_failed' };
  return { data: { enqueued: data ?? 0 } };
});
