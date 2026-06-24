'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';
import type { NotificationType } from '@/lib/notifications';

/** Notificación in-app tal como viene de la base de datos. */
export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const MAX_NOTIFICATIONS = 50;

/**
 * Suscribe al canal Realtime `user:{userId}:notifications` y carga las
 * notificaciones recientes del usuario.
 *
 * @param userId - UUID del usuario autenticado (`auth.users.id`)
 * @returns Estado de notificaciones, contador de no-leídas y helpers para marcarlas.
 */
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, link, read_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);

      if (error) {
        console.warn('[useNotifications] load failed:', error.message);
        return;
      }
      if (!cancelled && data) {
        setNotifications(data as Notification[]);
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (channelRef.current?.state === 'joined') return;

    const channel = supabase.channel(`user:${userId}:notifications`, {
      config: { private: true },
    });

    channelRef.current = channel;

    void supabase.realtime.setAuth().then(() => {
      channel
        .on(
          'broadcast',
          { event: 'notification_created' },
          (message: { payload: Notification }) => {
            setNotifications((prev) => [message.payload, ...prev].slice(0, MAX_NOTIFICATIONS));
          },
        )
        .subscribe();
    });

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  /**
   * Marca las notificaciones con los IDs dados como leídas.
   * Actualiza el estado local optimísticamente y luego confirma con la RPC.
   *
   * @param ids - Array de UUIDs de notificaciones a marcar
   */
  async function markAsRead(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
    if (error) throw error;
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)),
    );
  }

  /** Marca todas las notificaciones no leídas como leídas. */
  async function markAllRead(): Promise<void> {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    await markAsRead(unreadIds);
  }

  return { notifications, unreadCount, markAsRead, markAllRead };
}
