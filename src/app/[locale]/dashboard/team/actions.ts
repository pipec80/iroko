'use server';

import { getLocale } from 'next-intl/server';
import { revalidatePath } from 'next/cache';

import { env } from '@/env';
import { captureServer } from '@/lib/analytics/server';
import { sendInvitationEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { notify } from '@/lib/notifications';
import { withServerAction } from '@/lib/server-action';
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

type ActionResult = {
  error?: string;
  success?: boolean;
  count?: number;
  /** Emails que ya tenían una invitación pendiente: no se reenvió nada. */
  duplicates?: number;
  /** Invitaciones creadas cuyo email no se pudo entregar. */
  failed?: number;
};

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

  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  const { data: invitations, error } = await supabase.rpc('invite_members', {
    p_account_id: accountId,
    p_emails: parsed.data.emails,
    p_role: parsed.data.role,
  });

  if (error) {
    logger.warn(
      { action: 'team.invite', code: error.code, message: error.message },
      'invite_members failed',
    );
    const knownError =
      error.message?.includes('seat_limit_reached') ? 'seat_limit_reached' : 'invite_failed';
    if (knownError === 'seat_limit_reached' && caller) {
      await captureServer({
        event: 'feature_limit_reached',
        properties: { limit_key: 'seats_max' },
        distinctId: caller.id,
        accountId,
      });
      const locale = await getLocale();
      await notify(caller.id, {
        type: 'warning',
        title: 'Alcanzaste el límite de miembros de tu plan',
        link: `/${locale}/dashboard/billing`,
      }).catch((err: unknown) => {
        logger.error(
          { action: 'team.invite.notify', accountId },
          err instanceof Error ? err.message : 'Unknown error',
        );
      });
    }
    return { error: knownError };
  }

  const count = (invitations ?? []).length;
  // invite_members se traga el unique_violation cuando ya existe una invitación
  // pendiente para ese email, así que devuelve menos filas de las pedidas.
  const duplicates = parsed.data.emails.length - count;

  // Nada nuevo que enviar: sin esto la UI cerraba el diálogo con un mensaje de
  // éxito idéntico al de un envío real.
  if (count === 0) {
    logger.info({ action: 'team.invite.duplicates', duplicates }, 'No new invitations created');
    return { error: 'already_invited' };
  }

  logger.info({ action: 'team.invite.success', count, role: parsed.data.role }, 'Members invited');

  revalidatePath('/[locale]/dashboard/members', 'page');

  if (caller) {
    await captureServer({
      event: 'invitation_sent',
      properties: { role: parsed.data.role, invited_count: count },
      distinctId: caller.id,
      accountId,
    });
  }

  const inviterEmail = caller?.email ?? 'un miembro del equipo';
  const locale = await getLocale();

  // El envío va inline, no dentro de after(): after() corre DESPUÉS de que la
  // respuesta salió, así que un fallo de entrega no puede llegar a la UI y
  // moría en un .catch() que solo logueaba. Una invitación que no se entrega
  // deja al invitado fuera del equipo — el usuario tiene que enterarse.
  // Enviar tokens en texto plano acá es la única oportunidad: el RPC solo
  // guarda el hash y los devuelve una vez.
  const results = await Promise.allSettled(
    (invitations ?? []).map((inv) =>
      sendInvitationEmail(inv.email, {
        inviterEmail,
        teamRole: parsed.data.role,
        inviteUrl: `${env.SITE_URL}/${locale}/auth/accept-invitation?token=${inv.token}`,
      }),
    ),
  );

  const failed = results.filter((result) => result.status === 'rejected').length;

  if (failed > 0) {
    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error(
          { action: 'invitation_email', accountId },
          result.reason instanceof Error ? result.reason.message : 'Unknown error',
        );
      }
    }
  }

  return { success: true, count, duplicates, failed };
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
    return { error: 'remove_failed' };
  }

  logger.info(
    { action: 'team.remove.success', targetUserId: parsed.data.userId },
    'Member removed',
  );

  revalidatePath('/[locale]/dashboard/members', 'page');
  return { success: true };
});
