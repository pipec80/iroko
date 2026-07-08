import { z } from 'zod';

export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  expiresAt: z.iso
    .datetime()
    .optional()
    .refine((value) => value === undefined || new Date(value).getTime() > Date.now(), {
      message: 'expiry_in_past',
    }),
});

export type ApiKeyCreateInput = z.input<typeof apiKeyCreateSchema>;
