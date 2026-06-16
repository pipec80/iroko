'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['⌘', 'K'], description: 'Enfocar búsqueda' },
  { keys: ['⌘', '/'], description: 'Ver atajos de teclado' },
  { keys: ['Esc'], description: 'Cerrar panel' },
];

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Atajos de teclado
          </DialogTitle>
          <DialogDescription className="sr-only">
            Lista de atajos de teclado disponibles en la aplicación.
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
          {SHORTCUTS.map((s) => (
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
