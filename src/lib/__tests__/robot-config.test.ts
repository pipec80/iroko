import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as xlsx from 'xlsx';

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  storageUpload: vi.fn(),
  createSignedUrl: vi.fn(),
  deleteEq: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getClaims: mocks.getClaims },
    storage: {
      from: () => ({ upload: mocks.storageUpload, createSignedUrl: mocks.createSignedUrl }),
    },
    from: (table: string) => ({
      delete: () => ({ eq: mocks.deleteEq }),
      insert: (rows: unknown) => mocks.insert(table, rows),
    }),
  }),
}));

vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    SUPABASE_SECRET_KEY: 'test-key',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
}));

import { uploadRobotConfigAction, getDownloadUrl } from '../robot-config';

// ─── Helpers ────────────────────────────────────────────────────────────────

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ACCOUNT_ID = 'acct-uuid-1';
const PREV = {};

type SheetRows = Record<string, Array<Record<string, unknown>>>;

/** Construye un .xlsx real en memoria — el parseo del action se prueba de verdad. */
function makeXlsxFile(sheets: SheetRows, name = 'config.xlsx', type = XLSX_MIME): File {
  const wb = xlsx.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows), sheetName);
  }
  const buffer = xlsx.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([buffer], name, { type });
}

const validSheets: SheetRows = {
  Rutinas: [
    {
      Hora: 10 / 24,
      Tipo: 'Medicación',
      Descripcion: 'Pastilla azul',
      Mensaje: 'Hora de tu pastilla',
    },
    { Hora: '08:30', Tipo: 'Ejercicio', Descripcion: 'Caminata', Mensaje: 'A caminar' },
  ],
  Contactos: [{ Nombre: 'Ana', Relacion: 'Hija', Telefono: 56912345678, Prioridad: 2 }],
  Memoria: [{ Entidad: 'Mascota', Nombre: 'Firulais', Dato: 'Perro de la familia' }],
};

function makeUploadForm(file?: File): FormData {
  const fd = new FormData();
  if (file) fd.set('file', file);
  return fd;
}

function mockAuthenticated() {
  mocks.getClaims.mockResolvedValue({
    data: { claims: { sub: 'user-uuid-1', app_metadata: { account_id: ACCOUNT_ID } } },
  });
}

// ─── uploadRobotConfigAction ─────────────────────────────────────────────────

