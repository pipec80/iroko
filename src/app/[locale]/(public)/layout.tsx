import { PublicNavbar } from '@/components/layout/public-navbar';
import { PublicFooter } from '@/components/layout/public-footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface text-on-surface flex min-h-screen flex-col pt-24">
      <PublicNavbar />
      <main className="flex flex-grow flex-col">{children}</main>
      <PublicFooter />
    </div>
  );
}
