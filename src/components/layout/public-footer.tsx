import { Link } from '@/i18n/routing';

export function PublicFooter() {
  return (
    <footer className="bg-surface-container-low flat no-shadows mt-auto w-full px-8 py-12 dark:bg-slate-800">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-4">
        <div className="flex flex-col gap-4">
          <div className="text-primary text-lg font-bold">Axiom Ledger</div>
          <p className="font-body text-sm text-slate-500 dark:text-slate-400">
            © 2024 Axiom Ledger. Built with Next.js 15 & Tailwind 4.
          </p>
        </div>
        <div className="font-body flex flex-col gap-3 text-sm">
          <Link
            className="text-primary hover:text-primary dark:hover:text-primary-fixed font-semibold transition-colors"
            href="#">
            Sitemap
          </Link>
          <Link
            className="hover:text-primary text-slate-500 transition-colors dark:text-slate-400"
            href="#">
            Privacy Policy
          </Link>
          <Link
            className="hover:text-primary text-slate-500 transition-colors dark:text-slate-400"
            href="#">
            Terms of Service
          </Link>
        </div>
        <div className="font-body flex flex-col gap-3 text-sm">
          <Link
            className="hover:text-primary text-slate-500 transition-colors dark:text-slate-400"
            href="#">
            LinkedIn
          </Link>
          <Link
            className="hover:text-primary text-slate-500 transition-colors dark:text-slate-400"
            href="#">
            Twitter
          </Link>
        </div>
      </div>
    </footer>
  );
}
