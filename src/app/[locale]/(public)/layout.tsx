import React from 'react';

import { PublicFooter } from '@/components/layout/public-footer';
import { PublicNavbar } from '@/components/layout/public-navbar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-foreground flex min-h-screen flex-col pt-24">
      <PublicNavbar />
      <main className="flex grow flex-col">{children}</main>
      <PublicFooter />
    </div>
  );
}
