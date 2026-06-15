'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { uploadRobotConfigAction } from '@/lib/robot-config';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function ExcelUploadDropzone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(false);
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.endsWith('.xlsx')) {
      setError('Por seguridad, solo se permiten archivos .xlsx (sin macros).');
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError('El archivo excede el tamaño máximo permitido (5MB).');
      return;
    }
    setFile(selected);
  }

  function handleUpload() {
    if (!file) return;
    startTransition(async () => {
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadRobotConfigAction({}, formData);
      if (result.error) {
        setError(`Error procesando archivo: ${result.error}`);
      } else if (result.success) {
        setSuccess(true);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        router.refresh();
      }
    });
  }

  async function handleDownloadTemplate() {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();

    const wsRutinas = wb.addWorksheet('Rutinas');
    wsRutinas.columns = [
      { header: 'Hora', key: 'Hora', width: 12 },
      { header: 'Tipo', key: 'Tipo', width: 15 },
      { header: 'Descripcion', key: 'Descripcion', width: 30 },
      { header: 'Mensaje', key: 'Mensaje', width: 40 },
    ];
    wsRutinas.addRow({
      Hora: '09:00:00',
      Tipo: 'Medicina',
      Descripcion: 'Pastilla para presión',
      Mensaje: 'Buenos días, hora de la pastilla.',
    });

    const wsContactos = wb.addWorksheet('Contactos');
    wsContactos.columns = [
      { header: 'Nombre', key: 'Nombre', width: 20 },
      { header: 'Relacion', key: 'Relacion', width: 15 },
      { header: 'Telefono', key: 'Telefono', width: 18 },
      { header: 'Prioridad', key: 'Prioridad', width: 10 },
    ];
    wsContactos.addRow({
      Nombre: 'Juan',
      Relacion: 'Hijo',
      Telefono: '+56912345678',
      Prioridad: 1,
    });

    const wsMemoria = wb.addWorksheet('Memoria');
    wsMemoria.columns = [
      { header: 'Entidad', key: 'Entidad', width: 15 },
      { header: 'Nombre', key: 'Nombre', width: 20 },
      { header: 'Dato', key: 'Dato', width: 40 },
    ];
    wsMemoria.addRow({ Entidad: 'Nieto', Nombre: 'Mateo', Dato: 'Juega fútbol en España' });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: XLSX_MIME });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla_Iroko.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-primary h-5 w-5" />
            <CardTitle className="text-base">Configuración de Iroko</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4" />
            Descargar Plantilla
          </Button>
        </div>
        <CardDescription>
          Sube el archivo Excel (.xlsx) con las rutinas, contactos y memoria del robot. Los datos
          anteriores serán reemplazados.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dropzone — horizontal, rectangular */}
        <div
          className="hover:bg-muted/40 flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed px-5 py-4 transition-colors"
          onClick={() => fileInputRef.current?.click()}>
          <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <UploadCloud className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {file ? file.name : 'Haz clic o arrastra un archivo aquí'}
            </p>
            <p className="text-muted-foreground text-xs">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Excel (.xlsx) · máx. 5 MB'}
            </p>
          </div>
          {file && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx"
            className="hidden"
          />
        </div>

        {error && (
          <div className="border-destructive/50 text-destructive bg-destructive/10 flex items-start gap-3 rounded-lg border px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm leading-none font-medium">Error</p>
              <p className="mt-1 text-xs opacity-90">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-green-700 dark:text-green-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <div>
              <p className="text-sm leading-none font-medium">¡Éxito!</p>
              <p className="mt-1 text-xs opacity-90">
                La configuración de Iroko fue actualizada correctamente.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleUpload} disabled={!file || isPending} size="sm">
            {isPending ? 'Procesando...' : 'Subir Configuración'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