describe('uploadRobotConfigAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticated();
    mocks.storageUpload.mockResolvedValue({ error: null });
    mocks.deleteEq.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: null });
  });

  describe('security validation (OWASP)', () => {
    it('returns no_file when the field is missing', async () => {
      const result = await uploadRobotConfigAction(PREV, makeUploadForm());
      expect(result.error).toBe('no_file');
    });

    it('rejects files with a non-xlsx MIME type', async () => {
      const file = makeXlsxFile(validSheets, 'config.xlsx', 'text/csv');
      const result = await uploadRobotConfigAction(PREV, makeUploadForm(file));
      expect(result.error).toBe('invalid_type');
    });

    it('rejects correct MIME with a non-.xlsx extension (double-extension trick)', async () => {
      const file = makeXlsxFile(validSheets, 'config.xlsx.exe');
      const result = await uploadRobotConfigAction(PREV, makeUploadForm(file));
      expect(result.error).toBe('invalid_extension');
    });

    it('rejects files over 5 MiB', async () => {
      const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'config.xlsx', {
        type: XLSX_MIME,
      });
      const result = await uploadRobotConfigAction(PREV, makeUploadForm(big));
      expect(result.error).toBe('file_too_large');
    });

    it('returns not_authenticated when claims are missing', async () => {
      mocks.getClaims.mockResolvedValue({ data: null });
      const result = await uploadRobotConfigAction(PREV, makeUploadForm(makeXlsxFile(validSheets)));
      expect(result.error).toBe('not_authenticated');
      expect(mocks.storageUpload).not.toHaveBeenCalled();
    });
  });

  describe('parsing', () => {
    it('reports which required sheets are missing', async () => {
      const file = makeXlsxFile({ Rutinas: validSheets['Rutinas']! });
      const result = await uploadRobotConfigAction(PREV, makeUploadForm(file));
      expect(result.error).toContain('missing_sheets');
      expect(result.error).toContain('Contactos');
      expect(result.error).toContain('Memoria');
    });

    it('converts Excel time fractions and keeps text times as-is', async () => {
      await uploadRobotConfigAction(PREV, makeUploadForm(makeXlsxFile(validSheets)));

      const routineRows = mocks.insert.mock.calls.find(([table]) => table === 'robot_routines');
      expect(routineRows?.[1]).toEqual([
        expect.objectContaining({ time: '10:00:00', activity_type: 'Medicación' }),
        expect.objectContaining({ time: '08:30', activity_type: 'Ejercicio' }),
      ]);
    });

    it('coerces contact phone to string and applies fallbacks for empty cells', async () => {
      const sheets: SheetRows = {
        ...validSheets,
        Contactos: [{ Telefono: 56911112222 }], // sin Nombre/Relacion/Prioridad
      };
      await uploadRobotConfigAction(PREV, makeUploadForm(makeXlsxFile(sheets)));

      const contactRows = mocks.insert.mock.calls.find(([table]) => table === 'robot_contacts');
      expect(contactRows?.[1]).toEqual([
        expect.objectContaining({
          name: 'Desconocido',
          phone: '56911112222',
          priority: 1,
          account_id: ACCOUNT_ID,
        }),
      ]);
    });
  });

  describe('persistence', () => {
    it('returns upload_failed when the storage backup fails — nothing is parsed', async () => {
      mocks.storageUpload.mockResolvedValue({ error: { message: 'bucket unavailable' } });
      const result = await uploadRobotConfigAction(PREV, makeUploadForm(makeXlsxFile(validSheets)));
      expect(result.error).toBe('upload_failed');
      expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('stores the original under the account folder with a random name', async () => {
      await uploadRobotConfigAction(PREV, makeUploadForm(makeXlsxFile(validSheets)));
      const [path] = mocks.storageUpload.mock.calls[0] ?? [];
      expect(path).toMatch(new RegExp(`^${ACCOUNT_ID}/[0-9a-f-]{36}\\.xlsx$`));
    });

    it('replaces existing data: deletes the three tables before inserting', async () => {
      await uploadRobotConfigAction(PREV, makeUploadForm(makeXlsxFile(validSheets)));
      expect(mocks.deleteEq).toHaveBeenCalledTimes(3);
      expect(mocks.deleteEq).toHaveBeenCalledWith('account_id', ACCOUNT_ID);
    });

    it('returns processing_failed when an insert errors — no DB detail leaked', async () => {
      mocks.insert.mockResolvedValue({ error: new Error('violates foreign key') });
      const result = await uploadRobotConfigAction(PREV, makeUploadForm(makeXlsxFile(validSheets)));
      expect(result.error).toBe('processing_failed');
    });

    it('returns success after inserting routines, contacts and memories', async () => {
      const result = await uploadRobotConfigAction(PREV, makeUploadForm(makeXlsxFile(validSheets)));

      expect(result.success).toBe(true);
      const tables = mocks.insert.mock.calls.map(([table]) => table);
      expect(tables).toEqual(
        expect.arrayContaining(['robot_routines', 'robot_contacts', 'robot_memories']),
      );
    });
  });
});

// ─── getDownloadUrl ──────────────────────────────────────────────────────────

describe('getDownloadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticated();
  });

  it('returns not_authenticated when claims are missing', async () => {
    mocks.getClaims.mockResolvedValue({ data: null });
    const result = await getDownloadUrl(`${ACCOUNT_ID}/file.xlsx`);
    expect(result.error).toBe('not_authenticated');
  });

  it('rejects paths belonging to another account (IDOR guard)', async () => {
    const result = await getDownloadUrl('other-account/file.xlsx');
    expect(result.error).toBe('unauthorized');
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns failed_to_generate_url when signing fails', async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const result = await getDownloadUrl(`${ACCOUNT_ID}/file.xlsx`);
    expect(result.error).toBe('failed_to_generate_url');
  });

  it('returns a short-lived signed URL for own files', async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage/signed?token=abc' },
      error: null,
    });
    const result = await getDownloadUrl(`${ACCOUNT_ID}/file.xlsx`);

    expect(result.url).toBe('https://storage/signed?token=abc');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(`${ACCOUNT_ID}/file.xlsx`, 60);
  });
});
