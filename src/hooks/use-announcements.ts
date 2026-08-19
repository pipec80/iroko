'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';
import { logClient } from '@/lib/logger-client';

/** Anuncio global de plataforma tal como viene de la base de datos. */
export type Announcement = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
};

const MAX_ANNOUNCEMENTS = 50;
const LAST_SEEN_STORAGE_KEY = 'iroko:announcements:last_seen_at';

// El cursor de "visto" nunca cambia fuera de esta pestaña salvo por nuestro
// propio markAllSeen() (que usa el override local, no re-lee el storage), así
// que no hay nada externo a lo que suscribirse.
function subscribeNoop() {
  return () => {};
}

function lastSeenSnapshot(): string | null {
  return window.localStorage.getItem(LAST_SEEN_STORAGE_KEY);
}

// Coincide con lo que el servidor siempre asume (sin acceso a localStorage):
// leer el cursor real solo en cliente vía useSyncExternalStore evita el
// mismatch de hidratación que un useState(() => leer localStorage) produciría,
// y evita el setState síncrono dentro de un efecto (mismo patrón que el
// hallazgo de hidratación por document.cookie de la Fase C5 — ver memoria de
// sesión, no un archivo de docs/).
function lastSeenServerSnapshot(): string | null {
  return null;
}

/**
 * Suscribe al canal Realtime global `platform:announcements` y carga los
 * anuncios recientes de la plataforma. A diferencia de `useNotifications`,
 * no hay "leído" per-usuario en el schema (YAGNI) — el cursor de no-leído
 * vive en `localStorage`, no en la DB.
 *
 * @returns Estado de anuncios, contador de no-vistos y helper para marcarlos vistos.
 */
export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const storedLastSeenAt = useSyncExternalStore(
    subscribeNoop,
    lastSeenSnapshot,
    lastSeenServerSnapshot,
  );
  const [seenOverride, setSeenOverride] = useState<string | null>(null);
  const lastSeenAt = seenOverride ?? storedLastSeenAt;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, type, title, body, link, created_at')
        .order('created_at', { ascending: false })
        .limit(MAX_ANNOUNCEMENTS);

      if (error) {
        logClient.warn(
          { action: 'load_announcements', component: 'useAnnouncements' },
          error.message,
        );
        return;
      }
      if (!cancelled && data) {
        setAnnouncements(data as Announcement[]);
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (channelRef.current?.state === 'joined') return;

    const channel = supabase.channel('platform:announcements', {
      config: { private: true },
    });

    channelRef.current = channel;

    void supabase.realtime.setAuth().then(() => {
      channel
        .on(
          'broadcast',
          { event: 'announcement_created' },
          (message: { payload: Announcement }) => {
            setAnnouncements((prev) => [message.payload, ...prev].slice(0, MAX_ANNOUNCEMENTS));
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
  }, [supabase]);

  const unreadCount = announcements.filter(
    (a) => lastSeenAt === null || a.created_at > lastSeenAt,
  ).length;

  /** Marca todos los anuncios cargados como vistos, persistiendo el cursor en localStorage. */
  function markAllSeen(): void {
    if (announcements.length === 0) return;
    const newest = announcements[0]?.created_at;
    if (!newest) return;
    window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, newest);
    setSeenOverride(newest);
  }

  return { announcements, unreadCount, markAllSeen };
}
