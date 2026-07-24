'use client';

import type { Announcement } from '@/hooks/use-announcements';
import { useAnnouncements } from '@/hooks/use-announcements';
import type { Notification } from '@/hooks/use-notifications';
import { useNotifications } from '@/hooks/use-notifications';

/** Ítem unificado de la campana: notificación personal o anuncio de plataforma. */
export type InboxItem =
  { kind: 'notification'; data: Notification } | { kind: 'announcement'; data: Announcement };

/**
 * Combina `useNotifications` (per-usuario) y `useAnnouncements` (global) en
 * un único feed ordenado por fecha, para que `NotificationBell` hable con
 * un solo hook (LoD) en vez de suscribirse a dos canales Realtime distintos.
 *
 * @param userId - UUID del usuario autenticado (`auth.users.id`)
 */
export function useInboxItems(userId: string) {
  const notifications = useNotifications(userId);
  const announcements = useAnnouncements();

  const items: InboxItem[] = [
    ...notifications.notifications.map((data): InboxItem => ({ kind: 'notification', data })),
    ...announcements.announcements.map((data): InboxItem => ({ kind: 'announcement', data })),
  ].sort((a, b) => b.data.created_at.localeCompare(a.data.created_at));

  const unreadCount = notifications.unreadCount + announcements.unreadCount;

  /** Marca todas las notificaciones y todos los anuncios como leídos/vistos. */
  async function markAllRead(): Promise<void> {
    await notifications.markAllRead();
    announcements.markAllSeen();
  }

  return { items, unreadCount, markAllRead };
}
