import * as Sentry from '@sentry/nextjs';

/**
 * Campos estructurados — misma forma que el logger de servidor.
 * Se pasan como primer argumento para correlacionar eventos en Sentry.
 */
type LogFields = {
  userId?: string;
  tenantId?: string;
  action?: string;
  component?: string;
  [key: string]: unknown;
};

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Logger para Client Components y hooks de browser.
 *
 * En desarrollo: escribe a consola.
 * En producción: info/warn → Sentry breadcrumb (no consume cuota).
 *                error     → Sentry captureException/captureMessage (sí consume cuota).
 *
 * No tiene `server-only` — importar desde Client Components es seguro.
 * Para Server Components, Actions y Routes usar `@/lib/logger` (Pino).
 */
export const logClient = {
  /**
   * Evento informativo. En producción solo agrega un breadcrumb a Sentry.
   * @param fields - Contexto estructurado del evento
   * @param message - Descripción breve
   */
  info(fields: LogFields, message: string): void {
    if (isDev) console.info('[info]', message, fields);
    Sentry.addBreadcrumb({ message, data: fields, level: 'info' });
  },

  /**
   * Advertencia. En producción agrega breadcrumb de nivel warning.
   * @param fields - Contexto estructurado
   * @param message - Descripción de la advertencia
   */
  warn(fields: LogFields, message: string): void {
    if (isDev) console.warn('[warn]', message, fields);
    Sentry.addBreadcrumb({ message, data: fields, level: 'warning' });
  },

  /**
   * Error capturado. Siempre enviado a Sentry en producción.
   * @param fields - Contexto estructurado (action, component, userId, etc.)
   * @param message - Descripción del error
   * @param err - Error original opcional para stack trace
   */
  error(fields: LogFields, message: string, err?: unknown): void {
    if (isDev) console.error('[error]', message, fields, err);
    if (err instanceof Error) {
      Sentry.captureException(err, { extra: { ...fields, message } });
    } else {
      Sentry.captureMessage(message, { level: 'error', extra: fields });
    }
  },
} as const;
