'use server';

import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import ExcelJS from 'exceljs';

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

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function requireContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;
  const accountId = (data?.claims.app_metadata?.account_id as string | undefined) ?? null;
  return { supabase, userId, accountId };
}

function parseExcelTime(value: unknown): string {
  // ExcelJS returns time-formatted cells as Date objects
  if (value instanceof Date) {
    const h = String(value.getUTCHours()).padStart(2, '0');
    const m = String(value.getUTCMinutes()).padStart(2, '0');
    const s = String(value.getUTCSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  if (typeof value === 'number') {
    const fraction = value % 1;
    let totalSeconds = Math.round(fraction * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  if (typeof value === 'string') return value.trim();
  return '00:00:00';
}

function wsToJson(ws: ExcelJS.Worksheet): Record<string, unknown>[] {
  const headers: string[] = [];
  const rows: Record<string, unknown>[] = [];

  ws.eachRow((row, rowIndex) => {
    if (rowIndex === 1) {
      row.eachCell((cell) => headers.push(String(cell.value ?? '')));
    } else {
      const obj: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colIndex) => {
        const h = headers[colIndex - 1];
        if (h) obj[h] = cell.value;
      });
      if (Object.keys(obj).length > 0) rows.push(obj);
    }
  });

  return rows;
}

/**
 * Procesa la subida del Excel de Iroko:
 * 1. Validación de seguridad (OWASP)
 * 2. Guarda el original en Storage (Backup/Auditoría)
 * 3. Parsea el Excel de forma segura
 * 4. Inserta los datos estructurados en Postgres.
 */
export async function uploadRobotConfigAction(
  _prev: RobotConfigUploadState,
  formData: FormData,
): Promise<RobotConfigUploadState> {
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) return { error: 'no_file' };

  if (file.type !== ALLOWED_MIME) return { error: 'invalid_type' };
  if (!file.name.toLowerCase().endsWith('.xlsx')) return { error: 'invalid_extension' };
  if (file.size > MAX_FILE_SIZE) return { error: 'file_too_large' };

  const { supabase, userId, accountId } = await requireContext();
  if (!userId || !accountId) return { error: 'not_authenticated' };

  try {
    const path = `${accountId}/${randomUUID()}.xlsx`;
    const { error: uploadError } = await supabase.storage
      .from('robot_configs')
      .upload(path, file, { cacheControl: 'no-store', contentType: file.type });

    if (uploadError) {
      logger.error({ userId, accountId, error: uploadError.message }, 'Config upload failed');
      return { error: 'upload_failed' };
    }

    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(Buffer.from(await file.arrayBuffer()));
    await workbook.xlsx.read(stream);

    const requiredSheets = ['Rutinas', 'Contactos', 'Memoria'];
    const sheetNames = workbook.worksheets.map((ws) => ws.name);
    const missingSheets = requiredSheets.filter((name) => !sheetNames.includes(name));

    if (missingSheets.length > 0) {
      return { error: `missing_sheets: ${missingSheets.join(', ')}` };
    }

    const rutinasWs = workbook.getWorksheet('Rutinas');
    const contactosWs = workbook.getWorksheet('Contactos');
    const memoriaWs = workbook.getWorksheet('Memoria');

    if (!rutinasWs || !contactosWs || !memoriaWs) return { error: 'missing_sheets: internal' };

    const routinesSheet = wsToJson(rutinasWs);
    const contactsSheet = wsToJson(contactosWs);
    const memoriesSheet = wsToJson(memoriaWs);

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

    await supabase.from('robot_routines').delete().eq('account_id', accountId);
    await supabase.from('robot_contacts').delete().eq('account_id', accountId);
    await supabase.from('robot_memories').delete().eq('account_id', accountId);

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

  if (!path.startsWith(`${accountId}/`)) return { error: 'unauthorized' };

  const { data, error } = await supabase.storage.from('robot_configs').createSignedUrl(path, 60);

  if (error) {
    logger.error({ userId, accountId, error: error.message }, 'Error generating signed url');
    return { error: 'failed_to_generate_url' };
  }

  return { url: data.signedUrl };
}
