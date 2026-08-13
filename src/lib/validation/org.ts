import { z } from 'zod';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Schema de validación para "Información de la organización" en org/settings. */
export const updateOrgInfoSchema = z.object({
  name: z.string().trim().min(1, 'name_required').max(100, 'name_too_long'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'slug_required')
    .max(60, 'slug_too_long')
    .regex(SLUG_PATTERN, 'slug_invalid_format'),
  website: z
    .string()
    .trim()
    .max(300, 'website_too_long')
    .refine((v) => v === '' || z.url().safeParse(v).success, 'website_invalid'),
  country: z.string().trim().max(100, 'country_too_long'),
});

export type UpdateOrgInfoInput = z.infer<typeof updateOrgInfoSchema>;
