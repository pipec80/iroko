import React from 'react';
import { AppTopbar } from './app-topbar';
import { AppSidebar } from './app-sidebar';
import { PageTransition } from './page-transition';

export function DashboardLayout({
  children,
  impersonationBanner,
}: {
  children: React.ReactNode;
  impersonationBanner?: React.ReactNode;
}) {
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {impersonationBanner}
        <AppTopbar />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="page-content">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
