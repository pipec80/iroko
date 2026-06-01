'use server';

import { randomUUID } from 'crypto';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export type DocumentActionState = {
  error?: string;
  path?: string;
};

/** TTL de la URL firmada en segundos. 15 min es suficiente para abrir/descargar. */
const SIGNED_URL_TTL = 900;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MiB

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

async function requireContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;
  const accountId = (data?.claims.app_metadata?.account_id as string | undefined) ?? null;
  return { supabase, userId, accountId };
}

/** Sube un archivo al bucket documents. Devuelve el path guardado en DB. */
export async function uploadDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'no_file' };
  if (!ALLOWED_TYPES.has(file.type)) return { error: 'invalid_type' };
  if (file.size > MAX_FILE_SIZE) return { error: 'file_too_large' };

  const { supabase, userId, accountId } = await requireContext();
  if (!userId || !accountId) return { error: 'not_authenticated' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${accountId}/${userId}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(path, file, { cacheControl: 'no-store', contentType: file.type });

  if (error) {
    logger.warn(
      { userId, accountId, action: 'documents.upload', code: error.message },
      'Upload failed',
    );
    return { error: 'upload_failed' };
  }

  logger.info({ userId, accountId, action: 'documents.upload', path }, 'Document uploaded');
  return { path };
}

/**
 * Genera una URL firmada para un path del bucket documents.
 * Expira en 15 minutos — regenerar antes de mostrar al usuario.
 * Llamar solo desde Server Components o Server Actions.
 */
export async function getDocumentSignedUrl(path: string): Promise<string | null> {
  const { supabase, userId, accountId } = await requireContext();
  if (!userId || !accountId) return null;

  // Defensa en profundidad: el RLS ya lo bloquea, pero validamos antes del round-trip.
  if (!path.startsWith(`${accountId}/`)) {
    logger.warn({ userId, accountId, action: 'documents.signedUrl', path }, 'Forbidden path');
    return null;
  }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (error) {
    logger.warn({ userId, accountId, action: 'documents.signedUrl', path }, 'Signed URL failed');
    return null;
  }

  return data.signedUrl;
}

/** Elimina un archivo del bucket documents. */
export async function deleteDocumentAction(path: string): Promise<DocumentActionState> {
  const { supabase, userId, accountId } = await requireContext();
  if (!userId || !accountId) return { error: 'not_authenticated' };

  if (!path.startsWith(`${accountId}/`)) return { error: 'forbidden' };

  const { error } = await supabase.storage.from('documents').remove([path]);

  if (error) {
    logger.warn({ userId, accountId, action: 'documents.delete', path }, 'Delete failed');
    return { error: 'delete_failed' };
  }

  logger.info({ userId, accountId, action: 'documents.delete', path }, 'Document deleted');
  return {};
}
