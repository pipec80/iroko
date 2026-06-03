import { z } from 'zod';

export const PROJECT_TONES = ['iron', 'gold', 'indigo'] as const;
export type ProjectTone = (typeof PROJECT_TONES)[number];

export const TONE_TO_COLOR: Record<ProjectTone, string> = {
  iron: 'var(--color-iron)',
  gold: 'var(--color-gold)',
  indigo: 'var(--color-indigo)',
};

export const PROJECT_TYPES = ['docs', 'automation', 'agent'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const createProjectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(80, 'Máximo 80 caracteres'),
  description: z.string().max(300, 'Máximo 300 caracteres').optional(),
  tone: z.enum(PROJECT_TONES).default('iron'),
  type: z.enum(PROJECT_TYPES).default('docs'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
