import { describe, it, expect } from 'vitest';

import en from '../../messages/en.json';
import es from '../../messages/es.json';
import fr from '../../messages/fr.json';
import pt from '../../messages/pt.json';

const LOCALES = { en, es, fr, pt } as const;
const REFERENCE_LOCALE = 'es';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, nested]) =>
    flattenKeys(nested, prefix ? `${prefix}.${key}` : key),
  );
}

describe('i18n message parity', () => {
  const referenceKeys = new Set(flattenKeys(LOCALES[REFERENCE_LOCALE]));

  for (const [locale, messages] of Object.entries(LOCALES)) {
    if (locale === REFERENCE_LOCALE) continue;

    it(`should have the same keys as ${REFERENCE_LOCALE} in ${locale}.json`, () => {
      const localeKeys = new Set(flattenKeys(messages));
      const missing = [...referenceKeys].filter((key) => !localeKeys.has(key));
      const extra = [...localeKeys].filter((key) => !referenceKeys.has(key));

      expect(missing, `missing keys in ${locale}.json`).toEqual([]);
      expect(extra, `extra keys in ${locale}.json not present in ${REFERENCE_LOCALE}.json`).toEqual(
        [],
      );
    });
  }
});
