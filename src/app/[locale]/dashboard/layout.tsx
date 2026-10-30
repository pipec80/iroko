import { setRequestLocale } from 'next-intl/server';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ImpersonationBanner } from '@/components/layout/impersonation-banner';
import { redirect } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { IdentityScopeProvider } from '@/components/providers/query-provider';
import { DocumentDraftProvider } from '@/components/providers/document-draft-provider';

export default async function DashboardRouteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Defense in depth: proxy.ts already redirects unauthenticated users,
  // but a missing session here means the claims call returned nothing
  // (e.g. token revoked server-side). Always re-check in Server Components.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect({ href: '/login', locale });
  }

  const impersonatedBy = data?.claims.app_metadata?.impersonated_by as string | undefined;
  const expiresAt = data?.claims.app_metadata?.impersonation_expires_at as string | undefined;

  let banner: React.ReactNode = null;
  if (impersonatedBy && expiresAt) {
    const { data: userData } = await supabase.auth.getUser();
    const targetName =
      (userData.user?.user_metadata?.given_name as string | undefined) ??
      userData.user?.email ??
      '';
    banner = (
      <ImpersonationBanner
        targetName={targetName}
        targetEmail={userData.user?.email ?? ''}
        expiresAt={expiresAt}
      />
    );
  }

  const userId = data!.claims.sub;
  const accountId = (data!.claims.app_metadata?.account_id as string | undefined) ?? null;
  const scope = { userId, accountId: accountId ?? '', impersonatedBy: impersonatedBy ?? null };
  return (
    <IdentityScopeProvider scope={scope}>
      <DocumentDraftProvider
        key={`${userId}:${accountId ?? ''}:${impersonatedBy ?? ''}`}
        userId={userId}
        accountId={accountId}>
        <DashboardLayout impersonationBanner={banner}>{children}</DashboardLayout>
      </DocumentDraftProvider>
    </IdentityScopeProvider>
  );
}
