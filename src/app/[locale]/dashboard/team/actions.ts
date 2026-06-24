'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';

import { appConfig } from '@/config/app.config';
import { env } from '@/env';
import { sendInvitationEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { inviteSchema, removeMemberSchema } from '@/lib/validation/team';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type TeamMember = {
  user_id: string | null;
  email: string;
  display_name: string | null;
  given_name: string | null;
  family_name: string | null;
  avatar_url: string | null;
  role: string;
  status: 'active' | 'pending';
  joined_at: string;
};

type ActionResult = { error?: string; success?: boolean; count?: number };

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Extract the active account_id from the JWT app_metadata. */
async function getAccountId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.app_metadata?.account_id as string | undefined) ?? null;
}

// --------------------------------------------------------------------------
// Actions
// --------------------------------------------------------------------------

/**
 * Fetches team members + pending invitations for the current user's account.
 * Called server-side from the team page (RSC).
 */
export const getTeamMembers = withServerAction(async function getTeamMembers(): Promise<{
  data: TeamMember[];
  error?: string;
}> {
  const accountId = await getAccountId();
  if (!accountId) return { data: [], error: 'no_account' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_team_members', {
    p_account_id: accountId,
  });

  if (error) {
    logger.warn({ action: 'team.list', code: error.code }, 'list_team_members failed');
    return { data: [], error: error.code ?? 'fetch_failed' };
  }

  return { data: (data as TeamMember[]) ?? [] };
});

/**
 * Invite members by email with a specified role.
 * Validates emails strictly with Zod before calling the RPC.
 */
export const inviteMembers = withServerAction(async function inviteMembers(
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    emails: formData.get('emails') as string,
    role: formData.get('role') as string,
  };

  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'validation_error' };
  }

  const accountId = await getAccountId();
  if (!accountId) return { error: 'no_account' };

  const invitedAt = new Date().toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('invite_members', {
    p_account_id: accountId,
    p_emails: parsed.data.emails,
    p_role: parsed.data.role,
  });

  if (error) {
    logger.warn(
      { action: 'team.invite', code: error.code, message: error.message },
      'invite_members failed',
    );
    return { error: error.message ?? 'invite_failed' };
  }

  logger.info(
    { action: 'team.invite.success', count: data, role: parsed.data.role },
    'Members invited',
  );

  revalidatePath('/[locale]/dashboard/team');

  // Enviar emails de invitación — después de responder, solo a las recién creadas.
  if ((data as number) > 0) {
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();
    const inviterEmail = caller?.email ?? 'un miembro del equipo';

    after(async () => {
      const adminClient = createAdminClient();
      const { data: invitations, error: fetchError } = await adminClient
        .from('invitations')
        .select('email, token, role')
        .eq('account_id', accountId)
        .in('email', parsed.data.emails)
        .eq('status', 'pending')
        .gte('created_at', invitedAt);

      if (fetchError) {
        logger.warn({ action: 'team.invite.fetch_tokens' }, fetchError.message);
        return;
      }

      await Promise.allSettled(
        (invitations ?? []).map((inv) => {
          const inviteUrl = `${env.SITE_URL}/${appConfig.defaultLocale}/auth/accept-invitation?token=${inv.token}`;
          return sendInvitationEmail(inv.email, {
            inviterEmail,
            teamRole: inv.role,
            inviteUrl,
          }).catch((err: unknown) => {
            logger.error(
              { action: 'invitation_email', email: inv.email },
              err instanceof Error ? err.message : 'Unknown error',
            );
          });
        }),
      );
    });
  }

  return { success: true, count: data as number };
});

/**
 * Remove a member from the team account.
 */
export const removeMember = withServerAction(async function removeMember(
  formData: FormData,
): Promise<ActionResult> {
  const raw = { userId: formData.get('userId') as string };

  const parsed = removeMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: 'invalid_user_id' };
  }

  const accountId = await getAccountId();
  if (!accountId) return { error: 'no_account' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('remove_member', {
    p_account_id: accountId,
    p_user_id: parsed.data.userId,
  });

  if (error) {
    logger.warn(
      { action: 'team.remove', code: error.code, message: error.message },
      'remove_member failed',
    );
    return { error: error.message ?? 'remove_failed' };
  }

  logger.info(
    { action: 'team.remove.success', targetUserId: parsed.data.userId },
    'Member removed',
  );

  revalidatePath('/[locale]/dashboard/team');
  return { success: true };
});
