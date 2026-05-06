import { Link } from '@/i18n/routing';

export function PublicNavbar() {
  return (
    <nav className="bg-surface/70 flat no-shadows fixed top-0 z-50 w-full border-none backdrop-blur-xl dark:bg-slate-900/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
        <Link href="/" className="text-primary font-headline text-xl font-bold tracking-tighter">
          Axiom Ledger
        </Link>
        <div className="font-body hidden items-center gap-8 font-medium tracking-tight md:flex">
          <Link
            className="text-primary border-primary border-b-2 font-bold transition-opacity duration-150 hover:opacity-80 active:scale-95"
            href="/product">
            Product
          </Link>
          <Link
            className="hover:text-primary text-slate-600 transition-opacity duration-150 hover:opacity-80 active:scale-95 dark:text-slate-400"
            href="/solutions">
            Solutions
          </Link>
          <Link
            className="hover:text-primary text-slate-600 transition-opacity duration-150 hover:opacity-80 active:scale-95 dark:text-slate-400"
            href="/pricing">
            Pricing
          </Link>
          <Link
            className="hover:text-primary text-slate-600 transition-opacity duration-150 hover:opacity-80 active:scale-95 dark:text-slate-400"
            href="/contact">
            Contact
          </Link>
        </div>
        <Link
          href="/login"
          className="from-primary to-primary-container text-on-primary rounded-md bg-gradient-to-r px-6 py-2 font-medium transition-opacity hover:opacity-90 active:scale-95">
          Login
        </Link>
      </div>
    </nav>
  );
}
