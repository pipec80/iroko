/**
 * Root 404 boundary — rendered when no [locale] segment matches.
 * The <html>/<body> shell is provided by src/app/layout.tsx, so this
 * component only needs to render the page content.
 */
export default function GlobalNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 font-sans">
      <div className="text-center">
        <span className="text-on-surface-variant font-mono text-[120px] leading-none font-bold tracking-tighter opacity-10">
          404
        </span>
      </div>
      <div className="space-y-3 text-center">
        <h1 className="text-on-surface font-headline text-2xl font-bold tracking-tight">
          Page Not Found
        </h1>
        <p className="text-on-surface-variant max-w-md text-sm">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 py-3 text-sm font-bold shadow-md transition-all">
        Return Home
      </a>
    </div>
  );
}
