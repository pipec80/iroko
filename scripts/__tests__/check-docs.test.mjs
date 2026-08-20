import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { checkMarkdownFiles } from '../check-docs.mjs';

const temporaryRoots = [];

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'iroko-docs-check-'));
  temporaryRoots.push(root);
  return root;
}

function write(root, relativePath, contents) {
  const absolutePath = join(root, relativePath);
  mkdirSync(join(absolutePath, '..'), { recursive: true });
  writeFileSync(absolutePath, contents, 'utf8');
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

test('accepts valid relative files, directories, anchors, and external links', () => {
  const root = makeRoot();
  write(
    root,
    'docs/index.md',
    [
      '[State](current-state.md)',
      '[Plans](plans/)',
      '[Section](#local-section)',
      '[External](https://example.com)',
      '[Mail](mailto:owner@example.com)',
    ].join('\n'),
  );
  write(root, 'docs/current-state.md', '# Current state');
  write(root, 'docs/plans/README.md', '# Plans');

  assert.deepEqual(checkMarkdownFiles({ root, files: ['docs/index.md'] }), []);
});

test('reports a missing relative target with its source line', () => {
  const root = makeRoot();
  write(root, 'docs/index.md', 'See [missing](not-here.md).');

  assert.deepEqual(checkMarkdownFiles({ root, files: ['docs/index.md'] }), [
    {
      code: 'broken-link',
      file: 'docs/index.md',
      line: 1,
      message: 'Relative target does not exist: not-here.md',
    },
  ]);
});

test('decodes URL paths and ignores a Markdown link title', () => {
  const root = makeRoot();
  write(root, 'docs/index.md', '[My file](My%20File.md "details")');
  write(root, 'docs/My File.md', '# File');

  assert.deepEqual(checkMarkdownFiles({ root, files: ['docs/index.md'] }), []);
});

test('reports stale placeholders and retired assistant-rule references', () => {
  const root = makeRoot();
  write(
    root,
    'docs/index.md',
    [
      'Deployment: about:blank',
      'Pull request: PR TBD',
      'Follow .claude/rules before editing.',
    ].join('\n'),
  );

  assert.deepEqual(
    checkMarkdownFiles({ root, files: ['docs/index.md'] }).map(({ code, line }) => ({
      code,
      line,
    })),
    [
      { code: 'stale-reference', line: 1 },
      { code: 'stale-reference', line: 2 },
      { code: 'stale-reference', line: 3 },
    ],
  );
});
