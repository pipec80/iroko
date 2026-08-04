'use server';

import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { sendNotificationEmail } from '@/lib/email';
import { appConfig } from '@/config/app.config';
import { contactFormSchema } from '@/lib/validation/contact';

type ContactFormResult = { error?: string; success?: boolean };

export const submitContactForm = withServerAction(async function submitContactForm(
  _prev: ContactFormResult,
  formData: FormData,
): Promise<ContactFormResult> {
  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    companySize: (formData.get('company_size') as string) || undefined,
    message: formData.get('message') as string,
  };

  const parsed = contactFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'validation_error' };
  }

  try {
    await sendNotificationEmail(appConfig.supportEmail, {
      type: 'info',
      title: `Nuevo mensaje de contacto de ${parsed.data.name}`,
      body: [
        `Email: ${parsed.data.email}`,
        parsed.data.companySize ? `Tamaño de empresa: ${parsed.data.companySize}` : null,
        '',
        parsed.data.message,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'send_failed';
    logger.warn({ action: 'contact.submit', message }, 'submitContactForm failed');
    return { error: 'send_failed' };
  }

  logger.info({ action: 'contact.submit.success' }, 'Contact form submitted');
  return { success: true };
});
