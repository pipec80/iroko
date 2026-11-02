import { createHash } from 'node:crypto';
import { networkGuard } from './run-plan-0124-local.mjs';

const guardHash = createHash('sha256').update(networkGuard).digest('hex');

/** Test-only preload appended AFTER the existing network guard; never imported by the app. */
export const capturePreload = String.raw`
;(() => {
  const fs = require('node:fs');
  const path = require('node:path');
  const prefix = fs.readFileSync(__filename, 'utf8').slice(0, ${networkGuard.length});
  if (require('node:crypto').createHash('sha256').update(prefix).digest('hex') !== '${guardHash}')
    throw new Error('Missing or modified existing network guard');
  const env = process.env;
  const synthetic = 'synthetic-read-only-no-provider-access';
  if (env.NODE_ENV !== 'development' || env.BILLING_DEFAULT_PROVIDER !== 'mercadopago' ||
      env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321' ||
      env.MERCADOPAGO_ACCESS_TOKEN !== synthetic || env.PLAN0125_CAPTURE_APPROVED !== 'true' ||
      !env.PLAN0125_CAPTURE_FILE || env.ALLOW_MOCK_BILLING) {
    throw new Error('Invalid local capture configuration');
  }
  const capturePath = path.resolve(env.PLAN0125_CAPTURE_FILE);
  if (capturePath !== path.join(path.dirname(__filename), 'mp-capture-20261102.jsonl') ||
      (fs.existsSync(capturePath) && fs.lstatSync(capturePath).isSymbolicLink()))
    throw new Error('Invalid local capture path');
  const guardedFetch = globalThis.fetch;
  globalThis.fetch = function(input, options) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.href !== 'https://api.mercadopago.com/preapproval' || options?.method !== 'POST')
      return guardedFetch.call(this, input, options);
    const authorization = new Headers(options.headers).get('authorization');
    const body = JSON.parse(options.body);
    const terms = body.auto_recurring;
    if (authorization !== 'Bearer ' + synthetic || !terms ||
        terms.frequency !== 1 || terms.frequency_type !== 'months' || terms.currency_id !== 'CLP' ||
        !Number.isSafeInteger(terms.transaction_amount) || terms.transaction_amount <= 0) {
      throw new Error('Invalid local capture request');
    }
    fs.appendFileSync(capturePath, JSON.stringify({
      frequency: terms.frequency, frequency_type: terms.frequency_type,
      transaction_amount: terms.transaction_amount, currency_id: terms.currency_id,
    }) + '\n');
    return Promise.resolve(new Response(JSON.stringify({
      id: 'pricing-0125-' + require('node:crypto').randomUUID(),
      init_point: 'https://127.0.0.1:3000/0125-captured',
    }), { status: 201, headers: { 'content-type': 'application/json' } }));
  };
})();
`;
