'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as xlsx from 'xlsx';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { uploadRobotConfigAction } from '@/lib/robot-config';

export function ExcelUploadDropzone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx')) {
      setError('Por seguridad, solo se permiten archivos .xlsx (sin macros).');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('El archivo excede el tamaño máximo permitido (5MB).');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = () => {
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
  };

  const handleDownloadTemplate = () => {
    // Creamos la plantilla vacía usando xlsx localmente
    const wb = xlsx.utils.book_new();

    const wsRutinas = xlsx.utils.json_to_sheet([
      {
        Hora: '09:00:00',
        Tipo: 'Medicina',
        Descripcion: 'Pastilla para presión',
        Mensaje: 'Buenos días, hora de la pastilla.',
      },
    ]);
    xlsx.utils.book_append_sheet(wb, wsRutinas, 'Rutinas');

    const wsContactos = xlsx.utils.json_to_sheet([
      { Nombre: 'Juan', Relacion: 'Hijo', Telefono: '+56912345678', Prioridad: 1 },
    ]);
    xlsx.utils.book_append_sheet(wb, wsContactos, 'Contactos');

    const wsMemoria = xlsx.utils.json_to_sheet([
      { Entidad: 'Nieto', Nombre: 'Mateo', Dato: 'Juega fútbol en España' },
    ]);
    xlsx.utils.book_append_sheet(wb, wsMemoria, 'Memoria');

    xlsx.writeFile(wb, 'Plantilla_Iroko.xlsx');
  };

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="text-primary h-6 w-6" />
          Configuración de Iroko
        </CardTitle>
        <CardDescription>
          Sube el archivo Excel (.xlsx) con las rutinas, contactos y memoria del robot. Al subir, se
          reemplazarán los datos anteriores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar Plantilla
          </Button>
        </div>

        <div
          className="hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors"
          onClick={() => fileInputRef.current?.click()}>
          <UploadCloud className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-1 text-lg font-medium">
            {file ? file.name : 'Haz clic o arrastra un archivo aquí'}
          </h3>
          <p className="text-muted-foreground text-sm">
            {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Excel (.xlsx) hasta 5MB'}
          </p>
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
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <h5 className="mb-1 leading-none font-medium tracking-tight">Error</h5>
              <div className="text-sm opacity-90">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-green-700 dark:text-green-400">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
            <div>
              <h5 className="mb-1 leading-none font-medium tracking-tight">¡Éxito!</h5>
              <div className="text-sm opacity-90">
                La configuración de Iroko fue actualizada correctamente.
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleUpload} disabled={!file || isPending} className="w-full sm:w-auto">
            {isPending ? 'Procesando...' : 'Subir Configuración'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
