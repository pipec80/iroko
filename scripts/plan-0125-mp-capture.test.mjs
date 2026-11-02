import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { networkGuard } from './run-plan-0124-local.mjs';

import { capturePreload } from './plan-0125-mp-capture.mjs';

function harness(overrides = {}, guardPresent = true) {
  const records = [];
  const context = vm.createContext({
    URL,
    Request,
    Response,
    Headers,
    __filename: path.resolve('owned/guard.cjs'),
    process: {
      env: {
        NODE_ENV: 'development',
        BILLING_DEFAULT_PROVIDER: 'mercadopago',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        MERCADOPAGO_ACCESS_TOKEN: 'synthetic-read-only-no-provider-access',
        PLAN0125_CAPTURE_APPROVED: 'true',
        PLAN0125_CAPTURE_FILE: path.resolve('owned/mp-capture-20261102.jsonl'),
        ...overrides,
      },
    },
    require: (name) =>
      name === 'node:crypto' ? crypto
      : name === 'node:path' ? path
      : {
          readFileSync: () => (guardPresent ? networkGuard + capturePreload : capturePreload),
          existsSync: () => false,
          appendFileSync: (_path, value) => records.push(JSON.parse(value)),
        },
    fetch: () => {
      throw new Error('existing guard rejected external fetch');
    },
  });
  vm.runInContext(capturePreload, context);
  return { context, records };
}

const request = {
  method: 'POST',
  headers: { Authorization: 'Bearer synthetic-read-only-no-provider-access' },
  body: JSON.stringify({
    payer_email: 'private@example.test',
    external_reference: 'private-account',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 34567,
      currency_id: 'CLP',
    },
  }),
};

test('captures only recurring terms and returns a loopback destination without a provider call', async () => {
  const { context, records } = harness();
  const response = await context.fetch('https://api.mercadopago.com/preapproval', request);
  assert.equal(response.status, 201);
  const destination = new URL((await response.json()).init_point);
  assert.equal(destination.hostname, '127.0.0.1');
  assert.equal(destination.protocol, 'https:');
  assert.deepEqual(records, [
    { frequency: 1, frequency_type: 'months', transaction_amount: 34567, currency_id: 'CLP' },
  ]);
  assert.ok(!JSON.stringify(records).includes('private'));
});

test('keeps every other URL or method behind the existing guard', () => {
  const { context } = harness();
  for (const url of [
    'https://example.com',
    'https://api.mercadopago.com/preapproval?x=1',
    'https://api.mercadopago.com/preapproval/',
  ])
    assert.throws(() => context.fetch(url, request), /existing guard/);
  assert.throws(
    () => context.fetch('https://api.mercadopago.com/preapproval', { ...request, method: 'GET' }),
    /existing guard/,
  );
});

test('refuses production, real credentials, missing authorization, remote Supabase or mock enablement', () => {
  for (const env of [
    { NODE_ENV: 'production' },
    { MERCADOPAGO_ACCESS_TOKEN: 'real-credential' },
    { PLAN0125_CAPTURE_APPROVED: '' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://remote.example' },
    { ALLOW_MOCK_BILLING: 'true' },
  ])
    assert.throws(() => harness(env), /local capture configuration/);
});

test('rejects non-synthetic authorization and malformed recurring terms without recording', () => {
  const { context, records } = harness();
  assert.throws(
    () => context.fetch('https://api.mercadopago.com/preapproval', { ...request, headers: {} }),
    /capture request/,
  );
  assert.throws(
    () => context.fetch('https://api.mercadopago.com/preapproval', { ...request, body: '{}' }),
    /capture request/,
  );
  assert.equal(records.length, 0);
});

test('refuses an omitted guard or a capture path outside the owned preload directory', () => {
  assert.throws(() => harness({}, false), /network guard/);
  assert.throws(
    () => harness({ PLAN0125_CAPTURE_FILE: path.resolve('outside.jsonl') }),
    /capture path/,
  );
});

test('real preload composition captures locally and the unchanged guard blocks unrelated egress', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'iroko-0125-capture-'));
  const guard = path.join(root, 'guard.cjs');
  const capture = path.join(root, 'mp-capture-20261102.jsonl');
  const egress = path.join(root, 'egress.log');
  writeFileSync(guard, networkGuard + capturePreload);
  const child = spawnSync(
    process.execPath,
    [
      '--require',
      guard,
      '-e',
      `
    (async()=>{
      const result=await fetch('https://api.mercadopago.com/preapproval',${JSON.stringify(request)});
      if(result.status!==201)throw new Error('Capture failed');
      try {await fetch('https://example.com');throw new Error('Egress was allowed');}
      catch(error){if(!error.message.includes('Plan0124 blocked'))throw error;}
    })().catch(()=>{process.exitCode=1});
  `,
    ],
    {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
      env: {
        SystemRoot: process.env.SystemRoot,
        NODE_ENV: 'development',
        BILLING_DEFAULT_PROVIDER: 'mercadopago',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        MERCADOPAGO_ACCESS_TOKEN: 'synthetic-read-only-no-provider-access',
        PLAN0125_CAPTURE_APPROVED: 'true',
        PLAN0125_CAPTURE_FILE: capture,
        PLAN0124_EGRESS_LOG: egress,
      },
    },
  );
  assert.equal(child.status, 0, child.stderr);
  assert.equal(JSON.parse(readFileSync(capture, 'utf8')).transaction_amount, 34567);
  assert.equal(readFileSync(egress, 'utf8').trim(), 'fetch');
});
