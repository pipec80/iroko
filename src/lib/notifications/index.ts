import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

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
};

/**
 * Crea una notificación in-app para el usuario indicado.
 *
 * Usa el cliente admin (service role) para bypassar RLS, ya que las
 * notificaciones se crean desde el servidor en nombre de otros usuarios.
 * El trigger `notifications_broadcast` emite el evento Realtime automáticamente.
 *
 * @param userId - UUID del usuario destinatario (`auth.users.id`)
 * @param payload - Contenido de la notificación
 * @throws si Supabase devuelve un error al insertar
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
}
