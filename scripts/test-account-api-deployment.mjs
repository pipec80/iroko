import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const projectRef = 'rgrxlygtmvavqzkjyywg';
const deploymentOrigin = 'https://iroko-p4u6wjxq9-pipec80-labs.vercel.app';
const stableOrigin = 'https://project-a89lv.vercel.app';
const flags = process.argv.slice(2);
if (
  !flags.includes('--execute') ||
  flags.some((flag) => !['--execute', '--stable', '--preflight', '--public'].includes(flag))
) {
  console.error(
    'Usage: node scripts/test-account-api-deployment.mjs --execute [--stable] [--preflight] [--public]',
  );
  process.exit(2);
}
const origin = flags.includes('--stable') ? stableOrigin : deploymentOrigin;
assert.equal(readFileSync('supabase/.temp/project-ref', 'utf8').trim(), projectRef);
const accounts = [randomUUID(), randomUUID()];
const keys = accounts.map(() => `irk_${randomBytes(32).toString('base64url')}`);
const hashes = keys.map((key) => createHash('sha256').update(key).digest('hex'));
const run = randomBytes(8).toString('hex');
const checks = [];
let fixtureStarted = false;
let completed = false;
let canonicalIp;

function sql(query) {
  let output;
  try {
    output = JSON.parse(
      execFileSync('supabase', ['db', 'query', query, '--linked', '--output', 'json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60_000,
        windowsHide: true,
      }),
    );
  } catch {
    throw new Error('Captured linked SQL command failed; raw output suppressed');
  }
  const rows = Array.isArray(output) ? output : output.rows;
  assert.ok(Array.isArray(rows), 'Expected CLI row array');
  return rows;
}
function scalar(query) {
  const rows = sql(query);
  assert.equal(rows.length, 1, 'Expected one SQL result');
  return Object.values(rows[0])[0];
}
function ipIds() {
  return new Set(
    sql('SELECT id::text FROM private.account_api_ip_admissions;').map((row) => row.id),
  );
}
function curlQuote(value) {
  assert.ok(
    typeof value === 'string' && !/[\r\n\0]/.test(value),
    'Invalid curl configuration value',
  );
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}
async function request(key, extra = {}) {
  const headers = { ...extra };
  if (key) headers.authorization = `Bearer ${key}`;
  if (flags.includes('--public')) {
    const response = await fetch(`${origin}/api/v1/account`, {
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(25_000),
      cache: 'no-store',
    });
    const text = await response.text();
    assert.ok(text.length <= 65_536, 'Oversized endpoint response');
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error('Public endpoint returned non-JSON; inspect WAF');
    }
    return { status: response.status, body, retry: response.headers.get('retry-after') };
  }
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  const configuration = [
    'silent',
    'show-error',
    'max-time = 25',
    'max-redirs = 0',
    'dump-header = "-"',
    'write-out = "\\nIROKO_HTTP_STATUS:%{http_code}\\n"',
    ...Object.entries(headers).map(([name, value]) => {
      assert.ok(/^[a-z-]+$/.test(name), 'Unexpected header name');
      return `header = ${curlQuote(`${name}: ${value}`)}`;
    }),
  ].join('\n');
  const output = await new Promise((resolveOutput, reject) => {
    // Bearer keys and deployment bypass never appear in argv or process listings.
    const child = spawn(
      process.execPath,
      [
        'C:/nvm4w/nodejs/node_modules/vercel/dist/vc.js',
        'curl',
        `${origin}/api/v1/account`,
        '--',
        '--config',
        '-',
      ],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], timeout: 40_000 },
    );
    let stdout = '';
    let bytes = 0;
    let exceeded = false;
    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > 65_536) {
        exceeded = true;
        child.kill();
        return;
      }
      stdout += chunk.toString();
    });
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => {});
    child.on('error', () => reject(new Error('Installed Vercel curl failed; output suppressed')));
    child.on('close', (code) => {
      if (code !== 0 || exceeded)
        reject(new Error('Vercel curl failed or exceeded bounded output'));
      else resolveOutput(stdout);
    });
    child.stdin.end(`${configuration}\n`);
  });
  const statusMatch = /\nIROKO_HTTP_STATUS:(\d{3})\s*$/.exec(output);
  assert.ok(statusMatch, 'Missing HTTP status marker');
  const status = Number(statusMatch[1]);
  assert.ok(status < 300 || status >= 400, 'Redirects are forbidden');
  const raw = output.slice(0, statusMatch.index).replaceAll('\r\n', '\n');
  const split = raw.lastIndexOf('\n\n');
  assert.ok(split >= 0, 'Missing HTTP response headers');
  const headerText = raw.slice(0, split);
  const bodyText = raw.slice(split + 2).trim();
  const retry = /^retry-after:\s*([^\n]+)/im.exec(headerText)?.[1].trim() ?? null;
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error('Endpoint returned non-JSON; check deployment protection/WAF');
  }
  return { status, body, retry };
}
function accountCount(account) {
  return Number(
    scalar(
      `SELECT count(*) FROM private.account_api_account_admissions WHERE account_id='${account}'::uuid;`,
    ),
  );
}
async function identityProbe(key, extra, expectedAccount, expectedStatus = 200) {
  const before = ipIds();
  const response = await request(key, extra);
  assert.equal(response.status, expectedStatus, 'Unexpected endpoint status');
  if (expectedStatus === 200) {
    assert.ok(response.body.id === expectedAccount, 'Account response must be scoped to its key');
    assert.deepEqual(Object.keys(response.body).sort(), ['id', 'name', 'slug', 'type']);
  } else
    assert.ok(
      ['missing_key', 'invalid_key'].includes(response.body.error),
      'Expected credential rejection',
    );
  const newRows = sql(
    'SELECT id::text, host(client_ip) AS client_ip FROM private.account_api_ip_admissions;',
  ).filter((row) => !before.has(row.id));
  // Do not guess ownership if other callers write concurrently during this probe.
  assert.equal(newRows.length, 1, 'Identity probe requires one unambiguous IP admission');
  if (canonicalIp === undefined) {
    canonicalIp = newRows[0].client_ip;
    assert.ok(
      !['127.0.0.1', '::1', '198.51.100.9', '203.0.113.9'].includes(canonicalIp),
      'Expected real provider identity',
    );
  } else
    assert.ok(
      newRows[0].client_ip === canonicalIp,
      'Spoofed headers must not change canonical bucket',
    );
}

