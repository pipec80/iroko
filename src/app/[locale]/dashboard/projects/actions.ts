'use server';

import { revalidatePath } from 'next/cache';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { create } from '@/lib/projects';
import { createProjectSchema, TONE_TO_COLOR } from '@/lib/validation/projects';

type ActionResult = { error?: string; success?: boolean };

type AccountContext = { accountId: string; userId: string };

async function getAccountContext(): Promise<AccountContext | null> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) return null;

  // Direct SELECT on accounts_memberships is revoked for authenticated — use
  // the get_my_account_id() SECURITY DEFINER RPC instead.
  const { data: accountId } = await supabase.rpc('get_my_account_id');
  if (!accountId) return null;

  return { accountId, userId };
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const raw = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || undefined,
    tone: formData.get('tone') as string,
    type: formData.get('type') as string,
  };

  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'validation_error' };
  }

  const ctx = await getAccountContext();
  if (!ctx) return { error: 'Sesión no válida. Recarga la página e intenta de nuevo.' };

  try {
    await create({
      account_id: ctx.accountId,
      name: parsed.data.name,
      slug: toSlug(parsed.data.name),
      description: parsed.data.description ?? null,
      color: TONE_TO_COLOR[parsed.data.tone],
      type: parsed.data.type,
      created_by: ctx.userId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'create_failed';
    logger.warn(
      { action: 'projects.create', accountId: ctx.accountId, message },
      'createProject failed',
    );

    if (message.includes('unique') || message.includes('duplicate')) {
      return { error: 'Ya existe un proyecto con ese nombre. Elige uno diferente.' };
    }
    return { error: 'No se pudo crear el proyecto. Intenta de nuevo.' };
  }

  logger.info(
    { action: 'projects.create.success', accountId: ctx.accountId, name: parsed.data.name },
    'Project created',
  );

  revalidatePath('/es/dashboard/projects');
  revalidatePath('/en/dashboard/projects');
  return { success: true };
}
