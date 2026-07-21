'use server';

import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { platformAlertSchema, type PlatformAlertInput } from '@/lib/validation/admin';

type ActionResult = { data: { sentCount: number } | null; error?: string };

/**
 * Broadcasts an alert email to every account owner on the platform.
 * Authorization (platform_admins + aal2) is enforced entirely by the
 * `broadcast_alert_email` RPC — a rejected caller gets
 * `{ error: 'not_platform_admin' | 'mfa_required' }` back, not a throw.
 */
export const sendPlatformAlert = withServerAction(async function sendPlatformAlert(
  input: PlatformAlertInput,
): Promise<ActionResult> {
  const parsed = platformAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const { subject, body } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('broadcast_alert_email', {
    p_subject: subject,
    p_body: body,
  });

  if (error) {
    logger.warn(
      { action: 'admin.alerts.send', code: error.code, message: error.message },
      'broadcast_alert_email failed',
    );
    return { data: null, error: error.message ?? 'send_failed' };
  }

  return { data: { sentCount: data ?? 0 } };
});
