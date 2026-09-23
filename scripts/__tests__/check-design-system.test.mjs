import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkCanonicalDocs,
  checkRuntimeFonts,
  checkTokenParity,
  parseCssCustomProperties,
} from '../check-design-system.mjs';

const LAYOUT_PATH = 'src/app/layout.tsx';
const VENDORED_LAYOUT = `localFont({ src: './fonts/Geist-latin.woff2' }); localFont({ src: './fonts/GeistMono-latin.woff2' });`;

test('accepts Geist loaded from next/font/google', () => {
  const layout = `import { Geist, Geist_Mono } from 'next/font/google';`;

  assert.deepEqual(
    checkRuntimeFonts({ layout, layoutPath: LAYOUT_PATH, fontFileExists: () => false }),
    [],
  );
});

test('accepts Geist loaded from the vendored font files', () => {
  assert.deepEqual(
    checkRuntimeFonts({
      layout: VENDORED_LAYOUT,
      layoutPath: LAYOUT_PATH,
      fontFileExists: () => true,
    }),
    [],
  );
});

test('rejects a vendored font reference whose file is missing', () => {
  const issues = checkRuntimeFonts({
    layout: VENDORED_LAYOUT,
    layoutPath: LAYOUT_PATH,
    fontFileExists: (file) => file === 'Geist-latin.woff2',
  });

  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'runtime-font-mismatch');
});

test('rejects a layout that loads neither Geist nor Geist Mono', () => {
  const issues = checkRuntimeFonts({
    layout: `import { Inter } from 'next/font/google';`,
    layoutPath: LAYOUT_PATH,
    fontFileExists: () => true,
  });

  assert.equal(issues.length, 1);
});

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
