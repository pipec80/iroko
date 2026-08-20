import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkCanonicalDocs,
  checkTokenParity,
  parseCssCustomProperties,
} from '../check-design-system.mjs';

test('parses CSS custom properties while ignoring comments and whitespace', () => {
  const tokens = parseCssCustomProperties(`
    /* --ignored: #000; */
    :root {
      --color-poppy: #d92121;
      --font-body: "Geist", sans-serif;
    }
  `);

  assert.deepEqual(
    [...tokens],
    [
      ['--color-poppy', '#d92121'],
      ['--font-body', '"Geist", sans-serif'],
    ],
  );
});

test('accepts matching required tokens', () => {
  const requiredTokens = ['--color-poppy', '--color-cobalt'];
  const specification = new Map([
    ['--color-poppy', '#d92121'],
    ['--color-cobalt', '#0047ab'],
  ]);
  const runtime = new Map(specification);

  assert.deepEqual(checkTokenParity({ requiredTokens, specification, runtime }), []);
});

test('reports missing and mismatched required tokens', () => {
  const issues = checkTokenParity({
    requiredTokens: ['--color-poppy', '--color-cobalt'],
    specification: new Map([
      ['--color-poppy', '#d92121'],
      ['--color-cobalt', '#0047ab'],
    ]),
    runtime: new Map([['--color-poppy', '#b11226']]),
  });

  assert.deepEqual(issues, [
    {
      code: 'token-mismatch',
      token: '--color-poppy',
      message: 'Runtime value #b11226 does not match specification value #d92121.',
    },
    {
      code: 'missing-runtime-token',
      token: '--color-cobalt',
      message: 'Required token is missing from the runtime stylesheet.',
    },
  ]);
});

test('reports retired visual language in canonical guidance', () => {
  const issues = checkCanonicalDocs({
    files: [
      {
        path: 'README.md',
        contents: 'Use Cormorant Garamond with Tierra + Hierro (#b8513a).',
      },
      { path: 'SKILL.md', contents: 'Use Geist and Poppy.' },
    ],
  });

  assert.deepEqual(
    issues.map(({ code, file, line }) => ({ code, file, line })),
    [
      { code: 'retired-visual-language', file: 'README.md', line: 1 },
      { code: 'retired-visual-language', file: 'README.md', line: 1 },
      { code: 'retired-visual-language', file: 'README.md', line: 1 },
    ],
  );
});
