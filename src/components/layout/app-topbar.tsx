import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

import { AppTopbarClient, type TopbarUser } from './app-topbar-client';
import type { OrgAccount } from './app-sidebar-client';

function buildDisplayName(
  profile: {
    display_name: string | null;
    given_name: string | null;
    family_name: string | null;
  } | null,
  fallbackEmail: string,
): string {
  if (profile?.display_name) return profile.display_name;
  const composed = [profile?.given_name, profile?.family_name].filter(Boolean).join(' ').trim();
  if (composed) return composed;
  return fallbackEmail.split('@')[0] ?? fallbackEmail;
}

export async function AppTopbar() {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  const email = (claimsData?.claims.email as string | undefined) ?? '';

  let user: TopbarUser = { displayName: email.split('@')[0] ?? 'User', email };

  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, given_name, family_name')
      .eq('id', userId)
      .maybeSingle();

    user = {
      displayName: buildDisplayName(profile, email),
      email,
    };
  }

  const { data: accounts } = await supabase.rpc('get_my_accounts');
  const orgs: OrgAccount[] = (accounts ?? []).map((a) => ({
    account_id: a.account_id,
    name: a.name,
    slug: a.slug,
    role: a.role,
    type: a.type,
    logo_url: a.logo_url,
  }));

  return <AppTopbarClient user={user} locale={locale} orgs={orgs} />;
}
