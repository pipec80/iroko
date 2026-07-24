'use server';

import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { announcementSchema, type AnnouncementInput } from '@/lib/validation/admin';
import type { Database } from '@/types/database';

type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];

type ActionResult = { data: AnnouncementRow | null; error?: string };

/**
 * Publishes a global platform announcement. Authorization (platform_admins +
 * aal2) is enforced entirely by the `publish_announcement` RPC — a rejected
 * caller gets `{ error: 'not_platform_admin' | 'mfa_required' }` back, not a throw.
 */
export const publishAnnouncement = withServerAction(async function publishAnnouncement(
  input: AnnouncementInput,
): Promise<ActionResult> {
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const { type, title, body, link } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('publish_announcement', {
    p_type: type,
    p_title: title,
    p_body: body || undefined,
    p_link: link || undefined,
  });

  if (error) {
    logger.warn(
      { action: 'admin.announcements.publish', code: error.code, message: error.message },
      'publish_announcement failed',
    );
    return { data: null, error: error.message ?? 'publish_failed' };
  }

  return { data };
});
