'use client';

import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle, Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InboxItem } from '@/hooks/use-inbox-items';
import { useInboxItems } from '@/hooks/use-inbox-items';
import { logClient } from '@/lib/logger-client';

type ItemType = InboxItem['data']['type'];

const TYPE_ICON: Record<ItemType, React.ComponentType<{ style?: React.CSSProperties }>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const TYPE_COLOR: Record<ItemType, string> = {
  info: 'var(--color-primary, #4f6ef7)',
  success: 'var(--color-success, #22c55e)',
  warning: 'var(--color-warning, #f59e0b)',
  error: 'var(--color-poppy, #ef4444)',
};

function InboxRow({ item }: { item: InboxItem }) {
  const t = useTranslations('Notifications');
  const isAnnouncement = item.kind === 'announcement';
  const Icon = isAnnouncement ? Megaphone : TYPE_ICON[item.data.type];
  const color = TYPE_COLOR[item.data.type];
  const isUnread = item.kind === 'notification' ? !item.data.read_at : true;

  const inner = (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-(--surface-2)"
      style={{ opacity: isUnread ? 1 : 0.65 }}>
      <Icon style={{ width: 16, height: 16, color, marginTop: 2, flexShrink: 0 }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className="truncate text-[13px]"
            style={{ fontWeight: isUnread ? 600 : 400, color: 'var(--text-primary)' }}>
            {item.data.title}
          </p>
          {isAnnouncement && (
            <span
              className="rounded-pill shrink-0 px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
              {t('announcement_badge')}
            </span>
          )}
        </div>
        {item.data.body && (
          <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            {item.data.body}
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

  if (item.data.link) {
    return <a href={item.data.link}>{inner}</a>;
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
  const { items, unreadCount, markAllRead } = useInboxItems(userId);

  const handleOpenChange = async (open: boolean) => {
    if (open && unreadCount > 0) {
      try {
        await markAllRead();
      } catch (err) {
        logClient.error(
          { action: 'mark_all_read', component: 'NotificationBell' },
          'mark_all_read failed',
          err,
        );
      }
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t('title')}
          className="focus-visible:ring-primary/30 relative flex items-center justify-center rounded-md transition-colors hover:bg-(--surface-2) focus-visible:ring-2 focus-visible:outline-none"
          style={{ width: 40, height: 40, background: 'transparent', border: 0 }}>
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
              onClick={() => {
                markAllRead().catch((err: unknown) => {
                  logClient.error(
                    { action: 'mark_all_read', component: 'NotificationBell' },
                    'mark_all_read failed',
                    err,
                  );
                });
              }}
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
          {items.length === 0 ?
            <p
              className="px-4 py-6 text-center text-[13px]"
              style={{ color: 'var(--text-tertiary)' }}>
              {t('empty')}
            </p>
          : items.map((item) => <InboxRow key={`${item.kind}:${item.data.id}`} item={item} />)}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
