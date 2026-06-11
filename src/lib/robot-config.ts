'use server';

import { randomUUID } from 'crypto';
import * as xlsx from 'xlsx';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type RobotRoutineInsert = Database['public']['Tables']['robot_routines']['Insert'];
type RobotContactInsert = Database['public']['Tables']['robot_contacts']['Insert'];
type RobotMemoryInsert = Database['public']['Tables']['robot_memories']['Insert'];

export type RobotConfigUploadState = {
  error?: string;
  success?: boolean;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MiB para Excel estricto
const ALLOWED_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function requireContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;
  const accountId = (data?.claims.app_metadata?.account_id as string | undefined) ?? null;
  return { supabase, userId, accountId };
}

function parseExcelTime(value: unknown): string {
  if (typeof value === 'number') {
    // Si es mayor a 1, es una fecha+hora. Tomamos solo la fracción (hora).
    const fraction = value % 1;
    let totalSeconds = Math.round(fraction * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    // Si ya viene como texto (ej. "10:00"), lo devolvemos limpio
    return value.trim();
  }
  return '00:00:00';
}

/**
 * Procesa la subida del Excel de Iroko:
 * 1. Validación de seguridad (OWASP)
 * 2. Guarda el original en Storage (Backup/Auditoría)
 * 3. Parsea el Excel de forma segura (ignora macros/formulas)
 * 4. Inserta los datos estructurados en Postgres.
 */
export async function uploadRobotConfigAction(
  _prev: RobotConfigUploadState,
  formData: FormData,
): Promise<RobotConfigUploadState> {
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) return { error: 'no_file' };

  // OWASP: Verificación estricta de MIME y extensión
  if (file.type !== ALLOWED_MIME) return { error: 'invalid_type' };
  if (!file.name.toLowerCase().endsWith('.xlsx')) return { error: 'invalid_extension' };
  if (file.size > MAX_FILE_SIZE) return { error: 'file_too_large' };

  const { supabase, userId, accountId } = await requireContext();
  if (!userId || !accountId) return { error: 'not_authenticated' };

  try {
    // 1. Guardar original en Storage con nombre seguro
    const path = `${accountId}/${randomUUID()}.xlsx`;
    const { error: uploadError } = await supabase.storage
      .from('robot_configs')
      .upload(path, file, { cacheControl: 'no-store', contentType: file.type });

    if (uploadError) {
      logger.error({ userId, accountId, error: uploadError.message }, 'Config upload failed');
      return { error: 'upload_failed' };
    }

    // 2. Parsear el Excel de forma segura
    const buffer = await file.arrayBuffer();
    // cellText = true, cellFormula = false evitan ejecución de macros o inyecciones
    const workbook = xlsx.read(buffer, { type: 'buffer', cellFormula: false, cellText: true });

    const requiredSheets = ['Rutinas', 'Contactos', 'Memoria'];
    const missingSheets = requiredSheets.filter((sheet) => !workbook.SheetNames.includes(sheet));

    if (missingSheets.length > 0) {
      return { error: `missing_sheets: ${missingSheets.join(', ')}` };
    }

    // 3. Extraer Datos
    const routinesSheet = xlsx.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets['Rutinas'],
    );
    const contactsSheet = xlsx.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets['Contactos'],
    );
    const memoriesSheet = xlsx.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets['Memoria'],
    );

    // Mapeo a las tablas
    const routines: RobotRoutineInsert[] = routinesSheet.map((r) => ({
      account_id: accountId,
      time: parseExcelTime(r['Hora']),
      activity_type: (r['Tipo'] as string) || 'General',
      description: (r['Descripcion'] as string) || '',
      message: (r['Mensaje'] as string) || '',
    }));

    const contacts: RobotContactInsert[] = contactsSheet.map((c) => ({
      account_id: accountId,
      name: (c['Nombre'] as string) || 'Desconocido',
      relationship: (c['Relacion'] as string) || '',
      phone: String(c['Telefono'] || ''),
      priority: Number(c['Prioridad']) || 1,
    }));

    const memories: RobotMemoryInsert[] = memoriesSheet.map((m) => ({
      account_id: accountId,
      entity: (m['Entidad'] as string) || 'General',
      name: (m['Nombre'] as string) || '',
      key_fact: (m['Dato'] as string) || '',
    }));

    // 4. Sincronización Transaccional (Reemplazo Total - YAGNI)
    // Borramos lo viejo
    await supabase.from('robot_routines').delete().eq('account_id', accountId);
    await supabase.from('robot_contacts').delete().eq('account_id', accountId);
    await supabase.from('robot_memories').delete().eq('account_id', accountId);

    // Insertamos lo nuevo
    if (routines.length > 0) {
      const { error: rErr } = await supabase.from('robot_routines').insert(routines);
      if (rErr) throw rErr;
    }

    if (contacts.length > 0) {
      const { error: cErr } = await supabase.from('robot_contacts').insert(contacts);
      if (cErr) throw cErr;
    }

    if (memories.length > 0) {
      const { error: mErr } = await supabase.from('robot_memories').insert(memories);
      if (mErr) throw mErr;
    }

    logger.info({ userId, accountId, action: 'robot.config_uploaded' }, 'Robot config applied');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(
      { userId, accountId, error: error.message },
      'Error parsing/inserting robot config',
    );
    return { error: 'processing_failed' };
  }
}

export async function getDownloadUrl(path: string): Promise<{ url?: string; error?: string }> {
  const { supabase, userId, accountId } = await requireContext();
  if (!userId || !accountId) return { error: 'not_authenticated' };

  // path ya viene como `accountId/uuid.xlsx`
  if (!path.startsWith(`${accountId}/`)) return { error: 'unauthorized' };

  const { data, error } = await supabase.storage.from('robot_configs').createSignedUrl(path, 60);

  if (error) {
    logger.error({ userId, accountId, error: error.message }, 'Error generating signed url');
    return { error: 'failed_to_generate_url' };
  }

  return { url: data.signedUrl };
}
