'use server';

import { getLocale } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { env } from '@/env';
import { captureServer } from '@/lib/analytics/server';
import { sendInvitationEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { notify } from '@/lib/notifications';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import {
  changeRoleSchema,
  inviteSchema,
  removeMemberSchema,
  revokeInvitationSchema,
  transferOwnershipSchema,
} from '@/lib/validation/team';

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
  /** Non-null only for status: 'pending' — necesario para revokeInvitation. */
  invitation_id: string | null;
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

  const inviterEmail = caller?.email ?? 'un miembro del equipo';
  const locale = await getLocale();

  // El envío va inline, no dentro de after(): after() corre DESPUÉS de que la
  // respuesta salió, así que un fallo de entrega no puede llegar a la UI y
  // moría en un .catch() que solo logueaba. Una invitación que no se entrega
  // deja al invitado fuera del equipo — el usuario tiene que enterarse.
  //
  // Nada que pueda lanzar debe correr entre el RPC y este punto: los tokens en
  // texto plano existen una sola vez (el RPC solo guarda el hash), y las
  // invitaciones ya están creadas. Si algo aborta acá, quedan en 'pending' con
  // su token perdido para siempre y el reintento choca con 'already_invited'
  // sin haber entregado nunca nada. Por eso la telemetría va después.
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

  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      logger.error(
        // El email del destinatario es necesario para saber CUÁL invitación no
        // salió cuando en el mismo lote hay éxitos y fallos mezclados.
        { action: 'invitation_email', accountId, email: invitations?.[index]?.email },
        result.reason instanceof Error ? result.reason.message : 'Unknown error',
      );
    }
  }

  if (caller) {
    // captureServer resuelve el consentimiento con una query a profiles que NO
    // está dentro de su try/catch (analytics/server.ts): si falla, la excepción
    // sube hasta withServerAction. Nunca debe poder tumbar un envío ya hecho.
    try {
      await captureServer({
        event: 'invitation_sent',
        properties: { role: parsed.data.role, invited_count: count },
        distinctId: caller.id,
        accountId,
      });
    } catch (err: unknown) {
      logger.error(
        { action: 'team.invite.capture', accountId },
        err instanceof Error ? err.message : 'captureServer failed',
      );
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

/**
 * Las 4 RPCs de lifecycle (leave_team, change_member_role, transfer_ownership,
 * revoke_invitation) rechazan con RAISE EXCEPTION 'codigo_snake_case' para los
 * casos que la UI debe mostrar con su propio mensaje, y con una frase en
 * inglés ("Only owner or admin can ...") para los rechazos de rol genéricos
 * que comparten un solo mensaje ('not_authorized'). Ver comentarios de cada
 * RPC en supabase/migrations/20260815120000_membership_lifecycle.sql.
 */
const KNOWN_LIFECYCLE_CODES = new Set([
  'account_not_found',
  'not_a_team',
  'not_a_member',
  'last_owner_must_transfer',
  'cannot_change_own_role',
  'use_transfer_ownership',
  'already_owner',
  'target_not_a_member',
  'invitation_not_found',
  'invitation_not_pending',
]);

function mapLifecycleError(message: string | undefined): string {
  if (message && KNOWN_LIFECYCLE_CODES.has(message)) return message;
  return 'not_authorized';
}

/**
 * The caller leaves the active (team) account. Redirects to /dashboard on
 * success — leave_team moves active_account_id back to the caller's Personal
 * account server-side, so the session must be refreshed like switchAccount.
 */
export const leaveTeam = withServerAction(async function leaveTeam(): Promise<{
  error?: string;
}> {
  const accountId = await getAccountId();
  if (!accountId) return { error: 'no_account' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('leave_team', { p_account_id: accountId });

  if (error) {
    logger.warn(
      { action: 'team.leave', code: error.code, message: error.message },
      'leave_team failed',
    );
    return { error: mapLifecycleError(error.message) };
  }

  logger.info({ action: 'team.leave.success', accountId }, 'Left team');

  await supabase.auth.refreshSession();
  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
});

/**
 * Change a member's role. Rejects assigning 'owner' (use transferOwnership)
 * and the caller changing their own role — both enforced by the RPC.
 */
export const changeMemberRole = withServerAction(async function changeMemberRole(
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    userId: formData.get('userId') as string,
    role: formData.get('role') as string,
  };

  const parsed = changeRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: 'invalid_input' };
  }

  const accountId = await getAccountId();
  if (!accountId) return { error: 'no_account' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('change_member_role', {
    p_account_id: accountId,
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });

  if (error) {
    logger.warn(
      { action: 'team.change_role', code: error.code, message: error.message },
      'change_member_role failed',
    );
    return { error: mapLifecycleError(error.message) };
  }

  logger.info(
    {
      action: 'team.change_role.success',
      targetUserId: parsed.data.userId,
      role: parsed.data.role,
    },
    'Member role changed',
  );

  revalidatePath('/[locale]/dashboard/members', 'page');
  return { success: true };
});

/**
 * Transfer ownership of the active team account to another member.
 * Only callable by the current owner — the RPC promotes the new owner before
 * demoting the caller, so the account is never left without one.
 */
export const transferOwnership = withServerAction(async function transferOwnership(
  formData: FormData,
): Promise<ActionResult> {
  const raw = { newOwnerUserId: formData.get('newOwnerUserId') as string };

  const parsed = transferOwnershipSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: 'invalid_input' };
  }

  const accountId = await getAccountId();
  if (!accountId) return { error: 'no_account' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('transfer_ownership', {
    p_account_id: accountId,
    p_new_owner: parsed.data.newOwnerUserId,
  });

  if (error) {
    logger.warn(
      { action: 'team.transfer_ownership', code: error.code, message: error.message },
      'transfer_ownership failed',
    );
    return { error: mapLifecycleError(error.message) };
  }

  logger.info(
    { action: 'team.transfer_ownership.success', newOwnerUserId: parsed.data.newOwnerUserId },
    'Ownership transferred',
  );

  revalidatePath('/[locale]/dashboard/members', 'page');
  return { success: true };
});

/**
 * Revoke a pending invitation — it stops being acceptable.
 */
export const revokeInvitation = withServerAction(async function revokeInvitation(
  formData: FormData,
): Promise<ActionResult> {
  const raw = { invitationId: formData.get('invitationId') as string };

  const parsed = revokeInvitationSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: 'invalid_input' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('revoke_invitation', {
    p_invitation_id: parsed.data.invitationId,
  });

  if (error) {
    logger.warn(
      { action: 'team.revoke_invitation', code: error.code, message: error.message },
      'revoke_invitation failed',
    );
    return { error: mapLifecycleError(error.message) };
  }

  logger.info(
    { action: 'team.revoke_invitation.success', invitationId: parsed.data.invitationId },
    'Invitation revoked',
  );

  revalidatePath('/[locale]/dashboard/members', 'page');
  return { success: true };
});
