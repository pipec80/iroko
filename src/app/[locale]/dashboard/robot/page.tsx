import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { ExcelUploadDropzone } from '@/components/dashboard/robot/excel-upload';
import { RobotDataViewer } from '@/components/dashboard/robot/robot-data-viewer';
import { createClient } from '@/lib/supabase/server';
import { appConfig } from '@/config/app.config';

export const metadata: Metadata = {
  title: `Robot — ${appConfig.brand}`,
};

export default async function RobotConfigPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const accountId = authData?.claims.app_metadata?.account_id as string | undefined;

  if (!accountId) {
    redirect('/login');
  }

  const [{ data: routines }, { data: contacts }, { data: memories }, { data: files }] =
    await Promise.all([
      supabase
        .from('robot_routines')
        .select('*')
        .eq('account_id', accountId)
        .order('time', { ascending: true }),
      supabase
        .from('robot_contacts')
        .select('*')
        .eq('account_id', accountId)
        .order('priority', { ascending: true }),
      supabase
        .from('robot_memories')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false }),
      supabase.storage.from('robot_configs').list(accountId, {
        sortBy: { column: 'created_at', order: 'desc' },
      }),
    ]);

  const history = (files ?? [])
    .filter((f) => f.name.endsWith('.xlsx'))
    .map((f) => ({
      name: f.name,
      created_at: f.created_at ?? new Date().toISOString(),
    }));

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <header className="flex flex-col justify-between space-y-2 md:flex-row md:items-center">
        <h2 className="text-3xl font-bold tracking-tight">{appConfig.brand} Robot</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-full min-w-0">
          <ExcelUploadDropzone />
        </div>
        <div className="col-span-full min-w-0">
          <RobotDataViewer
            routines={routines ?? []}
            contacts={contacts ?? []}
            memories={memories ?? []}
            history={history}
            accountId={accountId}
          />
        </div>
      </div>
    </div>
  );
}
