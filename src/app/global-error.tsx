'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
          <div className="bg-error/10 flex size-20 items-center justify-center rounded-full">
            <AlertCircle className="text-error size-9" strokeWidth={1.75} />
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-on-surface font-headline text-2xl font-bold tracking-tight">
              Something went wrong!
            </h1>
            <p className="text-on-surface-variant max-w-md text-sm">
              An unexpected error occurred.
            </p>
            <button
              type="button"
              onClick={reset}
              className="bg-primary text-on-primary mt-4 rounded-md px-4 py-2 text-sm font-medium">
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
