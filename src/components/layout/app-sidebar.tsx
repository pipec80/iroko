import { createClient } from '@/lib/supabase/server';

import { AppSidebarClient, type OrgAccount } from './app-sidebar-client';

export async function AppSidebar() {
  const supabase = await createClient();
  const { data: accounts } = await supabase.rpc('get_my_accounts');

  const orgs: OrgAccount[] = (accounts ?? []).map((a) => ({
    account_id: a.account_id,
    name: a.name,
    slug: a.slug,
    role: a.role,
    type: a.type,
    logo_url: a.logo_url,
  }));

  return <AppSidebarClient orgs={orgs} />;
}
