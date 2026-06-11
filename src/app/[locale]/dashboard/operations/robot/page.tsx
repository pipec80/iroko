import { redirect } from 'next/navigation';

import { ExcelUploadDropzone } from '@/components/dashboard/robot/excel-upload';
import { RobotDataViewer } from '@/components/dashboard/robot/robot-data-viewer';
import { createClient } from '@/lib/supabase/server';

export default async function RobotConfigPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const accountId = authData?.claims.app_metadata?.account_id as string | undefined;

  if (!accountId) {
    redirect('/login');
  }

  // Fetch current data
  const { data: routines } = await supabase
    .from('robot_routines')
    .select('*')
    .eq('account_id', accountId)
    .order('time', { ascending: true });
  const { data: contacts } = await supabase
    .from('robot_contacts')
    .select('*')
    .eq('account_id', accountId)
    .order('priority', { ascending: true });
  const { data: memories } = await supabase
    .from('robot_memories')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  // Fetch storage history
  const { data: files } = await supabase.storage.from('robot_configs').list(accountId, {
    sortBy: { column: 'created_at', order: 'desc' },
  });

  // Filter out any hidden/placeholder files if necessary, and map to plain objects
  const history = (files || [])
    .filter((f) => f.name.endsWith('.xlsx'))
    .map((f) => ({
      name: f.name,
      created_at: f.created_at || new Date().toISOString(),
    }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Iroko Administration</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-full">
          <ExcelUploadDropzone />
        </div>
        <div className="col-span-full">
          <RobotDataViewer
            routines={routines || []}
            contacts={contacts || []}
            memories={memories || []}
            history={history}
            accountId={accountId}
          />
        </div>
      </div>
    </div>
  );
}
