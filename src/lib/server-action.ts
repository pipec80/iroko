import * as Sentry from '@sentry/nextjs';

/** Detecta los errores internos de Next.js (redirect, notFound) — no son bugs. */
function isNextInternalError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest: unknown }).digest === 'string' &&
    /^NEXT_(REDIRECT|NOT_FOUND)/.test((err as { digest: string }).digest)
  );
}

/**
 * Envuelve una Server Action para capturar throws inesperados en Sentry.
 * Los errores de negocio devueltos como `{ error: 'code' }` no se capturan —
 * son flujos esperados, no bugs. Las redirecciones de Next.js se re-lanzan
 * sin capturar.
 */
export function withServerAction<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await action(...args);
    } catch (err) {
      if (isNextInternalError(err)) throw err;

      Sentry.withScope((scope) => {
        scope.setTag('server_action', action.name);
        Sentry.captureException(err);
      });
      throw err;
    }
  };
}
