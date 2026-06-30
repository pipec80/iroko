import 'server-only';

import pino from 'pino';
import { env } from '@/env';

declare module 'pino' {
  interface LogFnFields {
    userId?: string;
    tenantId?: string;
    requestId?: string;
    action?: string;
    component?: string;
  }
}

/**
 * Centralized logger instance using Pino.
 * - Development: Pretty-printed logs.
 * - Production: High-performance JSON logs.
 * - Security: Automatic redaction of sensitive fields.
 * - Typed: Strictly typed fields for SaaS logging.
 */
const logger = pino({
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  // Only use pino-pretty in development environment
  transport:
    env.NODE_ENV === 'development' ?
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          colorizeObjects: true,
          singleLine: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  // Enterprise-grade security: sensitive data is never logged
  redact: {
    paths: [
      'password',
      'token',
      'secret',
      '*Token*',
      '*Secret*',
      'email',
      'key',
      'authorization',
      'cookie',
      'set-cookie',
      'headers.cookie',
      'headers.authorization',
      // Nested sensitive fields (SECURITY_AUDIT F-09)
      '*.email',
      '*.password',
      '*.token',
      '*.secret',
      'user.email',
      'session.access_token',
      'session.refresh_token',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});

export { logger };
export default logger;
