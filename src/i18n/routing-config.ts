import { defineRouting } from 'next-intl/routing';

/** Single source of truth for locale configuration. Safe to import in tests and server code. */
export const routing = defineRouting({
  locales: ['en', 'es', 'pt', 'fr'],
  defaultLocale: 'es',
  localePrefix: 'always',
});
