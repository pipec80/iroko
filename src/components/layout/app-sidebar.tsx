import { createClient } from '@/lib/supabase/server';

import { AppSidebarClient, type OrgAccount } from './app-sidebar-client';

export async function AppSidebar() {
  const supabase = await createClient();
  const [{ data: accounts }, { data: session }] = await Promise.all([
    supabase.rpc('get_my_accounts'),
    supabase.auth.getClaims(),
  ]);
  const metadata = session?.claims.app_metadata;
  const activeAccountId = (metadata?.account_id as string | undefined) ?? null;

  const orgs: OrgAccount[] = (accounts ?? [])
    .filter(
      (account) =>
        metadata?.organization_entry_state !== 'ready' ||
        account.type !== 'personal' ||
        account.account_id === activeAccountId,
    )
    .map((a) => ({
      account_id: a.account_id,
      name: a.name,
      slug: a.slug,
      role: a.role,
      type: a.type,
      logo_url: a.logo_url,
    }));

  return <AppSidebarClient orgs={orgs} activeAccountId={activeAccountId} />;
}
