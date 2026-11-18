import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { Worker } from 'node:worker_threads';

const require = createRequire(import.meta.url);
const sentry = createRequire(require.resolve('@sentry/nextjs'));
const commonjs = createRequire(sentry.resolve('@rollup/plugin-commonjs'));
const root =
  process.env.PICOMATCH_TEST_ROOT ?
    resolve(process.env.PICOMATCH_TEST_ROOT)
  : dirname(commonjs.resolve('picomatch'));
const picomatch = require(join(root, 'index.js'));

test('picomatch mitigation preserves ordinary and non-risky extglob matching', () => {
  for (const [pattern, input] of [
    ['**/*.ts', 'src/example.ts'],
    ['+(abc)', 'abcabc'],
    ['*(foo|bar)', 'foobar'],
    ['+([ab])', 'abba'],
    ['+(\\*)', '**'],
    ['+(*(a)|*(b))', 'abba'],
  ])
    assert.equal(picomatch(pattern)(input), true, pattern);
});

for (const pattern of ['+(*)b', '+(*a)', '*(a*)b', '+(?*a)']) {
  test(`bounded ReDoS regression ${pattern}`, async () => {
    // One tiny isolated worker; terminate promptly instead of hanging a CI runner.
    const worker = new Worker(
      `const {parentPort,workerData}=require('node:worker_threads');
      const match=require(workerData.entry)(workerData.pattern);
      parentPort.postMessage(match('a'.repeat(42)+'!'));`,
      {
        eval: true,
        workerData: { entry: join(root, 'index.js'), pattern },
        resourceLimits: { maxOldGenerationSizeMb: 32 },
      },
    );
    try {
      await new Promise((accept, reject) => {
        const timer = setTimeout(
          () => reject(new Error('picomatch mitigation missing: bounded worker exceeded 1500ms')),
          1500,
        );
        worker.once('message', (matched) => {
          clearTimeout(timer);
          try {
            assert.equal(matched, false);
            accept();
          } catch (error) {
            reject(error);
          }
        });
        worker.once('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
    } finally {
      await worker.terminate();
    }
  });
}
