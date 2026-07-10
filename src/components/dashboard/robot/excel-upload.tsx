'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { uploadRobotConfigAction } from '@/lib/robot-config';
import { appConfig } from '@/config/app.config';
import { cn } from '@/lib/utils';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function ExcelUploadDropzone() {
  const t = useTranslations('Robot');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function validateAndSetFile(selected: File) {
    setError(null);
    setSuccess(false);
    if (!selected.name.endsWith('.xlsx')) {
      setError(t('error_only_xlsx'));
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError(t('error_file_too_large'));
      return;
    }
    setFile(selected);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }

  function handleUpload() {
    if (!file) return;
    startTransition(async () => {
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadRobotConfigAction({}, formData);
      if (result.error) {
        setError(t('error_processing', { error: result.error }));
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
    a.download = `Plantilla_${appConfig.brand}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-primary size-5" />
            <CardTitle className="text-base">
              {t('card_title', { brand: appConfig.brand })}
            </CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="size-4" />
            {t('download_template')}
          </Button>
        </div>
        <CardDescription>{t('card_description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed px-5 py-4 transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
          )}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}>
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md transition-colors',
              isDragging ? 'bg-primary/10' : 'bg-muted',
            )}>
            <UploadCloud
              className={cn(
                'size-4 transition-colors',
                isDragging ? 'text-primary' : 'text-muted-foreground',
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {file ? file.name : t('dropzone_placeholder')}
            </p>
            <p className="text-muted-foreground text-xs">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : t('dropzone_hint')}
            </p>
          </div>
          {file && <CheckCircle2 className="size-4 shrink-0 text-green-500" />}
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
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-sm leading-none font-medium">{t('error_title')}</p>
              <p className="mt-1 text-xs opacity-90">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-green-700 dark:text-green-400">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
            <div>
              <p className="text-sm leading-none font-medium">{t('success_title')}</p>
              <p className="mt-1 text-xs opacity-90">
                {t('success_desc', { brand: appConfig.brand })}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleUpload} disabled={!file || isPending} size="sm">
            {isPending ? t('processing') : t('upload_btn')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
