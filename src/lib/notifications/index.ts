import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { sendNotificationEmail } from '@/lib/email';

/** Tipo de notificación. Controla el color del ícono en el cliente. */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/** Payload para crear una notificación vía `notify()`. */
export type NotificationPayload = {
  /** Categoría visual de la notificación. */
  type: NotificationType;
  /** Texto breve mostrado en bold. Máximo ~80 caracteres. */
  title: string;
  /** Detalle adicional opcional. */
  body?: string;
  /** URL de navegación al hacer click. */
  link?: string;
  /**
   * Si `true`, además de la notificación in-app también se envía un email al usuario.
   * Fire-and-forget: un fallo en el envío no cancela la notificación in-app.
   */
  emailDelivery?: boolean;
};

/**
 * Crea una notificación in-app para el usuario indicado.
 * Opcionalmente también entrega la notificación por email.
 *
 * @param userId - UUID del usuario destinatario (`auth.users.id`)
 * @param payload - Contenido y opciones de entrega
 * @throws si Supabase devuelve un error al insertar la notificación in-app
 */
export async function notify(userId: string, payload: NotificationPayload): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link,
  });

  if (error) {
    logger.error({ userId, action: 'notify' }, error.message);
    throw error;
  }

  // Entrega por email — fire and forget.
  if (payload.emailDelivery) {
    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(userId);
        if (user?.email) {
          await sendNotificationEmail(user.email, {
            type: payload.type,
            title: payload.title,
            body: payload.body,
            link: payload.link,
          });
        }
      } catch (err: unknown) {
        logger.error(
          { userId, action: 'notification_email' },
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
    })();
  }
}
