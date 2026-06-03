'use server';

import { revalidatePath } from 'next/cache';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { update } from '@/lib/project-documents';

export async function saveDocument(
  docId: string,
  content: string,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) return { error: 'not_authenticated' };

  try {
    await update(docId, { content });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'save_failed';
    logger.warn({ action: 'documents.save', docId, message }, 'saveDocument failed');
    return { error: 'No se pudo guardar el documento.' };
  }

  logger.info({ action: 'documents.save.success', docId }, 'Document saved');
  revalidatePath('/', 'layout');
  return { success: true };
}
