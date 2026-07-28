import { z } from 'zod';

export const COMPANY_SIZES = ['solo', '2-5', '6-20', '20+'] as const;

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'name_required').max(120, 'name_too_long'),
  email: z.string().trim().min(1, 'email_required').email('invalid_email_format'),
  companySize: z.enum(COMPANY_SIZES).optional(),
  message: z.string().trim().min(1, 'message_required').max(5000, 'message_too_long'),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
