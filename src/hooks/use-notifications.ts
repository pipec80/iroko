'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';
import type { NotificationType } from '@/lib/notifications';
import { logClient } from '@/lib/logger-client';

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
  const [owned, setOwned] = useState<{ userId: string; items: Notification[] }>({
    userId,
    items: [],
  });
  const notifications = owned.userId === userId ? owned.items : [];
  const ownerRef = useRef(userId);
  useEffect(() => {
    ownerRef.current = userId;
  }, [userId]);
  function setNotifications(
    update: Notification[] | ((previous: Notification[]) => Notification[]),
  ) {
    if (ownerRef.current !== userId) return;
    setOwned((previous) => ({
      userId,
      items:
        typeof update === 'function' ?
          update(previous.userId === userId ? previous.items : [])
        : update,
    }));
  }
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
        logClient.warn(
          { action: 'load_notifications', component: 'useNotifications' },
          error.message,
        );
        return;
      }
      if (!cancelled && data) {
        setOwned({ userId, items: data as Notification[] });
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [userId, supabase]);

  useEffect(() => {
    let active = true;
    const channel = supabase.channel(`user:${userId}:notifications`, {
      config: { private: true },
    });

    channelRef.current = channel;

    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!active || ownerRef.current !== userId) return;
        channel
          .on(
            'broadcast',
            { event: 'notification_created' },
            (message: { payload: Notification }) => {
              if (!active || ownerRef.current !== userId) return;
              setOwned((previous) => ({
                userId,
                items: [
                  message.payload,
                  ...(previous.userId === userId ? previous.items : []),
                ].slice(0, MAX_NOTIFICATIONS),
              }));
            },
          )
          .subscribe();
      })
      .catch(() => {
        if (active)
          logClient.warn(
            { action: 'realtime_auth', component: 'useNotifications' },
            'Realtime authentication failed',
          );
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [userId, supabase]);

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
