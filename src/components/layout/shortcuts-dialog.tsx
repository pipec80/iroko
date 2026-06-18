'use client';

import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function KbdBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono"
      style={{
        fontSize: 11,
        color: 'var(--text-tertiary)',
        background: 'var(--surface-2)',
        padding: '2px 7px',
        borderRadius: 4,
        border: '1px solid var(--border)',
        lineHeight: '20px',
        display: 'inline-block',
      }}>
      {children}
    </span>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: Props) {
  const t = useTranslations('Shortcuts');

  const shortcuts = [
    { keys: ['⌘', 'K'], description: t('shortcut_search') },
    { keys: ['⌘', '/'], description: t('shortcut_shortcuts') },
    { keys: ['Esc'], description: t('shortcut_close') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('dialog_title')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('dialog_desc')}</DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
          {shortcuts.map((s) => (
            <div
              key={s.description}
              className="flex items-center justify-between rounded"
              style={{ padding: '7px 4px' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.description}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {s.keys.map((k) => (
                  <KbdBadge key={k}>{k}</KbdBadge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
