'use client';

import { useActionState, useRef, useState } from 'react';
import { FileText, Zap, Bot, Plus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createProject } from '@/app/[locale]/dashboard/projects/actions';
import { PROJECT_TONES, TONE_TO_COLOR } from '@/lib/validation/projects';
import type { ProjectTone } from '@/lib/validation/projects';

type ProjectType = 'docs' | 'automation' | 'agent';

const PROJECT_TYPES: {
  value: ProjectType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'docs',
    label: 'Documentación',
    description: 'Wiki, notas y contexto del proyecto',
    icon: <FileText size={15} strokeWidth={1.5} />,
  },
  {
    value: 'automation',
    label: 'Automatización',
    description: 'Rutinas programadas y workflows',
    icon: <Zap size={15} strokeWidth={1.5} />,
  },
  {
    value: 'agent',
    label: 'Agente',
    description: 'Bot con memoria y contexto propio',
    icon: <Bot size={15} strokeWidth={1.5} />,
  },
];

const TONE_LABELS: Record<ProjectTone, string> = {
  iron: 'Iron',
  gold: 'Gold',
  indigo: 'Indigo',
};

interface NewProjectDialogProps {
  /** Render as card CTA (dashed card style) instead of header button */
  variant?: 'card';
}

export function NewProjectDialog({ variant }: NewProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<ProjectTone>('iron');
  const [projectType, setProjectType] = useState<ProjectType>('docs');
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) => {
      formData.set('tone', tone);
      formData.set('type', projectType);
      const result = await createProject(formData);
      if (result.success) {
        formRef.current?.reset();
        setTone('iron');
        setProjectType('docs');
        setOpen(false);
      }
      return result;
    },
    {},
  );

  const trigger =
    variant === 'card' ?
      <button
        type="button"
        className="border-border group flex w-full flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed py-12 transition-colors hover:border-transparent"
        style={{ background: 'var(--surface-elevated)' }}>
        <div
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md"
          style={{ background: 'rgba(217,33,33,0.10)' }}>
          <Plus size={14} style={{ color: 'var(--color-iron)' }} strokeWidth={1.5} />
        </div>
        <span className="text-muted-foreground group-hover:text-foreground text-[13px] font-medium transition-colors">
          Nuevo proyecto
        </span>
      </button>
    : <button type="button" className="btn btn-iron" style={{ padding: '10px 18px', fontSize: 13 }}>
        <Plus size={14} strokeWidth={1.5} />
        Nuevo proyecto
      </button>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>
            Cada proyecto es una rama que crece del mismo tronco Iroko.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={action} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <label htmlFor="project-name" className="text-on-surface text-sm font-semibold">
              Nombre
            </label>
            <input
              id="project-name"
              name="name"
              type="text"
              required
              maxLength={80}
              placeholder="ej. ace-jewelry, maker-lab-cl"
              className="bg-surface-container-low border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label htmlFor="project-desc" className="text-on-surface text-sm font-semibold">
              Descripción{' '}
              <span className="text-on-surface-variant font-normal opacity-60">(opcional)</span>
            </label>
            <textarea
              id="project-desc"
              name="description"
              rows={2}
              maxLength={300}
              placeholder="ej. Checkout v2 + analytics realtime"
              className="bg-surface-container-low border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
          </div>

          {/* Tipo de proyecto */}
          <div className="space-y-2">
            <span className="text-on-surface text-sm font-semibold">Tipo</span>
            <div className="grid grid-cols-3 gap-2">
              {PROJECT_TYPES.map((pt) => {
                const isSelected = projectType === pt.value;
                return (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setProjectType(pt.value)}
                    className="flex flex-col items-start gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-all"
                    style={{
                      background: isSelected ? 'var(--surface-3)' : 'var(--surface-2)',
                      borderColor: isSelected ? 'var(--color-iron)' : 'var(--border)',
                    }}>
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md"
                      style={{
                        background: isSelected ? TONE_TO_COLOR[tone] : 'var(--surface-3)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                      }}>
                      {pt.icon}
                    </span>
                    <span
                      className="text-[11px] leading-tight font-semibold"
                      style={{
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}>
                      {pt.label}
                    </span>
                    <span
                      className="text-[10px] leading-tight"
                      style={{ color: 'var(--text-tertiary)' }}>
                      {pt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color / Tone */}
          <div className="space-y-2">
            <span className="text-on-surface text-sm font-semibold">Color</span>
            <div className="flex gap-3">
              {PROJECT_TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  title={TONE_LABELS[t]}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                  style={{
                    background: tone === t ? TONE_TO_COLOR[t] : 'var(--surface-2)',
                    color: tone === t ? '#fff' : 'var(--text-secondary)',
                    border: tone === t ? '0' : '1px solid var(--border)',
                  }}>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: TONE_TO_COLOR[t] }}
                  />
                  {TONE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {state.error && (
            <p className="bg-error/10 text-error rounded-lg px-3 py-2 text-xs font-medium">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-outline-variant/30 text-on-surface hover:bg-surface-container-high rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50">
              {isPending ? 'Creando…' : 'Crear proyecto'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
