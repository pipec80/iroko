import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { getActiveAccountId, requireAccountRole } from '@/lib/active-account';
import { ADMIN_ROLES } from '@/lib/permissions';

export default async function OrganizationSettingsLayout({ children }: { children: ReactNode }) {
  const accountId = await getActiveAccountId();
  if (!accountId) notFound();

  try {
    await requireAccountRole(accountId, ADMIN_ROLES);
  } catch {
    notFound();
  }

  return children;
}
