'use client';

import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Notification } from '@/hooks/use-notifications';
import { useNotifications } from '@/hooks/use-notifications';

const TYPE_ICON: Record<
  Notification['type'],
  React.ComponentType<{ style?: React.CSSProperties }>
> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const TYPE_COLOR: Record<Notification['type'], string> = {
  info: 'var(--color-primary, #4f6ef7)',
  success: 'var(--color-success, #22c55e)',
  warning: 'var(--color-warning, #f59e0b)',
  error: 'var(--color-poppy, #ef4444)',
};

function NotificationItem({ notification }: { notification: Notification }) {
  const Icon = TYPE_ICON[notification.type];
  const color = TYPE_COLOR[notification.type];
  const isUnread = !notification.read_at;

  const inner = (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
      style={{ opacity: isUnread ? 1 : 0.65 }}>
      <Icon style={{ width: 16, height: 16, color, marginTop: 2, flexShrink: 0 }} />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13px]"
          style={{ fontWeight: isUnread ? 600 : 400, color: 'var(--text-primary)' }}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            {notification.body}
          </p>
        )}
      </div>
      {isUnread && (
        <span
          className="mt-1.5 size-2 shrink-0 rounded-full"
          style={{ background: 'var(--color-poppy)' }}
        />
      )}
    </div>
  );

  if (notification.link) {
    return <a href={notification.link}>{inner}</a>;
  }
  return inner;
}

type Props = {
  /** UUID del usuario autenticado, usado para suscribirse al canal Realtime personal. */
  userId: string;
};

/**
 * Campana de notificaciones con badge de no-leídas y dropdown con listado.
 * Se suscribe automáticamente al canal Realtime `user:{userId}:notifications`.
 */
export function NotificationBell({ userId }: Props) {
  const t = useTranslations('Notifications');
  const { notifications, unreadCount, markAllRead } = useNotifications(userId);

  async function handleOpenChange(open: boolean) {
    if (open && unreadCount > 0) {
      await markAllRead();
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t('title')}
          className="relative flex items-center justify-center rounded-[6px] transition-colors hover:bg-[var(--surface-2)]"
          style={{ width: 32, height: 32, background: 'transparent', border: 0 }}>
          <Bell
            style={{ width: 17, height: 17, color: 'var(--text-secondary)', strokeWidth: 1.5 }}
          />
          {unreadCount > 0 && (
            <span
              className="absolute rounded-full"
              style={{
                top: 6,
                right: 6,
                width: 6,
                height: 6,
                background: 'var(--color-poppy)',
                border: '2px solid var(--background)',
              }}
            />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="border-border shadow-lg"
        style={{ width: 320, borderRadius: 10, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: 'var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('title')}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-[11px] transition-opacity hover:opacity-70"
              style={{
                color: 'var(--text-tertiary)',
                background: 'none',
                border: 0,
                cursor: 'pointer',
              }}>
              {t('mark_all_read')}
            </button>
          )}
        </div>

        {/* Lista */}
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {notifications.length === 0 ?
            <p
              className="px-4 py-6 text-center text-[13px]"
              style={{ color: 'var(--text-tertiary)' }}>
              {t('empty')}
            </p>
          : notifications.map((n) => <NotificationItem key={n.id} notification={n} />)}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
