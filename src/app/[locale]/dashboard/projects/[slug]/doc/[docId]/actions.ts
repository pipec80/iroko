'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { appConfig } from '@/config/app.config';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { updateContentAtRevision } from '@/lib/project-documents';

export type SaveDocumentResult =
  | { success: true; revision: number }
  | {
      success: false;
      error:
        | 'module_disabled'
        | 'invalid_input'
        | 'not_authenticated'
        | 'conflict_or_unavailable'
        | 'save_failed';
    };

/** Only the expected persisted revision may be replaced; unavailable rows disclose no content. */
export const saveDocument = withServerAction(async function saveDocument(
  docId: string,
  content: string,
  expectedRevision: number,
): Promise<SaveDocumentResult> {
  if (!appConfig.features.projects) return { success: false, error: 'module_disabled' };
  if (
    !z.string().uuid().safeParse(docId).success ||
    typeof content !== 'string' ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    return { success: false, error: 'invalid_input' };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) return { success: false, error: 'not_authenticated' };
  try {
    const revision = await updateContentAtRevision(docId, content, expectedRevision);
    if (revision === null) return { success: false, error: 'conflict_or_unavailable' };
    revalidatePath('/', 'layout');
    return { success: true, revision };
  } catch {
    logger.warn({ action: 'documents.save', docId }, 'Document save failed');
    return { success: false, error: 'save_failed' };
  }
});
