'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
          <div className="bg-error/10 flex h-20 w-20 items-center justify-center rounded-full">
            <span className="material-symbols-outlined text-error text-4xl">error</span>
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-on-surface font-headline text-2xl font-bold tracking-tight">
              Something went wrong!
            </h1>
            <p className="text-on-surface-variant max-w-md text-sm">
              An unexpected error occurred.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