if (flags.includes('--preflight')) {
  const response = await request(null);
  assert.ok(
    response.status === 401 && response.body.error === 'missing_key',
    'CLI preflight must reach application 401',
  );
  console.log(
    JSON.stringify({
      origin,
      transport:
        flags.includes('--public') ? 'public_https_without_bypass' : 'official_vercel_cli_curl',
      preflight: '401_missing_key',
      fixturesCreated: false,
    }),
  );
} else
  try {
    assert.equal(
      Number(scalar('SELECT count(*) FROM supabase_migrations.schema_migrations;')),
      166,
    );
    assert.equal(
      Number(
        scalar(
          "SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261013210434','20261013210436','20261014012941');",
        ),
      ),
      3,
    );
    assert.equal(
      Number(
        scalar(
          `SELECT count(*) FROM public.accounts WHERE id IN ('${accounts[0]}','${accounts[1]}');`,
        ),
      ),
      0,
    );
    fixtureStarted = true;
    sql(`BEGIN;
    INSERT INTO public.accounts(id,name,slug) VALUES
    ('${accounts[0]}','0123 Deployment ${run}','0123-deploy-${run}-a'),
    ('${accounts[1]}','0123 Deployment ${run}','0123-deploy-${run}-b');
    INSERT INTO public.api_keys(account_id,name,key_prefix,key_hash) VALUES
    ('${accounts[0]}','0123 Deployment','irk_test','${hashes[0]}'),
    ('${accounts[1]}','0123 Deployment','irk_test','${hashes[1]}');
    COMMIT;`);
    await identityProbe(keys[0], {}, accounts[0]);
    await identityProbe(keys[1], {}, accounts[1]);
    checks.push('two_account_scoped_200');
    await identityProbe(null, {}, null, 401);
    await identityProbe(`irk_${randomBytes(32).toString('base64url')}`, {}, null, 401);
    checks.push('missing_and_invalid_401_consume_ip');
    await identityProbe(
      keys[0],
      {
        'cf-connecting-ip': '198.51.100.9',
        'x-forwarded-for': '198.51.100.9',
        'x-vercel-forwarded-for': '198.51.100.9',
      },
      accounts[0],
    );
    await identityProbe(
      keys[0],
      {
        'cf-connecting-ip': '203.0.113.9',
        'x-forwarded-for': '203.0.113.9, 198.51.100.9',
        'x-vercel-forwarded-for': '203.0.113.9, 198.51.100.9',
      },
      accounts[0],
    );
    checks.push('canonical_provider_ip_resists_single_and_list_spoof');
    const existing = accountCount(accounts[0]);
    assert.ok(existing > 0 && existing < 99, 'Expected fixture admissions before quota seeding');
    sql(`INSERT INTO private.account_api_account_admissions(account_id,admitted_at)
    SELECT '${accounts[0]}'::uuid,clock_timestamp() FROM generate_series(1,${99 - existing});`);
    assert.equal(accountCount(accounts[0]), 99);
    const settled = await Promise.allSettled(Array.from({ length: 8 }, () => request(keys[0])));
    assert.ok(
      settled.every((result) => result.status === 'fulfilled'),
      'All concurrent callers must finish before cleanup',
    );
    const results = settled.map((result) => result.value);
    assert.equal(
      results.filter((result) => result.status === 200 && result.body.id === accounts[0]).length,
      1,
    );
    assert.equal(
      results.filter(
        (result) =>
          result.status === 429 &&
          result.body.error === 'rate_limited' &&
          /^\d+$/.test(result.retry ?? '') &&
          Number(result.retry) >= 1 &&
          Number(result.retry) <= 300,
      ).length,
      7,
    );
    assert.equal(accountCount(accounts[0]), 100);
    checks.push('concurrent_last_slot_one_200_seven_429_retry_after');
    const independent = await request(keys[1]);
    assert.ok(
      independent.status === 200 && independent.body.id === accounts[1],
      'Other account remains admissible',
    );
    checks.push('account_isolation_after_exhaustion');
    completed = true;
  } finally {
    if (fixtureStarted) {
      sql(`BEGIN;
      DELETE FROM public.api_keys WHERE account_id IN ('${accounts[0]}','${accounts[1]}') AND key_hash IN ('${hashes[0]}','${hashes[1]}');
      DELETE FROM public.accounts WHERE id IN ('${accounts[0]}','${accounts[1]}') AND slug IN ('0123-deploy-${run}-a','0123-deploy-${run}-b');
      COMMIT;`);
      assert.equal(
        Number(
          scalar(
            `SELECT count(*) FROM public.accounts WHERE id IN ('${accounts[0]}','${accounts[1]}');`,
          ),
        ),
        0,
      );
      assert.equal(
        Number(
          scalar(
            `SELECT count(*) FROM private.account_api_account_admissions WHERE account_id IN ('${accounts[0]}','${accounts[1]}');`,
          ),
        ),
        0,
      );
    }
    // IP events have no request/account ownership. Preserve the shared bucket:
    // our legitimate requests expire after 300 seconds; never delete global deltas.
    console.log(
      JSON.stringify({
        origin,
        transport:
          flags.includes('--public') ? 'public_https_without_bypass' : 'official_vercel_cli_curl',
        passed: completed,
        publicRawTransport:
          flags.includes('--public') ?
            completed ? 'accepted'
            : 'not_accepted'
          : 'WAF_checkpoint_not_accepted',
        checks,
        fixtureAccountsCleaned: fixtureStarted,
        sharedIpEventsPreservedUntilExpiry: true,
        fullNextPostReadFailure: 'not_exercised_layered_local_evidence_only',
      }),
    );
  }
