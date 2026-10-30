const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..', '..');
const locales = Object.fromEntries(
  ['en', 'fr', 'pt'].map((locale) => [
    locale,
    JSON.parse(readFileSync(join(root, 'messages', `${locale}.json`), 'utf8')),
  ]),
);
const namespaces = ['ActivityLog', 'Admin', 'Impersonation'];
const unchangedTerms = {
  fr: new Set([
    'ActivityLog.col_action',
    'ActivityLog.col_date',
    'ActivityLog.resource_invitations',
    'ActivityLog.resource_documents',
    'Admin.announcements_type_info',
    'Admin.alerts_body_label',
    'Admin.announcements_body_label',
  ]),
  pt: new Set(),
};

function leaves(value, prefix = '') {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof child === 'string' ? [[path, child]] : Object.entries(leaves(child, path));
    }),
  );
}

function icuTokens(message) {
  return [...message.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)(?:,\s*(plural|select|selectordinal))?/g)]
    .map((match) => `${match[1]}:${match[2] ?? 'simple'}`)
    .sort();
}

for (const locale of ['fr', 'pt']) {
  test(`${locale} administrative namespaces preserve keys and ICU arguments`, () => {
    for (const namespace of namespaces) {
      const english = leaves(locales.en[namespace]);
      const translated = leaves(locales[locale][namespace]);
      assert.deepEqual(Object.keys(translated).sort(), Object.keys(english).sort(), namespace);
      for (const key of Object.keys(english)) {
        assert.deepEqual(
          icuTokens(translated[key]),
          icuTokens(english[key]),
          `${namespace}.${key}`,
        );
      }
    }
  });

  test(`${locale} administrative copy is translated except explicit shared terms`, () => {
    const untranslated = namespaces.flatMap((namespace) => {
      const english = leaves(locales.en[namespace]);
      const translated = leaves(locales[locale][namespace]);
      return Object.keys(english)
        .filter((key) => translated[key] === english[key])
        .map((key) => `${namespace}.${key}`);
    });
    assert.deepEqual(
      untranslated.filter((key) => !unchangedTerms[locale].has(key)),
      [],
      'Unexpected English copy in administrative screens',
    );
    assert.notEqual(
      locales[locale].Admin.accounts_search_placeholder,
      locales.en.Admin.accounts_search_placeholder,
    );
    assert.notEqual(
      locales[locale].Admin.announcements_title,
      locales.en.Admin.announcements_title,
    );
  });
}
