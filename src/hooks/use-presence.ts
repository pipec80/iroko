'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

/**
 * Suscribe al canal Realtime Presence `account:{accountId}:presence` y
 * reporta el propio estado de conexión. Punto verde "en línea" en
 * dashboard/members — sin última vez visto, sin contador global (F3-3H-2).
 *
 * @param accountId - Cuenta activa
 * @param userId - Usuario autenticado, usado como key de presence
 */
export function usePresence(accountId: string, userId: string) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (channelRef.current?.state === 'joined') return;

    const channel = supabase.channel(`account:${accountId}:presence`, {
      config: { private: true, presence: { key: userId } },
    });

    channelRef.current = channel;

    void supabase.realtime.setAuth().then(() => {
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setOnlineUserIds(new Set(Object.keys(state)));
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            void channel.track({ userId });
          }
        });
    });

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [accountId, userId, supabase]);

  return { onlineUserIds };
}
