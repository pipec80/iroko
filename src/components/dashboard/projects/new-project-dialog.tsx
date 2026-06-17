'use client';

import { useActionState, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { appConfig } from '@/config/app.config';

type ProjectType = 'docs' | 'automation' | 'agent';

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
  const t = useTranslations('Projects');
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<ProjectTone>('iron');
  const [projectType, setProjectType] = useState<ProjectType>('docs');
  const formRef = useRef<HTMLFormElement>(null);

  const projectTypes: {
    value: ProjectType;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: 'docs',
      label: t('form_type_docs_label'),
      description: t('form_type_docs_desc'),
      icon: <FileText size={15} strokeWidth={1.5} />,
    },
    {
      value: 'automation',
      label: t('form_type_automation_label'),
      description: t('form_type_automation_desc'),
      icon: <Zap size={15} strokeWidth={1.5} />,
    },
    {
      value: 'agent',
      label: t('form_type_agent_label'),
      description: t('form_type_agent_desc'),
      icon: <Bot size={15} strokeWidth={1.5} />,
    },
  ];

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
          {t('new_project_btn')}
        </span>
      </button>
    : <button type="button" className="btn btn-iron" style={{ padding: '10px 18px', fontSize: 13 }}>
        <Plus size={14} strokeWidth={1.5} />
        {t('new_project_btn')}
      </button>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog_title')}</DialogTitle>
          <DialogDescription>{t('dialog_desc', { brand: appConfig.brand })}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={action} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="project-name" className="text-on-surface text-sm font-semibold">
              {t('form_name_label')}
            </label>
            <input
              id="project-name"
              name="name"
              type="text"
              required
              maxLength={80}
              placeholder={t('form_name_placeholder')}
              className="bg-surface-container-low border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="project-desc" className="text-on-surface text-sm font-semibold">
              {t('form_desc_label')}{' '}
              <span className="text-on-surface-variant font-normal opacity-60">
                {t('form_desc_optional')}
              </span>
            </label>
            <textarea
              id="project-desc"
              name="description"
              rows={2}
              maxLength={300}
              placeholder={t('form_desc_placeholder')}
              className="bg-surface-container-low border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none"
            />
          </div>

          {/* Project type */}
          <div className="space-y-2">
            <span className="text-on-surface text-sm font-semibold">{t('form_type_label')}</span>
            <div className="grid grid-cols-3 gap-2">
              {projectTypes.map((pt) => {
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
            <span className="text-on-surface text-sm font-semibold">{t('form_color_label')}</span>
            <div className="flex gap-3">
              {PROJECT_TONES.map((toneName) => (
                <button
                  key={toneName}
                  type="button"
                  onClick={() => setTone(toneName)}
                  title={TONE_LABELS[toneName]}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                  style={{
                    background: tone === toneName ? TONE_TO_COLOR[toneName] : 'var(--surface-2)',
                    color: tone === toneName ? '#fff' : 'var(--text-secondary)',
                    border: tone === toneName ? '0' : '1px solid var(--border)',
                  }}>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: TONE_TO_COLOR[toneName] }}
                  />
                  {TONE_LABELS[toneName]}
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
              {t('btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50">
              {isPending ? t('btn_creating') : t('btn_create')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
