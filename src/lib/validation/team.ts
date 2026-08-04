import { z } from 'zod';

/** Roles disponibles para invitaciones (owner excluido intencionalmente). */
export const INVITABLE_ROLES = ['admin', 'member', 'viewer'] as const;

/**
 * Schema de validación para invitar miembros al equipo.
 * Parsea un string de emails separados por coma y valida cada uno estrictamente.
 */
export const inviteSchema = z.object({
  emails: z
    .string()
    .min(1, 'emails_required')
    .transform((raw) =>
      raw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().email('invalid_email_format').max(254, 'email_too_long'))
        .min(1, 'emails_required')
        .max(10, 'max_10_emails'),
    ),
  role: z.enum(INVITABLE_ROLES),
});

/** Schema para eliminar un miembro del equipo. */
export const removeMemberSchema = z.object({
  userId: z.string().uuid('invalid_user_id'),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
