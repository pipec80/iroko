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
    .min(1, 'At least one email is required')
    .transform((raw) =>
      raw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().email('Invalid email format').max(254, 'Email too long'))
        .min(1, 'At least one valid email is required')
        .max(10, 'Maximum 10 emails per invitation'),
    ),
  role: z.enum(INVITABLE_ROLES),
});

/** Schema para eliminar un miembro del equipo. */
export const removeMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
