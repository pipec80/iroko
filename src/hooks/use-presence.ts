'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';
import { logClient } from '@/lib/logger-client';

/**
 * Suscribe al canal Realtime Presence `account:{accountId}:presence` y
 * reporta el propio estado de conexión. Punto verde "en línea" en
 * dashboard/members — sin última vez visto, sin contador global (F3-3H-2).
 *
 * @param accountId - Cuenta activa
 * @param userId - Usuario autenticado, usado como key de presence
 */
export function usePresence(accountId: string, userId: string) {
  const [presence, setPresence] = useState({ accountId, userId, ids: new Set<string>() });
  const onlineUserIds =
    presence.accountId === accountId && presence.userId === userId ?
      presence.ids
    : new Set<string>();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    const channel = supabase.channel(`account:${accountId}:presence`, {
      config: { private: true, presence: { key: userId } },
    });

    channelRef.current = channel;

    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!active) return;
        channel
          .on('presence', { event: 'sync' }, () => {
            if (!active) return;
            const state = channel.presenceState();
            setPresence({ accountId, userId, ids: new Set(Object.keys(state)) });
          })
          .subscribe((status: string) => {
            if (active && status === 'SUBSCRIBED') {
              void channel.track({ userId });
            }
          });
      })
      .catch(() => {
        if (active)
          logClient.warn(
            { action: 'realtime_auth', component: 'usePresence' },
            'Realtime authentication failed',
          );
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [accountId, userId, supabase]);

  return { onlineUserIds };
}
