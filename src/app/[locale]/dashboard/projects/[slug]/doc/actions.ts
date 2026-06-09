'use server';

import { z } from 'zod';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { create } from '@/lib/project-documents';

const createDocumentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(120),
  description: z.string().max(300).optional(),
  projectId: z.string().uuid(),
});

type CreateDocumentResult = { error?: string; docId?: string };

export async function createDocument(formData: FormData): Promise<CreateDocumentResult> {
  const raw = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || undefined,
    projectId: formData.get('projectId') as string,
  };

  const parsed = createDocumentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'validation_error' };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) return { error: 'Sesión no válida. Recarga la página e intenta de nuevo.' };

  // Derive accountId server-side via SECURITY DEFINER RPC — never trust client input.
  const { data: accountId } = await supabase.rpc('get_my_account_id');
  if (!accountId) return { error: 'No se pudo determinar la cuenta. Recarga la página.' };

  try {
    const doc = await create({
      project_id: parsed.data.projectId,
      account_id: accountId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      created_by: userId,
    });

    logger.info(
      { action: 'documents.create.success', accountId, docId: doc.id },
      'Document created',
    );

    return { docId: doc.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'create_failed';
    logger.warn({ action: 'documents.create', accountId, message }, 'createDocument failed');
    return { error: 'No se pudo crear el documento. Intenta de nuevo.' };
  }
}
