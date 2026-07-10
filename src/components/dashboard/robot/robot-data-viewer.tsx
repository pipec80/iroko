'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
  const t = useTranslations('Robot');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleDownload = (fileName: string) => {
    startTransition(async () => {
      const { url, error } = await getDownloadUrl(`${accountId}/${fileName}`);
      if (error || !url) {
        alert(t('alert_download_error'));
        return;
      }
      window.open(url, '_blank');
    });
  };

  const formatLocalTime = (isoString: string) => {
    return new Intl.DateTimeFormat(locale, {
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
        <CardTitle>{t('viewer_title')}</CardTitle>
        <CardDescription>{t('viewer_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="routines" className="w-full">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-4">
            <TabsTrigger value="routines" className="gap-2">
              <Clock className="size-4" /> {t('tab_routines')}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="size-4" /> {t('tab_contacts')}
            </TabsTrigger>
            <TabsTrigger value="memories" className="gap-2">
              <BrainCircuit className="size-4" /> {t('tab_memories')}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <FileSpreadsheet className="size-4" /> {t('tab_history')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routines">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('col_time')}</TableHead>
                    <TableHead>{t('col_type')}</TableHead>
                    <TableHead>{t('col_description')}</TableHead>
                    <TableHead>{t('col_message')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routines.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-4 text-center">
                        {t('empty_routines')}
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
                    <TableHead>{t('col_priority')}</TableHead>
                    <TableHead>{t('col_name')}</TableHead>
                    <TableHead>{t('col_relationship')}</TableHead>
                    <TableHead>{t('col_phone')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-4 text-center">
                        {t('empty_contacts')}
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
                    <TableHead>{t('col_entity')}</TableHead>
                    <TableHead>{t('col_name')}</TableHead>
                    <TableHead>{t('col_key_fact')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memories.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground py-4 text-center">
                        {t('empty_memories')}
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
                    <TableHead>{t('col_upload_date')}</TableHead>
                    <TableHead>{t('col_file')}</TableHead>
                    <TableHead className="text-right">{t('col_action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground py-4 text-center">
                        {t('empty_history')}
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
                            <Download className="mr-2 size-4" />
                            {t('download_btn')}
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
