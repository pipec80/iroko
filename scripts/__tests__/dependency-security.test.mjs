import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import test from 'node:test';

const require = createRequire(import.meta.url);
const render = createRequire(require.resolve('resend')).resolve('@react-email/render');
const html = createRequire(render).resolve('html-to-text');
const installedRoot = dirname(dirname(createRequire(html).resolve('deepmerge')));
const packageRoot =
  process.env.DEEPMERGE_TEST_ROOT ? resolve(process.env.DEEPMERGE_TEST_ROOT) : installedRoot;

for (const entry of ['cjs.js', 'umd.js']) {
  const merge = require(join(packageRoot, 'dist', entry));

  test(`${entry}: null-prototype target cannot inherit attacker properties`, () => {
    const result = merge(Object.create(null), JSON.parse('{"__proto__":{"admin":true}}'));
    assert.equal(result.admin, undefined);
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
  });

  test(`${entry}: null and primitive placeholders cannot poison nested results`, () => {
    for (const session of [null, false, 0, '']) {
      const result = merge({ session }, JSON.parse('{"session":{"__proto__":{"admin":true}}}'));
      assert.equal(result.session.admin, undefined);
      assert.equal(Object.getPrototypeOf(result.session), Object.prototype);
    }
  });

  test(`${entry}: poisoned target keys are rejected before copying`, () => {
    const result = merge(JSON.parse('{"__proto__":{"admin":true},"safe":1}'), {});
    assert.equal(result.admin, undefined);
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(result.safe, 1);
  });

  test(`${entry}: constructor and prototype payload keys cannot survive cloning`, () => {
    const payload = JSON.parse(
      '{"constructor":{"prototype":{"admin":true}},"prototype":{"admin":true}}',
    );
    const result = merge(Object.create(null), payload);
    assert.equal(Object.hasOwn(result, 'constructor'), false);
    assert.equal(Object.hasOwn(result, 'prototype'), false);
    assert.equal(Object.prototype.admin, undefined);
  });

  test(`${entry}: normal nested options, arrays and enumerable symbols still merge`, () => {
    const key = Symbol('option');
    const result = merge(
      { options: { a: 1 }, values: [1], [key]: 'kept' },
      {
        options: { b: 2 },
        values: [2],
      },
    );
    assert.deepEqual(result.options, { a: 1, b: 2 });
    assert.deepEqual(result.values, [1, 2]);
    assert.equal(result[key], 'kept');
  });
}

test('glob/minimatch overrides preserve ZIP directory selection and bytes', async () => {
  const excelRequire = createRequire(require.resolve('exceljs'));
  const archiver = excelRequire('archiver');
  const unzipper = excelRequire('unzipper');
  const parent = resolve(tmpdir());
  const directory = await mkdtemp(join(parent, 'iroko-dependency-security-'));
  try {
    await writeFile(join(directory, 'keep.txt'), 'private export bytes');
    await writeFile(join(directory, 'omit.json'), '{}');
    const archive = archiver('zip');
    const chunks = [];
    const finished = new Promise((accept, reject) => {
      archive.on('data', (chunk) => chunks.push(chunk));
      archive.once('end', accept);
      archive.once('error', reject);
    });
    archive.glob('**/*.txt', { cwd: directory });
    await archive.finalize();
    await finished;
    const zip = await unzipper.Open.buffer(Buffer.concat(chunks));
    assert.deepEqual(
      zip.files.map((file) => file.path),
      ['keep.txt'],
    );
    assert.equal((await zip.files[0].buffer()).toString(), 'private export bytes');
  } finally {
    assert.equal(dirname(resolve(directory)), parent);
    await rm(directory, { recursive: true, force: true });
  }
});
