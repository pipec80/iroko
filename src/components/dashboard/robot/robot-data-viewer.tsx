'use client';

import { useTransition } from 'react';
import { Download, FileSpreadsheet, Clock, Users, BrainCircuit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDownloadUrl } from '@/lib/robot-config';
import type { Database } from '@/types/database';

type Routine = Database['public']['Tables']['robot_routines']['Row'];
type Contact = Database['public']['Tables']['robot_contacts']['Row'];
type Memory = Database['public']['Tables']['robot_memories']['Row'];

type Props = {
  routines: Routine[];
  contacts: Contact[];
  memories: Memory[];
  history: { name: string; created_at: string }[];
  accountId: string;
};

export function RobotDataViewer({ routines, contacts, memories, history, accountId }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleDownload = (fileName: string) => {
    startTransition(async () => {
      const { url, error } = await getDownloadUrl(`${accountId}/${fileName}`);
      if (error || !url) {
        alert('Error al generar enlace de descarga.');
        return;
      }
      // Abrir en nueva pestaña para descargar
      window.open(url, '_blank');
    });
  };

  const formatLocalTime = (isoString: string) => {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Estado Actual & Historial</CardTitle>
        <CardDescription>
          Revisa la configuración cargada actualmente en la memoria del robot y descarga versiones
          anteriores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="routines" className="w-full">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-4">
            <TabsTrigger value="routines" className="gap-2">
              <Clock className="h-4 w-4" /> Rutinas
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" /> Contactos
            </TabsTrigger>
            <TabsTrigger value="memories" className="gap-2">
              <BrainCircuit className="h-4 w-4" /> Memoria
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routines">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Mensaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routines.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-4 text-center">
                        No hay rutinas cargadas.
                      </TableCell>
                    </TableRow>
                  : routines.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono">{r.time}</TableCell>
                        <TableCell>{r.activity_type}</TableCell>
                        <TableCell>{r.description}</TableCell>
                        <TableCell className="text-muted-foreground italic">
                          &quot;{r.message}&quot;
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="contacts">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Relación</TableHead>
                    <TableHead>Teléfono</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-4 text-center">
                        No hay contactos cargados.
                      </TableCell>
                    </TableRow>
                  : contacts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.priority}</TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.relationship}</TableCell>
                        <TableCell className="font-mono">{c.phone}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="memories">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dato Clave</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memories.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground py-4 text-center">
                        No hay memoria cargada.
                      </TableCell>
                    </TableRow>
                  : memories.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.entity}</TableCell>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{m.key_fact}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha de Subida (Local)</TableHead>
                    <TableHead>Archivo</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground py-4 text-center">
                        No hay historial de subidas.
                      </TableCell>
                    </TableRow>
                  : history.map((h) => (
                      <TableRow key={h.name}>
                        <TableCell className="capitalize">
                          {formatLocalTime(h.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{h.name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleDownload(h.name)}>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
